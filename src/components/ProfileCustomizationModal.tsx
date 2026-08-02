import React, { useState, useEffect } from "react";
import { X, Upload, Sparkles, Image as ImageIcon, Check, Camera, ShieldCheck, AlertCircle, Trash2, Loader2 } from "lucide-react";
import { UserProfile } from "../types";
import { NICKNAME_EFFECTS, NicknameEffect } from "./NicknameEffect";
import { apiFetch, getAuthToken, saveAuthData } from "../utils/auth";

interface ProfileCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSaveProfile: (updates: Partial<UserProfile>) => Promise<void>;
  initialTab?: "avatar" | "effect" | "banner";
}

export const PRESET_AVATARS = [
  { name: "Годзё Сатору", url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80" },
  { name: "Монки Д. Луффи", url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80" },
  { name: "Наруто Удзумаки", url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80" },
  { name: "Недзуко Камадо", url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=400&q=80" },
  { name: "Леви Аккерман", url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80" },
  { name: "Ичиго Куросаки", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80" },
  { name: "Макима", url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&q=80" },
  { name: "Синку", url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=80" },
];

export const PRESET_BANNERS = [
  { name: "Токио Ночью", url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1600&q=80" },
  { name: "Сакура Закат", url: "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1600&q=80" },
  { name: "Студия Гибли Лес", url: "https://images.unsplash.com/photo-1511497584788-876761c11969?w=1600&q=80" },
  { name: "Киберпанк Город", url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1600&q=80" },
  { name: "Японский Храм", url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&q=80" },
  { name: "Темное Фэнтези", url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80" },
];

export const ProfileCustomizationModal: React.FC<ProfileCustomizationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaveProfile,
  initialTab = "avatar"
}) => {
  const [activeTab, setActiveTab] = useState<"avatar" | "effect" | "banner">(initialTab);
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatarUrl || PRESET_AVATARS[0].url);
  const [customAvatarInput, setCustomAvatarInput] = useState("");
  const [selectedEffect, setSelectedEffect] = useState(currentUser.nicknameEffect || "none");
  const [selectedBanner, setSelectedBanner] = useState(currentUser.backgroundBanner || PRESET_BANNERS[0].url);
  const [customBannerInput, setCustomBannerInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedAvatar(currentUser.avatarUrl || PRESET_AVATARS[0].url);
      setSelectedEffect(currentUser.nicknameEffect || "none");
      setSelectedBanner(currentUser.backgroundBanner || PRESET_BANNERS[0].url);
      setCustomAvatarInput("");
      setCustomBannerInput("");
      setStatusMessage(null);
    }
  }, [isOpen, initialTab, currentUser]);

  if (!isOpen) return null;

  // Direct Avatar Upload
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: "error", text: "Превышен максимальный размер файла (5 МБ)." });
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setStatusMessage({ type: "error", text: "Формат не поддерживается. Разрешены JPG, PNG, WEBP." });
      return;
    }

    setUploadingAvatar(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64Data = evt.target?.result as string;
      try {
        const res = await apiFetch("/api/user/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Data, mimeType: file.type })
        });

        const data = await res.json();
        if (res.ok && data.avatarUrl) {
          setSelectedAvatar(data.avatarUrl);
          setCustomAvatarInput("");
          setStatusMessage({ type: "success", text: "Аватар успешно загружен и сохранен!" });
          if (data.user) {
            onSaveProfile({ avatarUrl: data.avatarUrl });
          }
        } else {
          // Fallback to local base64 preview
          setSelectedAvatar(base64Data);
          setCustomAvatarInput("");
          setStatusMessage({ type: "success", text: "Предпросмотр аватара обновлен." });
        }
      } catch (err: any) {
        console.error("Error uploading avatar:", err);
        setSelectedAvatar(base64Data);
        setCustomAvatarInput("");
        setStatusMessage({ type: "success", text: "Изображение загружено локально." });
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Direct Avatar Removal
  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    setStatusMessage(null);
    try {
      const res = await apiFetch("/api/user/avatar", { method: "DELETE" });
      const data = await res.json();
      const defaultAvatar = PRESET_AVATARS[0].url;
      setSelectedAvatar(defaultAvatar);
      setCustomAvatarInput("");
      setStatusMessage({ type: "success", text: "Аватар удален." });
      if (data && data.user) {
        onSaveProfile({ avatarUrl: "" });
      } else {
        await onSaveProfile({ avatarUrl: defaultAvatar });
      }
    } catch (err) {
      console.error("Error deleting avatar:", err);
      const defaultAvatar = PRESET_AVATARS[0].url;
      setSelectedAvatar(defaultAvatar);
      setCustomAvatarInput("");
      setStatusMessage({ type: "success", text: "Аватар сброшен к стандартному." });
      await onSaveProfile({ avatarUrl: defaultAvatar });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Direct Banner Upload
  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: "error", text: "Превышен максимальный размер файла (5 МБ)." });
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setStatusMessage({ type: "error", text: "Формат не поддерживается. Разрешены JPG, PNG, WEBP." });
      return;
    }

    setUploadingBanner(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64Data = evt.target?.result as string;
      try {
        const res = await apiFetch("/api/user/banner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Data, mimeType: file.type })
        });

        const data = await res.json();
        if (res.ok && data.backgroundBanner) {
          setSelectedBanner(data.backgroundBanner);
          setCustomBannerInput("");
          setStatusMessage({ type: "success", text: "Обложка успешно загружена и сохранена!" });
          if (data.user) {
            onSaveProfile({ backgroundBanner: data.backgroundBanner });
          }
        } else {
          setSelectedBanner(base64Data);
          setCustomBannerInput("");
          setStatusMessage({ type: "success", text: "Предпросмотр обложки обновлен." });
        }
      } catch (err: any) {
        console.error("Error uploading banner:", err);
        setSelectedBanner(base64Data);
        setCustomBannerInput("");
        setStatusMessage({ type: "success", text: "Обложка загружена локально." });
      } finally {
        setUploadingBanner(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Direct Banner Removal
  const handleRemoveBanner = async () => {
    setUploadingBanner(true);
    setStatusMessage(null);
    try {
      const res = await apiFetch("/api/user/banner", { method: "DELETE" });
      const data = await res.json();
      const defaultBanner = PRESET_BANNERS[0].url;
      setSelectedBanner(defaultBanner);
      setCustomBannerInput("");
      setStatusMessage({ type: "success", text: "Обложка удалена." });
      if (data && data.user) {
        onSaveProfile({ backgroundBanner: "" });
      } else {
        await onSaveProfile({ backgroundBanner: defaultBanner });
      }
    } catch (err) {
      console.error("Error deleting banner:", err);
      const defaultBanner = PRESET_BANNERS[0].url;
      setSelectedBanner(defaultBanner);
      setCustomBannerInput("");
      setStatusMessage({ type: "success", text: "Обложка сброшена." });
      await onSaveProfile({ backgroundBanner: defaultBanner });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const avatarToSave = customAvatarInput.trim() || selectedAvatar;
      const bannerToSave = customBannerInput.trim() || selectedBanner;

      await onSaveProfile({
        avatarUrl: avatarToSave,
        nicknameEffect: selectedEffect,
        backgroundBanner: bannerToSave
      });
      onClose();
    } catch (e) {
      console.error("Failed to save customization", e);
      setStatusMessage({ type: "error", text: "Ошибка сохранения настроек профиля." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Кастомизация Профиля</h3>
              <p className="text-xs text-zinc-400">Выберите аватарку, эффекты никнейма и баннер</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`px-5 py-3 border-b text-xs font-semibold flex items-center justify-between ${
              statusMessage.type === "success"
                ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-300"
                : "bg-red-950/80 border-red-500/30 text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="p-1 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/30 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab("avatar")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === "avatar"
                ? "border-red-500 text-white bg-zinc-900"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Аватар</span>
          </button>
          <button
            onClick={() => setActiveTab("effect")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === "effect"
                ? "border-red-500 text-white bg-zinc-900"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Эффект Ника</span>
          </button>
          <button
            onClick={() => setActiveTab("banner")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === "banner"
                ? "border-red-500 text-white bg-zinc-900"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Обложка</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: AVATAR SELECTION & UPLOAD */}
          {activeTab === "avatar" && (
            <div className="space-y-6">
              {/* Live Preview */}
              <div className="flex items-center space-x-4 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-red-500/80 shadow-lg shrink-0 bg-zinc-950 relative">
                  <img
                    src={customAvatarInput.trim() || selectedAvatar}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PRESET_AVATARS[0].url;
                    }}
                  />
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-bold text-white">Предпросмотр аватара</h4>
                  <p className="text-xs text-zinc-400">
                    Квадратный вид, скругленные углы и защитный рамка
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Удалить аватар</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Custom File */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-300">
                  Загрузить файл аватара (до 5 МБ):
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-red-950/40 min-h-[44px]">
                    {uploadingAvatar ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{uploadingAvatar ? "Загрузка файла..." : "Выбрать файл с устройства"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleAvatarFileUpload}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-red-950/50 border border-zinc-800 hover:border-red-500/40 text-zinc-300 hover:text-red-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 min-h-[44px]"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Сбросить аватар</span>
                  </button>
                </div>
              </div>

              {/* Custom Image URL */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">
                  Или укажите прямую ссылку на фото (URL):
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={customAvatarInput}
                  onChange={(e) => setCustomAvatarInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 min-h-[44px]"
                />
              </div>

              {/* Preset Gallery */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">
                  Или выберите из коллекции популярных аниме персонажей:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {PRESET_AVATARS.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(item.url);
                        setCustomAvatarInput("");
                      }}
                      className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedAvatar === item.url && !customAvatarInput
                          ? "border-red-500 ring-4 ring-red-500/20 scale-105"
                          : "border-zinc-800 hover:border-zinc-600"
                      }`}
                      title={item.name}
                    >
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                      {selectedAvatar === item.url && !customAvatarInput && (
                        <div className="absolute inset-0 bg-red-600/40 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NICKNAME EFFECT CATALOG */}
          {activeTab === "effect" && (
            <div className="space-y-6">
              {/* Live Effect Preview */}
              <div className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800 text-center space-y-2">
                <span className="text-xs text-zinc-500 block uppercase tracking-widest font-bold">
                  Визуальное отображение ника в комментариях и профиле
                </span>
                <div className="text-2xl font-black py-2">
                  <NicknameEffect nickname={currentUser.username} effectId={selectedEffect} />
                </div>
              </div>

              {/* Effects Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {NICKNAME_EFFECTS.map((fx) => (
                  <button
                    key={fx.id}
                    type="button"
                    onClick={() => setSelectedEffect(fx.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between min-h-[50px] ${
                      selectedEffect === fx.id
                        ? "bg-red-600/10 border-red-500 ring-2 ring-red-500/20"
                        : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-0.5">
                        {fx.category}
                      </span>
                      <div className="text-sm font-bold">
                        <NicknameEffect nickname={fx.name} effectId={fx.id} showIcon={false} />
                      </div>
                    </div>
                    {selectedEffect === fx.id && (
                      <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: BACKGROUND BANNER */}
          {activeTab === "banner" && (
            <div className="space-y-6">
              {/* Banner Live Preview */}
              <div className="relative h-36 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
                <img
                  src={customBannerInput.trim() || selectedBanner}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PRESET_BANNERS[0].url;
                  }}
                />
                {uploadingBanner && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 text-red-400 animate-spin" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent flex items-end justify-between p-4">
                  <span className="text-xs font-bold text-white bg-black/60 px-3 py-1 rounded-lg backdrop-blur-md border border-white/10">
                    Предпросмотр обложки профиля
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveBanner}
                    disabled={uploadingBanner}
                    className="text-xs text-red-300 hover:text-red-100 font-bold bg-black/70 hover:bg-red-950/80 px-3 py-1 rounded-lg border border-red-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Удалить обложку</span>
                  </button>
                </div>
              </div>

              {/* Upload Custom File Banner */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-300">
                  Загрузить файл обложки (до 5 МБ):
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-red-950/40 min-h-[44px]">
                    {uploadingBanner ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{uploadingBanner ? "Загрузка обложки..." : "Выбрать файл с устройства"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleBannerFileUpload}
                      disabled={uploadingBanner}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleRemoveBanner}
                    disabled={uploadingBanner}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-red-950/50 border border-zinc-800 hover:border-red-500/40 text-zinc-300 hover:text-red-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 min-h-[44px]"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Сбросить обложку</span>
                  </button>
                </div>
              </div>

              {/* Custom Banner URL */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">
                  Укажите ссылку на свою картинку-баннер (URL):
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/banner.jpg"
                  value={customBannerInput}
                  onChange={(e) => setCustomBannerInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 min-h-[44px]"
                />
              </div>

              {/* Preset Banners Grid */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">
                  Или выберите атмосферную обложку из коллекции:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PRESET_BANNERS.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setSelectedBanner(item.url);
                        setCustomBannerInput("");
                      }}
                      className={`group relative h-24 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedBanner === item.url && !customBannerInput
                          ? "border-red-500 ring-4 ring-red-500/20"
                          : "border-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-2 flex items-end">
                        <span className="text-[10px] font-bold text-white truncate">{item.name}</span>
                      </div>
                      {selectedBanner === item.url && !customBannerInput && (
                        <div className="absolute top-2 right-2 p-1 rounded-full bg-red-600 text-white">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-colors cursor-pointer border border-zinc-800 min-h-[44px]"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploadingAvatar || uploadingBanner}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-red-950/50 flex items-center gap-2 min-h-[44px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Сохранение...</span>
              </>
            ) : (
              <span>Сохранить настройки</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
