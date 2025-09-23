// Simplified type for requests - compatible with all mocks
export type TestRequest = {
  body?: any;
  query?: any;
  params?: any;
  headers?: any;
  user?: { id: string; [key: string]: any };
  method?: string;
  url?: string;
  [key: string]: any;
};

// Simplified type for responses - compatible with all mocks
export type TestResponse = {
  status: (code: number) => TestResponse;
  json: (data: any) => TestResponse;
  send?: (data: any) => TestResponse;
  cookie?: (name: string, value: string, options?: any) => TestResponse;
  redirect?: (url: string) => TestResponse;
  [key: string]: any;
};

// Generic handler for tests
export type TestHandler = (req: TestRequest, res: TestResponse) => Promise<void>;

// Generic adapter that accepts any type of req/res
export function createTestAdapter(handler: TestHandler): (...args: any[]) => Promise<void> {
  return async (...args: any[]) => {
    const req = args[0] as TestRequest;
    const res = args[1] as TestResponse;
    return handler(req, res);
  };
}

// Mock response creator for tests
export function createMockResponse(): TestResponse {
  const res: TestResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis()
  };
  return res;
}

// Mock request creator for tests
export function createMockRequest(data: Partial<TestRequest> = {}): TestRequest {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    method: 'GET',
    url: '/',
    ...data
  };
}

export default {
  createTestAdapter,
  createMockResponse,
  createMockRequest
};
