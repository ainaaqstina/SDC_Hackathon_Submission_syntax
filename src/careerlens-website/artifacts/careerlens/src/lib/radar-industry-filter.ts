export const RADAR_INDUSTRIES = [
  "Healthcare and Nursing",
  "Data and Analytics",
  "Information Technology",
  "Engineering and Manufacturing",
  "Marketing and Communications",
  "Finance and Accounting",
  "Sustainability and Environment",
  "Business and Management",
  "Education and Training",
  "Human Resources",
  "Legal Services",
  "Government and Public Service",
  "Hospitality and Food Services",
  "Retail and E-commerce",
  "Logistics and Transportation",
  "Construction and Trades",
  "Science and Research",
  "Creative, Design and Media",
  "Sales and Customer Service",
  "Agriculture and Food Production",
  "Public Safety and Security",
  "Real Estate and Property",
  "Insurance",
] as const;

export const RADAR_INDUSTRY_OPTIONS = [
  { value: "all", label: "All industries" },
  ...RADAR_INDUSTRIES.map((industry) => ({ value: industry, label: industry })),
];

const OFFICE_AND_OPERATIONS_INDUSTRIES = [
  "Healthcare and Nursing",
  "Finance and Accounting",
  "Business and Management",
  "Education and Training",
  "Human Resources",
  "Legal Services",
  "Government and Public Service",
  "Hospitality and Food Services",
  "Retail and E-commerce",
  "Logistics and Transportation",
  "Real Estate and Property",
  "Insurance",
  "Sales and Customer Service",
] as const;

const DIGITAL_SYSTEMS_INDUSTRIES = [
  "Healthcare and Nursing",
  "Data and Analytics",
  "Information Technology",
  "Finance and Accounting",
  "Business and Management",
  "Education and Training",
  "Human Resources",
  "Government and Public Service",
  "Retail and E-commerce",
  "Logistics and Transportation",
  "Public Safety and Security",
  "Real Estate and Property",
  "Insurance",
] as const;

const SHARED_SKILLS = new Set([
  "ai literacy", "data literacy", "technological literacy", "resilience",
]);

const normalizeSkill = (skill: string) => skill.trim().toLowerCase().replace(/\s+/g, " ");

export const isSharedRadarSignal = (skill: string): boolean => SHARED_SKILLS.has(normalizeSkill(skill));

const SKILL_INDUSTRIES: Record<string, readonly string[]> = {
  "creative thinking": [
    "Healthcare and Nursing",
    "Data and Analytics",
    "Information Technology",
    "Engineering and Manufacturing",
    "Marketing and Communications",
    "Sustainability and Environment",
    "Business and Management",
    "Education and Training",
    "Hospitality and Food Services",
    "Retail and E-commerce",
    "Science and Research",
    "Creative, Design and Media",
    "Agriculture and Food Production",
    "Real Estate and Property",
    "Sales and Customer Service",
  ],
  cybersecurity: DIGITAL_SYSTEMS_INDUSTRIES,
  "data entry": OFFICE_AND_OPERATIONS_INDUSTRIES,
  "routine administrative processing": OFFICE_AND_OPERATIONS_INDUSTRIES,
};

export const filterRadarSignalsByIndustry = <T extends { skill: string }>(
  trends: T[],
  industry: string,
  options: { includeShared?: boolean } = {},
): T[] => {
  if (industry === "all") return trends;
  return trends.filter((trend) =>
    SKILL_INDUSTRIES[normalizeSkill(trend.skill)]?.includes(industry)
      || (options.includeShared === true && isSharedRadarSignal(trend.skill)),
  );
};
