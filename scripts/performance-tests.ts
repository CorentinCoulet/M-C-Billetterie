#!/usr/bin/env node

/**
 * Performance and Load Testing Suite
 * Comprehensive testing for production readiness
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface LoadTestConfig {
  baseUrl: string;
  duration: string;
  users: number;
  rampUp: string;
  scenarios: TestScenario[];
}

interface TestScenario {
  name: string;
  weight: number;
  endpoints: TestEndpoint[];
}

interface TestEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  payload?: any;
  headers?: Record<string, string>;
  expectedStatus: number;
}

class PerformanceTestSuite {
  private config: LoadTestConfig;
  private resultsDir: string;

  constructor() {
    this.config = {
      baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
      duration: process.env.TEST_DURATION || '5m',
      users: parseInt(process.env.TEST_USERS || '100'),
      rampUp: process.env.TEST_RAMP_UP || '30s',
      scenarios: [
        {
          name: 'browse_events',
          weight: 40,
          endpoints: [
            { method: 'GET', path: '/api/events', expectedStatus: 200 },
            { method: 'GET', path: '/api/events/search?q=concert', expectedStatus: 200 },
            { method: 'GET', path: '/api/categories', expectedStatus: 200 }
          ]
        },
        {
          name: 'user_registration',
          weight: 20,
          endpoints: [
            {
              method: 'POST',
              path: '/api/auth/register',
              payload: {
                email: `test${Date.now()}@example.com`,
                password: 'SecurePass123!',
                name: 'Test User'
              },
              expectedStatus: 201
            }
          ]
        },
        {
          name: 'user_authentication',
          weight: 30,
          endpoints: [
            {
              method: 'POST',
              path: '/api/auth/login',
              payload: {
                email: 'test@example.com',
                password: 'SecurePass123!'
              },
              expectedStatus: 200
            }
          ]
        },
        {
          name: 'ticket_purchase_flow',
          weight: 10,
          endpoints: [
            { method: 'GET', path: '/api/events/1', expectedStatus: 200 },
            {
              method: 'POST',
              path: '/api/orders',
              payload: {
                eventId: '1',
                quantity: 2
              },
              expectedStatus: 201
            }
          ]
        }
      ]
    };

    this.resultsDir = path.join(process.cwd(), 'performance-results');
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  /**
   * Run comprehensive performance tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Performance Test Suite');
    console.log(`Target: ${this.config.baseUrl}`);
    console.log(`Users: ${this.config.users}`);
    console.log(`Duration: ${this.config.duration}`);
    console.log('=====================================\n');

    try {
      // Pre-test health check
      await this.healthCheck();
      
      // Run different test types
      await this.runLoadTest();
      await this.runStressTest();
      await this.runSpikeTest();
      await this.runEnduranceTest();
      
      // Generate combined report
      await this.generateSummaryReport();
      
      console.log('\n✅ All performance tests completed successfully');
      console.log(`📊 Results saved to: ${this.resultsDir}`);
      
    } catch (error) {
      console.error('❌ Performance tests failed:', error);
      process.exit(1);
    }
  }

  /**
   * Basic health check before testing
   */
  private async healthCheck(): Promise<void> {
    console.log('🔍 Running pre-test health check...');
    
    try {
      const response = await fetch(`${this.config.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      console.log('✅ Application is healthy\n');
    } catch (error) {
      throw new Error(`Cannot reach application: ${error}`);
    }
  }

  /**
   * Load test - normal expected load
   */
  private async runLoadTest(): Promise<void> {
    console.log('📈 Running Load Test (Normal Load)...');
    
    const script = this.generateK6Script({
      testName: 'load_test',
      users: this.config.users,
      duration: this.config.duration,
      thresholds: {
        http_req_duration: ['p(95)<2000'], // 95% under 2s
        http_req_failed: ['rate<0.1'], // Less than 10% errors
        http_reqs: ['rate>10'] // At least 10 RPS
      }
    });

    await this.runK6Test('load-test', script);
  }

  /**
   * Stress test - find breaking point
   */
  private async runStressTest(): Promise<void> {
    console.log('🔥 Running Stress Test (Breaking Point)...');
    
    const script = this.generateK6Script({
      testName: 'stress_test',
      users: this.config.users * 2,
      duration: '10m',
      rampUp: '2m',
      rampDown: '2m',
      thresholds: {
        http_req_duration: ['p(95)<5000'], // More relaxed thresholds
        http_req_failed: ['rate<0.3']
      }
    });

    await this.runK6Test('stress-test', script);
  }

  /**
   * Spike test - sudden load increase
   */
  private async runSpikeTest(): Promise<void> {
    console.log('⚡ Running Spike Test (Sudden Load)...');
    
    const script = `
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: ${this.config.users} },
    { duration: '30s', target: ${this.config.users * 5} }, // Spike
    { duration: '1m', target: ${this.config.users} },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.2']
  }
};

${this.generateScenarioFunctions()}

export default function() {
  // Random scenario selection
  const scenarios = [browseEvents, userAuth, ticketPurchase];
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();
}
`;

    await this.runK6Test('spike-test', script);
  }

  /**
   * Endurance test - extended duration
   */
  private async runEnduranceTest(): Promise<void> {
    console.log('⏱️ Running Endurance Test (Extended Duration)...');
    
    const script = this.generateK6Script({
      testName: 'endurance_test',
      users: Math.floor(this.config.users * 0.7),
      duration: '30m',
      thresholds: {
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.1'],
        http_reqs: ['rate>5']
      }
    });

    await this.runK6Test('endurance-test', script);
  }

  /**
   * Generate K6 test script
   */
  private generateK6Script(config: {
    testName: string;
    users: number;
    duration: string;
    rampUp?: string;
    rampDown?: string;
    thresholds: Record<string, string[]>;
  }): string {
    const stages = [];
    
    if (config.rampUp) {
      stages.push(`{ duration: '${config.rampUp}', target: ${config.users} }`);
    }
    
    stages.push(`{ duration: '${config.duration}', target: ${config.users} }`);
    
    if (config.rampDown) {
      stages.push(`{ duration: '${config.rampDown}', target: 0 }`);
    }

    const thresholdsStr = Object.entries(config.thresholds)
      .map(([key, values]) => `    '${key}': [${values.map(v => `'${v}'`).join(', ')}]`)
      .join(',\n');

    return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export let options = {
  stages: [
    ${stages.join(',\n    ')}
  ],
  thresholds: {
${thresholdsStr}
  }
};

${this.generateScenarioFunctions()}

export default function() {
  // Weighted scenario selection
  const rand = Math.random() * 100;
  let cumWeight = 0;
  
  ${this.config.scenarios.map((scenario, index) => `
  cumWeight += ${scenario.weight};
  if (rand < cumWeight) {
    ${scenario.name}();
    return;
  }`).join('')}
  
  // Fallback
  browseEvents();
}
`;
  }

  /**
   * Generate scenario functions for K6
   */
  private generateScenarioFunctions(): string {
    return this.config.scenarios.map(scenario => `
function ${scenario.name}() {
  ${scenario.endpoints.map((endpoint, index) => `
  // ${endpoint.method} ${endpoint.path}
  const response${index} = http.${endpoint.method.toLowerCase()}(
    '${this.config.baseUrl}${endpoint.path}'${endpoint.payload ? `,
    JSON.stringify(${JSON.stringify(endpoint.payload)})` : ''}${endpoint.headers ? `,
    {
      headers: ${JSON.stringify(endpoint.headers)}
    }` : ''}
  );
  
  check(response${index}, {
    'status is ${endpoint.expectedStatus}': (r) => r.status === ${endpoint.expectedStatus},
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(response${index}.status !== ${endpoint.expectedStatus});
  responseTime.add(response${index}.timings.duration);
  
  sleep(Math.random() * 2 + 1); // 1-3 seconds think time
  `).join('\n')}
}
`).join('\n');
  }

  /**
   * Run K6 test
   */
  private async runK6Test(testName: string, script: string): Promise<void> {
    const scriptPath = path.join(this.resultsDir, `${testName}.js`);
    const resultsPath = path.join(this.resultsDir, `${testName}-results.json`);
    
    // Write script file
    fs.writeFileSync(scriptPath, script);
    
    try {
      // Run K6 test
      const command = `k6 run --out json=${resultsPath} ${scriptPath}`;
      console.log(`Running: ${command}`);
      
      execSync(command, { 
        stdio: 'inherit',
        cwd: this.resultsDir 
      });
      
      // Parse and display results
      await this.parseResults(testName, resultsPath);
      
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error);
      throw error;
    }
  }

  /**
   * Parse K6 results
   */
  private async parseResults(testName: string, resultsPath: string): Promise<void> {
    if (!fs.existsSync(resultsPath)) {
      console.warn(`⚠️ Results file not found: ${resultsPath}`);
      return;
    }

    const results = fs.readFileSync(resultsPath, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const metrics = results
      .filter(r => r.type === 'Point' && r.metric)
      .reduce((acc, r) => {
        const metricName = r.metric;
        if (!acc[metricName]) acc[metricName] = [];
        acc[metricName].push(r.data.value);
        return acc;
      }, {} as Record<string, number[]>);

    // Calculate statistics
    const stats = Object.entries(metrics).reduce((acc, [metric, values]) => {
      const metricValues = values as number[];
      acc[metric] = {
        count: metricValues.length,
        avg: metricValues.reduce((a: number, b: number) => a + b, 0) / metricValues.length,
        min: Math.min(...metricValues),
        max: Math.max(...metricValues),
        p95: this.percentile(metricValues, 95),
        p99: this.percentile(metricValues, 99)
      };
      return acc;
    }, {} as Record<string, any>);

    // Display results
    console.log(`\n📊 ${testName} Results:`);
    console.log('================================');
    
    if (stats.http_req_duration) {
      console.log(`Response Time (ms):`);
      console.log(`  Average: ${stats.http_req_duration.avg.toFixed(2)}`);
      console.log(`  95th percentile: ${stats.http_req_duration.p95.toFixed(2)}`);
      console.log(`  99th percentile: ${stats.http_req_duration.p99.toFixed(2)}`);
    }

    if (stats.http_reqs) {
      console.log(`Requests: ${stats.http_reqs.count}`);
    }

    if (stats.errors) {
      const errorRate = stats.errors.avg * 100;
      console.log(`Error Rate: ${errorRate.toFixed(2)}%`);
    }

    console.log('');

    // Save summary
    const summary = {
      testName,
      timestamp: new Date().toISOString(),
      stats,
      passed: this.evaluateTestResults(stats)
    };

    fs.writeFileSync(
      path.join(this.resultsDir, `${testName}-summary.json`),
      JSON.stringify(summary, null, 2)
    );
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Evaluate if test results meet criteria
   */
  private evaluateTestResults(stats: Record<string, any>): boolean {
    // Basic pass/fail criteria
    const criteria = [
      // Response time should be under 2s for 95% of requests
      !stats.http_req_duration || stats.http_req_duration.p95 < 2000,
      // Error rate should be under 10%
      !stats.errors || stats.errors.avg < 0.1,
      // Should handle at least 5 RPS
      !stats.http_reqs || stats.http_reqs.count / 300 >= 5 // Assuming 5min test
    ];

    return criteria.every(Boolean);
  }

  /**
   * Generate summary report
   */
  private async generateSummaryReport(): Promise<void> {
    console.log('📋 Generating Performance Summary Report...');

    const summaryFiles = fs.readdirSync(this.resultsDir)
      .filter(f => f.endsWith('-summary.json'));

    const summaries = summaryFiles.map(file => {
      const content = fs.readFileSync(path.join(this.resultsDir, file), 'utf8');
      return JSON.parse(content);
    });

    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      results: summaries,
      overall: {
        totalTests: summaries.length,
        passed: summaries.filter(s => s.passed).length,
        failed: summaries.filter(s => !s.passed).length,
        passRate: (summaries.filter(s => s.passed).length / summaries.length) * 100
      },
      recommendations: this.generateRecommendations(summaries)
    };

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(report);
    fs.writeFileSync(path.join(this.resultsDir, 'performance-report.html'), htmlReport);

    // Save JSON report
    fs.writeFileSync(
      path.join(this.resultsDir, 'performance-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log(`\n🎯 Performance Summary:`);
    console.log(`Tests Run: ${report.overall.totalTests}`);
    console.log(`Passed: ${report.overall.passed}`);
    console.log(`Failed: ${report.overall.failed}`);
    console.log(`Pass Rate: ${report.overall.passRate.toFixed(1)}%`);
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(summaries: any[]): string[] {
    const recommendations: string[] = [];

    summaries.forEach(summary => {
      const stats = summary.stats;

      if (stats.http_req_duration?.p95 > 2000) {
        recommendations.push(`${summary.testName}: Consider optimizing response times (95th percentile: ${stats.http_req_duration.p95.toFixed(0)}ms)`);
      }

      if (stats.errors?.avg > 0.05) {
        recommendations.push(`${summary.testName}: High error rate detected (${(stats.errors.avg * 100).toFixed(1)}%), investigate application stability`);
      }

      if (stats.http_reqs && stats.http_reqs.count / 300 < 5) {
        recommendations.push(`${summary.testName}: Low throughput detected, consider scaling or optimization`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('All performance metrics are within acceptable ranges');
    }

    return recommendations;
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .metric { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 3px; }
        .pass { color: green; font-weight: bold; }
        .fail { color: red; font-weight: bold; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Test Report</h1>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
        <p><strong>Target:</strong> ${report.config.baseUrl}</p>
        <p><strong>Overall Pass Rate:</strong> <span class="${report.overall.passRate > 80 ? 'pass' : 'fail'}">${report.overall.passRate.toFixed(1)}%</span></p>
    </div>

    <h2>Test Results Summary</h2>
    <table>
        <tr>
            <th>Test</th>
            <th>Status</th>
            <th>Avg Response Time (ms)</th>
            <th>95th Percentile (ms)</th>
            <th>Error Rate</th>
            <th>Requests</th>
        </tr>
        ${report.results.map((r: any) => `
        <tr>
            <td>${r.testName}</td>
            <td class="${r.passed ? 'pass' : 'fail'}">${r.passed ? 'PASS' : 'FAIL'}</td>
            <td>${r.stats.http_req_duration?.avg?.toFixed(2) || 'N/A'}</td>
            <td>${r.stats.http_req_duration?.p95?.toFixed(2) || 'N/A'}</td>
            <td>${r.stats.errors ? (r.stats.errors.avg * 100).toFixed(2) + '%' : 'N/A'}</td>
            <td>${r.stats.http_reqs?.count || 'N/A'}</td>
        </tr>
        `).join('')}
    </table>

    <div class="recommendations">
        <h3>Recommendations</h3>
        <ul>
            ${report.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
        </ul>
    </div>

    <h2>Detailed Results</h2>
    ${report.results.map((r: any) => `
    <div class="metric">
        <h3>${r.testName} <span class="${r.passed ? 'pass' : 'fail'}">(${r.passed ? 'PASSED' : 'FAILED'})</span></h3>
        <p><strong>Timestamp:</strong> ${r.timestamp}</p>
        <pre>${JSON.stringify(r.stats, null, 2)}</pre>
    </div>
    `).join('')}
</body>
</html>
    `;
  }
}

// CLI execution
if (require.main === module) {
  const testSuite = new PerformanceTestSuite();
  testSuite.runAllTests().catch(console.error);
}

export default PerformanceTestSuite;
