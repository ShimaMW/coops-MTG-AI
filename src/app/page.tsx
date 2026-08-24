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
  subscribeMeetingRecords,
  getDepartments,
} from "@/lib/storage";
import { UserProfile, MeetingRecord } from "@/lib/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("minutes");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [meetingRecords, setMeetingRecords] = useState<MeetingRecord[]>([]);
  const [selectedAgendaIdForMinutes, setSelectedAgendaIdForMinutes] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const reloadData = () => {
    const u = getCurrentUser();
    setCurrentUser(u);
    const depts = getDepartments();
    setDepartments(depts);
    const records = getMeetingRecords();
    setMeetingRecords(records);
  };

  useEffect(() => {
    const u = getCurrentUser();
    setCurrentUser(u);
    const depts = getDepartments();
    setDepartments(depts);

    // リアルタイム同期リスナーの登録
    const unsubscribe = subscribeMeetingRecords((records) => {
      setMeetingRecords(records);
      setDepartments(getDepartments());
    });

    return () => unsubscribe();
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
    showToast(`アカウントを「${updated.name} (${updated.role === "admin" ? "本部管理者" : updated.department})」に切り替えました`);
  };

  const handleGoToMinutesWithAgenda = (agendaId: string) => {
    setSelectedAgendaIdForMinutes(agendaId);
    setActiveTab("minutes");
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#353F45]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs font-bold text-white/70">データを読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#353F45] p-3 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <Navbar
          currentUser={currentUser}
          onUserChange={handleUserChange}
          departments={departments}
          onDepartmentsUpdated={() => {
            setDepartments(getDepartments());
            reloadData();
          }}
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
              departments={departments}
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
              departments={departments}
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
              departments={departments}
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
