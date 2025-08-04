const express = require('express');
const router = express.Router();

// استخدم نفس دالة getSupabase من ملفات الراوتر الأخرى
function getSupabase(req) {
  return (req && req.supabase) ? req.supabase : require('../../supabaseClient');
}

/**
 * Endpoint: POST /refresh-token
 * Body: { token: "<current_token>", refresh_token: "<refresh_token>" }
 * Returns: { access_token, refresh_token, user }
 */
router.post('/refresh-token', async (req, res) => {
  const supabase = getSupabase(req);
  const { token, refresh_token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'يرجى إرسال التوكن الحالي.' });
  }
  if (!refresh_token) {
    return res.status(400).json({ error: 'يرجى إرسال refresh_token.' });
  }
  try {
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
