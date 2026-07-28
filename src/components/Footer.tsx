import React from "react";
import { Tv, Heart, ShieldCheck, ExternalLink } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-zinc-950 border-t border-zinc-900 py-12 text-zinc-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <span className="font-black text-sm text-white">AnimiX Portal</span>
            <p className="text-[11px] text-zinc-500">Русскоязычный портал аниме, манги и расписаний релизов</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-zinc-400 font-medium">
          <span>Данные синхронизированы через AniList API</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Защищенный контент
          </span>
        </div>

        <p className="text-[11px] text-zinc-600 text-center md:text-right">
          © {new Date().getFullYear()} AnimiX. Все права на аниме и мангу принадлежат их правообладателям.
        </p>
      </div>
    </footer>
  );
};
