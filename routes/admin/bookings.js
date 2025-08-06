const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: 'dbwsguzvt',
  api_key: '872325744724379',
  api_secret: 'Fgy866yvuuargXrgfn7idGFEHlw'
});

// استخدم req.supabase إذا كان موجودًا (تم تمريره من server.js)، وإلا fallback للقديم (للاستدعاءات المباشرة)
function getSupabase(req) {
  return (req && req.supabase) ? req.supabase : require('../../supabaseAdmin');
}

// رفع صورة الجواز (يتطلب توكن مدير)
router.post('/upload/passport', upload.single('passport'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'يرجى إرسال ملف الصورة في الحقل passport' });
    }
    // رفع الصورة إلى Cloudinary مباشرة من buffer
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    let result;
    try {
      result = await cloudinary.uploader.upload(base64, { folder: 'bookings/passports' });
    } catch (uploadErr) {
      console.error('Cloudinary upload error:', uploadErr);
      return res.status(500).json({ error: 'فشل رفع الصورة إلى Cloudinary', details: uploadErr.message });
    }
    if (!result || !result.secure_url) {
      console.error('Cloudinary returned no url:', result);
      return res.status(500).json({ error: 'فشل رفع الصورة إلى Cloudinary', details: 'No secure_url returned' });
    }
    return res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: 'خطأ غير متوقع أثناء رفع الصورة', details: err.message });
  }
});

// حماية جميع العمليات في هذا الملف
async function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى إرسال التوكن في الهيدر (Authorization: Bearer <token>)' });
  }
  const token = authHeader.split(' ')[1];
  const supabase = getSupabase(req);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data || !data.user) {
    return res.status(401).json({ error: 'توكن غير صالح أو منتهي الصلاحية.' });
  }
  req.user = data.user;
  next();
}

router.use(verifyToken);

// إنشاء حجز جديد (status = قيد الانتظار)
router.post('/add', async (req, res) => {
  const fields = req.body;
  fields.status = 'قيد الانتظار';
  const supabase = getSupabase(req);
  const { data, error } = await supabase.from('bookings').insert([fields]).select();
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ message: 'تم إرسال طلب الحجز بنجاح', data });
});

// موافقة المدير أو المدير الفرعي المسؤول عن إدارة الطلبيات (status → بانتظار موافقة الوكالة)
router.put('/approve-by-admin/:id', async (req, res) => {
  try {
    const supabase = getSupabase(req);
    // تحقق من أن المستخدم مدير عام أو مدير فرعي لديه صلاحية إدارة الطلبيات (manage_bookings)
    const { data: admin, error: adminError } = await supabase.from('admins').select('role, permissions').eq('id', req.user.id).single();
    if (adminError || !admin) {
      console.error('approve-by-admin: adminError', adminError);
      return res.status(403).json({ error: 'غير مصرح. يرجى تسجيل الدخول كمدير.' });
    }
    if (
      admin.role !== 'main' &&
      !(admin.permissions && admin.permissions.manage_bookings === true)
    ) {
      console.error('approve-by-admin: insufficient permissions', admin);
      return res.status(403).json({ error: 'غير مصرح. فقط المدير العام أو مدير فرعي لديه صلاحية إدارة الطلبيات يمكنه الموافقة الأولية.' });
    }
    const { id } = req.params;
    // جلب بيانات الحجز مع offer_id
    const { data: booking, error: bookingError } = await supabase.from('bookings').select('id, full_name, phone, room_type, offer_id').eq('id', id).single();
    if (bookingError || !booking) {
      return res.status(404).json({ error: 'الحجز غير موجود.' });
    }
    // جلب بيانات العرض لمعرفة الوكالة واسم العرض
    const { data: offer, error: offerError } = await supabase.from('offers').select('id, title, agency_id').eq('id', booking.offer_id).single();
    if (offerError || !offer) {
      return res.status(404).json({ error: 'العرض غير موجود.' });
    }
    // جلب إيميل الوكالة من جدول المستخدمين (auth.users)
    let agencyEmail = null;
    try {
      const { data: agencyUser, error: agencyUserError } = await supabase.auth.admin.getUserById(offer.agency_id);
      if (agencyUserError || !agencyUser || !agencyUser.user || !agencyUser.user.email) {
        return res.status(404).json({ error: 'تعذر جلب إيميل الوكالة.' });
      }
      agencyEmail = agencyUser.user.email;
    } catch (e) {
      return res.status(404).json({ error: 'تعذر جلب إيميل الوكالة.' });
    }
    // تحديث حالة الحجز
    const { data, error } = await supabase.from('bookings').update({ status: 'بانتظار موافقة الوكالة' }).eq('id', id).select();
    if (error) {
      console.error('approve-by-admin: update error', error);
      return res.status(500).json({ error: error.message });
    }
    // إرسال إشعار بريد إلكتروني للوكالة
    try {
      const { sendAgencyBookingNotification } = require('../../utils/email');
      await sendAgencyBookingNotification(agencyEmail, booking, offer);
    } catch (mailErr) {
      console.error('فشل إرسال إشعار البريد للوكالة:', mailErr);
      // لا توقف العملية بسبب فشل الإيميل
    }
    res.json({ message: 'تمت الموافقة من طرف الإدارة. بانتظار موافقة الوكالة.', data });
  } catch (err) {
    console.error('approve-by-admin: unexpected error', err);
    res.status(500).json({ error: 'خطأ غير متوقع', details: err.message });
  }
});

// موافقة الوكالة (status → مقبول)
router.put('/approve-by-agency/:id', async (req, res) => {
  // تحقق من أن المستخدم ينتمي للوكالة المرتبطة بالحجز
  const { id } = req.params;
  // جلب الحجز
  const supabase = getSupabase(req);
  const { data: booking, error: bookingError } = await supabase.from('bookings').select('offer_id, status').eq('id', id).single();
  if (bookingError || !booking) {
    return res.status(404).json({ error: 'الحجز غير موجود.' });
  }
  // جلب العرض لمعرفة الوكالة المالكة
  const { data: offer, error: offerError } = await supabase.from('offers').select('agency_id').eq('id', booking.offer_id).single();
  if (offerError || !offer) {
    return res.status(404).json({ error: 'العرض غير موجود.' });
  }
  // تحقق أن المستخدم ينتمي للوكالة
  const { data: agency, error: agencyError } = await supabase.from('agencies').select('id').eq('id', req.user.id).single();
  if (agencyError || !agency || agency.id !== offer.agency_id) {
    return res.status(403).json({ error: 'غير مصرح. فقط الوكالة المالكة يمكنها الموافقة النهائية.' });
  }
  // يجب أن يكون status الحالي "بانتظار موافقة الوكالة"
  if (booking.status !== 'بانتظار موافقة الوكالة') {
    return res.status(400).json({ error: 'لا يمكن الموافقة إلا بعد موافقة المدير.' });
  }
  const { data, error } = await supabase.from('bookings').update({ status: 'مقبول' }).eq('id', id).select();
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  // هنا يمكنك إرسال بيانات المعتمر للوكالة (مثلاً عبر إشعار أو بريد)
  res.json({ message: 'تمت الموافقة النهائية من الوكالة. تم إرسال بيانات المعتمر.', data });
});

// رفض الحجز (من المدير أو الوكالة) مع حذف الطلب نهائياً
router.put('/reject/:id', async (req, res) => {
// دعم الحذف عبر DELETE أيضاً
});
router.delete('/reject/:id', async (req, res) => {
  try {
    const supabase = getSupabase(req);
    const { id } = req.params;
    // يمكن للمدير العام أو الوكالة المالكة فقط الرفض
    const { data: booking, error: bookingError } = await supabase.from('bookings').select('offer_id').eq('id', id).single();
    if (bookingError || !booking) {
      return res.status(404).json({ error: 'الحجز غير موجود.' });
    }
    // جلب العرض لمعرفة الوكالة المالكة
    const { data: offer, error: offerError } = await supabase.from('offers').select('agency_id').eq('id', booking.offer_id).single();
    if (offerError || !offer) {
      return res.status(404).json({ error: 'العرض غير موجود.' });
    }
    // تحقق من صلاحية المستخدم
    let isAllowed = false;
    // مدير عام
    const { data: admin, error: adminError } = await supabase.from('admins').select('role').eq('id', req.user.id).single();
    if (!adminError && admin && admin.role === 'main') isAllowed = true;
    // وكالة مالكة
    const { data: agency, error: agencyError } = await supabase.from('agencies').select('id').eq('id', req.user.id).single();
    if (!agencyError && agency && agency.id === offer.agency_id) isAllowed = true;
    if (!isAllowed) {
      return res.status(403).json({ error: 'غير مصرح. فقط المدير العام أو الوكالة المالكة يمكنهم الرفض.' });
    }
    // حذف الحجز نهائياً
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({
      message: 'تم حذف الحجز بنجاح!',
      description: 'تم رفض وحذف طلب الحجز نهائياً من النظام. يمكنك الآن متابعة بقية الطلبات بكل سهولة.'
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ غير متوقع في رفض الحجز', details: err.message });
  }
  try {
    const supabase = getSupabase(req);
    const { id } = req.params;
    // يمكن للمدير العام أو الوكالة المالكة فقط الرفض
    const { data: booking, error: bookingError } = await supabase.from('bookings').select('offer_id').eq('id', id).single();
    if (bookingError || !booking) {
      console.error('reject: bookingError', bookingError);
      return res.status(404).json({ error: 'الحجز غير موجود.' });
    }
    // جلب العرض لمعرفة الوكالة المالكة
    const { data: offer, error: offerError } = await supabase.from('offers').select('agency_id').eq('id', booking.offer_id).single();
    if (offerError || !offer) {
      console.error('reject: offerError', offerError);
      return res.status(404).json({ error: 'العرض غير موجود.' });
    }
    // تحقق من صلاحية المستخدم
    let isAllowed = false;
    // مدير عام
    const { data: admin, error: adminError } = await supabase.from('admins').select('role').eq('id', req.user.id).single();
    if (!adminError && admin && admin.role === 'main') isAllowed = true;
    // وكالة مالكة
    const { data: agency, error: agencyError } = await supabase.from('agencies').select('id').eq('id', req.user.id).single();
    if (!agencyError && agency && agency.id === offer.agency_id) isAllowed = true;
    if (!isAllowed) {
      console.error('reject: insufficient permissions', { admin, agency });
      return res.status(403).json({ error: 'غير مصرح. فقط المدير العام أو الوكالة المالكة يمكنهم الرفض.' });
    }
    // حذف الحجز نهائياً
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) {
      console.error('reject: delete error', error);
      return res.status(500).json({ error: error.message });
    }
    res.json({
      message: 'تم حذف الحجز بنجاح!',
      description: 'تم رفض وحذف طلب الحجز نهائياً من النظام. يمكنك الآن متابعة بقية الطلبات بكل سهولة.'
    });
  } catch (err) {
    console.error('reject: unexpected error', err);
    res.status(500).json({ error: 'خطأ غير متوقع في رفض الحجز', details: err.message });
  }
});


// جلب جميع عروض وكالة معينة عبر agencyId
router.get('/offers/:agencyId', async (req, res) => {
  const supabase = getSupabase(req);
  const { agencyId } = req.params;
  try {
    // تحقق من وجود الوكالة أولاً (اختياري)
    const { data: agency, error: agencyError } = await supabase.from('agencies').select('id').eq('id', agencyId).single();
    if (agencyError || !agency) {
      return res.status(404).json({ error: 'الوكالة غير موجودة' });
    }
    // جلب جميع العروض المرتبطة بالوكالة
    const { data: offers, error: offersError } = await supabase.from('offers').select('*').eq('agency_id', agencyId);
    if (offersError) {
      return res.status(500).json({ error: offersError.message });
    }
    res.json({ offers });
  } catch (err) {
    res.status(500).json({ error: 'خطأ غير متوقع', details: err.message });
  }
});

module.exports = router;


// جلب جميع الحجوزات مع اسم العرض واسم الوكالة (يدوياً)
router.get('/all', async (req, res) => {
  // استخدم getSupabase بدلاً من supabase مباشرة
  const supabase = getSupabase(req);
  // السماح فقط للمدير العام أو المدير الفرعي المسؤول عن إدارة الطلبيات
  const { data: admin, error: adminError } = await supabase
    .from('admins')
    .select('role, permissions')
    .eq('id', req.user.id)
    .single();
  if (adminError || !admin) {
    return res.status(403).json({ error: 'غير مصرح. يرجى تسجيل الدخول كمدير.' });
  }
  if (
    admin.role !== 'main' &&
    !(admin.permissions && admin.permissions.manage_bookings === true)
  ) {
    return res.status(403).json({ error: 'غير مصرح. فقط المدير العام أو مدير فرعي لديه صلاحية إدارة الطلبيات يمكنه عرض قائمة الحجوزات.' });
  }

  // جلب جميع الحجوزات مع بيانات العرض
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, full_name, phone, room_type, status, created_at, offer_id, passport_image_url, offer:offers(id, title, agency_id)')
    .order('created_at', { ascending: false });
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // استخراج جميع agency_id من العروض
  const agencyIds = Array.from(new Set(
    bookings.map(b => b.offer && b.offer.agency_id).filter(Boolean)
  ));

  // جلب أسماء الوكالات دفعة واحدة
  let agenciesMap = {};
  if (agencyIds.length) {
    const { data: agencies, error: agencyError } = await supabase
      .from('agencies')
      .select('id, name')
      .in('id', agencyIds);
    if (!agencyError && agencies) {
      agencies.forEach(a => { agenciesMap[a.id] = a.name; });
    }
  }

  // تجهيز البيانات النهائية مع الحقول المطلوبة فقط
  const result = bookings.map(b => ({
    id: b.id,
    full_name: b.full_name,
    phone: b.phone,
    agency_name: b.offer && b.offer.agency_id ? (agenciesMap[b.offer.agency_id] || '') : '',
    offer_title: b.offer ? b.offer.title : '',
    created_at: b.created_at,
    status: b.status,
    room_type: b.room_type,
    passport_image_url: b.passport_image_url || '',
    // أضف أي حقول أخرى مطلوبة للواجهة
  }));
  res.json({ bookings: result });
});
