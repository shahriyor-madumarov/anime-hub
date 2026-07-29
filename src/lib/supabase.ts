import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "https://xrotiwzgtcwqjjpgzznh.supabase.co";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "sb_publishable_HYLIoV70dTcXlYGgT0mvgg_2zI1-IS4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

