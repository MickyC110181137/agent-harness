#!/bin/bash
# 本 repo 的驗證入口。每次收尾都要跑（見 docs/handoff-and-cleanup.md#收尾清單）。
#
# 本 repo 是 harness 的範本庫，沒有活的 projects.json／feature_list.json，
# 所以驗證器對 templates/ 底下的範例跑結構規則。
#
# 套用到真實 workspace 時，改成在 harness 根目錄直接跑：
#   node scripts/validate-state.mjs
set -e

echo "=== 狀態一致性（範例，結構規則）==="
node scripts/validate-state.mjs \
  --shape-only \
  --projects templates/projects.example.json \
  --state templates/feature_list.example.json

echo
echo "=== 文件連結 ==="
node scripts/check-links.mjs .

echo
echo "全部通過。"
