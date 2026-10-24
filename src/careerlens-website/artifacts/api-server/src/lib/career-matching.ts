import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, count, desc, eq, max, sql } from "drizzle-orm";
import type { CareerMatch, Profile, ScenarioType } from "@workspace/api-zod";
import { GetProfileResponse } from "@workspace/api-zod";
import {
  careerDataSourcesTable,
  careerJobAdsTable,
  careerOccupationSkillsTable,
  careerOccupationsTable,
  careerProfilesTable,
  careerSkillsTable,
  careerTrendObservationsTable,
  db,
} from "@workspace/db";
import { getCareerRoleCatalog, getRole } from "./career-engine";
import { explainOccupationMatches } from "./career-ai";
import { softwareSkillAliases } from "./skill-matching";
import { sdgsForOnetCode } from "./onet-sdg";
import { applyCareerLensSpecializations } from "./career-specializations";

type MatchCandidate = {
  id: string;
  title: string;
  careerLensSpecializationBasedOn?: string | null;
  industry: string;
  requiredSkills: string[];
  softwareSkills: Array<{ name: string; inDemand: boolean }>;
  skillImportance: Record<string, number>;
  occupationCode: string | null;
  interestTags: string[];
  dataClassification: "source_backed" | "demonstration";
  sourceName: string | null;
  sourceUrl: string | null;
  countryCode: string | null;
  publicationPeriod: string | null;
  observedListingCount: number | null;
  listingEvidenceUpdatedAt: string | null;
  listingEvidenceSourceName: string | null;
  listingEvidenceSourceUrl: string | null;
  searchInterestNote: string | null;
  responsibilities: string[];
  sdgs: CareerMatch["sdgs"];
};

type PythonMatch = Omit<CareerMatch, "explanation" | "domain"> & {
  industry: string;
};

const matchingScript = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "career-matcher.py",
);

const runPythonMatcher = (input: unknown): Promise<PythonMatch[]> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.env.PYTHON_BIN || "python3", [matchingScript], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Career matching timed out."));
    }, 15_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (stdout.length > 2_000_000) {
        child.kill("SIGKILL");
        reject(new Error("Career matching returned too much data."));
      }
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      if (stderr.length > 12_000) stderr = stderr.slice(-12_000);
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(new Error(`Could not start the Python career matcher: ${error.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Python career matcher exited with code ${code}.`));
        return;
      }
      try {
        const parsed: unknown = JSON.parse(stdout);
        if (!Array.isArray(parsed)) throw new Error("Matcher output was not a JSON array.");
        resolve(parsed as PythonMatch[]);
      } catch (error) {
        reject(new Error(`Python career matcher returned invalid output: ${String(error)}`));
      }
    });
    child.stdin.end(JSON.stringify(input));
  });

const readSourceBackedCandidates = async (): Promise<MatchCandidate[]> => {
  const occupationRows = await db
    .select({
      id: careerOccupationsTable.id,
      externalId: careerOccupationsTable.externalId,
      title: careerOccupationsTable.title,
      industry: careerOccupationsTable.industry,
      sourceUrl: careerOccupationsTable.sourceUrl,
      publicationPeriod: careerOccupationsTable.publicationPeriod,
      countryCode: careerOccupationsTable.countryCode,
      sourceName: careerDataSourcesTable.name,
      sourceKey: careerDataSourcesTable.key,
      sourceStatus: careerDataSourcesTable.status,
      metadata: careerOccupationsTable.metadata,
    })
    .from(careerOccupationsTable)
    .innerJoin(careerDataSourcesTable, eq(careerDataSourcesTable.id, careerOccupationsTable.sourceId))
    .orderBy(desc(careerOccupationsTable.updatedAt));

  if (!occupationRows.length) return [];

  const skillRows = await db
    .select({
      occupationId: careerOccupationSkillsTable.occupationId,
      canonicalName: careerSkillsTable.canonicalName,
    })
    .from(careerOccupationSkillsTable)
    .innerJoin(careerSkillsTable, eq(careerSkillsTable.id, careerOccupationSkillsTable.skillId));
  const skillNamesByOccupation = new Map<number, string[]>();
  for (const row of skillRows) {
    const values = skillNamesByOccupation.get(row.occupationId) ?? [];
    values.push(row.canonicalName);
    skillNamesByOccupation.set(row.occupationId, values);
  }

  const listingRows = await db
    .select({
      occupationId: careerJobAdsTable.occupationId,
      total: count(careerJobAdsTable.id),
      latest: max(careerDataSourcesTable.lastSuccessAt),
      countryCode: max(careerJobAdsTable.countryCode),
    })
    .from(careerJobAdsTable)
    .innerJoin(careerDataSourcesTable, eq(careerDataSourcesTable.id, careerJobAdsTable.sourceId))
    .where(
      and(
        sql`${careerJobAdsTable.occupationId} IS NOT NULL`,
        sql`${careerDataSourcesTable.key} LIKE 'adzuna:%'`,
      ),
    )
    .groupBy(careerJobAdsTable.occupationId);
  const listingByOccupation = new Map(
    listingRows
      .filter((row): row is typeof row & { occupationId: number } => row.occupationId !== null)
      .map((row) => [
        row.occupationId,
        {
          total: Number(row.total),
          latest: row.latest?.toISOString() ?? null,
          countryCode: row.countryCode,
        },
      ]),
  );
  const adzunaUrlByCountry: Record<string, string> = {
    SG: "https://www.adzuna.com.sg/",
    GB: "https://www.adzuna.co.uk/",
    US: "https://www.adzuna.com/",
    AU: "https://www.adzuna.com.au/",
    CA: "https://www.adzuna.ca/",
    IE: "https://www.adzuna.ie/",
    NZ: "https://www.adzuna.co.nz/",
    IN: "https://www.adzuna.in/",
    ZA: "https://www.adzuna.co.za/",
  };

  return occupationRows
    .filter((row) => row.sourceStatus === "active")
    .map((row) => {
      const listing = listingByOccupation.get(row.id);
      const description =
        typeof row.metadata.description === "string" ? row.metadata.description : "";
      const interestSignals = Array.isArray(row.metadata.interestSignals)
        ? row.metadata.interestSignals.flatMap((signal) =>
            signal && typeof signal === "object" && "name" in signal && typeof signal.name === "string"
              ? [signal.name]
              : [],
          )
        : [];
      const softwareSkills = Array.isArray(row.metadata.softwareSkills)
        ? row.metadata.softwareSkills.flatMap((entry) =>
            entry && typeof entry === "object" && "name" in entry && typeof entry.name === "string"
              ? [{ name: entry.name, inDemand: "inDemand" in entry && entry.inDemand === true }] : [],
          )
        : [];
      const skillImportance: Record<string, number> = {};
      for (const signal of Array.isArray(row.metadata.skillSignals) ? row.metadata.skillSignals : []) {
        if (signal && typeof signal === "object" && "name" in signal && "importance" in signal
          && typeof signal.name === "string" && typeof signal.importance === "number"
          && Number.isFinite(signal.importance) && signal.importance > 0) {
          skillImportance[signal.name] = signal.importance;
        }
      }
      const occupationCode = row.sourceKey.startsWith("onet:") && /^\d{2}-\d{4}\.\d{2}$/.test(row.externalId)
        ? row.externalId : null;
      return {
        id: `occupation-${row.id}`,
        title: row.title,
        careerLensSpecializationBasedOn: null,
        industry: row.industry,
        requiredSkills: skillNamesByOccupation.get(row.id) ?? [],
        softwareSkills,
        skillImportance,
        occupationCode,
        interestTags: [row.industry, row.title, ...interestSignals],
        dataClassification: "source_backed" as const,
        sourceName: row.sourceName,
        sourceUrl: row.sourceUrl,
        countryCode: row.countryCode,
        publicationPeriod: row.publicationPeriod,
        observedListingCount: listing?.total ?? null,
        listingEvidenceUpdatedAt: listing?.latest ?? null,
        listingEvidenceSourceName: listing ? "The Adzuna API" : null,
        listingEvidenceSourceUrl: listing
          ? adzunaUrlByCountry[listing.countryCode ?? ""] ?? "https://www.adzuna.com/"
          : null,
        searchInterestNote: null,
        responsibilities: description ? [description] : [],
        sdgs: sdgsForOnetCode(occupationCode),
      };
    });
};

const readDemonstrationCandidates = (): MatchCandidate[] =>
  getCareerRoleCatalog().map((role) => ({
    id: role.id,
    title: role.title,
    careerLensSpecializationBasedOn: null,
    industry: role.domain,
    requiredSkills: role.requiredSkills,
    softwareSkills: [],
    skillImportance: {},
    occupationCode: null,
    interestTags: role.interests,
    dataClassification: "demonstration",
    sourceName: "CareerLens demonstration catalog",
    sourceUrl: null,
    countryCode: null,
    publicationPeriod: null,
    observedListingCount: null,
    listingEvidenceUpdatedAt: null,
    listingEvidenceSourceName: null,
    listingEvidenceSourceUrl: null,
    searchInterestNote: null,
    responsibilities: role.responsibilities,
    sdgs: role.sdgs,
  }));

export const getCareerMatches = async (
  profile: Profile,
  _scenario: ScenarioType = "moderate",
): Promise<CareerMatch[]> => {
  const importedCandidates = await readSourceBackedCandidates();
  const candidates = importedCandidates.length
    ? applyCareerLensSpecializations(importedCandidates, profile)
    : readDemonstrationCandidates();
  const aliases = await db
    .select({ canonicalName: careerSkillsTable.canonicalName, aliases: careerSkillsTable.aliases })
    .from(careerSkillsTable);
  const rawMatches = await runPythonMatcher({
    profile: {
      skills: profile.skills.map(({ name }) => name),
      interests: profile.interests ?? [],
      primaryDomain: profile.primaryDomain,
      fieldOfStudy: profile.fieldOfStudy ?? "",
    },
    occupations: candidates,
    skillAliases: [...aliases, ...softwareSkillAliases],
  });

  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const matches = rawMatches.map((item) => {
    const candidate = candidateById.get(item.id);
    if (!candidate) throw new Error("Career matcher returned an unknown occupation.");
    return {
      ...item,
      domain: item.industry,
      occupationCode: candidate.occupationCode,
      careerLensSpecializationBasedOn: candidate.careerLensSpecializationBasedOn ?? null,
      explanation: "",
      skillsScore: item.skillsScore,
      interestScore: item.interestScore ?? 0,
      dataClassification: candidate.dataClassification,
      sourceName: candidate.sourceName,
      sourceUrl: candidate.sourceUrl,
      countryCode: candidate.countryCode,
      publicationPeriod: candidate.publicationPeriod,
      observedListingCount: candidate.observedListingCount,
      listingEvidenceUpdatedAt: candidate.listingEvidenceUpdatedAt ? new Date(candidate.listingEvidenceUpdatedAt) : null,
      listingEvidenceSourceName: candidate.listingEvidenceSourceName,
      listingEvidenceSourceUrl: candidate.listingEvidenceSourceUrl,
      searchInterestNote: candidate.searchInterestNote,
      responsibilities: candidate.responsibilities,
      sdgs: candidate.sdgs,
    } satisfies CareerMatch;
  });

  if (!matches.length) return [];
  return explainOccupationMatches(profile, matches);
};

export const getCareerRoadmapTarget = async (profile: Profile, careerId: string) => {
  if (!/^occupation-\d+(?:--specialization--[a-z0-9-]+)?$/.test(careerId)) {
    const role = getRole(careerId);
    return role ? { role, missingSkills: undefined } : undefined;
  }
  const candidates = applyCareerLensSpecializations(await readSourceBackedCandidates(), profile);
  const candidate = candidates.find((item) => item.id === careerId);
  if (!candidate) return undefined;
  const aliases = await db
    .select({ canonicalName: careerSkillsTable.canonicalName, aliases: careerSkillsTable.aliases })
    .from(careerSkillsTable);
  const [match] = await runPythonMatcher({
    profile: {
      skills: profile.skills.map(({ name }) => name), interests: profile.interests ?? [],
      primaryDomain: profile.primaryDomain, fieldOfStudy: profile.fieldOfStudy ?? "",
    },
    occupations: [candidate],
    softwareCatalog: candidates.map((item) => item.softwareSkills),
    skillAliases: [...aliases, ...softwareSkillAliases],
    targetCareerId: careerId,
  });
  if (!match) throw new Error("The selected occupation could not be analyzed.");
  return {
    role: {
      id: candidate.id,
      title: candidate.title,
      domain: candidate.industry,
      required: candidate.requiredSkills,
      interests: candidate.interestTags,
      tasks: candidate.responsibilities,
      sdgs: candidate.sdgs,
    },
    missingSkills: match.missingSkills,
  };
};

export const getCareerRadarData = async (profileId: string) => {
  const occupations = await db
    .select({
      occupationId: careerOccupationsTable.id,
      industry: careerOccupationsTable.industry,
      sourceName: careerDataSourcesTable.name,
      sourceStatus: careerDataSourcesTable.status,
      skill: careerSkillsTable.canonicalName,
      jobCount: count(careerJobAdsTable.id),
      updatedAt: max(careerJobAdsTable.fetchedAt),
      countryCode: careerJobAdsTable.countryCode,
    })
    .from(careerOccupationsTable)
    .innerJoin(careerDataSourcesTable, eq(careerDataSourcesTable.id, careerOccupationsTable.sourceId))
    .innerJoin(careerOccupationSkillsTable, eq(careerOccupationSkillsTable.occupationId, careerOccupationsTable.id))
    .innerJoin(careerSkillsTable, eq(careerSkillsTable.id, careerOccupationSkillsTable.skillId))
    .leftJoin(careerJobAdsTable, eq(careerJobAdsTable.occupationId, careerOccupationsTable.id))
    .where(and(eq(careerDataSourcesTable.status, "active")))
    .groupBy(
      careerOccupationsTable.id,
      careerOccupationsTable.industry,
      careerDataSourcesTable.name,
      careerDataSourcesTable.status,
      careerSkillsTable.canonicalName,
      careerJobAdsTable.countryCode,
    )
    .orderBy(desc(count(careerJobAdsTable.id)))
    .limit(12);

  const latestTrends = await db
    .select({
      skill: careerSkillsTable.canonicalName,
      region: careerTrendObservationsTable.region,
      interestValue: careerTrendObservationsTable.interestValue,
      direction: careerTrendObservationsTable.direction,
      periodStart: careerTrendObservationsTable.periodStart,
      periodEnd: careerTrendObservationsTable.periodEnd,
      sourceName: careerDataSourcesTable.name,
    })
    .from(careerTrendObservationsTable)
    .innerJoin(careerSkillsTable, eq(careerSkillsTable.id, careerTrendObservationsTable.skillId))
    .innerJoin(careerDataSourcesTable, eq(careerDataSourcesTable.id, careerTrendObservationsTable.sourceId))
    .orderBy(desc(careerTrendObservationsTable.observationDate))
    .limit(100);
  const latestBySkill = new Map<string, (typeof latestTrends)[number]>();
  for (const row of latestTrends) {
    if (!latestBySkill.has(`${row.region}:${row.skill}`)) latestBySkill.set(`${row.region}:${row.skill}`, row);
  }

  const occupationMatches = await getCareerMatches(
    await readProfileForRadar(profileId),
  );
  const topObservedSkills = occupations
    .filter((row) => Number(row.jobCount) > 0 && row.countryCode)
    .map((row) => ({
      skill: row.skill,
      listingCount: Number(row.jobCount),
      sourceName: row.sourceName,
      countryCode: row.countryCode!,
      updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
    }));
  const searchInterest = Array.from(latestBySkill.values()).map((row) => ({
    skill: row.skill,
    region: row.region,
    interestValue: row.interestValue,
    direction: row.direction as "rising" | "stable" | "declining",
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    sourceName: row.sourceName,
  }));
  const marketEvidenceStatus = occupations.length
    ? "source_backed"
    : occupationMatches.some((match) => match.dataClassification === "demonstration")
      ? "demonstration"
      : "awaiting_data";
  const notes = [
    "Listing counts are observations from imported job ads, not labour-market totals or demand percentages.",
    "Google Trends values represent relative search interest, not vacancies or hiring demand.",
  ];
  if (!occupations.length) notes.push("Upload a source-backed occupation dataset and/or job listings to populate market evidence.");
  if (!searchInterest.length) notes.push("No Google Trends observations have been imported.");
  return { profileId, marketEvidenceStatus, occupationMatches, topObservedSkills, searchInterest, notes };
};

async function readProfileForRadar(profileId: string): Promise<Profile> {
  const [row] = await db
    .select({ payload: careerProfilesTable.payload })
    .from(careerProfilesTable)
    .where(eq(careerProfilesTable.id, profileId))
    .limit(1);
  if (!row) throw new Error("Career profile not found.");
  return GetProfileResponse.parse(row.payload);
}
