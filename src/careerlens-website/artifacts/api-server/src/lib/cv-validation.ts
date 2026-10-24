import { PDFParse } from "pdf-parse";

export const MAX_CV_BYTES = 6 * 1024 * 1024;
export const MAX_CV_BASE64_LENGTH = 4 * Math.ceil(MAX_CV_BYTES / 3);
export const CV_TOO_LARGE = "This PDF is larger than the 6 MB upload limit. Choose a smaller file and try again.";

const EMAIL_ADDRESS = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_LIKE_NUMBER = /(?<![A-Za-z0-9])\+?\d[\d\t ()./-]{5,}\d(?![A-Za-z0-9])/g;

export class CvValidationError extends Error {
  constructor(message: string, public readonly status = 422) {
    super(message);
  }
}

export function redactCvContactInfo(text: string): string {
  const withoutEmails = text.replace(EMAIL_ADDRESS, "[email omitted]");
  return withoutEmails.replace(PHONE_LIKE_NUMBER, (candidate) => {
    const digitCount = candidate.replace(/\D/g, "").length;
    const compact = candidate.trim().replace(/\s/g, "");
    const isDateOrYearRange =
      /^\d{4}[-/.]\d{1,2}(?:[-/.]\d{1,2})?$/.test(compact) ||
      /^\d{4}[-–—]\d{4}$/.test(compact);
    if (digitCount < 7 || digitCount > 15 || isDateOrYearRange) return candidate;
    return "[phone omitted]";
  });
}

export function decodeCvContent(contentBase64: string): Buffer {
  if (!contentBase64.length) {
    throw new CvValidationError("This file is empty. Choose a PDF CV containing selectable text.", 400);
  }
  if (contentBase64.length > MAX_CV_BASE64_LENGTH) {
    throw new CvValidationError(CV_TOO_LARGE, 413);
  }
  // Buffer.from alone silently accepts invalid characters and truncated base64.
  if (contentBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(contentBase64)) {
    throw new CvValidationError("The file content could not be decoded. Select the PDF again and retry.", 400);
  }
  const bytes = Buffer.from(contentBase64, "base64");
  if (bytes.toString("base64") !== contentBase64) {
    throw new CvValidationError("The file content could not be decoded. Select the PDF again and retry.", 400);
  }
  if (bytes.length > MAX_CV_BYTES) throw new CvValidationError(CV_TOO_LARGE, 413);
  return bytes;
}

export async function extractCvText(bytes: Buffer): Promise<string> {
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new CvValidationError("This file is not a PDF. Upload a PDF CV, not an image or another document format.", 415);
  }
  let parser: PDFParse | undefined;
  try {
    parser = new PDFParse({ data: bytes });
    const result = await parser.getText();
    // Page labels are parser-generated, not CV text. Blank multi-page PDFs
    // must not pass validation just because those labels exceed 40 characters.
    const text = result.pages.map((page) => page.text).join("\n").trim();
    if (text.length < 40) {
      throw new CvValidationError("No readable CV text was found, or there is too little text to analyze. Export your CV as a PDF with selectable text. Image-only scans are not supported.");
    }
    return redactCvContactInfo(text.slice(0, 40_000));
  } catch (error) {
    if (error instanceof CvValidationError) throw error;
    const passwordProtected = error instanceof Error && error.name === "PasswordException";
    throw new CvValidationError(passwordProtected
      ? "This PDF is password-protected. Remove the password and upload an unlocked copy."
      : "This PDF is corrupted or unreadable. Open it in a PDF viewer, export a new PDF, and try again.");
  } finally {
    // Cleanup must not replace an actionable validation error.
    await parser?.destroy().catch(() => undefined);
  }
}
