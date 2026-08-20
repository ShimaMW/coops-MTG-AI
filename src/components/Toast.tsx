"use client";

import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = "success", onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div
        className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs md:text-sm font-bold ${
          type === "success"
            ? "bg-slate-900 text-white border-slate-700"
            : "bg-red-600 text-white border-red-500"
        }`}
      >
        {type === "success" ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
        )}
        <span>{message}</span>
      </div>
    </div>
  );
};
