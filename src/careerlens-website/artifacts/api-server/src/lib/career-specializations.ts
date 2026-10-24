import type { Profile } from "@workspace/api-zod";

type SpecializationRule = {
  sourceCode: string;
  title: string;
  triggers: string[];
};

// Specific display titles are CareerLens specializations of these cited O*NET
// occupations. Skill evidence, code, and SDG links stay attached to the source role.
const specializationRules: SpecializationRule[] = [
  {
    sourceCode: "15-1254.00", title: "Frontend Developer",
    triggers: ["front end", "frontend", "web development", "web developer", "react", "html", "css", "angular", "vue"],
  },
  {
    sourceCode: "15-1252.00", title: "Back-End Developer",
    triggers: ["back end developer", "backend developer", "back end development", "backend development"],
  },
  {
    sourceCode: "15-1252.00", title: "Full-Stack Developer",
    triggers: ["full stack", "fullstack"],
  },
  {
    sourceCode: "15-1253.00", title: "QA Automation Engineer",
    triggers: ["qa automation", "test automation", "software testing", "quality assurance testing"],
  },
  {
    sourceCode: "15-1252.00", title: "Software Developer",
    triggers: ["software developer", "software development", "software engineer", "software engineering", "programming"],
  },
  {
    sourceCode: "29-1141.01", title: "Medical-Surgical Registered Nurse",
    triggers: ["medical surgical", "med surg", "medsurg", "acute care", "registered nurse", "nursing"],
  },
  {
    sourceCode: "51-1011.00", title: "Bakery Production Supervisor",
    triggers: ["bakery", "baker", "baking", "pastry"],
  },
  {
    sourceCode: "43-4171.00", title: "Receptionist",
    triggers: ["receptionist", "reception", "front desk", "office administration"],
  },
];

const normalize = (value: string) =>
  value.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const profileContext = (profile: Profile) =>
  normalize([
    profile.primaryDomain, profile.fieldOfStudy ?? "",
    ...(profile.secondaryDomains ?? []), ...(profile.interests ?? []),
    ...profile.skills.map((skill) => skill.name),
    ...(profile.certifications ?? []),
    JSON.stringify(profile.experience),
  ].join(" "));

export type SpecializableOccupation = {
  id: string;
  title: string;
  occupationCode: string | null;
  careerLensSpecializationBasedOn?: string | null;
};

/** Add one evidence-backed, profile-relevant display specialization per O*NET code. */
export const applyCareerLensSpecializations = <T extends SpecializableOccupation>(
  occupations: T[],
  profile: Profile,
): T[] => {
  const context = profileContext(profile);
  const programmingLanguages = [
    "python", "java", "javascript", "typescript", "ruby", "rust", "swift", "php", "kotlin", "scala",
  ];
  const hasMultipleProgrammingLanguages =
    programmingLanguages.filter((language) => new RegExp(`\\b${language}\\b`).test(context)).length >= 2;
  const ruleByCode = new Map<string, SpecializationRule>();
  for (const rule of specializationRules) {
    if (
      !ruleByCode.has(rule.sourceCode)
      && (
        rule.triggers.some((trigger) => context.includes(normalize(trigger)))
        || (rule.title === "Software Developer" && hasMultipleProgrammingLanguages)
      )
    ) {
      ruleByCode.set(rule.sourceCode, rule);
    }
  }

  const baseByCode = new Map(
    occupations
      .filter((occupation) => occupation.occupationCode)
      .map((occupation) => [occupation.occupationCode!, occupation]),
  );
  const selected = [...ruleByCode.entries()]
    .flatMap(([code, rule]) => {
      const base = baseByCode.get(code);
      return base ? [{ base, rule }] : [];
    });
  const replacedCodes = new Set(selected.map(({ rule }) => rule.sourceCode));
  const specialized = selected.map(({ base, rule }) => ({
    ...base,
    id: `${base.id}--specialization--${normalize(rule.title).replace(/ /g, "-")}`,
    title: rule.title,
    careerLensSpecializationBasedOn: base.title,
  }) as T);

  return [
    ...occupations.filter((occupation) => !occupation.occupationCode || !replacedCodes.has(occupation.occupationCode)),
    ...specialized,
  ];
};
