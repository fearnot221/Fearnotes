# blog.fearnot.tw

Fearnotes：資訊安全、CTF 與網路維運的工作日誌。延續 [fearnot.tw](https://fearnot.tw/) 的設計系統（夜班／印刷紙兩套調色盤、Literata／Fragment Mono／Noto Serif TC、琥珀方塊狀態燈、只用髮絲線分隔），以 Astro、TypeScript 與原生 CSS 建置，部署於 GitHub Pages。

## 設計重點

- **Fearnotes 開場**：游標掃描出標題，再飛進頁首成為狀態燈（與 fearnot.tw 同一個動作）。
- **便當卡片首頁**：所有文章是同一規格的卡片（封面、日期、標題、摘要、標籤永遠在同一個位置），依年份分組，以細線分格；只有最新一篇佔兩格。滑過時卡片邊緣與角落的埠燈亮起。
- **檢索**：固定在視窗頂端的模糊搜尋（按 `/` 聚焦、`Esc` 清除）：子字串、跳字（`wrshk` → Wireshark）與錯字（`wireshrak`）都找得到，結果像搜尋引擎的建議清單一樣從搜尋框下方展開（前 8 筆，依相關度排序並標出命中的字；↑↓ 選擇、Enter 開啟、Esc 關閉），卡片版面不受影響；比對規則與自我檢查在 `src/fuzzy.ts`、`node src/fuzzy.test.ts`。標籤則直接篩選卡片：預設一排、`+N` 展開，並寫進網址（`/?tag=ctf`）可直接分享；`/tags/` 以卡片列出每個標籤的篇數與最新三篇。
- **字型完整性**：中文字型只收網站實際用到的字，網址帶內容雜湊（換字型就換網址，瀏覽器不會用到缺字的舊檔）。建置時以 harfbuzz 檢查每一頁的每個字都有網站字型畫得出來，否則建置失敗、不會部署；emoji 除外。開發時存檔會自動重切字型。
- **標題轉場**：跨頁 View Transition，文章標題從卡片滑進文章頁。
- **閱讀進度**：視窗頂端的細線與騎在線頭的方塊，由捲動直接驅動（`animation-timeline: scroll()`）。
- **文章排版**：章節編號懸在左側邊界、寬螢幕目錄亮著目前所在章節、中文強調用著重號、程式碼配色跟著主題切換。
- **EOF**：每篇文章以 `■ EOF` 收尾，接上前後篇導覽。

## 寫文章

在 `src/content/posts/` 新增 Markdown 檔，檔名即網址（`hello-world.md` → `/posts/hello-world/`）：

```md
---
title: 標題
description: 一句話摘要，用於列表、RSS 與分享預覽
date: 2026-10-21
updated: 2026-10-30   # 選填
tags: [ctf, web]
lang: zh               # 選填，英文文章填 en
cover: ./cover.jpg     # 選填，相對於文章檔案的路徑
coverAlt: 封面的文字說明  # 選填，同時作為圖說
---
```

要放封面時，把文章寫成資料夾：`src/content/posts/my-post/index.md` 加上同資料夾的 `cover.jpg`（網址仍是 `/posts/my-post/`）。封面建議 16:9、寬 1600px 以上；建置時會自動縮放成 WebP，並裁成 1200×630 作為社群分享預覽圖。沒有封面的文章，卡片會顯示同尺寸的點陣佔位圖，版面不會參差。

圖片下方緊接一行 `*說明文字*` 會排成圖說；`---` 是三顆方塊的段落停頓。

## 本機開發

使用 **Node.js 24** 與 npm。

```sh
npm ci
npm run dev
```

| 指令              | 用途                                       |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | 更新開發用字型子集並啟動開發伺服器         |
| `npm run check`   | 檢查 Astro 與 TypeScript                   |
| `npm run build`   | 輸出靜態網站至 `dist/`，並依內容重建字型子集 |
| `npm run preview` | 預覽 `dist/` 的正式建置                    |

字型會依實際用到的字元子集化。首次執行會從 Google Fonts 的 GitHub 儲存庫下載來源字型至 `.fonts-cache/`；CI 以 `actions/cache` 保留，所以新文章的新字元會在部署時自動納入。本機下載失敗時沿用已提交的 `public/fonts/`；CI 下載失敗則停止部署，避免帶著缺字的字型上線。

## 部署

儲存庫：[fearnot221/blog.fearnot.tw](https://github.com/fearnot221/blog.fearnot.tw)。推送至 `main` 即由 `.github/workflows/deploy.yml` 依序執行 `npm run check`、`npm test`、`npm run build`，任何一步失敗（包含字型缺字檢查）都不會部署，正式站維持上一版。

- **GitHub Pages**：Settings → Pages 的 Source 為 **GitHub Actions**，Custom domain 為 `blog.fearnot.tw`，憑證核發後啟用 **Enforce HTTPS**。
- **DNS（Cloudflare）**：`CNAME blog → fearnot221.github.io`，Proxy 設為 **DNS only**（灰色雲朵），否則 GitHub 無法核發 HTTPS 憑證。

## 授權

字型為 Literata、Fragment Mono、Noto Serif TC，採 SIL Open Font License。
