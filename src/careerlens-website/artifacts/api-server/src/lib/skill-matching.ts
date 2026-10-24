const groups: Record<string, string[]> = {
  JavaScript: ["js", "javascript", "ecmascript"],
  Python: ["python"],
  Java: ["java", "oracle java"],
  HTML: ["html", "hypertext markup language", "hypertext markup language html"],
  CSS: ["css", "cascading style sheets", "cascading style sheets css"],
  SQL: ["sql", "structured query language", "structured query language sql"],
  React: ["react", "reactjs", "react.js"],
  "Node.js": ["nodejs", "node.js", "node js"],
  "Data visualization": ["data visualization", "power bi", "tableau", "data viz", "data visualisation"],
  "Data analysis": ["data analysis", "data analytics", "analytics"],
  "Business communication": ["business communication", "communication", "business writing"],
  "Market research": ["market research", "customer research", "consumer research"],
  "User research": ["user research", "user interviews", "ux research"],
  "Software testing": ["software testing", "qa", "quality assurance", "test automation"],
  CAD: ["cad", "autocad", "solidworks", "computer aided design"],
  "Financial analysis": ["financial analysis", "financial modeling", "financial modelling"],
  "Digital marketing measurement": ["digital marketing measurement", "marketing analytics", "campaign analytics"],
  "Requirements gathering": ["requirements gathering", "business requirements", "stakeholder requirements"],
};

// Exact equivalents only. Do not equate different tools (e.g. Tableau and Power BI)
// when evaluating source-listed software examples.
export const softwareSkillAliases = [
  ...["JavaScript", "Python", "Java", "HTML", "CSS", "SQL", "React", "Node.js"].map((name) => ({
    canonicalName: name, aliases: groups[name],
  })),
  { canonicalName: "Microsoft Excel", aliases: ["Excel", "Microsoft Excel"] },
  { canonicalName: "Microsoft Word", aliases: ["Word", "Microsoft Word"] },
  { canonicalName: "Microsoft PowerPoint", aliases: ["PowerPoint", "Microsoft PowerPoint"] },
];

const key = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const aliases = new Map(Object.entries(groups).flatMap(([name, values]) => values.map((value) => [key(value), name] as const)));

export const canonicalSkillName = (name: string): string => aliases.get(key(name)) ?? name.trim();
export const skillMentioned = (text: string, skill: string): boolean => {
  const canonical = canonicalSkillName(skill);
  const terms = groups[canonical] ?? [canonical];
  const normalized = ` ${key(text)} `;
  return terms.some((term) => normalized.includes(` ${key(term)} `));
};

export const hasSkill = (actual: string[], target: string): boolean => {
  if (!target.trim()) return false;
  const wanted = key(canonicalSkillName(target));
  return actual.filter((item) => item.trim()).some((item) => {
    const value = key(canonicalSkillName(item));
    return value === wanted || ` ${value} `.includes(` ${wanted} `);
  });
};

export const assessSkillGaps = (actual: string[], required: string[]) => {
  const requirements = [...new Map(required.filter((item) => item.trim()).map((item) => [key(canonicalSkillName(item)), item.trim()])).values()];
  return {
    insufficientInformation: requirements.length === 0,
    matched: requirements.filter((skill) => hasSkill(actual, skill)),
    missing: requirements.filter((skill) => !hasSkill(actual, skill)),
  };
};
