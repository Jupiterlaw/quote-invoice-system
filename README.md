# 報價及發票系統（Quote & Invoice System）

Jupiter's Design Limited 內部用嘅報價及發票系統。只供公司內部使用，唔係公開網站。

## 第一版只做三樣

1. **出報價** — 入客戶公司名、聯絡電話、地址、日期、工程項目（可多行，每行項目＋金額），系統自動計總額；報價可存、可改、可搜尋。
2. **報價一鍵轉發票** — 客確認後一鍵生成發票，內容照抄報價。發票編號自動接續：格式 `INV-2026-XXX`，由 **INV-2026-060** 起跳（001–059 已用／已預留）。發票版面用簡潔版：公司名、編號、日期、客戶名＋電話、地址一行、項目＋金額＋總額；唔加銀行資料、條款、簽名欄。可出 PDF／列印。
3. **未收錢清單** — 一眼睇晒發票狀態（未收／已收），可標記已收；報價同發票各有清單，可按客名搜尋。
4. **收據** — 發票標記「已收」後可開收據，資料自動照抄發票；收據編號自己一套 `RCT-2026-001` 起順住跳，唔重用；同一張發票只開得一張。版面同發票一樣行簡潔版，加「已全數收訖」同對應發票編號，可列印／出 PDF；另有收據清單頁。

其他已定規格：報價單注明「有效期為半年，由報價日期起計」並自動顯示到期日（發票唔加呢行）；報價同發票都有刪除掣，㩒落先彈窗確認先真刪，刪咗嘅編號唔會重用。

## 做法決定

- **B 版（2026-11-27 拍板）：** 畫面用 Meta Astryx 嗰套方式整 — 整齊嘅表格清單、填資料表格、搜尋、按鈕。Astryx 只負責畫面嗰半；背後嘅自動計數、存資料、出 PDF、編號要自己寫。
- Astryx 而家仲係試驗版（0.7.x），更新密，升版嗰陣要跟住做保養，呢點接受咗先揀 B。
- 同公司網站 jupitersdesign.com 分開，唔影響網站嗰邊。

## 程式碼

呢個 repo 入面有一套真・獨立版嘅程式（`src/`），同 Muse Space 上面行緊嗰套係同樣功能、同樣版面，但程式碼完全獨立，唔依賴 Muse 平台。

- **技術：** Vite + React 19 + TypeScript，畫面真用 Meta Astryx 0.7.17 元件（`@astryxdesign/core` 嘅 Theme、Table、Button、TextInput、Badge，配 `@astryxdesign/theme-neutral` 主題），接法跟 Astryx 官方 core README 嘅 Vite 設定（四個 CSS 順序載入 + Theme 包住成個 app，唔使用 build plugin）。
- **點行：**
  ```bash
  npm install
  npm run dev      # 本地開發（跟終端機顯示嘅網址開）
  npm run build    # 出正式版（去 dist/）
  npm run preview  # 睇正式版
  ```
- **同 Space 版嘅分別（老實講）：** Space 版啲單存喺 Muse 平台嗰邊嘅資料庫；呢個 repo 版而家接咗 **Google Sheet 做後端**（見下節），Space 版同 repo 版仍然係兩套獨立程式、啲單唔互通。

## 後端：Google Sheet（2026-11-27 接入）

- **中央倉：** Google Sheet「報價及發票系統資料」（mynathan159@gmail.com 名下），分頁「報價／發票／收據／設定」，一張單一行，項目清單以 JSON 存入「項目(JSON)」欄，總額另有獨立欄方便人眼睇數。
- **中間層：** `apps-script/Code.gs`（Google Apps Script Web App，以 mynathan159 名義部署，執行身分「我」、存取「任何人」），負責 Sheet 行 <-> 前端狀態嘅對照。Web App URL 寫喺 `src/sheetsConfig.ts`（URL 本身唔係秘密）。
- **把關：** 所有讀寫都要帶一把「存取密鑰」（Apps Script 內 SECRET 常數；repo 內只留 placeholder，真正密鑰唔入 repo）。前端喺「設定」頁入密鑰，每部機入一次，存喺嗰部機嘅 localStorage。
- **同步方式：** 開機由 Sheet 讀最新狀態（Sheet 空、本機有資料時會將本機資料推上去做首次搬遷）；每次改動 debounce 1.2 秒後成份狀態寫返去 Sheet；本機 localStorage 同時做離線快取。同一時間只用一部機改單最穩陣（成份覆寫、冇逐格合併）。
- **改 Apps Script 後要重新部署：** 編輯器改完 Code.gs，要去「部署 → 管理部署 → 編輯 → 版本：新版本 → 部署」，Web App URL 先會不變之下更新；齋儲存係唔會生效嘅。

## 文件

- `docs/PLAN.md` — 一頁紙計劃（文字版）
- `docs/one-page-plan.pdf` — 一頁紙計劃（PDF 版）

## 未做（第一版範圍外）

登入系統、網上收款／銀行功能、統計圖表、客戶自助功能。
