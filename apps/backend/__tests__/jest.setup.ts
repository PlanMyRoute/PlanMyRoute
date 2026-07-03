const TEST_USER_ID = "a3e966d8-e1c0-41e2-9fd6-0519575c76e7";

jest.mock("../src/middleware/auth.js", () => ({
  verifyToken: jest.fn((req: any, _res: any, next: any) => {
    req.userId = TEST_USER_ID;
    req.user = { id: TEST_USER_ID };
    next();
  }),
  requireSameUser: jest.fn((_req: any, _res: any, next: any) => {
    next();
  }),
  optionalAuth: jest.fn((req: any, _res: any, next: any) => {
    req.userId = TEST_USER_ID;
    req.user = { id: TEST_USER_ID };
    next();
  }),
}));

jest.mock("../src/middleware/permissions.js", () => ({
  requirePermission: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  requireOwner: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  requireEditor: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  requireStopPermission: jest.fn(
    () => (_req: any, _res: any, next: any) => next(),
  ),
  requireAttachmentPermission: jest.fn(
    () => (_req: any, _res: any, next: any) => next(),
  ),
  checkPermission: jest.fn(async () => true),
}));

jest.mock("../src/middleware/rateLimiter.js", () => ({
  aiGenerationLimiter: (_req: any, _res: any, next: any) => next(),
  refuelLimiter: (_req: any, _res: any, next: any) => next(),
  stripeCheckoutLimiter: (_req: any, _res: any, next: any) => next(),
}));
