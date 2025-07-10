const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;

// حماية جميع العمليات في هذا الملف
async function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى إرسال التوكن في الهيدر (Authorization: Bearer <token>)' });
  }
  const token = authHeader.split(' ')[1];
  const { data, error } = await req.supabase.auth.getUser(token);
  if (error || !data || !data.user) {
    return res.status(401).json({ error: 'توكن غير صالح أو منتهي الصلاحية.' });
  }
  req.user = data.user;
  next();
}

router.use(verifyToken);


// جلب جميع العروض
router.get('/all', async (req, res) => {
  const supabase = getSupabase(req);
  const { data, error } = await supabase.from('offers').select('*');
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ offers: data });
});

// تعديل عرض (فقط المدير العام أو مدير فرعي لديه صلاحية manage_offers)
router.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  // السماح فقط للمدير العام أو المدير الفرعي الذي لديه صلاحية إدارة العروض
  const { data: currentAdmin, error: currentAdminError } = await req.supabase.from('admins').select('role, permissions').eq('id', req.user.id).single();
  if (currentAdminError || !currentAdmin) {
    return res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول.' });
  }
  if (
    currentAdmin.role !== 'main' &&
    !(currentAdmin.permissions && currentAdmin.permissions.manage_offers === true)
  ) {
    return res.status(403).json({ error: 'غير مصرح. هذه العملية تتطلب صلاحية المدير العام أو مدير فرعي لديه صلاحية إدارة العروض.' });
  }
  const fields = req.body;
  const supabase = getSupabase(req);
  const { data: updated, error } = await supabase.from('offers').update(fields).eq('id', id).select();
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ message: 'تم تعديل العرض بنجاح', data: updated });
});

// حذف عرض (فقط المدير العام أو مدير فرعي لديه صلاحية manage_offers)
router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;
  // السماح فقط للمدير العام أو المدير الفرعي الذي لديه صلاحية إدارة العروض
  const { data: currentAdmin, error: currentAdminError } = await req.supabase.from('admins').select('role, permissions').eq('id', req.user.id).single();
  if (currentAdminError || !currentAdmin) {
    return res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول.' });
  }
  if (
    currentAdmin.role !== 'main' &&
    !(currentAdmin.permissions && currentAdmin.permissions.manage_offers === true)
  ) {
    return res.status(403).json({ error: 'غير مصرح. هذه العملية تتطلب صلاحية المدير العام أو مدير فرعي لديه صلاحية إدارة العروض.' });
  }
  const supabase = getSupabase(req);
  const { error } = await supabase.from('offers').delete().eq('id', id);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ message: 'تم حذف العرض بنجاح' });
});

// إضافة عرض جديد (فقط المدير العام أو مدير فرعي لديه صلاحية manage_offers)
// إعدادات Cloudinary (تأكد من وضع القيم الصحيحة في متغيرات البيئة)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
router.post('/add', async (req, res) => {
  // السماح فقط للمدير العام أو المدير الفرعي الذي لديه صلاحية إدارة العروض
  const { data: currentAdmin, error: currentAdminError } = await req.supabase.from('admins').select('role, permissions').eq('id', req.user.id).single();
  if (currentAdminError || !currentAdmin) {
    return res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول.' });
  }
  if (
    currentAdmin.role !== 'main' &&
    !(currentAdmin.permissions && currentAdmin.permissions.manage_offers === true)
  ) {
    return res.status(403).json({ error: 'غير مصرح. هذه العملية تتطلب صلاحية المدير العام أو مدير فرعي لديه صلاحية إدارة العروض.' });
  }

  // التأكد من الحقول المطلوبة حسب قاعدة البيانات
  const {
    agency_id,
    title,
    main_image, // يجب أن يكون base64 أو رابط صورة
    services,
    airline_id,
    flight_type,
    departure_date,
    return_date,
    duration_days,
    hotel_name,
    hotel_distance,
    hotel_images, // مصفوفة من الصور base64 أو روابط
    description,
    entry,
    exit,
    price_double,
    price_triple,
    price_quad,
    price_quint
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'حقل العنوان (title) مطلوب.' });
  }

  // رفع الصورة الرئيسية إلى Cloudinary إذا كانت base64 (data:) أو ملف محلي
  let mainImageUrl = null;
  if (main_image && typeof main_image === 'string' && main_image.startsWith('data:')) {
    try {
      const uploaded = await cloudinary.uploader.upload(main_image, { folder: 'offers/main' });
      mainImageUrl = uploaded.secure_url;
    } catch (err) {
      return res.status(500).json({ error: 'فشل رفع الصورة الرئيسية إلى Cloudinary.' });
    }
  } else if (main_image && typeof main_image === 'string') {
    // إذا كان main_image اسم ملف فقط، حوله إلى رابط Cloudinary
    if (!/^https?:\/\//.test(main_image)) {
      mainImageUrl = cloudinary.url(main_image, { folder: 'offers/main', secure: true });
    } else {
      mainImageUrl = main_image;
    }
  } else if (main_image) {
    // إذا كان main_image ملف (مثلاً من multer)، ارفعه إلى Cloudinary
    try {
      const uploaded = await cloudinary.uploader.upload(main_image.path, { folder: 'offers/main' });
      mainImageUrl = uploaded.secure_url;
    } catch (err) {
      return res.status(500).json({ error: 'فشل رفع الصورة الرئيسية إلى Cloudinary.' });
    }
  }

  // رفع صور الفندق إلى Cloudinary إذا كانت base64 (data:)
  let hotelImagesUrls = [];
  if (Array.isArray(hotel_images)) {
    for (const img of hotel_images) {
      if (img && img.startsWith('data:')) {
        try {
          const uploaded = await cloudinary.uploader.upload(img, { folder: 'offers/hotels' });
          hotelImagesUrls.push(uploaded.secure_url);
        } catch (err) {
          return res.status(500).json({ error: 'فشل رفع صورة من صور الفندق إلى Cloudinary.' });
        }
      } else if (img) {
        // إذا كان img اسم ملف فقط، حوله إلى رابط Cloudinary
        if (!/^https?:\/\//.test(img)) {
          hotelImagesUrls.push(cloudinary.url(img, { folder: 'offers/hotels', secure: true }));
        } else {
          hotelImagesUrls.push(img);
        }
      }
    }
  } else if (hotel_images) {
    hotelImagesUrls = hotel_images;
  }

  // تجهيز البيانات للإدخال
  const fields = {
    agency_id,
    title,
    main_image: mainImageUrl,
    services,
    airline_id,
    flight_type,
    departure_date,
    return_date,
    duration_days,
    hotel_name,
    hotel_distance,
    hotel_images: hotelImagesUrls,
    description,
    entry,
    exit,
    price_double,
    price_triple,
    price_quad,
    price_quint
  };

  // إدراج العرض في جدول offers
  const supabase = getSupabase(req);
  const { data: inserted, error } = await supabase.from('offers').insert([fields]).select();
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ message: 'تمت إضافة العرض بنجاح', data: inserted });
});

// استخدم req.supabase إذا كان موجودًا (تم تمريره من server.js)، وإلا fallback للقديم (للاستدعاءات المباشرة)
function getSupabase(req) {
  return (req && req.supabase) ? req.supabase : require('../../supabaseAdmin');
}

module.exports = router;

// تغيير حالة العرض إلى ذهبي أو عادي
// فقط المدير العام أو مدير فرعي لديه صلاحية manage_offers
router.patch('/toggle-golden/:id', async (req, res) => {
  const { id } = req.params;
  // السماح فقط للمدير العام أو المدير الفرعي الذي لديه صلاحية إدارة العروض
  const { data: currentAdmin, error: currentAdminError } = await req.supabase.from('admins').select('role, permissions').eq('id', req.user.id).single();
  if (currentAdminError || !currentAdmin) {
    return res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول.' });
  }
  if (
    currentAdmin.role !== 'main' &&
    !(currentAdmin.permissions && currentAdmin.permissions.manage_offers === true)
  ) {
    return res.status(403).json({ error: 'غير مصرح. هذه العملية تتطلب صلاحية المدير العام أو مدير فرعي لديه صلاحية إدارة العروض.' });
  }
  const supabase = getSupabase(req);
  // جلب العرض الحالي
  const { data: offer, error: offerError } = await supabase.from('offers').select('is_golden').eq('id', id).single();
  if (offerError || !offer) {
    return res.status(404).json({ error: 'العرض غير موجود.' });
  }
  // عكس القيمة الحالية
  const newIsGolden = !offer.is_golden;
  const { data: updated, error: updateError } = await supabase.from('offers').update({ is_golden: newIsGolden }).eq('id', id).select();
  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }
  res.json({ message: `تم تغيير حالة العرض إلى ${newIsGolden ? 'ذهبي' : 'عادي'}`, data: updated });
});
