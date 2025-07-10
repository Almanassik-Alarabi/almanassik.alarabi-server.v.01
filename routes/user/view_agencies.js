const express = require('express');
const router = express.Router();
const supabase = require('../../supabaseClient');

// جلب قائمة الوكالات المعتمدة فقط بدون بيانات الاتصال
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('agencies')
    .select('id, name, wilaya, license_number, logo_url, background_url, location_name, latitude, longitude, is_approved, created_at')
    .eq('is_approved', true);

  if (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
  res.json({ status: 'ok', agencies: data });
});

// جلب قائمة الوكالات المعتمدة فقط (مسار /agencies)
router.get('/agencies', async (req, res) => {
  const { data, error } = await supabase
    .from('agencies')
    .select('id, name, wilaya, license_number, logo_url, background_url, location_name, latitude, longitude, is_approved, created_at')
    .eq('is_approved', true);

  if (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
  res.json({ status: 'ok', agencies: data });
});

// جلب العروض النشطة لوكالة معتمدة فقط (departure_date في المستقبل)
router.get('/:agencyId/active-offers', async (req, res) => {
  const { agencyId } = req.params;
  const today = new Date().toISOString().split('T')[0];

  // التأكد من أن الوكالة معتمدة
  const { data: agency, error: agencyError } = await supabase
    .from('agencies')
    .select('id')
    .eq('id', agencyId)
    .eq('is_approved', true)
    .single();

  if (agencyError || !agency) {
    return res.status(404).json({ status: 'error', error: 'Agency not found or not approved' });
  }

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

// جلب الوكالات المعتمدة التي لديها عروض فقط مع مطارات الإقلاع الخاصة بها
router.get('/with-offers-and-airports', async (req, res) => {
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
    `)
    .eq('is_approved', true);

  if (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }

  const agencies = (data || []).map(agency => {
    const airports = (agency.agency_airports || [])
      .map(a => a.airports)
      .filter(Boolean);
    return { ...agency, airports };
  });

  res.json({ status: 'ok', agencies });
});

module.exports = router;
