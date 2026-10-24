import { Router, type IRouter } from "express";
import { requireCareerDataAdmin } from "../lib/career-data-admin-auth";
import { CvValidationError, decodeCvContent, extractCvText, MAX_CV_BASE64_LENGTH, CV_TOO_LARGE } from "../lib/cv-validation";
import { asc, desc, eq } from "drizzle-orm";
import {
  AnalyzeCvBody,
  AnalyzeCvResponse,
  ClearProfileParams,
  CreateRoadmapBody,
  CreateRoadmapResponse,
  ImportTrendSnapshotBody,
  ImportTrendSnapshotResponse,
  GetDashboardParams,
  GetDashboardResponse,
  GetWorkforceContextResponse,
  GetProfileParams,
  GetProfileResponse,
  ListCareerMatchesQueryParams,
  ListCareerMatchesResponse,
  ListDataSourcesResponse,
  ListDemoProfilesResponse,
  SimulateScenarioBody,
  SimulateScenarioParams,
  SimulateScenarioResponse,
  UpdateProfileBody,
  UpdateProfileParams,
  UpdateProfileResponse,
  UpdateRoadmapStepBody,
  UpdateRoadmapStepParams,
  UpdateRoadmapStepResponse,
  type Profile,
  type Roadmap,
  type ScenarioType,
  type TrendSignal,
  type DataSource,
} from "@workspace/api-zod";
import {
  careerProfilesTable,
  careerRoadmapsTable,
  careerTrendSignalsTable,
  careerDataSourcesTable,
  careerWorkforceRecordsTable,
  db,
} from "@workspace/db";
import {
  buildRoadmap,
  buildTrendSignals,
  calculateMatches,
  DATA_SOURCES,
  DEMO_PROFILES,
  DEMO_SUMMARIES,
  getRole,
} from "../lib/career-engine";
import {
  extractProfileFromCv,
  generatePersonalizedRoadmap,
} from "../lib/career-ai";
import { getCareerMatches, getCareerRoadmapTarget } from "../lib/career-matching";
import { RunpodInferenceError } from "../lib/runpod";
import { refreshRoadmapLearningResources } from "../lib/learning-resources";
import { getWef2025WorkforceContext } from "../lib/workforce-context";

const router: IRouter = Router();

const serializable = (value: object): Record<string, unknown> =>
  JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

const persistProfile = async (profile: Profile): Promise<void> => {
  const payload = serializable(profile);
  await db
    .insert(careerProfilesTable)
    .values({ id: profile.id, payload })
    .onConflictDoUpdate({
      target: careerProfilesTable.id,
      set: { payload, updatedAt: new Date() },
    });
};

const readProfile = async (profileId: string): Promise<Profile | undefined> => {
  const [stored] = await db
    .select({ payload: careerProfilesTable.payload })
    .from(careerProfilesTable)
    .where(eq(careerProfilesTable.id, profileId))
    .limit(1);
  if (stored) return GetProfileResponse.parse(stored.payload);

  const demo = DEMO_PROFILES.find((item) => item.id === profileId);
  if (!demo) return undefined;
  await db
    .insert(careerProfilesTable)
    .values({ id: demo.id, payload: serializable(demo) })
    .onConflictDoNothing();
  const [seeded] = await db
    .select({ payload: careerProfilesTable.payload })
    .from(careerProfilesTable)
    .where(eq(careerProfilesTable.id, profileId))
    .limit(1);
  return seeded ? GetProfileResponse.parse(seeded.payload) : demo;
};

const readTrendSignals = async (profile: Profile): Promise<TrendSignal[]> => {
  const baseline = buildTrendSignals(profile);
  const rows = await db
    .select()
    .from(careerTrendSignalsTable)
    .orderBy(desc(careerTrendSignalsTable.observedAt), desc(careerTrendSignalsTable.id));
  const latestBySkill = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = row.skill.toLowerCase().trim();
    if (!latestBySkill.has(key)) latestBySkill.set(key, row);
  }
  const merged = new Map(baseline.map((signal) => [signal.skill.toLowerCase(), signal]));
  for (const row of latestBySkill.values()) {
    merged.set(row.skill.toLowerCase(), {
      skill: row.skill,
      direction: row.direction as TrendSignal["direction"],
      score: row.score,
      source: row.source,
      observedAt: new Date(`${row.observedAt}T00:00:00.000Z`),
      evidence: row.evidence,
    });
  }
  return Array.from(merged.values());
};

const readDataSources = async (): Promise<DataSource[]> => {
  await getWef2025WorkforceContext();
  const rows = await db
    .select()
    .from(careerTrendSignalsTable)
    .orderBy(desc(careerTrendSignalsTable.observedAt), desc(careerTrendSignalsTable.id));
  const latestBySource = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestBySource.has(row.source)) latestBySource.set(row.source, row);
  }
  const importedSources: DataSource[] = Array.from(latestBySource.values()).map((row) => ({
    name: row.source,
    purpose: `User-imported dated skill snapshot. Licence recorded as: ${row.license}.`,
    url: row.sourceUrl,
    status: "active",
    publicationDate: new Date(`${row.observedAt}T00:00:00.000Z`),
    lastUpdated: new Date(`${row.observedAt}T00:00:00.000Z`),
    methodology: "Values were imported by a CareerLens workspace user. Scores are directional indices (0–100), not vacancy counts or hiring probabilities.",
  }));
  const known = new Set(DATA_SOURCES.map((source) => source.name));
  return [
    ...DATA_SOURCES,
    ...importedSources.filter((source) => !known.has(source.name)),
  ];
};

router.get("/career/workforce-context", async (_req, res): Promise<void> => {
  res.json(GetWorkforceContextResponse.parse(await getWef2025WorkforceContext()));
});

router.get("/career/demo-profiles", (_req, res) => {
  res.json(ListDemoProfilesResponse.parse(DEMO_SUMMARIES));
});

router.post("/career/cv/analyze", async (req, res): Promise<void> => {
  if (typeof req.body?.contentBase64 === "string" && req.body.contentBase64.length > MAX_CV_BASE64_LENGTH) {
    res.status(413).json({ error: CV_TOO_LARGE });
    return;
  }
  if (typeof req.body?.mimeType === "string" && req.body.mimeType !== "application/pdf") {
    res.status(415).json({ error: "Unsupported CV format. Please choose a PDF CV. Images and other document formats are not supported." });
    return;
  }
  const parsed = AnalyzeCvBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a PDF CV and try again. The upload must include a file name, PDF format, and base64 file content." });
    return;
  }

  let text: string;
  try {
    text = await extractCvText(decodeCvContent(parsed.data.contentBase64));
  } catch (error) {
    req.log.warn({ err: error }, "CV text extraction failed");
    res.status(error instanceof CvValidationError ? error.status : 422).json({
      error: error instanceof CvValidationError ? error.message : "The PDF could not be read. Export a new PDF and try again.",
    });
    return;
  }

  try {
    const profile = await extractProfileFromCv(text);
    res.json(AnalyzeCvResponse.parse(profile));
  } catch (error) {
    const statusCode = error instanceof RunpodInferenceError ? error.statusCode : 503;
    const message =
      error instanceof RunpodInferenceError
        ? error.message
        : "CV analysis failed. Please try again or continue with a synthetic profile.";
    req.log.error(
      {
        err: error,
        upstreamStatus: error instanceof RunpodInferenceError ? error.upstreamStatus : undefined,
      },
      "RunPod CV analysis failed",
    );
    res.status(statusCode).json({ error: message });
  }
});

router.get("/career/profiles/:profileId", async (req, res): Promise<void> => {
  const params = GetProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const profile = await readProfile(params.data.profileId);
  if (!profile) {
    res.status(404).json({ error: "Career profile not found." });
    return;
  }
  res.json(GetProfileResponse.parse(profile));
});

router.patch("/career/profiles/:profileId", async (req, res): Promise<void> => {
  const params = UpdateProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const existing = await readProfile(params.data.profileId);
  if (
    !existing &&
    params.data.profileId.startsWith("cv-") &&
    body.data.confirmed === true
  ) {
    const created = GetProfileResponse.parse({
      id: params.data.profileId,
      name: body.data.name ?? "New profile",
      education: body.data.education ?? "",
      totalExperienceYears: body.data.totalExperienceYears,
      fieldOfStudy: body.data.fieldOfStudy,
      primaryDomain: body.data.primaryDomain ?? "Other",
      secondaryDomains: body.data.secondaryDomains ?? [],
      skills: body.data.skills ?? [],
      experience: body.data.experience ?? [],
      interests: body.data.interests ?? [],
      certifications: body.data.certifications ?? [],
      confirmed: true,
      updatedAt: new Date(),
    });
    await persistProfile(created);
    res.json(UpdateProfileResponse.parse(created));
    return;
  }
  if (!existing) {
    res.status(404).json({ error: "Career profile not found." });
    return;
  }
  const updated = GetProfileResponse.parse({
    ...existing,
    ...body.data,
    updatedAt: new Date(),
  });
  await persistProfile(updated);
  res.json(UpdateProfileResponse.parse(updated));
});

router.delete("/career/profiles/:profileId", async (req, res): Promise<void> => {
  const params = ClearProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(careerRoadmapsTable)
    .where(eq(careerRoadmapsTable.profileId, params.data.profileId));
  await db
    .delete(careerProfilesTable)
    .where(eq(careerProfilesTable.id, params.data.profileId));
  res.sendStatus(204);
});

router.get("/career/dashboard/:profileId", async (req, res): Promise<void> => {
  const params = GetDashboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const profile = await readProfile(params.data.profileId);
  if (!profile) {
    res.status(404).json({ error: "Career profile not found." });
    return;
  }
  const trends = await readTrendSignals(profile);
  const matches = calculateMatches(profile, "moderate", undefined, trends);
  const [latest] = await db
    .select({ payload: careerRoadmapsTable.payload })
    .from(careerRoadmapsTable)
    .where(eq(careerRoadmapsTable.profileId, profile.id))
    .orderBy(desc(careerRoadmapsTable.updatedAt))
    .limit(1);
  let roadmap = latest?.payload ?? null;
  if (!roadmap && profile.id === "demo-ux") {
    const referenceRole = getRole("ux-researcher");
    if (referenceRole) {
      const exampleRoadmap = buildRoadmap(
        profile,
        referenceRole,
        "78c2ad5e-04fc-4ae2-8df1-0cd16285b6cf",
      );
      await db
        .insert(careerRoadmapsTable)
        .values({
          id: exampleRoadmap.id,
          profileId: profile.id,
          payload: serializable(exampleRoadmap),
        })
        .onConflictDoNothing();
      const [seededRoadmap] = await db
        .select({ payload: careerRoadmapsTable.payload })
        .from(careerRoadmapsTable)
        .where(eq(careerRoadmapsTable.id, exampleRoadmap.id))
        .limit(1);
      roadmap = seededRoadmap?.payload ?? exampleRoadmap;
    }
  }
  const profileStrength = Math.min(
    100,
    Math.round(
      (Math.min(profile.skills.length, 8) / 8) * 45 +
        (profile.experience.length ? 20 : 0) +
        (profile.education ? 20 : 0) +
        (profile.interests.length ? 15 : 0),
    ),
  );
  res.json(
    GetDashboardResponse.parse({
      profile,
      topMatch: matches[0],
      matches: matches.slice(0, 5),
      trends,
      roadmap: roadmap ? refreshRoadmapLearningResources(roadmap as unknown as Roadmap) : null,
      profileStrength,
      marketUpdatedAt:
        trends.reduce(
          (latest, signal) =>
            signal.observedAt > latest ? signal.observedAt : latest,
          new Date("2025-01-07T00:00:00.000Z"),
        ),
    }),
  );
});

router.get("/career/careers", async (req, res): Promise<void> => {
  const params = ListCareerMatchesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const profile = await readProfile(params.data.profileId);
  if (!profile) {
    res.status(404).json({ error: "Career profile not found." });
    return;
  }
  try {
    const matches = await getCareerMatches(
      profile,
      (params.data.scenario ?? "moderate") as ScenarioType,
    );
    res.json(ListCareerMatchesResponse.parse(matches));
  } catch (error) {
    const statusCode = error instanceof RunpodInferenceError ? error.statusCode : 503;
    const message =
      error instanceof RunpodInferenceError
        ? error.message
        : "Career recommendations are temporarily unavailable. Please try again.";
    req.log.error(
      {
        err: error,
        upstreamStatus: error instanceof RunpodInferenceError ? error.upstreamStatus : undefined,
      },
      "RunPod career recommendation failed",
    );
    res.status(statusCode).json({ error: message });
  }
});

router.post("/career/roadmaps", async (req, res): Promise<void> => {
  const body = CreateRoadmapBody.safeParse(req.body);
  if (!body.success || !body.data.profileId.trim() || !body.data.careerId.trim()) {
    res.status(400).json({ error: "Choose a profile and a target career before building a learning path." });
    return;
  }
  const profile = await readProfile(body.data.profileId);
  if (!profile) {
    res.status(404).json({ error: "Career profile not found." });
    return;
  }
  try {
    const target = await getCareerRoadmapTarget(profile, body.data.careerId);
    if (!target) {
      res.status(404).json({ error: "Career role not found or its data source is no longer active." });
      return;
    }
    const roadmap = await generatePersonalizedRoadmap(profile, target.role.id, target);
    const payload = serializable(roadmap);
    await db.insert(careerRoadmapsTable).values({
      id: roadmap.id,
      profileId: roadmap.profileId,
      payload,
    });
    res.status(201).json(CreateRoadmapResponse.parse(roadmap));
  } catch (error) {
    const statusCode = error instanceof RunpodInferenceError ? error.statusCode : 503;
    const message =
      error instanceof RunpodInferenceError
        ? error.message
        : "The upskilling roadmap could not be generated. Please try again.";
    req.log.error(
      {
        err: error,
        upstreamStatus: error instanceof RunpodInferenceError ? error.upstreamStatus : undefined,
      },
      "RunPod roadmap generation failed",
    );
    res.status(statusCode).json({ error: message });
  }
});

router.patch(
  "/career/roadmaps/:roadmapId/steps/:stepId",
  async (req, res): Promise<void> => {
    const params = UpdateRoadmapStepParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = UpdateRoadmapStepBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [stored] = await db
      .select()
      .from(careerRoadmapsTable)
      .where(eq(careerRoadmapsTable.id, params.data.roadmapId))
      .limit(1);
    if (!stored) {
      res.status(404).json({ error: "Learning roadmap not found." });
      return;
    }
    const roadmap = refreshRoadmapLearningResources(stored.payload as unknown as Roadmap);
    const step = roadmap.steps.find((item) => item.id === params.data.stepId);
    if (!step) {
      res.status(404).json({ error: "Roadmap milestone not found." });
      return;
    }
    const updated: Roadmap = {
      ...roadmap,
      steps: roadmap.steps.map((item) =>
        item.id === step.id ? { ...item, complete: body.data.complete } : item,
      ),
      progress:
        roadmap.steps.length === 0
          ? 0
          : Math.round(
              (roadmap.steps.filter((item) =>
                item.id === step.id ? body.data.complete : item.complete,
              ).length /
                roadmap.steps.length) *
                100,
            ),
    };
    const payload = serializable(updated);
    await db
      .update(careerRoadmapsTable)
      .set({ payload, updatedAt: new Date() })
      .where(eq(careerRoadmapsTable.id, updated.id));
    res.json(UpdateRoadmapStepResponse.parse(updated));
  },
);

router.post(
  "/career/scenarios/:profileId/simulate",
  async (req, res): Promise<void> => {
    const params = SimulateScenarioParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = SimulateScenarioBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const profile = await readProfile(params.data.profileId);
    if (!profile) {
      res.status(404).json({ error: "Career profile not found." });
      return;
    }
    const trends = await readTrendSignals(profile);
    const matches = calculateMatches(profile, body.data.scenario, body.data.hypotheticalSkill, trends);
    const baseline = calculateMatches(profile, body.data.scenario, undefined, trends);
    const prioritySkills = [...new Set(matches.slice(0, 3).flatMap((match) => match.missingSkills))].slice(0, 5);
    const hypotheticalSkill = body.data.hypotheticalSkill?.trim() || null;
    const baselineCareer = baseline[0];
    const hypotheticalMatch = hypotheticalSkill && baselineCareer
      ? matches.find((item) => item.id === baselineCareer.id)
      : undefined;
    const readinessComparison = hypotheticalSkill && baselineCareer && hypotheticalMatch
      ? {
          careerId: baselineCareer.id, careerTitle: baselineCareer.title, skill: hypotheticalSkill,
          beforeAlignment: baselineCareer.score, afterAlignment: hypotheticalMatch.score,
          changePoints: hypotheticalMatch.score - baselineCareer.score,
        }
      : null;
    const impact = readinessComparison
      ? (() => {
          const change = readinessComparison.changePoints;
          const direction = change > 0 ? `increases by ${change} alignment points` : change < 0 ? `decreases by ${Math.abs(change)} alignment points` : "does not change";
          return `${hypotheticalSkill} is considered only for this simulation. ${readinessComparison.careerTitle} ${direction}; your confirmed profile skills remain unchanged.`;
        })()
      : null;
    res.json(
      SimulateScenarioResponse.parse({
        scenario: body.data.scenario,
        summary:
          body.data.scenario === "fast"
            ? "Hypothetical fast AI-adoption scenario for exploring how roles and skills might change. This is not a WEF prediction."
            : "Hypothetical moderate AI-adoption scenario for exploring steadier role and skill changes. This is not a WEF prediction.",
        estimatesLabel: "CareerLens what-if scenarios only; not WEF predictions, hiring probabilities, or live market forecasts.",
        matches,
        prioritySkills,
        hypotheticalImpact: impact,
        readinessComparison,
      }),
    );
  },
);

router.get("/career/sources", async (_req, res): Promise<void> => {
  res.json(ListDataSourcesResponse.parse(await readDataSources()));
});

router.post("/career/trends/import", async (req, res): Promise<void> => {
  if (!requireCareerDataAdmin(req, res)) return;
  const body = ImportTrendSnapshotBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  let sourceProtocol: string;
  try {
    sourceProtocol = new URL(body.data.sourceUrl).protocol;
  } catch {
    res.status(400).json({ error: "Source URL must be a valid HTTPS address." });
    return;
  }
  if (sourceProtocol !== "https:") {
    res.status(400).json({ error: "Source URL must use HTTPS." });
    return;
  }
  const observedAt = body.data.observedAt.toISOString().slice(0, 10);
  const values = body.data.signals.map((signal) => ({
    ...signal,
    direction: signal.direction,
    source: body.data.source,
    sourceUrl: body.data.sourceUrl,
    license: body.data.license,
    observedAt,
  }));
  await db.insert(careerTrendSignalsTable).values(values);
  const imported = values.map((signal) => ({
    ...signal,
    observedAt: new Date(`${observedAt}T00:00:00.000Z`),
  }));
  res.status(201).json(ImportTrendSnapshotResponse.parse(imported));
});

export default router;
