import React, { useState, useEffect, useRef } from "react";
import { 
  Tv, Search, Calendar, Film, Building2, Newspaper, Bookmark, 
  Sparkles, Menu, X, Star, ChevronRight, BookOpen, Bot, User, ShieldCheck, ShieldAlert, Lock
} from "lucide-react";
import { MediaItem, UserProfile } from "../types";
import { getPrimaryTitle, getRussianFormat } from "../utils/helpers";
import { apiFetch } from "../utils/auth";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSelectMedia: (media: MediaItem) => void;
  onOpenAiAssistant: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSelectMedia,
  onOpenAiAssistant,
  currentUser,
  onOpenAuth
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Instant debounced search query against backend API with Auth header
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setShowSearchResults(false);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setShowSearchResults(true);

    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        const data = await res.json();
        setSearchResults(Array.isArray(data.results) ? data.results : []);
      } catch (e) {
        console.error("Search fetch error", e);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);


  // Click outside listener for search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { id: "home", label: "Главная", icon: Tv },
    { id: "calendar", label: "Календарь", icon: Calendar },
    { id: "anime", label: "Аниме", icon: Film },
    { id: "manga", label: "Манга", icon: BookOpen },
    { id: "manhwa", label: "Манхва", icon: BookOpen },
    { id: "manhua", label: "Маньхуа", icon: BookOpen },
    { id: "studios", label: "Студии", icon: Building2 },
    { id: "news", label: "Новости", icon: Newspaper },
    { id: "userlist", label: "Мой список", icon: Bookmark },
    ...(currentUser ? [{ id: "profile", label: "Профиль", icon: User }] : [])
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div 
          onClick={() => setActiveTab("home")}
          className="flex items-center space-x-2 cursor-pointer flex-shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-red-950/50">
            <Tv className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tight text-white flex items-center gap-1">
              Animi<span className="text-red-500">X</span>
            </span>
            <span className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase -mt-1">
              Портал RU
            </span>
          </div>
        </div>

        {/* Desktop Nav Tabs */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected 
                    ? "bg-red-600 text-white shadow-md shadow-red-950/40" 
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Search Bar & AI Button */}
        <div className="flex items-center space-x-3 flex-1 max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl justify-end">
          {/* Instant Search Box */}
          <div ref={searchContainerRef} className="relative w-full">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none z-10" />
              <input 
                type="text"
                placeholder="Быстрый поиск (RU, EN, JP)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim()) {
                    setSearchLoading(true);
                    setShowSearchResults(true);
                  } else {
                    setSearchResults([]);
                    setShowSearchResults(false);
                    setSearchLoading(false);
                  }
                }}
                onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
                className="w-full bg-zinc-900 text-sm md:text-base text-white pl-11 pr-10 py-2.5 md:py-3 rounded-2xl border border-zinc-800 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 transition-all placeholder:text-zinc-500 font-medium selection:bg-red-600 selection:text-white caret-red-500 shadow-inner"
                style={{ color: "#ffffff", backgroundColor: "#18181b" }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setShowSearchResults(false);
                    setSearchLoading(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer z-10"
                  title="Очистить поиск"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Instant Typeahead Results Dropdown */}
            {showSearchResults && searchQuery.trim().length > 0 && (
              <div className="absolute top-full right-0 mt-2 bg-zinc-950/98 border border-zinc-800/90 rounded-2xl shadow-2xl max-h-[420px] overflow-y-auto overflow-x-hidden z-[100] p-2 space-y-1.5 animate-in fade-in backdrop-blur-xl w-full min-w-[320px] sm:min-w-[400px] md:min-w-[480px] max-w-[calc(100vw-24px)]">
                {searchLoading ? (
                  <div className="p-6 text-center text-xs text-zinc-400 flex items-center justify-center gap-2.5 font-medium">
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    <span>Поиск по каталогу...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-400 space-y-1">
                    <p className="font-bold text-zinc-300 text-sm">Ничего не найдено</p>
                    <p className="text-[11px] text-zinc-500">Попробуйте ввести другое название на русском, английском или японском</p>
                  </div>
                ) : (
                  searchResults.map((media) => (
                    <div 
                      key={media.id}
                      onClick={() => {
                        onSelectMedia(media);
                        setShowSearchResults(false);
                      }}
                      className="flex items-center p-2.5 rounded-xl hover:bg-zinc-900/90 cursor-pointer transition-all group border border-transparent hover:border-zinc-800/80 gap-3"
                    >
                      <img 
                        src={media.coverImage?.medium || media.coverImage?.large} 
                        alt={media.title?.romaji || media.title?.english || ""}
                        className="w-11 h-15 object-cover rounded-lg flex-shrink-0 bg-zinc-900 border border-zinc-800 shadow-sm"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&q=80";
                        }}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider bg-red-950/40 px-1.5 py-0.5 rounded border border-red-800/40">
                            {getRussianFormat(media.format)}
                          </span>
                          {media.averageScore ? (
                            <span className="text-[10px] font-black text-amber-400 flex items-center gap-0.5 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-800/30">
                              ★ {(media.averageScore / 10).toFixed(1)}
                            </span>
                          ) : null}
                        </div>
                        <h4 className="font-bold text-xs text-white group-hover:text-red-400 transition-colors truncate leading-snug">
                          {getPrimaryTitle(media.title)}
                        </h4>
                        <div className="text-[10px] text-zinc-400 truncate">
                          {media.title?.english || media.title?.romaji || ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* AI Assistant Trigger Button */}
          <button 
            onClick={onOpenAiAssistant}
            className="p-2 md:px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5 flex-shrink-0"
            title="AnimiX AI Консультант"
          >
            <Bot className="w-4 h-4 text-amber-400" />
            <span className="hidden xl:inline">AI Помощник</span>
          </button>

          {/* User Profile / Auth Button */}
          {currentUser ? (
            <button
              onClick={() => setActiveTab("profile")}
              className={`p-1.5 md:px-3 md:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 border cursor-pointer ${
                activeTab === "profile"
                  ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-950/50"
                  : currentUser.isAdultVerified
                  ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60"
                  : "bg-amber-950/40 border-amber-800/80 text-amber-300 hover:bg-amber-900/60"
              }`}
            >
              <div className="w-6 h-6 rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center font-black text-[10px] text-white shrink-0 border border-white/10">
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-full h-full object-cover" />
                ) : (
                  currentUser.username[0].toUpperCase()
                )}
              </div>
              <span className="hidden md:inline max-w-[100px] truncate">{currentUser.username}</span>
              {currentUser.isAdultVerified ? (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                  18+
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-black">
                  &lt;18
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="p-2 md:px-3 md:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 border bg-red-600 hover:bg-red-500 border-red-500 text-white shadow-md shadow-red-950/50 cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span className="hidden md:inline">Войти</span>
            </button>
          )}

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-zinc-950 border-b border-zinc-800 p-4 space-y-2 animate-in slide-in-from-top duration-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${
                  isSelected 
                    ? "bg-red-600 text-white" 
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
