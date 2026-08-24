"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, AlertCircle, Sparkles, CheckCircle2, RotateCcw, Trash2, Volume2 } from "lucide-react";

interface AudioRecorderProps {
  initialAudioBase64?: string | null;
  initialAudioMimeType?: string | null;
  onRecordingComplete: (base64: string, mimeType: string, transcriptText?: string) => void;
  onClearAudio?: () => void;
  onLiveTranscript?: (text: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  initialAudioBase64,
  initialAudioMimeType,
  onRecordingComplete,
  onClearAudio,
  onLiveTranscript,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordedDuration, setRecordedDuration] = useState<number | null>(null);
  const [hasAudio, setHasAudio] = useState(!!initialAudioBase64);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [liveText, setLiveText] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      setIsSupported(hasMedia);
    }
  }, []);

  useEffect(() => {
    if (initialAudioBase64) {
      setHasAudio(true);
      const mime = initialAudioMimeType || "audio/webm";
      try {
        const byteCharacters = atob(initialAudioBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      } catch (e) {
        console.warn("Audio Base64 parse error:", e);
      }
    } else {
      setHasAudio(false);
      setAudioUrl(null);
    }
  }, [initialAudioBase64, initialAudioMimeType]);

  // Screen Wake Lock（スリープ防止）
  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      }
    } catch (err) {
      console.warn("Wake Lock Error:", err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.warn("Wake Lock Release Error:", err);
      }
    }
  };

  // 録音開始
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      setLiveText("");
      setDuration(0);
      setRecordedDuration(null);
      setHasAudio(false);
      setAudioUrl(null);

      // MediaRecorder 設定
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setHasAudio(true);

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          onRecordingComplete(base64, mimeType, liveText);
        };
        reader.readAsDataURL(audioBlob);

        // クリーンアップ
        stream.getTracks().forEach((t) => t.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      // 音量ビジュアライザ
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const updateLevel = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Web Speech API（リアルタイム文字起こし）
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "ja-JP";

        let currentTranscript = "";
        recognition.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              currentTranscript += event.results[i][0].transcript + "\n";
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          const full = (currentTranscript + interim).trim();
          setLiveText(full);
          if (onLiveTranscript) onLiveTranscript(full);
        };

        recognition.onerror = (e: any) => console.warn("Speech recognition error:", e);
        recognition.start();
        recognitionRef.current = recognition;
      }

      mediaRecorder.start(1000);
      setIsRecording(true);
      await requestWakeLock();

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Mic Access Error:", err);
      alert("マイクへのアクセスが拒否されたか、利用できません。ブラウザの設定をご確認ください。");
    }
  };

  // 録音停止
  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setRecordedDuration(duration);
    setIsRecording(false);
    setAudioLevel(0);
    await releaseWakeLock();
  };

  const handleClear = () => {
    setHasAudio(false);
    setAudioUrl(null);
    setRecordedDuration(null);
    setLiveText("");
    if (onClearAudio) onClearAudio();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        お使いのブラウザでは直接マイク録音に対応していません。ボイスメモ等のファイルアップロードをご利用ください。
      </div>
    );
  }

  // 録音データ保持時のUI（視覚的にセットされていることが明確にわかる）
  if (hasAudio && !isRecording) {
    return (
      <div className="border-2 border-emerald-300 bg-emerald-50/60 rounded-2xl p-4 transition-all text-center h-full min-h-[190px] flex flex-col justify-between items-center shadow-xs">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>録音データを保持中 ✓</span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] text-slate-400 hover:text-red-600 flex items-center gap-1 transition"
            title="録音を解除"
          >
            <Trash2 className="w-3.5 h-3.5" /> 解除
          </button>
        </div>

        <div className="my-1.5 w-full flex flex-col items-center gap-2">
          <div className="text-xs font-bold text-slate-800">
            🎙️ マイク録音音声（セット完了）
            {recordedDuration ? ` (${formatTime(recordedDuration)})` : ""}
          </div>

          {/* 音声試聴プレイヤー */}
          {audioUrl && (
            <audio controls src={audioUrl} className="w-full max-w-[260px] h-8 outline-none" />
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={startRecording}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            再録音する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-2 rounded-2xl p-4 transition-all text-center h-full min-h-[190px] flex flex-col justify-center items-center ${
        isRecording
          ? "border-red-500 bg-red-50/50 shadow-md ring-4 ring-red-100"
          : "border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/70"
      }`}
    >
      <div className="flex flex-col items-center justify-center gap-2.5">
        {/* アイコン & アニメーション */}
        <div className="relative">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isRecording ? "bg-red-500 text-white animate-pulse" : "bg-slate-200 text-slate-700"
            }`}
          >
            {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </div>
          {isRecording && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] text-white font-bold items-center justify-center">
                ●
              </span>
            </span>
          )}
        </div>

        {/* 状態 & 時間 */}
        <div>
          <div className="text-sm font-bold text-slate-800">
            {isRecording ? "会議を録音中（スリープ防止中）" : "マイクで直接録音"}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {isRecording ? (
              <span className="text-red-600 font-bold text-base font-mono">{formatTime(duration)}</span>
            ) : (
              "タップして録音を開始（スリープ自動防止）"
            )}
          </div>
        </div>

        {/* 音声レベルバー */}
        {isRecording && (
          <div className="w-40 bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-red-500 h-full transition-all duration-75"
              style={{ width: `${audioLevel}%` }}
            ></div>
          </div>
        )}

        {/* 操作ボタン */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-5 py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 transition-all shadow-sm ${
            isRecording
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-[#283136] hover:bg-[#1c2226] text-white"
          }`}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4" /> 録音を停止して確定
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" /> 録音スタート
            </>
          )}
        </button>

        {/* リアルタイム文字起こしプレビュー */}
        {isRecording && liveText && (
          <div className="w-full mt-2 p-2.5 bg-white border border-red-200 rounded-xl text-left">
            <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              リアルタイム文字起こしプレビュー:
            </div>
            <p className="text-xs text-slate-700 max-h-20 overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {liveText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
