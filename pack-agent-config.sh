#!/usr/bin/env bash
# Pack agent team config into a portable zip archive.
# Usage: bash pack-agent-config.sh
# Output: ./agent-team-config.zip

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
STAGE="$ROOT/.agent-team-config-stage"
OUT="$ROOT/agent-team-config.zip"

echo "==> Packing agent config to $OUT"

# Clean previous
rm -rf "$STAGE" "$OUT"

# Root files
mkdir -p "$STAGE"
cp "$ROOT/opencode.jsonc" "$STAGE/"
cp "$ROOT/DS_WORKFLOW.md" "$STAGE/"
cp "$ROOT/DS_BLUEPRINT.md" "$STAGE/"
cp "$ROOT/DS_STATE.md" "$STAGE/"
cp "$ROOT/DS_CONTEXT.md" "$STAGE/"
cp "$ROOT/DS_LEAD_MODEL_GUIDE.md" "$STAGE/"
cp "$ROOT/DS_HISTORY.md" "$STAGE/"
cp "$ROOT/OC_WORKFLOW.md" "$STAGE/"
cp "$ROOT/OC_HISTORY.md" "$STAGE/"

# Agents (only .md files, no gitignore/package/node_modules)
mkdir -p "$STAGE/.opencode/agents"
cp "$ROOT/.opencode/agents/"*.md "$STAGE/.opencode/agents/"

# Zip it
cd "$STAGE"
zip -r "$OUT" . > /dev/null
cd "$ROOT"

# Clean up stage
rm -rf "$STAGE"

echo "==> Done: $(ls -lh "$OUT" | awk '{print $5}') — agent-team-config.zip"
