/**
 * Load Test Script for Unique ID Generator
 * 
 * This script simulates multiple concurrent users sending HTTP requests
 * to different pods to generate unique IDs.
 * 
 * Usage:
 *   bun test/load-test.ts [options]
 * 
 * Options:
 *   --users <number>        Number of concurrent users (default: 100)
 *   --requests <number>     Total requests per user (default: 100)
 *   --pods <number>         Number of pods to distribute requests across (default: 20)
 *   --base-port <number>    Base port number (default: 3000)
 *   --host <string>         Host address (default: localhost)
 */

interface TestConfig {
    numUsers: number;
    requestsPerUser: number;
    numPods: number;
    basePort: number;
    host: string;
}

interface RequestResult {
    success: boolean;
    id?: string;
    podIndex: number;
    userId: number;
    latency: number;
    error?: string;
}

interface TestStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    uniqueIds: Set<string>;
    duplicateIds: string[];
    avgLatency: number;
    minLatency: number;
    maxLatency: number;
    requestsPerPod: Map<number, number>;
    duration: number;
    requestsPerSecond: number;
}

class LoadTester {
    private config: TestConfig;
    private results: RequestResult[] = [];
    private accessiblePods: number[] = [];

    constructor(config: TestConfig) {
        this.config = config;
    }

    /**
     * Get the URL for a specific pod
     */
    private getPodUrl(podIndex: number): string {
        const port = this.config.basePort + podIndex;
        return `http://${this.config.host}:${port}/get_id`;
    }

    /**
     * Send a single request to a random pod from accessible pods
     */
    private async sendRequest(userId: number): Promise<RequestResult> {
        // Randomly select from accessible pods only
        const randomIndex = Math.floor(Math.random() * this.accessiblePods.length);
        const podIndex = this.accessiblePods[randomIndex] || 0;
        const url = this.getPodUrl(podIndex);
        const startTime = performance.now();

        try {
            const response = await fetch(url);
            const latency = performance.now() - startTime;

            if (!response.ok) {
                return {
                    success: false,
                    podIndex,
                    userId,
                    latency,
                    error: `HTTP ${response.status}: ${response.statusText}`,
                };
            }

            const data = await response.json() as { id: string };
            return {
                success: true,
                id: data.id,
                podIndex,
                userId,
                latency,
            };
        } catch (error) {
            const latency = performance.now() - startTime;
            return {
                success: false,
                podIndex,
                userId,
                latency,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    /**
     * Simulate a single user making multiple requests
     */
    private async simulateUser(userId: number): Promise<RequestResult[]> {
        const userResults: RequestResult[] = [];

        for (let i = 0; i < this.config.requestsPerUser; i++) {
            const result = await this.sendRequest(userId);
            userResults.push(result);
        }

        return userResults;
    }

    /**
     * Check if pods are accessible before running the full test
     */
    private async checkConnectivity(): Promise<{ accessible: number[]; failed: number[] }> {
        console.log('Checking pod connectivity...');

        const checks = Array.from({ length: this.config.numPods }, async (_, podIndex) => {
            const url = this.getPodUrl(podIndex);
            try {
                const response = await fetch(url, {
                    signal: AbortSignal.timeout(2000) // 2 second timeout
                });
                return { podIndex, accessible: response.ok };
            } catch {
                return { podIndex, accessible: false };
            }
        });

        const results = await Promise.all(checks);
        const accessible = results.filter(r => r.accessible).map(r => r.podIndex);
        const failed = results.filter(r => !r.accessible).map(r => r.podIndex);

        console.log(`  Accessible pods: ${accessible.length}/${this.config.numPods}`);

        if (accessible.length === 0) {
            console.log(`  No pods are accessible!`);
            console.log('');
            console.log('Troubleshooting:');
            console.log('  1. Start the server locally:');
            console.log('     bun src/index.ts');
            console.log('');
            console.log('  2. Or start multiple instances for testing:');
            console.log('     for i in {0..4}; do PORT=$((3000+i)) MACHINE_ID=$i DATACENTER_ID=0 bun src/index.ts & done');
            console.log('');
            console.log('  3. If using Kubernetes, ensure pods are running:');
            console.log('     kubectl get pods');
            console.log('     kubectl port-forward <pod-name> 3000:3000');
            console.log('');
            throw new Error('No accessible pods found. Please start the server first.');
        }

        if (failed.length > 0) {
            console.log(`  WARNING: Inaccessible pods: ${failed.join(', ')}`);
            console.log(`  INFO: Test will only use ${accessible.length} accessible pod(s)`);
        }

        console.log('');
        return { accessible, failed };
    }

    /**
     * Run the load test with all concurrent users
     */
    async run(): Promise<TestStats> {
        console.log('Starting Load Test...');
        console.log('Configuration:');
        console.log(`  - Users: ${this.config.numUsers}`);
        console.log(`  - Requests per user: ${this.config.requestsPerUser}`);
        console.log(`  - Total requests: ${this.config.numUsers * this.config.requestsPerUser}`);
        console.log(`  - Pods: ${this.config.numPods}`);
        console.log(`  - Host: ${this.config.host}`);
        console.log(`  - Port range: ${this.config.basePort}-${this.config.basePort + this.config.numPods - 1}`);
        console.log('');

        // Check connectivity first
        const { accessible } = await this.checkConnectivity();
        this.accessiblePods = accessible;

        const startTime = performance.now();

        // Create promises for all users running concurrently
        const userPromises = Array.from(
            { length: this.config.numUsers },
            (_, userId) => this.simulateUser(userId)
        );

        // Wait for all users to complete
        const allResults = await Promise.all(userPromises);
        this.results = allResults.flat();

        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000; // Convert to seconds

        return this.calculateStats(duration);
    }

    /**
     * Calculate statistics from test results
     */
    private calculateStats(duration: number): TestStats {
        const successfulResults = this.results.filter(r => r.success);
        const failedResults = this.results.filter(r => !r.success);

        // Collect all IDs and check for duplicates
        const uniqueIds = new Set<string>();
        const duplicateIds: string[] = [];

        for (const result of successfulResults) {
            if (result.id) {
                if (uniqueIds.has(result.id)) {
                    duplicateIds.push(result.id);
                } else {
                    uniqueIds.add(result.id);
                }
            }
        }

        // Calculate latency statistics
        const latencies = this.results.map(r => r.latency);
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const minLatency = Math.min(...latencies);
        const maxLatency = Math.max(...latencies);

        // Count requests per pod
        const requestsPerPod = new Map<number, number>();
        for (const result of this.results) {
            const count = requestsPerPod.get(result.podIndex) || 0;
            requestsPerPod.set(result.podIndex, count + 1);
        }

        return {
            totalRequests: this.results.length,
            successfulRequests: successfulResults.length,
            failedRequests: failedResults.length,
            uniqueIds,
            duplicateIds,
            avgLatency,
            minLatency,
            maxLatency,
            requestsPerPod,
            duration,
            requestsPerSecond: this.results.length / duration,
        };
    }

    /**
     * Print detailed test results
     */
    printResults(stats: TestStats): void {
        console.log('');
        console.log('=== Test Results ===');
        console.log('');

        console.log('Performance Metrics:');
        console.log(`  - Total Duration: ${stats.duration.toFixed(2)}s`);
        console.log(`  - Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);
        console.log(`  - Avg Latency: ${stats.avgLatency.toFixed(2)}ms`);
        console.log(`  - Min Latency: ${stats.minLatency.toFixed(2)}ms`);
        console.log(`  - Max Latency: ${stats.maxLatency.toFixed(2)}ms`);
        console.log('');

        console.log('Request Statistics:');
        console.log(`  - Total Requests: ${stats.totalRequests}`);
        console.log(`  - Successful: ${stats.successfulRequests} (${(stats.successfulRequests / stats.totalRequests * 100).toFixed(2)}%)`);
        console.log(`  - Failed: ${stats.failedRequests} (${(stats.failedRequests / stats.totalRequests * 100).toFixed(2)}%)`);
        console.log('');

        console.log('ID Uniqueness:');
        console.log(`  - Unique IDs Generated: ${stats.uniqueIds.size}`);
        console.log(`  - Duplicate IDs Found: ${stats.duplicateIds.length}`);

        if (stats.duplicateIds.length > 0) {
            console.log('  WARNING: Duplicate IDs detected!');
            console.log(`  - Duplicates: ${stats.duplicateIds.slice(0, 10).join(', ')}${stats.duplicateIds.length > 10 ? '...' : ''}`);
        } else {
            console.log('  All IDs are unique!');
        }
        console.log('');

        console.log('Load Distribution Across Pods:');
        const sortedPods = Array.from(stats.requestsPerPod.entries()).sort((a, b) => a[0] - b[0]);
        for (const [podIndex, count] of sortedPods) {
            const percentage = (count / stats.totalRequests * 100).toFixed(2);
            const barLength = Math.floor(count / stats.totalRequests * 50);
            const bar = '#'.repeat(barLength);
            console.log(`  Pod ${podIndex.toString().padStart(2)}: ${count.toString().padStart(5)} requests (${percentage.padStart(5)}%) ${bar}`);
        }
        console.log('');

        // Show sample of failed requests if any
        if (stats.failedRequests > 0) {
            console.log('Sample Failed Requests:');
            const failedResults = this.results.filter(r => !r.success).slice(0, 5);
            for (const result of failedResults) {
                console.log(`  - User ${result.userId}, Pod ${result.podIndex}: ${result.error}`);
            }
            console.log('');
        }

        // Overall verdict
        console.log('====================');
        if (stats.duplicateIds.length === 0 && stats.failedRequests === 0) {
            console.log('TEST PASSED: All IDs are unique and all requests succeeded!');
        } else if (stats.duplicateIds.length > 0) {
            console.log('TEST FAILED: Duplicate IDs detected!');
        } else {
            console.log('TEST COMPLETED WITH ERRORS: Some requests failed.');
        }
        console.log('====================');
    }

    /**
     * Export results to JSON file
     */
    async exportResults(stats: TestStats, filename: string = 'load-test-results.json'): Promise<void> {
        const exportData = {
            config: this.config,
            stats: {
                ...stats,
                uniqueIds: Array.from(stats.uniqueIds),
                requestsPerPod: Object.fromEntries(stats.requestsPerPod),
            },
            timestamp: new Date().toISOString(),
        };

        await Bun.write(filename, JSON.stringify(exportData, null, 2));
        console.log(`Results exported to ${filename}`);
    }
}

/**
 * Parse command line arguments
 */
function parseArgs(): TestConfig {
    const args = process.argv.slice(2);
    const config: TestConfig = {
        numUsers: 100,
        requestsPerUser: 100,
        numPods: 20,
        basePort: 3000,
        host: 'localhost',
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--users':
                config.numUsers = parseInt(args[++i] || '100');
                break;
            case '--requests':
                config.requestsPerUser = parseInt(args[++i] || '100');
                break;
            case '--pods':
                config.numPods = parseInt(args[++i] || '20');
                break;
            case '--base-port':
                config.basePort = parseInt(args[++i] || '3000');
                break;
            case '--host':
                config.host = args[++i] || 'localhost';
                break;
            case '--help':
                console.log('Usage: bun test/load-test.ts [options]');
                console.log('');
                console.log('Options:');
                console.log('  --users <number>        Number of concurrent users (default: 100)');
                console.log('  --requests <number>     Total requests per user (default: 100)');
                console.log('  --pods <number>         Number of pods to distribute requests across (default: 20)');
                console.log('  --base-port <number>    Base port number (default: 3000)');
                console.log('  --host <string>         Host address (default: localhost)');
                console.log('  --help                  Show this help message');
                process.exit(0);
        }
    }

    return config;
}

/**
 * Main execution
 */
async function main() {
    const config = parseArgs();
    const tester = new LoadTester(config);

    try {
        const stats = await tester.run();
        tester.printResults(stats);
        await tester.exportResults(stats);
    } catch (error) {
        console.error('Test failed with error:', error);
        process.exit(1);
    }
}

// Run the test
main();
