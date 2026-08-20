"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileAudio, CheckCircle2, X } from "lucide-react";

interface AudioUploaderProps {
  onFileLoaded: (base64: string, mimeType: string, fileName: string, textContent?: string) => void;
  onClear: () => void;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({ onFileLoaded, onClear }) => {
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file) return;

    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    setSelectedFile({ name: file.name, size: `${sizeMB} MB` });

    // テキスト系ファイルの場合はテキスト抽出
    if (
      file.type.startsWith("text/") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".csv")
    ) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onFileLoaded("", file.type || "text/plain", file.name, text);
      };
      reader.readAsText(file);
    } else {
      // 音声・バイナリファイル
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        const mimeType = file.type || (file.name.endsWith(".m4a") ? "audio/m4a" : "audio/mp3");
        onFileLoaded(base64, mimeType, file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClear();
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
      }}
      onClick={() => {
        if (!selectedFile) fileInputRef.current?.click();
      }}
      className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
        selectedFile
          ? "border-emerald-500 bg-emerald-50/50"
          : isDragging
          ? "border-clover-600 bg-clover-50"
          : "border-slate-300 hover:border-clover-500 bg-slate-50/70"
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
        }}
        accept="audio/*,.m4a,.mp3,.wav,.aac,.webm,text/plain,.txt,.md,.csv"
        className="hidden"
      />

      {selectedFile ? (
        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-200 shadow-sm">
          <div className="flex items-center gap-3 text-left overflow-hidden">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <FileAudio className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-slate-800 truncate">{selectedFile.name}</div>
              <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 取り込み完了 ({selectedFile.size})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-clover-100 text-clover-700 flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">ボイスメモ / 録音ファイルを選択</div>
            <div className="text-xs text-slate-500 mt-0.5">
              iPhoneボイスメモ(.m4a)、mp3、wav、テキストファイル等（ドラッグ＆ドロップ対応）
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
