import React, { useState, useEffect } from "react";
import { X, Lock, User, Mail, Calendar, ShieldCheck, ShieldAlert, CheckCircle2, ArrowRight, LogOut, KeyRound, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import { calculateAge, saveAuthData, clearAuthData } from "../utils/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserChanged: (user: UserProfile | null) => void;
  onLogoutClick?: () => void;
  initialMode?: "login" | "register" | "profile";
  message?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  onLogoutClick,
  initialMode = "login",
  message
}) => {
  const [mode, setMode] = useState<"login" | "register" | "profile">(
    currentUser ? "profile" : initialMode
  );

  // Sync mode and form values when modal opens or user state changes
  useEffect(() => {
    if (isOpen) {
      setMode(currentUser ? "profile" : initialMode);
      setError(null);
      setSuccessMsg(null);
      if (currentUser) {
        setEditUsername(currentUser.username || "");
        setEditEmail(currentUser.email || "");
      }
    }
  }, [isOpen, currentUser, initialMode]);

  // Form fields
  const [loginInput, setLoginInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regDobInput, setRegDobInput] = useState(""); // Starts empty, formatted as dd.mm.yyyy

  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Helper to format raw digits into dd.mm.yyyy
  const formatDobInput = (raw: string): string => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
  };

  // Helper to validate dd.mm.yyyy and return ISO date string
  const parseAndValidateDob = (formatted: string): { isoDate: string | null; error: string | null } => {
    if (!formatted || formatted.trim() === "") {
      return { isoDate: null, error: null };
    }
    const clean = formatted.trim();
    if (clean.length < 10) {
      return { isoDate: null, error: "Укажите полную дату в формате дд.мм.гггг" };
    }
    const parts = clean.split(".");
    if (parts.length !== 3) {
      return { isoDate: null, error: "Формат даты должен быть дд.мм.гггг" };
    }
    const [ddStr, mmStr, yyyyStr] = parts;
    if (ddStr.length !== 2 || mmStr.length !== 2 || yyyyStr.length !== 4) {
      return { isoDate: null, error: "Укажите дату из 8 цифр (дд.мм.гггг)" };
    }

    const day = parseInt(ddStr, 10);
    const month = parseInt(mmStr, 10);
    const year = parseInt(yyyyStr, 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return { isoDate: null, error: "Неверный числовой формат даты" };
    }

    if (day < 1 || day > 31) {
      return { isoDate: null, error: "День должен быть от 01 до 31" };
    }

    if (month < 1 || month > 12) {
      return { isoDate: null, error: "Месяц должен быть от 01 до 12" };
    }

    const currentYear = new Date().getFullYear();
    if (year < currentYear - 100 || year > currentYear - 5) {
      return { isoDate: null, error: `Укажите год рождения от ${currentYear - 100} до ${currentYear - 5}` };
    }

    // Check exact calendar validity (e.g., 31.02 is invalid)
    const testDate = new Date(year, month - 1, day);
    if (
      testDate.getFullYear() !== year ||
      testDate.getMonth() !== month - 1 ||
      testDate.getDate() !== day
    ) {
      return { isoDate: null, error: "Несуществующая дата (например, 31.02 не существует)" };
    }

    const isoDate = `${yyyyStr}-${mmStr.padStart(2, "0")}-${ddStr.padStart(2, "0")}`;
    return { isoDate, error: null };
  };

  const dobValidation = parseAndValidateDob(regDobInput);
  const computedRegAge = dobValidation.isoDate ? calculateAge(dobValidation.isoDate) : 0;
  const isRegAdult = computedRegAge >= 18;

  // Helper to safely extract error message from API response or thrown error
  const extractErrorMsg = (dataOrError: any, defaultMsg: string): string => {
    if (!dataOrError) return defaultMsg;

    const sanitize = (val: any): string | null => {
      if (!val) return null;
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (trimmed && trimmed !== "{}" && trimmed !== "[object Object]") {
          return trimmed;
        }
        return null;
      }
      return null;
    };

    if (typeof dataOrError === "string") {
      const clean = sanitize(dataOrError);
      if (clean) return clean;
    }

    if (typeof dataOrError === "object") {
      if (dataOrError.error) {
        const cleanErr = sanitize(dataOrError.error);
        if (cleanErr) return cleanErr;
        if (typeof dataOrError.error === "object" && dataOrError.error.message) {
          const cleanSubMsg = sanitize(dataOrError.error.message);
          if (cleanSubMsg) return cleanSubMsg;
        }
      }
      if (dataOrError.message) {
        const cleanMsg = sanitize(dataOrError.message);
        if (cleanMsg) return cleanMsg;
      }
    }

    return defaultMsg;
  };

  const formatAuthError = (msg: string, isRegister: boolean): string => {
    if (!msg || msg === "{}" || msg === "[object Object]") return isRegister ? "Ошибка регистрации" : "Ошибка входа";
    const lower = msg.toLowerCase();
    if (isRegister) {
      if (
        lower.includes("already registered") ||
        lower.includes("email_exists") ||
        lower.includes("user_already_exists") ||
        lower.includes("email address has already been registered") ||
        lower.includes("этот email уже зарегистрирован")
      ) {
        return "Этот email уже зарегистрирован";
      }
      if (
        lower.includes("username") ||
        lower.includes("имя пользователя") ||
        lower.includes("занято")
      ) {
        return "Это имя пользователя уже занято";
      }
      if (lower.includes("уже существует")) {
        return "Этот email или имя пользователя уже зарегистрированы";
      }
    }
    return msg;
  };

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginInput, password: passwordInput })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(extractErrorMsg(data, "Ошибка входа"));
      }

      saveAuthData(data.token, data.user);
      onUserChanged(data.user);
      onClose();
    } catch (err: any) {
      let errMsg: string;
      if (err.name === "TypeError" && err.message?.includes("fetch")) {
        errMsg = "Не удалось связаться с сервером. Пожалуйста, проверьте интернет-соединение и повторите попытку.";
      } else {
        errMsg = extractErrorMsg(err, "Ошибка входа");
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { isoDate, error: dobErr } = parseAndValidateDob(regDobInput);
    if (!isoDate || dobErr) {
      setError(dobErr || "Пожалуйста, укажите вашу дату рождения в формате дд.мм.гггг (например, 15.03.1998)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          password: regPassword,
          dateOfBirth: isoDate
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(extractErrorMsg(data, "Ошибка регистрации"));
      }

      saveAuthData(data.token, data.user);
      onUserChanged(data.user);
      onClose();
    } catch (err: any) {
      let errMsg: string;
      if (err.name === "TypeError" && err.message?.includes("fetch")) {
        errMsg = "Не удалось связаться с сервером. Пожалуйста, проверьте подключение к сети и повторите попытку.";
      } else {
        const rawMsg = extractErrorMsg(err, "Ошибка регистрации");
        errMsg = formatAuthError(rawMsg, true);
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Update Profile (Username & Email)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = localStorage.getItem("animix_auth_token_v1");
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ username: editUsername, email: editEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(extractErrorMsg(data, "Ошибка обновления профиля"));
      }

      if (currentUser) {
        const updated: UserProfile = {
          ...currentUser,
          username: data.user.username,
          email: data.user.email
        };
        saveAuthData(token || "", updated);
        onUserChanged(updated);
      }

      setSuccessMsg("Профиль успешно обновлен");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(extractErrorMsg(err, "Ошибка обновления профиля"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    onClose();
    if (onLogoutClick) {
      onLogoutClick();
    } else {
      clearAuthData();
      onUserChanged(null);
      setMode("login");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", duration: 0.25, bounce: 0 }}
            className="relative w-full max-w-md sm:max-w-lg bg-zinc-950 border border-zinc-800/90 rounded-3xl p-5 sm:p-8 shadow-2xl shadow-red-950/30 text-white my-auto max-h-[88vh] sm:max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800"
          >
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-3xl pointer-events-none rounded-full" />

            {/* Close Button with 44px touch target */}
            <button
              onClick={onClose}
              aria-label="Закрыть"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-zinc-900/90 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Message Notice if passed */}
            {message && (
              <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-xs sm:text-sm">
                <Lock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-300">Подтверждение возраста</p>
                  <p className="mt-0.5 leading-relaxed">{message}</p>
                </div>
              </div>
            )}

            {/* Header Tabs if not logged in */}
            {!currentUser ? (
              <div className="flex items-center space-x-1 sm:space-x-2 bg-zinc-900 p-1 rounded-2xl border border-zinc-800/80 mb-6">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(null); }}
                  className={`flex-1 min-h-[42px] py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    mode === "login" ? "bg-red-600 text-white shadow-md shadow-red-950/50" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Вход
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("register"); setError(null); }}
                  className={`flex-1 min-h-[42px] py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    mode === "register" ? "bg-red-600 text-white shadow-md shadow-red-950/50" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Регистрация
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center font-black text-white text-lg shadow-lg">
                    {currentUser.username[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-white">{currentUser.username}</h3>
                    <p className="text-xs text-zinc-400">{currentUser.email}</p>
                  </div>
                </div>

                {/* Age Badge */}
                {currentUser.isAdultVerified ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[11px] sm:text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> 18+ Подтвержден
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-[11px] sm:text-xs flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> До 18 лет
                  </span>
                )}
              </div>
            )}

            {/* Errors & Success Banners */}
            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
                {(error.includes("зарегистрирован") || error.includes("уже существует")) && mode === "register" && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginInput(regEmail);
                      setMode("login");
                      setError(null);
                    }}
                    className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shrink-0 cursor-pointer self-start sm:self-auto"
                  >
                    Войти в аккаунт
                  </button>
                )}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 1) LOGIN FORM */}
            {mode === "login" && !currentUser && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-zinc-300 mb-1.5">
                    Логин или Email
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="Ваш логин или email"
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 min-h-[44px] text-base sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-zinc-300 mb-1.5">
                    Пароль
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 min-h-[44px] text-base sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[44px] py-3 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.99] disabled:opacity-60 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Выполняется вход...</span>
                    </>
                  ) : (
                    <>
                      <span>Войти</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* 2) REGISTER FORM */}
            {mode === "register" && !currentUser && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-zinc-300 mb-1.5">
                    Имя пользователя
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="Введите никнейм"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 min-h-[44px] text-base sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-zinc-300 mb-1.5">
                    Электронная почта
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="user@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 min-h-[44px] text-base sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-zinc-300 mb-1.5">
                    Пароль
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      type="password"
                      required
                      placeholder="Минимум 6 символов"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 min-h-[44px] text-base sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Date of Birth Text Input with Auto Masking dd.mm.yyyy */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-red-400 mb-1.5 flex items-center justify-between">
                    <span>Дата рождения (Для верификации 18+)</span>
                    <span className="text-[10px] text-zinc-400 font-normal">Фиксируется навсегда</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none" />
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="дд.мм.гггг"
                      value={regDobInput}
                      onChange={(e) => setRegDobInput(formatDobInput(e.target.value))}
                      maxLength={10}
                      className="w-full bg-zinc-900 border border-red-500/50 rounded-xl pl-10 pr-4 py-3 min-h-[44px] text-base sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all font-mono tracking-wider"
                    />
                  </div>

                  {/* Realtime Inline Validation Error */}
                  {dobValidation.error && regDobInput.length >= 8 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>{dobValidation.error}</span>
                    </div>
                  )}

                  {/* Dynamic Age Badge Preview when valid */}
                  {dobValidation.isoDate && (
                    <div className={`mt-2.5 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
                      isRegAdult 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
                        : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    }`}>
                      {isRegAdult ? (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>Вам {computedRegAge} лет — Доступ к контенту 18+ будет открыт</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>Вам {computedRegAge} лет — Контент 18+ будет автоматически скрыт</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[44px] py-3 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.99] disabled:opacity-60 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 cursor-pointer mt-5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Создание аккаунта...</span>
                    </>
                  ) : (
                    <span>Зарегистрироваться</span>
                  )}
                </button>
              </form>
            )}

            {/* 3) PROFILE VIEW (LOGGED IN) */}
            {currentUser && (
              <div className="space-y-4">
                <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs sm:text-sm text-zinc-400">
                    <span>Возраст в системе:</span>
                    <strong className="text-white font-bold">{currentUser.age} лет</strong>
                  </div>

                  <div className="flex justify-between items-center text-xs sm:text-sm text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <span>Дата рождения:</span>
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                    </span>
                    <strong className="text-white font-mono bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800 text-xs">
                      {currentUser.dateOfBirth}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-xs sm:text-sm text-zinc-400">
                    <span>Статус 18+:</span>
                    {currentUser.isAdultVerified ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Разрешен
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Заблокирован
                      </span>
                    )}
                  </div>
                </div>

                {/* Permanent DOB Lock Notice */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-300">Дата рождения заблокирована</p>
                    <p className="mt-0.5 text-[11px] sm:text-xs leading-relaxed text-amber-200/80">
                      Дата рождения фиксируется при регистрации и не подлежит изменению в профиле.
                    </p>
                  </div>
                </div>

                {/* Edit Username / Email Form */}
                <form onSubmit={handleUpdateProfile} className="space-y-3 pt-3 border-t border-zinc-800/80">
                  <label className="block text-xs sm:text-sm font-bold text-zinc-300 mb-1">
                    Данные профиля:
                  </label>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">
                      Имя пользователя
                    </label>
                    <input
                      type="text"
                      required
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 min-h-[44px] text-base sm:text-sm text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">
                      Электронная почта
                    </label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 min-h-[44px] text-base sm:text-sm text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[44px] py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.99] disabled:opacity-60 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-red-950/50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Сохранение...</span>
                      </>
                    ) : (
                      <span>Сохранить профиль</span>
                    )}
                  </button>
                </form>

                <div className="pt-3 border-t border-zinc-800/80 flex justify-between items-center gap-3">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-4 py-2.5 min-h-[44px] rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> Выйти
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 min-h-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs sm:text-sm transition-colors border border-zinc-800 cursor-pointer"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

