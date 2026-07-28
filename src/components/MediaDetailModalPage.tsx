import React, { useState, useEffect } from "react";
import { 
  X, Star, Bookmark, Play, Clock, Sparkles, Layers, Tv, Volume2, 
  User, Film, ArrowRight, Share2, ZoomIn, Check, AlertCircle, Languages, MessageSquare,
  ShieldAlert, Eye, EyeOff, Lock, ShieldCheck, BookOpen, CheckCheck, Search, RotateCcw,
  CheckCircle2
} from "lucide-react";
import { MediaItem, UserReview } from "../types";
import { 
  formatTimeUntilAiring, getPrimaryTitle, getRussianFormat, getMediaCategoryLabel, getCountryOfOriginInfo, getRussianGenre, 
  getRussianStatus, getSubtitle, getUserList, saveUserListItem, removeUserListItem,
  addRecentlyViewed, getReadChaptersForMedia, toggleChapterRead, markUpToChapterRead,
  clearAllReadChaptersForMedia
} from "../utils/helpers";
import { apiFetch } from "../utils/auth";

interface MediaDetailModalPageProps {
  mediaId: number;
  onClose: () => void;
  onSelectMedia: (media: MediaItem) => void;
  onOpenLightbox: (imageUrl: string, title: string) => void;
  onOpenStudio?: (studioId: number) => void;
  onOpenAuth?: () => void;
}

export const MediaDetailModalPage: React.FC<MediaDetailModalPageProps> = ({
  mediaId,
  onClose,
  onSelectMedia,
  onOpenLightbox,
  onOpenStudio,
  onOpenAuth
}) => {
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [ageRestricted, setAgeRestricted] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"overview" | "chapters" | "timeline" | "characters" | "trailer" | "reviews">("overview");
  const [adultRevealed, setAdultRevealed] = useState<boolean>(false);

  // Read chapters state
  const [readChapters, setReadChaptersState] = useState<number[]>(() => getReadChaptersForMedia(mediaId));
  const [chapterFilter, setChapterFilter] = useState<"all" | "read" | "unread">("all");
  const [chapterSearch, setChapterSearch] = useState<string>("");
  const [selectedRange, setSelectedRange] = useState<number>(1);

  // AI Translation state
  const [russianSynopsis, setRussianSynopsis] = useState<string | null>(null);
  const [translating, setTranslating] = useState<boolean>(false);

  // User list state
  const userList = getUserList();
  const [userStatus, setUserStatus] = useState<string>(userList[mediaId]?.status || "");
  const [userScore, setUserScore] = useState<number>(userList[mediaId]?.score || 0);

  // User custom reviews
  const [reviews, setReviews] = useState<UserReview[]>([
    {
      id: "rev-1",
      mediaId,
      userName: "AlexAnimeFan",
      userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
      rating: 9,
      text: "Шедевр современной анимации! Потрясающий визуал, глубокая музыкальная составляющая и невероятно проработанные персонажи.",
      createdAt: "2 дня назад",
      likesCount: 14
    }
  ]);
  const [newReviewText, setNewReviewText] = useState("");

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/media/${mediaId}`);
      const data = await res.json();
      
      if (!res.ok || data.error) {
        setMedia(null);
        return;
      }

      setMedia(data);
      addRecentlyViewed(data);
      if (data.description) {
        setRussianSynopsis(null);
      }
    } catch (e) {
      console.error("Failed to fetch media details", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    setReadChaptersState(getReadChaptersForMedia(mediaId));
    const list = getUserList();
    setUserStatus(list[mediaId]?.status || "");
  }, [mediaId]);

  useEffect(() => {
    const handleReadUpdate = () => {
      setReadChaptersState(getReadChaptersForMedia(mediaId));
      const list = getUserList();
      if (list[mediaId]) {
        setUserStatus(list[mediaId].status);
      }
    };
    const handleListUpdate = () => {
      const list = getUserList();
      setUserStatus(list[mediaId]?.status || "");
    };

    window.addEventListener("animix_read_chapters_updated", handleReadUpdate);
    window.addEventListener("animix_watchlist_updated", handleListUpdate);
    return () => {
      window.removeEventListener("animix_read_chapters_updated", handleReadUpdate);
      window.removeEventListener("animix_watchlist_updated", handleListUpdate);
    };
  }, [mediaId]);

  const handleTranslateSynopsis = async () => {
    if (!media?.description || translating) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: media.description, title: getPrimaryTitle(media.title) })
      });
      const data = await res.json();
      if (data.translation) {
        setRussianSynopsis(data.translation);
      }
    } catch (e) {
      console.error("Failed to translate synopsis", e);
    } finally {
      setTranslating(false);
    }
  };

  const handleSaveUserList = (status: string) => {
    if (!media) return;
    if (status === "REMOVE") {
      removeUserListItem(media.id);
      setUserStatus("");
    } else {
      saveUserListItem(media.id, {
        mediaId: media.id,
        media,
        status,
        score: userScore,
        progress: 0
      });
      setUserStatus(status);
    }
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;
    const rev: UserReview = {
      id: Date.now().toString(),
      mediaId,
      userName: "Вы (Пользователь)",
      userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80",
      rating: userScore || 10,
      text: newReviewText,
      createdAt: "Только что",
      likesCount: 0
    };
    setReviews([rev, ...reviews]);
    setNewReviewText("");
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400 font-medium">Загрузка информации о тайтле...</p>
        </div>
      </div>
    );
  }

  if (ageRestricted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in">
        <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-8 text-center text-white shadow-2xl overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-xl">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black text-white mb-2">
            18+ контент — требуется подтверждение возраста
          </h2>
          
          <p className="text-xs text-zinc-400 leading-relaxed mb-6 max-w-md mx-auto">
            Доступ к данному тайтлу ограничен. Просмотр разрешен только авторизованным пользователям, достигшим 18 лет согласно зарегистрированной дате рождения.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {onOpenAuth && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors shadow-lg shadow-red-950/50 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Войти / Зарегистрироваться
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-colors border border-zinc-800"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!media) return null;

  const primaryTitle = getPrimaryTitle(media.title);
  const subtitle = getSubtitle(media.title);
  const bannerArt = media.bannerImage || media.coverImage?.extraLarge;
  const coverArt = media.coverImage?.extraLarge || media.coverImage?.large;

  // Franchise relations timeline extraction (defensive handling for arrays or objects with edges)
  const relationsRaw = Array.isArray(media.relations)
    ? media.relations
    : (media.relations as any)?.edges || [];
  const relations = relationsRaw.map((rel: any) => rel.node || rel).filter((r: any) => r && r.id);

  // Studio extraction (defensive handling for arrays or objects with nodes)
  const studioList = Array.isArray(media.studios)
    ? media.studios
    : (media.studios as any)?.nodes || [];
  const primaryStudio = studioList[0];

  const isAdultContent = Boolean(media.isAdult || media.genres?.includes("Hentai"));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative min-h-screen max-w-6xl mx-auto my-0 md:my-6 bg-zinc-950 md:rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden pb-12">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="fixed md:absolute top-4 right-4 z-50 p-3 rounded-full bg-zinc-900/80 hover:bg-red-600 text-white transition-colors border border-zinc-700 shadow-xl"
          title="Закрыть"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Top Banner Header */}
        <div className="relative h-64 md:h-80 w-full overflow-hidden bg-zinc-900">
          {bannerArt && (
            <img 
              src={bannerArt} 
              alt={primaryTitle}
              className="w-full h-full object-cover object-center filter brightness-[0.5] transition-all duration-500"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        </div>

        {/* Header Main Grid */}
        <div className="relative px-6 md:px-10 z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-start -mt-32 md:-mt-40">
          {/* Poster Column */}
          <div className="md:col-span-4 flex flex-col items-center md:items-start">
            <div 
              onClick={() => coverArt && onOpenLightbox(coverArt, primaryTitle)}
              className="relative group cursor-pointer aspect-[2/3] w-52 md:w-64 rounded-2xl overflow-hidden border-4 border-zinc-900 shadow-2xl bg-zinc-900"
            >
              {coverArt ? (
                <img 
                  src={coverArt} 
                  alt={primaryTitle}
                  className="w-full h-full object-cover transition-all duration-500"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  <Tv className="w-12 h-12" />
                </div>
              )}

              <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-full bg-zinc-950/80 text-white text-xs font-semibold border border-white/20">
                  <ZoomIn className="w-3.5 h-3.5 inline mr-1" /> Полноэкранный постер
                </span>
              </div>
            </div>

            {/* Watchlist Quick Selector */}
            <div className="w-full mt-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <label className="block text-xs font-bold text-zinc-300 mb-2 uppercase tracking-wider">
                Статус просмотра:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <button 
                  onClick={() => handleSaveUserList('WATCHING')}
                  className={`py-2 rounded-xl transition-all ${userStatus === 'WATCHING' ? 'bg-red-600 text-white' : 'bg-zinc-950 text-zinc-400 hover:text-white'}`}
                >
                  {media.type === 'MANGA' ? 'Читаю' : 'Смотрю'}
                </button>
                <button 
                  onClick={() => handleSaveUserList('PLANNING')}
                  className={`py-2 rounded-xl transition-all ${userStatus === 'PLANNING' ? 'bg-red-600 text-white' : 'bg-zinc-950 text-zinc-400 hover:text-white'}`}
                >
                  В планах
                </button>
                <button 
                  onClick={() => handleSaveUserList('COMPLETED')}
                  className={`py-2 rounded-xl transition-all ${userStatus === 'COMPLETED' ? 'bg-red-600 text-white' : 'bg-zinc-950 text-zinc-400 hover:text-white'}`}
                >
                  Просмотрено
                </button>
                <button 
                  onClick={() => handleSaveUserList('DROPPED')}
                  className={`py-2 rounded-xl transition-all ${userStatus === 'DROPPED' ? 'bg-red-600 text-white' : 'bg-zinc-950 text-zinc-400 hover:text-white'}`}
                >
                  Брошено
                </button>
              </div>
            </div>
          </div>

          {/* Details Column */}
          <div className="md:col-span-8 space-y-4">
            {/* Title & Native */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-600/90 text-white uppercase">
                  {getMediaCategoryLabel(media)}
                </span>
                {isAdultContent && (
                  <span className="px-2.5 py-1 rounded-md text-xs font-black bg-red-600 text-white shadow">
                    18+
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-800 text-zinc-300">
                  {getRussianStatus(media.status)}
                </span>
                {media.averageScore && (
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500 text-zinc-950 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {(media.averageScore / 10).toFixed(1)} / 10
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                {primaryTitle}
              </h1>
              {subtitle && (
                <p className="text-sm text-zinc-400 font-medium mt-1">
                  {subtitle} {media.title.native ? `• ${media.title.native}` : ''}
                </p>
              )}
            </div>

            {/* Next Airing Countdown Banner */}
            {media.nextAiringEpisode && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/80 to-zinc-900 border border-red-900/60 flex items-center justify-between text-xs">
                <span className="font-bold text-red-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 animate-pulse text-red-500" />
                  Выход {media.nextAiringEpisode.episode} серии:
                </span>
                <span className="font-bold text-white bg-red-600/30 px-3 py-1 rounded-lg border border-red-500/30">
                  через {formatTimeUntilAiring(media.nextAiringEpisode.timeUntilAiring)}
                </span>
              </div>
            )}

            {/* Metadata Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80">
              <div>
                <span className="text-zinc-500 block font-medium">Серий / Глав</span>
                <span className="text-white font-bold">
                  {media.type === 'MANGA' 
                    ? (media.chapters ? `${media.chapters} гл.` : (media.status === 'RELEASING' ? 'Онгоинг' : '—'))
                    : (media.episodes ? `${media.episodes} сер.` : (media.nextAiringEpisode ? `Онгоинг (Эп. ${media.nextAiringEpisode.episode} след.)` : (media.status === 'RELEASING' ? 'Онгоинг' : '—')))}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block font-medium">Студия / Издатель</span>
                <span 
                  onClick={() => primaryStudio?.id && onOpenStudio?.(primaryStudio.id)}
                  className="text-red-400 font-bold hover:underline cursor-pointer"
                >
                  {primaryStudio?.name || "—"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block font-medium">Сезон / Год</span>
                <span className="text-white font-bold">
                  {media.seasonYear ? `${media.seasonYear} г.` : "—"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block font-medium">Длительность</span>
                <span className="text-white font-bold">
                  {media.duration ? `${media.duration} мин.` : "—"}
                </span>
              </div>
            </div>

            {/* Country & Reading Format Banner for Manga/Manhwa/Manhua */}
            {media.type === 'MANGA' && (() => {
              const countryInfo = getCountryOfOriginInfo(media.countryOfOrigin);
              return (
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{countryInfo.flag}</span>
                    <div>
                      <span className="text-zinc-400 block text-[11px] font-medium">Страна и категория</span>
                      <strong className="text-white font-bold">{countryInfo.nameRu} • {countryInfo.labelRu}</strong>
                    </div>
                  </div>

                  <div className="bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 flex items-center gap-2">
                    <span className="text-zinc-400 text-[11px]">Формат чтения:</span>
                    <span className="text-red-400 font-black">{countryInfo.readingDirection}</span>
                  </div>
                </div>
              );
            })()}

            {/* Genres & Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {media.genres?.map((g) => (
                <span key={g} className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-700/60">
                  {getRussianGenre(g)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 md:px-10 mt-10 border-b border-zinc-800 flex items-center space-x-6 text-sm font-bold overflow-x-auto">
          <button 
            onClick={() => setActiveTab("overview")}
            className={`pb-3 transition-all ${activeTab === "overview" ? "text-red-500 border-b-2 border-red-500" : "text-zinc-400 hover:text-white"}`}
          >
            Обзор
          </button>
          <button 
            onClick={() => setActiveTab("chapters")}
            className={`pb-3 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === "chapters" ? "text-red-500 border-b-2 border-red-500" : "text-zinc-400 hover:text-white"}`}
          >
            <BookOpen className="w-4 h-4 text-red-500" /> 
            <span>{media.type === 'MANGA' ? 'Главы и Чтение' : 'Серии и Просмотр'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${readChapters.length > 0 ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>
              {readChapters.length > 0 
                ? (media.chapters ? `${readChapters.length}/${media.chapters}` : `${readChapters.length} проч.`)
                : (media.chapters ? `${media.chapters} гл.` : "Список")}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab("timeline")}
            className={`pb-3 transition-all flex items-center gap-1.5 ${activeTab === "timeline" ? "text-red-500 border-b-2 border-red-500" : "text-zinc-400 hover:text-white"}`}
          >
            <Layers className="w-4 h-4" /> Франшиза и Хронология ({relations.length})
          </button>
          <button 
            onClick={() => setActiveTab("characters")}
            className={`pb-3 transition-all flex items-center gap-1.5 ${activeTab === "characters" ? "text-red-500 border-b-2 border-red-500" : "text-zinc-400 hover:text-white"}`}
          >
            <User className="w-4 h-4" /> Персонажи и Сэйю ({media.characters?.length || 0})
          </button>
          {media.trailer?.id && (
            <button 
              onClick={() => setActiveTab("trailer")}
              className={`pb-3 transition-all flex items-center gap-1.5 ${activeTab === "trailer" ? "text-red-500 border-b-2 border-red-500" : "text-zinc-400 hover:text-white"}`}
            >
              <Film className="w-4 h-4" /> Трейлер
            </button>
          )}
          <button 
            onClick={() => setActiveTab("reviews")}
            className={`pb-3 transition-all flex items-center gap-1.5 ${activeTab === "reviews" ? "text-red-500 border-b-2 border-red-500" : "text-zinc-400 hover:text-white"}`}
          >
            <MessageSquare className="w-4 h-4" /> Отзывы ({reviews.length})
          </button>
        </div>

        {/* Tab Content Areas */}
        <div className="px-6 md:px-10 py-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Synopsis Box */}
              <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/80">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-red-500" /> Синопсис / Описание
                  </h3>
                  <button 
                    onClick={handleTranslateSynopsis}
                    disabled={translating}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-red-400 font-semibold border border-zinc-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    {translating ? "Переводим через Gemini AI..." : "Перевести на русский (Gemini AI)"}
                  </button>
                </div>

                <p className="text-sm md:text-base text-zinc-300 leading-relaxed whitespace-pre-line">
                  {russianSynopsis || media.russianDescription || media.description?.replace(/<[^>]*>?/gm, '') || "Описание отсутствует."}
                </p>
              </div>

              {/* Quick Reading Progress Banner Card */}
              <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-red-950/40 p-5 rounded-2xl border border-zinc-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-red-500" />
                    <h4 className="text-sm font-bold text-white">
                      {media.type === 'MANGA' ? 'Ваш прогресс чтения глав' : 'Ваш прогресс просмотра серий'}
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Прочитано: <strong className="text-white font-extrabold">{readChapters.length}</strong> {media.chapters ? `из ${media.chapters} глав` : 'глав'}
                  </p>
                  {media.chapters && media.chapters > 0 && (
                    <div className="w-48 sm:w-64 h-2 bg-zinc-800 rounded-full overflow-hidden mt-2">
                      <div 
                        className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.round((readChapters.length / media.chapters) * 100))}%` }}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab("chapters")}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-red-950/60 min-h-[44px]"
                >
                  <BookOpen className="w-4 h-4" />
                  Перейти к списку глав ({readChapters.length})
                </button>
              </div>

              {/* Recommendations Row */}
              {media.recommendations && media.recommendations.length > 0 && (
                <div>
                  <h3 className="text-base font-bold text-white mb-4">Похожие тайтлы и рекомендации</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {media.recommendations.slice(0, 6).map((rec, i) => {
                      const recMedia = rec.media;
                      if (!recMedia) return null;
                      return (
                        <div 
                          key={i}
                          onClick={() => onSelectMedia(recMedia)}
                          className="cursor-pointer group bg-zinc-900/60 p-2 rounded-xl border border-zinc-800 hover:border-red-500/50 transition-all"
                        >
                          <img 
                            src={recMedia.coverImage?.medium} 
                            alt={recMedia.title.romaji} 
                            className="w-full aspect-[2/3] object-cover rounded-lg mb-2"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80";
                            }}
                          />
                          <h4 className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-red-400">
                            {getPrimaryTitle(recMedia.title)}
                          </h4>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHAPTERS & READ TRACKING */}
          {activeTab === "chapters" && (() => {
            const isManga = media.type === 'MANGA';
            const totalCh = isManga ? media.chapters : media.episodes;
            const readCount = readChapters.length;
            const progressPercent = totalCh && totalCh > 0 
              ? Math.min(100, Math.round((readCount / totalCh) * 100)) 
              : 0;

            const maxChapterNum = totalCh && totalCh > 0 
              ? totalCh 
              : Math.max(30, (Math.max(0, ...readChapters) || 0) + 15);

            const allChapterNumbers = Array.from({ length: maxChapterNum }, (_, i) => i + 1);
            const totalRanges = Math.ceil(maxChapterNum / 50);

            const filteredChapters = allChapterNumbers.filter((chNum) => {
              if (totalRanges > 1) {
                const rangeStart = (selectedRange - 1) * 50 + 1;
                const rangeEnd = selectedRange * 50;
                if (chNum < rangeStart || chNum > rangeEnd) return false;
              }

              const isRead = readChapters.includes(chNum);
              if (chapterFilter === "read" && !isRead) return false;
              if (chapterFilter === "unread" && isRead) return false;

              if (chapterSearch.trim()) {
                const searchLow = chapterSearch.toLowerCase().trim();
                const term = isManga ? `глава ${chNum}` : `серия ${chNum}`;
                if (!term.includes(searchLow) && !`${chNum}`.includes(searchLow)) {
                  return false;
                }
              }

              return true;
            });

            return (
              <div className="space-y-6">
                {/* Header Progress Card */}
                <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <BookOpen className="w-48 h-48 text-red-500" />
                  </div>

                  <div className="relative z-10 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30">
                            Синхронизация с сервером
                          </span>
                          {userStatus && (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-300">
                              Статус: {userStatus === 'READING' || userStatus === 'WATCHING' ? (isManga ? 'Читаю' : 'Смотрю') : (userStatus === 'COMPLETED' ? 'Завершено' : userStatus)}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-red-500" />
                          Отметки о прочитанных {isManga ? 'главах' : 'сериях'}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Отмечайте пройденный материал. Статус автоматически сохраняется в вашем аккаунте.
                        </p>
                      </div>

                      <div className="text-left sm:text-right bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 flex-shrink-0">
                        <span className="text-[11px] text-zinc-400 block font-medium">Прогресс тайтла</span>
                        <div className="text-lg font-black text-white">
                          <span className="text-red-400">{readCount}</span>
                          <span className="text-zinc-500 font-normal text-sm"> / {totalCh || '—'} {isManga ? 'глав' : 'серий'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {totalCh && totalCh > 0 ? (
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between items-center text-xs font-bold text-zinc-400">
                          <span>Общий процент прочитанного</span>
                          <span className="text-red-400">{progressPercent}%</span>
                        </div>
                        <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                          <div 
                            className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 rounded-full transition-all duration-300 shadow-lg"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Bulk Action Controls */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {totalCh && totalCh > 0 && (
                        <button
                          onClick={() => markUpToChapterRead(media.id, totalCh, totalCh, media)}
                          className="px-4 py-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow min-h-[44px]"
                        >
                          <CheckCheck className="w-4 h-4" />
                          Отметить все ({totalCh}) как прочитанные
                        </button>
                      )}

                      {readCount > 0 && (
                        <button
                          onClick={() => clearAllReadChaptersForMedia(media.id)}
                          className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs transition-colors border border-zinc-800 flex items-center gap-2 min-h-[44px]"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Сбросить все отметки
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      value={chapterSearch}
                      onChange={(e) => setChapterSearch(e.target.value)}
                      placeholder={isManga ? "Поиск по номеру главы (например: 12)..." : "Поиск по номеру серии..."}
                      className="w-full bg-zinc-950 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-red-500 transition-colors min-h-[44px]"
                    />
                  </div>

                  {/* Read Filter Pills */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setChapterFilter("all")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap min-h-[44px] ${chapterFilter === "all" ? "bg-red-600 text-white" : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"}`}
                    >
                      Все ({allChapterNumbers.length})
                    </button>
                    <button
                      onClick={() => setChapterFilter("read")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap min-h-[44px] ${chapterFilter === "read" ? "bg-emerald-600 text-white" : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"}`}
                    >
                      Прочитанные ({readCount})
                    </button>
                    <button
                      onClick={() => setChapterFilter("unread")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap min-h-[44px] ${chapterFilter === "unread" ? "bg-zinc-800 text-white" : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"}`}
                    >
                      Непрочитанные ({Math.max(0, allChapterNumbers.length - readCount)})
                    </button>
                  </div>
                </div>

                {/* Range Selector Bar if more than 50 chapters */}
                {totalRanges > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    <span className="text-xs font-bold text-zinc-400 whitespace-nowrap">Диапазон:</span>
                    {Array.from({ length: totalRanges }, (_, i) => i + 1).map((rNum) => {
                      const rangeStart = (rNum - 1) * 50 + 1;
                      const rangeEnd = Math.min(rNum * 50, maxChapterNum);
                      const isSelected = selectedRange === rNum;
                      return (
                        <button
                          key={rNum}
                          onClick={() => setSelectedRange(rNum)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[44px] whitespace-nowrap ${
                            isSelected 
                              ? "bg-red-600 text-white shadow-md" 
                              : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                          }`}
                        >
                          {rangeStart}–{rangeEnd}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Chapters Grid / List */}
                {filteredChapters.length === 0 ? (
                  <div className="p-12 text-center bg-zinc-900/30 rounded-2xl border border-zinc-800 text-zinc-500">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-semibold text-zinc-400">Главы не найдены по выбранным фильтрам</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredChapters.map((chNum) => {
                      const isRead = readChapters.includes(chNum);

                      return (
                        <div 
                          key={chNum}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                            isRead 
                              ? "bg-emerald-950/20 border-emerald-500/40 shadow-sm" 
                              : "bg-zinc-900/70 border-zinc-800 hover:border-zinc-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-white flex items-center gap-1.5">
                              {isManga ? `Глава ${chNum}` : `Серия ${chNum}`}
                            </span>
                            {isRead && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Прочитано
                              </span>
                            )}
                          </div>

                          {/* Action Buttons Row */}
                          <div className="flex items-center space-x-2 pt-1">
                            {/* Toggle Read Main Button (Min 44px target) */}
                            <button
                              onClick={() => toggleChapterRead(media.id, chNum, totalCh, media)}
                              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
                                isRead 
                                  ? "bg-emerald-600 hover:bg-red-600 text-white shadow-md shadow-emerald-950/50" 
                                  : "bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80"
                              }`}
                              title={isRead ? "Нажмите, чтобы снять отметку" : "Нажмите, чтобы отметить как прочитанное"}
                            >
                              <Check className="w-4 h-4 flex-shrink-0" />
                              <span>{isRead ? "Прочитано" : "Отметить"}</span>
                            </button>

                            {/* Mark Up To Chapter Button (Min 44px target) */}
                            <button
                              onClick={() => markUpToChapterRead(media.id, chNum, totalCh, media)}
                              className="p-2.5 rounded-xl bg-zinc-950 hover:bg-amber-600/20 text-zinc-400 hover:text-amber-400 border border-zinc-800 hover:border-amber-500/40 transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
                              title={`Отметить все главы с 1 по ${chNum} как прочитанные`}
                            >
                              <CheckCheck className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 3: FRANCHISE & TIMELINE */}
          {activeTab === "timeline" && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white">Франшиза и хронологический порядок просмотра</h3>
                <p className="text-xs text-zinc-400 mt-1">Все сезоны, фильмы, OVA и спин-оффы, связанные с данным произведением</p>
              </div>

              {relations.length === 0 ? (
                <div className="p-8 text-center bg-zinc-900/30 rounded-2xl border border-zinc-800 text-zinc-500 text-xs">
                  У этого тайтла нет зарегистрированных ответвлений или других сезонов.
                </div>
              ) : (
                <div className="relative border-l-2 border-red-600/40 ml-4 pl-6 space-y-6">
                  {/* Current Season Node */}
                  <div className="relative group">
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-red-600 border-4 border-zinc-950" />
                    <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/40 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Текущий выбор</span>
                        <h4 className="font-bold text-sm text-white">{primaryTitle}</h4>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold">Вы здесь</span>
                    </div>
                  </div>

                  {/* Related Franchise Nodes */}
                  {relations.map((rel) => (
                    <div key={rel.id} className="relative group">
                      <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-zinc-700 group-hover:bg-red-500 border-4 border-zinc-950 transition-colors" />
                      <div 
                        onClick={() => onSelectMedia(rel as any)}
                        className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-red-500/50 transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <img 
                            src={rel.coverImage?.medium} 
                            alt={rel.title.romaji} 
                            className="w-12 h-16 object-cover rounded-lg bg-zinc-950"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&q=80";
                            }}
                          />
                          <div>
                            <span className="text-[10px] font-semibold text-zinc-400 uppercase">
                              {getRussianFormat(rel.format)} • {rel.seasonYear || ""}
                            </span>
                            <h4 className="font-bold text-sm text-white group-hover:text-red-400 transition-colors">
                              {getPrimaryTitle(rel.title)}
                            </h4>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-red-400 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHARACTERS & VOICE ACTORS */}
          {activeTab === "characters" && (
            <div>
              <h3 className="text-lg font-bold text-white mb-6">Персонажи и актеры озвучки (Сэйю)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {media.characters?.map((char) => (
                  <div key={char.id} className="flex items-center p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                    <img 
                      src={char.image?.large} 
                      alt={char.name.full} 
                      className="w-14 h-18 object-cover rounded-xl bg-zinc-950 flex-shrink-0"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80";
                      }}
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-white truncate">{char.name.full}</h4>
                      <p className="text-[10px] text-zinc-500 capitalize">{char.role || "Персонаж"}</p>
                      
                      {char.voiceActors?.[0] && (
                        <div className="mt-2 pt-1 border-t border-zinc-800/60 flex items-center gap-1.5">
                          <Volume2 className="w-3 h-3 text-red-500" />
                          <span className="text-[11px] text-zinc-300 font-medium truncate">
                            {char.voiceActors[0].name.full} (Сэйю)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: TRAILER */}
          {activeTab === "trailer" && media.trailer?.id && (
            <div className="max-w-4xl mx-auto">
              <h3 className="text-lg font-bold text-white mb-4">Официальный трейлер</h3>
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-zinc-800 bg-black shadow-2xl">
                <iframe 
                  src={`https://www.youtube.com/embed/${media.trailer.id}`}
                  title="Official Trailer"
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* TAB 5: REVIEWS */}
          {activeTab === "reviews" && (
            <div className="space-y-6">
              {/* Add Review Form */}
              <form onSubmit={handleAddReview} className="bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800">
                <h4 className="text-sm font-bold text-white mb-3">Оставить свой отзыв:</h4>
                <textarea 
                  value={newReviewText}
                  onChange={(e) => setNewReviewText(e.target.value)}
                  placeholder="Поделитесь своими впечатлениями о произведении..."
                  className="w-full bg-zinc-950 text-sm text-white p-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-red-500 min-h-[100px]"
                />
                <button 
                  type="submit"
                  className="mt-3 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors"
                >
                  Опубликовать отзыв
                </button>
              </form>

              {/* Reviews List */}
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <img src={rev.userAvatar} alt={rev.userName} className="w-8 h-8 rounded-full" />
                        <span className="font-bold text-xs text-white">{rev.userName}</span>
                      </div>
                      <span className="text-[11px] text-zinc-500">{rev.createdAt}</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{rev.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
