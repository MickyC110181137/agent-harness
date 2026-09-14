# ② 拆票

> **對應自我介紹第二段**：我用 to-tickets 把計畫切成垂直切片，每張票都貫穿各層、能獨立驗證，並標出相依關係，切法經我確認才定案。

## 工作項、計畫與切片票的關係

```text
工作項（feature_list.json）   要交付什麼、做到什麼算完成、下一步是什麼
  └─ 計畫（docs/plans/active/）  怎麼做、做了哪些決策、逐檔設計
       └─ 切片票（.scratch/）     切成哪些可以獨立交付、獨立驗證的單位
```

- **狀態只在工作項上。** 切片票只記錄 triage 狀態（見下文），不驅動工作項的狀態轉換。
- **票全部完成不等於工作項完成。** 工作項能不能結案，只看 [Definition of Done](definition-of-done.md)。
- **票上的逐檔設計以計畫為準**；計畫與實際程式碼衝突時，再以程式碼為準。

## 使用的 skill

[`to-tickets`](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-tickets/SKILL.md)（出自 [mattpocock/skills](https://github.com/mattpocock/skills)）。

它的 `SKILL.md` 帶 `disable-model-invocation: true`，**只能由使用者輸入 `/to-tickets` 啟動**。agent 在那之前要把準備做完：

1. 工作項已在 `feature_list.json` 建立並提交。
2. 需要計畫的工作，計畫已寫好並對照程式碼審計過。
3. 停下，請使用者輸入指令。

## to-tickets 做什麼

1. **蒐集脈絡**：從對話、計畫或引用的 spec 取得需求。
2. **探索程式碼**：理解既有的領域語彙與架構決策，讓票使用專案本來的說法。
3. **草擬垂直切片**：每張票是一顆 tracer bullet——
   - 貫穿需要的每一層（資料、介面、畫面、測試），而不是只做其中一層；
   - **能獨立展示或驗證**；
   - 在一個 context window 內做得完；
   - 列出它被哪幾張票擋住（`Blocked by`）。

   牽動範圍很廣的重構不硬切垂直，改走 **expand–contract**：先讓新舊寫法並存，分批遷移，最後刪掉舊寫法。
4. **與使用者確認**：列出每張票的標題、相依與交付內容，確認粒度是否合適、相依是否正確、要不要合併或拆開。
5. **發布**到 issue tracker（本 harness 用本機 markdown，見下文）。

## 為什麼是垂直切片

水平切（先做完整個資料層，再做介面，最後做畫面）要到最後一層接上才驗證得到行為，問題會集中在最後才爆發。

垂直切讓**每張票都能端到端驗收**：

- 問題在第一張票就會暴露，而不是在最後。
- 每張票的驗收條件就是使用者看得到的行為，驗收時不需要想像「之後接上會怎樣」。
- 每張票都控制在一個 context window 內，agent 不會做到一半忘記前面的決定。

## 票的落點

本 harness 用本機 markdown 當 issue tracker，放在 harness 根目錄的 `.scratch/`：

```text
.scratch/<feature-slug>/
├── spec.md                  需要時才有
└── issues/
    ├── 01-<slug>.md         編號依相依順序，從 01 開始
    ├── 02-<slug>.md
    └── ...
```

- **一張票一個檔**，絕不合併成單一檔案。
- 檔案上方的 `Status:` 行記 triage 狀態；`Blocked by: 01, 02` 行記相依。
- 討論紀錄附加在檔案底部的 `## Comments` 之下。
- **`.scratch/` 不進版控**：它是拆解過程的暫存產物，不是狀態來源。需要長期保存的內容（決策、證據）在結案時移進完成文件。
- 無論工作項只動一個 repo 還是多個，票都開在 harness 根目錄；工作項的 `project` 欄標示歸屬。

票的內容範本見 [`templates/ticket.md`](../templates/ticket.md)。

## Triage 標籤

| 標籤 | 意思 |
|---|---|
| `needs-triage` | 需要人評估 |
| `needs-info` | 等待補充資訊 |
| `ready-for-agent` | 規格完整，agent 可以直接做 |
| `ready-for-human` | 需要人來做（例如需要實體裝置、外部後台、帳號權限） |
| `wontfix` | 不處理 |

## 票與 worktree 的關係

- worktree 的單位是 **(工作項, repo)**，不是票。
- 同一個工作項在同一個 repo 的後續票，**沿用同一棵 worktree**，依相依順序一張一張做。
- 一個工作項的票可以分散在多個 repo，每個涉及的 repo 各開一棵。

例：一個工作項切成四張票，第 1、3 張動 `api`、第 2 張動 `app`、第 4 張兩邊都動——`api` 與 `app` 各開一棵 worktree，共兩棵，工作項仍然只是一筆 `in-progress`。
