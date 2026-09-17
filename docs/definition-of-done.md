# 完成判準與範圍規則

「程式已修改」不等於「工作已完成」。完成必須逐項滿足 `completion_criteria`，而不是逐項改完檔案。

## 範圍規則

- **一次推進的量由 worktree 決定。** `in-progress` 與 `blocked` 共用同一份額度，上限是目前存在的 worktree 數量，見 [狀態模型](01-state-and-planning.md#狀態轉換)。
- **不擴張範圍。** 不順手重構、不擴充未核准的功能、不覆蓋既有工作。範圍外的問題記進 `scope_boundary` 或另開工作項。
- **修共同根因。** 改共用函式前先搜尋所有 caller。
- **保留使用者既有變更。** clean state 不等於 `git status` 乾淨。
- **不提交密鑰。** token、憑證、個人資料一律不進版控。
- **不推測沒讀過的東西。** 沒讀過的架構、環境、依賴與測試命令去讀文件，不要猜。

## Definition of Done

工作項只有在下列**全部**成立時才能設為 `pass`：

1. **需求與 `completion_criteria` 逐項有可追溯的證據。**
2. **[三層驗證](04-verification.md#三層驗證)都已執行**；未驗證項目與既有失敗已明確揭露，不適用的層明確記為 skipped 並寫原因。
3. **涉及的每個 repo 都留下自己的驗證證據**，寫在工作項的 `evidence` 裡。
4. **長期的產品、架構或可靠性變更已更新對應 repo 的技術文件**；符合門檻的長期取捨已寫進 `docs/adr/`。
5. **所有 worktree 的 `feature/<feature-id>` 分支都已合併回各自主線。**
   狀態與完成文件在 harness repo，程式碼在產品 repo 的分支上；分支沒合併時，完成文件描述的東西還不在主線上。這條沒有例外。
6. **完成文件已建立**：跨 repo 的放 `docs/completed/<feature-id>.md`，單一 repo 的放 `docs/completed/<project>/<feature-id>.md`。範本見 [`templates/completion-doc.md`](../templates/completion-doc.md)，至少包含 Outcome、Projects、Delivered、Decisions、Verification Evidence、Follow-ups。
   `Follow-ups` 只能放**不影響本次完成**的新工作；還有必要條件沒完成時，不得建立完成文件。
7. **完成文件建立之後**，才可以把 `feature_list.json` 的該筆精簡為五欄的完成結構。

## 完成之後

依 [收尾清單](handoff-and-cleanup.md#收尾清單) 的「已完成工作」一節收尾：

- 過程紀錄依日期從 `progress.md` 移進 `docs/completed/progress/`。
- 計畫從 `docs/plans/active/` 移進 `docs/plans/archive/`。
- 移除 worktree，清掉 `worktrees` 欄位。
- 移除交接快照中該工作項的一節。
- 最後跑一次驗證器。

## 沒完成的時候

| 情況 | 處理 |
|---|---|
| 有外部阻礙 | `blocked`，補 `blocked_reason` 與 `resume_condition`，保留 worktree，**不得自行恢復** |
| 沒有外部阻礙，但工作階段結束 | 維持 `in-progress`，更新唯一的 `next_action` 與交接快照 |

兩種情況都**不**建立完成文件、**不**封存計畫、**不**把過程紀錄移出 `progress.md`。
