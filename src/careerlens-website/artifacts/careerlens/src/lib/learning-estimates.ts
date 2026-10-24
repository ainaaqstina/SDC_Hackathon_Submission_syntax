export type StartingLevel = 'new' | 'related' | 'practicing';
export type LearningGoal = 'intro' | 'practical' | 'advanced';
export type SkillFamily = 'programming' | 'data' | 'engineering' | 'design' | 'business' | 'tools' | 'soft' | 'language' | 'science' | 'regulated';
type Hours = readonly [number, number];
type Source = { label: string; url: string };
type SkillPlan = {
  name: string; aliases: string[]; hours: Hours; family: SkillFamily;
  prerequisites?: Hours; practiceWeeks?: number; source?: Source;
};
export const skillFamilies: { value: SkillFamily; label: string; hours: Hours }[] = [
  { value: 'programming', label: 'Programming and software development', hours: [160, 300] },
  { value: 'data', label: 'Data, analytics and AI', hours: [180, 320] },
  { value: 'engineering', label: 'Engineering and technical design', hours: [160, 360] },
  { value: 'design', label: 'Design and research', hours: [100, 200] },
  { value: 'business', label: 'Business, finance and operations', hours: [80, 180] },
  { value: 'tools', label: 'A specific software or office tool', hours: [40, 100] },
  { value: 'soft', label: 'Communication, collaboration or personal effectiveness', hours: [30, 80] },
  { value: 'language', label: 'Conversational language foundations', hours: [200, 400] },
  { value: 'science', label: 'Scientific or mathematical foundations', hours: [120, 240] },
  { value: 'regulated', label: 'Clinical, licensed or safety-critical practice', hours: [0, 0] },
];
const plan = (name: string, aliases: string[], hours: Hours, family: SkillFamily, extra: Partial<SkillPlan> = {}): SkillPlan =>
  ({ name, aliases: [name, ...aliases], hours, family, ...extra });

// CareerLens planning assumptions for foundations + applied practice, NOT measured
// population averages, guaranteed mastery, or provider completion claims.
// Three references below anchor guided-study workload only; additional practice
// and prerequisite allowances are explicitly CareerLens estimates.
export const skillPlans: SkillPlan[] = [
  plan('Machine learning', ['ml', 'supervised learning', 'unsupervised learning'], [140, 220], 'data', {
    prerequisites: [60, 140], source: { label: 'Machine Learning Specialization: listed courses total about 95 guided hours; our range also allows for practice and, when needed, prerequisites.', url: 'https://www.coursera.org/specializations/machine-learning-introduction' },
  }),
  plan('Deep learning', ['neural networks', 'computer vision', 'natural language processing', 'nlp', 'llm development'], [180, 320], 'data', { prerequisites: [120, 240] }),
  plan('Generative AI applications', ['generative ai', 'rag', 'retrieval augmented generation'], [80, 160], 'data', { prerequisites: [60, 120] }),
  plan('Cybersecurity', ['information security', 'penetration testing', 'ethical hacking'], [180, 320], 'programming', { prerequisites: [80, 160] }),
  plan('Cloud computing', ['aws', 'azure', 'google cloud', 'gcp'], [120, 240], 'programming', { prerequisites: [40, 80] }),
  plan('DevOps', ['kubernetes', 'ci cd', 'infrastructure as code'], [160, 280], 'programming', { prerequisites: [80, 160] }),
  plan('React Native', ['reactnative'], [120, 220], 'programming', { prerequisites: [80, 160] }),
  plan('React', ['reactjs', 'react js'], [80, 160], 'programming', { prerequisites: [80, 140] }),
  plan('Angular', ['angularjs'], [100, 180], 'programming', { prerequisites: [80, 140] }),
  plan('Vue', ['vuejs', 'vue js'], [70, 140], 'programming', { prerequisites: [60, 120] }),
  plan('Node.js', ['nodejs', 'node js', 'express js'], [90, 160], 'programming', { prerequisites: [60, 120] }),
  plan('Python', ['python programming'], [100, 160], 'programming', {
    source: { label: 'Python for Everybody: listed courses total about 79 guided hours. Our planning range adds independent practice; provider completion is not mastery.', url: 'https://www.coursera.org/specializations/python' },
  }),
  plan('JavaScript', ['js', 'ecmascript'], [100, 180], 'programming'),
  plan('TypeScript', ['ts'], [50, 100], 'programming', { prerequisites: [80, 140] }),
  plan('Java', ['java programming'], [120, 220], 'programming'),
  plan('C++', ['cpp', 'c plus plus'], [160, 280], 'programming'),
  plan('C#', ['c sharp', 'csharp', 'dotnet', 'dot net'], [120, 220], 'programming'),
  plan('C', ['c programming'], [120, 220], 'programming'),
  plan('SQL', ['structured query language', 'postgresql', 'mysql', 'sqlite'], [50, 100], 'data'),
  plan('R programming', ['r language', 'r'], [100, 180], 'data'),
  plan('HTML', ['hypertext markup language'], [25, 50], 'programming'),
  plan('CSS', ['cascading style sheets'], [40, 80], 'programming', { prerequisites: [20, 40] }),
  plan('Full-stack web development', ['full stack', 'fullstack', 'software development', 'web development'], [300, 600], 'programming'),
  plan('Programming foundations', ['programming', 'coding', 'software engineering'], [160, 300], 'programming'),
  plan('Git', ['github', 'version control'], [20, 40], 'tools'),
  plan('Docker', ['containerization'], [40, 80], 'tools', { prerequisites: [30, 60] }),
  plan('Linux', ['linux administration', 'shell scripting', 'bash'], [60, 120], 'tools'),
  plan('Software testing', ['test automation', 'quality assurance', 'qa', 'selenium'], [80, 160], 'programming', { prerequisites: [40, 80] }),
  plan('Computer networking', ['network administration', 'network protocols', 'tcp ip'], [100, 200], 'programming'),
  plan('Data science', ['data scientist'], [320, 600], 'data', { prerequisites: [160, 300] }),
  plan('Data analytics', ['data analysis', 'business analytics'], [240, 360], 'data', {
    source: { label: 'Google Data Analytics describes over 180 hours of instruction plus assessments. Our broader range includes independent application; this is not a job-readiness guarantee.', url: 'https://www.coursera.org/professional-certificates/google-data-analytics' },
  }),
  plan('Data engineering', ['etl', 'data pipelines', 'big data'], [180, 320], 'data', { prerequisites: [100, 180] }),
  plan('Statistics', ['statistical analysis', 'probability'], [100, 200], 'science', { prerequisites: [30, 60] }),
  plan('Power BI', ['powerbi'], [50, 100], 'tools', { prerequisites: [20, 40] }),
  plan('Tableau', [], [50, 100], 'tools', { prerequisites: [20, 40] }),
  plan('Excel', ['microsoft excel', 'spreadsheets'], [30, 70], 'tools'),
  plan('Data visualization', ['data visualisation', 'data viz'], [70, 130], 'data', { prerequisites: [30, 60] }),
  plan('Data storytelling', [], [40, 80], 'data', { prerequisites: [30, 60], practiceWeeks: 3 }),
  plan('UX research', ['user research', 'usability testing', 'research synthesis'], [100, 180], 'design', { practiceWeeks: 6 }),
  plan('UI design', ['ux design', 'product design', 'interaction design'], [120, 220], 'design', { practiceWeeks: 6 }),
  plan('Figma', [], [30, 70], 'tools'),
  plan('Graphic design', ['visual design', 'typography'], [100, 200], 'design', { practiceWeeks: 6 }),
  plan('Photoshop', ['adobe photoshop', 'illustrator'], [50, 100], 'tools'),
  plan('CAD', ['autocad', 'solidworks', 'fusion 360', 'computer aided design'], [100, 200], 'engineering', { prerequisites: [40, 80], practiceWeeks: 4 }),
  plan('Mechanical design', ['mechanical engineering', 'finite element analysis', 'fea'], [180, 320], 'engineering', { prerequisites: [120, 240], practiceWeeks: 8 }),
  plan('Systems analysis', ['systems evaluation', 'systems engineering', 'technology design'], [100, 180], 'engineering', { prerequisites: [60, 120] }),
  plan('Quality control', ['quality control analysis', 'six sigma', 'lean manufacturing'], [80, 160], 'engineering', { practiceWeeks: 4 }),
  plan('Troubleshooting', ['technical support'], [80, 160], 'engineering', { prerequisites: [40, 80], practiceWeeks: 4 }),
  plan('Project management', ['project planning', 'agile', 'scrum'], [80, 160], 'business', { practiceWeeks: 6 }),
  plan('Accounting', ['bookkeeping', 'financial accounting'], [100, 200], 'business'),
  plan('Financial analysis', ['financial modeling', 'financial modelling'], [100, 180], 'business', { prerequisites: [60, 120] }),
  plan('Digital marketing', ['marketing analytics', 'seo', 'search engine optimization'], [80, 160], 'business', { practiceWeeks: 4 }),
  plan('Market research', ['customer research', 'consumer research'], [80, 140], 'business', { practiceWeeks: 4 }),
  plan('Operations analysis', ['operations management', 'supply chain', 'logistics'], [100, 180], 'business'),
  plan('Sales', ['sales techniques', 'business development'], [60, 120], 'business', { practiceWeeks: 6 }),
  plan('Human resources', ['recruitment', 'talent acquisition'], [80, 160], 'business', { practiceWeeks: 4 }),
  plan('Sustainability reporting', ['esg reporting', 'carbon accounting'], [80, 160], 'business', { prerequisites: [40, 80] }),
  plan('AI literacy', ['prompt engineering', 'prompting'], [25, 60], 'tools'),
  plan('Communication', ['business communication', 'public speaking', 'presentation skills', 'speaking', 'active listening'], [40, 80], 'soft', { practiceWeeks: 6 }),
  plan('Time management', ['prioritization', 'prioritisation', 'scheduling', 'personal productivity'], [20, 40], 'soft', { practiceWeeks: 4 }),
  plan('Teamwork', ['coordination', 'collaboration', 'interpersonal skills', 'social perceptiveness'], [40, 80], 'soft', { practiceWeeks: 6 }),
  plan('Leadership', ['people management', 'conflict resolution'], [80, 160], 'soft', { practiceWeeks: 8 }),
  plan('Negotiation', ['persuasion'], [40, 80], 'soft', { practiceWeeks: 6 }),
  plan('Problem solving', ['complex problem solving', 'critical thinking', 'decision making', 'judgment and decision making'], [50, 100], 'soft', { practiceWeeks: 6 }),
  plan('Learning strategies', ['active learning', 'instructing', 'teaching methods'], [40, 80], 'soft', { practiceWeeks: 4 }),
  plan('Customer service', ['service orientation', 'customer support'], [30, 70], 'soft', { practiceWeeks: 4 }),
  plan('Medical documentation', ['electronic health records', 'ehr', 'emr', 'patient data management'], [40, 80], 'tools'),
  plan('Conversational language foundations', ['spanish', 'french', 'german', 'mandarin', 'japanese', 'korean', 'arabic', 'english language'], [200, 400], 'language', { practiceWeeks: 12 }),
];
const normalize = (text: string) => text.normalize('NFKD').toLowerCase().replace(/\+\+/g, ' plus plus ').replace(/#/g, ' sharp ').replace(/[^a-z0-9]+/g, ' ').trim();
const regulated = ['patient assessment', 'medication administration', 'wound care', 'iv therapy', 'phlebotomy', 'clinical nursing', 'nursing', 'surgery', 'cpr', 'bls', 'acls', 'piloting', 'electrical installation', 'welding'];
export const defaultLearningAssumptions = { startingLevel: 'new', goal: 'practical', moderateHours: 6, acceleratedHours: 12, family: 'auto' } as const;
export type EstimateOptions = {
  startingLevel: StartingLevel; goal: LearningGoal; moderateHours: number; acceleratedHours: number; family: SkillFamily | 'auto';
};
const weeks = (hours: Hours, perWeek: number, floor: number) => {
  const low = Math.max(floor, Math.ceil(hours[0] / perWeek));
  const high = Math.max(low, Math.ceil(hours[1] / perWeek));
  return low === high ? `${low} ${low === 1 ? 'week' : 'weeks'}` : `${low}–${high} weeks`;
};
export function estimateSkillLearning(skill: string, options: EstimateOptions = defaultLearningAssumptions) {
  const text = ` ${normalize(skill)} `;
  const contains = (term: string) => text.includes(` ${normalize(term)} `);
  const matched = skillPlans.find((entry) => entry.aliases.some(contains));
  const family = skillFamilies.find((entry) => entry.value === options.family);
  const empty = { moderate: 'Estimate unavailable', accelerated: 'Estimate unavailable', effort: '', matchedName: '', source: undefined as Source | undefined };
  if (regulated.some(contains) || options.family === 'regulated') return {
    ...empty, status: 'supervised' as const,
    basis: 'This skill can require accredited instruction, supervised practice, assessment or a licence. Use the relevant training provider’s schedule; self-study hours cannot establish safe independent practice.',
  };
  if (!matched && !family) return {
    ...empty, status: 'needs-category' as const,
    basis: 'No skill-specific planning range is available. Choose a skill family below for a broader, lower-confidence estimate rather than a guessed universal duration.',
  };
  if (![options.moderateHours, options.acceleratedHours].every((hours) => Number.isFinite(hours) && hours >= 1 && hours <= 40)
    || options.acceleratedHours <= options.moderateHours) return {
    ...empty, status: 'invalid' as const, basis: 'Use 1–40 study hours per week. Accelerated hours must be higher than moderate hours.',
  };
  const selected: SkillPlan = matched ?? { name: family!.label, aliases: [], hours: family!.hours, family: family!.value };
  const goalFactor = { intro: 0.4, practical: 1, advanced: 1.8 }[options.goal];
  const experienceFactor = options.startingLevel === 'practicing' ? 0.65 : 1;
  const extra = options.startingLevel === 'new' ? selected.prerequisites ?? [0, 0] : [0, 0];
  const hours: Hours = [
    Math.ceil((selected.hours[0] * goalFactor + extra[0]) * experienceFactor),
    Math.ceil((selected.hours[1] * goalFactor + extra[1]) * experienceFactor),
  ];
  const floor = options.goal === 'intro' ? 1 : Math.ceil((selected.practiceWeeks ?? (selected.family === 'soft' ? 4 : 1)) * (options.goal === 'advanced' ? 1.5 : 1));
  return {
    status: 'estimated' as const, moderate: weeks(hours, options.moderateHours, floor),
    accelerated: weeks(hours, options.acceleratedHours, floor), effort: `${hours[0]}–${hours[1]} study and practice hours`,
    matchedName: selected.name, source: selected.source,
    basis: `${matched ? 'Skill-specific' : 'Broader skill-family (lower-confidence)'} CareerLens planning range for ${selected.name}. ${extra[1] ? `Includes ${extra[0]}–${extra[1]} hours of prerequisite preparation. ` : ''}${floor > 1 ? 'Allows time for repeated practice across several weeks; extra weekly hours cannot remove that allowance. ' : ''}These are transparent planning assumptions, not validated averages, guaranteed completion times, mastery or professional qualifications. Actual time varies with feedback, practice quality and prior knowledge.`,
  };
}
