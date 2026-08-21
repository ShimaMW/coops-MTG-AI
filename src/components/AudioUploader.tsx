"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileAudio, Image as ImageIcon, FileText, CheckCircle2, X, FolderOpen, FileCode } from "lucide-react";

interface MediaUploaderProps {
  title?: string;
  subtitle?: string;
  accept?: string;
  onFileLoaded: (
    data: {
      audioBase64?: string;
      audioMimeType?: string;
      imageBase64?: string;
      imageMimeType?: string;
      textContent?: string;
      fileName: string;
      size: string;
      fileType: "audio" | "image" | "text" | "pdf";
    }
  ) => void;
  onClear: () => void;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  title = "事前資料を選択",
  subtitle = "PDF・Word・ホワイトボード写真・企画メモ等 (.pdf, .jpg, .txt)",
  accept = "audio/*,.m4a,.mp3,.wav,.aac,.webm,image/*,.jpg,.jpeg,.png,.webp,application/pdf,.pdf,text/plain,.txt,.md,.csv,.doc,.docx",
  onFileLoaded,
  onClear,
}) => {
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    type: "audio" | "image" | "text" | "pdf";
    previewUrl?: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file) return;

    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const mime = file.type || "";

    // 1. PDF ファイル（Gemini 3.5 は直接PDF解析可能）
    if (mime === "application/pdf" || /\.pdf$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const full = e.target?.result as string;
        const base64 = full.split(",")[1];
        setSelectedFile({ name: file.name, size: `${sizeMB} MB`, type: "pdf" });
        onFileLoaded({
          imageBase64: base64,
          imageMimeType: "application/pdf",
          fileName: file.name,
          size: `${sizeMB} MB`,
          fileType: "pdf",
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    // 2. 画像ファイル（ホワイトボード写真・手書きメモ・写真）
    if (mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic)$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const full = e.target?.result as string;
        const base64 = full.split(",")[1];
        const previewUrl = URL.createObjectURL(file);
        setSelectedFile({ name: file.name, size: `${sizeMB} MB`, type: "image", previewUrl });
        onFileLoaded({
          imageBase64: base64,
          imageMimeType: mime || "image/jpeg",
          fileName: file.name,
          size: `${sizeMB} MB`,
          fileType: "image",
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    // 3. テキスト・マークダウン・CSV・Word等のテキスト抽出
    if (
      mime.startsWith("text/") ||
      /\.(txt|md|csv)$/i.test(file.name)
    ) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setSelectedFile({ name: file.name, size: `${sizeMB} MB`, type: "text" });
        onFileLoaded({
          textContent: text,
          fileName: file.name,
          size: `${sizeMB} MB`,
          fileType: "text",
        });
      };
      reader.readAsText(file);
      return;
    }

    // 4. 音声ファイル（ボイスメモ .m4a, .mp3, .wav 等）
    if (mime.startsWith("audio/") || /\.(m4a|mp3|wav|aac|webm|ogg)$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        const audioMime = mime || (file.name.endsWith(".m4a") ? "audio/m4a" : "audio/mp3");
        setSelectedFile({ name: file.name, size: `${sizeMB} MB`, type: "audio" });
        onFileLoaded({
          audioBase64: base64,
          audioMimeType: audioMime,
          fileName: file.name,
          size: `${sizeMB} MB`,
          fileType: "audio",
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    // その他汎用テキスト読み込みフォールバック
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setSelectedFile({ name: file.name, size: `${sizeMB} MB`, type: "text" });
      onFileLoaded({
        textContent: text,
        fileName: file.name,
        size: `${sizeMB} MB`,
        fileType: "text",
      });
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (selectedFile?.previewUrl) {
      URL.revokeObjectURL(selectedFile.previewUrl);
    }
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
      className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer h-full min-h-[190px] flex flex-col justify-center items-center ${
        selectedFile
          ? "border-slate-400 bg-slate-100/70"
          : isDragging
          ? "border-slate-500 bg-slate-200/50"
          : "border-slate-300 hover:border-slate-400 bg-slate-50/70"
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
        }}
        accept={accept}
        className="hidden"
      />

      {selectedFile ? (
        <div className="w-full flex items-center justify-between bg-white p-3 rounded-xl border border-slate-300 shadow-sm">
          <div className="flex items-center gap-3 text-left overflow-hidden">
            <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center flex-shrink-0">
              {selectedFile.type === "pdf" ? (
                <FileCode className="w-5 h-5 text-red-600" />
              ) : selectedFile.type === "image" ? (
                <ImageIcon className="w-5 h-5 text-slate-700" />
              ) : selectedFile.type === "text" ? (
                <FileText className="w-5 h-5 text-slate-700" />
              ) : (
                <FileAudio className="w-5 h-5 text-slate-700" />
              )}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-slate-800 truncate">{selectedFile.name}</div>
              <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" /> 取り込み完了 ({selectedFile.size}・
                {selectedFile.type === "pdf"
                  ? "PDF解析"
                  : selectedFile.type === "image"
                  ? "写真OCR解析"
                  : selectedFile.type === "audio"
                  ? "音声解析"
                  : "テキスト"})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">{title}</div>
            <div className="text-xs text-slate-500 mt-0.5 max-w-[280px] leading-tight">
              {subtitle}
            </div>
          </div>
          <button
            type="button"
            className="mt-1 px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-700" />
            ファイルを選択
          </button>
        </div>
      )}
    </div>
  );
};
