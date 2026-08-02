import { Request, Response, NextFunction } from "express";
import { z, ZodSchema, ZodError } from "zod";

export interface RequestValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

export const validateRequest = (schemas: RequestValidationSchemas) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const isRegister = req.originalUrl?.includes('/api/auth/register') || req.path?.includes('/register');
    if (isRegister) {
      console.log("[REGISTER TRACE 1] Incoming request body:", JSON.stringify({
        ...req.body,
        password: req.body?.password ? "[REDACTED]" : undefined,
      }));
    }
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as any;
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as any;
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (isRegister) {
        console.log("[REGISTER TRACE 2] Validation result: SUCCESS");
      }
      next();
    } catch (error) {
      if (isRegister) {
        console.error("[REGISTER TRACE 2] Validation result: FAILED");
        console.error("[REGISTER TRACE 7] Validation error details:", {
          message: error instanceof Error ? error.message : String(error),
          code: "VALIDATION_ERROR",
          status: 400,
          fullError: error,
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
      if (error instanceof ZodError) {
        const issues = error.issues.map((e) => {
          const pathStr = e.path.join(".");
          return pathStr ? `${pathStr}: ${e.message}` : e.message;
        }).join("; ");
        const errorResponseBody = { error: `Validation error: ${issues}` };
        if (isRegister) {
          console.log("[REGISTER TRACE 8] Express route returning JSON to frontend (Validation Error):", JSON.stringify(errorResponseBody));
        }
        return res.status(400).json(errorResponseBody);
      }
      const errorResponseBody = { error: "Invalid request data" };
      if (isRegister) {
        console.log("[REGISTER TRACE 8] Express route returning JSON to frontend (Validation Error):", JSON.stringify(errorResponseBody));
      }
      return res.status(400).json(errorResponseBody);
    }
  };
};

// --- Auth Schemas ---
export const registerSchema = {
  body: z.object({
    username: z.string().trim().min(1, "Имя пользователя обязательно"),
    email: z.string().trim().toLowerCase().email("Укажите корректный адрес электронной почты"),
    password: z.string().min(8, "Пароль должен быть не менее 8 символов"),
    dateOfBirth: z.string().refine((val) => !isNaN(new Date(val).getTime()), "Укажите корректную дату рождения"),
  }),
};

export const loginSchema = {
  body: z.object({
    login: z.string().trim().min(1, "Введите имя пользователя или email"),
    password: z.string().min(1, "Введите пароль"),
  }),
};

export const updateProfileSchema = {
  body: z.object({
    dateOfBirth: z.string().optional(),
    username: z.string().trim().optional(),
    email: z.string().trim().toLowerCase().optional(),
    avatarUrl: z.string().optional(),
    bio: z.string().optional(),
    nicknameEffect: z.string().optional(),
    backgroundBanner: z.string().optional(),
  }),
};

// --- Watchlist Schemas ---
export const saveWatchlistSchema = {
  body: z.object({
    mediaId: z.union([z.number(), z.string()]).transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, "Укажите корректный mediaId"),
    item: z.record(z.string(), z.any()).refine((obj) => obj && typeof obj === "object", "Укажите данные элемента"),
  }),
};

export const deleteWatchlistSchema = {
  params: z.object({
    mediaId: z.string().transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, "Некорректный mediaId"),
  }),
};

// --- Recently Viewed Schemas ---
export const addRecentlyViewedSchema = {
  body: z.object({
    media: z.object({
      id: z.union([z.number(), z.string()]).transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, "Некорректный id"),
    }).passthrough(),
  }),
};

// --- Read Chapters Schemas ---
export const saveReadChaptersSchema = {
  body: z.object({
    mediaId: z.union([z.number(), z.string()]).transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, "Укажите mediaId"),
    readChapters: z.array(z.number()),
  }),
};

export const toggleReadChapterSchema = {
  body: z.object({
    mediaId: z.union([z.number(), z.string()]).transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, "Укажите mediaId"),
    chapterNumber: z.number(),
  }),
};

export const markUpToChapterSchema = {
  body: z.object({
    mediaId: z.union([z.number(), z.string()]).transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, "Укажите mediaId"),
    chapterNumber: z.number().int().positive("chapterNumber должен быть положительным числом"),
  }),
};

export const userSyncSchema = {
  body: z.object({
    watchlist: z.record(z.string(), z.any()).optional().default({}),
    readChapters: z.record(z.string(), z.any()).optional().default({}),
    recentlyViewed: z.array(z.any()).optional().default([]),
  }),
};
