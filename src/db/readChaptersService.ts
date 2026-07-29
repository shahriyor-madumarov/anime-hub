import { supabaseServer } from "./supabaseServer";

export async function getUserReadChapters(userId: string): Promise<Record<number, number[]>> {
  try {
    const { data, error } = await supabaseServer
      .from("read_chapters")
      .select("media_id, chapter_number")
      .eq("user_id", userId);

    if (error) {
      console.error("[ReadChaptersService] Error fetching read chapters from Supabase:", error.message);
      return {};
    }

    const map: Record<number, number[]> = {};
    if (data) {
      for (const row of data) {
        const mediaId = row.media_id;
        const chNum = Number(row.chapter_number);
        if (!map[mediaId]) {
          map[mediaId] = [];
        }
        if (!map[mediaId].includes(chNum)) {
          map[mediaId].push(chNum);
        }
      }
      for (const mediaId in map) {
        map[mediaId].sort((a, b) => a - b);
      }
    }
    return map;
  } catch (err) {
    console.error("[ReadChaptersService] Exception in getUserReadChapters:", err);
    return {};
  }
}

export async function saveReadChaptersForMedia(
  userId: string,
  mediaId: number,
  chapters: number[]
): Promise<number[]> {
  try {
    // Clean old records for mediaId not in chapters array
    if (chapters.length === 0) {
      await supabaseServer
        .from("read_chapters")
        .delete()
        .eq("user_id", userId)
        .eq("media_id", mediaId);
      return [];
    }

    const rowsToUpsert = chapters.map((chNum) => ({
      user_id: userId,
      media_id: mediaId,
      chapter_number: chNum,
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseServer
      .from("read_chapters")
      .upsert(rowsToUpsert, { onConflict: "user_id,media_id,chapter_number" });

    if (error) {
      console.error("[ReadChaptersService] Error upserting read chapters:", error.message);
    }
  } catch (err) {
    console.error("[ReadChaptersService] Exception in saveReadChaptersForMedia:", err);
  }

  const allMap = await getUserReadChapters(userId);
  return allMap[mediaId] || [];
}

export async function toggleReadChapter(
  userId: string,
  mediaId: number,
  chapterNumber: number
): Promise<number[]> {
  try {
    const { data } = await supabaseServer
      .from("read_chapters")
      .select("id")
      .eq("user_id", userId)
      .eq("media_id", mediaId)
      .eq("chapter_number", chapterNumber)
      .maybeSingle();

    if (data) {
      // Delete if already read
      await supabaseServer
        .from("read_chapters")
        .delete()
        .eq("id", data.id);
    } else {
      // Insert if not read
      await supabaseServer.from("read_chapters").insert({
        user_id: userId,
        media_id: mediaId,
        chapter_number: chapterNumber,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("[ReadChaptersService] Exception in toggleReadChapter:", err);
  }

  const allMap = await getUserReadChapters(userId);
  return allMap[mediaId] || [];
}

export async function markUpToChapter(
  userId: string,
  mediaId: number,
  maxChapterNumber: number
): Promise<number[]> {
  const chapters: number[] = [];
  for (let i = 1; i <= maxChapterNumber; i++) {
    chapters.push(i);
  }
  return saveReadChaptersForMedia(userId, mediaId, chapters);
}

export async function syncReadChapters(
  userId: string,
  clientReadMap: Record<number, number[]>,
  serverReadMapFallback: Record<number, number[]> = {}
): Promise<Record<number, number[]>> {
  const dbMap = await getUserReadChapters(userId);
  const baseMap = Object.keys(dbMap).length > 0 ? dbMap : serverReadMapFallback;

  const mergedReadMap: Record<number, number[]> = { ...baseMap };

  for (const [key, chapters] of Object.entries(clientReadMap)) {
    const mediaId = parseInt(key, 10);
    if (!mediaId || !Array.isArray(chapters)) continue;
    const existing = mergedReadMap[mediaId] || [];
    const combined = Array.from(new Set([...existing, ...chapters])).sort((a, b) => a - b);
    mergedReadMap[mediaId] = combined;
  }

  for (const [key, chapters] of Object.entries(mergedReadMap)) {
    const mediaId = parseInt(key, 10);
    if (mediaId && Array.isArray(chapters)) {
      await saveReadChaptersForMedia(userId, mediaId, chapters);
    }
  }

  return getUserReadChapters(userId);
}
