#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"        # go-backend/
PARENT="$(dirname "$ROOT")"            # ~/erp/
ENV_FILE="$PARENT/.env"
PID_FILE="$PARENT/.pids"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found."
  echo "Copy go-backend/scripts/.env.template to ../.env and fill in values."
  exit 1
fi

set -a; source "$ENV_FILE"; set +a
rm -f "$PID_FILE"

declare -A SERVICES=(
  ["academics-service"]=5001
  ["admissions-service"]=5002
  ["analytics-service"]=5003
  ["communication-service"]=5004
  ["dataimport-service"]=5005
  ["finance-service"]=5006
  ["hostel-service"]=5007
  ["inventory-service"]=5008
  ["library-service"]=5009
  ["maintenance-service"]=5010
  ["notifications-service"]=5011
  ["payroll-service"]=5012
  ["reports-service"]=5013
  ["school-service"]=5014
  ["settings-service"]=5015
  ["socialmedia-service"]=5016
  ["staff-service"]=5017
  ["students-service"]=5018
  ["survey-service"]=5019
  ["timetable-service"]=5020
  ["transport-service"]=5021
  ["visitor-service"]=5022
)

wait_health() {
  local port=$1 name=$2 i=0
  while [ $i -lt 30 ]; do
    if curl -sf "http://localhost:$port/health" >/dev/null 2>&1; then
      echo "  v $name :$port"
      return 0
    fi
    sleep 1; i=$((i+1))
  done
  echo "  x $name :$port — failed after 30s"
  return 1
}

echo "Starting 22 microservices..."
for name in "${!SERVICES[@]}"; do
  port="${SERVICES[$name]}"
  dir="$PARENT/$name"
  if [ ! -d "$dir" ]; then echo "  SKIP $name (dir not found)"; continue; fi
  (cd "$dir" && PORT=$port go run ./cmd) &
  echo "$!" >> "$PID_FILE"
  echo "  -> $name :$port (pid $!)"
done

echo ""
echo "Waiting for services..."
for name in "${!SERVICES[@]}"; do
  wait_health "${SERVICES[$name]}" "$name"
done

echo ""
echo "Starting gateway :${GATEWAY_PORT:-8080}..."
(cd "$ROOT" && PORT=${GATEWAY_PORT:-8080} go run ./cmd/server) &
echo "$!" >> "$PID_FILE"
echo "  v gateway :${GATEWAY_PORT:-8080} (pid $!)"

echo ""
echo "Done. PIDs in $PID_FILE — run stop-all.sh to stop."
