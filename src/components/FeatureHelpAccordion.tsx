"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

interface HelpItem {
  label: string;
  text: string;
}

interface FeatureHelpAccordionProps {
  title: string;
  items: HelpItem[];
  defaultOpen?: boolean;
}

export const FeatureHelpAccordion: React.FC<FeatureHelpAccordionProps> = ({
  title,
  items,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4 bg-slate-50/80 border border-slate-200 rounded-xl overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-100/70 transition cursor-pointer"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <HelpCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
          <span>{isOpen ? "閉じる" : "使い方・ポイントを見る"}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-3.5 pt-2 text-xs text-slate-700 space-y-2 border-t border-slate-200/60 bg-white/80">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="font-bold text-slate-800 flex-shrink-0 min-w-[90px]">
                {item.label}
              </span>
              <span className="text-slate-600 leading-relaxed">{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
