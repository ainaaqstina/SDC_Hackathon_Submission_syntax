export type OccupationImportRecord = {
  externalId: string;
  title: string;
  industry: string;
  requiredSkills: string[];
  sourceUrl: string;
  publicationPeriod: string;
  shortageClassification?: string;
};

export type SkillAliasGroup = {
  canonicalName: string;
  aliases: string[];
};

export type ParsedOccupationImport = {
  occupations: OccupationImportRecord[];
  skillAliases: SkillAliasGroup[];
  skipped: number;
  warnings: string[];
};

export type ParsedTrendRow = {
  skill: string;
  date: string;
  interest: number;
};

const normalizeKey = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const splitList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)),
    ).slice(0, 80);
  }
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      return splitList(JSON.parse(trimmed));
    } catch {
      // Fall through to the documented pipe/semicolon-separated CSV format.
    }
  }
  return Array.from(new Set(trimmed.split(/[|;]/).map((item) => item.trim()).filter(Boolean))).slice(0, 80);
};

export const parseCsv = (input: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const text = input.replace(/^\uFEFF/, "");

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some((value) => value.length)) rows.push(row);
  if (quoted) throw new Error("CSV has an unfinished quoted field.");
  return rows;
};

const cellAt = (row: string[], index: number | undefined): string =>
  index === undefined ? "" : (row[index] ?? "").trim();

const sourceUrlIsValid = (value: string): boolean => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const makeExternalId = (title: string, industry: string): string =>
  `${normalizeKey(industry).replace(/\s+/g, "-")}:${normalizeKey(title).replace(/\s+/g, "-")}`.slice(0, 240);

const parseAliases = (value: unknown): SkillAliasGroup[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item))
      .map((item) => ({
        canonicalName: typeof item.canonicalName === "string" ? item.canonicalName.trim() : "",
        aliases: splitList(item.aliases),
      }))
      .filter((item) => item.canonicalName && item.aliases.length)
      .slice(0, 2000);
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([canonicalName, aliases]) => ({ canonicalName: canonicalName.trim(), aliases: splitList(aliases) }))
      .filter((item) => item.canonicalName && item.aliases.length)
      .slice(0, 2000);
  }
  return [];
};

export const parseOccupationImport = (format: "csv" | "json", fileContent: string): ParsedOccupationImport => {
  let records: unknown[] = [];
  let aliases: SkillAliasGroup[] = [];
  let header: string[] | undefined;
  if (format === "json") {
    let decoded: unknown;
    try {
      decoded = JSON.parse(fileContent);
    } catch {
      throw new Error("The occupation file is not valid JSON.");
    }
    if (Array.isArray(decoded)) records = decoded;
    else if (decoded && typeof decoded === "object") {
      const envelope = decoded as Record<string, unknown>;
      records = Array.isArray(envelope.occupations) ? envelope.occupations : [];
      aliases = parseAliases(envelope.skillAliases);
    }
    if (!records.length) throw new Error("JSON must contain an occupations array with at least one record.");
  } else {
    const rows = parseCsv(fileContent);
    if (rows.length < 2) throw new Error("Occupation CSV must include a header and at least one data row.");
    header = rows[0].map(normalizeKey);
    const titleIndex = header.findIndex((key) => ["title", "occupation title", "occupation"].includes(key));
    const industryIndex = header.findIndex((key) => ["industry", "sector"].includes(key));
    const skillIndex = header.findIndex((key) => ["required skills", "requiredskills", "skills"].includes(key));
    const urlIndex = header.findIndex((key) => ["source url", "sourceurl", "url"].includes(key));
    const periodIndex = header.findIndex((key) => ["publication period", "publicationperiod", "period"].includes(key));
    if ([titleIndex, industryIndex, skillIndex, urlIndex, periodIndex].some((index) => index < 0)) {
      throw new Error("Occupation CSV needs columns: title, industry, requiredSkills, sourceUrl, publicationPeriod.");
    }
    const idIndex = header.findIndex((key) => ["external id", "externalid", "occupation code", "code"].includes(key));
    const shortageIndex = header.findIndex((key) => ["shortage classification", "shortageclassification", "shortage"].includes(key));
    const aliasIndex = header.findIndex((key) => ["skill aliases", "skillaliases"].includes(key));
    records = rows.slice(1).map((row) => ({
      title: cellAt(row, titleIndex),
      industry: cellAt(row, industryIndex),
      requiredSkills: cellAt(row, skillIndex),
      sourceUrl: cellAt(row, urlIndex),
      publicationPeriod: cellAt(row, periodIndex),
      externalId: cellAt(row, idIndex),
      shortageClassification: cellAt(row, shortageIndex),
      skillAliases: cellAt(row, aliasIndex),
    }));
    if (aliasIndex >= 0) {
      const aliasMap = new Map<string, Set<string>>();
      for (const raw of records as Record<string, unknown>[]) {
        for (const part of String(raw.skillAliases ?? "").split(";")) {
          const [canonicalName, ...aliasParts] = part.split("=");
          const cleanCanonical = canonicalName?.trim();
          if (!cleanCanonical || !aliasParts.length) continue;
          const group = aliasMap.get(cleanCanonical) ?? new Set<string>();
          for (const alias of aliasParts.join("=").split("|").map((value) => value.trim()).filter(Boolean)) group.add(alias);
          aliasMap.set(cleanCanonical, group);
        }
      }
      aliases = Array.from(aliasMap, ([canonicalName, values]) => ({ canonicalName, aliases: Array.from(values) }));
    }
  }

  const occupations: OccupationImportRecord[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const [index, raw] of records.entries()) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      skipped += 1;
      if (warnings.length < 30) warnings.push(`Record ${index + 1}: expected an object.`);
      continue;
    }
    const item = raw as Record<string, unknown>;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const industry = typeof item.industry === "string" ? item.industry.trim() : "";
    const requiredSkills = splitList(item.requiredSkills ?? item.required_skills ?? item.skills);
    const sourceUrl = typeof item.sourceUrl === "string" ? item.sourceUrl.trim() : "";
    const publicationPeriod =
      typeof item.publicationPeriod === "string"
        ? item.publicationPeriod.trim()
        : typeof item.publication_period === "string"
          ? item.publication_period.trim()
          : "";
    const shortageClassification =
      typeof item.shortageClassification === "string" && item.shortageClassification.trim()
        ? item.shortageClassification.trim().slice(0, 120)
        : typeof item.shortage_classification === "string" && item.shortage_classification.trim()
          ? item.shortage_classification.trim().slice(0, 120)
          : undefined;
    const requestedId =
      typeof item.externalId === "string"
        ? item.externalId.trim()
        : typeof item.external_id === "string"
          ? item.external_id.trim()
          : typeof item.code === "string"
            ? item.code.trim()
            : "";

    if (
      !title ||
      title.length > 200 ||
      !industry ||
      industry.length > 120 ||
      !requiredSkills.length ||
      !sourceUrlIsValid(sourceUrl) ||
      !publicationPeriod ||
      publicationPeriod.length > 100
    ) {
      skipped += 1;
      if (warnings.length < 30) warnings.push(`Record ${index + 1}: required fields are missing or invalid.`);
      continue;
    }
    const externalId = (requestedId || makeExternalId(title, industry)).slice(0, 240);
    const duplicateKey = `${normalizeKey(externalId)}:${normalizeKey(industry)}`;
    if (seen.has(duplicateKey)) {
      skipped += 1;
      if (warnings.length < 30) warnings.push(`Record ${index + 1}: duplicate occupation key in this file.`);
      continue;
    }
    seen.add(duplicateKey);
    occupations.push({
      externalId,
      title,
      industry,
      requiredSkills,
      sourceUrl,
      publicationPeriod,
      shortageClassification,
    });
  }
  if (!occupations.length) throw new Error("No valid occupations were found. Check required fields and source URLs.");
  if (occupations.length > 20000) throw new Error("A single occupation import is limited to 20,000 valid records.");
  return { occupations, skillAliases: aliases, skipped, warnings };
};

const parseDate = (value: string): string | undefined => {
  const match = value.match(/(\d{4}-\d{2}-\d{2})/);
  if (!match) return undefined;
  const timestamp = Date.parse(`${match[1]}T00:00:00.000Z`);
  return Number.isNaN(timestamp) ? undefined : match[1];
};

export const parseGoogleTrendsCsv = (fileContent: string, fallbackSkill: string): ParsedTrendRow[] => {
  const rows = parseCsv(fileContent);
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeKey);
    return headers.some((name) => ["date", "week", "month", "time"].includes(name)) &&
      (headers.some((name) => ["interest", "value"].includes(name)) || row.length >= 2);
  });
  if (headerIndex < 0) throw new Error("Trends CSV needs a date/week column and an interest/value column.");

  const headers = rows[headerIndex].map(normalizeKey);
  const dateIndex = headers.findIndex((name) => ["date", "week", "month", "time"].includes(name));
  const valueIndex = headers.findIndex((name) => ["interest", "value"].includes(name));
  const skillIndex = headers.findIndex((name) => ["skill", "query", "search term"].includes(name));
  const seriesIndex = valueIndex >= 0 ? valueIndex : headers.findIndex((_, index) => index !== dateIndex);
  const results: ParsedTrendRow[] = [];
  const seen = new Set<string>();

  for (const row of rows.slice(headerIndex + 1)) {
    const date = parseDate(cellAt(row, dateIndex));
    const rawValue = cellAt(row, seriesIndex);
    const interest = rawValue === "<1" ? 0 : Number(rawValue.replace(/,/g, ""));
    const skill = skillIndex >= 0 ? cellAt(row, skillIndex) : fallbackSkill.trim();
    if (!date || !skill || !Number.isInteger(interest) || interest < 0 || interest > 100) continue;
    const key = `${normalizeKey(skill)}:${date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ skill: skill.slice(0, 120), date, interest });
  }
  if (!results.length) throw new Error("No valid Google Trends observations were found in the selected CSV.");
  if (results.length > 20000) throw new Error("A single Trends import is limited to 20,000 observations.");
  return results;
};

export const classifyInterestDirection = (values: number[]): "rising" | "stable" | "declining" => {
  if (values.length < 6) return "stable";
  const previous = values.slice(-6, -3).reduce((sum, value) => sum + value, 0) / 3;
  const recent = values.slice(-3).reduce((sum, value) => sum + value, 0) / 3;
  if (recent - previous >= 5) return "rising";
  if (previous - recent >= 5) return "declining";
  return "stable";
};

export const normalizedSkillKey = normalizeKey;
