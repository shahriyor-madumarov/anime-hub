import { getSupabaseClient } from "./supabaseServer";

export interface WatchlistItemPayload {
  mediaId: number;
  item: any;
}

function normalizeMediaType(typeStr?: string): "anime" | "manga" | "manhwa" {
  if (!typeStr) return "anime";
  const lower = typeStr.toLowerCase();
  if (lower.includes("manga")) return "manga";
  if (lower.includes("manhwa")) return "manhwa";
  return "anime";
}

function normalizeStatus(statusStr?: string): string {
  if (!statusStr) return "watching";
  const lower = statusStr.toLowerCase();
  if (lower === "watching" || lower === "current") return "watching";
  if (lower === "reading") return "reading";
  if (lower === "planning" || lower === "plan_to_watch") return "plan_to_watch";
  if (lower === "completed") return "completed";
  if (lower === "dropped") return "dropped";
  if (lower === "on_hold" || lower === "paused") return "on_hold";
  return "watching";
}

export async function getUserWatchlist(userId: string, token?: string): Promise<Record<number, any>> {
  try {
    const client = getSupabaseClient(token);
    const { data, error } = await client
      .from("watchlist_items")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("[WatchlistService] Error fetching watchlist from Supabase:", error.message);
      return {};
    }

    const watchlist: Record<number, any> = {};
    if (data && data.length > 0) {
      for (const row of data) {
        const itemObj = row.media_data || {};
        watchlist[row.media_id] = {
          ...itemObj,
          id: row.media_id,
          status: row.status,
          score: row.score,
          progressEpisode: row.progress_episode,
          progressChapter: row.progress_chapter,
          updatedAt: row.updated_at || new Date().toISOString(),
        };
      }
    }
    return watchlist;
  } catch (err: any) {
    console.error("[WatchlistService] Exception in getUserWatchlist:", err);
    return {};
  }
}

export async function saveWatchlistItem(
  userId: string,
  mediaId: number,
  item: any,
  token?: string
): Promise<Record<number, any>> {
  const mediaType = normalizeMediaType(item.type || item.mediaType);
  const status = normalizeStatus(item.status);
  const score = typeof item.score === "number" ? Math.max(0, Math.min(10, item.score)) : null;
  const progressEpisode = typeof item.progressEpisode === "number" ? item.progressEpisode : 0;
  const progressChapter = typeof item.progressChapter === "number" ? item.progressChapter : 0;
  const now = new Date().toISOString();

  const itemToStore = {
    ...item,
    id: mediaId,
    updatedAt: now,
  };

  try {
    const client = getSupabaseClient(token);
    const { error } = await client
      .from("watchlist_items")
      .upsert(
        {
          user_id: userId,
          media_id: mediaId,
          media_type: mediaType,
          status,
          score,
          progress_episode: progressEpisode,
          progress_chapter: progressChapter,
          media_data: itemToStore,
          updated_at: now,
        },
        { onConflict: "user_id,media_id,media_type" }
      );

    if (error) {
      console.error("[WatchlistService] Error upserting watchlist item:", error.message);
    }
  } catch (err: any) {
    console.error("[WatchlistService] Exception in saveWatchlistItem:", err);
  }

  return getUserWatchlist(userId, token);
}

export async function deleteWatchlistItem(
  userId: string,
  mediaId: number,
  token?: string
): Promise<Record<number, any>> {
  try {
    const client = getSupabaseClient(token);
    const { error } = await client
      .from("watchlist_items")
      .delete()
      .eq("user_id", userId)
      .eq("media_id", mediaId);

    if (error) {
      console.error("[WatchlistService] Error deleting watchlist item:", error.message);
    }
  } catch (err: any) {
    console.error("[WatchlistService] Exception in deleteWatchlistItem:", err);
  }

  return getUserWatchlist(userId, token);
}

export async function syncWatchlist(
  userId: string,
  clientWatchlist: Record<number, any>,
  serverWatchlistFallback: Record<number, any> = {},
  token?: string
): Promise<Record<number, any>> {
  const dbWatchlist = await getUserWatchlist(userId, token);
  const baseWatchlist = Object.keys(dbWatchlist).length > 0 ? dbWatchlist : serverWatchlistFallback;

  const merged: Record<number, any> = { ...baseWatchlist };

  for (const [key, item] of Object.entries(clientWatchlist)) {
    const mediaId = parseInt(key, 10);
    if (!mediaId || !item) continue;
    const existing = merged[mediaId];
    if (!existing) {
      merged[mediaId] = item;
    } else {
      const localTime = (item as any).updatedAt ? new Date((item as any).updatedAt).getTime() : 0;
      const serverTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      if (localTime >= serverTime) {
        merged[mediaId] = { ...existing, ...(item as any) };
      } else {
        merged[mediaId] = { ...(item as any), ...existing };
      }
    }
  }

  // Persist all items to Supabase
  for (const [key, item] of Object.entries(merged)) {
    const mediaId = parseInt(key, 10);
    if (mediaId && item) {
      await saveWatchlistItem(userId, mediaId, item, token);
    }
  }

  return getUserWatchlist(userId, token);
}
