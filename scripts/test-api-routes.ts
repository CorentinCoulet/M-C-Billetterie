/**
 * Test Script for Next.js API Routes
 * Tests all migrated endpoints to ensure they work correctly
 */

const API_BASE_URL = 'http://localhost:3001/api';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
  data?: any;
}

class APITester {
  private results: TestResult[] = [];

  async test(endpoint: string, method: string = 'GET', body?: any, token?: string): Promise<TestResult> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      
      const result: TestResult = {
        endpoint,
        method,
        status: response.status,
        success: response.ok,
        data,
      };

      if (!response.ok) {
        result.error = data.error || `HTTP ${response.status}`;
      }

      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        endpoint,
        method,
        status: 0,
        success: false,
        error: (error as Error).message,
      };

      this.results.push(result);
      return result;
    }
  }

  printResult(result: TestResult): void {
    const status = result.success ? '✅' : '❌';
    const statusCode = result.status || 'N/A';
    console.log(`${status} ${result.method} ${result.endpoint} - ${statusCode}`);
    
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  printSummary(): void {
    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Résultats: ${successful}/${total} tests réussis`);
    console.log('='.repeat(50));
    
    if (successful === total) {
      console.log('🎉 Tous les tests sont passés ! La migration est réussie.');
    } else {
      console.log('⚠️  Certains endpoints nécessitent des ajustements.');
    }
  }
}

async function runTests(): Promise<void> {
  console.log('🧪 Test des API Routes Next.js');
  console.log('==============================\n');

  const tester = new APITester();

  // Test health check (should exist in middleware or separate route)
  console.log('📡 Tests d\'infrastructure:');
  const healthResult = await tester.test('/health');
  tester.printResult(healthResult);

  // Test public routes
  console.log('\n🌐 Tests des routes publiques:');
  
  // Test auth register (should require body)
  const registerResult = await tester.test('/auth/register', 'POST', {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User'
  });
  tester.printResult(registerResult);

  // Test auth login (should require body)
  const loginResult = await tester.test('/auth/login', 'POST', {
    email: 'user@demo.com',
    password: 'demo123'
  });
  tester.printResult(loginResult);

  // Test forgot password
  const forgotResult = await tester.test('/auth/forgot-password', 'POST', {
    email: 'test@example.com'
  });
  tester.printResult(forgotResult);

  // Test events list (public)
  const eventsResult = await tester.test('/events');
  tester.printResult(eventsResult);

  // Test protected routes (without auth - should fail)
  console.log('\n🔒 Tests des routes protégées (sans auth):');
  
  const meResult = await tester.test('/auth/me');
  tester.printResult(meResult);

  const ordersResult = await tester.test('/orders');
  tester.printResult(ordersResult);

  const paymentsResult = await tester.test('/payments');
  tester.printResult(paymentsResult);

  // Test with token if login was successful
  if (loginResult.success && loginResult.data?.data?.token) {
    const token = loginResult.data.data.token;
    
    console.log('\n🔐 Tests des routes protégées (avec auth):');
    
    const meAuthResult = await tester.test('/auth/me', 'GET', undefined, token);
    tester.printResult(meAuthResult);

    const ordersAuthResult = await tester.test('/orders', 'GET', undefined, token);
    tester.printResult(ordersAuthResult);

    const paymentsAuthResult = await tester.test('/payments', 'GET', undefined, token);
    tester.printResult(paymentsAuthResult);
  }

  // Test invalid endpoints
  console.log('\n❓ Tests des routes inexistantes:');
  
  const notFoundResult = await tester.test('/nonexistent');
  tester.printResult(notFoundResult);

  tester.printSummary();
}

// Run tests
runTests().catch(console.error);
