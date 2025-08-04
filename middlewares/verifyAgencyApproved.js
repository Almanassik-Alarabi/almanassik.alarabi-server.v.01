// middleware: يتحقق أن الوكالة مقبولة (is_approved)
const supabase = require('../supabaseClient');

module.exports = async function verifyAgencyApproved(req, res, next) {
  try {
    // جلب user id من التوكن أو body أو params
    let agencyId = null;
    if (req.user && req.user.id) {
      agencyId = req.user.id;
    } else if (req.body && req.body.agency_id) {
      agencyId = req.body.agency_id;
    } else if (req.params && req.params.agency_id) {
      agencyId = req.params.agency_id;
    } else if (req.query && req.query.agency_id) {
      agencyId = req.query.agency_id;
    }
    if (!agencyId) {
      return res.status(403).json({ error: 'لا يمكن تحديد الوكالة' });
    }
    const { data: agency, error } = await supabase
      .from('agencies')
      .select('is_approved')
      .eq('id', agencyId)
      .single();
    if (error || !agency) {
      return res.status(403).json({ error: 'الوكالة غير موجودة' });
    }
    if (!agency.is_approved) {
      return res.status(403).json({ error: 'لم يتم قبول الوكالة بعد من طرف الإدارة' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'خطأ في التحقق من حالة الوكالة' });
  }
};
