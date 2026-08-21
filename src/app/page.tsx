"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { TabNavigation, TabType } from "@/components/TabNavigation";
import { AgendaTab } from "@/components/AgendaTab";
import { MinutesTab } from "@/components/MinutesTab";
import { HistoryTab } from "@/components/HistoryTab";
import { Toast } from "@/components/Toast";
import {
  getCurrentUser,
  saveCurrentUser,
  getMeetingRecords,
} from "@/lib/storage";
import { UserProfile, MeetingRecord } from "@/lib/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("minutes");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [meetingRecords, setMeetingRecords] = useState<MeetingRecord[]>([]);
  const [selectedAgendaIdForMinutes, setSelectedAgendaIdForMinutes] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const reloadData = () => {
    const u = getCurrentUser();
    const records = getMeetingRecords();
    setCurrentUser(u);
    setMeetingRecords(records);
  };

  useEffect(() => {
    reloadData();
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleUserChange = (updated: UserProfile) => {
    setCurrentUser(updated);
    saveCurrentUser(updated);
    showToast(`アカウントを「${updated.name} (${updated.role === "admin" ? "本部" : updated.department})」に切り替えました`);
  };

  const handleGoToMinutesWithAgenda = (agendaId: string) => {
    setSelectedAgendaIdForMinutes(agendaId);
    setActiveTab("minutes");
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-clover-700 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs font-bold text-slate-500">データを読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100/70 p-3 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <Navbar
          currentUser={currentUser}
          onUserChange={handleUserChange}
        />

        {/* タブナビゲーション（3タブ） */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            reloadData();
          }}
        />

        {/* タブコンテンツ */}
        <div className="mt-4">
          {activeTab === "agenda" && (
            <AgendaTab
              currentUser={currentUser}
              onSaved={() => {
                reloadData();
              }}
              onGoToMinutes={handleGoToMinutesWithAgenda}
              showToast={showToast}
            />
          )}

          {activeTab === "minutes" && (
            <MinutesTab
              meetingRecords={meetingRecords}
              currentUser={currentUser}
              initialAgendaId={selectedAgendaIdForMinutes}
              onSaved={() => {
                reloadData();
              }}
              onGoToHistory={() => {
                setActiveTab("history");
                reloadData();
              }}
              showToast={showToast}
            />
          )}

          {activeTab === "history" && (
            <HistoryTab
              meetingRecords={meetingRecords}
              currentUser={currentUser}
              onRefresh={reloadData}
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
