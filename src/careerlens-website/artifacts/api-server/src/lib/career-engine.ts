import type {
  CareerMatch,
  DataSource,
  Profile,
  ProfileSummary,
  Roadmap,
  RoadmapStep,
  ScenarioType,
  TrendSignal,
} from "@workspace/api-zod";
import { ADDITIONAL_CAREER_ROLES } from "./career-role-catalog";
import { hasSkill } from "./skill-matching";
import { learningResourcesFor } from "./learning-resources";

type Role = {
  id: string;
  title: string;
  domain: string;
  required: string[];
  interests: string[];
  trend?: number;
  tasks: string[];
  sdgs: Array<{ number: number; name: string; explanation: string }>;
};

const sdg = (
  number: number,
  name: string,
  explanation: string,
): Role["sdgs"][number] => ({ number, name, explanation });

const ROLES: Role[] = [
  ...ADDITIONAL_CAREER_ROLES.map((role) => ({ ...role, sdgs: [] })),
  {
    id: "medical-surgical-registered-nurse",
    title: "Medical-Surgical Registered Nurse",
    domain: "Healthcare and Nursing",
    required: ["Patient assessment", "Medication administration", "Wound care", "Clinical documentation", "Care coordination"],
    interests: ["nursing", "clinical care", "patient safety", "healthcare"],
    tasks: ["Assess patient needs and update care plans", "Administer medication and provide wound care", "Coordinate care with multidisciplinary hospital teams"],
    sdgs: [sdg(3, "Good Health and Well-being", "Supports patient health through clinical assessment and care.")],
  },
  {
    id: "nurse-care-coordinator",
    title: "Nurse Care Coordinator",
    domain: "Healthcare and Nursing",
    required: ["Care coordination", "Patient education", "Discharge planning", "Clinical documentation", "Interdisciplinary communication"],
    interests: ["nursing", "care coordination", "patient advocacy", "healthcare"],
    tasks: ["Coordinate care plans across clinical teams", "Prepare patients for transitions between care settings", "Help patients understand follow-up care"],
    sdgs: [sdg(3, "Good Health and Well-being", "Supports continuity of care and informed patient follow-up.")],
  },
  {
    id: "patient-safety-quality-nurse",
    title: "Patient Safety and Quality Nurse",
    domain: "Healthcare and Nursing",
    required: ["Patient safety", "Quality improvement", "Clinical audit", "Risk assessment", "Clinical documentation"],
    interests: ["nursing", "patient safety", "quality improvement", "healthcare"],
    tasks: ["Review clinical safety processes", "Support audits and quality-improvement work", "Share findings with care teams"],
    sdgs: [sdg(3, "Good Health and Well-being", "Supports safer, more consistent patient care.")],
  },
  {
    id: "ux-researcher",
    title: "UX Researcher",
    domain: "User Experience Research",
    required: ["User research", "Interviewing", "Usability testing", "Research synthesis", "Data storytelling"],
    interests: ["ux research", "research", "behavioral science", "digital products"],
    trend: 80,
    tasks: ["Plan and conduct user research", "Synthesize qualitative and quantitative evidence", "Share findings with product and design teams"],
    sdgs: [sdg(4, "Quality Education", "Research can help make digital learning products more usable and inclusive."), sdg(8, "Decent Work and Economic Growth", "Improves product decisions and the quality of digital work.")],
  },
  {
    id: "software-developer",
    title: "Software Developer",
    domain: "Information Technology",
    required: ["Python", "Java", "JavaScript", "SQL", "Git"],
    interests: ["software", "technology", "product", "programming"],
    trend: 84,
    tasks: ["Build and maintain software", "Review code and test features", "Work with product teams"],
    sdgs: [sdg(4, "Quality Education", "Creates digital tools that can widen access to learning."), sdg(8, "Decent Work and Economic Growth", "Builds productive digital infrastructure and services.")],
  },
  {
    id: "web-developer",
    title: "Web Developer",
    domain: "Information Technology",
    required: ["HTML", "CSS", "JavaScript", "React", "Accessibility"],
    interests: ["web", "design", "technology", "product"],
    trend: 79,
    tasks: ["Develop responsive web experiences", "Connect interfaces to APIs", "Improve usability and accessibility"],
    sdgs: [sdg(9, "Industry, Innovation and Infrastructure", "Develops accessible digital services and infrastructure."), sdg(8, "Decent Work and Economic Growth", "Supports digital products and economic participation.")],
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    domain: "Data and Analytics",
    required: ["SQL", "Excel", "Python", "Data visualization", "Statistics"],
    interests: ["data", "analytics", "research", "business"],
    trend: 89,
    tasks: ["Analyze structured data", "Communicate findings with visualizations", "Support evidence-based decisions"],
    sdgs: [sdg(8, "Decent Work and Economic Growth", "Helps organizations make evidence-based decisions."), sdg(9, "Industry, Innovation and Infrastructure", "Uses data to improve products and services.")],
  },
  {
    id: "qa-engineer",
    title: "QA Engineer",
    domain: "Information Technology",
    required: ["Software testing", "JavaScript", "Python", "Automation", "Problem solving"],
    interests: ["software", "technology", "quality", "testing"],
    trend: 75,
    tasks: ["Design and execute software tests", "Automate repeatable checks", "Help teams prevent product defects"],
    sdgs: [sdg(9, "Industry, Innovation and Infrastructure", "Improves reliability of digital infrastructure."), sdg(8, "Decent Work and Economic Growth", "Supports dependable technology products.")],
  },
  {
    id: "business-analyst",
    title: "Business Analyst",
    domain: "Business and Management",
    required: ["Excel", "Business communication", "Data analysis", "Process improvement", "Requirements gathering"],
    interests: ["business", "operations", "strategy", "analytics"],
    trend: 76,
    tasks: ["Clarify business needs", "Analyze processes and data", "Translate findings into actionable requirements"],
    sdgs: [sdg(8, "Decent Work and Economic Growth", "Supports more effective and sustainable organizations."), sdg(4, "Quality Education", "Helps organizations identify workforce learning needs.")],
  },
  {
    id: "marketing-analyst",
    title: "Marketing Analyst",
    domain: "Marketing and Communications",
    required: ["Marketing", "Market research", "Excel", "Data analysis", "Digital marketing measurement"],
    interests: ["marketing", "research", "communications", "analytics"],
    trend: 72,
    tasks: ["Measure campaign performance", "Research customer behavior", "Turn marketing data into recommendations"],
    sdgs: [sdg(8, "Decent Work and Economic Growth", "Supports responsible growth through measurable marketing."), sdg(12, "Responsible Consumption and Production", "Can help organizations communicate more responsible products.")],
  },
  {
    id: "operations-executive",
    title: "Operations Executive",
    domain: "Business and Management",
    required: ["Excel", "Operations", "Communication", "Process improvement", "Project coordination"],
    interests: ["operations", "business", "logistics", "management"],
    trend: 67,
    tasks: ["Coordinate operational workflows", "Track service or process performance", "Resolve routine delivery issues"],
    sdgs: [sdg(8, "Decent Work and Economic Growth", "Improves the effectiveness of operational teams."), sdg(12, "Responsible Consumption and Production", "Supports efficient use of organizational resources.")],
  },
  {
    id: "market-research-analyst",
    title: "Market Research Analyst",
    domain: "Marketing and Communications",
    required: ["Market research", "User research", "Interviewing", "Statistics", "Communication"],
    interests: ["research", "marketing", "behavioral science", "customers"],
    trend: 71,
    tasks: ["Design research studies", "Analyze customer and market evidence", "Present findings to decision-makers"],
    sdgs: [sdg(8, "Decent Work and Economic Growth", "Makes market decisions more evidence-based."), sdg(12, "Responsible Consumption and Production", "Can reveal consumer needs and reduce wasteful product decisions.")],
  },
  {
    id: "financial-analyst",
    title: "Financial Analyst",
    domain: "Finance and Accounting",
    required: ["Excel", "Financial analysis", "Financial reporting", "Forecasting", "Accounting"],
    interests: ["finance", "business", "economics", "analysis"],
    trend: 70,
    tasks: ["Review financial performance", "Build and maintain forecasts", "Prepare reports for business decisions"],
    sdgs: [sdg(8, "Decent Work and Economic Growth", "Supports responsible financial planning and investment."), sdg(9, "Industry, Innovation and Infrastructure", "Helps assess investment in productive capacity.")],
  },
  {
    id: "business-intelligence-analyst",
    title: "Business Intelligence Analyst",
    domain: "Business and Data Analytics",
    required: ["SQL", "Python", "Data visualization", "Excel", "Business analysis"],
    interests: ["data", "business", "analytics", "strategy"],
    trend: 88,
    tasks: ["Combine data from business systems", "Build analytical dashboards", "Explain trends to business teams"],
    sdgs: [sdg(8, "Decent Work and Economic Growth", "Improves business decisions through reliable insight."), sdg(9, "Industry, Innovation and Infrastructure", "Uses digital tools to improve organizational systems.")],
  },
  {
    id: "analytics-consultant",
    title: "Analytics Consultant",
    domain: "Business and Data Analytics",
    required: ["SQL", "Python", "Data visualization", "Communication", "Problem solving"],
    interests: ["analytics", "consulting", "business", "research"],
    trend: 86,
    tasks: ["Frame client problems", "Analyze data and build recommendations", "Present insights to mixed audiences"],
    sdgs: [sdg(8, "Decent Work and Economic Growth", "Helps organizations improve productivity using evidence."), sdg(9, "Industry, Innovation and Infrastructure", "Supports innovation and informed technology adoption.")],
  },
  {
    id: "mechanical-design-engineer",
    title: "Mechanical Design Engineer",
    domain: "Engineering",
    required: ["CAD", "Technical drawing", "Mathematics", "Manufacturing", "Mechanical engineering"],
    interests: ["engineering", "design", "manufacturing", "mechanical"],
    trend: 74,
    tasks: ["Create and refine mechanical designs", "Validate parts against technical constraints", "Collaborate with manufacturing teams"],
    sdgs: [sdg(9, "Industry, Innovation and Infrastructure", "Contributes to resilient industrial products and infrastructure."), sdg(12, "Responsible Consumption and Production", "Can improve material efficiency and product life cycles.")],
  },
  {
    id: "manufacturing-engineer",
    title: "Manufacturing Engineer",
    domain: "Engineering",
    required: ["Manufacturing", "Process improvement", "CAD", "Quality assurance", "Project coordination"],
    interests: ["engineering", "manufacturing", "operations", "quality"],
    trend: 73,
    tasks: ["Improve production processes", "Support quality and safety practices", "Coordinate engineering changes"],
    sdgs: [sdg(9, "Industry, Innovation and Infrastructure", "Supports more capable and resilient manufacturing."), sdg(12, "Responsible Consumption and Production", "Reduces inefficiency and material waste.")],
  },
  {
    id: "sustainability-analyst",
    title: "Sustainability Analyst",
    domain: "Sustainability and Environment",
    required: ["Data analysis", "Sustainability", "Reporting", "Excel", "Research"],
    interests: ["sustainability", "environment", "research", "impact"],
    trend: 78,
    tasks: ["Collect sustainability indicators", "Support impact reporting", "Research environmental performance"],
    sdgs: [sdg(13, "Climate Action", "Tracks evidence relevant to climate impact and mitigation."), sdg(12, "Responsible Consumption and Production", "Supports better resource and production decisions.")],
  },
];

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll("visualisation", "visualization")
    .replaceAll("javascript", "javascript")
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();

const profileSkillNames = (profile: Profile): string[] =>
  profile.skills.map((skill) => skill.name);

const makeProfile = (
  id: string,
  name: string,
  education: string,
  fieldOfStudy: string,
  primaryDomain: string,
  skills: Array<[string, string, Profile["skills"][number]["level"]]>,
  experience: Profile["experience"],
  interests: string[],
): Profile => ({
  id,
  name,
  education,
  fieldOfStudy,
  primaryDomain,
  secondaryDomains: [],
  skills: skills.map(([skill, category, level]) => ({
    name: skill,
    category,
    level,
    verified: true,
  })),
  experience,
  interests,
  certifications: [],
  confirmed: true,
  updatedAt: new Date("2025-01-07T00:00:00.000Z"),
});

export const DEMO_PROFILES: Profile[] = [
  makeProfile(
    "demo-ux",
    "Alex Morgan",
    "B.A. in Communications",
    "Communications and product analytics",
    "User Experience Research",
    [
      ["User research", "Research", "advanced"],
      ["Interviewing", "Research", "proficient"],
      ["Usability testing", "Research", "advanced"],
      ["Research synthesis", "Research", "proficient"],
      ["Figma", "Tools", "developing"],
      ["Stakeholder communication", "Communication", "proficient"],
      ["Accessibility", "Product", "developing"],
    ],
    [{ title: "Product Research Associate", organization: "Digital product team", description: "Three years supporting product discovery, user interviews, and usability studies for digital products.", years: 3 }],
    ["UX research", "digital products", "behavioral science", "customer experience"],
  ),
  makeProfile(
    "demo-it",
    "Jordan Lee",
    "B.Sc. Computer Science",
    "Computer Science",
    "Information Technology",
    [
      ["Python", "Technical", "proficient"],
      ["Java", "Technical", "developing"],
      ["SQL", "Technical", "proficient"],
      ["HTML", "Technical", "proficient"],
      ["CSS", "Technical", "proficient"],
      ["JavaScript", "Technical", "proficient"],
      ["Git", "Tools", "developing"],
      ["Software testing", "Technical", "developing"],
    ],
    [{ title: "Student developer", organization: "University projects", description: "Built a library management system and responsive web development project.", years: 1 }],
    ["software", "web development", "technology", "data"],
  ),
  makeProfile(
    "demo-business",
    "Maya Tan",
    "B.B.A. Business Administration",
    "Business Administration",
    "Business and Management",
    [
      ["Excel", "Tools", "advanced"],
      ["Marketing", "Business", "proficient"],
      ["Financial analysis", "Finance", "developing"],
      ["Business communication", "Business", "advanced"],
      ["Market research", "Research", "proficient"],
      ["Financial reporting", "Finance", "developing"],
      ["Project coordination", "Business", "proficient"],
    ],
    [{ title: "Marketing intern", organization: "Consumer goods company", description: "Supported market research, campaign tracking, and business reporting.", years: 1 }],
    ["marketing", "business", "finance", "market research"],
  ),
  makeProfile(
    "demo-engineering",
    "Ethan Lim",
    "B.Eng. Mechanical Engineering",
    "Mechanical Engineering",
    "Engineering",
    [
      ["CAD", "Technical", "proficient"],
      ["Technical drawing", "Technical", "proficient"],
      ["Mathematics", "Technical", "advanced"],
      ["Manufacturing", "Technical", "developing"],
      ["Mechanical engineering", "Technical", "proficient"],
      ["Quality assurance", "Technical", "developing"],
      ["Process improvement", "Business", "developing"],
    ],
    [{ title: "Design project assistant", organization: "University engineering lab", description: "Produced CAD designs and technical drawings for a manufacturing process project.", years: 1 }],
    ["engineering", "manufacturing", "design", "mechanical systems"],
  ),
  makeProfile(
    "demo-hybrid",
    "Sam Lee",
    "B.B.A. Business Administration",
    "Business Administration and analytics",
    "Business and Data Analytics",
    [
      ["Excel", "Tools", "advanced"],
      ["Business communication", "Business", "proficient"],
      ["SQL", "Technical", "developing"],
      ["Python", "Technical", "developing"],
      ["Data visualization", "Analytics", "developing"],
      ["Market research", "Research", "proficient"],
      ["Business analysis", "Business", "proficient"],
    ],
    [{ title: "Business analytics intern", organization: "Retail technology team", description: "Combined customer research with SQL extracts and early Python dashboards.", years: 1 }],
    ["business", "analytics", "data", "consulting", "marketing"],
  ),
];

export const DEMO_SUMMARIES: ProfileSummary[] = DEMO_PROFILES.map((profile) => ({
  id: profile.id,
  name: profile.name,
  domain: profile.primaryDomain,
  label: profile.id === "demo-ux" ? "Reference profile" : "Synthetic demo profile",
}));

const trendSource = "World Economic Forum: Future of Jobs Report 2025";
const observedAt = "2025-01-07";
const trendCatalog = [
  ["AI literacy", "rising", 92, "AI and big data are among the fastest-growing skill areas in the report; this is a CareerLens relevance index, not a job-posting percentage."],
  ["Data literacy", "rising", 87, "Analytical thinking and technology literacy feature prominently in the report's future-skills findings; index is directional, not a vacancy count."],
  ["Cybersecurity", "rising", 82, "Networks and cybersecurity are identified among the fastest-growing skills; index represents relative CareerLens relevance."],
  ["Technological literacy", "rising", 84, "Technology literacy is identified as a fast-growing skill area in the report."],
  ["Creative thinking", "rising", 76, "Creative thinking is listed among skills expected to grow in importance."],
  ["Resilience", "rising", 72, "Resilience, flexibility, and agility feature among skills expected to rise."],
  ["Data entry", "declining", 24, "The report identifies clerical and data-entry roles among roles expected to decline; this is a directional index, not a demand estimate."],
  ["Routine administrative processing", "declining", 28, "Routine clerical work is exposed to structural change; no live job-market count is represented."],
] as const;

export const buildTrendSignals = (_profile: Profile): TrendSignal[] =>
  trendCatalog.map(([skill, direction, score, evidence]) => ({
    skill,
    direction,
    score,
    source: trendSource,
    observedAt: new Date(`${observedAt}T00:00:00.000Z`),
    evidence,
  }));

export const DATA_SOURCES: DataSource[] = [
  {
    name: trendSource,
    purpose: "Dated qualitative evidence for future skills and occupational shifts; the displayed index is a directional relevance score, not measured market demand.",
    url: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/",
    status: "snapshot",
    publicationDate: new Date(`${observedAt}T00:00:00.000Z`),
    lastUpdated: new Date(`${observedAt}T00:00:00.000Z`),
    methodology: "A dated source snapshot. Skill direction follows the report's qualitative findings. CareerLens shows a separate relative relevance index; it is not a live job-posting count or a probability. Match score = 60% role-specific skills alignment + 25% stated-interest alignment + 15% directional trend alignment. Education and experience inform the explanation but never disqualify a cross-domain role.",
  },
  {
    name: "ESCO",
    purpose: "European Skills, Competences, Qualifications and Occupations classification reference.",
    url: "https://esco.ec.europa.eu/en",
    status: "planned",
    publicationDate: new Date("2024-05-15T00:00:00.000Z"),
    lastUpdated: new Date("2024-05-15T00:00:00.000Z"),
    methodology: "Planned source for occupation and skill normalization; not connected to this demonstration build.",
  },
  {
    name: "United Nations Sustainable Development Goals",
    purpose: "Official SDG names and goal context used to explain career contribution mappings.",
    url: "https://sdgs.un.org/goals",
    status: "active",
    publicationDate: new Date("2015-09-25T00:00:00.000Z"),
    lastUpdated: new Date("2015-09-25T00:00:00.000Z"),
    methodology: "Career-to-goal links are documented qualitative associations, not official UN classifications or impact claims.",
  },
];

const trendBySkill = new Map(
  trendCatalog.map(([skill, direction, score]) => [
    normalize(skill),
    { direction, score },
  ]),
);

const scenarioTrendScore = (
  role: Role & { trend: number },
  scenario: ScenarioType,
): number => {
  if (scenario === "moderate") return role.trend;
  const domain = role.domain.toLowerCase();
  const emerging = domain.includes("data") || domain.includes("technology") || domain.includes("it");
  const routine = role.id === "operations-executive" || role.id === "financial-analyst";
  return Math.max(15, Math.min(100, role.trend + (emerging ? 8 : routine ? -9 : -2)));
};

export const calculateMatches = (
  profile: Profile,
  scenario: ScenarioType = "moderate",
  hypotheticalSkill?: string | null,
  signalSet?: TrendSignal[],
): CareerMatch[] => {
  const skills = profileSkillNames(profile);
  if (hypotheticalSkill?.trim()) skills.push(hypotheticalSkill.trim());
  const interests = profile.interests.map(normalize);
  const roles = ROLES.map((role) => {
    const matched = role.required.filter((skill) => hasSkill(skills, skill));
    const missing = role.required.filter((skill) => !hasSkill(skills, skill));
    const skillsScore = Math.round((matched.length / role.required.length) * 100);
    const interestHits = role.interests.filter((interest) =>
      interests.some((candidate) => candidate.includes(interest) || interest.includes(candidate)),
    ).length;
    const interestScore = interestHits
      ? Math.min(100, 46 + interestHits * 18)
      : profile.primaryDomain.toLowerCase().includes(role.domain.toLowerCase().split(" ")[0])
        ? 58
        : 34;
    const applicableSignals = signalSet?.filter((signal) =>
      role.required.some((requiredSkill) => hasSkill([signal.skill], requiredSkill)),
    );
    const evidenceTrend =
      applicableSignals && applicableSignals.length
        ? Math.round(
            applicableSignals.reduce((total, signal) => total + signal.score, 0) /
              applicableSignals.length,
          )
        : role.trend;
    const trendScore =
      evidenceTrend === undefined
        ? undefined
        : scenarioTrendScore({ ...role, trend: evidenceTrend }, scenario);
    const scoreWeight = trendScore === undefined ? 0.85 : 1;
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (skillsScore * 0.6 + interestScore * 0.25 + (trendScore ?? 0) * 0.15) /
            scoreWeight,
        ),
      ),
    );
    const supporting = profile.experience
      .filter((item) => normalize(item.description + " " + item.title).includes(role.domain.toLowerCase().split(" ")[0]))
      .map((item) => item.title);
    const explanationParts = [
      matched.length
        ? `${matched.slice(0, 3).join(", ")} ${matched.length === 1 ? "is" : "are"} already in your confirmed profile`
        : "your current profile has limited direct skill overlap",
      interests.length ? `your stated interests inform the ranking` : "no interests have been added yet",
      `the ${scenario} scenario uses an evidence-based directional signal`,
    ];
    if (supporting.length) explanationParts.push(`experience includes ${supporting.join(", ")}`);
    return {
      id: role.id,
      title: role.title,
      domain: role.domain,
      score,
      skillsScore,
      interestScore,
      ...(trendScore === undefined ? {} : { trendScore }),
      matchedSkills: matched,
      missingSkills: missing,
      explanation: `${explanationParts.join("; ")}. Match score is a fit measure, not a probability of being hired.`,
      responsibilities: role.tasks,
      sdgs: role.sdgs,
    } satisfies CareerMatch;
  });
  return roles.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
};

export const getRole = (id: string): Role | undefined =>
  ROLES.find((role) => role.id === id);

export const getCareerRoleCatalog = () =>
  ROLES.map((role) => ({
    id: role.id,
    title: role.title,
    domain: role.domain,
    requiredSkills: role.required,
    interests: role.interests,
    responsibilities: role.tasks,
    sdgs: role.sdgs,
  }));

export const buildRoadmap = (
  profile: Profile,
  role: Role,
  id = crypto.randomUUID(),
): Roadmap => {
  const gaps = role.required.filter((skill) => !hasSkill(profileSkillNames(profile), skill));
  const steps: RoadmapStep[] = gaps.map((skill, index) => ({
    id: `${id}-step-${index + 1}`,
    skill,
    reason: `${skill} is part of the reference requirements for ${role.title} and is not yet in your confirmed profile.`,
    duration: index === 0 ? "2–4 weeks" : "3–6 weeks",
    difficulty: index === 0 ? "Foundational" : "Developing",
    prerequisites: index ? [gaps[index - 1]] : [],
    resources: learningResourcesFor(skill, role.title),
    complete: false,
  }));
  return {
    id,
    profileId: profile.id,
    careerId: role.id,
    careerTitle: role.title,
    progress: 0,
    steps,
  };
};

export const getRelevantSkillTrend = (skill: string): number => {
  const trend = trendBySkill.get(normalize(skill));
  return trend?.score ?? 50;
};

export const inferDomain = (skills: string[], education: string): string => {
  const all = normalize(`${skills.join(" ")} ${education}`);
  const counts = [
    ["Information Technology", ["python", "java", "javascript", "software", "sql", "web"]],
    ["Business and Management", ["business", "marketing", "operations", "excel", "finance"]],
    ["Engineering", ["engineering", "cad", "manufacturing", "technical drawing", "mechanical"]],
    ["Healthcare", ["healthcare", "clinical", "nursing", "patient"]],
    ["Education", ["teaching", "education", "curriculum", "learning"]],
    ["Science and Research", ["research", "statistics", "laboratory", "science"]],
    ["Sustainability and Environment", ["sustainability", "environment", "climate"]],
  ] as const;
  return counts
    .map(([domain, terms]) => ({ domain, score: terms.filter((term) => all.includes(term)).length }))
    .sort((a, b) => b.score - a.score)[0]?.score
    ? counts
        .map(([domain, terms]) => ({ domain, score: terms.filter((term) => all.includes(term)).length }))
        .sort((a, b) => b.score - a.score)[0].domain
    : "Other";
};
