import React, { useState, useEffect } from "react";
import { Target, Trophy, Sparkles, Edit2, Check, Plus, Minus, Flame } from "lucide-react";

interface SeasonalGoalTrackerProps {
  completedCount: number;
}

export const SeasonalGoalTracker: React.FC<SeasonalGoalTrackerProps> = ({ completedCount }) => {
  const [seasonalGoal, setSeasonalGoal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("animix_seasonal_goal");
      return saved ? Math.max(1, parseInt(saved, 10) || 10) : 10;
    } catch {
      return 10;
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState<number>(seasonalGoal);

  useEffect(() => {
    try {
      localStorage.setItem("animix_seasonal_goal", seasonalGoal.toString());
    } catch (e) {
      console.warn("Failed to save seasonal goal", e);
    }
  }, [seasonalGoal]);

  const handleSaveGoal = () => {
    const validGoal = Math.max(1, Math.min(500, tempGoal));
    setSeasonalGoal(validGoal);
    setIsEditing(false);
  };

  const progressPercentage = Math.min(100, Math.round((completedCount / seasonalGoal) * 100));
  const remainingCount = Math.max(0, seasonalGoal - completedCount);
  const isGoalReached = completedCount >= seasonalGoal;

  return (
    <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-900 border border-zinc-800/80 rounded-3xl p-6 mb-8 shadow-xl relative overflow-hidden">
      {/* Background Subtle Accent Glow */}
      <div 
        className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          isGoalReached 
            ? "bg-amber-500/15" 
            : "bg-red-600/10"
        }`} 
      />

      <div className="relative z-10 space-y-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-2xl border transition-all ${
              isGoalReached 
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                : "bg-red-600/10 border-red-500/20 text-red-500"
            }`}>
              {isGoalReached ? <Trophy className="w-6 h-6 animate-bounce" /> : <Target className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Сезонная Цель Просмотра</h3>
                {isGoalReached && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Выполнено!
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Завершено <strong className="text-white font-bold">{completedCount}</strong> из <strong className="text-red-400 font-bold">{seasonalGoal}</strong> аниме/манги
              </p>
            </div>
          </div>

          {/* Edit Control Button / Inline Edit */}
          {!isEditing ? (
            <button
              onClick={() => {
                setTempGoal(seasonalGoal);
                setIsEditing(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition-all self-start sm:self-auto cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Изменить цель</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-1.5 rounded-2xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setTempGoal((prev) => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                title="Уменьшить"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <input
                type="number"
                min="1"
                max="500"
                value={tempGoal}
                onChange={(e) => setTempGoal(parseInt(e.target.value, 10) || 1)}
                className="w-14 bg-zinc-900 border border-zinc-700 rounded-lg text-center text-xs font-bold text-white py-1 focus:outline-none focus:border-red-500"
              />

              <button
                type="button"
                onClick={() => setTempGoal((prev) => Math.min(500, prev + 1))}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                title="Увеличить"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleSaveGoal}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow"
              >
                <Check className="w-3.5 h-3.5" /> Сохранить
              </button>
            </div>
          )}
        </div>

        {/* Preset Goal Quick Buttons in Edit Mode */}
        {isEditing && (
          <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
            <span className="text-[11px] text-zinc-500 font-medium">Быстрый выбор:</span>
            {[5, 10, 15, 20, 25, 30].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTempGoal(preset)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  tempGoal === preset 
                    ? "bg-red-600 text-white" 
                    : "bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        )}

        {/* Progress Bar & Percentage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Flame className={`w-4 h-4 ${isGoalReached ? "text-amber-400" : "text-red-500"}`} />
              Прогресс сезона
            </span>
            <span className={`font-mono ${isGoalReached ? "text-amber-400 font-black" : "text-red-400"}`}>
              {progressPercentage}%
            </span>
          </div>

          <div className="w-full bg-zinc-950 h-3.5 rounded-full p-0.5 border border-zinc-800/80 relative overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out shadow-lg ${
                isGoalReached
                  ? "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300"
                  : "bg-gradient-to-r from-red-600 via-red-500 to-orange-500"
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Motivational Status Footer */}
        <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
          {isGoalReached ? (
            <span className="text-amber-300 font-bold flex items-center gap-1.5">
              🎉 Поздравляем! Цель выполнена ({completedCount}/{seasonalGoal}). Можете увеличить планку!
            </span>
          ) : progressPercentage >= 75 ? (
            <span className="text-emerald-400 font-medium">
              🔥 Финишная прямая! Осталось завершить всего <strong className="font-bold text-white">{remainingCount}</strong> тайтлов.
            </span>
          ) : progressPercentage >= 50 ? (
            <span className="text-blue-400 font-medium">
              🚀 Более половины уже пройденно! Осталось <strong className="font-bold text-white">{remainingCount}</strong>.
            </span>
          ) : (
            <span className="text-zinc-400 font-medium">
              💪 Осталось завершить <strong className="font-bold text-white">{remainingCount}</strong> тайтлов до закрытия цели.
            </span>
          )}

          <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
            Статистика обновляется автоматически
          </span>
        </div>
      </div>
    </div>
  );
};
