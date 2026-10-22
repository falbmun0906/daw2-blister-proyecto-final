process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/blister-test';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.BACKEND_URL = 'http://localhost:3000';
process.env.CIMA_BASE_URL = 'https://cima.aemps.es/cima/rest';
process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';
process.env.RESEND_API_KEY = 'test-resend-api-key';
process.env.WEB_PUSH_VAPID_PUBLIC_KEY = '';
process.env.WEB_PUSH_VAPID_PRIVATE_KEY = '';

jest.mock('resend', () => ({ Resend: jest.fn(() => ({ emails: { send: jest.fn().mockResolvedValue({ data: { id: 'synthetic-email' }, error: null }) } })) }));
jest.mock('web-push', () => ({ setVapidDetails: jest.fn(), sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }) }));
