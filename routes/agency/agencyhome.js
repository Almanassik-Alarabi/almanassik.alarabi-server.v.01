const express = require('express');
const router = express.Router();

// جلب قائمة المطارات (بقيت هنا كمثال فقط)
const supabase = require('../../supabaseClient');
router.get('/airports', async (req, res) => {
  try {
    const { data, error } = await supabase.from('airports').select('id, code, name');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// auth
router.use('/', require('./modules/auth'));
// offers
router.use('/offers', require('./modules/offers'));
// stats
router.use('/stats', require('./modules/stats'));
// bookings
router.use('/bookings', require('./modules/bookings'));
// branches
router.use('/branches', require('./modules/branches'));
// الملف الشخصي للوكالة مع تحقق التوكن
router.use('/profile', require('../../middlewares/verifyToken'), require('./modules/profile'));

module.exports = router;
