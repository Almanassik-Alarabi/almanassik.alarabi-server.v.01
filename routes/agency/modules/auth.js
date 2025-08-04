const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const supabase = require('../../../supabaseClient');
const supabase_role = require('../../../supabaseAdmin');

// تسجيل دخول وكالة (email, password)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' });
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(401).json({ error: error.message });
  }
  const { user } = data;
  const { data: agency, error: agencyError } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', user.id)
    .single();
  if (agencyError || !agency) {
    return res.status(403).json({ error: 'الحساب ليس وكالة معتمدة' });
  }
  if (!agency.is_approved) {
    return res.status(403).json({ error: 'لم يتم قبول الوكالة بعد من طرف الإدارة' });
  }
  res.json({ token: data.session.access_token, refresh_token: data.session.refresh_token, agency });
});

// إنشاء وكالة جديدة
router.post('/register', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'background', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      name, email, password, wilaya, airports, license_number,
      phone, bank_account, location_name, latitude, longitude
    } = req.body;
    if (!name || !email || !password || !wilaya || !airports || !license_number || !phone || !location_name || !latitude || !longitude) {
      return res.status(400).json({ error: 'يرجى تعبئة جميع الحقول المطلوبة' });
    }
    const { data: authData, error: authError } = await supabase_role.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (authError) {
      return res.status(400).json({ error: authError.message });
    }
    const userId = authData.user.id;
    let logo_url = null, background_url = null;
    if (req.files && req.files.logo && req.files.logo[0]) {
      const logoUpload = await cloudinary.uploader.upload_stream({ folder: 'agencies/logos' }, (error, result) => {
        if (error) throw error;
        logo_url = result.secure_url;
      });
      logoUpload.end(req.files.logo[0].buffer);
    }
    if (req.files && req.files.background && req.files.background[0]) {
      const bgUpload = await cloudinary.uploader.upload_stream({ folder: 'agencies/backgrounds' }, (error, result) => {
        if (error) throw error;
        background_url = result.secure_url;
      });
      bgUpload.end(req.files.background[0].buffer);
    }
    const { error: agencyError } = await supabase_role
      .from('agencies')
      .insert({
        id: userId,
        name,
        wilaya,
        license_number,
        phone,
        bank_account,
        logo_url,
        background_url,
        location_name,
        latitude: Number(latitude),
        longitude: Number(longitude),
        is_approved: false
      });
    if (agencyError) {
      return res.status(400).json({ error: agencyError.message });
    }
    const airportIds = Array.isArray(airports) ? airports : airports.split(',');
    for (const airport_id of airportIds) {
      await supabase_role.from('agency_airports').insert({ agency_id: userId, airport_id: Number(airport_id) });
    }
    res.json({ status: 'ok', message: 'تم إنشاء الوكالة بنجاح. بانتظار موافقة الإدارة.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
