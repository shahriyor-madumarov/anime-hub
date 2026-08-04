import { createClient } from "@supabase/supabase-js";

function getValidUrl(url?: string): string {
  const fallback = "https://xrotiwzgtcwqjjpgzznh.supabase.co";
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return fallback;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return fallback;
  return trimmed;
}

function getValidKey(key?: string, fallback: string = "sb_publishable_HYLIoV70dTcXlYGgT0mvgg_2zI1-IS4"): string {
  if (!key || typeof key !== "string") return fallback;
  const trimmed = key.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return fallback;
  return trimmed;
}

const rawUrl =
  (typeof process !== "undefined" ? process.env?.SUPABASE_URL || process.env?.VITE_SUPABASE_URL : undefined) ||
  (import.meta as any).env?.VITE_SUPABASE_URL;

const rawAnonKey =
  (typeof process !== "undefined" ? process.env?.SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_ANON_KEY : undefined) ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = getValidUrl(rawUrl);
const supabaseAnonKey = getValidKey(rawAnonKey, "sb_publishable_HYLIoV70dTcXlYGgT0mvgg_2zI1-IS4");

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


