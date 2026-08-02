import { supabaseServer } from "./supabaseServer";
import { updateUserProfile } from "./userService";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB limit
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function parseBase64(dataUriOrBase64: string): { buffer: Buffer; mimeType: string; extension: string } {
  let mimeType = "image/jpeg";
  let base64Data = dataUriOrBase64;

  const match = dataUriOrBase64.match(/^data:(image\/[a-zA-Z0-9+-]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1].toLowerCase();
    base64Data = match[2];
  }

  if (mimeType === "image/jpg") mimeType = "image/jpeg";

  let extension = "jpg";
  if (mimeType === "image/png") extension = "png";
  else if (mimeType === "image/webp") extension = "webp";
  else if (mimeType === "image/jpeg") extension = "jpg";

  const buffer = Buffer.from(base64Data, "base64");
  return { buffer, mimeType, extension };
}

export async function uploadAvatar(
  userId: string,
  input: Buffer | string,
  mimeTypeInput?: string
): Promise<{ url: string; user: any }> {
  let buffer: Buffer;
  let mimeType: string = mimeTypeInput || "image/jpeg";
  let extension = "jpg";

  if (typeof input === "string") {
    const parsed = parseBase64(input);
    buffer = parsed.buffer;
    mimeType = parsed.mimeType;
    extension = parsed.extension;
  } else {
    buffer = input;
    if (mimeType === "image/png") extension = "png";
    else if (mimeType === "image/webp") extension = "webp";
    else extension = "jpg";
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("Превышен максимальный размер файла (5 МБ).");
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Неподдерживаемый формат изображения. Разрешены: JPG, JPEG, PNG, WEBP.");
  }

  const filename = `${userId}/avatar_${Date.now()}.${extension}`;

  // Clear previous avatar files for this user folder
  try {
    const { data: list } = await supabaseServer.storage.from("avatars").list(userId);
    if (list && list.length > 0) {
      const filesToRemove = list.map((f) => `${userId}/${f.name}`);
      await supabaseServer.storage.from("avatars").remove(filesToRemove);
    }
  } catch (err) {
    console.warn("[StorageService] Non-fatal error cleaning old avatars:", err);
  }

  const { error: uploadError } = await supabaseServer.storage
    .from("avatars")
    .upload(filename, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error("[StorageService] Error uploading avatar:", uploadError.message);
    throw new Error(`Ошибка загрузки аватарки: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabaseServer.storage
    .from("avatars")
    .getPublicUrl(filename);

  const publicUrl = publicUrlData.publicUrl;
  const updatedUser = await updateUserProfile(userId, { avatarUrl: publicUrl });

  return { url: publicUrl, user: updatedUser };
}

export async function deleteAvatar(userId: string): Promise<{ success: boolean; user: any }> {
  try {
    const { data: list } = await supabaseServer.storage.from("avatars").list(userId);
    if (list && list.length > 0) {
      const filesToRemove = list.map((f) => `${userId}/${f.name}`);
      await supabaseServer.storage.from("avatars").remove(filesToRemove);
    }
  } catch (err) {
    console.error("[StorageService] Error deleting avatar files:", err);
  }

  const updatedUser = await updateUserProfile(userId, { avatarUrl: "" });
  return { success: true, user: updatedUser };
}

export async function uploadBanner(
  userId: string,
  input: Buffer | string,
  mimeTypeInput?: string
): Promise<{ url: string; user: any }> {
  let buffer: Buffer;
  let mimeType: string = mimeTypeInput || "image/jpeg";
  let extension = "jpg";

  if (typeof input === "string") {
    const parsed = parseBase64(input);
    buffer = parsed.buffer;
    mimeType = parsed.mimeType;
    extension = parsed.extension;
  } else {
    buffer = input;
    if (mimeType === "image/png") extension = "png";
    else if (mimeType === "image/webp") extension = "webp";
    else extension = "jpg";
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("Превышен максимальный размер файла (5 МБ).");
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Неподдерживаемый формат изображения. Разрешены: JPG, JPEG, PNG, WEBP.");
  }

  const filename = `${userId}/banner_${Date.now()}.${extension}`;

  // Clear previous banner files for this user folder
  try {
    const { data: list } = await supabaseServer.storage.from("banners").list(userId);
    if (list && list.length > 0) {
      const filesToRemove = list.map((f) => `${userId}/${f.name}`);
      await supabaseServer.storage.from("banners").remove(filesToRemove);
    }
  } catch (err) {
    console.warn("[StorageService] Non-fatal error cleaning old banners:", err);
  }

  const { error: uploadError } = await supabaseServer.storage
    .from("banners")
    .upload(filename, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error("[StorageService] Error uploading banner:", uploadError.message);
    throw new Error(`Ошибка загрузки баннера: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabaseServer.storage
    .from("banners")
    .getPublicUrl(filename);

  const publicUrl = publicUrlData.publicUrl;
  const updatedUser = await updateUserProfile(userId, { backgroundBanner: publicUrl });

  return { url: publicUrl, user: updatedUser };
}

export async function deleteBanner(userId: string): Promise<{ success: boolean; user: any }> {
  try {
    const { data: list } = await supabaseServer.storage.from("banners").list(userId);
    if (list && list.length > 0) {
      const filesToRemove = list.map((f) => `${userId}/${f.name}`);
      await supabaseServer.storage.from("banners").remove(filesToRemove);
    }
  } catch (err) {
    console.error("[StorageService] Error deleting banner files:", err);
  }

  const updatedUser = await updateUserProfile(userId, { backgroundBanner: "" });
  return { success: true, user: updatedUser };
}
