const express = require('express');
const router = express.Router();
const supabase = require('../../supabaseClient');

// إذا لم يكن لديك verifyToken، علق السطر التالي أو أنشئ ملفاً وهمياً
// const verifyToken = require('../admin/middlewares/verifyToken');

// فقط admin أو sub_admin يمكنهم الوصول (أضف الميدلوير لاحقاً)
// router.get('/airlines', verifyToken(['admin', 'sub_admin']), async (req, res) => {
router.get('/all', async (req, res) => {
    try {
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
