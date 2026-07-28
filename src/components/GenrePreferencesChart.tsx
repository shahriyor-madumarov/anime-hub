import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart as PieChartIcon, Award, Layers, Sparkles, Filter } from "lucide-react";
import { UserListItem } from "../types";

interface GenrePreferencesChartProps {
  userListItems: UserListItem[];
}

const GENRE_RU_MAP: Record<string, string> = {
  Action: "Экшен",
  Adventure: "Приключения",
  Comedy: "Комедия",
  Drama: "Драма",
  Ecchi: "Этти",
  Fantasy: "Фэнтези",
  Horror: "Ужасы",
  "Mahou Shoujo": "Махо-сёдзё",
  Mecha: "Меха",
  Music: "Музыка",
  Mystery: "Детектив",
  Psychological: "Психология",
  Romance: "Романтика",
  "Sci-Fi": "Научная фантастика",
  "Slice of Life": "Повседневность",
  Sports: "Спорт",
  Supernatural: "Сверхъестественное",
  Thriller: "Триллер",
};

const CHART_COLORS = [
  "#ef4444", // Red
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f97316", // Orange
  "#6366f1", // Indigo
];

// Fallback sample data if the user's watchlist has no genre data yet
const DEFAULT_SAMPLE_GENRES = [
  { genre: "Action", name: "Экшен", count: 14 },
  { genre: "Fantasy", name: "Фэнтези", count: 11 },
  { genre: "Comedy", name: "Комедия", count: 8 },
  { genre: "Romance", name: "Романтика", count: 6 },
  { genre: "Sci-Fi", name: "Научная фантастика", count: 5 },
  { genre: "Drama", name: "Драма", count: 4 },
];

export const GenrePreferencesChart: React.FC<GenrePreferencesChartProps> = ({ userListItems }) => {
  const [filterType, setFilterType] = useState<"ALL" | "ANIME" | "MANGA">("ALL");

  // Calculate genre breakdown from user list
  const filteredItems = userListItems.filter((item) => {
    if (!item.media) return false;
    if (filterType === "ANIME") return item.media.type !== "MANGA";
    if (filterType === "MANGA") return item.media.type === "MANGA";
    return true;
  });

  const genreCounts: Record<string, number> = {};
  let totalGenreHits = 0;

  filteredItems.forEach((item) => {
    if (item.media?.genres && Array.isArray(item.media.genres)) {
      item.media.genres.forEach((g) => {
        if (g) {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
          totalGenreHits += 1;
        }
      });
    }
  });

  const hasUserData = Object.keys(genreCounts).length > 0;

  // Process data for Recharts
  let chartData: { genre: string; name: string; count: number; percentage: number; color: string }[] = [];

  if (hasUserData) {
    const sorted = Object.entries(genreCounts)
      .map(([genre, count]) => ({
        genre,
        name: GENRE_RU_MAP[genre] || genre,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Keep top 7 genres, aggregate remainder into "Другие"
    if (sorted.length > 7) {
      const top = sorted.slice(0, 6);
      const rest = sorted.slice(6);
      const restCount = rest.reduce((acc, curr) => acc + curr.count, 0);
      top.push({
        genre: "Others",
        name: "Другие жанры",
        count: restCount,
      });
      chartData = top.map((item, index) => ({
        ...item,
        percentage: Math.round((item.count / totalGenreHits) * 100),
        color: CHART_COLORS[index % CHART_COLORS.length],
      }));
    } else {
      chartData = sorted.map((item, index) => ({
        ...item,
        percentage: Math.round((item.count / totalGenreHits) * 100),
        color: CHART_COLORS[index % CHART_COLORS.length],
      }));
    }
  } else {
    // Use fallback sample chart data
    const sampleTotal = DEFAULT_SAMPLE_GENRES.reduce((sum, g) => sum + g.count, 0);
    chartData = DEFAULT_SAMPLE_GENRES.map((g, index) => ({
      ...g,
      percentage: Math.round((g.count / sampleTotal) * 100),
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }

  const topGenre = chartData[0];
  const uniqueGenresCount = hasUserData ? Object.keys(genreCounts).length : DEFAULT_SAMPLE_GENRES.length;

  return (
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 shrink-0">
            <PieChartIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Предпочтения по жанрам</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Аналитика просмотренных аниме и манги на основе вашей коллекции
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center bg-zinc-950 border border-zinc-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "ALL"
                ? "bg-red-600 text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setFilterType("ANIME")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "ANIME"
                ? "bg-red-600 text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Аниме
          </button>
          <button
            onClick={() => setFilterType("MANGA")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === "MANGA"
                ? "bg-amber-600 text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Манга
          </button>
        </div>
      </div>

      {!hasUserData && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 px-4 flex items-center gap-3 text-amber-300 text-xs">
          <Filter className="w-4 h-4 shrink-0" />
          <span>
            Показана примерная статистика. Добавляйте аниме и мангу в свой список, чтобы графика автоматически строилась на основе ваших реальных предпочтений!
          </span>
        </div>
      )}

      {/* Main Grid: Recharts Pie Chart + Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Recharts Pie Chart (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[260px]">
          <div className="w-full h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-zinc-950/95 border border-zinc-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md space-y-1">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3 h-3 rounded-full inline-block" 
                              style={{ backgroundColor: data.color }}
                            />
                            <span className="text-xs font-bold text-white">{data.name}</span>
                          </div>
                          <div className="text-[11px] text-zinc-300 font-mono">
                            <span>Количество: </span>
                            <strong className="text-white font-bold">{data.count} тайтлов</strong>
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono">
                            <span>Доля: </span>
                            <strong className="text-emerald-400 font-bold">{data.percentage}%</strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Inner Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-white tracking-tight">
                {hasUserData ? filteredItems.length : "100%"}
              </span>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                {hasUserData ? "Тайтлов" : "Образец"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Legend with Progress Bars & Summary Badges (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Summary Badges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-2xl flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase block">Любимый жанр</span>
                <span className="text-sm font-black text-white truncate max-w-[130px] block">
                  {topGenre ? topGenre.name : "—"}
                </span>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-2xl flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase block">Разнообразие</span>
                <span className="text-sm font-black text-white">{uniqueGenresCount} жанров</span>
              </div>
            </div>
          </div>

          {/* Interactive Legend List with Progress Bars */}
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {chartData.map((item) => (
              <div 
                key={item.genre}
                className="bg-zinc-950/60 hover:bg-zinc-950 border border-zinc-800/60 hover:border-zinc-700/80 p-2.5 px-3 rounded-xl transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-white">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-zinc-400">{item.count} шт.</span>
                    <span className="text-emerald-400 font-bold">{item.percentage}%</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(item.percentage, 100)}%`, 
                      backgroundColor: item.color 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
