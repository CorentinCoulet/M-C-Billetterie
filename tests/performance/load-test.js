import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const loginErrors = new Rate('login_errors');
const ticketPurchaseErrors = new Rate('ticket_purchase_errors');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');

// Test data
const users = new SharedArray('users', function () {
  return Array.from({ length: 1000 }, (_, i) => ({
    email: `user${i}@test.com`,
    password: 'TestPassword123!',
    id: null,
    token: null
  }));
});

const events = new SharedArray('events', function () {
  return [
    { id: 1, name: 'Concert Rock', price: 50 },
    { id: 2, name: 'Théâtre Classique', price: 30 },
    { id: 3, name: 'Festival Jazz', price: 75 },
  ];
});

export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 10 },   // 10 users for 2 minutes
    { duration: '5m', target: 50 },   // 50 users for 5 minutes  
    { duration: '10m', target: 100 }, // 100 users for 10 minutes
    { duration: '5m', target: 200 },  // 200 users for 5 minutes (peak)
    { duration: '10m', target: 200 }, // Stay at 200 users
    { duration: '5m', target: 100 },  // Scale down
    { duration: '5m', target: 0 },    // Scale down to 0
  ],
  thresholds: {
    // Performance requirements
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% under 2s, 99% under 5s
    http_req_failed: ['rate<0.05'],                   // Less than 5% errors
    login_errors: ['rate<0.02'],                      // Less than 2% login errors
    ticket_purchase_errors: ['rate<0.01'],            // Less than 1% purchase errors
    http_reqs: ['rate>50'],                          // At least 50 req/s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);
  
  // Health check
  const healthCheck = http.get(`${API_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`Health check failed: ${healthCheck.status}`);
  }
  
  console.log('Health check passed, starting load test...');
  return { baseUrl: BASE_URL, apiUrl: API_URL };
}

export default function (data) {
  const user = users[Math.floor(Math.random() * users.length)];
  const event = events[Math.floor(Math.random() * events.length)];
  
  // Authentication flow
  const loginResult = authenticateUser(data.apiUrl, user);
  if (!loginResult.success) {
    loginErrors.add(1);
    sleep(1);
    return;
  }
  
  const token = loginResult.token;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  // User journey scenarios
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% - Browse events
    browseEvents(data.apiUrl, headers);
  } else if (scenario < 0.7) {
    // 30% - Purchase ticket
    purchaseTicket(data.apiUrl, headers, event);
  } else if (scenario < 0.9) {
    // 20% - View user profile
    viewProfile(data.apiUrl, headers);
  } else {
    // 10% - Admin operations
    performAdminOperations(data.apiUrl, headers);
  }
  
  sleep(Math.random() * 3 + 1); // Random sleep 1-4 seconds
}

function authenticateUser(apiUrl, user) {
  const loginPayload = {
    email: user.email,
    password: user.password,
  };
  
  const loginResponse = http.post(`${apiUrl}/auth/login`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  requestCount.add(1);
  responseTime.add(loginResponse.timings.duration);
  
  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined;
      } catch {
        return false;
      }
    },
    'login response time < 3s': (r) => r.timings.duration < 3000,
  });
  
  if (!loginSuccess) {
    return { success: false };
  }
  
  const body = JSON.parse(loginResponse.body);
  return { success: true, token: body.token };
}

function browseEvents(apiUrl, headers) {
  // Get events list
  const eventsResponse = http.get(`${apiUrl}/events`, { headers });
  
  requestCount.add(1);
  responseTime.add(eventsResponse.timings.duration);
  
  check(eventsResponse, {
    'events list status is 200': (r) => r.status === 200,
    'events list response time < 2s': (r) => r.timings.duration < 2000,
    'events list returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
  });
  
  // Get specific event details
  if (eventsResponse.status === 200) {
    const events = JSON.parse(eventsResponse.body);
    if (events.length > 0) {
      const eventId = events[0].id;
      const eventDetailResponse = http.get(`${apiUrl}/events/${eventId}`, { headers });
      
      requestCount.add(1);
      responseTime.add(eventDetailResponse.timings.duration);
      
      check(eventDetailResponse, {
        'event detail status is 200': (r) => r.status === 200,
        'event detail response time < 1.5s': (r) => r.timings.duration < 1500,
      });
    }
  }
}

function purchaseTicket(apiUrl, headers, event) {
  // Create order
  const orderPayload = {
    eventId: event.id,
    quantity: Math.floor(Math.random() * 3) + 1, // 1-3 tickets
  };
  
  const orderResponse = http.post(`${apiUrl}/orders`, JSON.stringify(orderPayload), { headers });
  
  requestCount.add(1);
  responseTime.add(orderResponse.timings.duration);
  
  const orderSuccess = check(orderResponse, {
    'order creation status is 201': (r) => r.status === 201,
    'order creation response time < 2s': (r) => r.timings.duration < 2000,
    'order returns id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined;
      } catch {
        return false;
      }
    },
  });
  
  if (!orderSuccess) {
    ticketPurchaseErrors.add(1);
    return;
  }
  
  const order = JSON.parse(orderResponse.body);
  
  // Process payment (simulation)
  const paymentPayload = {
    orderId: order.id,
    paymentMethod: 'CREDIT_CARD',
    cardNumber: '4242424242424242',
    expiryMonth: '12',
    expiryYear: '2025',
    cvc: '123',
  };
  
  const paymentResponse = http.post(`${apiUrl}/payments/process`, JSON.stringify(paymentPayload), { headers });
  
  requestCount.add(1);
  responseTime.add(paymentResponse.timings.duration);
  
  const paymentSuccess = check(paymentResponse, {
    'payment status is 200': (r) => r.status === 200,
    'payment response time < 5s': (r) => r.timings.duration < 5000,
    'payment successful': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'COMPLETED';
      } catch {
        return false;
      }
    },
  });
  
  if (!paymentSuccess) {
    ticketPurchaseErrors.add(1);
  }
}

function viewProfile(apiUrl, headers) {
  // Get user profile
  const profileResponse = http.get(`${apiUrl}/auth/me`, { headers });
  
  requestCount.add(1);
  responseTime.add(profileResponse.timings.duration);
  
  check(profileResponse, {
    'profile status is 200': (r) => r.status === 200,
    'profile response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  // Get user tickets
  const ticketsResponse = http.get(`${apiUrl}/tickets/my-tickets`, { headers });
  
  requestCount.add(1);
  responseTime.add(ticketsResponse.timings.duration);
  
  check(ticketsResponse, {
    'tickets status is 200': (r) => r.status === 200,
    'tickets response time < 1.5s': (r) => r.timings.duration < 1500,
  });
}

function performAdminOperations(apiUrl, headers) {
  // Try to access admin endpoint (may fail if not admin)
  const adminResponse = http.get(`${apiUrl}/admin/stats`, { headers });
  
  requestCount.add(1);
  responseTime.add(adminResponse.timings.duration);
  
  // Don't fail the test if user is not admin (403 is expected)
  check(adminResponse, {
    'admin request completed': (r) => r.status === 200 || r.status === 403,
    'admin response time < 2s': (r) => r.timings.duration < 2000,
  });
}

export function teardown(data) {
  console.log('Load test completed');
  
  // Optional: Generate summary report
  const summaryResponse = http.get(`${data.apiUrl}/metrics/summary`);
  if (summaryResponse.status === 200) {
    console.log('System metrics after load test:', summaryResponse.body);
  }
}

// Stress test scenario for peak loads
export const stressTest = {
  executor: 'ramping-arrival-rate',
  startRate: 0,
  timeUnit: '1s',
  preAllocatedVUs: 50,
  maxVUs: 500,
  stages: [
    { target: 10, duration: '1m' },
    { target: 50, duration: '2m' },
    { target: 100, duration: '2m' },
    { target: 200, duration: '2m' },
    { target: 300, duration: '1m' },
    { target: 0, duration: '2m' },
  ],
};

// Spike test scenario for sudden traffic spikes
export const spikeTest = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '2m', target: 10 },   // Normal load
    { duration: '30s', target: 500 }, // Spike!
    { duration: '2m', target: 10 },   // Back to normal
  ],
};

// Endurance test for long-running stability
export const enduranceTest = {
  executor: 'constant-vus',
  vus: 50,
  duration: '30m',
};
