"use client";

import React from "react";
import { Calendar, FileText, Table } from "lucide-react";

export type TabType = "agenda" | "minutes" | "history";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    { id: "agenda", label: "アジェンダ作成", icon: Calendar },
    { id: "minutes", label: "議事録作成", icon: FileText },
    { id: "history", label: "ログ・履歴一覧", icon: Table },
  ] as const;

  return (
    <div className="flex gap-1.5 p-1 bg-slate-200/80 rounded-xl mb-4 no-print overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as TabType)}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg font-medium text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
              isActive
                ? "bg-white text-clover-700 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-clover-600" : "text-slate-500"}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
