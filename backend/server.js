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
import communityRoutes from './routes/community.routes.js';
import uploadRoutes from './routes/upload.routes.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ MUST come BEFORE any other helmet middleware

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/scorm', scormRoutes); // Serve SCORM uploads
app.get(
  "/api/scorm/*",
  helmet({ frameguard: false }),             // <- disables X-Frame-Options here
  (req, res, next) => {                      // <- extra hardening: kill any pre-set header
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *;");
    next();
  },

  viewScormFile
);

// ------------------------------
// ⬇️ STATIC FILE SERVING FOR UPLOADS
// ------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


app.use('/api/superadmin', superadminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);

app.use('/api/admin', EnrollmentRouter);

app.use('/api/course', CourseRouter);

app.use('/api/users', userRoutes);

app.use('/api/community', communityRoutes);

app.use('/api/upload', uploadRoutes);

app.get('/', (req, res) => res.json({ status: 'OK' }));

// ✅ Error handling — catches unhandled promise errors to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

app.listen(PORT, "0.0.0.0", () => {

  console.log(`Server running on http://localhost:${PORT}`);
});