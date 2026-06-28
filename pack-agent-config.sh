#!/usr/bin/env bash
# Pack agent team config into a portable zip archive.
# Usage: bash pack-agent-config.sh
# Output: ./agent-team-config.zip
#
# Extracts into new project as:
#   .opencode/agents/  — all agent configs
#   DS_*.md            — state file templates (skeleton, no project content)
#   HARNESS.md         — harness reference
#   opencode.jsonc     — opencode project config (if exists)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
STAGE="$ROOT/.agent-team-config-stage"
OUT="$ROOT/agent-team-config.zip"

echo "==> Packing agent config to $OUT"

# Clean previous
rm -rf "$STAGE" "$OUT"

# Root files — state templates + workflow + harness
mkdir -p "$STAGE"
cp "$ROOT/DS_WORKFLOW.md"           "$STAGE/"
cp "$ROOT/DS_LEAD_MODEL_GUIDE.md"   "$STAGE/"
cp "$ROOT/DS_BLUEPRINT.md"          "$STAGE/"
cp "$ROOT/DS_STATE.md"              "$STAGE/"
cp "$ROOT/DS_CONTEXT.md"            "$STAGE/"
cp "$ROOT/DS_PATTERNS.md"           "$STAGE/"
cp "$ROOT/DS_HISTORY.md"            "$STAGE/"
cp "$ROOT/HARNESS.md"               "$STAGE/"

# OpenCode project config (optional — may not exist in all projects)
if [ -f "$ROOT/opencode.jsonc" ]; then
    cp "$ROOT/opencode.jsonc" "$STAGE/"
fi

# Agent configs (all .md files)
mkdir -p "$STAGE/.opencode/agents"
cp "$ROOT/.opencode/agents/"*.md "$STAGE/.opencode/agents/"

# Zip it
cd "$STAGE"
zip -r "$OUT" . > /dev/null
cd "$ROOT"

# Clean up stage
rm -rf "$STAGE"

echo "==> Done: $(ls -lh "$OUT" | awk '{print $5}') — agent-team-config.zip"
echo "    Contains: $(unzip -l "$OUT" | tail -1 | awk '{print $2}') files"
