import React, { useState, useEffect } from "react";
import { Filter, Search, Grid, List, Sparkles, SlidersHorizontal, AlertCircle, RefreshCw, Lock, ShieldCheck, X } from "lucide-react";
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
    // If user is not adult-verified and isAdult filter is on, auto-reset it
    if ((!currentUser || !currentUser.isAdultVerified) && filters.isAdult) {
      setFilters(prev => ({ ...prev, isAdult: false }));
      return;
    }
    fetchCatalog(1, true);
  }, [filters.type, filters.genres, filters.format, filters.status, filters.sort, filters.year, filters.isAdult, countryFilter, currentUser]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCatalog(1, true);
  };

  const handleToggleAdultFilter = (checked: boolean) => {
    if (checked) {
      if (!currentUser || !currentUser.isAdultVerified) {
        onRequireAuthFor18Plus();
        return;
      }
    }
    setFilters(prev => ({ ...prev, isAdult: checked }));
  };

  const toggleGenre = (genreKey: string) => {
    const isHentai = genreKey === "Hentai";
    if (isHentai && (!currentUser || !currentUser.isAdultVerified)) {
      onRequireAuthFor18Plus();
      return;
    }

    setFilters((prev) => {
      const exists = prev.genres.includes(genreKey);
      return {
        ...prev,
        genres: exists ? [] : [genreKey],
        isAdult: isHentai ? !exists : prev.isAdult
      };
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Type Switch Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-red-500" />
            {filters.type === "ANIME"
              ? "Каталог Аниме"
              : countryFilter === "JP"
              ? "Каталог Манги (Япония 🇯🇵)"
              : countryFilter === "KR"
              ? "Каталог Манхвы (Корея 🇰🇷)"
              : countryFilter === "CN,TW"
              ? "Каталог Маньхуа (Китай 🇨🇳)"
              : "Каталог Манги, Манхвы и Маньхуа"}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {filters.type === "ANIME"
              ? "Полная база аниме-сериалов, фильмов, спешлов и OVA с фильтрацией по жанрам и годам"
              : countryFilter === "KR"
              ? "Корейские вебтуны и манхва с отслеживанием прочитанных глав и удобной сортировкой"
              : countryFilter === "CN,TW"
              ? "Китайские маньхуа и комиксы культивации с информацией о главах и авторах"
              : "Японская манга, корейская манхва и китайская маньхуа в едином каталоге"}
          </p>
        </div>

        {/* Category Switch Button Group */}
        <div className="flex flex-wrap items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl gap-1">
          <button 
            onClick={() => {
              setFilters((prev) => ({ ...prev, type: "ANIME", genres: [] }));
              setCountryFilter("ALL");
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
              filters.type === "ANIME" ? "bg-red-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
            }`}
          >
            АНИМЕ
          </button>
          <button 
            onClick={() => {
              setFilters((prev) => ({ ...prev, type: "MANGA", genres: [] }));
              setCountryFilter("JP");
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
              filters.type === "MANGA" && countryFilter === "JP" ? "bg-red-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
            }`}
          >
            🇯🇵 МАНГА
          </button>
          <button 
            onClick={() => {
              setFilters((prev) => ({ ...prev, type: "MANGA", genres: [] }));
              setCountryFilter("KR");
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
              filters.type === "MANGA" && countryFilter === "KR" ? "bg-red-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
            }`}
          >
            🇰🇷 МАНХВА
          </button>
          <button 
            onClick={() => {
              setFilters((prev) => ({ ...prev, type: "MANGA", genres: [] }));
              setCountryFilter("CN,TW");
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
              filters.type === "MANGA" && countryFilter === "CN,TW" ? "bg-red-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
            }`}
          >
            🇨🇳 МАНЬХУА
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5 mb-8 backdrop-blur-md">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-center gap-4 mb-5">
          {/* Search Bar */}
          <div className="relative flex-1 w-full flex items-center">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none z-10" />
            <input 
              type="text"
              placeholder={filters.type === "ANIME" ? "Поиск аниме по названию (RU, EN, JP)..." : "Поиск манги, манхвы, маньхуа по названию..."}
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full bg-zinc-950 text-sm text-white pl-10 pr-10 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors placeholder:text-zinc-500 font-medium selection:bg-red-600 selection:text-white caret-red-500"
              style={{ color: "#ffffff", backgroundColor: "#09090b" }}
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer z-10"
                title="Очистить поиск"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button 
            type="submit"
            className="w-full lg:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" /> Найти
          </button>
        </form>

        {/* Dropdowns Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
          {/* Format */}
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Формат</label>
            <select 
              value={filters.format || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, format: e.target.value || undefined }))}
              className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-lg p-2 focus:outline-none focus:border-red-500"
            >
              <option value="">Все форматы</option>
              {Object.entries(FORMAT_MAP_RU).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Статус</label>
            <select 
              value={filters.status || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value || undefined }))}
              className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-lg p-2 focus:outline-none focus:border-red-500"
            >
              <option value="">Любой статус</option>
              {Object.entries(STATUS_MAP_RU).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Сортировка</label>
            <select 
              value={filters.sort}
              onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value as any }))}
              className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-lg p-2 focus:outline-none focus:border-red-500 font-medium"
            >
              <option value="POPULARITY_DESC">🔥 Самые популярные (Most Popular)</option>
              <option value="SCORE_DESC">⭐ Наивысший рейтинг (Highest Rated)</option>
              <option value="START_DATE_DESC">🆕 Новинки (Newest / Release Date)</option>
              <option value="TITLE_ROMAJI">🔤 По алфавиту (Alphabetical A-Z)</option>
              <option value="TRENDING_DESC">📈 В тренде сейчас (Trending Now)</option>
              <option value="FAVOURITES_DESC">❤️ Больше всего в избранном (Most Favorited)</option>
              <option value="CHAPTERS_DESC">📖 По количеству глав (Most Chapters)</option>
              <option value="UPDATED_AT_DESC">🔄 Недавно обновленные (Recently Updated)</option>
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Год</label>
            <select 
              value={filters.year || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
              className="w-full bg-zinc-950 text-white border border-zinc-800 rounded-lg p-2 focus:outline-none focus:border-red-500"
            >
              <option value="">Все года</option>
              {Array.from({ length: 25 }, (_, i) => 2026 - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Age Rating / 18+ */}
          <div className="flex flex-col justify-end">
            <label 
              onClick={(e) => {
                if (!currentUser || !currentUser.isAdultVerified) {
                  e.preventDefault();
                  onRequireAuthFor18Plus();
                }
              }}
              className={`flex items-center justify-between cursor-pointer py-2 px-3 border rounded-lg transition-all ${
                filters.isAdult 
                  ? "bg-red-950/40 border-red-500 text-white font-bold" 
                  : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox"
                  checked={filters.isAdult}
                  onChange={(e) => handleToggleAdultFilter(e.target.checked)}
                  className="accent-red-600 rounded cursor-pointer"
                />
                <span className="font-semibold text-xs">Контент 18+</span>
              </div>
              {(!currentUser || !currentUser.isAdultVerified) && (
                <Lock className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </label>
          </div>
        </div>

        {/* Category Tabs for Manga section */}
        {filters.type === "MANGA" && (
          <div className="mt-4 pt-4 border-t border-zinc-800/80">
            <span className="text-xs font-semibold text-zinc-400 block mb-2">Формат и страна происхождения:</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCountryFilter("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
                  countryFilter === "ALL" 
                    ? "bg-red-600 text-white shadow-md shadow-red-950/40" 
                    : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800 hover:bg-zinc-800"
                }`}
              >
                📚 Все типы (Манга, Манхва, Маньхуа)
              </button>
              <button
                type="button"
                onClick={() => setCountryFilter("JP")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
                  countryFilter === "JP" 
                    ? "bg-red-600 text-white shadow-md shadow-red-950/40" 
                    : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800 hover:bg-zinc-800"
                }`}
              >
                🇯🇵 Манга (Япония)
              </button>
              <button
                type="button"
                onClick={() => setCountryFilter("KR")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
                  countryFilter === "KR" 
                    ? "bg-red-600 text-white shadow-md shadow-red-950/40" 
                    : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800 hover:bg-zinc-800"
                }`}
              >
                🇰🇷 Манхва (Корея)
              </button>
              <button
                type="button"
                onClick={() => setCountryFilter("CN,TW")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
                  countryFilter === "CN,TW" 
                    ? "bg-red-600 text-white shadow-md shadow-red-950/40" 
                    : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800 hover:bg-zinc-800"
                }`}
              >
                🇨🇳 Маньхуа (Китай)
              </button>
            </div>
          </div>
        )}

        {/* Quick Sorting Pills */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80">
          <span className="text-xs font-semibold text-zinc-400 block mb-2">Быстрый порядок сортировки:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'POPULARITY_DESC', label: '🔥 По популярности' },
              { id: 'SCORE_DESC', label: '⭐ По рейтингу' },
              { id: 'START_DATE_DESC', label: '🆕 Новинки' },
              { id: 'TITLE_ROMAJI', label: '🔤 По алфавиту (A-Z)' },
              { id: 'TRENDING_DESC', label: '📈 В тренде' },
              { id: 'FAVOURITES_DESC', label: '❤️ В избранном' },
              { id: 'CHAPTERS_DESC', label: '📖 Больше глав' },
              { id: 'UPDATED_AT_DESC', label: '🔄 Обновлено' },
            ].map((sortOption) => {
              const isActive = filters.sort === sortOption.id;
              return (
                <button
                  key={sortOption.id}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, sort: sortOption.id as any }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-950 font-black shadow-md border border-white'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  {sortOption.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Genre Chips */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80">
          <span className="text-xs font-semibold text-zinc-400 block mb-2">Быстрый выбор жанра:</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(GENRE_MAP_RU).map(([key, labelRu]) => {
              const isSelected = filters.genres.includes(key);
              return (
                <button 
                  key={key}
                  onClick={() => toggleGenre(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    isSelected 
                      ? "bg-red-600 text-white font-bold shadow-md" 
                      : "bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
                  }`}
                >
                  {labelRu}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Count & Layout Controls */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs text-zinc-400 font-medium">
          Найдено наименований: <strong className="text-white">{items.length}</strong>
        </span>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setLayoutMode("grid")}
            className={`p-2 rounded-lg border ${layoutMode === "grid" ? "bg-red-600 border-red-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400"}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setLayoutMode("list")}
            className={`p-2 rounded-lg border ${layoutMode === "list" ? "bg-red-600 border-red-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400"}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Items Display Grid / List */}
      {items.length === 0 && !loading ? (
        <div className="p-12 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800 my-8">
          <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">Ничего не найдено</h3>
          <p className="text-xs text-zinc-400 mt-1">Попробуйте изменить параметры поиска или сбросить фильтры.</p>
        </div>
      ) : layoutMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((media) => (
            <MediaCard key={media.id} media={media} onClick={onSelectMedia} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col space-y-3">
          {items.map((media) => (
            <div 
              key={media.id}
              onClick={() => onSelectMedia(media)}
              className="flex items-center p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-red-500/50 transition-all cursor-pointer group"
            >
              <img 
                src={media.coverImage?.medium} 
                alt={media.title.romaji} 
                className="w-14 h-20 object-cover rounded-lg flex-shrink-0 bg-zinc-950"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80";
                }}
              />
              <div className="ml-4 flex-1 min-w-0">
                <h4 className="font-bold text-sm text-white group-hover:text-red-400 transition-colors">
                  {media.title.russian || media.title.romaji}
                </h4>
                <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                  {media.description?.replace(/<[^>]*>?/gm, '')}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-2">
                  <span>{FORMAT_MAP_RU[media.format] || media.format}</span>
                  <span>•</span>
                  <span>Оценка: {media.averageScore ? (media.averageScore / 10).toFixed(1) : "—"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Load More */}
      {hasNextPage && (
        <div className="mt-10 text-center">
          <button 
            onClick={() => {
              fetchCatalog(page + 1, false);
            }}
            disabled={loading}
            className="px-8 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs border border-zinc-700 transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Загрузить еще
          </button>
        </div>
      )}
    </div>
  );
};
