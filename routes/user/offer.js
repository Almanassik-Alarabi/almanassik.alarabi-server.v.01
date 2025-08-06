const express = require('express');
const router = express.Router();
// استخدم نفس عميل supabase الموجود في المشروع
const supabase = require('../../supabaseClient');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cloudinary = require('cloudinary').v2;
const { sendAgencyBookingNotification } = require('../../utils/email');

// جلب جميع العروض
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        id,
        agency_id,
        title,
        main_image,
        services,
        airline_id,
        flight_type,
        departure_date,
        return_date,
        duration_days,
        hotel_name,
        hotel_distance,
        hotel_images,
        description,
        price_double,
        price_triple,
        price_quad,
        price_quint,
        created_at,
        entry,
        exit,
        is_golden,
        agencies(name, logo_url, latitude, longitude ,location_name,wilaya)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// جلب العروض الذهبية فقط
router.get('/golden', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        id,
        agency_id,
        title,
        main_image,
        services,
        airline_id,
        flight_type,
        departure_date,
        return_date,
        duration_days,
        hotel_name,
        hotel_distance,
        hotel_images,
        description,
        price_double,
        price_triple,
        price_quad,
        price_quint,
        created_at,
        entry,
        exit,
        is_golden,
        agencies(name, logo_url, latitude, longitude ,location_name,wilaya)
      `)
      .eq('is_golden', true)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// جلب تفاصيل عرض واحد حسب id
router.get('/:id', async (req, res) => {
  const offerId = req.params.id;
  try {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        id,
        agency_id,
        title,
        main_image,
        services,
        airline_id,
        flight_type,
        departure_date,
        return_date,
        duration_days,
        hotel_name,
        hotel_distance,
        hotel_images,
        description,
        price_double,
        price_triple,
        price_quad,
        price_quint,
        created_at,
        entry,
        exit,
        is_golden,
        agencies(name, logo_url, latitude, longitude)
      `)
      .eq('id', offerId)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (!data) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
const upload = multer({ storage: multer.memoryStorage() });
// إعداد Cloudinary باستخدام متغيرات البيئة
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// إضافة حجز جديد مع رفع صورة الجواز إلى Cloudinary
router.post('/bookings', upload.single('passport_image'), async (req, res) => {
  const { offer_id, full_name, phone, room_type, discount_applied } = req.body;
  if (!offer_id || !full_name || !phone || !room_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let passport_image_url = "img";

  // رفع الصورة إلى Cloudinary إذا وجدت
  if (req.file) {
    console.log('ملف الجواز المستلم:', req.file); // طباعة الملف المستلم
    try {
      passport_image_url = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'image' },
          (error, result) => {
            if (error) {
              console.error('خطأ رفع الصورة إلى Cloudinary:', error); // طباعة الخطأ
              return reject(error);
            }
            console.log('نتيجة رفع Cloudinary:', result); // طباعة نتيجة الرفع
            resolve(result.secure_url);
          }
        );
        stream.end(req.file.buffer);
      });
    } catch (err) {
      return res.status(500).json({ error: 'Passport image upload failed', details: err.message });
    }
  }

  // توليد كود تتبع عشوائي
  const tracking_code = Math.random().toString(36).substring(2, 10).toUpperCase();
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          offer_id,
          full_name,
          phone,
          passport_image_url,
          room_type,
          tracking_code,
          status: 'قيد الانتظار',
          discount_applied
        }
      ])
      .select();
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // جلب بيانات العرض مع الوكالة
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .select('id, title, agency_id, departure_date, agencies(name)')
      .eq('id', offer_id)
      .single();

    if (!offerError && offerData && offerData.agencies && offerData.agency_id) {
      // جلب البريد الإلكتروني للوكالة من جدول auth.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', offerData.agency_id)
        .single();

      if (!userError && userData && userData.email) {
        const agencyEmail = userData.email;
        const offerInfo = {
          title: offerData.title,
          agency_name: offerData.agencies.name,
          booking_url: `${process.env.AGENCY_DASHBOARD_URL || 'https://www.Almanassik.alarabi.com/agency'}/bookings/${data[0].id}`
        };
        const bookingInfo = {
          trip_date: offerData.departure_date,
          room_type,
          original_price: req.body.original_price || '',
          final_price: req.body.final_price || ''
        };
        // إرسال البريد للوكالة
        sendAgencyBookingNotification(agencyEmail, bookingInfo, offerInfo).catch(console.error);
      }
    }

    res.status(201).json({
      success: true,
      message: "تم إنشاء الحجز بنجاح",
      booking: {
        id: data[0].id,
        offer_id: data[0].offer_id,
        full_name: data[0].full_name,
        phone: data[0].phone,
        room_type: data[0].room_type,
        discount_applied: data[0].discount_applied,
        status: data[0].status,
        passport_image_url: data[0].passport_image_url,
        tracking_code: data[0].tracking_code,
        created_at: data[0].created_at
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// زيادة عدد مشاهدات العرض
router.post('/offers/:id/view', async (req, res) => {
  const offerId = req.params.id;
  try {
    // زيادة view_count أو إنشاؤه إذا لم يوجد
    const { data, error } = await supabase
      .from('offer_view_counts')
      .upsert([
        { offer_id: offerId, view_count: 1 }
      ], { onConflict: ['offer_id'], ignoreDuplicates: false })
      .select();
    if (error) {
      // إذا كان خطأ بسبب وجود السطر، قم بزيادة العدد
      await supabase.rpc('increment_offer_view', { offerid: offerId });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// زيادة عدد زيارات الموقع (الشهرية)
router.post('/site/visit', async (req, res) => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}`;
  try {
    // زيادة visit_count أو إنشاؤه إذا لم يوجد
    const { data, error } = await supabase
      .from('site_stats')
      .upsert([
        { stat_month: month, visit_count: 1 }
      ], { onConflict: ['stat_month'], ignoreDuplicates: false })
      .select();
    if (error) {
      // إذا كان خطأ بسبب وجود السطر، قم بزيادة العدد
      await supabase.rpc('increment_site_visit', { statmonth: month });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
