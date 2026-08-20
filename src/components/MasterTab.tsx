"use client";

import React, { useState } from "react";
import { MasterData, UserProfile } from "@/lib/types";
import { saveMasterData } from "@/lib/storage";
import { Users, Building2, ListOrdered, Plus, Trash2, Shield, CheckCircle2 } from "lucide-react";

interface MasterTabProps {
  masterData: MasterData;
  currentUser: UserProfile;
  onUpdate: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export const MasterTab: React.FC<MasterTabProps> = ({
  masterData,
  currentUser,
  onUpdate,
  showToast,
}) => {
  // 新規スタッフ入力
  const [empDept, setEmpDept] = useState(masterData.departments[0] || "");
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("");

  // 新規部署入力
  const [newDept, setNewDept] = useState("");

  // 新規会議種別入力
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDesc, setNewTypeDesc] = useState("");

  const isAdmin = currentUser.role === "admin";

  // スタッフ追加
  const handleAddEmployee = () => {
    if (!empName.trim() || !empDept) {
      showToast("部署名と氏名は必須です", "error");
      return;
    }

    const newEmp = {
      id: "emp_" + Date.now(),
      dept: empDept,
      name: empName.trim(),
      role: empRole.trim(),
    };

    const updated: MasterData = {
      ...masterData,
      employees: [...masterData.employees, newEmp],
    };

    saveMasterData(updated);
    setEmpName("");
    setEmpRole("");
    showToast(`${newEmp.name}さんを登録しました ✓`);
    onUpdate();
  };

  // スタッフ削除
  const handleDeleteEmployee = (id: string, name: string) => {
    if (!confirm(`${name}さんをマスタから削除しますか？`)) return;

    const updated: MasterData = {
      ...masterData,
      employees: masterData.employees.filter((e) => e.id !== id),
    };

    saveMasterData(updated);
    showToast("スタッフを削除しました ✓");
    onUpdate();
  };

  // 部署追加
  const handleAddDept = () => {
    if (!newDept.trim()) return;
    if (masterData.departments.includes(newDept.trim())) {
      showToast("すでに存在する部署名です", "error");
      return;
    }

    const updated: MasterData = {
      ...masterData,
      departments: [...masterData.departments, newDept.trim()],
    };

    saveMasterData(updated);
    setNewDept("");
    showToast(`部署「${newDept}」を追加しました ✓`);
    onUpdate();
  };

  // 会議種別追加
  const handleAddType = () => {
    if (!newTypeName.trim()) return;

    const updated: MasterData = {
      ...masterData,
      meetingTypes: [
        ...masterData.meetingTypes,
        {
          id: "type_" + Date.now(),
          name: newTypeName.trim(),
          desc: newTypeDesc.trim(),
        },
      ],
    };

    saveMasterData(updated);
    setNewTypeName("");
    setNewTypeDesc("");
    showToast(`会議種別「${newTypeName}」を追加しました ✓`);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* 権限についてのアラート */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        <div className="text-xs text-emerald-900 leading-relaxed">
          <span className="font-bold">Googleアカウント & 組織権限管理:</span>{" "}
          本部（Admin）アカウントは全部署の議事録・マスタを全権管理できます。各スタッフ（Staff）は所属部署のデータを作成・管理します。
        </div>
      </div>

      {/* 1. 従業員マスタ */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-clover-700" />
          従業員・参加者マスタ（{masterData.employees.length}名）
        </h3>

        {/* 追加フォーム */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">部署</label>
            <select
              value={empDept}
              onChange={(e) => setEmpDept(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-clover-600"
            >
              {masterData.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">氏名</label>
            <input
              type="text"
              placeholder="山田 花子"
              value={empName}
              onChange={(e) => setEmpName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-clover-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">役職・職種</label>
            <input
              type="text"
              placeholder="管理者 / 看護師 / PT 等"
              value={empRole}
              onChange={(e) => setEmpRole(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-clover-600"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddEmployee}
              className="w-full py-1.5 bg-clover-700 hover:bg-clover-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" /> 追加
            </button>
          </div>
        </div>

        {/* 一覧 */}
        <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
          {masterData.employees.map((emp) => (
            <div key={emp.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-700">{emp.name}</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px]">
                  {emp.dept}
                </span>
                {emp.role && <span className="text-slate-400">{emp.role}</span>}
              </div>
              <button
                onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                className="text-red-500 hover:bg-red-50 p-1 rounded transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 部署 & 会議種別マスタ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 部署マスタ */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-clover-700" />
            部署マスタ
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="新規部署名..."
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-clover-600"
            />
            <button
              onClick={handleAddDept}
              className="px-3.5 py-1.5 bg-clover-700 text-white font-bold text-xs rounded-xl flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> 追加
            </button>
          </div>

          <div className="space-y-1.5">
            {masterData.departments.map((d) => (
              <div key={d} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                🏢 {d}
              </div>
            ))}
          </div>
        </div>

        {/* 会議種別マスタ */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-clover-700" />
            会議種別マスタ
          </h3>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="会議種別名（例: ケアマネ定例）"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-clover-600"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="説明・概要"
                value={newTypeDesc}
                onChange={(e) => setNewTypeDesc(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-clover-600"
              />
              <button
                onClick={handleAddType}
                className="px-3.5 py-1.5 bg-clover-700 text-white font-bold text-xs rounded-xl flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> 追加
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {masterData.meetingTypes.map((t) => (
              <div key={t.id} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div className="font-bold text-slate-800">📋 {t.name}</div>
                {t.desc && <div className="text-[11px] text-slate-500">{t.desc}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
