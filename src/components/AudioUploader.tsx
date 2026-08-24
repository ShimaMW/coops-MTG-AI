"use client";

import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, FileAudio, Image as ImageIcon, FileText, CheckCircle2, X, FolderOpen, FileCode, Plus, Loader2 } from "lucide-react";
import { UploadedFileItem } from "@/lib/types";
import { uploadLargeAudioDirectly } from "@/lib/geminiFileUpload";

interface MediaUploaderProps {
  title?: string;
  subtitle?: string;
  accept?: string;
  allowMultiple?: boolean;
  initialFiles?: UploadedFileItem[];
  onFilesChanged?: (items: UploadedFileItem[]) => void;
  // 単一ファイル向け後方互換
  onFileLoaded?: (data: {
    audioBase64?: string;
    audioMimeType?: string;
    audioFileUri?: string; // Google Gemini File API URI
    imageBase64?: string;
    imageMimeType?: string;
    textContent?: string;
    fileName: string;
    size: string;
    fileType: "audio" | "image" | "text" | "pdf";
  }) => void;
  onClear?: () => void;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  title = "事前資料を選択",
  subtitle = "PDF・Word・画像等 (.pdf, .docx, .jpg)",
  accept = "audio/*,.m4a,.mp3,.wav,.aac,.webm,image/*,.jpg,.jpeg,.png,.webp,application/pdf,.pdf,text/plain,.txt,.md,.csv,.doc,.docx",
  allowMultiple = true,
  initialFiles = [],
  onFilesChanged,
  onFileLoaded,
  onClear,
}) => {
  const [fileList, setFileList] = useState<UploadedFileItem[]>(initialFiles);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; label: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialFiles) {
      setFileList(initialFiles);
    }
  }, [initialFiles]);

  // 画像の自動リサイズ＆圧縮（最大幅/高1600px、JPEG 80%に圧縮して通信容量を1/10〜1/20に削減）
  const compressImage = (file: File): Promise<{ base64: string; mimeType: string; previewUrl: string; sizeMB: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
            const base64 = compressedDataUrl.split(",")[1];
            const approxBytes = (base64.length * 3) / 4;
            const sizeMB = (approxBytes / (1024 * 1024)).toFixed(2);
            resolve({
              base64,
              mimeType: "image/jpeg",
              previewUrl: compressedDataUrl,
              sizeMB: `${sizeMB} MB`,
            });
            return;
          }
          const full = e.target?.result as string;
          resolve({
            base64: full.split(",")[1],
            mimeType: file.type || "image/jpeg",
            previewUrl: URL.createObjectURL(file),
            sizeMB: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          });
        };
        img.onerror = () => {
          const full = e.target?.result as string;
          resolve({
            base64: full.split(",")[1],
            mimeType: file.type || "image/jpeg",
            previewUrl: URL.createObjectURL(file),
            sizeMB: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file: File): Promise<UploadedFileItem & { fileUri?: string }> => {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const mime = file.type || "";
    const id = "file_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);

    // 1. 画像（自動圧縮）
    if (mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic)$/i.test(file.name)) {
      const compressed = await compressImage(file);
      return {
        id,
        name: file.name,
        size: compressed.sizeMB,
        type: "image",
        base64: compressed.base64,
        mimeType: compressed.mimeType,
        previewUrl: compressed.previewUrl,
      };
    }

    // 2. PDF
    if (mime === "application/pdf" || /\.pdf$/i.test(file.name)) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const full = e.target?.result as string;
          const base64 = full.split(",")[1];
          resolve({
            id,
            name: file.name,
            size: `${sizeMB} MB`,
            type: "pdf",
            base64,
            mimeType: "application/pdf",
          });
        };
        reader.readAsDataURL(file);
      });
    }

    // 3. テキスト・CSV・Markdown・Word等のテキスト抽出
    if (mime.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name)) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          resolve({
            id,
            name: file.name,
            size: `${sizeMB} MB`,
            type: "text",
            textContent: text,
          });
        };
        reader.readAsText(file);
      });
    }

    // 4. 音声（大容量対応：1時間・2時間の音声でもGoogle File APIへ直接送信）
    if (mime.startsWith("audio/") || /\.(m4a|mp3|wav|aac|webm|ogg)$/i.test(file.name)) {
      const audioMime = mime || (file.name.endsWith(".m4a") ? "audio/m4a" : "audio/mp3");
      const sizeMBNum = file.size / (1024 * 1024);

      // 2MB以上の場合は Google Gemini File API に直接アップロード（Vercel 4.5MB制限を完全回避）
      if (sizeMBNum >= 2.0) {
        setUploadProgress({ percent: 10, label: "Google Cloudへ直接送信中..." });
        try {
          const result = await uploadLargeAudioDirectly(file, file.name, audioMime, (info) => {
            setUploadProgress({
              percent: info.percent,
              label: info.percent >= 100 ? "送信完了 ✓" : `Google Cloudへ送信中... ${info.percent}%`,
            });
          });

          return {
            id,
            name: file.name,
            size: `${sizeMB} MB`,
            type: "audio",
            fileUri: result.fileUri,
            mimeType: result.mimeType,
          };
        } catch (err: any) {
          console.error("Direct upload failed, fallback to base64:", err);
        } finally {
          setTimeout(() => setUploadProgress(null), 1500);
        }
      }

      // 2MB未満は Base64 エンコード
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = (e.target?.result as string).split(",")[1];
          resolve({
            id,
            name: file.name,
            size: `${sizeMB} MB`,
            type: "audio",
            base64,
            mimeType: audioMime,
          });
        };
        reader.readAsDataURL(file);
      });
    }

    // その他汎用
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve({
          id,
          name: file.name,
          size: `${sizeMB} MB`,
          type: "text",
          textContent: text,
        });
      };
      reader.readAsText(file);
    });
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const newItems: (UploadedFileItem & { fileUri?: string })[] = [];

    for (const f of fileArray) {
      const item = await processFile(f);
      newItems.push(item);
    }

    const updatedList = allowMultiple ? [...fileList, ...newItems] : newItems;
    setFileList(updatedList);

    if (onFilesChanged) {
      onFilesChanged(updatedList);
    }

    // 後方互換性ハンドラ
    if (newItems.length > 0 && onFileLoaded) {
      const first = newItems[0];
      onFileLoaded({
        audioBase64: first.type === "audio" ? first.base64 : undefined,
        audioMimeType: first.type === "audio" ? first.mimeType : undefined,
        audioFileUri: first.type === "audio" ? first.fileUri : undefined,
        imageBase64: first.type === "image" || first.type === "pdf" ? first.base64 : undefined,
        imageMimeType: first.type === "image" || first.type === "pdf" ? first.mimeType : undefined,
        textContent: first.textContent,
        fileName: first.name,
        size: first.size,
        fileType: first.type,
      });
    }
  };

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = fileList.filter((f) => f.id !== id);
    setFileList(updated);
    if (onFilesChanged) {
      onFilesChanged(updated);
    }
    if (updated.length === 0 && onClear) {
      onClear();
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileList([]);
    if (onFilesChanged) onFilesChanged([]);
    if (onClear) onClear();
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => {
        if (fileList.length === 0) fileInputRef.current?.click();
      }}
      className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all h-full min-h-[190px] flex flex-col justify-center ${
        fileList.length > 0
          ? "border-slate-300 bg-slate-100/50 cursor-default"
          : isDragging
          ? "border-slate-500 bg-slate-200/60 cursor-pointer"
          : "border-slate-300 hover:border-slate-400 bg-slate-50/70 cursor-pointer"
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
        }}
        accept={accept}
        multiple={allowMultiple}
        className="hidden"
      />

      {/* 大容量音声アップロード中のプログレスバー */}
      {uploadProgress && (
        <div className="mb-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm text-left">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700" />
              {uploadProgress.label}
            </span>
            <span>{uploadProgress.percent}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#283136] h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {fileList.length > 0 ? (
        <div className="w-full flex flex-col gap-2">
          {/* ヘッダー情報 */}
          <div className="flex items-center justify-between text-left px-1">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-slate-700" />
              添付ファイル一覧（{fileList.length}件）
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-slate-700 hover:text-slate-900 font-bold bg-white hover:bg-slate-100 border border-slate-300 px-2 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition"
              >
                <Plus className="w-3 h-3" /> ファイルを追加
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-slate-400 hover:text-red-600 transition"
              >
                すべてクリア
              </button>
            </div>
          </div>

          {/* ファイルリスト（スクロール可能） */}
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-0.5">
            {fileList.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs text-left"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                    {file.type === "pdf" ? (
                      <FileCode className="w-4 h-4 text-red-600" />
                    ) : file.type === "image" ? (
                      <ImageIcon className="w-4 h-4 text-slate-700" />
                    ) : file.type === "text" ? (
                      <FileText className="w-4 h-4 text-slate-700" />
                    ) : (
                      <FileAudio className="w-4 h-4 text-slate-700" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-[260px]">
                      {file.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {file.size} ・ {file.type === "pdf" ? "PDF" : file.type === "image" ? "画像" : file.type === "audio" ? "音声（クラウド連携）" : "テキスト"}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleRemoveItem(file.id, e)}
                  className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition hover:bg-slate-50"
                  title="削除"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
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
