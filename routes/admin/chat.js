
const express = require('express');
const router = express.Router();

// نقطة اختبار (GET /api/chat)
router.get('/', (req, res) => {
  res.json({ message: 'Chat route works!' });
});

// يمكنك إضافة نقاط نهاية (endpoints) أخرى هنا لاحقاً

module.exports = router;
