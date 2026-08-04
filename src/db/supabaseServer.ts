import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

function getValidUrl(url?: string): string {
  const fallback = "https://xrotiwzgtcwqjjpgzznh.supabase.co";
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return fallback;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return fallback;
  return trimmed;
}

function getValidKey(key?: string, fallback: string = ""): string {
  if (!key || typeof key !== "string") return fallback;
  const trimmed = key.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return fallback;
  return trimmed;
}

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const rawAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabaseUrl = getValidUrl(rawUrl);
const supabaseAnonKey = getValidKey(rawAnonKey, "sb_publishable_HYLIoV70dTcXlYGgT0mvgg_2zI1-IS4");
const supabaseServiceKey = getValidKey(rawServiceKey, "");

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export function getSupabaseClient(token?: string) {
  if (supabaseServiceKey) {
    return supabaseServer;
  }
  if (!token) {
    return supabaseServer;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}


