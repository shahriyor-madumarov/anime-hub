import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { BottomNav } from "./components/BottomNav";
import { Footer } from "./components/Footer";
import { HeroBanner } from "./components/HeroBanner";
import { AiringTodaySection } from "./components/AiringTodaySection";
import { MediaCard } from "./components/MediaCard";
import { MediaDetailModalPage } from "./components/MediaDetailModalPage";
import { LightboxModal } from "./components/LightboxModal";
import { ReleaseCalendarView } from "./components/ReleaseCalendarView";
import { CatalogView } from "./components/CatalogView";
import { StudioView } from "./components/StudioView";
import { NewsSection } from "./components/NewsSection";
import { UserListSection } from "./components/UserListSection";
import { RecentlyViewedSection } from "./components/RecentlyViewedSection";
import { ProfileView } from "./components/ProfileView";
import { AiAssistantModal } from "./components/AiAssistantModal";
import { AuthModal } from "./components/AuthModal";
import { LogoutConfirmModal } from "./components/LogoutConfirmModal";
import { Toast, ToastMessage } from "./components/Toast";
import { SideCharacterRails } from "./components/SideCharacterRails";
import { AiringSchedule, MediaItem, UserProfile } from "./types";
import { getStoredUser, apiFetch, saveAuthData, clearAuthData, getAuthToken } from "./utils/auth";
import { syncWatchlistWithServer, addRecentlyViewed, syncRecentlyViewedWithServer, syncReadChaptersWithServer } from "./utils/helpers";
import { Flame, Star, BookOpen, ChevronRight, RefreshCw } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("home");

  // User Authentication & State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredUser());

  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register" | "profile">("login");
  const [authModalMessage, setAuthModalMessage] = useState<string | undefined>(undefined);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);

  // Logout state & Toast
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const handleOpenLogoutConfirm = () => {
    setIsLogoutConfirmOpen(true);
  };

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    const token = getAuthToken();

    try {
      if (token) {
        await apiFetch("/api/auth/logout", {
          method: "POST"
        });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthData();
      setCurrentUser(null);
      setAuthModalOpen(false);
      setIsLogoutConfirmOpen(false);
      setIsLoggingOut(false);
      setActiveTab("home");
      showToast("Вы вышли из аккаунта.", "success");
    }
  };

  // Home data states
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [popularThisSeason, setPopularThisSeason] = useState<MediaItem[]>([]);
  const [popularManga, setPopularManga] = useState<MediaItem[]>([]);
  const [popularManhwa, setPopularManhwa] = useState<MediaItem[]>([]);
  const [topRated, setTopRated] = useState<MediaItem[]>([]);
  const [schedules, setSchedules] = useState<AiringSchedule[]>([]);
  const [homeLoading, setHomeLoading] = useState<boolean>(true);

  // Selected media detail state
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null);

  // Studio detail routing state
  const [selectedStudioId, setSelectedStudioId] = useState<number | undefined>(undefined);

  // Lightbox state
  const [lightboxData, setLightboxData] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: "",
    title: ""
  });

  // AI assistant modal state
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);

  const deduplicateMedia = (list: MediaItem[] = []) => {
    const seen = new Set<number>();
    return list.filter((item) => {
      if (!item || !item.id) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  // Fetch homepage & schedule data
  const loadHomeData = async () => {
    setHomeLoading(true);
    try {
      const [homeRes, scheduleRes] = await Promise.all([
        apiFetch("/api/home"),
        apiFetch("/api/airing-schedule")
      ]);

      const homeData = await homeRes.json();
      const scheduleData = await scheduleRes.json();

      setTrending(deduplicateMedia(homeData.trending || []));
      setPopularThisSeason(deduplicateMedia(homeData.popularThisSeason || []));
      setPopularManga(deduplicateMedia(homeData.popularManga || []));
      setPopularManhwa(deduplicateMedia(homeData.popularManhwa || []));
      setTopRated(deduplicateMedia(homeData.topRated || []));
      setSchedules(scheduleData.schedules || []);
    } catch (e) {
      console.error("Failed to load home page data", e);
    } finally {
      setHomeLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, [currentUser]);

  // Validate session with server on initial application startup
  useEffect(() => {
    const initAuthAndSync = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const res = await apiFetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            if (data && data.user) {
              saveAuthData(token, data.user);
              setCurrentUser(data.user);
              await Promise.all([
                syncWatchlistWithServer(), 
                syncRecentlyViewedWithServer(),
                syncReadChaptersWithServer()
              ]);
            }
          } else if (res.status === 401) {
            clearAuthData();
            setCurrentUser(null);
          }
        } catch (e) {
          console.error("Auth initialization failed:", e);
        }
      }
    };
    initAuthAndSync();
  }, []);

  const handleUserChanged = (user: UserProfile | null) => {
    setCurrentUser(user);
    if (user) {
      syncWatchlistWithServer();
      syncRecentlyViewedWithServer();
      syncReadChaptersWithServer();
    }
  };

  const handleSelectMedia = (media: MediaItem) => {
    if (media) {
      addRecentlyViewed(media);
    }
    setSelectedMediaId(media.id);
  };

  const handleOpenStudio = (studioId: number) => {
    setSelectedStudioId(studioId);
    setActiveTab("studios");
  };

  const handleRequireAuthFor18Plus = () => {
    setAuthModalMessage("Контент 18+ доступен только для подтвержденных пользователей старше 18 лет. Пожалуйста, войдите или зарегистрируйтесь с указанием даты рождения.");
    setAuthModalMode(currentUser ? "profile" : "register");
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-red-600 selection:text-white relative pb-20 lg:pb-0 overflow-x-hidden">
      {/* Static side-margin character background */}
      <SideCharacterRails />

      {/* Navigation Header */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onSelectMedia={handleSelectMedia}
        onOpenAiAssistant={() => setAiModalOpen(true)}
        currentUser={currentUser}
        onOpenAuth={() => {
          setAuthModalMessage(undefined);
          setAuthModalMode(currentUser ? "profile" : "login");
          setAuthModalOpen(true);
        }}
        onLogoutClick={handleOpenLogoutConfirm}
        isMobileSearchOpen={isMobileSearchOpen}
        setIsMobileSearchOpen={setIsMobileSearchOpen}
      />

      {/* Main Content Area */}
      <main className="flex-grow w-full overflow-x-hidden">
        {/* TAB 1: HOME */}
        {activeTab === "home" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
            {homeLoading ? (
              <div className="py-24 text-center flex flex-col items-center space-y-4">
                <RefreshCw className="w-10 h-10 text-red-500 animate-spin" />
                <p className="text-xs sm:text-sm font-semibold text-zinc-400">
                  Загрузка каталогов и расписания аниме...
                </p>
              </div>
            ) : (
              <>
                {/* Hero Featured Slider */}
                <HeroBanner 
                  items={trending.slice(0, 5)} 
                  onSelectMedia={handleSelectMedia}
                  onOpenLightbox={(url, title) => setLightboxData({ open: true, url, title })}
                />

                {/* Today's Airing Releases Bar */}
                <AiringTodaySection 
                  schedules={schedules} 
                  onSelectMedia={handleSelectMedia}
                  onOpenCalendar={() => setActiveTab("calendar")}
                />

                {/* Recently Viewed Section */}
                <RecentlyViewedSection 
                  onSelectMedia={handleSelectMedia}
                  onShowToast={showToast}
                />

                {/* Popular This Season */}
                <section className="my-6 md:my-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Flame className="w-5 h-5 text-red-500 shrink-0" />
                      <h2 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight">Популярное в этом сезоне</h2>
                    </div>
                    <button 
                      onClick={() => setActiveTab("anime")}
                      className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer min-h-[40px] px-2 shrink-0"
                    >
                      Смотреть все <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4">
                    {popularThisSeason.slice(0, 12).map((media) => (
                      <MediaCard key={media.id} media={media} onClick={handleSelectMedia} />
                    ))}
                  </div>
                </section>

                {/* Popular Manga */}
                <section className="my-6 md:my-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-red-500 shrink-0" />
                      <h2 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight">Популярная Манга 🇯🇵</h2>
                    </div>
                    <button 
                      onClick={() => setActiveTab("manga")}
                      className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer min-h-[40px] px-2 shrink-0"
                    >
                      Весь каталог <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4">
                    {popularManga.slice(0, 8).map((media) => (
                      <MediaCard key={media.id} media={media} onClick={handleSelectMedia} />
                    ))}
                  </div>
                </section>

                {/* Popular Manhwa */}
                {popularManhwa.length > 0 && (
                  <section className="my-6 md:my-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-5 h-5 text-amber-500 shrink-0" />
                        <h2 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight">Популярная Манхва (Корея) 🇰🇷</h2>
                      </div>
                      <button 
                        onClick={() => setActiveTab("manhwa")}
                        className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer min-h-[40px] px-2 shrink-0"
                      >
                        Каталог манхвы <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4">
                      {popularManhwa.slice(0, 8).map((media) => (
                        <MediaCard key={media.id} media={media} onClick={handleSelectMedia} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Top Rated Anime */}
                <section className="my-6 md:my-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Star className="w-5 h-5 text-amber-500 shrink-0" />
                      <h2 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight">Высокий рейтинг зрителей</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4">
                    {topRated.slice(0, 8).map((media) => (
                      <MediaCard key={media.id} media={media} onClick={handleSelectMedia} />
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {/* TAB 2: RELEASE CALENDAR */}
        {activeTab === "calendar" && (
          <ReleaseCalendarView schedules={schedules} onSelectMedia={handleSelectMedia} />
        )}

        {/* TAB 3: ANIME CATALOG */}
        {activeTab === "anime" && (
          <CatalogView 
            initialType="ANIME" 
            onSelectMedia={handleSelectMedia} 
            currentUser={currentUser}
            onRequireAuthFor18Plus={handleRequireAuthFor18Plus}
          />
        )}

        {/* TAB 4: MANGA CATALOG (Japan) */}
        {activeTab === "manga" && (
          <CatalogView 
            initialType="MANGA" 
            initialCountryOfOrigin="JP"
            onSelectMedia={handleSelectMedia} 
            currentUser={currentUser}
            onRequireAuthFor18Plus={handleRequireAuthFor18Plus}
          />
        )}

        {/* TAB 4B: MANHWA CATALOG (Korea) */}
        {activeTab === "manhwa" && (
          <CatalogView 
            initialType="MANGA" 
            initialCountryOfOrigin="KR"
            onSelectMedia={handleSelectMedia} 
            currentUser={currentUser}
            onRequireAuthFor18Plus={handleRequireAuthFor18Plus}
          />
        )}

        {/* TAB 4C: MANHUA CATALOG (China) */}
        {activeTab === "manhua" && (
          <CatalogView 
            initialType="MANGA" 
            initialCountryOfOrigin="CN,TW"
            onSelectMedia={handleSelectMedia} 
            currentUser={currentUser}
            onRequireAuthFor18Plus={handleRequireAuthFor18Plus}
          />
        )}

        {/* TAB 5: STUDIOS */}
        {activeTab === "studios" && (
          <StudioView initialStudioId={selectedStudioId} onSelectMedia={handleSelectMedia} />
        )}

        {/* TAB 6: NEWS */}
        {activeTab === "news" && (
          <NewsSection />
        )}

        {/* TAB 7: USER WATCHLIST */}
        {activeTab === "userlist" && (
          <UserListSection onSelectMedia={handleSelectMedia} />
        )}

        {/* TAB 8: PROFILE VIEW */}
        {activeTab === "profile" && (
          currentUser ? (
            <ProfileView 
              currentUser={currentUser} 
              onUpdateUser={setCurrentUser} 
              onSelectMedia={handleSelectMedia}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onLogoutClick={handleOpenLogoutConfirm}
            />
          ) : (
            <div className="max-w-md mx-auto my-16 p-8 bg-zinc-900 border border-zinc-800 rounded-3xl text-center space-y-4 shadow-2xl">
              <h2 className="text-xl font-bold text-white">Авторизация в профиле</h2>
              <p className="text-xs text-zinc-400">Войдите или зарегистрируйтесь, чтобы получить доступ к вашему личному кабинету</p>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all shadow-lg cursor-pointer min-h-[48px]"
              >
                Войти в аккаунт
              </button>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => {
          setAuthModalMessage(undefined);
          setAuthModalMode("login");
          setAuthModalOpen(true);
        }}
        onOpenSearch={() => setIsMobileSearchOpen(true)}
      />

      {/* Media Detail Modal */}
      {selectedMediaId && (
        <MediaDetailModalPage 
          mediaId={selectedMediaId}
          onClose={() => setSelectedMediaId(null)}
          onSelectMedia={handleSelectMedia}
          onOpenLightbox={(url, title) => setLightboxData({ open: true, url, title })}
          onOpenStudio={handleOpenStudio}
          onOpenAuth={() => {
            setAuthModalMessage("Контент 18+ доступен только зарегистрированным пользователям старше 18 лет.");
            setAuthModalMode("login");
            setAuthModalOpen(true);
          }}
        />
      )}

      {/* User Auth Modal */}
      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChanged={handleUserChanged}
        onLogoutClick={handleOpenLogoutConfirm}
        initialMode={authModalMode}
        message={authModalMessage}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal 
        isOpen={isLogoutConfirmOpen}
        onClose={() => {
          if (!isLoggingOut) setIsLogoutConfirmOpen(false);
        }}
        onConfirm={handleConfirmLogout}
        isLoggingOut={isLoggingOut}
      />

      {/* Global Toast Notification */}
      <Toast 
        toast={toast}
        onClose={() => setToast(null)}
      />

      {/* Lightbox Modal */}
      <LightboxModal 
        isOpen={lightboxData.open}
        imageUrl={lightboxData.url}
        title={lightboxData.title}
        onClose={() => setLightboxData({ open: false, url: "", title: "" })}
      />

      {/* AI Assistant Modal */}
      <AiAssistantModal 
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
      />
    </div>
  );
}
