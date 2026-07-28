import React, { useState, useEffect } from "react";
import { Building2, Sparkles, Film, Calendar, Star, ChevronRight } from "lucide-react";
import { MediaItem, Studio } from "../types";
import { apiFetch } from "../utils/auth";
import { MediaCard } from "./MediaCard";

interface StudioViewProps {
  initialStudioId?: number;
  onSelectMedia: (media: MediaItem) => void;
}

const POPULAR_STUDIOS = [
  { id: 569, name: "MAPPA", description: "Магическая Битва, Человек-бензопила, Атака титанов" },
  { id: 43, name: "ufotable", description: "Клинок, рассекающий демонов, Серия Fate" },
  { id: 11, name: "Madhouse", description: "Фрирен, Один удар, Тетрадь смерти" },
  { id: 2, name: "Kyoto Animation", description: "Вайолет Эвергарден, Форма голоса, Кланнад" },
  { id: 801, name: "CloverWorks", description: "Эта фарфоровая кукла влюбилась, Семья шпиона" },
  { id: 21, name: "Studio Ghibli", description: "Унесенные призраками, Ходячий замок" }
];

export const StudioView: React.FC<StudioViewProps> = ({ initialStudioId = 569, onSelectMedia }) => {
  const [activeStudioId, setActiveStudioId] = useState<number>(initialStudioId);
  const [studioData, setStudioData] = useState<{ studio: Studio; upcoming: MediaItem[]; catalog: MediaItem[] } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const deduplicateMedia = (list: MediaItem[] = []) => {
    const seen = new Set<number>();
    return list.filter((item) => {
      if (!item || !item.id) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  const fetchStudio = async (id: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/studio/${id}`);
      const data = await res.json();
      setStudioData({
        ...data,
        upcoming: deduplicateMedia(data.upcoming || []),
        catalog: deduplicateMedia(data.catalog || [])
      });
    } catch (e) {
      console.error("Failed to load studio details", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudio(activeStudioId);
  }, [activeStudioId]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Title */}
      <div className="mb-8 border-b border-zinc-800 pb-6">
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Building2 className="w-8 h-8 text-red-500" />
          Анимационные Студии
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Каталог ведущих японских аниме-студий, их работы и **анонсированные будущие проекты**
        </p>
      </div>

      {/* Studio Selection Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8">
        {POPULAR_STUDIOS.map((st) => (
          <button 
            key={st.id}
            onClick={() => setActiveStudioId(st.id)}
            className={`p-3 rounded-2xl border text-left transition-all ${
              activeStudioId === st.id 
                ? "bg-red-600 border-red-500 text-white shadow-lg scale-[1.02]" 
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <h4 className="font-bold text-sm">{st.name}</h4>
            <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{st.description}</p>
          </button>
        ))}
      </div>

      {/* Studio Detail Content */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400">Загрузка каталога студии...</div>
      ) : studioData ? (
        <div className="space-y-10">
          {/* Upcoming & Announced Projects */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-bold text-white">
                Анонсы и Будущие проекты ({studioData.upcoming.length})
              </h2>
            </div>

            {studioData.upcoming.length === 0 ? (
              <p className="text-xs text-zinc-500">Нет подтвержденных предстоящих релизов в расписании.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {studioData.upcoming.map((media) => (
                  <MediaCard key={media.id} media={media} onClick={onSelectMedia} />
                ))}
              </div>
            )}
          </div>

          {/* Catalog History */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Film className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-bold text-white">
                Завершенные работы и Бэк-каталог ({studioData.catalog.length})
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {studioData.catalog.map((media) => (
                <MediaCard key={media.id} media={media} onClick={onSelectMedia} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
