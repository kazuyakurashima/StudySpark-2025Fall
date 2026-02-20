#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Codex Review Loop Script
# Usage: bash scripts/codex-review.sh <round> [file1 file2 ...]
#   round: 1-3 (required)
#   files: optional specific files to review (must be staged)
# Exit codes:
#   0 = review completed (check .codex-review.json for result)
#   1 = codex execution or parse error
#   2 = security check failed or unstaged file specified
#   3 = quality gate failed (lint/typecheck)
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REVIEW_OUTPUT="$PROJECT_DIR/.codex-review.json"
RAW_OUTPUT="$PROJECT_DIR/.codex-review-raw.txt"
PREV_OUTPUT="$PROJECT_DIR/.codex-review-prev.json"
SCHEMA_FILE="$SCRIPT_DIR/review-schema.json"

PRIMARY_MODEL="gpt-5-codex"
FALLBACK_MODEL="gpt-5"

# ---- Argument parsing ----
ROUND="${1:?Usage: codex-review.sh <round> [file1 file2 ...]}"
shift
TARGET_FILES=("$@")

MAX_ROUND=3
if ! [[ "$ROUND" =~ ^[1-9][0-9]*$ ]] || [ "$ROUND" -lt 1 ] || [ "$ROUND" -gt "$MAX_ROUND" ]; then
    echo "ERROR: round must be 1–$MAX_ROUND (got '$ROUND')"
    exit 1
fi

cd "$PROJECT_DIR"

# Helper: write result JSON and exit
write_result() {
    local json="$1"
    local exit_code="${2:-0}"
    python3 -c "
import json, sys
try:
    data = json.loads(sys.argv[1])
    print(json.dumps(data, indent=2, ensure_ascii=False))
except:
    print(sys.argv[1])
" "$json" > "$REVIEW_OUTPUT"
    exit "$exit_code"
}

echo "===== Codex Review Round $ROUND ====="

# ============================================================
# Step 0: Security check
# ============================================================
echo "[Step 0] Security check..."

STAGED_FILES=$(git diff --staged --name-only || true)

if [ -z "$STAGED_FILES" ] && [ ${#TARGET_FILES[@]} -eq 0 ]; then
    echo "No staged changes. Auto-approved."
    write_result '{"approved":true,"round":'"$ROUND"',"model_used":"none","gate_passed":true,"stale":false,"error":false,"issues":[],"summary":"No staged changes detected."}' 0
fi

# Check filenames for secrets
# Match actual secret files, not substrings like "SecretSanta.tsx"
SENSITIVE_PATTERNS='\.env$|\.env\.|^\.?credentials$|^\.?secret$|\.secrets\.|\.pem$|\.key$|id_rsa|id_ed25519'
SENSITIVE_FILES=$(echo "$STAGED_FILES" | grep -iE "$SENSITIVE_PATTERNS" || true)
if [ -n "$SENSITIVE_FILES" ]; then
    echo "ERROR: Sensitive files detected in staged changes:"
    echo "$SENSITIVE_FILES"
    write_result '{"approved":false,"round":'"$ROUND"',"model_used":"none","gate_passed":false,"stale":false,"error":true,"issues":[],"summary":"Security: sensitive files staged. Unstage them before review."}' 2
fi

# Check diff content for secret patterns (exclude this script itself)
DIFF_CONTENT=$(git diff --staged -- ':!scripts/codex-review.sh')
SECRET_CONTENT_PATTERNS='SUPABASE_SERVICE_ROLE_KEY|API_KEY=|API_SECRET=|PRIVATE_KEY=|BEGIN PRIVATE KEY|BEGIN RSA PRIVATE KEY|DATABASE_URL=|OPENAI_API_KEY|ANTHROPIC_API_KEY|AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN='
SECRET_HITS=$(echo "$DIFF_CONTENT" | grep -nE '^\+' | grep -iE "$SECRET_CONTENT_PATTERNS" || true)
if [ -n "$SECRET_HITS" ]; then
    echo "ERROR: Secret-like content detected in staged diff:"
    echo "$SECRET_HITS" | head -5
    write_result '{"approved":false,"round":'"$ROUND"',"model_used":"none","gate_passed":false,"stale":false,"error":true,"issues":[],"summary":"Security: secret-like content found in diff."}' 2
fi

# Normalize paths: strip leading ./ and resolve to repo-relative form
normalize_path() {
    local p="$1"
    # Strip leading ./
    p="${p#./}"
    # If absolute, make relative to PROJECT_DIR
    if [[ "$p" = /* ]]; then
        p="${p#"$PROJECT_DIR/"}"
    fi
    echo "$p"
}

# Check that specified files are all staged
if [ ${#TARGET_FILES[@]} -gt 0 ]; then
    for f in "${TARGET_FILES[@]}"; do
        nf=$(normalize_path "$f")
        if ! echo "$STAGED_FILES" | grep -qFx "$nf"; then
            echo "ERROR: File '$nf' is specified but not staged."
            ESCAPED_F=$(python3 -c "import json,sys; print(json.dumps(sys.argv[1])[1:-1])" "$nf")
            write_result '{"approved":false,"round":'"$ROUND"',"model_used":"none","gate_passed":false,"stale":false,"error":true,"issues":[],"summary":"File '"$ESCAPED_F"' specified but not staged. Run git add first."}' 2
        fi
    done
fi

echo "[Step 0] Passed."

# ============================================================
# Step 1: Quality gate (lint + typecheck)
# ============================================================
echo "[Step 1] Quality gate..."

GATE_ERRORS=""
if ! npm run lint --silent 2>&1 | tail -5; then
    GATE_ERRORS="lint failed"
fi

if ! npx tsc --noEmit 2>&1 | tail -5; then
    [ -n "$GATE_ERRORS" ] && GATE_ERRORS="$GATE_ERRORS; typecheck failed" || GATE_ERRORS="typecheck failed"
fi

if [ -n "$GATE_ERRORS" ]; then
    echo "ERROR: Quality gate failed: $GATE_ERRORS"
    write_result '{"approved":false,"round":'"$ROUND"',"model_used":"none","gate_passed":false,"gate_failed":true,"stale":false,"error":false,"issues":[],"summary":"Quality gate failed: '"$GATE_ERRORS"'. Fix and re-run same round."}' 3
fi

echo "[Step 1] Passed."

# ============================================================
# Step 2: Get diff
# ============================================================
echo "[Step 2] Getting staged diff..."

if [ ${#TARGET_FILES[@]} -gt 0 ]; then
    DIFF=$(git diff --staged -- "${TARGET_FILES[@]}")
else
    DIFF=$(git diff --staged)
fi

if [ -z "$DIFF" ]; then
    echo "No diff. Auto-approved."
    write_result '{"approved":true,"round":'"$ROUND"',"model_used":"none","gate_passed":true,"stale":false,"error":false,"issues":[],"summary":"No changes in staged diff."}' 0
fi

DIFF_LINES=$(echo "$DIFF" | wc -l | tr -d ' ')
echo "[Step 2] Diff: $DIFF_LINES lines."

# ============================================================
# Step 3: Run codex exec with model fallback
# ============================================================

REVIEW_PROMPT="You are a senior code reviewer. Review the following git diff.

Focus on: bugs, logic errors, TypeScript type safety, React anti-patterns (missing keys, stale closures, effect deps), security concerns, performance issues, accessibility.

Review round: $ROUND of 3.

Respond with ONLY a JSON object matching the provided output schema.

Diff:
$DIFF"

MODEL_FAIL_PATTERNS="does not exist|do not have access|model_not_found|not available|not supported"
MODEL_USED=""
LAST_STDERR=""

run_codex() {
    local model="$1"
    local stderr_file stdout_file
    stderr_file=$(mktemp)
    stdout_file=$(mktemp)

    echo "[Step 3] Trying model: $model ..."

    if codex exec \
        -m "$model" \
        -s read-only \
        -C "$PROJECT_DIR" \
        --output-last-message "$RAW_OUTPUT" \
        --output-schema "$SCHEMA_FILE" \
        "$REVIEW_PROMPT" >"$stdout_file" 2>"$stderr_file"; then
        cat "$stdout_file"
        LAST_STDERR=$(cat "$stderr_file")
        rm -f "$stderr_file" "$stdout_file"
        return 0
    else
        local rc=$?
        cat "$stdout_file"
        # Codex CLI may output errors to stdout; combine both for pattern matching
        LAST_STDERR=$(cat "$stderr_file" "$stdout_file")
        rm -f "$stderr_file" "$stdout_file"
        return $rc
    fi
}

# Try primary model
if run_codex "$PRIMARY_MODEL"; then
    MODEL_USED="$PRIMARY_MODEL"
else
    echo "[Step 3] Primary model failed."
    # Model-level failure → fallback
    if echo "$LAST_STDERR" | grep -qiE "$MODEL_FAIL_PATTERNS"; then
        echo "[Step 3] Model unavailable. Falling back to $FALLBACK_MODEL ..."
        if run_codex "$FALLBACK_MODEL"; then
            MODEL_USED="$FALLBACK_MODEL"
        else
            echo "ERROR: Both models failed."
            write_result '{"approved":false,"round":'"$ROUND"',"model_used":"none","gate_passed":true,"stale":false,"error":true,"issues":[],"summary":"Both '"$PRIMARY_MODEL"' and '"$FALLBACK_MODEL"' failed."}' 1
        fi
    else
        # Non-model error (rate limit, network) → retry same model after wait
        echo "[Step 3] Non-model error. Retrying in 5s..."
        sleep 5
        if run_codex "$PRIMARY_MODEL"; then
            MODEL_USED="$PRIMARY_MODEL"
        else
            echo "ERROR: Retry failed."
            write_result '{"approved":false,"round":'"$ROUND"',"model_used":"none","gate_passed":true,"stale":false,"error":true,"issues":[],"summary":"Codex exec failed after retry."}' 1
        fi
    fi
fi

echo "[Step 3] Done. Model used: $MODEL_USED"

# ============================================================
# Step 4-5: Parse, add metadata, convergence check
# ============================================================
echo "[Step 4-5] Processing result..."

export CODEX_PROJECT_DIR="$PROJECT_DIR"
export CODEX_ROUND="$ROUND"
export CODEX_MODEL_USED="$MODEL_USED"

python3 - "$RAW_OUTPUT" "$PREV_OUTPUT" "$REVIEW_OUTPUT" << 'PYEOF'
import json, hashlib, sys, os

raw_path = sys.argv[1]
prev_path = sys.argv[2]
out_path = sys.argv[3]
round_num = int(os.environ.get("CODEX_ROUND", "1"))
model_used = os.environ.get("CODEX_MODEL_USED", "unknown")

# Read raw output
try:
    with open(raw_path, "r") as f:
        raw = f.read().strip()
except FileNotFoundError:
    raw = ""

if not raw:
    result = {
        "approved": False, "round": round_num, "model_used": model_used,
        "gate_passed": True, "stale": False, "error": True,
        "issues": [], "summary": "Codex returned empty response."
    }
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    sys.exit(1)

# Parse JSON
try:
    data = json.loads(raw)
except json.JSONDecodeError:
    import re
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    data = None
    if match:
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

if data is None or "approved" not in data:
    result = {
        "approved": False, "round": round_num, "model_used": model_used,
        "gate_passed": True, "stale": False, "error": True,
        "issues": [], "summary": "Failed to parse Codex response.",
        "raw_excerpt": raw[:500]
    }
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    sys.exit(1)

# Fingerprint each issue
def make_fingerprint(issue):
    key = "{}:{}:{}:{}".format(
        issue.get("file", ""),
        issue.get("line", ""),
        issue.get("severity", ""),
        issue.get("message", "").lower().strip()
    )
    return hashlib.sha256(key.encode()).hexdigest()[:16]

for issue in data.get("issues", []):
    issue["fingerprint"] = make_fingerprint(issue)

# Add metadata
data["round"] = round_num
data["model_used"] = model_used
data["gate_passed"] = True
data["error"] = False

# Convergence check
stale = False
if os.path.exists(prev_path):
    try:
        with open(prev_path, "r") as f:
            prev = json.loads(f.read())
        prev_fps = {i.get("fingerprint", "") for i in prev.get("issues", [])}
        curr_fps = {i.get("fingerprint", "") for i in data.get("issues", [])}
        prev_count = len(prev.get("issues", []))
        curr_count = len(data.get("issues", []))
        if prev_fps and curr_fps:
            overlap = len(prev_fps & curr_fps)
            max_count = max(prev_count, curr_count)
            if max_count > 0 and (overlap / max_count) >= 0.7 and curr_count >= prev_count:
                stale = True
    except (json.JSONDecodeError, KeyError):
        pass

data["stale"] = stale

# Write outputs
with open(out_path, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
with open(prev_path, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

status = "APPROVED" if data["approved"] else ("STALE" if stale else "ISSUES FOUND")
issue_count = len(data.get("issues", []))
print(f"[Result] {status} | issues: {issue_count} | model: {model_used}")
PYEOF

# ============================================================
# Step 6: Auto-generate status_report.md on final round
# ============================================================
RESULT_APPROVED=$(python3 -c "import json; d=json.load(open('$REVIEW_OUTPUT')); print('true' if d.get('approved') else 'false')")

if [ "$ROUND" -eq "$MAX_ROUND" ] && [ "$RESULT_APPROVED" = "false" ]; then
    echo "[Step 6] Round $MAX_ROUND reached without approval. Generating status_report.md ..."

    python3 - "$PROJECT_DIR" "$MAX_ROUND" << 'REPORT_EOF'
import json, os, sys, glob as g
from datetime import date

project_dir = sys.argv[1]
max_round = int(sys.argv[2])
report_path = os.path.join(project_dir, "status_report.md")
review_path = os.path.join(project_dir, ".codex-review.json")
prev_path = os.path.join(project_dir, ".codex-review-prev.json")

# Collect all available round data from the current review JSON
try:
    with open(review_path) as f:
        current = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    current = {}

issues = current.get("issues", [])
model = current.get("model_used", "unknown")
summary = current.get("summary", "N/A")

lines = [
    "# Codex Review Loop - Auto-generated Status Report",
    "",
    f"**Date**: {date.today().isoformat()}",
    f"**Final Round**: {current.get('round', max_round)}",
    f"**Model**: {model}",
    f"**Approved**: {current.get('approved', False)}",
    "",
    "---",
    "",
    "## Summary",
    "",
    summary,
    "",
    "## Remaining Issues",
    "",
    f"Total: {len(issues)} issue(s)",
    "",
]

if issues:
    lines.append("| # | File | Line | Severity | Message |")
    lines.append("|---|---|---|---|---|")
    for i, iss in enumerate(issues, 1):
        f = iss.get("file", "?")
        ln = iss.get("line") or "–"
        sev = iss.get("severity", "?")
        msg = iss.get("message", "").replace("|", "\\|")
        lines.append(f"| {i} | `{f}` | {ln} | {sev} | {msg} |")
    lines.append("")

lines += [
    "## Action Required",
    "",
    f"Max rounds ({max_round}) reached without approval.",
    "Fix the remaining issues above, `git add`, and re-run from round 1.",
    "",
    "---",
    "*Auto-generated by `scripts/codex-review.sh`*",
    "",
]

with open(report_path, "w") as f:
    f.write("\n".join(lines))

print(f"[Step 6] status_report.md written ({len(issues)} issues documented).")
REPORT_EOF

else
    echo "[Step 6] Skipped (round=$ROUND, approved=$RESULT_APPROVED)."
fi

echo "===== Round $ROUND complete. See .codex-review.json ====="
