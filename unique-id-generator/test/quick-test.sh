#!/bin/bash

# Quick Load Test Script for Unique ID Generator
# This script orchestrates the complete test workflow:
# 1. Start test servers
# 2. Run the TypeScript load test
# 3. Stop test servers
#
# Usage: ./test/quick-test.sh [num_pods] [num_users] [num_requests]

NUM_PODS=${1:-5}
NUM_USERS=${2:-100}
NUM_REQUESTS=${3:-100}
BASE_PORT=3000

echo "Quick Load Test Workflow"
echo "========================"
echo "Pods: $NUM_PODS"
echo "Users: $NUM_USERS"
echo "Requests per user: $NUM_REQUESTS"
echo ""

# Cleanup function to ensure servers are stopped on exit
cleanup() {
    echo ""
    echo "Cleaning up..."
    ./test/stop-test-servers.sh 2>/dev/null || true
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Step 1: Start test servers
echo "Step 1: Starting $NUM_PODS test servers..."
./test/start-test-servers.sh $NUM_PODS

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to start test servers"
    exit 1
fi

# Wait a moment for servers to be fully ready
echo "Waiting for servers to be ready..."
sleep 2

# Step 2: Run the TypeScript load test
echo ""
echo "Step 2: Running load test..."
echo ""

bun test/load-test.ts --pods $NUM_PODS --users $NUM_USERS --requests $NUM_REQUESTS

TEST_EXIT_CODE=$?

# Step 3: Stop test servers (handled by cleanup trap)
echo ""
echo "Step 3: Stopping test servers..."

# Exit with the same code as the load test
exit $TEST_EXIT_CODE
