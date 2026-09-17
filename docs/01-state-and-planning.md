# ① 狀態與規劃

> **對應自我介紹第一段**：所有工作集中在一份狀態檔，每張票都要寫清楚完成條件、刻意不做的範圍和唯一的下一步，並用腳本檢查狀態是否矛盾。複雜需求會先寫計畫，動工前再對照實際程式碼審一輪。

## 名詞

| 名詞 | 意思 |
|---|---|
| **工作項**（feature） | 狀態檔裡的一筆，代表一次要交付的完整成果 |
| **切片票**（ticket） | `to-tickets` 從一個工作項切出來、可獨立驗證的垂直切片，見 [② 拆票](02-ticketing.md) |
| **project** | `projects.json` 登記的 repo id；同時動到多個 repo 的工作項填 `root` |

口語上說的「票」，在狀態、實作與驗收的語境指**工作項**，在拆票的語境指**切片票**。

## 唯一狀態來源

`feature_list.json` 是整個 workspace **唯一**的狀態權威，所有 repo 的工作項都在這一份，唯一鍵是 `(project, id)`。

其他檔案都只記脈絡，**不能表達狀態**：

| 檔案 | 放什麼 | 不放什麼 |
|---|---|---|
| `progress.md` | 未完成工作的過程紀錄 | 目前狀態；已完成的紀錄 |
| `session-handoff.md` | 中斷中工作的交接快照，每個工作項一節 | 平行的狀態；已 `pass` 的工作項 |
| `docs/plans/active/` | 複雜工作的執行計畫 | 目前狀態 |
| `docs/plans/archive/` | 完成後移入的計畫，封存後不再更新 | — |
| `docs/completed/` | 完成成果、決策與驗證證據 | 目前狀態 |
| `docs/adr/` | 長期且難以逆轉的取捨 | 目前狀態 |

任何文件與 `feature_list.json` 衝突時，一律以 `feature_list.json` 為準，並修正另一份。

## 工作項的欄位

範例見 [`templates/feature_list.example.json`](../templates/feature_list.example.json)。

### 共同欄位

| 欄位 | 說明 |
|---|---|
| `id` | 在該 project 內唯一 |
| `project` | `projects.json` 的 id，或 `root` |
| `name` | 一句話的工作名稱 |
| `status` | `not-started`／`in-progress`／`blocked`／`pass` |

### 未完成時（`not-started`／`in-progress`／`blocked`）

| 欄位 | 說明 |
|---|---|
| `description` | 目標與價值 |
| `projects` | 跨 repo 工作列出涉及範圍；單一 repo 可省略 |
| `dependencies` | 前置工作項；沒有就是空陣列 |
| `scope_boundary` | **本次刻意不處理的範圍** |
| `plan` | 指向 `docs/plans/active/` 底下的計畫；沒有計畫就不填 |
| `worktrees` | 見 [③ 實作](03-implementation.md#worktree-隔離)；`in-progress` 與 `blocked` 必填 |
| `completion_criteria` | **可觀察、可驗證**的完成條件 |
| `next_action` | **唯一、具體、可直接執行**的下一步；`in-progress` 與 `blocked` 必填 |
| `blocked_reason`、`resume_condition` | `blocked` 必填 |
| `evidence` | 以 `project` 或 `cross_project` 為 key 的物件，記錄驗證結果與尚未驗證的項目 |

三個欄位最關鍵：

- **`completion_criteria`**：寫的是「做到什麼可以被觀察到」，不是「改哪些檔案」。「程式已修改」不等於「工作已完成」。
- **`scope_boundary`**：把刻意不做的事寫下來。實作中看到範圍外的問題，記進這裡或另開工作項，不就地修掉。
- **`next_action`**：只能有一個。接手的人（或下一個 session）不需要判斷先做哪件事。

### 完成時（`pass`）

只保留 `id`、`project`、`name`、`status`、`completion_doc` 五欄。其餘內容必須**先**移進完成文件，確認精簡後仍可追溯。這讓狀態檔保持在「只看得到還沒做完的事」的大小。

## 狀態轉換

```text
not-started ──> in-progress ──> pass
                    │  ▲
                    ▼  │
                 blocked
```

| 轉換 | 條件 |
|---|---|
| `not-started → in-progress` | 工作項已提交、worktree 已建立、`next_action` 已填 |
| `in-progress → blocked` | 遇到外部阻礙，補 `blocked_reason` 與 `resume_condition`；**worktree 保留不移除** |
| `blocked → in-progress` | 恢復條件被外部滿足**且經使用者確認**；agent 不得自行恢復 |
| `in-progress → pass` | 滿足 [Definition of Done](definition-of-done.md) 的每一條 |
| 中途停止但沒有外部阻礙 | **維持** `in-progress`，更新 `next_action` 與交接快照 |

`blocked` 不是暫停按鈕：它必須有具體的外部阻礙和可判定的恢復條件。

## 啟動流程

每次 session 開始、接手或續接工作前依序執行。

1. **同步分支**：對本次要動的每個 repo fetch 並 fast-forward 到 base branch（以 `projects.json` 為準）。無法 fast-forward 就先停下，不在落後的分支上開工。既有未提交變更一律保留。
2. **讀狀態**：
   1. `projects.json`：repo 名冊、base branch、驗證入口。
   2. `feature_list.json`：活的工作項排在前面（`in-progress` → `blocked` → `not-started`），後面才是 `pass`。
   3. **只有續接中斷工作時**才讀 `session-handoff.md`。
   4. 工作項有 `plan` 時才讀該計畫。
3. **只讀本次要用的東西**：動到哪個 repo 才讀它的技術文件，不預先掃描其他 repo 與歷史。
4. **Baseline verification**：修改任何檔案前，先跑一次涉及 repo 的預設 gate，辨識既有失敗。既有失敗要點名，不混入本次結果，也不當成本次造成的問題去修。
5. **規劃**：見下一節。

## 計畫

### 什麼時候要寫

只有 `feature_list.json` 放不下的複雜工作才寫計畫——例如跨多個 repo、需要切成多張票、或動工前有多個待決策事項。**沒有計畫就不要為了開工而建立計畫。**

### 怎麼寫

- 命名 `docs/plans/active/<feature-id>-<slug>.md`，由工作項的 `plan` 欄連結。範本見 [`templates/plan.md`](../templates/plan.md)。
- **實作前必須對照實際程式碼審計一輪**，逐項標註 `檔案:行號`。計畫與程式碼衝突時**以程式碼為準**，並修正計畫。
- **決策表**：每個決策記錄日期、內容與**決定者**（使用者決定／agent 提出、使用者未反對）。事後回頭看時，分得出哪些是被確認過的、哪些只是預設。
- 執行期間更新同一份計畫，不建立平行版本；計畫不取代 `feature_list.json` 的狀態與下一步。
- 完成後移到 `docs/plans/archive/`，封存後不再更新。

## 一致性驗證器

### 為什麼需要

規則只寫在文件裡一定會漂移：多一個欄位、少一個路徑、一棵 worktree 被兩筆工作項認領，人眼很難每次都抓到。能被機械判定的不變式就交給腳本，判斷不了的（證據夠不夠、完成條件是否真的滿足）才留給[收尾清單](handoff-and-cleanup.md#收尾清單)與[評分表](evaluator-rubric.md)。

### 契約

- **無第三方依賴**，實作語言用專案既有的工具鏈即可。
- 讀取 `projects.json`、`feature_list.json`、`session-handoff.md`，以及它們指向的檔案。
- 失敗時**非零結束**，每筆診斷寫到 stderr，格式 `<project>/<id>.<rule>: <message>`，能直接定位到哪筆工作、哪條規則。
- 納入根目錄的驗證入口，每次收尾都要跑。

參考實作：[`scripts/validate-state.mjs`](../scripts/validate-state.mjs)，19 條規則逐條對應下表。在 harness 根目錄跑 `node scripts/validate-state.mjs`；本 repo 沒有活的狀態檔，[`init.sh`](../init.sh) 改以 `--shape-only` 驗證 `templates/` 的範例。

### 規則表

| 規則 | 觸發條件 |
|---|---|
| `state.file` | 狀態檔或名冊讀不到、不是合法 JSON |
| `state.known-status` | `status` 不在允許值之內 |
| `state.unique-key` | `(project, id)` 重複 |
| `state.completed-shape` | `pass` 的欄位集合不等於五欄（多欄與缺欄都報） |
| `state.completion-doc` | `pass` 的 `completion_doc` 為空或檔案不存在 |
| `state.completion-doc-orphan` | `docs/completed/` 底下有文件沒被任何 `pass` 指向 |
| `state.next-action` | `in-progress` 或 `blocked` 缺 `next_action` |
| `state.blocked-fields` | `blocked` 缺 `blocked_reason` 或 `resume_condition` |
| `state.plan` | `plan` 指向的檔案不存在 |
| `state.plan-status` | 未完成工作項的 `plan` 不在 `docs/plans/active/` 底下 |
| `state.worktree-required` | `in-progress` 或 `blocked` 沒有 `worktrees` |
| `state.worktree-claimed` | 兩筆工作項認領同一棵 worktree |
| `state.worktree-dir` | 宣告的 worktree 目錄不存在 |
| `state.worktree-branch` | 分支名不等於 `feature/<feature-id>` |
| `state.worktree-project` | worktree 的 `project` 不在名冊之內 |
| `state.worktree-pass` | `pass` 仍帶 `worktrees` |
| `handoff.file` | 交接檔不存在 |
| `handoff.completed` | 交接檔提到已 `pass` 的工作項 |
| `handoff.current` | 有 `in-progress` 或 `blocked` 的工作項，但交接檔一個都沒提到 |

實作時的兩個細節：

- **沒有固定的上限。** `worktree-required`（沒有 worktree 就不能 `in-progress` 或 `blocked`）加上 `worktree-claimed`（一棵 worktree 只能被一筆認領），合起來就是「推進中的工作項上限＝worktree 棵數」。`blocked` 保留 worktree，因此同樣佔用額度。
- **比對 id 要以界定符號包住**（例如反引號），不能用裸子字串：`abc-001` 會誤中 `xabc-001`。
