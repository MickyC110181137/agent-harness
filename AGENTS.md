# AGENTS.md — 工作路由

> 本檔是給 agent 讀的入口範本。套用到實際 workspace 時，路徑一律相對於 harness 根目錄。

## 用途

本目錄是整個 workspace 的**唯一 harness**。各產品 repo 是獨立的 git repo，只保留原始碼與自己的驗證入口，不含任何 harness 檔案。
狀態、票、計畫、完成紀錄與各 repo 的技術文件全部集中在這裡。在產品 repo 裡找不到規則，不代表沒有規則——一律回到這裡查。

本檔只寫**路由**與**不可違反的規則**，不複製任何流程細節。

## 不可違反的規則

這幾條被違反時，`git status` 與驗證器的輸出都察覺不到，所以寫在入口；其餘規則一律路由出去。

1. **先同步再動檔。** 對本次要動的每個 repo（含 harness 根目錄）先 fetch 並 fast-forward 到 base branch。base branch 以 `projects.json` 為準，不要假設是 `main`。無法 fast-forward 就先停下處理，不在落後的分支上開工。
2. **程式碼改動一律在 `feature/<feature-id>` worktree 進行，並由使用者手動輸入 `/implement` 啟動**，一行小改動也不例外。拆票的 `/to-tickets` 同此。agent 只做準備後停下等指令，不得自行代替該流程，也不反覆重試呼叫。
3. **`feature_list.json` 是狀態的唯一權威。** 只有續接中斷工作時才讀 `session-handoff.md`；與 handoff、`progress.md`、計畫或任何文件衝突時一律以它為準。
4. **證據不可代替、必須可追溯。** 驗證針對部署後環境與實機，每項證據要指到 log 行、資料列、截圖或 commit，不接受「已驗證」這類敘述。**不得以本機分支程式碼連線測試環境代替部署後驗證。** 某一段驗證不適用時，明確記為 skipped 並寫原因。
5. **`blocked` 不得自行恢復。** 需要恢復條件被外部滿足**且經使用者確認**。若 `resume_condition` 本身已失效（它引用的分支、worktree、環境或票已不存在），維持 blocked、改寫該欄並回報使用者。
6. **保留使用者既有變更。** clean state 不等於 `git status` 乾淨；與本次工作無關的變更不還原、不刪除、不提交。
7. **不擴張範圍。** 不順手重構、不擴充未核准的功能、不覆蓋既有工作。改共用函式前先搜尋所有 caller，修共同根因而非單一呼叫點。
8. **`in-progress` 上限＝目前存在的 worktree 數。** 沒有 worktree 就不該有 `in-progress`。開 worktree 前，該工作項必須已在 `feature_list.json` 建立並提交。
9. **Production 預設唯讀。** 寫入類操作只能依已登記、未過期的具名例外執行，不得以例外為由推導出其他行為。

## 我現在要做什麼

表格由上而下大致就是一次工作的順序。「誰啟動」標**使用者**的，agent 準備完就停下等指令。

| # | 我要… | 去哪 | 誰啟動 |
|---|---|---|---|
| 1 | 開 session、接手或續接工作 | [`01-state-and-planning.md`](docs/01-state-and-planning.md#啟動流程) | agent |
| 2 | 弄懂工作項的欄位與生命週期 | [`01-state-and-planning.md`](docs/01-state-and-planning.md#工作項的欄位) | agent |
| 3 | 規劃一項複雜工作 | [`01-state-and-planning.md`](docs/01-state-and-planning.md#計畫) | agent |
| 4 | 拆票 | `/to-tickets`；落點見 [`02-ticketing.md`](docs/02-ticketing.md) | **使用者** |
| 5 | 開 worktree | [`03-implementation.md`](docs/03-implementation.md#worktree-隔離) | agent |
| 6 | 實作 | `/implement`，見 [`03-implementation.md`](docs/03-implementation.md) | **使用者** |
| 7 | 查「壞了／變慢／沒反應」，不猜修 | `/diagnosing-bugs` | agent 可自行呼叫 |
| 8 | 驗證改動 | [`04-verification.md`](docs/04-verification.md) | agent |
| 9 | 操作 production 或共用環境 | [`environment-boundaries.md`](docs/environment-boundaries.md) | agent（需授權） |
| 10 | 判斷能不能標 `pass` | [`definition-of-done.md`](docs/definition-of-done.md) | agent |
| 11 | 正式接受里程碑成果 | [`evaluator-rubric.md`](docs/evaluator-rubric.md) | 人或獨立評審 |
| 12 | 中途停下、交接給下一個 session | [`handoff-and-cleanup.md`](docs/handoff-and-cleanup.md#交接) | agent |
| 13 | 收尾、結束工作階段 | [`handoff-and-cleanup.md`](docs/handoff-and-cleanup.md#收尾清單)，最後跑驗證器 | agent |
| 14 | 記錄長期且難以逆轉的取捨 | `docs/adr/`，範本見 [`templates/adr.md`](templates/adr.md) | agent |
| 15 | 查某個 repo 的架構、環境與命令 | `docs/projects/<project>/` | agent |

## 檔案落點

| 路徑 | 放什麼 |
|---|---|
| `projects.json` | repo 名冊：id、本機路徑、base branch、驗證入口、文件入口；也是 `project` 欄的合法值來源 |
| `feature_list.json` | 所有工作項共用這一份，以 `project` 欄標示歸屬 |
| `progress.md` | 只保留未完成、進行中、blocked 的紀錄 |
| `session-handoff.md` | 中斷交接快照，每個工作項一節 |
| `docs/plans/{active,archive}/` | 執行計畫與其封存 |
| `docs/completed/<project>/<feature-id>.md` | 完成文件；跨 repo 的工作項直接放 `docs/completed/` |
| `docs/completed/progress/YYYY-MM-DD.md` | 已完成工作的紀錄，同一天集中在同一檔 |
| `docs/projects/<project>/` | 各 repo 的技術文件 |
| `docs/adr/` | 長期取捨，單一編號序列，不保存目前狀態 |
| `CONTEXT.md` | 領域語彙與系統邊界 |
| `.scratch/` | 拆票的暫存產物，不進版控，不是狀態來源 |

## Skill 啟動方式

`to-tickets` 與 `implement` 的 `SKILL.md` 帶 `disable-model-invocation: true`，agent 呼叫一定被擋，重開 session 也不會改變——只能請使用者輸入指令，且不要反覆重試。`diagnosing-bugs` 可由 agent 自行呼叫。
