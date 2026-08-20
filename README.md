# COOPs 議事録AI (Next.js + Gemini 3.5 Flash-Lite)

介護事業所向け 次世代AIミーティングアシスタント

## 主な機能・特徴

1. **Gemini 3.5 Flash-Lite による高精度解析**
   - 介護現場特有の理念・観点（利用者本位、安全管理、チーム連携、クローバーイズム）を深く理解したプロンプト設計。
   - Structured Outputs（型安全JSON）による100%パースエラーのない高速・安定出力。

2. **社内浸透しているボイスメモ（.m4a等）に完全対応**
   - iPhoneボイスメモ（`.m4a`）、Android録音、PCファイル（`.mp3`, `.wav` 等）をドラッグ＆ドロップまたはタップで即時取り込み。
   - 最長2〜3時間の大容量会議音声にも耐えうる処理パイプライン。

3. **ブラウザ直接録音（スマホスリープ防止 & リアルタイムプレビュー）**
   - **Screen Wake Lock API**: 長時間録音中もスマホ画面の自動消灯・スリープを防止。
   - **Web Speech API**: 会議中の発言をリアルタイムで文字起こしプレビュー。
   - **音量ビジュアライザー**: マイク入力レベルをリアルタイム表示し、録音ミスを防止。

4. **アジェンダ作成 ➔ 議事録のシームレス連携**
   - 事前アジェンダで設定した議題・参加者を、議事録作成時にワンクリックで呼び出し。

5. **柔軟な権限管理（Googleアカウント / @gmail.com 混在対応）**
   - 本部管理者（Admin）: 全部署のデータ閲覧・編集・削除、マスタ管理。
   - 部署スタッフ（Staff）: 自部署のデータ作成・管理。

6. **多彩なエクスポート**
   - Word (`.docx`) ワンクリック生成・ダウンロード
   - クリップボードコピー（整形テキスト / Markdown）
   - 印刷レイアウト最適化（`@media print`）

---

## ローカル開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定（.env.local）
# GEMINI_API_KEY=your_api_key_here
# GEMINI_MODEL=gemini-2.5-flash-lite

# 開発サーバーの起動
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

---

## Vercel へのデプロイ手順

1. GitHub リポジトリを作成し、本コードをプッシュします。
2. [Vercel Dashboard](https://vercel.com) にて `Add New Project` からリポジトリをインポートします。
3. **Environment Variables** に以下を設定してデプロイします：
   - `GEMINI_API_KEY`: Google AI Studioで取得したAPIキー
   - `GEMINI_MODEL`: `gemini-2.5-flash-lite`（または `gemini-3.5-flash-lite`）
