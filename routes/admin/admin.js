const express = require('express');
const router = express.Router();

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

// حماية جميع العمليات في هذا الملف (عدا تسجيل الدخول)
router.use((req, res, next) => {
  if (req.path === '/login-admin') return next();
  verifyToken(req, res, next);
});

// ---------------------- إدارة المدراء ----------------------
// إنشاء مدير عام
// إنشاء مدير عام (بدون الحاجة إلى توكن)
router.post('/add-admin', async (req, res) => {
  const supabase = getSupabase(req);
  const { email, password, full_name } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'يرجى إدخال جميع البيانات المطلوبة.' });
  }
  // تحقق إذا كان هناك مدير عام موجود بالفعل
  const { data: existingAdmins, error: fetchError } = await supabase
    .from('admins')
    .select('id')
    .eq('role', 'main');
  if (fetchError) {
    return res.status(500).json({ error: fetchError.message });
  }
  if (existingAdmins && existingAdmins.length > 0) {
    return res.status(403).json({ error: 'يوجد مدير عام بالفعل. لا يمكن إنشاء أكثر من مدير عام.' });
  }
  // إنشاء مستخدم جديد في supabase auth
  const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (signUpError) {
    return res.status(500).json({ error: signUpError.message });
  }
  const user = userData.user;
  // إضافة المدير العام في جدول admins بدور 'main'
  const { data, error } = await supabase.from('admins').insert([
    {
      id: user.id,
      full_name,
      email,
      role: 'main',
      created_by: null,
      permissions: null
    }
  ]).select();
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ message: 'تم إنشاء المدير العام بنجاح', data });
});

// إضافة مدير فرعي جديد (sub_admin)
// body: { email, password, full_name, role, permissions, created_by }
router.post('/add-sub-admin', async (req, res) => {
  const supabase = getSupabase(req);
  // تحقق من أن المستخدم الحالي هو مدير عام
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول.' });
  }
  const { data: currentAdmin, error: currentAdminError } = await supabase.from('admins').select('role').eq('id', req.user.id).single();
  if (currentAdminError || !currentAdmin || currentAdmin.role !== 'main') {
    return res.status(403).json({ error: 'فقط المدير العام يمكنه إضافة المدراء الفرعيين.' });
  }
  const { email, password, full_name, role, permissions, created_by } = req.body;
  if (!email || !password || !full_name || !role || !created_by) {
    return res.status(400).json({ error: 'يرجى إدخال جميع البيانات المطلوبة.' });
  }
  // إنشاء مستخدم جديد في supabase auth
  const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (signUpError) {
    return res.status(500).json({ error: signUpError.message });
  }
  const user = userData.user;
  // إضافة sub_admin في جدول admins
  const { data, error } = await supabase.from('admins').insert([
    {
      id: user.id,
      full_name,
      email,
      role,
      created_by,
      permissions
    }
  ]).select();
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ message: 'تم إنشاء المدير الفرعي بنجاح', data });
});

// جلب جميع المدراء (main & sub)
router.get('/all', async (req, res) => {
  const supabase = getSupabase(req);
  const { data, error } = await supabase.from('admins').select('*');
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ admins: data });
});

router.post('/login-admin', async (req, res) => {
  const supabase = getSupabase(req);
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' });
  }
  // تسجيل الدخول للمستخدم
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    return res.status(401).json({ error: 'فشل تسجيل الدخول. يرجى التحقق من البريد الإلكتروني وكلمة المرور.' });
  }
  // إعادة التوكن مع بيانات المستخدم
  res.json({
    message: 'تم تسجيل الدخول بنجاح',
    user: data.user,
    access_token: data.session ? data.session.access_token : null,
    refresh_token: data.session ? data.session.refresh_token : null
  });
});

// حذف مدير (sub, supremmier) عبر id فقط، لا يمكن حذف main admin
router.delete('/delete/:id', async (req, res) => {
  const supabase = getSupabase(req);
  const { id } = req.params;
  // تحقق من أن المستخدم الحالي هو مدير عام
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول.' });
  }
  // جلب بيانات المستخدم الحالي من جدول admins
  const { data: currentAdmin, error: currentAdminError } = await supabase.from('admins').select('role').eq('id', req.user.id).single();
  if (currentAdminError || !currentAdmin || currentAdmin.role !== 'main') {
    return res.status(403).json({ error: 'فقط المدير العام يمكنه حذف المدراء.' });
  }
  if (!id) {
    return res.status(400).json({ error: 'يرجى إرسال معرف المدير.' });
  }
  // جلب المدير للتحقق من نوعه
  const { data: admin, error: fetchError } = await supabase.from('admins').select('role').eq('id', id).single();
  if (fetchError || !admin) {
    return res.status(404).json({ error: 'المدير غير موجود.' });
  }
  if (admin.role === 'main') {
    return res.status(403).json({ error: 'لا يمكن حذف المدير الرئيسي.' });
  }
  // حذف المدير من جدول admins
  const { error } = await supabase.from('admins').delete().eq('id', id);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ message: 'تم حذف المدير بنجاح' });
});

// تعديل بيانات مدير فرعي أو مميز (فقط المدير العام يمكنه التعديل)
// PUT /api/admin/update/:id
router.put('/update/:id', async (req, res) => {
  const supabase = getSupabase(req);
  const { id } = req.params;
  // تحقق من أن المستخدم الحالي هو مدير عام
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول.' });
  }
  const { data: currentAdmin, error: currentAdminError } = await supabase.from('admins').select('role').eq('id', req.user.id).single();
  if (currentAdminError || !currentAdmin || currentAdmin.role !== 'main') {
    return res.status(403).json({ error: 'فقط المدير العام يمكنه تعديل المدراء.' });
  }
  // لا يمكن تعديل المدير الرئيسي
  const { data: admin, error: fetchError } = await supabase.from('admins').select('role').eq('id', id).single();
  if (fetchError || !admin) {
    return res.status(404).json({ error: 'المدير غير موجود.' });
  }
  if (admin.role === 'main') {
    return res.status(403).json({ error: 'لا يمكن تعديل المدير الرئيسي.' });
  }
  // تحديث كلمة المرور إذا تم إرسالها
  let { password, ...fields } = req.body;
  if (password && typeof password === 'string' && password.length >= 6) {
    // تحديث كلمة المرور في supabase auth
    const { error: passError } = await supabase.auth.admin.updateUser(id, { password });
    if (passError) {
      return res.status(500).json({ error: 'فشل في تحديث كلمة المرور: ' + passError.message });
    }
  }
  // تحديث بقية البيانات في جدول admins
  const { data: updated, error } = await supabase.from('admins').update(fields).eq('id', id).select();
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ message: 'تم تعديل بيانات المدير بنجاح', data: updated });
});



// تحديث حالة النشاط للمدير (فعلي)
// body: { is_active (اختياري, default=true) }
router.post('/update-activity-status', async (req, res) => {
  try {
    const supabase = getSupabase(req);
    const admin_id = req.user && req.user.id;
    if (!admin_id) {
      return res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول.' });
    }
    const is_active = typeof req.body.is_active === 'boolean' ? req.body.is_active : true;
    const now = new Date().toISOString();
    // تحقق إذا كان هناك سجل سابق لهذا المدير
    const { data: existing, error: fetchError } = await supabase
      .from('admin_online_status')
      .select('id')
      .eq('admin_id', admin_id)
      .single();
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: no rows found
      return res.status(500).json({ error: fetchError.message });
    }
    if (existing && existing.id) {
      // تحديث السجل الحالي
      const { error: updateError } = await supabase
        .from('admin_online_status')
        .update({ is_active, last_seen: now })
        .eq('id', existing.id);
      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }
    } else {
      // إدراج سجل جديد
      const { error: insertError } = await supabase
        .from('admin_online_status')
        .insert([{ admin_id, is_active, last_seen: now }]);
      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'خطأ غير متوقع.' });
  }
});

// جلب عدد المدراء النشطين الآن (فعلي)
router.get('/active-now', async (req, res) => {
  const supabase = getSupabase(req);
  // جلب عدد المدراء النشطين الآن من جدول admin_online_status
  // نشط إذا كان is_active = true و آخر ظهور خلال آخر 5 دقائق
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('admin_online_status')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .gte('last_seen', fiveMinutesAgo);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ count: count || 0 });
});

module.exports = router;