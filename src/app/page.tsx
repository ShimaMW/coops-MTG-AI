"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { TabNavigation, TabType } from "@/components/TabNavigation";
import { AgendaTab } from "@/components/AgendaTab";
import { MinutesTab } from "@/components/MinutesTab";
import { HistoryTab } from "@/components/HistoryTab";
import { MasterTab } from "@/components/MasterTab";
import { Toast } from "@/components/Toast";
import {
  getMasterData,
  getCurrentUser,
  saveCurrentUser,
  getAgendas,
  getMinutesList,
} from "@/lib/storage";
import { MasterData, UserProfile, AgendaData, MinutesData } from "@/lib/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("minutes");
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [agendas, setAgendas] = useState<AgendaData[]>([]);
  const [minutesList, setMinutesList] = useState<MinutesData[]>([]);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  // 初期データ読み込み
  const reloadData = () => {
    const m = getMasterData();
    const u = getCurrentUser();
    const a = getAgendas();
    const min = getMinutesList();
    setMasterData(m);
    setCurrentUser(u);
    setAgendas(a);
    setMinutesList(min);
  };

  useEffect(() => {
    reloadData();
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleUserChange = (updated: UserProfile) => {
    setCurrentUser(updated);
    saveCurrentUser(updated);
    showToast(`アカウントを「${updated.name} (${updated.role === "admin" ? "本部" : updated.department})」に切り替えました`);
  };

  if (!masterData || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-clover-700 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs font-bold text-slate-500">データを読み込み中...</div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === "admin";

  return (
    <main className="min-h-screen bg-slate-100/70 p-3 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <Navbar
          currentUser={currentUser}
          onUserChange={handleUserChange}
          departments={masterData.departments}
        />

        {/* タブナビゲーション */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isAdmin={isAdmin}
        />

        {/* タブコンテンツ */}
        <div className="mt-4">
          {activeTab === "agenda" && (
            <AgendaTab
              masterData={masterData}
              currentUser={currentUser}
              onSaved={reloadData}
              showToast={showToast}
            />
          )}

          {activeTab === "minutes" && (
            <MinutesTab
              masterData={masterData}
              agendas={agendas}
              currentUser={currentUser}
              onSaved={reloadData}
              showToast={showToast}
            />
          )}

          {activeTab === "history" && (
            <HistoryTab
              agendas={agendas}
              minutesList={minutesList}
              masterData={masterData}
              currentUser={currentUser}
              onRefresh={reloadData}
              showToast={showToast}
            />
          )}

          {activeTab === "master" && (
            <MasterTab
              masterData={masterData}
              currentUser={currentUser}
              onUpdate={reloadData}
              showToast={showToast}
            />
          )}
        </div>
      </div>

      {/* 通知トースト */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  );
}
