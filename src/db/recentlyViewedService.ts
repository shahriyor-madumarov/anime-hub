import { supabaseServer } from "./supabaseServer";

function normalizeMediaType(typeStr?: string): "anime" | "manga" | "manhwa" {
  if (!typeStr) return "anime";
  const lower = typeStr.toLowerCase();
  if (lower.includes("manga")) return "manga";
  if (lower.includes("manhwa")) return "manhwa";
  return "anime";
}

export async function getUserRecentlyViewed(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabaseServer
      .from("recently_viewed")
      .select("media_data, viewed_at")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[RecentlyViewedService] Error fetching recently viewed:", error.message);
      return [];
    }

    if (!data) return [];

    return data.map((row) => ({
      ...(row.media_data || {}),
      viewedAt: row.viewed_at,
    }));
  } catch (err) {
    console.error("[RecentlyViewedService] Exception in getUserRecentlyViewed:", err);
    return [];
  }
}

export async function addRecentlyViewed(userId: string, media: any): Promise<any[]> {
  if (!media || !media.id) return getUserRecentlyViewed(userId);

  const mediaId = parseInt(media.id, 10);
  const mediaType = normalizeMediaType(media.type || media.mediaType);
  const now = new Date().toISOString();

  try {
    const { error } = await supabaseServer
      .from("recently_viewed")
      .upsert(
        {
          user_id: userId,
          media_id: mediaId,
          media_type: mediaType,
          media_data: media,
          viewed_at: now,
          updated_at: now,
        },
        { onConflict: "user_id,media_id,media_type" }
      );

    if (error) {
      console.error("[RecentlyViewedService] Error upserting recently viewed item:", error.message);
    }
  } catch (err) {
    console.error("[RecentlyViewedService] Exception in addRecentlyViewed:", err);
  }

  return getUserRecentlyViewed(userId);
}

export async function clearRecentlyViewed(userId: string): Promise<any[]> {
  try {
    const { error } = await supabaseServer
      .from("recently_viewed")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("[RecentlyViewedService] Error clearing recently viewed:", error.message);
    }
  } catch (err) {
    console.error("[RecentlyViewedService] Exception in clearRecentlyViewed:", err);
  }

  return [];
}

export async function syncRecentlyViewed(
  userId: string,
  clientList: any[],
  serverListFallback: any[] = []
): Promise<any[]> {
  const dbList = await getUserRecentlyViewed(userId);
  const baseList = dbList.length > 0 ? dbList : serverListFallback;

  const combinedRV: any[] = [];
  const seenIds = new Set<number>();

  for (const item of [...(Array.isArray(clientList) ? clientList : []), ...baseList]) {
    if (item && item.id && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      combinedRV.push(item);
    }
  }

  const mergedRV = combinedRV.slice(0, 20);

  for (const item of mergedRV) {
    await addRecentlyViewed(userId, item);
  }

  return getUserRecentlyViewed(userId);
}


