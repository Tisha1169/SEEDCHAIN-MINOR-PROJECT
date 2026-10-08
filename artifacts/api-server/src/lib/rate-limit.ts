import { rateLimit } from "express-rate-limit";
import { config } from "../config";

/**
 * In-memory rate limits (per API instance). For multi-instance deployments
 * put a shared limiter at the edge as well; see docs/SECURITY.md.
 */
const common = { standardHeaders: "draft-7" as const, legacyHeaders: false, message: { error: "Too many requests", code: "RATE_LIMITED" } };

export const apiLimiter = rateLimit({ ...common, windowMs: 60_000, limit: config.rateLimits.apiPerMinute });

/** Public QR verification is unauthenticated, so it is limited separately. */
export const publicTraceLimiter = rateLimit({ ...common, windowMs: 60_000, limit: config.rateLimits.publicTracePerMinute });

export const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60_000,
  limit: config.rateLimits.authPer15Minutes,
  // Successful logins do not count against the limit.
  skipSuccessfulRequests: true,
});

/** Razorpay webhook deliveries (signature-checked in the handler; this only caps abuse of the public URL). */
export const webhookLimiter = rateLimit({ ...common, windowMs: 60_000, limit: 600 });

/** Public seal reports create alerts for admins, so cap them tightly per client. */
export const sealReportLimiter = rateLimit({ ...common, windowMs: 60 * 60_000, limit: 10 });
