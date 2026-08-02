import React, { useState, useEffect } from "react";
import { Filter, Search, Grid, List, Sparkles, SlidersHorizontal, RefreshCw, Lock, ShieldCheck, X } from "lucide-react";
import { FilterState, MediaItem, MediaType, UserProfile } from "../types";
import { GENRE_MAP_RU, FORMAT_MAP_RU, STATUS_MAP_RU } from "../utils/helpers";
import { apiFetch } from "../utils/auth";
import { MediaCard } from "./MediaCard";

interface CatalogViewProps {
  initialType?: MediaType;
  initialCountryOfOrigin?: "ALL" | "JP" | "KR" | "CN,TW";
  onSelectMedia: (media: MediaItem) => void;
  currentUser: UserProfile | null;
  onRequireAuthFor18Plus: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ 
  initialType = "ANIME", 
  initialCountryOfOrigin,
  onSelectMedia,
  currentUser,
  onRequireAuthFor18Plus
}) => {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    type: initialType,
    genres: [],
    tags: [],
    sort: "POPULARITY_DESC",
    isAdult: false
  });

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
  const [countryFilter, setCountryFilter] = useState<"ALL" | "JP" | "KR" | "CN,TW">(
    initialCountryOfOrigin || (initialType === "MANGA" ? "JP" : "ALL")
  );
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  useEffect(() => {
    setFilters(prev => ({ ...prev, type: initialType }));
    setCountryFilter(initialCountryOfOrigin || (initialType === "MANGA" ? "JP" : "ALL"));
  }, [initialType, initialCountryOfOrigin]);

  const deduplicateMedia = (list: MediaItem[]) => {
    const seen = new Set<number>();
    return list.filter((item) => {
      if (!item || !item.id) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  const fetchCatalog = async (targetPage: number, resetList = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("type", filters.type);
      params.append("page", targetPage.toString());
      params.append("perPage", "24");
      params.append("sort", filters.sort);
      params.append("isAdult", filters.isAdult.toString());

      if (filters.type === "MANGA" && countryFilter !== "ALL") {
        params.append("countryOfOrigin", countryFilter);
      }

      if (filters.search) params.append("search", filters.search);
      if (filters.genres[0]) params.append("genre", filters.genres[0]);
      if (filters.format) params.append("format", filters.format);
      if (filters.status) params.append("status", filters.status);
      if (filters.year) params.append("seasonYear", filters.year.toString());

      const res = await apiFetch(`/api/catalog?${params.toString()}`);
      const data = await res.json();
      const newMedia: MediaItem[] = data.media || [];

      if (resetList) {
        setItems(deduplicateMedia(newMedia));
        setPage(1);
      } else {
        setItems((prev) => deduplicateMedia([...prev, ...newMedia]));
        setPage(targetPage);
      }

      setHasNextPage(data.pageInfo?.hasNextPage || false);
    } catch (e) {
      console.error("Failed to load catalog", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((!currentUser || !currentUser.isAdultVerified) && filters.isAdult) {
      setFilters(prev => ({ ...prev, isAdult: false }));
      return;
    }
    fetchCatalog(1, true);
  }, [filters, countryFilter]);

  const handleAdultToggle = (targetVal: boolean) => {
    if (targetVal) {
      if (!currentUser) {
        onRequireAuthFor18Plus();
        return;
      }
      if (!currentUser.isAdultVerified) {
        onRequireAuthFor18Plus();
        return;
      }
    }
    setFilters(prev => ({ ...prev, isAdult: targetVal }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Title & Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 p-4 sm:p-6 rounded-3xl border border-zinc-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-red-500" />
            Каталог {filters.type === "ANIME" ? "Аниме" : "Манги"}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Найдено лучших тайтлов по вашим параметрам
          </p>
        </div>

        {/* Action Controls (Mobile Filter Trigger & Grid/List Toggle) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="lg:hidden flex-1 sm:flex-initial min-h-[48px] px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Фильтры {filters.genres.length > 0 && `(${filters.genres.length})`}</span>
          </button>

          <div className="hidden sm:flex items-center bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setLayoutMode("grid")}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${layoutMode === "grid" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              title="Сетка"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode("list")}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${layoutMode === "list" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              title="Список"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP FILTER BAR */}
      <div className="hidden lg:block bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-3xl space-y-4">
        {/* Country Tabs (if MANGA) */}
        {filters.type === "MANGA" && (
          <div className="flex items-center gap-2 border-b border-zinc-800/60 pb-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-2">Регион:</span>
            {[
              { id: "ALL", label: "Все" },
              { id: "JP", label: "Манга 🇯🇵" },
              { id: "KR", label: "Манхва 🇰🇷" },
              { id: "CN,TW", label: "Маньхуа 🇨🇳" },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setCountryFilter(c.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  countryFilter === c.id
                    ? "bg-red-600 text-white shadow-md shadow-red-950/40"
                    : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full bg-zinc-950 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-red-500 font-medium"
            />
          </div>

          {/* Genre Select */}
          <div className="col-span-3">
            <select
              value={filters.genres[0] || ""}
              onChange={(e) => setFilters(prev => ({ ...prev, genres: e.target.value ? [e.target.value] : [] }))}
              className="w-full bg-zinc-950 text-xs text-white px-3 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-red-500 font-medium cursor-pointer"
            >
              <option value="">Все жанры</option>
              {Object.entries(GENRE_MAP_RU).map(([en, ru]) => (
                <option key={en} value={en}>{ru}</option>
              ))}
            </select>
          </div>

          {/* Sort Select */}
          <div className="col-span-3">
            <select
              value={filters.sort}
              onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value as any }))}
              className="w-full bg-zinc-950 text-xs text-white px-3 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-red-500 font-medium cursor-pointer"
            >
              <option value="POPULARITY_DESC">По популярности</option>
              <option value="SCORE_DESC">По рейтингу</option>
              <option value="TRENDING_DESC">В тренде</option>
              <option value="START_DATE_DESC">По дате выхода</option>
            </select>
          </div>

          {/* 18+ Toggle */}
          <div className="col-span-2 flex items-center justify-end">
            <button
              onClick={() => handleAdultToggle(!filters.isAdult)}
              className={`w-full min-h-[38px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                filters.isAdult
                  ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-950/50"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {filters.isAdult ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-500" />}
              <span>{filters.isAdult ? "18+ Вкл" : "18+ Выкл"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE / TABLET FILTER MODAL / BOTTOM SHEET */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/98 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 overflow-y-auto animate-in slide-in-from-bottom duration-300">
          <div className="space-y-6 max-w-lg mx-auto w-full">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-red-500" />
                Фильтры каталога
              </h3>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Region Filter if MANGA */}
            {filters.type === "MANGA" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Регион происхождения</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "ALL", label: "Все" },
                    { id: "JP", label: "Манга 🇯🇵" },
                    { id: "KR", label: "Манхва 🇰🇷" },
                    { id: "CN,TW", label: "Маньхуа 🇨🇳" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCountryFilter(c.id as any)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        countryFilter === c.id
                          ? "bg-red-600 text-white shadow"
                          : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Поиск</label>
              <input
                type="text"
                placeholder="Введит название..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full bg-zinc-900 text-sm text-white px-4 py-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-red-500 font-medium"
              />
            </div>

            {/* Genre Select */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Жанр</label>
              <select
                value={filters.genres[0] || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, genres: e.target.value ? [e.target.value] : [] }))}
                className="w-full bg-zinc-900 text-sm text-white px-4 py-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-red-500 font-medium"
              >
                <option value="">Все жанры</option>
                {Object.entries(GENRE_MAP_RU).map(([en, ru]) => (
                  <option key={en} value={en}>{ru}</option>
                ))}
              </select>
            </div>

            {/* Sort Select */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Сортировка</label>
              <select
                value={filters.sort}
                onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value as any }))}
                className="w-full bg-zinc-900 text-sm text-white px-4 py-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-red-500 font-medium"
              >
                <option value="POPULARITY_DESC">По популярности</option>
                <option value="SCORE_DESC">По рейтингу</option>
                <option value="TRENDING_DESC">В тренде</option>
                <option value="START_DATE_DESC">По дате выхода</option>
              </select>
            </div>

            {/* 18+ Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Возрастной режим</label>
              <button
                onClick={() => handleAdultToggle(!filters.isAdult)}
                className={`w-full min-h-[48px] px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                  filters.isAdult
                    ? "bg-red-600 border-red-500 text-white shadow-md"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400"
                }`}
              >
                {filters.isAdult ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5 text-amber-500" />}
                <span>{filters.isAdult ? "Включен контент 18+" : "Выключен контент 18+"}</span>
              </button>
            </div>
          </div>

          {/* Sticky Bottom Apply Button */}
          <div className="pt-6 pb-2 max-w-lg mx-auto w-full sticky bottom-0 bg-zinc-950">
            <button
              onClick={() => setIsFilterModalOpen(false)}
              className="w-full min-h-[48px] py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm transition-all shadow-xl active:scale-95 cursor-pointer"
            >
              Применить фильтры
            </button>
          </div>
        </div>
      )}

      {/* CATALOG MEDIA GRID */}
      {loading && items.length === 0 ? (
        <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-xs font-semibold text-zinc-400">Загрузка каталога...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center bg-zinc-900/40 rounded-3xl border border-zinc-800/60 p-8 space-y-3">
          <p className="font-bold text-white text-base">По данным критериям тайтлов не найдено</p>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Попробуйте сбросить некоторые фильтры или ввести другое название в строке поиска
          </p>
          <button
            onClick={() => {
              setFilters({
                search: "",
                type: initialType,
                genres: [],
                tags: [],
                sort: "POPULARITY_DESC",
                isAdult: false
              });
              setCountryFilter("ALL");
            }}
            className="mt-2 min-h-[44px] px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-all cursor-pointer"
          >
            Сбросить все фильтры
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4 md:gap-5">
            {items.map((media) => (
              <MediaCard key={media.id} media={media} onClick={onSelectMedia} />
            ))}
          </div>

          {/* Pagination Load More Button */}
          {hasNextPage && (
            <div className="text-center pt-8">
              <button
                onClick={() => fetchCatalog(page + 1)}
                disabled={loading}
                className="min-h-[48px] px-8 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs sm:text-sm font-extrabold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-xl inline-flex items-center gap-2"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin text-red-500" />}
                <span>Загрузить ещё тайтлы</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
