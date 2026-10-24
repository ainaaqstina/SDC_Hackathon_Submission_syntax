import { timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

export const requireCareerDataAdmin = (req: Request, res: Response): boolean => {
  const expected = process.env.CAREER_DATA_ADMIN_TOKEN?.trim();
  if (!expected || expected.length < 16) {
    res.status(503).json({
      error: "Career data imports are disabled. Add a 16-character or longer CAREER_DATA_ADMIN_TOKEN in Replit Secrets.",
    });
    return false;
  }
  const supplied = req.header("X-Career-Data-Admin-Token") ?? "";
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    res.status(401).json({ error: "The data administrator token was not accepted." });
    return false;
  }
  return true;
};
