if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

process.env.JWT_SECRET ??= 'test-jwt-secret-with-at-least-thirty-two-characters';
process.env.JWT_EXPIRES_IN ??= '15m';
