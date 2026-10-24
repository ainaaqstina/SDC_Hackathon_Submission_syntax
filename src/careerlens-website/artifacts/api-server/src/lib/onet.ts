import { parseCsv } from "./career-data-imports";

export const ONET_RELEASE = "31.0";
export const ONET_PUBLICATION_PERIOD = "O*NET 31.0 file snapshot (2026-08)";
export const ONET_SOURCE_URL = "https://www.onetcenter.org/database.html";
export const ONET_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
export const ONET_LICENSE_NOTICE =
  "O*NET 31.0 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA), used under CC BY 4.0. CareerLens retains occupation titles and SOC codes, uses the 10 highest-rated transferable-skill signals, and compares source-listed software examples. These are exploration signals, not universal job requirements.";
export const SOC_TAXONOMY_URL = "https://www.bls.gov/soc/2018/major_groups.htm";

export const SOC_MAJOR_GROUPS: Record<string, string> = {
  "11": "Management Occupations",
  "13": "Business and Financial Operations Occupations",
  "15": "Computer and Mathematical Occupations",
  "17": "Architecture and Engineering Occupations",
  "19": "Life, Physical, and Social Science Occupations",
  "21": "Community and Social Service Occupations",
  "23": "Legal Occupations",
  "25": "Educational Instruction and Library Occupations",
  "27": "Arts, Design, Entertainment, Sports, and Media Occupations",
  "29": "Healthcare Practitioners and Technical Occupations",
  "31": "Healthcare Support Occupations",
  "33": "Protective Service Occupations",
  "35": "Food Preparation and Serving Related Occupations",
  "37": "Building and Grounds Cleaning and Maintenance Occupations",
  "39": "Personal Care and Service Occupations",
  "41": "Sales and Related Occupations",
  "43": "Office and Administrative Support Occupations",
  "45": "Farming, Fishing, and Forestry Occupations",
  "47": "Construction and Extraction Occupations",
  "49": "Installation, Maintenance, and Repair Occupations",
  "51": "Production Occupations",
  "53": "Transportation and Material Moving Occupations",
  "55": "Military Specific Occupations",
};

export type OnetOccupationRecord = {
  externalId: string;
  title: string;
  industry: string;
  requiredSkills: string[];
  sourceUrl: string;
  publicationPeriod: string;
  metadata: Record<string, unknown>;
};

export type ParsedOnetImport = {
  occupations: OnetOccupationRecord[];
  skipped: number;
  skillNames: string[];
  occupationFamilies: number;
  sourceFileRows: Record<string, number>;
};

type CsvTable = { headers: string[]; rows: string[][] };

const normalizeHeader = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const readTable = (fileName: string, content: string): CsvTable => {
  const rows = parseCsv(content);
  if (rows.length < 1) throw new Error(`${fileName} has no header row.`);
  return { headers: rows[0].map(normalizeHeader), rows: rows.slice(1) };
};

const column = (table: CsvTable, ...names: string[]): number => {
  const index = table.headers.findIndex((header) =>
    names.map(normalizeHeader).includes(header),
  );
  if (index < 0) throw new Error(`${names[0]} is missing a required column.`);
  return index;
};

const value = (row: string[], index: number): string => (row[index] ?? "").trim();

const finiteNumber = (input: string): number | null => {
  if (!input) return null;
  const result = Number(input);
  return Number.isFinite(result) ? result : null;
};

const safeSummary = (input: string, maxLength: number): string =>
  input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, maxLength);

const ONET_CSV_FILES = [
  "occupation_data",
  "transferable_skills",
  "career_interest_types",
  "education",
  "education_categories",
  "emerging_tasks",
  "software_skills",
] as const;

const MAX_CSV_BYTES = 12 * 1024 * 1024;

const fetchOnetCsv = async (name: (typeof ONET_CSV_FILES)[number]): Promise<string> => {
  const url = `https://www.onetcenter.org/dl_files/database/db_31_0_csv/${name}.csv`;
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  } catch {
    throw new Error(`Could not reach the official O*NET 31.0 ${name} file.`);
  }
  if (!response.ok) {
    throw new Error(`The official O*NET ${name} file returned HTTP ${response.status}.`);
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_CSV_BYTES) {
    throw new Error(`The official O*NET ${name} file exceeded the allowed size.`);
  }
  return new TextDecoder("utf-8").decode(bytes);
};

export const fetchAndParseOnet31 = async (): Promise<ParsedOnetImport> => {
  const files = await Promise.all(ONET_CSV_FILES.map(fetchOnetCsv));
  return parseOnet31Csvs({
    occupationDataCsv: files[0],
    transferableSkillsCsv: files[1],
    careerInterestTypesCsv: files[2],
    educationCsv: files[3],
    educationCategoriesCsv: files[4],
    emergingTasksCsv: files[5],
    softwareSkillsCsv: files[6],
  });
};

export const parseOnet31Csvs = (input: {
  occupationDataCsv: string;
  transferableSkillsCsv: string;
  careerInterestTypesCsv: string;
  educationCsv: string;
  educationCategoriesCsv: string;
  emergingTasksCsv: string;
  softwareSkillsCsv?: string;
}): ParsedOnetImport => {
  const occupationsTable = readTable("occupation_data.csv", input.occupationDataCsv);
  const skillsTable = readTable("transferable_skills.csv", input.transferableSkillsCsv);
  const interestsTable = readTable("career_interest_types.csv", input.careerInterestTypesCsv);
  const educationTable = readTable("education.csv", input.educationCsv);
  const educationCategoriesTable = readTable("education_categories.csv", input.educationCategoriesCsv);
  const tasksTable = readTable("emerging_tasks.csv", input.emergingTasksCsv);
  const softwareTable = input.softwareSkillsCsv
    ? readTable("software_skills.csv", input.softwareSkillsCsv)
    : undefined;

  const occupationCode = column(occupationsTable, "O*NET-SOC Code");
  const occupationTitle = column(occupationsTable, "Title");
  const occupationDescription = column(occupationsTable, "Description");
  const occupationByCode = new Map<string, { title: string; description: string }>();
  let skipped = 0;
  for (const row of occupationsTable.rows) {
    const code = value(row, occupationCode);
    const title = safeSummary(value(row, occupationTitle), 200);
    if (!/^\d{2}-\d{4}\.\d{2}$/.test(code) || !title) {
      skipped += 1;
      continue;
    }
    occupationByCode.set(code, {
      title,
      description: safeSummary(value(row, occupationDescription), 2500),
    });
  }

  const skillsCode = column(skillsTable, "O*NET-SOC Code");
  const skillName = column(skillsTable, "Element Name");
  const skillScale = column(skillsTable, "Scale ID");
  const skillValue = column(skillsTable, "Data Value");
  const skillSuppression = skillsTable.headers.indexOf(normalizeHeader("Recommend Suppress"));
  const skillsByCode = new Map<string, Array<{ name: string; importance: number }>>();
  for (const row of skillsTable.rows) {
    const code = value(row, skillsCode);
    const name = safeSummary(value(row, skillName), 120);
    const importance = finiteNumber(value(row, skillValue));
    if (
      !occupationByCode.has(code) ||
      !name ||
      value(row, skillScale) !== "IM" ||
      importance === null ||
      (skillSuppression >= 0 && ["y", "yes", "true"].includes(value(row, skillSuppression).toLowerCase()))
    ) {
      continue;
    }
    const list = skillsByCode.get(code) ?? [];
    list.push({ name, importance });
    skillsByCode.set(code, list);
  }

  const interestCode = column(interestsTable, "O*NET-SOC Code");
  const interestName = column(interestsTable, "Element Name");
  const interestScale = column(interestsTable, "Scale ID");
  const interestValue = column(interestsTable, "Data Value");
  const interestsByCode = new Map<string, Array<{ name: string; value: number }>>();
  for (const row of interestsTable.rows) {
    const code = value(row, interestCode);
    const name = safeSummary(value(row, interestName), 100);
    const rating = finiteNumber(value(row, interestValue));
    if (!occupationByCode.has(code) || !name || value(row, interestScale) !== "OI" || rating === null) continue;
    const list = interestsByCode.get(code) ?? [];
    list.push({ name, value: rating });
    interestsByCode.set(code, list);
  }

  const categoryCode = column(educationCategoriesTable, "Category");
  const categoryDescription = column(educationCategoriesTable, "Category Description");
  const educationLabelByCategory = new Map(
    educationCategoriesTable.rows.map((row) => [
      value(row, categoryCode),
      safeSummary(value(row, categoryDescription), 200),
    ]),
  );
  const educationCode = column(educationTable, "O*NET-SOC Code");
  const educationScale = column(educationTable, "Scale ID");
  const educationCategory = column(educationTable, "Category");
  const educationValue = column(educationTable, "Data Value");
  const educationByCode = new Map<string, Array<{ category: string; share: number }>>();
  for (const row of educationTable.rows) {
    const code = value(row, educationCode);
    const share = finiteNumber(value(row, educationValue));
    const label = educationLabelByCategory.get(value(row, educationCategory));
    if (!occupationByCode.has(code) || value(row, educationScale) !== "RL" || share === null || !label) continue;
    const list = educationByCode.get(code) ?? [];
    list.push({ category: label, share });
    educationByCode.set(code, list);
  }

  const taskCode = column(tasksTable, "O*NET-SOC Code");
  const taskText = column(tasksTable, "Task");
  const taskCategory = column(tasksTable, "Category");
  const taskDate = column(tasksTable, "Date");
  const taskSource = tasksTable.headers.indexOf(normalizeHeader("Domain Source"));
  const tasksByCode = new Map<string, Array<{ task: string; category: string; date: string; source: string | null }>>();
  for (const row of tasksTable.rows) {
    const code = value(row, taskCode);
    const task = safeSummary(value(row, taskText), 400);
    if (!occupationByCode.has(code) || !task) continue;
    const list = tasksByCode.get(code) ?? [];
    list.push({
      task,
      category: safeSummary(value(row, taskCategory), 40),
      date: safeSummary(value(row, taskDate), 20),
      source: taskSource >= 0 ? safeSummary(value(row, taskSource), 80) || null : null,
    });
    tasksByCode.set(code, list);
  }

  const softwareByCode = new Map<string, Array<{ name: string; inDemand: boolean }>>();
  if (softwareTable) {
    const codeIndex = column(softwareTable, "O*NET-SOC Code");
    // O*NET renamed Technology Skills / Example in release 30.3.
    const exampleIndex = column(softwareTable, "Workplace Example", "Example");
    const demandIndex = softwareTable.headers.indexOf(normalizeHeader("In Demand"));
    for (const row of softwareTable.rows) {
      const code = value(row, codeIndex);
      const name = safeSummary(value(row, exampleIndex), 150);
      if (!occupationByCode.has(code) || !name) continue;
      const list = softwareByCode.get(code) ?? [];
      if (!list.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) {
        list.push({ name, inDemand: demandIndex >= 0 && value(row, demandIndex).toUpperCase() === "Y" });
      }
      softwareByCode.set(code, list);
    }
  }

  const occupations: OnetOccupationRecord[] = [];
  for (const [code, base] of occupationByCode) {
    const familyCode = code.slice(0, 2);
    const family = SOC_MAJOR_GROUPS[familyCode];
    const rankedSkills = (skillsByCode.get(code) ?? [])
      .sort((left, right) => right.importance - left.importance || left.name.localeCompare(right.name))
      .slice(0, 10);
    const softwareSkills = softwareByCode.get(code) ?? [];
    if (!family || (!rankedSkills.length && !softwareSkills.length)) {
      skipped += 1;
      continue;
    }
    const interestSignals = (interestsByCode.get(code) ?? [])
      .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name))
      .slice(0, 3);
    const educationDistribution = (educationByCode.get(code) ?? [])
      .sort((left, right) => right.share - left.share)
      .slice(0, 3);
    const emergingTasks = (tasksByCode.get(code) ?? [])
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 3);
    occupations.push({
      externalId: code,
      title: base.title,
      industry: family,
      requiredSkills: rankedSkills.map(({ name }) => name),
      sourceUrl: ONET_SOURCE_URL,
      publicationPeriod: ONET_PUBLICATION_PERIOD,
      metadata: {
        releaseVersion: ONET_RELEASE,
        occupationFamily: family,
        occupationFamilyCode: `${familyCode}-0000`,
        categoryTaxonomy: "O*NET-SOC / 2018 SOC major group",
        categorySourceUrl: SOC_TAXONOMY_URL,
        description: base.description,
        skillSignals: rankedSkills,
        interestSignals,
        educationDistribution,
        emergingTasks,
        softwareSkills,
        softwareEvidenceVersion: softwareTable ? 1 : 0,
        softwareSkillsSourceUrl: "https://www.onetcenter.org/dl_files/database/db_31_0_csv/software_skills.csv",
      },
    });
  }

  const sourceFileRows = {
    occupationData: occupationsTable.rows.length,
    transferableSkills: skillsTable.rows.length,
    careerInterestTypes: interestsTable.rows.length,
    education: educationTable.rows.length,
    emergingTasks: tasksTable.rows.length,
    softwareSkills: softwareTable?.rows.length ?? 0,
  };
  const skillNames = Array.from(new Set(occupations.flatMap((occupation) => occupation.requiredSkills))).sort();
  const occupationFamilies = new Set(occupations.map((occupation) => occupation.industry)).size;
  return { occupations, skipped, skillNames, occupationFamilies, sourceFileRows };
};
