const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const verifyToken = require('../../../middlewares/verifyToken');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY_ROLE;
const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = require('../../../supabaseAdmin');

// Cloudinary config
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// جلب معلومات الوكالة بالتفصيل (محمي بالتوكن)
router.get('/:agencyId', verifyToken, async (req, res) => {
  const { agencyId } = req.params;
  // تحقق أن المستخدم هو صاحب الحساب
  if (String(req.user.id).trim() !== String(agencyId).trim()) {
    return res.status(403).json({ error: 'غير مصرح لك بالوصول لهذه البيانات.' });
  }
  // جلب بيانات الوكالة فقط
  const { data: agency, error } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', agencyId)
    .single();
  if (error) return res.status(400).json({ error: error.message });
  // جلب المطارات المرتبطة مع تفاصيلها
  let airportsArr = [];
  let airportIdsArr = [];
  try {
    const { data: airportsData, error: airportsError } = await supabase
      .from('agency_airports')
      .select('airport_id,airports(id,code,name)')
      .eq('agency_id', agencyId);
    if (!airportsError && Array.isArray(airportsData)) {
      // إزالة التكرار حسب معرف المطار
      const uniqueAirports = {};
      airportsData.forEach(a => {
        if (a.airports && a.airports.id) {
          uniqueAirports[a.airports.id] = a.airports;
        }
      });
      airportsArr = Object.values(uniqueAirports);
      airportIdsArr = [...new Set(airportsData.map(a => a.airport_id))];
    }
  } catch (e) {
    airportsArr = [];
    airportIdsArr = [];
  }
  // إرجاع المطارات كحقل إضافي وليس من قاعدة البيانات مباشرة
  res.json({ ...agency, airports: airportsArr, airport_ids: airportIdsArr });
});

// تعديل معلومات الوكالة (محمي بالتوكن)
router.put('/:agencyId', verifyToken, upload.fields([
  { name: 'logo_url', maxCount: 1 },
  { name: 'background_url', maxCount: 1 }
]), async (req, res) => {
  const { agencyId } = req.params;
  if (req.user.id !== agencyId) {
    return res.status(403).json({ error: 'غير مصرح لك بالتعديل.' });
  }
  let updateFields = { ...req.body };
  // إذا تم إرسال كلمة سر جديدة، قم بتحديثها في supabase عبر admin API
  if (updateFields.password && updateFields.password.length >= 6) {
    try {
      // supabase-js v2: updateUserById
      const { error: passError } = await supabaseAdmin.auth.admin.updateUserById(agencyId, { password: updateFields.password });
      if (passError) {
        return res.status(400).json({ error: 'فشل تحديث كلمة السر', details: passError.message });
      }
    } catch (e) {
      return res.status(500).json({ error: 'خطأ أثناء تحديث كلمة السر', details: e.message });
    }
    delete updateFields.password;
  }
  // احذف حقل airports من التحديث المباشر للجدول agencies بعد حفظ نسخة منه
  let airportsRaw = undefined;
  if (Object.prototype.hasOwnProperty.call(updateFields, 'airports')) {
    airportsRaw = updateFields.airports;
    delete updateFields.airports;
  }
  // إذا كان هناك حقول مرسلة كـ [object Object] بسبب FormData، حولها لنوعها الصحيح
  Object.keys(updateFields).forEach(key => {
    if (typeof updateFields[key] === 'string' && updateFields[key].startsWith('{') && updateFields[key].endsWith('}')) {
      try {
        updateFields[key] = JSON.parse(updateFields[key]);
      } catch (e) {}
    }
  });
  // رفع الصور إلى cloudinary إذا تم إرسالها
  try {
    if (req.files && req.files.logo_url && req.files.logo_url[0]) {
      const logoResult = await cloudinary.uploader.upload_stream_promise
        ? await cloudinary.uploader.upload_stream_promise(req.files.logo_url[0].buffer, { folder: 'agencies_logos' })
        : await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ folder: 'agencies_logos' }, (err, result) => {
              if (err) reject(err); else resolve(result);
            });
            stream.end(req.files.logo_url[0].buffer);
          });
      updateFields.logo_url = logoResult.secure_url;
    }
    if (req.files && req.files.background_url && req.files.background_url[0]) {
      const bgResult = await cloudinary.uploader.upload_stream_promise
        ? await cloudinary.uploader.upload_stream_promise(req.files.background_url[0].buffer, { folder: 'agencies_backgrounds' })
        : await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ folder: 'agencies_backgrounds' }, (err, result) => {
              if (err) reject(err); else resolve(result);
            });
            stream.end(req.files.background_url[0].buffer);
          });
      updateFields.background_url = bgResult.secure_url;
    }
  } catch (err) {
    return res.status(500).json({ error: 'فشل رفع الصور', details: err.message });
  }
  // إذا أرسلت أرقام أو منطقية كـ string حولها
  if (updateFields.latitude) updateFields.latitude = Number(updateFields.latitude);
  if (updateFields.longitude) updateFields.longitude = Number(updateFields.longitude);
  if (updateFields.is_approved !== undefined) updateFields.is_approved = (updateFields.is_approved === 'true' || updateFields.is_approved === true);
  const { data: updatedAgency, error } = await supabase
    .from('agencies')
    .update(updateFields)
    .eq('id', agencyId)
    .select('*')
    .single();
  if (error) return res.status(400).json({ error: error.message });

  // تحديث المطارات المرتبطة فقط إذا تم إرسالها بشكل صريح
  if (airportsRaw !== undefined) {
    let airportsToUpdate = [];
    try {
      airportsToUpdate = Array.isArray(airportsRaw) ? airportsRaw : JSON.parse(airportsRaw);
    } catch (e) {
      airportsToUpdate = [];
    }
    console.log('معرفات المطارات المستلمة:', airportsToUpdate);
    // تحقق من أن جميع المعرفات رقمية وصحيحة
    if (!airportsToUpdate.length || airportsToUpdate.some(id => isNaN(Number(id)))) {
      return res.status(400).json({ error: 'يرجى اختيار مطار واحد على الأقل بشكل صحيح' });
    }
    // حذف المطارات القديمة
    await supabase.from('agency_airports').delete().eq('agency_id', agencyId);
    // تحقق من وجود كل مطار قبل الإدراج
    for (const airport_id of airportsToUpdate) {
      // تحقق أن المطار موجود فعلاً
      const { data: airportExists, error: airportError } = await supabase
        .from('airports')
        .select('id')
        .eq('id', Number(airport_id))
        .single();
      if (airportError || !airportExists) {
        return res.status(400).json({ error: `المطار ذو المعرف ${airport_id} غير موجود` });
      }
      await supabase.from('agency_airports').insert({ agency_id: agencyId, airport_id: Number(airport_id) });
    }
  }
  // جلب المطارات المرتبطة بعد التحديث
  let airportsArr = [];
  let airportIdsArr = [];
  try {
    const { data: airportsData, error: airportsError } = await supabase
      .from('agency_airports')
      .select('airport_id,airports(id,code,name)')
      .eq('agency_id', agencyId);
    if (!airportsError && Array.isArray(airportsData)) {
      // إزالة التكرار حسب معرف المطار
      const uniqueAirports = {};
      airportsData.forEach(a => {
        if (a.airports && a.airports.id) {
          uniqueAirports[a.airports.id] = a.airports;
        }
      });
      airportsArr = Object.values(uniqueAirports);
      airportIdsArr = [...new Set(airportsData.map(a => a.airport_id))];
    }
  } catch (e) {
    airportsArr = [];
    airportIdsArr = [];
  }
  res.json({ ...updatedAgency, airports: airportsArr, airport_ids: airportIdsArr });
});

module.exports = router;
