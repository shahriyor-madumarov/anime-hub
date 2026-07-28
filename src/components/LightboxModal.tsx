import React from "react";
import { X, ZoomIn, Download } from "lucide-react";

interface LightboxModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  title: string;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ isOpen, imageUrl, title, onClose }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Controls */}
        <div className="absolute -top-12 left-0 right-0 flex items-center justify-between text-white/90">
          <span className="font-medium text-sm truncate max-w-md">{title}</span>
          <div className="flex items-center space-x-3">
            <a 
              href={imageUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Открыть в оригинале"
            >
              <Download className="w-5 h-5" />
            </a>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Закрыть"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <img 
          src={imageUrl} 
          alt={title} 
          className="max-h-[85vh] w-auto object-contain rounded-lg shadow-2xl border border-white/10"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1000&q=80";
          }}
        />
        
        <p className="mt-3 text-xs text-zinc-400 flex items-center gap-1">
          <ZoomIn className="w-3.5 h-3.5" /> Полноразмерное изображение высокого разрешения
        </p>
      </div>
    </div>
  );
};
