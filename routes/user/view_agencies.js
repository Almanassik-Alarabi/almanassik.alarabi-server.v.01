const express = require('express');
const router = express.Router();
const supabase = require('../../supabaseClient');

// جلب قائمة الوكالات بدون بيانات الاتصال
router.get('/', async (req, res) => {
  // تحديد الأعمدة المطلوبة فقط (بدون الهاتف والبريد)
  const { data, error } = await supabase
    .from('agencies')
    .select('id, name, wilaya, license_number, logo_url, background_url, location_name, latitude, longitude, is_approved, created_at');

  if (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
  res.json({ status: 'ok', agencies: data });
});

// جلب قائمة الوكالات بدون بيانات الاتصال (مسار /agencies)
router.get('/agencies', async (req, res) => {
  const { data, error } = await supabase
    .from('agencies')
    .select('id, name, wilaya, license_number, logo_url, background_url, location_name, latitude, longitude, is_approved, created_at');

  if (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
  res.json({ status: 'ok', agencies: data });
});

// جلب العروض النشطة لوكالة معينة (departure_date في المستقبل)
router.get('/:agencyId/active-offers', async (req, res) => {
  const { agencyId } = req.params;
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('offers')
    .select('id, title, departure_date')
    .eq('agency_id', agencyId)
    .gte('departure_date', today)
    .order('departure_date', { ascending: true });

  if (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
  res.json({ status: 'ok', offers: data });
});

// جلب الوكالات التي لديها عروض فقط مع مطارات الإقلاع الخاصة بها
router.get('/with-offers-and-airports', async (req, res) => {
  // جلب الوكالات التي لديها عروض فقط
  const { data, error } = await supabase
    .from('agencies')
    .select(`
      id,
      name,
      wilaya,
      license_number,
      logo_url,
      background_url,
      location_name,
      latitude,
      longitude,
      is_approved,
      created_at,
      offers!inner(
        id,
        title,
        departure_date
      ),
      agency_airports(
        airport_id,
        airports(
          id,
          name,
          code,
          city
        )
      )
    `);

  if (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }

  // إعادة هيكلة المطارات لتكون مصفوفة مطارات واضحة لكل وكالة
  const agencies = (data || []).map(agency => {
    const airports = (agency.agency_airports || [])
      .map(a => a.airports)
      .filter(Boolean);
    return { ...agency, airports };
  });

  res.json({ status: 'ok', agencies });
});

module.exports = router;
