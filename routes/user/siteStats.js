const express = require('express');
const router = express.Router();

// استخدم req.supabase إذا كان موجودًا (تم تمريره من server.js)، وإلا fallback للقديم (للاستدعاءات المباشرة)
function getSupabase(req) {
  return (req && req.supabase) ? req.supabase : require('../../supabaseAdmin');
}

// زيادة عداد زيارات الشهر الحالي
router.post('/visit', async (req, res) => {
  const supabase = getSupabase(req);
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

// زيادة عداد مشاهدات عرض معين
router.post('/offer-view', async (req, res) => {
  const supabase = getSupabase(req);
  const { offer_id } = req.body;
  if (!offer_id) {
    return res.status(400).json({ error: 'offer_id is required' });
  }
  // جلب السطر الحالي
  const { data: existing, error: fetchError } = await supabase
    .from('offer_view_counts')
    .select('offer_id, view_count')
    .eq('offer_id', offer_id)
    .single();
  if (fetchError && fetchError.code !== 'PGRST116') {
    return res.status(500).json({ error: fetchError.message });
  }
  if (existing && existing.offer_id) {
    // تحديث العداد
    const { error: updateError } = await supabase
      .from('offer_view_counts')
      .update({ view_count: (existing.view_count || 0) + 1 })
      .eq('offer_id', offer_id);
    if (updateError) return res.status(500).json({ error: updateError.message });
  } else {
    // إضافة عرض جديد
    const { error: insertError } = await supabase
      .from('offer_view_counts')
      .insert([{ offer_id, view_count: 1 }]);
    if (insertError) return res.status(500).json({ error: insertError.message });
  }
  res.json({ success: true });
});

module.exports = router;
