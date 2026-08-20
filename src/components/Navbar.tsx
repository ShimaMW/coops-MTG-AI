"use client";

import React from "react";
import { UserProfile, UserRole } from "@/lib/types";
import { Sparkles, Shield, UserCheck, Printer } from "lucide-react";

interface NavbarProps {
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
  departments: string[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onUserChange,
  departments,
}) => {
  return (
    <header className="bg-clover-700 text-white px-5 py-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-md mb-6 no-print">
      {/* ロゴ & タイトル */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
          <Sparkles className="w-5 h-5 text-emerald-300" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight">COOPs 議事録AI</h1>
            <span className="bg-white/15 border border-white/20 text-white/90 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              v3.5 Flash-Lite
            </span>
          </div>
          <p className="text-xs text-white/70">介護事業所向け 次世代AIミーティングアシスタント</p>
        </div>
      </div>

      {/* ユーザー & 権限切替（デモ・運用兼用） */}
      <div className="flex items-center gap-3 ml-auto">
        <div className="flex items-center bg-black/20 border border-white/15 rounded-xl px-3 py-1.5 gap-2.5 text-xs">
          <div className="flex items-center gap-1 text-emerald-300 font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>{currentUser.role === "admin" ? "本部（全閲覧）" : "部署スタッフ"}</span>
          </div>

          <div className="h-3.5 w-px bg-white/20"></div>

          {/* 部署・権限切り替えセレクタ */}
          <select
            className="bg-transparent text-white border-none outline-none cursor-pointer font-medium text-xs focus:ring-0"
            value={`${currentUser.department}:${currentUser.role}`}
            onChange={(e) => {
              const [dept, role] = e.target.value.split(":");
              onUserChange({
                ...currentUser,
                department: dept,
                role: role as UserRole,
                name: role === "admin" ? "管理者（本部）" : `${dept} 担当`,
              });
            }}
          >
            <option value="総務・管理本部:admin" className="text-gray-900">
              🔑 本部管理者 (admin)
            </option>
            {departments.map((dept) => (
              <option key={dept} value={`${dept}:staff`} className="text-gray-900">
                👤 {dept} スタッフ
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
