"use client";

import React from "react";
import { UserProfile, UserRole } from "@/lib/types";
import { DEFAULT_DEPARTMENTS } from "@/lib/storage";
import { Sparkles, Shield } from "lucide-react";

interface NavbarProps {
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onUserChange,
}) => {
  return (
    <header className="bg-[#283136] border border-white/10 text-white px-5 py-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg mb-4 no-print backdrop-blur-md">
      {/* ロゴ & タイトル */}
      <div className="flex items-center gap-3.5">
        <img
          src="/coops-logo.png"
          alt="COOPs"
          className="h-8 md:h-9 w-auto object-contain drop-shadow-sm"
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />
        <div className="h-5 w-px bg-white/20"></div>
        <h1 className="text-base md:text-lg font-bold tracking-tight text-white">
          会議議事録AI
        </h1>
      </div>

      {/* ユーザー & 権限切替 */}
      <div className="flex items-center gap-3 ml-auto">
        <div className="flex items-center bg-black/30 border border-white/15 rounded-xl px-3 py-1.5 gap-2.5 text-xs shadow-inner">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
            <Shield className="w-3.5 h-3.5 text-slate-300" />
            <span>{currentUser.role === "admin" ? "本部（全閲覧）" : "部署スタッフ"}</span>
          </div>

          <div className="h-3.5 w-px bg-white/20"></div>

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
            {DEFAULT_DEPARTMENTS.map((dept) => (
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
