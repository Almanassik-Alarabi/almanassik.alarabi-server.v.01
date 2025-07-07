
const express = require('express');
const router = express.Router();
// استخدم نفس عميل supabase الموجود في المشروع
const supabase = require('../../supabaseClient');

// ...existing code...

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
        agencies(name)
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
        agencies(name)
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

module.exports = router;
