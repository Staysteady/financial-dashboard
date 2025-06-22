import '@testing-library/jest-dom';

// Polyfill Web APIs for testing
if (typeof globalThis.Request === 'undefined') {
  // Add TextEncoder/TextDecoder polyfills
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
  
  // Use Next.js built-in polyfills
  try {
    require('next/dist/server/web/sandbox/polyfills');
  } catch (e) {
    // Fallback to simple mocks
    globalThis.Request = class Request {
      constructor(url, options = {}) {
        this.url = url;
        this.method = options.method || 'GET';
        this.headers = new Map(Object.entries(options.headers || {}));
        this.body = options.body;
        this.nextUrl = new URL(url);
      }
      
      async text() {
        return this.body || '';
      }
      
      async json() {
        return JSON.parse(this.body || '{}');
      }
    };
    
    globalThis.Response = class Response {
      constructor(body, options = {}) {
        this.body = body;
        this.status = options.status || 200;
        this.statusText = options.statusText || 'OK';
        this.headers = new Map(Object.entries(options.headers || {}));
      }
      
      async text() {
        return this.body || '';
      }
      
      async json() {
        return JSON.parse(this.body || '{}');
      }
    };
    
    globalThis.Headers = Map;
  }
}

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-jest-testing';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock crypto for Node.js environment
Object.defineProperty(global.self, 'crypto', {
  value: {
    getRandomValues: (arr) => require('crypto').randomBytes(arr.length),
    subtle: {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      generateKey: jest.fn(),
      importKey: jest.fn(),
      exportKey: jest.fn(),
    },
  },
});

// Mock ResizeObserver for chart components
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {
    this.cb([{ borderBoxSize: { inlineSize: 0, blockSize: 0 } }]);
  }
  unobserve() {}
  disconnect() {}
};

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Suppress console errors in tests unless explicitly testing error handling
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: An invalid form control'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});