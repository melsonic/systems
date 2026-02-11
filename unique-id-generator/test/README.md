# Load Testing for Unique ID Generator

This directory contains load testing scripts to validate the unique ID generator system under concurrent load across multiple pods.

## Quick Start

```bash
# Run the complete test workflow (starts servers, runs test, stops servers)
./test/quick-test.sh

# Or with custom configuration (5 pods, 50 users, 20 requests each)
./test/quick-test.sh 5 50 20
```

**Manual workflow:**
```bash
# 1. Start test servers (5 instances)
./test/start-test-servers.sh

# 2. Run the load test
bun test/load-test.ts --pods 5

# 3. Stop test servers when done
./test/stop-test-servers.sh
```

## Available Tests

### 1. TypeScript Load Test (Recommended)
A comprehensive load testing script with detailed statistics and analysis.

**Features:**
- Simulates multiple concurrent users
- Distributes requests across all pods
- Validates ID uniqueness
- Measures latency and throughput
- Generates detailed reports
- Exports results to JSON

**Usage:**
```bash
# Run with default settings (100 users, 100 requests each, 20 pods)
bun test/load-test.ts

# Or use npm script
npm run test:load

# Custom configuration
bun test/load-test.ts --users 200 --requests 50 --pods 20 --host localhost

# View all options
bun test/load-test.ts --help
```

**Options:**
- `--users <number>`: Number of concurrent users (default: 100)
- `--requests <number>`: Requests per user (default: 100)
- `--pods <number>`: Number of pods (default: 20)
- `--base-port <number>`: Base port number (default: 3000)
- `--host <string>`: Host address (default: localhost)

**Output:**
- Console output with detailed statistics
- `load-test-results.json`: Complete test results in JSON format

### 2. Quick Test Script
A convenient wrapper that orchestrates the complete test workflow automatically.

**What it does:**
1. Starts multiple server instances
2. Runs the TypeScript load test
3. Stops all servers (even on failure or interruption)

**Usage:**
```bash
# Run with default settings (5 pods, 100 users, 100 requests per user)
./test/quick-test.sh

# Or use npm script
npm run test:quick

# Custom configuration
./test/quick-test.sh 10 200 50
```

**Arguments:**
1. Number of pods (default: 5)
2. Number of users (default: 100)
3. Requests per user (default: 100)

**Requirements:**
- `curl` command
- `bc` command (for calculations)
- Optional: `parallel` command (for better performance)

## Helper Scripts

### Start Test Servers
Easily start multiple server instances for local testing:

```bash
# Start 5 server instances (default)
./test/start-test-servers.sh

# Start custom number of instances
./test/start-test-servers.sh 10
```

This will start servers on ports 3000-3004 (or more, depending on the number specified) with unique machine IDs and datacenter IDs.

### Stop Test Servers
Stop all running test server instances:

```bash
./test/stop-test-servers.sh
```

This will cleanly shut down all servers started by the start script.

## Test Scenarios

### Basic Validation
Test that all pods are working and generating unique IDs:
```bash
bun test/load-test.ts --users 10 --requests 10
```

### Stress Test
Simulate high load with many concurrent users:
```bash
bun test/load-test.ts --users 500 --requests 200
```

### Throughput Test
Measure maximum requests per second:
```bash
bun test/load-test.ts --users 1000 --requests 100
```

### Single Pod Test
Test a specific pod:
```bash
bun test/load-test.ts --users 50 --requests 100 --pods 1 --base-port 3005
```

## What the Tests Validate

1. **Uniqueness**: Ensures all generated IDs are unique across all pods
2. **Availability**: Verifies all pods are accessible and responding
3. **Performance**: Measures latency and throughput
4. **Load Distribution**: Shows how requests are distributed across pods
5. **Reliability**: Tracks success/failure rates

## Expected Results

For a properly functioning system:
- **0 duplicate IDs** - All IDs should be unique
- **100% success rate** - All requests should succeed
- **Even distribution** - Requests should be roughly evenly distributed across pods
- **Low latency** - Average latency should be < 50ms for local testing

## Troubleshooting

### Connection Refused Errors
If you see connection errors:
1. Ensure all pods are running: `kubectl get pods`
2. Check port forwarding or hostNetwork configuration
3. Verify the correct port range

### Duplicate IDs Found
If duplicate IDs are detected:
1. Check that each pod has a unique machine_id and datacenter_id
2. Verify the Snowflake ID generation logic
3. Check for clock synchronization issues

### High Latency
If latency is unusually high:
1. Check system resources (CPU, memory)
2. Verify network connectivity
3. Reduce concurrent users or requests

## Running Tests in Kubernetes

To test pods running in Kubernetes:

1. **Port forward all pods** (for testing):
```bash
# This is complex with 20 pods, consider using hostNetwork instead
for i in {0..19}; do
  kubectl port-forward unique-id-generator-$i $((3000+i)):3000 &
done
```

2. **Or use hostNetwork** (already configured in deployment.yaml):
```bash
# Get node IP where pods are running
kubectl get pods -o wide

# Run test against node IP
bun test/load-test.ts --host <node-ip>
```

3. **Or create a LoadBalancer service** for easier access

## Performance Benchmarks

Expected performance on typical hardware:
- **Throughput**: 10,000+ requests/second
- **Latency**: < 10ms average
- **Concurrency**: 1000+ concurrent users
- **Uniqueness**: 100% (0 duplicates)

## Example Output

```
Starting Load Test...
Configuration:
  - Users: 100
  - Requests per user: 100
  - Total requests: 10000
  - Pods: 20
  - Host: localhost
  - Port range: 3000-3019

=== Test Results ===

Performance Metrics:
  - Total Duration: 5.23s
  - Requests/Second: 1912.55
  - Avg Latency: 52.34ms
  - Min Latency: 12.45ms
  - Max Latency: 234.56ms

Request Statistics:
  - Total Requests: 10000
  - Successful: 10000 (100.00%)
  - Failed: 0 (0.00%)

ID Uniqueness:
  - Unique IDs Generated: 10000
  - Duplicate IDs Found: 0
  All IDs are unique!

Load Distribution Across Pods:
  Pod  0:   512 requests ( 5.12%) ########
  Pod  1:   498 requests ( 4.98%) ########
  ...

====================
TEST PASSED: All IDs are unique and all requests succeeded!
====================
```
