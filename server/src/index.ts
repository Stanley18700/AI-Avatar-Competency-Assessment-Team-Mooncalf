import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import departmentRoutes from './routes/departments';
import competencyRoutes from './routes/competencies';
import caseRoutes from './routes/cases';
import assessmentRoutes from './routes/assessments';
import reviewRoutes from './routes/reviews';
import reportRoutes from './routes/reports';
import analyticsRoutes from './routes/analytics';
import idpRoutes from './routes/idp';
import audioRoutes from './routes/audio';
import prisma from './lib/prisma';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.CLIENT_URLS || '').split(',').map((origin) => origin.trim()),
].filter((origin): origin is string => Boolean(origin));

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/competencies', competencyRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/idp', idpRoutes);
app.use('/api/audio', audioRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/dependencies', async (_req, res) => {
  const checks = {
    database: false,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    jwtConfigured: Boolean(process.env.JWT_SECRET),
    encryptionConfigured: Boolean(process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_IV),
  };

  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  const ok = checks.database && checks.geminiConfigured && checks.jwtConfigured && checks.encryptionConfigured;
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

app.get('/api/health/dependencies', async (_req, res) => {
  const checks = {
    database: false,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    jwtConfigured: Boolean(process.env.JWT_SECRET),
    encryptionConfigured: Boolean(process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_IV),
  };

  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  const ok = checks.database && checks.geminiConfigured && checks.jwtConfigured && checks.encryptionConfigured;
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

app.get('/', (_req, res) => {
  res.json({
    service: 'NurseMind AI API',
    status: 'running',
    health: '/health',
    apiHealth: '/api/health',
    dependencyHealth: '/health/dependencies',
    apiDependencyHealth: '/api/health/dependencies',
  });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 NurseMind AI server running on port ${PORT}`);
});

export default app;
