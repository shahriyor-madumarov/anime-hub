import React, { useState, useEffect } from "react";
import { Newspaper, Clock, Tag, ChevronRight, X, MessageSquare, Share2 } from "lucide-react";
import { NewsItem } from "../types";

export const NewsSection: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>("ВСЕ");
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => {
        setNews(data.news || []);
        setLoading(false);
      })
      .catch((e) => console.error("Failed to load news", e));
  }, []);

  const categories = ["ВСЕ", "Анонсы", "Релизы", "Студии", "Манга", "Манхва & Маньхуа"];

  const filteredNews = activeCategory === "ВСЕ" 
    ? news 
    : news.filter((n) => n.category === activeCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-red-500" />
            Новости и Дайджесты Индустрии
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Анонсы новых сезонов, тизеры фильмов, интервью со студиями и релизы манги
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeCategory === cat 
                  ? "bg-red-600 text-white shadow-md" 
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* News Grid */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400">Загрузка ленты новостей...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.map((item) => (
            <div 
              key={item.id}
              onClick={() => setSelectedNews(item)}
              className="flex flex-col bg-zinc-900/60 rounded-2xl overflow-hidden border border-zinc-800/80 hover:border-red-500/50 transition-all duration-300 cursor-pointer group shadow-lg"
            >
              {/* News Image */}
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                <img 
                  src={item.imageUrl} 
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80";
                  }}
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-red-600 text-white shadow">
                  {item.category}
                </span>
              </div>

              {/* News Text Body */}
              <div className="p-5 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="font-bold text-base text-white group-hover:text-red-400 transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {item.date}
                  </span>
                  <span className="text-red-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Читать <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* News Detail Modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-2xl w-full bg-zinc-950 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl p-6">
            <button 
              onClick={() => setSelectedNews(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 text-white hover:bg-red-600 transition-colors border border-zinc-700"
            >
              <X className="w-5 h-5" />
            </button>

            <img 
              src={selectedNews.imageUrl} 
              alt={selectedNews.title} 
              className="w-full aspect-video object-cover rounded-2xl mb-4 border border-zinc-800"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80";
              }}
            />

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                {selectedNews.category}
              </span>
              <span className="text-xs text-zinc-500">{selectedNews.date}</span>
            </div>

            <h2 className="text-xl font-bold text-white mb-3 leading-snug">{selectedNews.title}</h2>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line mb-6">
              {selectedNews.content}
            </p>

            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <span>Источник: {selectedNews.source}</span>
              <button 
                onClick={() => setSelectedNews(null)}
                className="px-5 py-2 rounded-xl bg-zinc-900 text-white font-bold hover:bg-zinc-800"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
