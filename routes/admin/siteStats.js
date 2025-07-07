const express = require('express');
const router = express.Router();
const supabase = require('../../supabaseClient');

// زيادة عداد زيارات الشهر الحالي
router.post('/visit', async (req, res) => {
  const now = new Date();
  const stat_month = now.toISOString().slice(0, 7); // yyyy-mm
  // جلب السطر الحالي
  const { data: existing, error: fetchError } = await supabase
    .from('site_stats')
    .select('id, visit_count')
    .eq('stat_month', stat_month)
    .single();
  if (fetchError && fetchError.code !== 'PGRST116') {
    return res.status(500).json({ error: fetchError.message });
  }
  if (existing && existing.id) {
    // تحديث العداد
    const { error: updateError } = await supabase
      .from('site_stats')
      .update({ visit_count: (existing.visit_count || 0) + 1 })
      .eq('id', existing.id);
    if (updateError) return res.status(500).json({ error: updateError.message });
  } else {
    // إضافة شهر جديد
    const { error: insertError } = await supabase
      .from('site_stats')
      .insert([{ stat_month, visit_count: 1 }]);
    if (insertError) return res.status(500).json({ error: insertError.message });
  }
  res.json({ success: true });
});

// جلب زيارات آخر 12 شهر
router.get('/monthly', async (req, res) => {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  const { data, error } = await supabase
    .from('site_stats')
    .select('stat_month, visit_count');
  if (error) return res.status(500).json({ error: error.message });
  const monthMap = {};
  (data || []).forEach(row => { monthMap[row.stat_month] = row.visit_count; });
  const counts = months.map(m => monthMap[m] || 0);
  res.json({ months, counts });
});

module.exports = router;
