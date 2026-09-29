#!/usr/bin/env bash
# usage: finish-step.sh <n> "<notes>" "<commit summary>" [x|!]
set -e
n=$1; notes=$2; msg=$3; mark=${4:-x}
python3 - "$n" "$mark" <<'PY'
import sys,re
n,mark=sys.argv[1],sys.argv[2]
p='PROMPTS.md'; s=open(p,encoding='utf-8').read()
s=s.replace(f"### [ ] P{n} ",f"### [{mark}] P{n} ",1)
open(p,'w',encoding='utf-8').write(s)
PY
echo "P$n: $notes" >> NOTES.md
git add -A
git commit -q -m "feat(P$n): $msg

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GF1AjtFyTMpHAFGrQJoniB"
for i in 1 2 3 4; do git push -q -u origin claude/focused-feynman-lgilkm && break || sleep $((2**i)); done
git log --oneline | head -1
