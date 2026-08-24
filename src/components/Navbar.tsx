"use client";

import React, { useState } from "react";
import { UserProfile, UserRole } from "@/lib/types";
import { getDepartments } from "@/lib/storage";
import { Shield, Settings, Lock } from "lucide-react";
import { PinAuthModal } from "./PinAuthModal";
import { DepartmentManagerModal } from "./DepartmentManagerModal";

interface NavbarProps {
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
  departments: string[];
  onDepartmentsUpdated?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onUserChange,
  departments,
  onDepartmentsUpdated,
}) => {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [pendingDeptChange, setPendingDeptChange] = useState<UserProfile | null>(null);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [dept, role] = e.target.value.split(":");
    if (role === "admin") {
      // 管理者への切り替え時はPINコード認証を要求
      setPendingDeptChange({
        ...currentUser,
        department: "総務・管理本部",
        role: "admin",
        name: "島田（本部）",
      });
      setIsPinModalOpen(true);
    } else {
      onUserChange({
        ...currentUser,
        department: dept,
        role: "staff",
        name: `${dept} 担当`,
      });
    }
  };

  const handlePinSuccess = () => {
    if (pendingDeptChange) {
      onUserChange(pendingDeptChange);
      setPendingDeptChange(null);
    }
  };

  return (
    <>
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

        {/* ユーザー & 権限切替 & マスタ管理 */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* 管理者専用：部署マスタ管理ボタン */}
          {currentUser.role === "admin" && (
            <button
              type="button"
              onClick={() => setIsDeptModalOpen(true)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-slate-100 flex items-center gap-1.5 transition shadow-2xs"
              title="事業所・部署マスタを管理"
            >
              <Settings className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">事業所マスタ</span>
            </button>
          )}

          {/* 部署・ロール選択ドロップダウン */}
          <div className="flex items-center bg-black/30 border border-white/15 rounded-xl px-3 py-1.5 gap-2.5 text-xs shadow-inner">
            <div className="flex items-center gap-1.5 text-slate-200 font-medium">
              {currentUser.role === "admin" ? (
                <Shield className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span className="hidden md:inline">
                {currentUser.role === "admin" ? "本部（全閲覧）" : "事業所限定"}
              </span>
            </div>

            <div className="h-3.5 w-px bg-white/20 hidden md:block"></div>

            <select
              className="bg-transparent text-white border-none outline-none cursor-pointer font-medium text-xs focus:ring-0"
              value={currentUser.role === "admin" ? "総務・管理本部:admin" : `${currentUser.department}:staff`}
              onChange={handleSelectChange}
            >
              <option value="総務・管理本部:admin" className="text-gray-900 font-bold">
                🔑 本部・管理者 (admin)
              </option>
              {departments
                .filter((d) => d !== "総務・管理本部")
                .map((dept) => (
                  <option key={dept} value={`${dept}:staff`} className="text-gray-900">
                    👤 {dept}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </header>

      {/* PIN認証モーダル */}
      <PinAuthModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingDeptChange(null);
        }}
        onSuccess={handlePinSuccess}
        title="本部・管理者認証"
        description="本部・管理者モードへの切り替えには4桁のPINコードが必要です。"
      />

      {/* 部署マスタ管理モーダル */}
      <DepartmentManagerModal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        onDepartmentsUpdated={onDepartmentsUpdated}
      />
    </>
  );
};
