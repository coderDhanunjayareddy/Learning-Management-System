// backend/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import superadminRoutes from './routes/superadmin.routes.js';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import teacherRoutes from './routes/teacher.routes.js';
import studentRoutes from './routes/student.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import scormRoutes from './routes/scorm.routes.js';
import { viewScormFile } from './controllers/scorm.controller.js';
import EnrollmentRouter from './routes/enrollment.routes.js';
import CourseRouter from './routes/course.routes.js';
import userRoutes from './routes/user.routes.js';
import platformRoutes from './routes/platform.routes.js';
import packBuilderRoutes from './routes/packBuilder.routes.js';
import clientContentRoutes from './routes/clientContent.routes.js';
import orgRoutes from './routes/org.routes.js';
import curriculumRoutes from './routes/curriculum.routes.js';
import questionsRoutes from './routes/questions.routes.js';
import examsRoutes from './routes/exams.routes.js';
import { authenticateAccessTokenValue, authenticateToken } from './middleware/auth.js';
import supabase from './config/supabaseClient.js';
import { startAttemptExpiryCron } from './services/student.service.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ MUST come BEFORE any other helmet middleware

app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5100,http://localhost:5173,http://192.168.0.102:5100')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production';
const selfOrigins = new Set([
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
]);
const isAllowedOrigin = (origin) => Boolean(origin && (allowedOrigins.includes(origin) || selfOrigins.has(origin)));

const applyScormFrameHeaders = (req, res, next) => {
  const allowedFrameAncestors = allowedOrigins.length > 0 ? allowedOrigins.join(' ') : "'self'";
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${allowedFrameAncestors};`);
  next();
};

const authenticateScormLaunch = async (req, res, next) => {
  const accessToken = typeof req.params.accessToken === 'string'
    ? decodeURIComponent(req.params.accessToken)
    : '';

  if (!accessToken) {
    return res.status(401).send('Access token required');
  }

  try {
    const session = await authenticateAccessTokenValue(accessToken);
    if (!session) {
      return res.status(401).send('Invalid token');
    }

    req.auth = session.decoded;
    req.user = session.user;
    return next();
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      return res.status(401).send('Token expired');
    }
    if (error?.name === 'JsonWebTokenError') {
      return res.status(401).send('Invalid token');
    }
    console.error('SCORM launch auth error:', error);
    return res.status(401).send('Invalid token');
  }
};


app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, !isProduction);
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Refresh-Token'],
  })
);
app.use(express.json());

app.get('/health', async (req, res) => {
  const startedAt = Date.now();
  try {
    const { error } = await supabase
      .from('users')
      .select('id', { head: true, count: 'exact' })
      .limit(1);

    if (error) {
      return res.status(503).json({
        status: 'degraded',
        supabase: 'down',
        error: error.message,
        responseTimeMs: Date.now() - startedAt
      });
    }

    return res.json({
      status: 'ok',
      supabase: 'ok',
      responseTimeMs: Date.now() - startedAt
    });
  } catch (err) {
    return res.status(503).json({
      status: 'degraded',
      supabase: 'down',
      error: err instanceof Error ? err.message : 'Unknown error',
      responseTimeMs: Date.now() - startedAt
    });
  }
});

app.use('/api/scorm', scormRoutes); // Serve SCORM uploads
app.get(
  '/api/scorm/launch/:accessToken/*',
  helmet({ frameguard: false }),
  applyScormFrameHeaders,
  authenticateScormLaunch,
  viewScormFile
);

app.get(
  "/api/scorm/*",
  helmet({ frameguard: false }),             // <- disables X-Frame-Options here
  applyScormFrameHeaders,
  authenticateToken,
  viewScormFile
);

// ------------------------------
// ⬇️ STATIC FILE SERVING FOR UPLOADS
// ------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);

app.use('/api/admin', EnrollmentRouter);

app.use('/api/course', CourseRouter);

app.use('/api/users', userRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api', clientContentRoutes);
app.use('/api/org', orgRoutes);
app.use('/api', curriculumRoutes);
app.use('/api', questionsRoutes);
app.use('/api', examsRoutes);
app.use('/api', packBuilderRoutes);




app.get('/', (req, res) => res.json({ status: 'OK' }));

// ✅ Error handling — catches unhandled promise errors to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const stopAttemptExpiryCron = startAttemptExpiryCron();
const shutdown = () => {
  stopAttemptExpiryCron();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

app.listen(PORT, "0.0.0.0", () => {

  console.log(`Server running on http://localhost:${PORT}`);
});
