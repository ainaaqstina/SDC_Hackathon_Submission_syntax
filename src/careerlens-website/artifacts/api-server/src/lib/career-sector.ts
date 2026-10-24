import type { Profile } from "@workspace/api-zod";

export type CareerSector = {
  key: string;
  label: string;
};

type SectorDefinition = CareerSector & {
  terms: string[];
};

const SECTORS: SectorDefinition[] = [
  { key: "healthcare", label: "Healthcare and Nursing", terms: ["healthcare", "health care", "health and social care", "health and social assistance", "nursing", "nurse", "registered nurse", "clinical", "hospital", "hospitals", "patient care", "medical", "medicine", "physician", "doctor", "dentist", "therapist", "paramedic", "midwifery", "pharmacy", "pharmacist"] },
  { key: "data-analytics", label: "Data and Analytics", terms: ["data and analytics", "data analytics", "data analyst", "data science", "business intelligence", "business and data analytics", "analytics", "statistics"] },
  { key: "information-technology", label: "Information Technology", terms: ["information technology", "software development", "software engineering", "software", "web development", "cybersecurity", "cyber security", "computer science", "cloud computing", "cloud engineering", "IT support", "systems administration", "systems administrator", "network engineering", "devops", "technology"] },
  { key: "engineering", label: "Engineering and Manufacturing", terms: ["engineering", "engineer", "manufacturing", "mechanical", "electrical", "civil engineering", "industrial engineering", "production"] },
  { key: "marketing", label: "Marketing and Communications", terms: ["marketing and communications", "marketing", "communications", "public relations", "advertising", "market research", "digital media", "content strategy", "content marketing"] },
  { key: "finance", label: "Finance and Accounting", terms: ["finance and accounting", "finance", "financial", "accounting", "accountant", "banking", "audit", "tax"] },
  { key: "sustainability", label: "Sustainability and Environment", terms: ["sustainability", "environment", "environmental", "climate", "conservation", "esg"] },
  { key: "business-management", label: "Business and Management", terms: ["business and management", "business management", "business administration", "operations", "management", "project management", "process improvement"] },
  { key: "education", label: "Education and Training", terms: ["education and training", "education", "teaching", "teacher", "school", "training", "instruction", "learning and development"] },
  { key: "human-resources", label: "Human Resources", terms: ["human resources", "hr", "people operations", "talent acquisition", "recruitment", "people management"] },
  { key: "legal", label: "Legal Services", terms: ["legal services", "law", "legal", "lawyer", "solicitor", "paralegal", "compliance"] },
  { key: "public-service", label: "Government and Public Service", terms: ["government", "public service", "public policy", "civil service", "public administration", "urban planning", "social work", "social services"] },
  { key: "hospitality", label: "Hospitality and Food Services", terms: ["hospitality", "food services", "food service", "restaurant", "hotel", "catering", "culinary"] },
  { key: "retail", label: "Retail and E-commerce", terms: ["retail", "e-commerce", "ecommerce", "merchandising", "store operations"] },
  { key: "logistics", label: "Logistics and Transportation", terms: ["logistics", "transportation", "supply chain", "shipping", "aviation", "warehousing"] },
  { key: "construction", label: "Construction and Trades", terms: ["construction", "building trades", "electrician", "plumbing", "carpentry"] },
  { key: "science-research", label: "Science and Research", terms: ["science", "scientific research", "laboratory", "lab technician", "biomedical research", "research scientist"] },
  { key: "creative-media", label: "Creative, Design and Media", terms: ["creative", "graphic design", "visual design", "media", "journalism", "content creation", "user experience research", "ux research", "product design"] },
  { key: "sales-service", label: "Sales and Customer Service", terms: ["sales", "customer service", "customer support", "account management"] },
  { key: "agriculture", label: "Agriculture and Food Production", terms: ["agriculture", "agricultural", "farming", "farm operations", "agronomy", "crop production", "food production"] },
  { key: "public-safety", label: "Public Safety and Security", terms: ["public safety", "security operations", "fire service", "firefighter", "emergency management", "law enforcement"] },
  { key: "real-estate", label: "Real Estate and Property", terms: ["real estate", "property management", "property manager", "estate agent", "property services"] },
  { key: "insurance", label: "Insurance", terms: ["insurance", "insurance claims", "insurance underwriting", "underwriting"] },
];

const normalize = (value: string): string =>
  value.toLowerCase().replaceAll("&", " and ").replaceAll(/[^a-z0-9]+/g, " ").trim();

const containsTerm = (text: string, term: string): boolean => {
  const normalizedText = ` ${normalize(text)} `;
  const normalizedTerm = ` ${normalize(term)} `;
  return normalizedText.includes(normalizedTerm);
};

const matchingSectors = (text: string): SectorDefinition[] =>
  SECTORS
    .map((sector) => ({
      sector,
      specificity: Math.max(
        0,
        ...sector.terms
          .filter((term) => containsTerm(text, term))
          .map((term) => normalize(term).length),
      ),
    }))
    .filter(({ specificity }) => specificity > 0)
    .sort((a, b) => b.specificity - a.specificity)
    .map(({ sector }) => sector);

const isGenericDomain = (value: string): boolean =>
  ["", "other", "unknown", "not specified", "general", "n a", "na"].includes(normalize(value));

export const inferProfileSector = (profile: Profile): CareerSector | null => {
  const declaredDomain = profile.primaryDomain?.trim() ?? "";
  const primaryMatches = matchingSectors(declaredDomain);
  if (primaryMatches.length) return primaryMatches[0];

  const evidence: Array<{ text: string; weight: number }> = [
    ...((profile.secondaryDomains ?? []).map((text) => ({ text, weight: 5 }))),
    ...(profile.experience ?? []).flatMap((item) => [
      { text: item.title ?? "", weight: 7 },
      { text: item.description ?? "", weight: 3 },
      { text: item.organization ?? "", weight: 1 },
    ]),
    ...((profile.certifications ?? []).map((text) => ({ text, weight: 3 }))),
    { text: profile.fieldOfStudy ?? "", weight: 2 },
    { text: profile.education ?? "", weight: 1 },
    ...((profile.skills ?? []).map((skill) => ({ text: skill.name, weight: 1 }))),
    ...((profile.interests ?? []).map((text) => ({ text, weight: 1 }))),
  ];
  const scores = new Map<string, { sector: SectorDefinition; score: number }>();
  for (const item of evidence) {
    for (const sector of matchingSectors(item.text)) {
      const current = scores.get(sector.key);
      scores.set(sector.key, { sector, score: (current?.score ?? 0) + item.weight });
    }
  }
  const strongest = [...scores.values()].sort((a, b) => b.score - a.score)[0];
  if (strongest) return strongest.sector;

  const customDomain = [declaredDomain, ...(profile.secondaryDomains ?? [])]
    .find((value) => !isGenericDomain(value));
  if (!customDomain) return null;
  return { key: `custom:${normalize(customDomain)}`, label: customDomain };
};

const customIndustryMatches = (profileSector: CareerSector, candidateIndustry: string): boolean => {
  const profileTerms = normalize(profileSector.label)
    .split(" ")
    .filter((term) => term.length > 2 && !["and", "the", "for"].includes(term));
  const candidateTerms = new Set(normalize(candidateIndustry).split(" "));
  const overlap = profileTerms.filter((term) => candidateTerms.has(term)).length;
  return profileTerms.length > 0 && overlap / profileTerms.length >= 0.5;
};

export const filterCandidatesToProfileSector = <T extends {
  domain?: string;
  industry?: string;
  title?: string;
}>(profile: Profile, candidates: T[]): T[] => {
  const profileSector = inferProfileSector(profile);
  if (!profileSector) return [];

  return candidates.filter((candidate) => {
    const industry = candidate.domain || candidate.industry || "";
    const candidateSector =
      matchingSectors(industry)[0] ??
      matchingSectors(candidate.title ?? "")[0];
    if (profileSector.key.startsWith("custom:")) {
      return customIndustryMatches(profileSector, industry || candidate.title || "");
    }
    if (candidateSector) return candidateSector.key === profileSector.key;
    return customIndustryMatches(profileSector, industry || candidate.title || "");
  });
};
