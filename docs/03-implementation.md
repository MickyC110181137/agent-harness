# ③ 實作

> **對應自我介紹第三段**：每張票開獨立的 worktree 和分支，由我手動啟動 implement：在約定的邊界用 TDD 開發，跑完整測試，經過 code review 才 commit。拆票與實作兩個關卡刻意不讓 agent 自己觸發，決策權留在人身上。
>
> 註：worktree 的單位是（工作項, repo），同一個工作項的切片票沿用同一棵，見 [② 拆票](02-ticketing.md#票與-worktree-的關係)。

## 開工前的準備（agent 做）

1. **同步**涉及的每個 repo 到 base branch（見 [啟動流程](01-state-and-planning.md#啟動流程)）。
2. 確認工作項**已在 `feature_list.json` 建立並提交**——worktree 會以含這筆工作項的狀態為基底，不會產生第二份狀態。
3. 依下文**建立 worktree**。
4. 工作項轉 `in-progress`，填 `worktrees` 與唯一的 `next_action`。
5. 在 worktree 裡跑 **baseline verification**，點名既有失敗。
6. **停下**，請使用者輸入 `/implement`。

## Worktree 隔離

### 規則

- **每個工作項、每個涉及的 repo 各一棵 worktree。**
- 目錄命名 `<repo>-<feature-id>`，與主 repo 並列。
- 分支命名 `feature/<feature-id>`。
- base branch 依 `projects.json`，開工前確認，不要假設是 `main`。
- 不要在 worktree 裡再開 worktree。

```bash
git -C <repo> worktree add ../<repo>-<feature-id> -b feature/<feature-id> <base-branch>
```

在工作項上的宣告：

```json
"worktrees": [
  { "project": "app", "dir": "app-export-report-001", "branch": "feature/export-report-001" },
  { "project": "api", "dir": "api-export-report-001", "branch": "feature/export-report-001" }
]
```

### 三條不變式

1. **沒有 worktree 就不得 `in-progress` 或 `blocked`。** 純文件與 harness 狀態檔的維護不開 worktree，因此也不得標記為這兩種狀態。
2. **一棵 worktree 只能被一筆工作項認領。**
3. **一筆工作項在每個涉及的 repo 至多一棵。**

另外：宣告的目錄必須真的存在；`pass` 不得帶 `worktrees`，收尾時必須先移除。這些都由[驗證器](01-state-and-planning.md#一致性驗證器)強制。

### 為什麼要隔離

- 多個工作項不會在同一個檢出裡互相覆蓋。
- 主檢出保留使用者自己的進行中變更，agent 不會碰到。
- 推進中的數量由真實存在的 worktree 決定，而不是靠自律。

### 新 worktree 的常見坑

- **被 `.gitignore` 排除的檔案不會出現在新 worktree**：本機設定、建置工具的 wrapper、本機路徑設定都要依各 repo 文件補齊，再重新安裝依賴。
- **不要用 symlink／junction 讓 worktree 共用主 repo 的依賴目錄。** 強制移除 worktree 時可能沿著連結把主 repo 的內容一起刪掉。
- **建置或分析工具會改寫生成檔**：commit 前還原，否則會污染 diff、擋下部署前的乾淨檢查。

### 移除

分支合併回主線後移除 worktree，並在各 repo 執行 `git worktree prune`，確認沒有殘留目錄。**移除 worktree 不會刪掉分支**，需要時可以重新 `worktree add` 回來。

## implement 做什麼

[`implement`](https://github.com/mattpocock/skills/blob/main/skills/engineering/implement/SKILL.md)（出自 [mattpocock/skills](https://github.com/mattpocock/skills)）讀取 spec 或切片票後：

```text
讀票與計畫
  └─ 在事先約定的 seams 用 /tdd 開發（紅 → 綠 → 重構）
       ├─ 期間頻繁跑型別檢查與單檔測試
       └─ 結束時跑完整測試
            └─ /code-review
                 └─ commit 到目前分支
```

### 「事先約定的 seams」

seam 是可以從外部觀察行為、必要時替換依賴的邊界，例如一個模組對外的介面、一條 API 路由、一個資料存取層。

seams 在**計畫或票上事先約定**，而不是實作時才決定。這樣測試鎖定的是穩定的行為邊界，而不是內部細節——重構內部時測試不會跟著碎，review 時也知道該看哪幾個測試。

### Code review 的兩個面向

| 面向 | 問題 |
|---|---|
| **Standards** | 是否符合專案的架構文件與編碼規範？ |
| **Spec** | 是否滿足票的需求與工作項的完成條件？有沒有漏掉的呼叫點或狀態？ |

- 硬性問題修掉後再 commit。
- 判斷題決定不修時，**寫下理由**（例如「抽共用 helper 會連帶改動範圍外的既有程式，違反不擴張範圍」），記進完成文件。

## 為什麼由人觸發

`to-tickets` 與 `implement` 的 `SKILL.md` 都帶 `disable-model-invocation: true`，agent 呼叫一定被擋。

這是刻意的：

- **拆票決定範圍，實作決定什麼東西會進主線**，這是整個流程中成本最高的兩個承諾點。
- agent 能把前面的準備（同步、狀態、worktree、baseline、計畫審計）做到位，但**按下開始的是人**。
- 避免 agent 在失敗時自己反覆重試、越做越偏。

更完整的取捨見 [`design-decisions.md`](design-decisions.md)。

## 實作中的紀律

- **不擴張範圍。** 看到範圍外的問題，記進 `scope_boundary` 或另開工作項，不就地修掉。
- **修共同根因。** 改共用函式前先搜尋所有 caller。一個 guard 放在共用函式裡，比在每個 caller 各放一個更小，也不會漏掉票沒點名的呼叫點。
- **不猜修。** 遇到「壞了／變慢／沒反應」，先用 `/diagnosing-bugs` 建立能重現問題的回饋迴圈，確認根因再修。
- **不推測沒讀過的東西。** 沒讀過的架構、環境、依賴與測試命令不要猜，去讀該 repo 的技術文件。
- **不提交密鑰。** token、憑證、個人資料一律不進版控。

## 中途停止

| 情況 | 處理 |
|---|---|
| 沒有外部阻礙，只是 session 結束 | 維持 `in-progress`，更新 `next_action` 與交接快照 |
| 有外部阻礙 | 轉 `blocked`，補 `blocked_reason` 與 `resume_condition`；worktree 保留 |

兩種情況都不建立完成文件、不封存計畫。細節見 [`handoff-and-cleanup.md`](handoff-and-cleanup.md)。
