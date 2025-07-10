
const express = require('express');
const router = express.Router();

// جلب بريد المدير الحالي (المتصل)
router.get('/current-admin-email', async (req, res) => {
  try {
    const supabase = getSupabase(req);
    // جلب بيانات المدير الحالي من جدول admins
    const { data: admin, error } = await supabase
      .from('admins')
      .select('email')
      .eq('id', req.user.id)
      .single();
    if (error || !admin) {
      return res.status(404).json({ error: 'لم يتم العثور على المدير.' });
    }
    res.json({ email: admin.email });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ أثناء جلب البريد.' });
  }
});

// ميدلوير حماية التوكن لجميع العمليات
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

// استخدم req.supabase إذا كان موجودًا (تم تمريره من server.js)، وإلا fallback للقديم (للاستدعاءات المباشرة)
function getSupabase(req) {
  return (req && req.supabase) ? req.supabase : require('../../supabaseAdmin');
}

// إجمالي الوكالات المقبولة فقط
router.get('/total-agencies', async (req, res) => {
  const supabase = getSupabase(req);
  const { count, error } = await supabase
    .from('agencies')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', true);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: count || 0 });
});

// إجمالي المعتمرين (عدد الحجوزات المقبولة نهائياً من طرف الوكالات)
router.get('/total-pilgrims', async (req, res) => {
  const supabase = getSupabase(req);
  // نفترض أن هناك حالة "مقبول نهائي" أو "مكتمل" أو ما شابه في status
  // إذا كانت الحالة مختلفة، يرجى تعديلها حسب قاعدة البيانات
  const { count, error } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'مقبول نهائي');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: count || 0 });
});

// إجمالي العروض
router.get('/total-offers', async (req, res) => {
  const supabase = getSupabase(req);
  const { count, error } = await supabase.from('offers').select('*', { count: 'exact', head: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: count || 0 });
});

// عدد الطلبات المعلقة
router.get('/pending-requests', async (req, res) => {
  const supabase = getSupabase(req);
  const { count, error } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'قيد الانتظار');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: count || 0 });
});

// قائمة الوكالات المعلقة
router.get('/pending-agencies', async (req, res) => {
  const supabase = getSupabase(req);
  const { data, error } = await supabase
    .from('agencies')
    .select('id, name, wilaya, phone, is_approved') // أزل email لأنه غير موجود في الجدول
    .eq('is_approved', false);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ agencies: data || [] });
});

// إحصائيات الحجوزات الشهرية (آخر 12 شهر)
router.get('/monthly-bookings', async (req, res) => {
  const supabase = getSupabase(req);
  const { data, error } = await supabase.from('bookings').select('created_at').order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  const months = [];
  const monthlyCounts = [];
  if (data && data.length) {
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = d.toISOString().slice(0, 7);
      months.push(ym);
      const count = data.filter(b => b.created_at && b.created_at.startsWith(ym)).length;
      monthlyCounts.push(count);
    }
  }
  res.json({ months, counts: monthlyCounts });
});

// توزيع الوكالات حسب الولاية (top 6)
router.get('/agencies-by-wilaya', async (req, res) => {
  const supabase = getSupabase(req);
  const { data, error } = await supabase.from('agencies').select('wilaya').neq('wilaya', null);
  if (error) return res.status(500).json({ error: error.message });
  const wilayaCount = {};
  if (data) {
    data.forEach(a => {
      if (!a.wilaya) return;
      wilayaCount[a.wilaya] = (wilayaCount[a.wilaya] || 0) + 1;
    });
  }
  const labels = Object.keys(wilayaCount).sort((a, b) => wilayaCount[b] - wilayaCount[a]).slice(0, 6);
  const counts = labels.map(w => wilayaCount[w]);
  res.json({ labels, counts });
});

// تفاصيل وكالة واحدة
router.get('/agency/:id', async (req, res) => {
  const supabase = getSupabase(req);
  const { id } = req.params;
  const { data, error } = await supabase.from('agencies').select('*').eq('id', id).single();
  if (error || !data) return res.status(404).json({ error: 'الوكالة غير موجودة.' });
  res.json({ agency: data });
});

// إجمالي الوكالات المقبولة
router.get('/total-approved-agencies', async (req, res) => {
  const supabase = getSupabase(req);
  const { count, error } = await supabase
    .from('agencies')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', true);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: count || 0 });
});

// إجمالي الوكالات المرفوضة
router.get('/total-rejected-agencies', async (req, res) => {
  const supabase = getSupabase(req);
  const { count, error } = await supabase
    .from('agencies')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', false);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: count || 0 });
});

// إجمالي الحجوزات
router.get('/total-bookings', async (req, res) => {
  const supabase = getSupabase(req);
  const { count, error } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: count || 0 });
});

// إجمالي الحجوزات المقبولة
router.get('/total-accepted-bookings', async (req, res) => {
  const supabase = getSupabase(req);
  const { count, error } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'مقبول نهائي');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: count || 0 });
});

// إجمالي الحجوزات المرفوضة
router.get('/total-rejected-bookings', async (req, res) => {
  const supabase = getSupabase(req);
  const { count, error } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'مرفوض');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: count || 0 });
});

// إجمالي المستخدمين (جدول users)
router.get('/total-users', async (req, res) => {
  const supabase = getSupabase(req);
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: count || 0 });
});

// أكثر الوكالات التي لديها عروض (Top Agencies by Offers)
router.get('/top-agencies-by-offers', async (req, res) => {
  const supabase = getSupabase(req);
  const { data, error } = await supabase
    .from('offers')
    .select('agency_id');
  if (error) return res.status(500).json({ error: error.message });
  const agencyCount = {};
  if (data) {
    data.forEach(o => {
      if (!o.agency_id) return;
      agencyCount[o.agency_id] = (agencyCount[o.agency_id] || 0) + 1;
    });
  }
  // جلب أسماء الوكالات
  const agencyIds = Object.keys(agencyCount);
  let agencyNames = {};
  if (agencyIds.length) {
    const { data: agencies } = await supabase
      .from('agencies')
      .select('id, name')
      .in('id', agencyIds);
    if (agencies) {
      agencies.forEach(a => { agencyNames[a.id] = a.name; });
    }
  }
  const sorted = agencyIds.sort((a, b) => agencyCount[b] - agencyCount[a]).slice(0, 6);
  const labels = sorted.map(id => agencyNames[id] || id);
  const counts = sorted.map(id => agencyCount[id]);
  res.json({ labels, counts });
});

// أكثر العروض طلباً (Top Requested Offers)
router.get('/top-requested-offers', async (req, res) => {
  const supabase = getSupabase(req);
  const { data, error } = await supabase
    .from('bookings')
    .select('offer_id');
  if (error) return res.status(500).json({ error: error.message });
  const offerCount = {};
  if (data) {
    data.forEach(b => {
      if (!b.offer_id) return;
      offerCount[b.offer_id] = (offerCount[b.offer_id] || 0) + 1;
    });
  }
  // جلب عناوين العروض
  const offerIds = Object.keys(offerCount);
  let offerTitles = {};
  if (offerIds.length) {
    const { data: offers } = await supabase
      .from('offers')
      .select('id, title')
      .in('id', offerIds);
    if (offers) {
      offers.forEach(o => { offerTitles[o.id] = o.title; });
    }
  }
  const sorted = offerIds.sort((a, b) => offerCount[b] - offerCount[a]).slice(0, 6);
  const labels = sorted.map(id => offerTitles[id] || id);
  const counts = sorted.map(id => offerCount[id]);
  res.json({ labels, counts });
});

// نشاط المدراء الشهري (main/sub) بناءً على جدول admin_online_status
router.get('/admin-activity-monthly', async (req, res) => {
  const supabase = getSupabase(req);
  // months: آخر 12 شهر
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  // جلب جميع المدراء
  const { data: admins, error: adminErr } = await supabase.from('admins').select('id, role');
  if (adminErr) return res.status(500).json({ error: adminErr.message });
  const adminRoles = {};
  (admins || []).forEach(a => { adminRoles[a.id] = a.role; });
  // جلب جميع سجلات النشاط
  const { data: logs, error } = await supabase
    .from('admin_online_status')
    .select('admin_id, last_seen')
    .not('last_seen', 'is', null);
  if (error) return res.status(500).json({ error: error.message });
  const main = Array(12).fill(0);
  const sub = Array(12).fill(0);
  (logs || []).forEach(log => {
    if (!log.last_seen || !log.admin_id) return;
    const ym = log.last_seen.slice(0, 7);
    const idx = months.indexOf(ym);
    if (idx === -1) return;
    const role = adminRoles[log.admin_id] || 'sub';
    if (role === 'main') main[idx]++;
    else if (role === 'sub') sub[idx]++;
  });
  res.json({ months, main, sub });
});

// سجل نشاطات المدراء (logs)
router.get('/admin-activity', async (req, res) => {
  // فقط المدير العام يمكنه رؤية السجل
  const { data: currentAdmin, error: currentAdminError } = await supabase.from('admins').select('role').eq('id', req.user.id).single();
  if (currentAdminError || !currentAdmin || currentAdmin.role !== 'main') {
    return res.status(403).json({ error: 'فقط المدير العام يمكنه رؤية سجل النشاطات.' });
  }
  // لا يوجد جدول admin_activity_logs في قاعدة البيانات الحالية، أرجع بيانات وهمية
  res.json({ logs: [] });
});

// أكثر وكالة أضافت عروضًا في كل سنة خلال آخر 10 سنوات
router.get('/top-agency-by-offers-per-year', async (req, res) => {
  const supabase = getSupabase(req);
  const now = new Date();
  const years = [];
  const topAgencies = [];
  const topCounts = [];
  for (let i = 9; i >= 0; i--) {
    const year = now.getFullYear() - i;
    years.push(year);
    // جلب جميع العروض لهذه السنة
    const { data: offers, error } = await supabase
      .from('offers')
      .select('agency_id, created_at')
      .gte('created_at', `${year}-01-01`)
      .lte('created_at', `${year}-12-31`);
    if (error || !offers || offers.length === 0) {
      topAgencies.push('—');
      topCounts.push(0);
      continue;
    }
    // حساب عدد العروض لكل وكالة
    const agencyCount = {};
    offers.forEach(o => {
      if (!o.agency_id) return;
      agencyCount[o.agency_id] = (agencyCount[o.agency_id] || 0) + 1;
    });
    // إيجاد الوكالة الأعلى
    const topAgencyId = Object.keys(agencyCount).sort((a, b) => agencyCount[b] - agencyCount[a])[0];
    const topCount = agencyCount[topAgencyId] || 0;
    // جلب اسم الوكالة
    let agencyName = topAgencyId;
    if (topAgencyId) {
      const { data: agency } = await supabase.from('agencies').select('name').eq('id', topAgencyId).single();
      if (agency && agency.name) agencyName = agency.name;
    } else {
      agencyName = '—';
    }
    topAgencies.push(agencyName);
    topCounts.push(topCount);
  }
  res.json({ years, topAgencies, topCounts });
});

// عدد المدراء النشطين الآن (main + sub فقط)
router.get('/admin/active-now', async (req, res) => {
  const supabase = getSupabase(req);
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  // جلب المدراء النشطين الآن
  const { data: online, error: onlineErr } = await supabase
    .from('admin_online_status')
    .select('admin_id')
    .eq('is_active', true)
    .gte('last_seen', fiveMinAgo);
  if (onlineErr) return res.status(500).json({ error: onlineErr.message });
  const adminIds = (online || []).map(a => a.admin_id);
  let count = 0;
  if (adminIds.length) {
    const { data: adminsData } = await supabase
      .from('admins')
      .select('id, role')
      .in('id', adminIds);
    count = (adminsData || []).filter(a => a.role === 'main' || a.role === 'sub').length;
  }
  res.json({ count });
});

module.exports = router;
