import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { TransitionError } from "../domain/state-machine";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (m: string, code = "BAD_REQUEST", details?: unknown) => new HttpError(400, m, code, details);
export const unauthorized = (m = "Authentication required") => new HttpError(401, m, "UNAUTHORIZED");
export const forbidden = (m = "You do not have permission to perform this action") => new HttpError(403, m, "FORBIDDEN");
export const notFound = (m = "Not found") => new HttpError(404, m, "NOT_FOUND");
export const conflict = (m: string, code = "CONFLICT", details?: unknown) => new HttpError(409, m, code, details);

/** Postgres error codes we translate into client errors instead of 500s. */
function fromPg(err: { code?: string; constraint?: string }): HttpError | null {
  switch (err.code) {
    case "23505":
      return conflict("Duplicate value", "UNIQUE_VIOLATION", { constraint: err.constraint });
    case "23514":
      if (err.constraint?.startsWith("lots_inventory")) {
        return conflict("Insufficient inventory for this operation", "INSUFFICIENT_INVENTORY", { constraint: err.constraint });
      }
      return badRequest("Value violates a database rule", "CHECK_VIOLATION", { constraint: err.constraint });
    case "23503":
      return badRequest("Referenced record does not exist", "FOREIGN_KEY_VIOLATION");
    case "40001":
    case "40P01":
      return conflict("Concurrent update, please retry", "CONCURRENT_UPDATE");
    default:
      return null;
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let httpErr: HttpError | null = null;
  if (err instanceof HttpError) httpErr = err;
  else if (err instanceof TransitionError) httpErr = conflict(err.message, err.code);
  else if (err instanceof ZodError) httpErr = badRequest("Invalid request", "VALIDATION_ERROR", err.issues);
  else if (err?.type === "entity.parse.failed") httpErr = badRequest("Malformed JSON body", "MALFORMED_JSON");
  else if (err?.type === "entity.too.large") httpErr = new HttpError(413, "Request body too large", "PAYLOAD_TOO_LARGE");
  else if (err && typeof err === "object") httpErr = fromPg((err as { cause?: object }).cause ?? err) ?? fromPg(err);

  if (!httpErr) {
    req.log?.error({ err }, "Unhandled error");
    if (process.env.NODE_ENV === "test") console.error("[test] unhandled error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL", requestId: req.id });
    return;
  }
  if (httpErr.status >= 500) req.log?.error({ err }, httpErr.message);
  res.status(httpErr.status).json({ error: httpErr.message, code: httpErr.code, details: httpErr.details, requestId: req.id });
};
