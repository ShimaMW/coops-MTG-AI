// =========================================================================
// Google Gemini File API 直接アップロードヘルパー（Vercel 4.5MB制限を完全バイパス）
// =========================================================================

export interface UploadProgressInfo {
  percent: number;
  status: "idle" | "requesting_session" | "uploading" | "completed" | "error";
  fileUri?: string;
  mimeType?: string;
  error?: string;
}

export async function uploadLargeAudioDirectly(
  file: File | Blob,
  fileName: string,
  mimeType: string,
  onProgress?: (info: UploadProgressInfo) => void
): Promise<{ fileUri: string; mimeType: string }> {
  try {
    if (onProgress) {
      onProgress({ percent: 5, status: "requesting_session" });
    }

    // 1. Google Gemini アップロードURLのセッション発行（メタデータのみ送信）
    const sessionRes = await fetch("/api/upload/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: fileName || "audio_recording",
        mimeType: mimeType || "audio/m4a",
        numBytes: file.size,
      }),
    });

    if (!sessionRes.ok) {
      const err = await sessionRes.json();
      throw new Error(err.error || "アップロードセッションの開始に失敗しました");
    }

    const { uploadUrl } = await sessionRes.json();
    if (!uploadUrl) {
      throw new Error("アップロードURLが取得できませんでした");
    }

    if (onProgress) {
      onProgress({ percent: 15, status: "uploading" });
    }

    // 2. ブラウザからGoogleへ直接ファイルバイナリを送信（Vercelを経由しない）
    // XHRを使ってリアルタイム進捗を取得
    const uploadResult = await new Promise<{ fileUri: string; mimeType: string }>(
      (resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", mimeType || "audio/m4a");
        xhr.setRequestHeader("X-Goog-Upload-Command", "upload, finalize");
        xhr.setRequestHeader("X-Goog-Upload-Offset", "0");

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            const pct = 15 + Math.round((e.loaded / e.total) * 80); // 15% -> 95%
            onProgress({ percent: Math.min(pct, 95), status: "uploading" });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const resData = JSON.parse(xhr.responseText);
              const fileUri = resData.file?.uri || resData.fileUri;
              const resMime = resData.file?.mimeType || mimeType;

              if (!fileUri) {
                reject(new Error("GoogleからファイルURIが返されませんでした"));
                return;
              }

              if (onProgress) {
                onProgress({ percent: 100, status: "completed", fileUri, mimeType: resMime });
              }
              resolve({ fileUri, mimeType: resMime });
            } catch (err: any) {
              reject(new Error("Googleレスポンスの解析に失敗しました: " + err.message));
            }
          } else {
            reject(new Error(`Google直接アップロード失敗 (${xhr.status}): ${xhr.responseText}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Googleへの直接通信中にネットワークエラーが発生しました"));
        };

        xhr.send(file);
      }
    );

    return uploadResult;
  } catch (error: any) {
    if (onProgress) {
      onProgress({ percent: 0, status: "error", error: error.message });
    }
    throw error;
  }
}
