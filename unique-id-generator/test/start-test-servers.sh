#!/bin/bash

# Helper script to start multiple server instances for local testing
# Usage: ./test/start-test-servers.sh [num_instances]

NUM_INSTANCES=${1:-5}
BASE_PORT=3000

echo "Starting $NUM_INSTANCES server instances..."
echo "Port range: $BASE_PORT-$((BASE_PORT + NUM_INSTANCES - 1))"
echo ""

# Create a temporary file to store PIDs
PID_FILE="/tmp/unique-id-generator-pids.txt"
> "$PID_FILE"

# Start each instance
for i in $(seq 0 $((NUM_INSTANCES - 1))); do
    PORT=$((BASE_PORT + i))
    MACHINE_ID=$((i % 32))
    DATACENTER_ID=$((i / 32))
    
    echo "Starting instance $i: PORT=$PORT, MACHINE_ID=$MACHINE_ID, DATACENTER_ID=$DATACENTER_ID"
    
    PORT=$PORT MACHINE_ID=$MACHINE_ID DATACENTER_ID=$DATACENTER_ID bun src/index.ts > /tmp/server-$i.log 2>&1 &
    PID=$!
    echo "$PID" >> "$PID_FILE"
    
    # Give it a moment to start
    sleep 0.1
done

echo ""
echo "Started $NUM_INSTANCES server instances"
echo "PIDs saved to $PID_FILE"
echo "Logs: /tmp/server-*.log"
echo ""
echo "To stop all servers, run:"
echo "  ./test/stop-test-servers.sh"
echo ""
echo "To run the load test:"
echo "  bun test/load-test.ts --pods $NUM_INSTANCES"
