const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');

// إعداد cloudinary من متغيرات البيئة
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ميدلوير multer لاستقبال ملف واحد باسم "file"
const upload = multer();

// رفع صورة إلى Cloudinary وإرجاع الرابط
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'لم يتم إرسال أي ملف' });

    // تحقق من نوع الملف (صورة فقط)
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'الملف المرسل ليس صورة' });
    }

    // تحقق من متغيرات البيئة الخاصة بـ Cloudinary
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(500).json({ error: 'إعدادات Cloudinary ناقصة في ملف .env' });
    }

    // تحقق من حجم الملف (مثلاً 5MB كحد أقصى)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (req.file.size > MAX_SIZE) {
      return res.status(400).json({ error: 'حجم الصورة كبير جداً (الحد الأقصى 5MB)' });
    }

    // رفع الصورة إلى Cloudinary باستخدام stream
    const streamUpload = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'umrah-offers' },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        require('streamifier').createReadStream(fileBuffer).pipe(stream);
      });
    };

    const result = await streamUpload(req.file.buffer);

    // تحقق من وجود الرابط النهائي
    if (!result || !result.secure_url) {
      return res.status(500).json({ error: 'لم يتم الحصول على رابط الصورة من Cloudinary' });
    }

    return res.json({ url: result.secure_url });
  } catch (err) {
    console.error('رفع الصورة إلى Cloudinary فشل:', err);
    res.status(500).json({ error: 'فشل رفع الصورة', details: err.message });
  }
});

module.exports = router;
