import type { NextFunction, Request, Response } from "express";
import { createSupabaseAdminClient } from "./supabase";

export type AuthedRequest = Request & { userId: string; userEmail?: string };

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "missing_bearer_token" });
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "invalid_token" });
    return;
  }

  (req as AuthedRequest).userId = data.user.id;
  (req as AuthedRequest).userEmail = data.user.email ?? undefined;
  next();
}

