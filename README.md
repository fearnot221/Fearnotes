# Fearnotes

Fearnotes：資訊安全、CTF 與網路維運的工作日誌。延續 [fearnot.tw](https://fearnot.tw/) 的設計系統（夜班／印刷紙兩套調色盤、Literata／Fragment Mono／Noto Serif TC、琥珀方塊狀態燈、只用髮絲線分隔），以 Astro、TypeScript 與原生 CSS 建置，部署於 GitHub Pages。

## 設計重點

- **Fearnotes 開場**：游標掃描出標題，再飛進頁首成為狀態燈（與 fearnot.tw 同一個動作）。
- **便當卡片首頁**：所有文章是同一規格的卡片（封面、日期、標題、摘要、標籤永遠在同一個位置），依年份分組，以細線分格；只有最新一篇佔兩格。滑過時卡片邊緣與角落的埠燈亮起。
- **檢索**：固定在視窗頂端的模糊搜尋（按 `/` 聚焦、`Esc` 清除）：子字串、跳字（`wrshk` → Wireshark）與錯字（`wireshrak`）都找得到，結果像搜尋引擎的建議清單一樣從搜尋框下方展開（前 8 筆，依相關度排序並標出命中的字；↑↓ 選擇、Enter 開啟、Esc 關閉），卡片版面不受影響；比對規則與自我檢查在 `src/fuzzy.ts`、`node src/fuzzy.test.ts`。標籤則直接篩選卡片：預設一排、`+N` 展開，並寫進網址（`/?tag=ctf`）可直接分享；`/tags/` 以卡片列出每個標籤的篇數與最新三篇。
- **字型完整性**：中文字型只收網站實際用到的字，網址帶內容雜湊（換字型就換網址，瀏覽器不會用到缺字的舊檔）。建置時以 harfbuzz 檢查每一頁的每個字都有網站字型畫得出來，否則建置失敗、不會部署；emoji 除外。開發時存檔會自動重切字型。
- **標題轉場**：跨頁 View Transition，文章標題從卡片滑進文章頁。
- **文章排版**：寬螢幕目錄亮著目前所在章節、中文強調用著重號、程式碼配色跟著主題切換。
- **EOF**：每篇文章以 `■ EOF` 收尾，接上前後篇導覽。

## 寫文章

在 `src/content/posts/` 新增 Markdown 檔，檔名即網址（`hello-world.md` → `/p/hello-world/`）。開頭資訊的欄位、封面、支援與不支援的 Markdown 語法，見 **[WRITING.md](WRITING.md)**。

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

儲存庫：[fearnot221/Fearnotes](https://github.com/fearnot221/Fearnotes)。推送至 `main` 即由 `.github/workflows/deploy.yml` 依序執行 `npm run check`、`npm test`、`npm run build`、`npm run test:fonts`（確認缺字檢查本身仍會擋下罕用字），任何一步失敗（包含字型缺字檢查）都不會部署，正式站維持上一版。

- **GitHub Pages**：Settings → Pages 的 Source 為 **GitHub Actions**，Custom domain 為 `blog.fearnot.tw`，憑證核發後啟用 **Enforce HTTPS**。
- **DNS（Cloudflare）**：`CNAME blog → fearnot221.github.io`，Proxy 設為 **DNS only**（灰色雲朵），否則 GitHub 無法核發 HTTPS 憑證。

## 自有 CDN

圖片、字型、JS/CSS、favicon 與公開附件可透過 `https://cdn.fearnot.tw` 提供，文章、RSS、sitemap 與 canonical 網址仍留在 `https://blog.fearnot.tw`。

`cdn/worker.mjs` 是 Cloudflare Worker：只向固定的 blog 來源取檔，保留路徑與 query string，於 Cloudflare 邊緣快取 10 分鐘。字型與 JS 模組附上 CORS 標頭；錯誤不快取，文章頁與來源重新導向會回到 blog。它是快取代理，檔案仍隨 GitHub Pages 一起發布，不需要另外同步儲存桶。流量受 Cloudflare Workers 帳戶方案限制。

### 第一次啟用

1. 確認 `fearnot.tw` 由你的 Cloudflare 帳戶管理。
2. 本機執行 `npx wrangler login`，登入該帳戶，再執行 `npm run deploy:cdn`。若有多個帳戶，以 `CLOUDFLARE_ACCOUNT_ID` 指定帳戶。Wrangler 會建立 `fearnotes-cdn` Worker，並透過 Custom Domain 建立 `cdn.fearnot.tw` 的 DNS 與憑證；不要手動把 CDN CNAME 指向 GitHub Pages。
3. 等網域憑證啟用，驗證 `curl -I https://cdn.fearnot.tw/fonts/literata.woff2`：應為 `200`、`Content-Type: font/woff2` 與 `Access-Control-Allow-Origin: *`。也請確認 `https://cdn.fearnot.tw/p/hello-world/` 會重新導向 blog。
4. 在 GitHub 儲存庫 Settings → Secrets and variables → Actions → **Variables** 新增 `PUBLIC_CDN_URL`，值為 `https://cdn.fearnot.tw`（這不是密鑰），再發布這份變更。**先驗證 CDN 可用，再設定變數**，以免正式站引用尚未存在的網域。

未設定變數時，網站使用原本同網域的檔案。`npm run dev` 也使用本機檔案。要預覽 CDN 版建置：

```sh
PUBLIC_CDN_URL=https://cdn.fearnot.tw npm run build
npm run preview
```

Astro 的 `assetsPrefix` 處理建置產生的圖片、`srcset` 與 JS/CSS；字型網址保留內容雜湊；建置後處理會將 HTML 中指向 `public/` 實際存在檔案的 `src`、`srcset`、`poster`、`href` 與分享圖片改至 CDN，包含 Markdown 的圖片、附件與原生 HTML。不會修改文章連結、外站連結、程式碼範例或 inline data URL。

需要自訂固定圖片網址時，將檔案放在 `public/blog/`，例如 `public/blog/photo.webp` 對應 `https://cdn.fearnot.tw/blog/photo.webp`，文章以 `/blog/photo.webp` 引用。這類公開檔案會保留原檔名與格式，請先壓縮圖片，並在 HTML 的 `img` 標示原始寬高以預留空間。文章旁的相對路徑圖片仍會由 Astro 最佳化並產生帶雜湊的網址；下載附件放在 `public/downloads/`，例如 `[下載筆記](/downloads/notes.pdf)`。外部圖片請先在有權使用的前提下存入專案，再改用本機路徑，否則外部網址仍會直接請求原站。自行撰寫的 inline style、public CSS 或 JS 若引用 `/images/...` 等固定路徑，請直接使用完整 CDN 網址；這些字串不屬於 HTML 資源屬性，不會被後處理改寫。

更新 Worker 時重跑 `npm run deploy:cdn`；一般文章與素材仍沿用 GitHub Pages 發布流程。相同檔名的檔案更新最多可能延遲 10 分鐘，需即時更新時請換檔名。若要停用 CDN，刪除 GitHub 的 `PUBLIC_CDN_URL` 變數並重新部署 blog，再移除 Worker。

參考：[Cloudflare fetch 快取](https://developers.cloudflare.com/workers/examples/cache-using-fetch/)、[Worker Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)。

## 授權

字型為 Literata、Fragment Mono、Noto Serif TC，採 SIL Open Font License。
