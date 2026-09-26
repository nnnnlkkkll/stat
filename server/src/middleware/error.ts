import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "That route does not exist." } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
  }

  if (typeof err === "object" && err && "type" in err && err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "BAD_REQUEST", message: "Request body must be valid JSON." },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: "BAD_REQUEST", message: err.issues[0]?.message ?? "Invalid input." },
    });
  }

  console.error(err);
  res.status(500).json({
    error: { code: "SERVER", message: "Something broke. Try again." },
  });
}
