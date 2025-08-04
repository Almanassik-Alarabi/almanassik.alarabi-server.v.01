const express = require('express');
const router = express.Router();
const supabase = require('../../supabaseClient');

// جلب جميع شركات الطيران بدون الحاجة لتوكن
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('airlines').select('*').order('name', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ airlines: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
