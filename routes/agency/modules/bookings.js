const express = require('express');
const router = express.Router();
const supabase = require('../../../supabaseClient');

// جلب جميع تفاصيل طلب عمرة
router.get('/:id/details', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى إرسال رمز التوثيق (توكن).' });
  }
  const token = authHeader.split(' ')[1];
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData || !userData.user) {
    return res.status(401).json({ error: 'توكن غير صالح أو منتهي.' });
  }
  const agency_id = userData.user.id;
  const booking_id = req.params.id;
  try {
    // جلب الحجز مع جميع التفاصيل
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, offers(*), agencies:offers(agency_id, agencies(*))')
      .eq('id', booking_id)
      .single();
    if (bookingError || !booking) {
      return res.status(404).json({ error: 'الحجز غير موجود.' });
    }
    // تحقق أن العرض يخص الوكالة
    if (booking.offers?.agency_id !== agency_id) {
      return res.status(403).json({ error: 'غير مصرح لك بعرض تفاصيل هذا الحجز.' });
    }
    res.json({ status: 'ok', details: booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// قبول حجز وتغيير حالته إلى "مقبول"
router.patch('/:id/accept', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى إرسال رمز التوثيق (توكن).' });
  }
  const token = authHeader.split(' ')[1];
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData || !userData.user) {
    return res.status(401).json({ error: 'توكن غير صالح أو منتهي.' });
  }
  const agency_id = userData.user.id;
  const booking_id = req.params.id;
  try {
    // جلب الحجز وتحقق أنه يخص عرضاً للوكالة
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, offer_id, status')
      .eq('id', booking_id)
      .single();
    if (bookingError || !booking) {
      return res.status(404).json({ error: 'الحجز غير موجود.' });
    }
    // تحقق أن العرض يخص الوكالة
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('id, agency_id')
      .eq('id', booking.offer_id)
      .eq('agency_id', agency_id)
      .single();
    if (offerError || !offer) {
      return res.status(403).json({ error: 'غير مصرح لك بتغيير حالة هذا الحجز.' });
    }
    // فقط إذا كانت الحالة "بانتظار موافقة الوكالة"
    if (booking.status !== 'بانتظار موافقة الوكالة') {
      return res.status(400).json({ error: 'لا يمكن قبول هذا الحجز إلا إذا كان بانتظار موافقة الوكالة.' });
    }
    // تحديث الحالة إلى "مقبول"
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'مقبول' })
      .eq('id', booking_id);
    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }
    // جلب تفاصيل الحجز الكاملة بعد التحديث
    const { data: updatedBooking, error: updatedError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();
    if (updatedError || !updatedBooking) {
      return res.status(500).json({ error: 'تم قبول الحجز لكن تعذر جلب التفاصيل.' });
    }
    res.json({ status: 'ok', booking: updatedBooking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// جلب حجوزات عروض وكالة معينة (مع تفاصيل حسب حالة القبول)
// جلب جميع تفاصيل طلب عمرة
router.get('/:id/details', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى إرسال رمز التوثيق (توكن).' });
  }
  const token = authHeader.split(' ')[1];
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData || !userData.user) {
    return res.status(401).json({ error: 'توكن غير صالح أو منتهي.' });
  }
  const agency_id = userData.user.id;
  const booking_id = req.params.id;
  try {
    // جلب الحجز مع جميع التفاصيل
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, offers(*), agencies:offers(agency_id, agencies(*))')
      .eq('id', booking_id)
      .single();
    if (bookingError || !booking) {
      return res.status(404).json({ error: 'الحجز غير موجود.' });
    }
    // تحقق أن العرض يخص الوكالة
    if (booking.offers?.agency_id !== agency_id) {
      return res.status(403).json({ error: 'غير مصرح لك بعرض تفاصيل هذا الحجز.' });
    }
    res.json({ status: 'ok', details: booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// جلب الطلبات بانتظار موافقة الوكالة (اسم العرض وتاريخ الطلب فقط)
router.get('/pending', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى إرسال رمز التوثيق (توكن).' });
  }
  const token = authHeader.split(' ')[1];
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData || !userData.user) {
    return res.status(401).json({ error: 'توكن غير صالح أو منتهي.' });
  }
  const agency_id = userData.user.id;
  try {
    // جلب عروض الوكالة
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('id, title')
      .eq('agency_id', agency_id);
    if (offersError) return res.status(500).json({ error: offersError.message });
    const offerIds = offers?.map(o => o.id) || [];
    if (offerIds.length === 0) return res.json({ bookings: [] });

    // جلب الحجوزات المرتبطة بهذه العروض وحالتها "بانتظار موافقة الوكالة"
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, offer_id, created_at')
      .in('offer_id', offerIds)
      .eq('status', 'بانتظار موافقة الوكالة');
    if (bookingsError) return res.status(500).json({ error: bookingsError.message });

    // تجهيز الرد: اسم العرض وتاريخ الطلب فقط
    const result = bookings.map(b => {
      const offer = offers.find(o => o.id === b.offer_id);
      return {
        id: b.id,
        offer_id: b.offer_id,
        offer_title: offer ? offer.title : '-',
        created_at: b.created_at
      };
    });
    res.json({ bookings: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// جلب الطلبات المقبولة (اسم المعتمر، رقم الهاتف، اسم العرض، تاريخ الطلب)
router.get('/accepted', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى إرسال رمز التوثيق (توكن).' });
  }
  const token = authHeader.split(' ')[1];
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData || !userData.user) {
    return res.status(401).json({ error: 'توكن غير صالح أو منتهي.' });
  }
  const agency_id = userData.user.id;
  try {
    // جلب عروض الوكالة
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('id, title')
      .eq('agency_id', agency_id);
    if (offersError) return res.status(500).json({ error: offersError.message });
    const offerIds = offers?.map(o => o.id) || [];
    if (offerIds.length === 0) return res.json({ bookings: [] });

    // جلب الحجوزات المرتبطة بهذه العروض وحالتها "مقبول"
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, offer_id, full_name, phone, created_at')
      .in('offer_id', offerIds)
      .eq('status', 'مقبول');
    if (bookingsError) return res.status(500).json({ error: bookingsError.message });

    // تجهيز الرد: اسم المعتمر، رقم الهاتف، اسم العرض، تاريخ الطلب
    const result = bookings.map(b => {
      const offer = offers.find(o => o.id === b.offer_id);
      return {
        id: b.id,
        offer_id: b.offer_id,
        offer_title: offer ? offer.title : '-',
        full_name: b.full_name,
        phone: b.phone,
        created_at: b.created_at
      };
    });
    res.json({ bookings: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// رفض (حذف) حجز إذا لم يكن مقبولاً
router.delete('/:id', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى إرسال رمز التوثيق (توكن).' });
  }
  const token = authHeader.split(' ')[1];
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData || !userData.user) {
    return res.status(401).json({ error: 'توكن غير صالح أو منتهي.' });
  }
  const agency_id = userData.user.id;
  const booking_id = req.params.id;
  try {
    // جلب الحجز وتحقق أنه يخص عرضاً للوكالة
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, offer_id, status')
      .eq('id', booking_id)
      .single();
    if (bookingError || !booking) {
      return res.status(404).json({ error: 'الحجز غير موجود.' });
    }
    // تحقق أن العرض يخص الوكالة
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('id, agency_id')
      .eq('id', booking.offer_id)
      .eq('agency_id', agency_id)
      .single();
    if (offerError || !offer) {
      return res.status(403).json({ error: 'غير مصرح لك بحذف هذا الحجز.' });
    }
    // إذا كان الحجز مقبولاً لا يمكن حذفه
    if (booking.status === 'مقبول') {
      return res.status(403).json({ error: 'لا يمكن حذف الحجز بعد قبوله.' });
    }
    // حذف الحجز
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', booking_id);
    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }
    res.json({ status: 'ok', message: 'تم رفض (حذف) الحجز بنجاح.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
