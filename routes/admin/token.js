const express = require('express');
const router = express.Router();

// استخدم نفس دالة getSupabase من ملفات الراوتر الأخرى
function getSupabase(req) {
  return (req && req.supabase) ? req.supabase : require('../../supabaseAdmin');
}

/**
 * Endpoint: POST /refresh-token
 * Body: { token: "<current_token>" }
 * Returns: { access_token, refresh_token, user }
 */
router.post('/refresh-token', async (req, res) => {
  const supabase = getSupabase(req);
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'يرجى إرسال التوكن الحالي.' });
  }
  // جرب تجديد التوكن باستخدام Supabase
  try {
    // Supabase JS SDK لا يدعم مباشرة refresh من access token فقط، بل يحتاج refresh_token
    // لذلك يجب أن يرسل الفرونت refresh_token وليس access_token فقط
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'يرجى إرسال refresh_token.' });
    }
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) {
      return res.status(401).json({ error: 'فشل في تجديد التوكن: ' + error.message });
    }
    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'خطأ غير متوقع.' });
  }
});

module.exports = router;
