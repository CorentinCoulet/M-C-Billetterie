// Mock for Next.js server components
class MockNextRequest {
  constructor(input, init = {}) {
    this.input = input;
    this.init = init;
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init.method || 'GET';
    this.headers = new Map();
    this.cookies = new Map();
    
    // Parse URL for pathname
    try {
      const urlObj = new URL(this.url);
      this.nextUrl = {
        pathname: urlObj.pathname,
        searchParams: urlObj.searchParams
      };
    } catch (e) {
      this.nextUrl = { pathname: '/', searchParams: new URLSearchParams() };
    }
  }

  get(name) {
    return this.cookies.get(name);
  }
}

class MockNextResponse {
  constructor() {
    this.status = 200;
    this.headers = new Map();
  }

  static json(data, init = {}) {
    const response = new MockNextResponse();
    response.status = init.status || 200;
    response._data = data;
    return response;
  }

  static next() {
    return new MockNextResponse();
  }

  static redirect(url) {
    const response = new MockNextResponse();
    response.status = 307;
    response.headers.set('location', url);
    return response;
  }
}

module.exports = {
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse
};
