import React from "react";
import { Tv, Calendar, Film, BookOpen, Search, User } from "lucide-react";
import { UserProfile } from "../types";

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenSearch: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuth,
  onOpenSearch,
}) => {
  const navItems = [
    { id: "home", label: "Главная", icon: Tv, action: () => setActiveTab("home") },
    { id: "calendar", label: "Календарь", icon: Calendar, action: () => setActiveTab("calendar") },
    { id: "anime", label: "Аниме", icon: Film, action: () => setActiveTab("anime") },
    { id: "manga", label: "Манга", icon: BookOpen, action: () => setActiveTab("manga") },
    { id: "search", label: "Поиск", icon: Search, action: onOpenSearch },
    {
      id: "profile",
      label: currentUser ? "Профиль" : "Войти",
      icon: User,
      action: () => {
        if (currentUser) {
          setActiveTab("profile");
        } else {
          onOpenAuth();
        }
      },
    },
  ];

  return (
    <nav
      aria-label="Нижняя навигация"
      className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-800/80 px-1 py-1 flex items-center justify-between lg:hidden shadow-2xl pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const isProfile = item.id === "profile";
        
        return (
          <button
            key={item.id}
            onClick={item.action}
            aria-label={item.label}
            className={`min-h-[44px] min-w-0 flex-1 flex flex-col items-center justify-center space-y-0.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 touch-manipulation px-0.5 ${
              isActive
                ? "text-red-500 font-extrabold"
                : "text-zinc-400 hover:text-zinc-200 font-medium"
            }`}
          >
            <div className="relative flex items-center justify-center">
              {isProfile && currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.username}
                  className={`w-5 h-5 rounded-full object-cover transition-transform duration-200 border ${
                    isActive ? "scale-110 border-red-500 shadow-sm" : "border-zinc-700"
                  }`}
                />
              ) : (
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? "scale-110 stroke-[2.5px] text-red-500" : "stroke-2"
                  }`}
                />
              )}
              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-red-500 shadow-sm shadow-red-500 animate-pulse" />
              )}
            </div>
            {/* Display text label only on screens >=400px */}
            <span
              className={`hidden min-[400px]:block text-[10px] tracking-tight truncate max-w-[56px] ${
                isActive ? "text-white font-black" : "text-zinc-400"
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
