"use client";

import React, { useState } from "react";
import { Lock, X, KeyRound, AlertCircle, ShieldCheck } from "lucide-react";
import { verifyAdminPIN } from "@/lib/storage";

interface PinAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export const PinAuthModal: React.FC<PinAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "管理者認証",
  description = "管理者権限への切り替え・マスタ設定には4桁のPINコードが必要です。",
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPIN(pin)) {
      setError("");
      setPin("");
      onSuccess();
      onClose();
    } else {
      setError("PINコードが正しくありません。");
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
              <Lock className="w-4 h-4" />
            </div>
            {title}
          </div>
          <button
            onClick={() => {
              setError("");
              setPin("");
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          {description}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                maxLength={8}
                autoFocus
                placeholder="PINコードを入力"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError("");
                }}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center text-lg font-mono tracking-widest outline-none focus:border-slate-700 focus:bg-white transition"
              />
            </div>
            {error && (
              <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setError("");
                setPin("");
                onClose();
              }}
              className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!pin}
              className="flex-1 py-2.5 bg-[#283136] hover:bg-[#1c2226] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              認証する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
