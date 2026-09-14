# 工作交接

本檔只保存**中斷中的未完成工作**快照，每個工作項一節；一個工作項開多棵 worktree 時在該節內列出。
目前狀態與唯一下一步一律以 `feature_list.json` 為準，本檔與它衝突時以 `feature_list.json` 為準。
沒有任何中斷工作時，把下面的工作項節全部清空，只留本段說明。

**憑證不寫進本檔。** 需要時請使用者在對話中重新提供。

## Blocked 一覽

不得自行恢復，恢復條件見 `feature_list.json`：

| project | feature |
|---|---|
| `<project>` | `<feature-id>` |

## `<feature-id>`（`<project>`，`<status>`）

YYYY-MM-DD HH:mm 中斷。一句話說明停在哪、為什麼停。

### Worktree

| project | 目錄 | 分支 | 備註 |
|---|---|---|---|
| `<project>` | `<repo>-<feature-id>` | `feature/<feature-id>` | 分支停在哪個 commit、下次開工前要先做什麼 |

### 已完成

- 做完且有證據的事。證據在哪裡（工作項的 `evidence`、`progress.md` 哪一則），本檔不重複貼上。

### 未完成

1. 下一件事（與 `feature_list.json` 的 `next_action` 一致）。
2. 之後的事，依順序列出。

### 接手須知

- 環境現況：測試環境部署到哪個 commit、實機上裝的是哪個版本。
- 踩過的坑，以及已確認可行的做法。
- 刻意沒有處理、也不該在本工作項處理的東西。
- 不屬於本工作項的未提交變更：在哪個檔案，本工作項不提交也不還原。

### 待決策

- 等使用者拍板的事項、各選項的代價，以及它擋住哪一步。
