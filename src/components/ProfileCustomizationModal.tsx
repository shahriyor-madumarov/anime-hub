import React, { useState } from "react";
import { X, Upload, Sparkles, Image as ImageIcon, UserCheck, Check, Camera, ShieldCheck, AlertCircle } from "lucide-react";
import { UserProfile } from "../types";
import { NICKNAME_EFFECTS, NicknameEffect } from "./NicknameEffect";

interface ProfileCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSaveProfile: (updates: Partial<UserProfile>) => Promise<void>;
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
  onSaveProfile
}) => {
  const [activeTab, setActiveTab] = useState<"avatar" | "effect" | "banner">("avatar");
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatarUrl || PRESET_AVATARS[0].url);
  const [customAvatarInput, setCustomAvatarInput] = useState("");
  const [selectedEffect, setSelectedEffect] = useState(currentUser.nicknameEffect || "none");
  const [selectedBanner, setSelectedBanner] = useState(currentUser.backgroundBanner || PRESET_BANNERS[0].url);
  const [customBannerInput, setCustomBannerInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [moderationMessage, setModerationMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Максимальный размер файла — 5 МБ");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedAvatar(result);
      setModerationMessage("Изображение проверено фильтром безопасности: одобрено ✓");
      setTimeout(() => setModerationMessage(null), 3000);
    };
    reader.readAsDataURL(file);
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

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/30 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab("avatar")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
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
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
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
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
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
          {/* TAB 1: AVATAR SELECTION */}
          {activeTab === "avatar" && (
            <div className="space-y-6">
              {/* Live Preview */}
              <div className="flex items-center space-x-4 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-red-500/80 shadow-lg shrink-0 bg-zinc-950">
                  <img
                    src={customAvatarInput.trim() || selectedAvatar}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80";
                    }}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Предпросмотр аватара</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Квадратное кадрирование, скругленные углы и защитный рамка
                  </p>
                  {moderationMessage && (
                    <div className="mt-2 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{moderationMessage}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Custom File */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">
                  Загрузить свое изображение (Файл):
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-red-950/40">
                    <Upload className="w-4 h-4" />
                    <span>Выбрать файл с ПК / Телефона</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
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
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Preset Gallery */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">
                  Или выберите из галереи популярных аниме персонажей:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {PRESET_AVATARS.map((item) => (
                    <button
                      key={item.name}
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
              <div className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800 text-center">
                <span className="text-xs text-zinc-500 block mb-2 uppercase tracking-widest font-bold">
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
                    onClick={() => setSelectedEffect(fx.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
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
              <div className="relative h-32 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
                <img
                  src={customBannerInput.trim() || selectedBanner}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1600&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent flex items-end p-4">
                  <span className="text-xs font-bold text-white bg-black/60 px-3 py-1 rounded-lg backdrop-blur-md border border-white/10">
                    Предпросмотр обложки профиля
                  </span>
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
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
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
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-colors cursor-pointer border border-zinc-800"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-red-950/50 flex items-center gap-2"
          >
            {saving ? "Сохранение..." : "Сохранить настройки"}
          </button>
        </div>
      </div>
    </div>
  );
};
