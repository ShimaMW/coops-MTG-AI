"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RotateCcw,
  KeyRound,
  Shield,
  Save,
  CheckCircle2,
} from "lucide-react";
import {
  getDepartments,
  saveDepartments,
  DEFAULT_DEPARTMENTS,
  getAdminPIN,
  saveAdminPIN,
} from "@/lib/storage";

interface DepartmentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepartmentsUpdated?: () => void;
}

export const DepartmentManagerModal: React.FC<DepartmentManagerModalProps> = ({
  isOpen,
  onClose,
  onDepartmentsUpdated,
}) => {
  const [departments, setDepartments] = useState<string[]>([]);
  const [newDeptName, setNewDeptName] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // PIN変更ステート
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinMessage, setPinMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDepartments(getDepartments());
      setNewDeptName("");
      setEditingIndex(null);
      setPinMessage(null);
      setCurrentPin("");
      setNewPin("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDeptName.trim();
    if (!trimmed) return;
    if (departments.includes(trimmed)) {
      alert("すでに同名の部署・事業所が存在します。");
      return;
    }
    const updated = [...departments, trimmed];
    setDepartments(updated);
    saveDepartments(updated);
    setNewDeptName("");
    if (onDepartmentsUpdated) onDepartmentsUpdated();
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(departments[index]);
  };

  const handleSaveEdit = (index: number) => {
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    const updated = [...departments];
    updated[index] = trimmed;
    setDepartments(updated);
    saveDepartments(updated);
    setEditingIndex(null);
    if (onDepartmentsUpdated) onDepartmentsUpdated();
  };

  const handleDelete = (index: number) => {
    const target = departments[index];
    if (confirm(`部署「${target}」をマスタから削除しますか？`)) {
      const updated = departments.filter((_, i) => i !== index);
      setDepartments(updated);
      saveDepartments(updated);
      if (onDepartmentsUpdated) onDepartmentsUpdated();
    }
  };

  const handleResetDefaults = () => {
    if (confirm("事業所・部署リストを初期設定に戻しますか？")) {
      setDepartments(DEFAULT_DEPARTMENTS);
      saveDepartments(DEFAULT_DEPARTMENTS);
      if (onDepartmentsUpdated) onDepartmentsUpdated();
    }
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPin = getAdminPIN();
    if (currentPin !== storedPin) {
      setPinMessage({ type: "error", text: "現在のPINコードが一致しません。" });
      return;
    }
    if (newPin.length < 4) {
      setPinMessage({ type: "error", text: "新しいPINコードは4桁以上で設定してください。" });
      return;
    }
    saveAdminPIN(newPin);
    setPinMessage({ type: "success", text: "管理者PINコードを更新しました ✓" });
    setCurrentPin("");
    setNewPin("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">事業所・部署マスタ管理</h3>
              <p className="text-[11px] text-slate-500">
                会議作成やログの絞り込みに使用される事業所リストを管理します
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. 部署一覧と追加 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                登録中の事業所・部署（{departments.length}件）
              </label>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" /> 初期値に戻す
              </button>
            </div>

            {/* リスト */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {departments.map((dept, index) => (
                <div
                  key={dept + index}
                  className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 shadow-2xs"
                >
                  {editingIndex === index ? (
                    <div className="flex items-center gap-1.5 flex-1 mr-2">
                      <input
                        type="text"
                        autoFocus
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1 px-2.5 py-1 bg-white border border-slate-400 rounded-lg text-xs font-bold outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(index)}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                        title="保存"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition"
                        title="キャンセル"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="font-bold text-slate-800">{dept}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(index)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition"
                          title="名前を変更"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(index)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white transition"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* 新規追加フォーム */}
            <form onSubmit={handleAddDept} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="新しい事業所・部署名を入力..."
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-slate-700 focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={!newDeptName.trim()}
                className="px-4 py-2 bg-[#283136] hover:bg-[#1c2226] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" /> 追加
              </button>
            </form>
          </div>

          {/* 2. 管理者PINコード変更 */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-700" />
              管理者PINコードの変更
            </label>

            <form onSubmit={handleChangePin} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">現在のPIN</span>
                  <input
                    type="password"
                    maxLength={8}
                    placeholder="現在のPIN"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">新しいPIN（4桁以上）</span>
                  <input
                    type="password"
                    maxLength={8}
                    placeholder="新しいPIN"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono outline-none"
                  />
                </div>
              </div>

              {pinMessage && (
                <div
                  className={`text-[11px] font-bold p-2 rounded-lg ${
                    pinMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {pinMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={!currentPin || !newPin}
                className="w-full py-1.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs"
              >
                <KeyRound className="w-3.5 h-3.5" /> PINコードを更新
              </button>
            </form>
          </div>
        </div>

        {/* フッター */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#283136] hover:bg-[#1c2226] text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            完了して閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
