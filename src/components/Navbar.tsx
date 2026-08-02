import React, { useState, useEffect, useRef } from "react";
import { 
  Tv, Search, Calendar, Film, Building2, Newspaper, Bookmark, 
  Menu, X, Star, ChevronRight, BookOpen, Bot, User, Flame, TrendingUp, LogOut
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
  onLogoutClick?: () => void;
  isMobileSearchOpen?: boolean;
  setIsMobileSearchOpen?: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSelectMedia,
  onOpenAiAssistant,
  currentUser,
  onOpenAuth,
  onLogoutClick,
  isMobileSearchOpen,
  setIsMobileSearchOpen,
}) => {
  console.log("NAVBAR TRACE render");
  console.log("NAVBAR TRACE received currentUser:", currentUser ? currentUser.username : "null");
  console.log("TRACE: Navbar rendering -> currentUser state:", currentUser ? { username: currentUser.username, isAdultVerified: currentUser.isAdultVerified } : "Guest / Not logged in");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [localMobileSearch, setLocalMobileSearch] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const isSearchOpen = isMobileSearchOpen !== undefined ? isMobileSearchOpen : localMobileSearch;
  const toggleSearchOpen = (val: boolean) => {
    if (setIsMobileSearchOpen) {
      setIsMobileSearchOpen(val);
    } else {
      setLocalMobileSearch(val);
    }
    if (val) {
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    }
  };

  // Instant debounced search query against backend API
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

  // Click outside listener for desktop search dropdown
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

  const quickTrends = ["Атака титанов", "Магическая битва", "Блич", "Ван-Пис", "Человек-бензопила", "Дандадан"];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-zinc-950/95 backdrop-blur-2xl border-b border-zinc-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-[60px] flex items-center justify-between gap-1.5 sm:gap-4">
          
          {/* Logo */}
          <button 
            onClick={() => setActiveTab("home")}
            aria-label="На главную AnimiX"
            className="flex items-center space-x-1.5 cursor-pointer shrink-0 min-h-[44px] px-0.5 sm:px-1 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-red-600 via-red-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-red-950/60 transform group-hover:scale-105 transition-transform shrink-0">
              <Tv className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-black text-sm sm:text-lg tracking-tight text-white flex items-center gap-0.5 leading-none">
                Animi<span className="text-red-500">X</span>
              </span>
              <span className="text-[7px] sm:text-[8px] font-bold tracking-widest text-zinc-400 uppercase mt-0.5">
                Портал RU
              </span>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav aria-label="Основное меню" className="hidden lg:flex items-center space-x-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                    isSelected 
                      ? "bg-red-600 text-white shadow-md shadow-red-950/50" 
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/90"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Header Controls & Search */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0 justify-end">
            
            {/* Desktop / Laptop Expandable Instant Search Bar */}
            <div ref={searchContainerRef} className="relative hidden md:block w-full max-w-[220px] lg:max-w-[280px]">
              <div className="relative flex items-center">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none z-10" />
                <input 
                  ref={searchInputRef}
                  type="text"
                  placeholder="Быстрый поиск (RU, EN)..."
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
                  className="w-full bg-zinc-900/90 text-xs text-white pl-8 pr-8 py-1.5 rounded-xl border border-zinc-800/90 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 transition-all placeholder:text-zinc-500 font-medium caret-red-500 shadow-inner"
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer z-10"
                    title="Очистить поиск"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Desktop Search Dropdown */}
              {showSearchResults && searchQuery.trim().length > 0 && (
                <div className="absolute top-full right-0 mt-2 bg-zinc-950/98 border border-zinc-800/90 rounded-2xl shadow-2xl max-h-[440px] overflow-y-auto z-[100] p-2 space-y-1 backdrop-blur-2xl w-full min-w-[340px] sm:min-w-[420px]">
                  {searchLoading ? (
                    <div className="p-6 text-center text-xs text-zinc-400 flex items-center justify-center gap-2 font-medium">
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      <span>Поиск по базе...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-400 space-y-1">
                      <p className="font-bold text-zinc-300 text-sm">Ничего не найдено</p>
                      <p className="text-[11px] text-zinc-500">Попробуйте ввести другое название</p>
                    </div>
                  ) : (
                    searchResults.map((media) => (
                      <div 
                        key={media.id}
                        onClick={() => {
                          onSelectMedia(media);
                          setShowSearchResults(false);
                        }}
                        className="flex items-center p-2 rounded-xl hover:bg-zinc-900/90 cursor-pointer transition-all group border border-transparent hover:border-zinc-800 gap-3"
                      >
                        <img 
                          src={media.coverImage?.medium || media.coverImage?.large} 
                          alt={getPrimaryTitle(media.title)}
                          className="w-10 h-14 object-cover rounded-lg flex-shrink-0 bg-zinc-900 border border-zinc-800"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&q=80";
                          }}
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
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
                          <h4 className="font-bold text-xs text-white group-hover:text-red-400 transition-colors truncate">
                            {getPrimaryTitle(media.title)}
                          </h4>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Mobile / Tablet Search Icon Button */}
            <button
              onClick={() => toggleSearchOpen(true)}
              aria-label="Открыть поиск"
              className="md:hidden min-h-[44px] min-w-[44px] p-2 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800/80 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* AI Assistant Button */}
            <button 
              onClick={onOpenAiAssistant}
              aria-label="AI Помощник"
              className="min-h-[44px] min-w-[44px] p-2 sm:px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
              title="AnimiX AI Консультант"
            >
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-pulse" />
              <span className="hidden xl:inline">AI Помощник</span>
            </button>

            {/* User Profile / Login Button */}
            {currentUser ? (
              <button
                onClick={() => setActiveTab("profile")}
                aria-label="Личный профиль"
                className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border cursor-pointer active:scale-95 ${
                  activeTab === "profile"
                    ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-950/50"
                    : currentUser.isAdultVerified
                    ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60"
                    : "bg-amber-950/40 border-amber-800/80 text-amber-300 hover:bg-amber-900/60"
                }`}
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center font-black text-xs text-white shrink-0 border border-white/10">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-full h-full object-cover" />
                  ) : (
                    currentUser.username[0].toUpperCase()
                  )}
                </div>
                <span className="hidden sm:inline max-w-[90px] truncate">{currentUser.username}</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                aria-label="Войти в аккаунт"
                className="min-h-[44px] px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border bg-red-600 hover:bg-red-500 border-red-500 text-white shadow-md shadow-red-950/50 cursor-pointer active:scale-95"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Войти</span>
              </button>
            )}

            {/* Mobile / Tablet Drawer Toggle */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Открыть меню"
              className="lg:hidden min-h-[44px] min-w-[44px] p-2 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-zinc-950/98 border-b border-zinc-800/90 p-4 space-y-1.5 animate-in slide-in-from-top duration-200 shadow-2xl backdrop-blur-2xl">
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
                  className={`w-full min-h-[48px] px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                    isSelected 
                      ? "bg-red-600 text-white shadow-md shadow-red-950/50" 
                      : "text-zinc-300 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="w-5 h-5 text-red-500" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}

            {currentUser ? (
              onLogoutClick && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogoutClick();
                  }}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 mt-3"
                >
                  <LogOut className="w-5 h-5 text-red-400" />
                  <span className="text-sm">Выйти из аккаунта</span>
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/50 mt-3"
              >
                <User className="w-5 h-5 text-white" />
                <span className="text-sm">Войти / Регистрация</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* FULLSCREEN MOBILE SEARCH OVERLAY */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/98 backdrop-blur-2xl flex flex-col p-4 animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
              <input
                ref={mobileInputRef}
                type="text"
                placeholder="Поиск аниме, манги, персон..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 text-white pl-11 pr-10 py-3.5 rounded-2xl border border-zinc-800 focus:outline-none focus:border-red-500 text-base font-medium shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <button
              onClick={() => toggleSearchOpen(false)}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-sm font-bold text-zinc-300 hover:text-white"
            >
              Закрыть
            </button>
          </div>

          {/* Quick Trends Chips */}
          {!searchQuery.trim() && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <Flame className="w-4 h-4 text-red-500" />
                <span>Популярные запросы</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickTrends.map((query) => (
                  <button
                    key={query}
                    onClick={() => setSearchQuery(query)}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-all active:scale-95"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results Container */}
          <div className="flex-1 overflow-y-auto space-y-2 mt-2">
            {searchLoading ? (
              <div className="p-12 text-center text-sm text-zinc-400 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <span>Выполняется поиск по каталогу...</span>
              </div>
            ) : searchQuery.trim() && searchResults.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 space-y-2">
                <p className="font-bold text-white text-base">По вашему запросу ничего не найдено</p>
                <p className="text-xs text-zinc-500">Попробуйте ввести название на английском или японском языке</p>
              </div>
            ) : (
              searchResults.map((media) => (
                <div
                  key={media.id}
                  onClick={() => {
                    onSelectMedia(media);
                    toggleSearchOpen(false);
                  }}
                  className="flex items-center p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 gap-3 cursor-pointer active:scale-98 transition-all"
                >
                  <img
                    src={media.coverImage?.medium || media.coverImage?.large}
                    alt={getPrimaryTitle(media.title)}
                    className="w-12 h-16 object-cover rounded-xl bg-zinc-900 flex-shrink-0"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-red-400 uppercase bg-red-950/50 px-2 py-0.5 rounded border border-red-800/40">
                        {getRussianFormat(media.format)}
                      </span>
                      {media.averageScore && (
                        <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                          ★ {(media.averageScore / 10).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-white truncate">
                      {getPrimaryTitle(media.title)}
                    </h4>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};
