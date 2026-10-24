import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { decodeCvContent, extractCvText, MAX_CV_BYTES } from "./cv-validation";
import { RunpodInferenceError } from "./runpod";

const { extractProfile, insert, update, deleteRows } = vi.hoisted(() => ({
  extractProfile: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  deleteRows: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: { insert, update, delete: deleteRows },
  careerProfilesTable: {}, careerRoadmapsTable: {}, careerTrendSignalsTable: {},
  careerOccupationsTable: {}, careerJobListingsTable: {}, careerSearchTrendsTable: {},
}));
vi.mock("./career-ai", () => ({
  extractProfileFromCv: extractProfile,
  generatePersonalizedRoadmap: vi.fn(),
  recommendCareerMatches: vi.fn(),
}));

// A real, minimal PDF with correct object offsets; no uploaded CV data retained.
function syntheticPdf(text = "", pages = 1): Buffer {
  const stream = text ? `BT /F1 8 Tf 50 700 Td (${text}) Tj ET` : "";
  const pageIds = Array.from({ length: pages }, (_, i) => 5 + i);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    ...pageIds.map(() => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 4 0 R >>"),
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

describe("CV document validation", () => {
  it("accepts exactly 6 MB and rejects one byte over the limit", () => {
    const bytes = Buffer.alloc(MAX_CV_BYTES);
    expect(decodeCvContent(bytes.toString("base64")).length).toBe(MAX_CV_BYTES);
    expect(() => decodeCvContent(Buffer.alloc(MAX_CV_BYTES + 1).toString("base64"))).toThrow(/6 MB/);
  });

  it.each(["", "not base64!", "YQ", "Y===", "====", "YR=="])("rejects empty or malformed content: %s", (content) => {
    expect(() => decodeCvContent(content)).toThrow();
  });

  it("rejects images renamed as PDFs", async () => {
    await expect(extractCvText(Buffer.from("\x89PNG\r\n"))).rejects.toThrow(/not a PDF/);
  });

  it("explains corrupted PDFs without exposing parser details", async () => {
    await expect(extractCvText(Buffer.from("%PDF-1.4\nbroken"))).rejects.toThrow(/corrupted or unreadable/);
  });

  it.each([1, 12])("rejects blank PDFs with %i pages, ignoring parser page labels", async (pages) => {
    await expect(extractCvText(syntheticPdf("", pages))).rejects.toThrow(/No readable CV text/);
  });

  it("extracts a valid synthetic CV without changing its content", async () => {
    const text = "Synthetic Candidate - Software engineer with five years of TypeScript experience and a computer science degree.";
    expect(await extractCvText(syntheticPdf(text))).toBe(text);
  });

  it("explains the OCR limitation when a PDF contains no selectable text", async () => {
    await expect(extractCvText(syntheticPdf("", 1))).rejects.toThrow(/Image-only scans are not supported/);
  });
});

describe("CV analyze HTTP boundary", () => {
  let server: Server;
  let url: string;
  const profile = {
    id: "cv-synthetic-test", name: "Synthetic Candidate", education: "Computer science",
    primaryDomain: "Technology", secondaryDomains: [], skills: [], experience: [],
    interests: [], confirmed: false, updatedAt: new Date(),
  };
  beforeAll(async () => {
    const { default: app } = await import("../app");
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/career/cv/analyze`;
  });
  afterAll(() => new Promise<void>((resolve, reject) => server?.close((error) => error ? reject(error) : resolve())));
  beforeEach(() => {
    vi.clearAllMocks();
    extractProfile.mockReset();
    extractProfile.mockResolvedValue(profile);
  });
  async function post(contentBase64: string, mimeType = "application/pdf") {
    return fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: "synthetic.pdf", mimeType, contentBase64 }),
    });
  }

  it.each([
    [503, "Could not reach RunPod. Please try again shortly."],
    [504, "RunPod inference timed out. Please try again."],
    [502, "RunPod returned a response that was not valid JSON."],
  ])("TC33/34/38 returns a safe provider failure with status %i", async (status, message) => {
    extractProfile.mockRejectedValueOnce(new RunpodInferenceError(message, status));
    const response = await post(syntheticPdf("Synthetic Candidate - Software engineer using Python and SQL to build reporting applications and database projects.").toString("base64"));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: message });
    expect(insert).not.toHaveBeenCalled();
  });

  it.each([{}, { profileId: "synthetic", careerId: "" }])("TC40 rejects an absent target before database or AI work", async (body) => {
    const response = await fetch(url.replace("/cv/analyze", "/roadmaps"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Choose a profile and a target career before building a learning path." });
  });

  it.each([
    ["empty", "", "application/pdf", 400, /empty/],
    ["image", Buffer.from("PNG image").toString("base64"), "image/png", 415, /Unsupported CV format/],
    ["DOCX", "UEs=", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 415, /Unsupported CV format/],
    ["disguised image", Buffer.from("PNG image").toString("base64"), "application/pdf", 415, /not a PDF/],
    ["corrupted", Buffer.from("%PDF-1.4\nbroken").toString("base64"), "application/pdf", 422, /corrupted or unreadable/],
    ["blank", syntheticPdf("", 12).toString("base64"), "application/pdf", 422, /No readable CV text/],
    ["malformed base64", "%%%INVALID", "application/pdf", 400, /decoded/],
    ["oversized", Buffer.alloc(MAX_CV_BYTES + 1).toString("base64"), "application/pdf", 413, /6 MB/],
  ])("blocks %s before AI analysis or persistence", async (_name, content, mime, status, message) => {
    const response = await post(content as string, mime as string);
    expect(response.status).toBe(status);
    expect((await response.json() as { error: string }).error).toMatch(message as RegExp);
    expect(extractProfile).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(deleteRows).not.toHaveBeenCalled();
  });

  it("returns a useful JSON error when the JSON parser rejects an oversized request", async () => {
    const response = await post("A".repeat(12 * 1024 * 1024));
    expect(response.status).toBe(413);
    expect((await response.json() as { error: string }).error).toMatch(/6 MB/);
    expect(extractProfile).not.toHaveBeenCalled();
  });

  it("returns a useful JSON error for malformed JSON", async () => {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    expect(response.status).toBe(400);
    expect((await response.json() as { error: string }).error).toMatch(/could not be read/);
    expect(extractProfile).not.toHaveBeenCalled();
  });

  it("returns a valid unconfirmed profile for review, without saving anything", async () => {
    const text = "Synthetic Candidate - Software engineer with five years of TypeScript experience and a computer science degree.";
    const response = await post(syntheticPdf(text).toString("base64"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: profile.id, confirmed: false });
    expect(extractProfile).toHaveBeenCalledWith(text);
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("removes email and phone details before sending CV text to AI analysis", async () => {
    const email = "candidate@example.test";
    const phone = "+65 9123 4567";
    const text = `Synthetic Candidate\nEmail: ${email}\nPhone: ${phone}\nSoftware engineer from 2020-2024 with five years of TypeScript experience and a computer science degree.`;
    const response = await post(syntheticPdf(text).toString("base64"));

    expect(response.status).toBe(200);
    const textSentToAi = extractProfile.mock.calls[0]?.[0] as string;
    expect(textSentToAi).not.toContain(email);
    expect(textSentToAi).not.toContain("9123 4567");
    expect(textSentToAi).toContain("[email omitted]");
    expect(textSentToAi).toContain("[phone omitted]");
    expect(textSentToAi).toContain("2020-2024");
  });
});
