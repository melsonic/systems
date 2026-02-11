#!/bin/bash

# Helper script to stop all test server instances
# Usage: ./test/stop-test-servers.sh

PID_FILE="/tmp/unique-id-generator-pids.txt"

if [ ! -f "$PID_FILE" ]; then
    echo "WARNING: No PID file found at $PID_FILE"
    echo "Servers may not be running or were started manually."
    exit 1
fi

echo "Stopping server instances..."

while read -r PID; do
    if kill -0 "$PID" 2>/dev/null; then
        echo "Stopping process $PID"
        kill "$PID"
    else
        echo "Process $PID not running"
    fi
done < "$PID_FILE"

# Clean up
rm -f "$PID_FILE"
rm -f /tmp/server-*.log

echo "All servers stopped"
