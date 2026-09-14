# `<feature-id>` — <一句話說明>

## Outcome

做完之後，使用者可以觀察到什麼改變。兩三句話，不寫實作細節。

## Projects

- `<project>`：做了什麼（合併 commit `<hash>`）。
- `<project>`：無改動。

## Delivered

### `<project>`（commit `<hash>`、`<hash>`，合併 `<hash>`）

- 交付的行為與介面。
- 新增或修改的測試，以及它們保護的行為。

### 文件

- **新增**／**更新** 哪些技術文件，改了什麼。

## Decisions

| 日期 | 決定 | 決定者 |
|---|---|---|
| YYYY-MM-DD | …… | 使用者 |
| YYYY-MM-DD | …… | agent 提出，使用者未反對 |
| YYYY-MM-DD | …… | agent（code review 確認符合規範） |

## Scope boundary（原工作項）

1. ……

## 完成條件對照

| # | 原完成條件（摘要） | 結果 |
|---|---|---|
| 1 | …… | 達成：證據在下方哪一節 |
| 2 | …… | 達成，依 Decisions 第 N 列的解讀（使用者確認） |

## Verification Evidence

### 靜態與單元

- **`<project>`**
  - baseline：…… tests／…… pass／…… skip。
  - 完成後：…… tests／…… pass／0 fail／…… skip；靜態分析結果與 baseline 相同。
  - 突變驗證：還原某改動 → 某測試紅。
- **Code review**
  - Standards：發現並修正的問題。
  - Spec：發現並修正的問題。
  - 決定不修的判斷題，以及理由。

### 部署後環境

- 部署：commit `<hash>`，時間，重啟了哪些服務、為什麼沒重啟其他服務。
- 驗證：對部署後服務的請求與回應、log 行、資料列。
- 副作用：驗證前後相關資料的對照。

### 實機

裝置型號、建置版本、操作者。

| 步驟 | 證據 |
|---|---|
| …… | log 時間與內容、截圖檔名 |

### 未驗證項目

- **某項：skipped。** 原因。
- 沒有測試覆蓋的部分，以及由哪一層驗證補上。

## 歸檔

- 計畫：`docs/plans/archive/<feature-id>-<slug>.md`
- 過程紀錄：`docs/completed/progress/YYYY-MM-DD.md`

## Follow-ups

只放**不影響本工作完成**的新工作：

- ……
