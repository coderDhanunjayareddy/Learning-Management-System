// backend/routes/upload.routes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import supabase from '../config/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer to store files in memory (no disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    // Allow only images, videos, PDFs
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image, video, and PDF files are allowed'));
  }
});

// POST /api/upload/media
router.post('/media', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { buffer, originalname, mimetype } = req.file;
    const userId = req.user.id;
    const ext = path.extname(originalname);
    const filename = `${userId}_${Date.now()}${ext}`;
    // ✅ DO NOT prefix with bucket name!
    const filePath = filename; // ← Only filename or "folder/filename"

    const { error } = await supabase.storage
      .from('community-media')
      .upload(filePath, buffer, {
        contentType: mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Upload failed' });
    }

    // ✅ Correct public URL: bucket + filename
    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/community-media/${filename}`;

    let type = 'file';
    if (mimetype.startsWith('image/')) type = 'image';
    else if (mimetype.startsWith('video/')) type = 'video';
    else if (mimetype === 'application/pdf') type = 'pdf';

    res.json({ success: true, url: publicUrl, type });

  } catch (err) {
    console.error('Upload handler error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;