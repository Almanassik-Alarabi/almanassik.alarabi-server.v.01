const express = require('express');
const router = express.Router();

// استخدم req.supabase إذا كان موجودًا (تم تمريره من server.js)، وإلا fallback للقديم (للاستدعاءات المباشرة)
function getSupabase(req) {
  return (req && req.supabase) ? req.supabase : require('../../supabaseAdmin');
}

// إذا لم يكن لديك verifyToken، علق السطر التالي أو أنشئ ملفاً وهمياً
// const verifyToken = require('../admin/middlewares/verifyToken');

// فقط admin أو sub_admin يمكنهم الوصول (أضف الميدلوير لاحقاً)
// router.get('/airlines', verifyToken(['admin', 'sub_admin']), async (req, res) => {
router.get('/all', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { data, error } = await supabase
            .from('airlines')
            .select('id, name')
            .order('name', { ascending: true });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
