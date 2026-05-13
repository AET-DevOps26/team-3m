#!/bin/bash
set -e
shopt -s nullglob
cd "$(dirname "$0")"
npx skills experimental_install
mkdir -p .claude/skills
for skill in .agents/skills/*/; do
  name="$(basename "$skill")"
  [ -d ".claude/skills/$name" ] && [ ! -L ".claude/skills/$name" ] && rm -rf ".claude/skills/$name"
  ln -sfn "../../.agents/skills/$name" ".claude/skills/$name"
done
