const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
// Cloudinary setup
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ملاحظة: استخدم req.supabase إذا كان موجوداً (تم تمريره من server.js)، وإلا fallback للقديم (للاستدعاءات المباشرة)
function getSupabase(req) {
  return (req && req.supabase) ? req.supabase : require('../../supabaseAdmin');
}

// ميدلوير للتحقق من التوكن
async function verifyToken(req, res, next) {
  const supabase = getSupabase(req);
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى إرسال التوكن في الهيدر (Authorization: Bearer <token>)' });
  }
  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data || !data.user) {
    return res.status(401).json({ error: 'توكن غير صالح أو منتهي الصلاحية.' });
  }
  req.user = data.user;
  next();
}

// حماية جميع العمليات في هذا الملف
router.use(verifyToken);

// جلب جميع الوكالات مع معلومات المستخدم من auth (البريد الإلكتروني)
router.get('/all', async (req, res) => {
  const supabase = getSupabase(req);
  // السماح فقط للمدير العام أو المدير الفرعي الذي لديه صلاحية إدارة الوكالات (permissions.manage_agencies)
  const { data: currentAdmin, error: currentAdminError } = await supabase.from('admins').select('role, permissions').eq('id', req.user.id).single();
  if (currentAdminError || !currentAdmin) {
    return res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول.' });
  }
  if (
    currentAdmin.role !== 'main' &&
    !(currentAdmin.permissions && currentAdmin.permissions.manage_agencies === true)
  ) {
    return res.status(403).json({ error: 'غير مصرح. هذه العملية تتطلب صلاحية المدير العام أو مدير فرعي لديه صلاحية إدارة الوكالات.' });
  }

  // جلب جميع الوكالات
  const { data: agencies, error } = await supabase.from('agencies').select('*');
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // جلب إيميلات المستخدمين من auth لكل وكالة
  const agenciesWithEmail = await Promise.all(
    agencies.map(async (agency) => {
      // جلب المستخدم من auth
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(agency.id);
      return {
        ...agency,
        email: userData && userData.user ? userData.user.email : null
      };
    })
  );

  res.json({ agencies: agenciesWithEmail });
});

// جلب الوكالات المعلقة فقط (is_approved = false)
router.get('/pending', async (req, res) => {
  const supabase = getSupabase(req);
  // السماح فقط للمدير العام أو المدير الفرعي الذي لديه صلاحية can_approve_agencies
  const { data: currentAdmin, error: currentAdminError } = await supabase.from('admins').select('role, permissions').eq('id', req.user.id).single();
  if (currentAdminError || !currentAdmin) {
    return res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول.' });
  }
  if (
    currentAdmin.role !== 'main' &&
    !(currentAdmin.permissions && currentAdmin.permissions.can_approve_agencies === true)
  ) {
    return res.status(403).json({ error: 'غير مصرح. هذه العملية تتطلب صلاحية المدير العام أو مدير فرعي لديه صلاحية قبول طلبيات الوكالات.' });
  }
  const { data, error } = await supabase.from('agencies').select('*').eq('is_approved', false);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ agencies: data });
});

// إضافة وكالة جديدة (يدعم json أو multipart/form-data للصور)
router.post('/add', async (req, res) => {
  const supabase = getSupabase(req);
  try {
    const {
      email,
      password,
      name,
      wilaya,
      license_number,
      phone,
      bank_account,
      logo,         // base64 or URL
      background,   // base64 or URL
      location_name,
      latitude,
      longitude
    } = req.body;

    // إنشاء مستخدم في auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) return res.status(500).json({ error: authError.message });
    if (!authUser || !authUser.user || !authUser.user.id) {
      return res.status(500).json({ error: 'تعذر إنشاء المستخدم. يرجى المحاولة مرة أخرى.' });
    }
    const userId = authUser.user.id;

    // رفع الصور إلى Cloudinary
    let logo_url = null;
    let background_url = null;

    if (logo && logo.startsWith('data:')) {
      const uploaded = await cloudinary.uploader.upload(logo, { folder: 'agencies/logos' });
      logo_url = uploaded.secure_url;
    } else if (logo) {
      logo_url = logo;
    }

    if (background && background.startsWith('data:')) {
      const uploaded = await cloudinary.uploader.upload(background, { folder: 'agencies/backgrounds' });
      background_url = uploaded.secure_url;
    } else if (background) {
      background_url = background;
    }

    // تحقق من أن location_name غير فارغ
    if (!location_name || location_name.trim() === "") {
      return res.status(400).json({ error: "حقل اسم الموقع (location_name) مطلوب ولا يمكن أن يكون فارغاً." });
    }

    // حفظ البيانات في جدول agencies (تأكد من جميع الحقول المطلوبة)
    const { data, error } = await supabase.from('agencies').insert([{
      id: userId,
      name,
      wilaya,
      license_number,
      phone,
      bank_account,
      logo_url,
      background_url,
      location_name,
      latitude,
      longitude,
      is_approved: false // افتراضي
    }]);

    if (error) return res.status(500).json({ error: error.message, details: error });

    res.json({ message: "تمت الإضافة بنجاح", agency_id: userId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطأ غير متوقع", details: err.message });
  }
});

// تحديث حالة الوكالة (قبول/تعليق) - فقط المدير العام يمكنه ذلك
router.put('/status/:id', async (req, res) => {
  const supabase = getSupabase(req);
  const { id } = req.params;
  const { is_approved } = req.body;
  // تحقق من أن المستخدم الحالي هو مدير عام
  const { data: currentAdmin, error: currentAdminError } = await supabase.from('admins').select('role').eq('id', req.user.id).single();
  if (currentAdminError || !currentAdmin || currentAdmin.role !== 'main') {
    return res.status(403).json({ error: 'فقط المدير العام يمكنه قبول أو تعليق الوكالات.' });
  }
  // تحديث حالة الوكالة
  const { data, error } = await supabase.from('agencies').update({ is_approved }).eq('id', id).select();
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ message: is_approved ? 'تم قبول الوكالة' : 'تم تعليق الوكالة', data });
});
router.delete('/remove/:id', async (req, res) => {
  const supabase = getSupabase(req);
  const { id } = req.params;

  // جلب جميع عروض الوكالة
  const { data: offers, error: offersError } = await supabase.from('offers').select('id').eq('agency_id', id);
  if (offersError) {
    return res.status(500).json({ error: 'فشل جلب عروض الوكالة', details: offersError.message });
  }

  // حذف جميع سجلات offer_view_counts المرتبطة بعروض الوكالة
  if (offers && offers.length > 0) {
    const offerIds = offers.map(offer => offer.id);
    const { error: deleteOfferViewsError } = await supabase.from('offer_view_counts').delete().in('offer_id', offerIds);
    if (deleteOfferViewsError) {
      return res.status(500).json({ error: 'فشل حذف إحصائيات مشاهدات العروض المرتبطة بالوكالة', details: deleteOfferViewsError.message });
    }
    // حذف جميع العروض المرتبطة بالوكالة في جدول offers
    const { error: deleteOffersError } = await supabase.from('offers').delete().in('id', offerIds);
    if (deleteOffersError) {
      return res.status(500).json({ error: 'فشل حذف العروض المرتبطة بالوكالة', details: deleteOffersError.message });
    }
  }
  // إذا لم يكن هناك عروض، احذف مباشرة حسب agency_id
  else {
    const { error: deleteOffersError } = await supabase.from('offers').delete().eq('agency_id', id);
    if (deleteOffersError) {
      return res.status(500).json({ error: 'فشل حذف العروض المرتبطة بالوكالة', details: deleteOffersError.message });
    }
  }

  // حذف جميع العروض المرتبطة بالوكالة في جدول offers
  const { error: deleteOffersError } = await supabase.from('offers').delete().eq('agency_id', id);
  if (deleteOffersError) {
    return res.status(500).json({ error: 'فشل حذف العروض المرتبطة بالوكالة', details: deleteOffersError.message });
  }

  // تحقق من الصلاحيات
  const { data: currentAdmin, error: currentAdminError } = await supabase
    .from('admins')
    .select('role')
    .eq('id', req.user.id)
    .single();

  if (currentAdminError || !currentAdmin || currentAdmin.role !== 'main') {
    return res.status(403).json({ error: 'فقط المدير العام يمكنه حذف الوكالات.' });
  }

  // تحقق من وجود الوكالة
  const { data: agency, error: agencyError } = await supabase
    .from('agencies')
    .select()
    .eq('id', id)
    .single();

  if (agencyError || !agency) {
    return res.status(404).json({ error: 'الوكالة غير موجودة' });
  }


  // حذف جميع الصفوف المرتبطة بالوكالة في جدول agency_airports
  const { error: deleteAirportsError } = await supabase.from('agency_airports').delete().eq('agency_id', id);
  if (deleteAirportsError) {
    return res.status(500).json({ error: 'فشل حذف المطارات المرتبطة بالوكالة', details: deleteAirportsError.message });
  }

  // جلب جميع الدردشات المرتبطة بالوكالة
  const { data: chats, error: chatsError } = await supabase.from('chats').select('id').eq('agency_id', id);
  if (chatsError) {
    return res.status(500).json({ error: 'فشل جلب الدردشات المرتبطة بالوكالة', details: chatsError.message });
  }

  // حذف جميع الرسائل المرتبطة بهذه الدردشات
  if (chats && chats.length > 0) {
    const chatIds = chats.map(chat => chat.id);
    const { error: deleteMessagesError } = await supabase.from('messages').delete().in('chat_id', chatIds);
    if (deleteMessagesError) {
      return res.status(500).json({ error: 'فشل حذف الرسائل المرتبطة بدردشات الوكالة', details: deleteMessagesError.message });
    }
  }

  // حذف جميع الدردشات المرتبطة بالوكالة في جدول chats
  const { error: deleteChatsError } = await supabase.from('chats').delete().eq('agency_id', id);
  if (deleteChatsError) {
    console.error('تفاصيل خطأ حذف الدردشات:', deleteChatsError);
    return res.status(500).json({ error: 'فشل حذف الدردشات المرتبطة بالوكالة', details: deleteChatsError.message });
  }

  // حذف الوكالة
  const { error: deleteError } = await supabase.from('agencies').delete().eq('id', id);
  if (deleteError) {
    return res.status(500).json({ error: deleteError.message });
  }

  // حذف الحساب من auth
  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);
  if (authDeleteError) {
    return res.status(500).json({ error: authDeleteError.message });
  }

  res.json({ message: 'تم حذف الوكالة والمستخدم المرتبط بها بنجاح.' });
});// دالة لاستخراج public_id من رابط Cloudinary
function extractPublicId(url) {
  const regex = /\/upload\/(?:v\d+\/)?(.+?)\.(jpg|jpeg|png|webp|gif)/;
  const match = url.match(regex);
  return match ? match[1] : null; // e.g. 'agencies/logos/filename123'
}

// تعديل بيانات وكالة مع تحديث الصور في Cloudinary إذا تم تغييرها
router.put('/update/:id', async (req, res) => {
  const supabase = getSupabase(req);
  const { id } = req.params;
  const {
    name,
    wilaya,
    license_number,
    phone,
    bank_account,
    logo,           // base64 or URL (جديد)
    background,     // base64 or URL (جديد)
    location_name,
    latitude,
    longitude,
    is_approved
  } = req.body;

  // تحقق من الصلاحيات
  const { data: currentAdmin, error: currentAdminError } = await supabase
    .from('admins')
    .select('role, permissions')
    .eq('id', req.user.id)
    .single();

  if (currentAdminError || !currentAdmin) {
    return res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول.' });
  }

  if (
    currentAdmin.role !== 'main' &&
    !(currentAdmin.permissions && currentAdmin.permissions.manage_agencies === true)
  ) {
    return res.status(403).json({
      error: 'غير مصرح. هذه العملية تتطلب صلاحية المدير العام أو مدير فرعي لديه صلاحية إدارة الوكالات.',
    });
  }

  // تحقق من أن location_name غير فارغ
  if (!location_name || location_name.trim() === '') {
    return res.status(400).json({
      error: 'حقل اسم الموقع (location_name) مطلوب ولا يمكن أن يكون فارغاً.',
    });
  }

  // جلب بيانات الوكالة الحالية
  const { data: agency, error: agencyError } = await supabase
    .from('agencies')
    .select('logo_url, background_url')
    .eq('id', id)
    .single();

  if (agencyError || !agency) {
    return res.status(404).json({ error: 'الوكالة غير موجودة' });
  }

  let logo_url = agency.logo_url;
  let background_url = agency.background_url;

  // تحديث صورة الشعار إذا تم إرسال صورة جديدة (base64)
  if (logo && logo.startsWith('data:')) {
    if (logo_url) {
      try {
        const publicId = extractPublicId(logo_url);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId, { invalidate: true });
        }
      } catch (e) {
        console.error('فشل في حذف الشعار القديم:', e.message);
      }
    }
    const uploaded = await cloudinary.uploader.upload(logo, { folder: 'agencies/logos' });
    logo_url = uploaded.secure_url;
  } else if (logo) {
    logo_url = logo;
  }

  // تحديث صورة الخلفية إذا تم إرسال صورة جديدة (base64)
  if (background && background.startsWith('data:')) {
    if (background_url) {
      try {
        const publicId = extractPublicId(background_url);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId, { invalidate: true });
        }
      } catch (e) {
        console.error('فشل في حذف الخلفية القديمة:', e.message);
      }
    }
    const uploaded = await cloudinary.uploader.upload(background, { folder: 'agencies/backgrounds' });
    background_url = uploaded.secure_url;
  } else if (background) {
    background_url = background;
  }

  // تحديث بيانات الوكالة
  const { data, error } = await supabase
    .from('agencies')
    .update({
      name,
      wilaya,
      license_number,
      phone,
      bank_account,
      logo_url,
      background_url,
      location_name,
      latitude,
      longitude,
      is_approved,
    })
    .eq('id', id)
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: 'تم تحديث بيانات الوكالة بنجاح', data });
});



module.exports = router;
