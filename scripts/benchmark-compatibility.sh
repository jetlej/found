#!/bin/bash
# Benchmark compatibility analysis across models
# Usage: ./scripts/benchmark-compatibility.sh <model> [parallelism]
# Example: ./scripts/benchmark-compatibility.sh "openai/gpt-5-mini" 5

set -e

MODEL="${1:?Usage: $0 <model-id> [parallelism]}"
PARALLEL="${2:-5}"
RESULTS_FILE=$(mktemp)

echo ""
echo "========================================"
echo "BENCHMARK: $MODEL (parallelism=$PARALLEL)"
echo "========================================"
echo ""

# Get all existing analysis pairs
PAIRS=$(bunx convex run compatibilityAnalyses:listPairs '{}' 2>/dev/null | jq -r '.[] | "\(.user1Id)|\(.user2Id)"')
PAIR_COUNT=$(echo "$PAIRS" | wc -l | tr -d ' ')
echo "Found $PAIR_COUNT pairs to analyze"
echo ""

run_one() {
  local USER1="$1" USER2="$2" IDX="$3"
  RESULT=$(bunx convex run actions/analyzeCompatibility:analyzeCompatibility \
    "{\"user1Id\":\"$USER1\",\"user2Id\":\"$USER2\",\"model\":\"$MODEL\"}" 2>/dev/null) || {
    echo "[$IDX] FAILED"
    return 0
  }

  HAS_USAGE=$(echo "$RESULT" | jq -r '.usage // empty' 2>/dev/null)
  if [ -z "$HAS_USAGE" ] || [ "$HAS_USAGE" = "null" ]; then
    echo "[$IDX] skipped"
    return 0
  fi

  PT=$(echo "$RESULT" | jq -r '.usage.promptTokens')
  CT=$(echo "$RESULT" | jq -r '.usage.completionTokens')
  TT=$(echo "$RESULT" | jq -r '.usage.totalTokens')
  COST=$(echo "$RESULT" | jq -r '.cost')

  echo "$PT $CT $TT $COST" >> "$RESULTS_FILE"
  printf "[%s] tokens=%-5s cost=\$%.6f\n" "$IDX" "$TT" "$COST"
}

export -f run_one
export MODEL RESULTS_FILE

# Run in parallel batches
IDX=0
PIDS=()
while IFS='|' read -r USER1 USER2; do
  IDX=$((IDX + 1))
  run_one "$USER1" "$USER2" "$IDX" &
  PIDS+=($!)

  # Wait for batch when we hit parallelism limit
  if [ "${#PIDS[@]}" -ge "$PARALLEL" ]; then
    for PID in "${PIDS[@]}"; do wait "$PID" 2>/dev/null; done
    PIDS=()
  fi
done <<< "$PAIRS"

# Wait for remaining
for PID in "${PIDS[@]}"; do wait "$PID" 2>/dev/null; done

# Compute stats
echo ""
echo "========================================"
echo "RESULTS: $MODEL"
echo "========================================"

if [ -s "$RESULTS_FILE" ]; then
  awk '
  {
    count++
    pt += $1; ct += $2; tt += $3; cost += $4
  }
  END {
    printf "Pairs analyzed: %d / '"$PAIR_COUNT"'\n", count
    printf "Total tokens: %d (prompt: %d, completion: %d)\n", tt, pt, ct
    printf "Total cost: $%.6f\n", cost
    if (count > 0) {
      printf "Avg tokens/run: %d (prompt: %d, completion: %d)\n", tt/count, pt/count, ct/count
      printf "Avg cost/run: $%.6f\n", cost/count
    }
  }' "$RESULTS_FILE"
else
  echo "No results collected"
fi

echo "========================================"
echo ""
rm -f "$RESULTS_FILE"
