# 交接與收尾

agent 的 session 會中斷、會被重開、會換人接手。這份規範讓**任何一個新 session 只靠檔案就能接上**，而不是靠記憶或對話紀錄。

## 交接

### 交接快照（`session-handoff.md`）

- 只保存**中斷中、未完成**的工作快照，**每個工作項一節**；一個工作項開多棵 worktree 時在該節內列出。
- **它是脈絡，不是狀態。** 目前狀態與唯一下一步以 `feature_list.json` 為準，兩者衝突時以狀態檔為準。
- 只有續接中斷工作時才讀它。
- 沒有任何中斷工作時，清空所有工作項的節，只留說明段落。
- 已 `pass` 的工作項不得出現在交接快照裡（驗證器會檢查）。

每一節包含：

| 小節 | 內容 |
|---|---|
| 目前進度 | 做到哪裡、停在哪一步、為什麼停 |
| 已完成 | 已經做完且有證據的事，指向證據所在位置，不重複貼上 |
| 未完成 | 還沒做的事與順序 |
| 接手須知 | 環境現況、踩過的坑、刻意沒處理的東西、需要向使用者索取的資訊 |
| 待決策 | 等使用者拍板的事項，以及各選項的代價 |

**憑證不寫進交接快照。** 帳號密碼、token 由使用者在對話中提供，下一個 session 需要時請使用者重新提供。

範本見 [`templates/session-handoff.md`](../templates/session-handoff.md)。

### 過程紀錄（`progress.md`）

- 只保留**未完成**工作的紀錄，依 project 分區塊。
- 標題一律 `YYYY-MM-DD HH:mm`，24 小時制、固定時區。**沒有保存時間的紀錄標示「時間未記錄」，不回填推測值。**
- 只記錄已經發生的事實。
- 工作項結案後，該工作的每筆紀錄依日期移到 `docs/completed/progress/YYYY-MM-DD.md`，同一天集中在同一檔。

範本見 [`templates/progress.md`](../templates/progress.md)。

## Blocked

- `blocked` 必須有具體的外部阻礙（`blocked_reason`）與可判定的恢復條件（`resume_condition`）。
- **不得自行恢復。** 恢復需要條件被外部滿足**且經使用者確認**。
- 恢復前先確認 `resume_condition` **本身還成立**：它引用的分支、worktree、環境或票若已不存在，維持 `blocked`、改寫該欄並回報使用者，不得據此判定可以恢復。
- 交接快照的最上方列出所有 blocked 工作項，讓接手的人第一眼看到。

## 收尾清單

**每次**工作告一段落或結束 session 前完整執行。每次重新檢查，不要永久勾選。

Clean state 不代表 `git status` 必須沒有變更：使用者既有或與本次無關的未提交變更必須保留，不得為了清理而還原、刪除或提交。

### 1. 確認工作結果

- [ ] 確認本次的工作項 id、`project` 與涉及的 worktree。
- [ ] 檢查實際變更，區分本次變更與使用者既有變更。
- [ ] 說得出本次讀了哪幾份規範與技術文件；漏讀就補讀，不要用猜的收尾。
- [ ] 執行涉及 repo 規定的驗證，記錄實際命令、結果與未驗證項目。
- [ ] 依 `completion_criteria` 判斷「未完成」或「已完成」；**不得因為 session 即將結束而宣告完成。**

### 2A. 未完成工作

- [ ] `status` 為 `not-started`、`in-progress` 或 `blocked`，保留完整的未完成結構。
- [ ] `in-progress`／`blocked` 有唯一、可執行的 `next_action`；`evidence` 已更新。
- [ ] `blocked` 另有 `blocked_reason` 與 `resume_condition`，且未自行恢復。
- [ ] 在 `progress.md` 對應區塊追加紀錄。
- [ ] 更新交接快照中該工作項的一節。
- [ ] **不**建立完成文件、**不**封存計畫、**不**把過程紀錄移出 `progress.md`。

完成 2A 後直接跳到第 4 節。

### 2B. 已完成工作

- [ ] 全部 `completion_criteria` 已滿足，涉及的每個 repo 都留下自己的驗證證據。
- [ ] 長期的產品、架構或可靠性變更已更新技術文件；符合門檻的取捨已寫進 `docs/adr/`。
- [ ] 所有 worktree 的分支都已合併回各自主線。
- [ ] 建立完成文件，至少記錄 Outcome、Projects、Delivered、Decisions、Verification Evidence、Follow-ups。
- [ ] 原本在狀態檔的範圍、完成條件、各 repo 結果、決策與證據已移入完成文件，確認精簡後仍可追溯。
- [ ] 計畫移到 `docs/plans/archive/`，並在完成文件記錄歸檔路徑。
- [ ] 該工作的過程紀錄依日期移到 `docs/completed/progress/`。
- [ ] 狀態檔的該筆改為五欄的完成結構。
- [ ] 移除所有 worktree、清掉 `worktrees` 欄位；交接快照中該工作項的一節一併移除。

### 3. Worktree 一致性

- [ ] `in-progress` 的工作項在 `worktrees` 列出每一棵，且每棵目錄真的存在。
- [ ] 沒有兩筆 `in-progress` 認領同一棵 worktree。
- [ ] 每棵 worktree 的分支都是 `feature/<feature-id>`。
- [ ] 沒有殘留、不屬於任何 `in-progress` 工作項的 worktree 目錄；有的話移除並 `git worktree prune`。

### 4. 驗證

- [ ] 涉及 repo 的 gate 都已執行，既有失敗已點名且未混入本次結果。
- [ ] 服務端改動已部署到測試環境，並對部署後的服務驗證。
- [ ] 行為變更已在實機驗證。
- [ ] 不適用的驗證層已明確記為 skipped 並寫原因。
- [ ] `git diff --check` 通過；`git status --short` 確認沒有誤改、遺失或覆蓋使用者檔案。
- [ ] 沒有密鑰、token、個人資料、除錯輸出、建置產物或暫存檔。

### 5. 一致性 gate

- [ ] 驗證器通過，診斷可以定位到 project、工作項 id 與規則。
- [ ] `progress.md` 沒有已完成工作的紀錄；每日完成紀錄的檔名與紀錄日期一致。
- [ ] 交接快照與狀態檔沒有衝突，也沒有提到已 `pass` 的工作項。
- [ ] 若有進行中的計畫，內容與狀態檔的唯一下一步一致。
- [ ] 向使用者回報：完成或未完成、驗證結果、剩餘風險、唯一下一步。
