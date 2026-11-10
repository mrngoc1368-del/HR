export const config = {
  databaseUrl: process.env.DATABASE_URL || 'postgres://hr:hr@localhost:5432/hr',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  accessTtl: process.env.ACCESS_TTL || '15m',
  refreshDays: Number(process.env.REFRESH_DAYS || 7),
  port: Number(process.env.PORT || 3001),
};
