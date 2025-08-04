const express = require('express');
const router = express.Router();

// استخدم req.supabase إذا كان موجوداً (تم تمريره من server.js)، وإلا fallback للقديم
function getSupabase(req) {
  return (req && req.supabase) ? req.supabase : require('../../supabaseAdmin');
}

// ميدلوير للتحقق من التوكن
async function verifyToken(req, res, next) {
  const supabase = getSupabase(req);
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى إرسال التوكن في الهيدر (Authorization: Bearer <token>)' });
  }
  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data || !data.user) {
    return res.status(401).json({ error: 'توكن غير صالح أو منتهي الصلاحية.' });
  }
  req.user = data.user;
  next();
}

router.use(verifyToken);

// حذف جميع المطارات المرتبطة بوكالة معينة
router.delete('/delete_by_agency/:agencyId', async (req, res) => {
  const supabase = getSupabase(req);
  const { agencyId } = req.params;
  try {
    // تحقق من وجود الوكالة أولاً (اختياري)
    const { data: agency, error: agencyError } = await supabase.from('agencies').select('id').eq('id', agencyId).single();
    if (agencyError || !agency) {
      return res.status(404).json({ error: 'الوكالة غير موجودة' });
    }
    // حذف جميع المطارات المرتبطة بالوكالة
    const { error: deleteError } = await supabase.from('agency_airports').delete().eq('agency_id', agencyId);
    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }
    res.json({ message: 'تم حذف جميع المطارات المرتبطة بالوكالة بنجاح.' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ غير متوقع', details: err.message });
  }
});

module.exports = router;
