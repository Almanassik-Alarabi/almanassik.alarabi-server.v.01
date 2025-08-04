const express = require('express');
const router = express.Router();
const supabase = require('../../../supabaseClient');


// حماية endpoint stats بالتوكن
router.get('/:agency_id', async (req, res) => {
  // تحقق من وجود Authorization header
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى إرسال رمز التوثيق (توكن).' });
  }
  const token = authHeader.split(' ')[1];
  // تحقق من صحة التوكن
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData || !userData.user) {
    return res.status(401).json({ error: 'توكن غير صالح أو منتهي.' });
  }
  // تحقق أن المستخدم هو نفس الوكالة المطلوبة
  const agency_id = req.params.agency_id;
  if (userData.user.id !== agency_id) {
    return res.status(403).json({ error: 'غير مصرح لك بالوصول لهذه البيانات.' });
  }
  try {
    // جلب كل العروض الخاصة بالوكالة مع الحقول المطلوبة
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('id, title, main_image, services, airline_id, flight_type, departure_date, return_date, duration_days, hotel_name, hotel_distance, hotel_images, description, price_double, price_triple, price_quad, price_quint, created_at, entry, exit, is_golden')
      .eq('agency_id', agency_id);
    if (offersError) return res.status(500).json({ error: offersError.message });
    const offerIds = offers?.map(o => o.id) || [];

    // جلب كل الحجوزات على عروض الوكالة مع الحقول المطلوبة
    let bookings = [];
    if (offerIds.length > 0) {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, offer_id, full_name, phone, passport_image_url, room_type, status, tracking_code, created_at, discount_applied')
        .in('offer_id', offerIds);
      if (bookingsError) return res.status(500).json({ error: bookingsError.message });
      bookings = bookingsData || [];
    }

    // عدد زوار الموقع مع تواريخهم (site_stats)
    const { data: siteStats, error: siteStatsError } = await supabase
      .from('site_stats')
      .select('stat_month, visit_count, created_at');
    if (siteStatsError) return res.status(500).json({ error: siteStatsError.message });

    // عدد مشاهدات جميع عروض الوكالة (مجموع view_count من offer_view_counts)
    let offersViews = 0;
    if (offerIds.length > 0) {
      const { data: viewsData, error: viewsError } = await supabase
        .from('offer_view_counts')
        .select('view_count')
        .in('offer_id', offerIds);
      if (viewsError) return res.status(500).json({ error: viewsError.message });
      offersViews = viewsData?.reduce((sum, v) => sum + (v.view_count || 0), 0) || 0;
    }

    res.json({
      offersCount: offers.length,
      bookingsCount: bookings.length,
      offers,
      bookings,
      siteStats,
      offersViews
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
