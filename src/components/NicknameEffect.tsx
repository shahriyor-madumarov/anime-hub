import React from "react";

export interface NicknameEffectOption {
  id: string;
  name: string;
  category: string;
  className: string;
  icon?: string;
}

export const NICKNAME_EFFECTS: NicknameEffectOption[] = [
  { id: "none", name: "Обычный никнейм", category: "Стандарт", className: "text-white font-bold" },
  
  // Легендарные и Огненные
  { id: "fire_flame", name: "🔥 Пламя Дракона", category: "Огонь", className: "font-extrabold bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse" },
  { id: "crimson_aura", name: "🩸 Кровавая Луна", category: "Огонь", className: "font-extrabold text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.9)] tracking-wider" },
  { id: "inferno_burst", name: "💥 Инферно Вспышка", category: "Огонь", className: "font-black bg-gradient-to-r from-orange-600 via-amber-500 to-red-600 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" },
  
  // Неоновые и Киберпанк
  { id: "neon_cyber", name: "✨ Киберпанк Неон", category: "Неон", className: "font-extrabold bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(217,70,239,0.9)]" },
  { id: "electric_spark", name: "⚡ Молния Райдзин", category: "Неон", className: "font-extrabold text-yellow-300 drop-shadow-[0_0_12px_rgba(253,224,71,0.9)] animate-bounce" },
  { id: "toxic_glow", name: "☣️ Токсичный Кислотный", category: "Неон", className: "font-bold text-lime-400 drop-shadow-[0_0_10px_rgba(163,230,53,0.8)]" },

  // Космические и Магические
  { id: "cosmic_void", name: "🌌 Космический Бездна", category: "Магия", className: "font-extrabold bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(168,85,247,0.8)]" },
  { id: "void_purple", name: "🔮 Владыка Тьмы", category: "Магия", className: "font-extrabold bg-gradient-to-r from-purple-600 via-violet-400 to-indigo-600 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]" },
  { id: "starlight_nova", name: "⭐ Звездный Сверхновая", category: "Магия", className: "font-black bg-gradient-to-r from-amber-200 via-cyan-200 to-white bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" },

  // Японская эстетика
  { id: "sakura_zen", name: "🌸 Нежность Сакуры", category: "Аниме", className: "font-bold bg-gradient-to-r from-pink-300 via-rose-300 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]" },
  { id: "shadow_ninja", name: "🗡️ Тень Синоби", category: "Аниме", className: "font-extrabold text-zinc-300 tracking-widest uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] border-b border-red-500/80" },
  { id: "demon_slayer", name: "⚔️ Клинок Демона", category: "Аниме", className: "font-black bg-gradient-to-r from-red-600 via-zinc-900 to-red-600 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]" },

  // Королевские и Роскошные
  { id: "golden_royalty", name: "👑 Королевский Голд", category: "Премиум", className: "font-extrabold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" },
  { id: "ice_diamond", name: "💎 Ледяной Алмаз", category: "Премиум", className: "font-extrabold bg-gradient-to-r from-sky-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(56,189,248,0.9)]" },
  { id: "emerald_nature", name: "🍃 Изумрудный Дух", category: "Премиум", className: "font-bold bg-gradient-to-r from-emerald-300 via-teal-400 to-green-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" }
];

interface NicknameEffectProps {
  nickname: string;
  effectId?: string;
  className?: string;
  showIcon?: boolean;
}

export const NicknameEffect: React.FC<NicknameEffectProps> = ({
  nickname,
  effectId = "none",
  className = "",
  showIcon = true
}) => {
  const effect = NICKNAME_EFFECTS.find((e) => e.id === effectId) || NICKNAME_EFFECTS[0];

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {showIcon && effect.icon && <span className="text-sm">{effect.icon}</span>}
      <span className={effect.className}>{nickname}</span>
    </span>
  );
};
