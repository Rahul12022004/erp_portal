#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PARENT="$(dirname "$(dirname "$SCRIPT_DIR")")"
PID_FILE="$PARENT/.pids"

if [ ! -f "$PID_FILE" ]; then
  echo "No .pids file at $PID_FILE"
  exit 0
fi

echo "Stopping all services..."
while IFS= read -r pid; do
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" && echo "  killed $pid"
  fi
done < "$PID_FILE"
rm -f "$PID_FILE"
echo "Done."
