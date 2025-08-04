const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const supabase = require('../../../supabaseClient');

// جلب كل عروض الوكالة
router.get('/', async (req, res) => {
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
    // إذا تم تمرير id، جلب تفاصيل عرض واحد مع فروع الوكالة
    if (req.query.id) {
      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .select('*')
        .eq('id', req.query.id)
        .single();
      if (offerError || !offer) return res.status(404).json({ error: 'العرض غير موجود.' });

      // جلب الفروع المنسوبة لهذا العرض من branch_offers
      const { data: branchLinks, error: branchLinksError } = await supabase
        .from('branch_offers')
        .select('branch_id')
        .eq('offer_id', req.query.id);
      if (branchLinksError) return res.status(500).json({ error: branchLinksError.message });

      let assignedBranches = [];
      if (branchLinks && branchLinks.length > 0) {
        // جلب بيانات الفروع المنسوبة فقط
        const branchIds = branchLinks.map(b => b.branch_id);
        const { data: branches, error: branchesError } = await supabase
          .from('agency_branches')
          .select('id, name, wilaya, location_name, manager_phone')
          .in('id', branchIds);
        if (branchesError) return res.status(500).json({ error: branchesError.message });
        assignedBranches = branches;
      }
      // إذا لم يكن منسوب لأي فرع، اعتبره منسوب للوكالة الأم فقط
      if (!assignedBranches || assignedBranches.length === 0) {
        assignedBranches = [{ id: 'main', name: 'الوكالة الأم', city: '' }];
      }
      return res.json({ offers: offer, branches: assignedBranches });
    }
    // جلب كل العروض للوكالة
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('*')
      .eq('agency_id', agency_id);
    if (offersError) return res.status(500).json({ error: offersError.message });
    res.json({ offers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// إضافة عرض جديد للوكالة
router.post('/', upload.fields([
  { name: 'main_image', maxCount: 1 },
  { name: 'hotel_images', maxCount: 10 }
]), async (req, res) => {
  try {
    // تحقق من التوكن
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

    // رفع الصور إلى Cloudinary
    let mainImageUrl = '';
    if (req.files['main_image'] && req.files['main_image'][0]) {
      const mainImage = req.files['main_image'][0];
      try {
        await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({ resource_type: 'image', folder: 'umrah/offers/main' }, (error, result) => {
            if (error) return reject(error);
            mainImageUrl = result.secure_url;
            resolve();
          });
          stream.end(mainImage.buffer);
        });
      } catch (error) {
        return res.status(500).json({ error: 'فشل رفع الصورة الرئيسية: ' + (error.message || error) });
      }
    }

    let hotelImagesUrls = [];
    if (req.files['hotel_images']) {
      for (const img of req.files['hotel_images']) {
        await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({ resource_type: 'image', folder: 'umrah/offers/hotel' }, (error, result) => {
            if (error) reject(error);
            hotelImagesUrls.push(result.secure_url);
            resolve();
          });
          stream.end(img.buffer);
        });
      }
    }

    // تجهيز البيانات
    const offerData = {
      title: req.body.title,
      agency_id,
      airline_id: req.body.airline_id || null,
      flight_type: req.body.flight_type,
      departure_date: req.body.departure_date,
      return_date: req.body.return_date,
      duration_days: req.body.duration_days,
      hotel_name: req.body.hotel_name,
      hotel_distance: req.body.hotel_distance,
      hotel_images: hotelImagesUrls,
      services: req.body.services,
      description: req.body.description,
      entry: req.body.entry,
      exit: req.body.exit,
      price_double: req.body.price_double,
      price_triple: req.body.price_triple,
      price_quad: req.body.price_quad,
      price_quint: req.body.price_quint,
      main_image: mainImageUrl,
      created_at: new Date().toISOString(),
    };

    // إضافة العرض
    const { data, error } = await supabase.from('offers').insert([offerData]).select();
    if (error) return res.status(500).json({ error: error.message });
    const offer = data[0];

    // إضافة الفروع المرتبطة بالعرض
    let branchIds = [];
    if (req.body.branch_ids) {
      // branch_ids يمكن أن تكون مصفوفة أو نص مفصول بفواصل
      if (Array.isArray(req.body.branch_ids)) {
        branchIds = req.body.branch_ids;
      } else if (typeof req.body.branch_ids === 'string') {
        branchIds = req.body.branch_ids.split(',').map(id => id.trim());
      }
    }
    // إذا لم يتم إرسال فروع، اعتبره منسوب للوكالة الأم فقط
    if (branchIds.length === 0) {
      branchIds = ['main'];
    }
    // إذا كان 'main' فقط لا تضف لسجل branch_offers
    if (!branchIds.includes('main')) {
      const branchOffers = branchIds.map(branch_id => ({ branch_id, offer_id: offer.id }));
      if (branchOffers.length > 0) {
        const { error: branchOfferError } = await supabase.from('branch_offers').insert(branchOffers);
        if (branchOfferError) return res.status(500).json({ error: 'فشل ربط الفروع بالعرض: ' + branchOfferError.message });
      }
    }
    // جلب الفروع المنسوبة لهذا العرض من branch_offers
    const { data: branchLinks, error: branchLinksError } = await supabase
      .from('branch_offers')
      .select('branch_id')
      .eq('offer_id', offer.id);
    if (branchLinksError) return res.status(500).json({ error: branchLinksError.message });

    let assignedBranches = [];
    if (branchLinks && branchLinks.length > 0) {
      // جلب بيانات الفروع المنسوبة فقط
      const branchIds = branchLinks.map(b => b.branch_id);
      const { data: branches, error: branchesError } = await supabase
        .from('agency_branches')
        .select('id, name, wilaya, location_name, manager_phone')
        .in('id', branchIds);
      if (branchesError) return res.status(500).json({ error: branchesError.message });
      assignedBranches = branches;
    }
    // إذا لم يكن منسوب لأي فرع، اعتبره منسوب للوكالة الأم فقط
    if (!assignedBranches || assignedBranches.length === 0) {
      assignedBranches = [{ id: 'main', name: 'الوكالة الأم', city: '' }];
    }
    res.status(201).json({ offer, branches: assignedBranches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// تعديل عرض وكالة
router.put('/:id', upload.fields([
  { name: 'main_image', maxCount: 1 },
  { name: 'hotel_images', maxCount: 10 }
]), async (req, res) => {
  try {
    // تحقق من التوكن
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

    // جلب العرض الحالي
    const { data: currentOffer, error: offerError } = await supabase.from('offers').select('*').eq('id', req.params.id).single();
    if (offerError || !currentOffer) return res.status(404).json({ error: 'العرض غير موجود.' });
    if (currentOffer.agency_id !== agency_id) return res.status(403).json({ error: 'غير مصرح.' });

    // رفع الصور الجديدة إذا وجدت
    let mainImageUrl = currentOffer.main_image;
    if (req.files['main_image'] && req.files['main_image'][0]) {
      await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ resource_type: 'image', folder: 'umrah/offers/main' }, (error, result) => {
          if (error) reject(error);
          mainImageUrl = result.secure_url;
          resolve();
        });
        stream.end(req.files['main_image'][0].buffer);
      });
    }

    let hotelImagesUrls = currentOffer.hotel_images || [];
    if (req.files['hotel_images']) {
      hotelImagesUrls = [];
      for (const img of req.files['hotel_images']) {
        await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({ resource_type: 'image', folder: 'umrah/offers/hotel' }, (error, result) => {
            if (error) reject(error);
            hotelImagesUrls.push(result.secure_url);
            resolve();
          });
          stream.end(img.buffer);
        });
      }
    }

    // تجهيز البيانات
    const offerData = {
      title: req.body.title || currentOffer.title,
      airline_id: req.body.airline_id || currentOffer.airline_id,
      flight_type: req.body.flight_type || currentOffer.flight_type,
      departure_date: req.body.departure_date || currentOffer.departure_date,
      return_date: req.body.return_date || currentOffer.return_date,
      duration_days: req.body.duration_days || currentOffer.duration_days,
      hotel_name: req.body.hotel_name || currentOffer.hotel_name,
      hotel_distance: req.body.hotel_distance || currentOffer.hotel_distance,
      hotel_images: hotelImagesUrls,
      services: req.body.services || currentOffer.services,
      description: req.body.description || currentOffer.description,
      entry: req.body.entry || currentOffer.entry,
      exit: req.body.exit || currentOffer.exit,
      price_double: req.body.price_double || currentOffer.price_double,
      price_triple: req.body.price_triple || currentOffer.price_triple,
      price_quad: req.body.price_quad || currentOffer.price_quad,
      price_quint: req.body.price_quint || currentOffer.price_quint,
      main_image: mainImageUrl,
      updated_at: new Date().toISOString(),
    };

    // تحديث العرض
    const { data, error } = await supabase.from('offers').update(offerData).eq('id', req.params.id).select();
    if (error) return res.status(500).json({ error: error.message });
    const offer = data[0];

    // حذف جميع الفروع المرتبطة بالعرض
    await supabase.from('branch_offers').delete().eq('offer_id', req.params.id);

    // إضافة الفروع الجديدة المرتبطة بالعرض
    let branchIds = [];
    if (req.body.branch_ids) {
      if (Array.isArray(req.body.branch_ids)) {
        branchIds = req.body.branch_ids;
      } else if (typeof req.body.branch_ids === 'string') {
        branchIds = req.body.branch_ids.split(',').map(id => id.trim());
      }
    }
    if (branchIds.length === 0) {
      branchIds = ['main'];
    }
    // تعديل المنطق ليضيف الفروع الحقيقية فقط حتى لو أرسلت "main"
    const realBranchIds = branchIds.filter(id => id !== 'main');
    if (realBranchIds.length > 0) {
      const branchOffers = realBranchIds.map(branch_id => ({ branch_id, offer_id: offer.id }));
      if (branchOffers.length > 0) {
        const { error: branchOfferError } = await supabase.from('branch_offers').insert(branchOffers);
        if (branchOfferError) return res.status(500).json({ error: 'فشل ربط الفروع بالعرض: ' + branchOfferError.message });
      }
    }
    // جلب الفروع المنسوبة لهذا العرض من branch_offers
    const { data: branchLinks, error: branchLinksError } = await supabase
      .from('branch_offers')
      .select('branch_id')
      .eq('offer_id', req.params.id);
    if (branchLinksError) return res.status(500).json({ error: branchLinksError.message });

    let assignedBranches = [];
    if (branchLinks && branchLinks.length > 0) {
      // جلب بيانات الفروع المنسوبة فقط
      const branchIds = branchLinks.map(b => b.branch_id);
      const { data: branches, error: branchesError } = await supabase
        .from('agency_branches')
        .select('id, name, wilaya, location_name, manager_phone')
        .in('id', branchIds);
      if (branchesError) return res.status(500).json({ error: branchesError.message });
      assignedBranches = branches;
    }
    // إذا لم يكن منسوب لأي فرع، اعتبره منسوب للوكالة الأم فقط
    if (!assignedBranches || assignedBranches.length === 0) {
      assignedBranches = [{ id: 'main', name: 'الوكالة الأم', city: '' }];
    }
    res.json({ offer, branches: assignedBranches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// حذف عرض وكالة
router.delete('/:id', async (req, res) => {
  try {
    // تحقق من التوكن
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

    // جلب العرض الحالي
    const { data: currentOffer, error: offerError } = await supabase.from('offers').select('*').eq('id', req.params.id).single();
    if (offerError || !currentOffer) return res.status(404).json({ error: 'العرض غير موجود.' });
    if (currentOffer.agency_id !== agency_id) return res.status(403).json({ error: 'غير مصرح.' });

    // جلب الحجوزات المرتبطة بالعرض
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('offer_id', req.params.id);
    if (bookingsError) return res.status(500).json({ error: 'خطأ في جلب الحجوزات.' });

    // التحقق من تاريخ العرض
    const now = new Date();
    const offerEndDate = new Date(currentOffer.return_date);

    // إذا كان هناك حجوزات نشطة (status != "ملغي") ولم يفت أوان العرض، امنع الحذف
    const hasActiveBookings = Array.isArray(bookings) && bookings.some(b => b.status !== 'ملغي' && offerEndDate >= now);
    if (hasActiveBookings) {
      return res.status(403).json({ error: 'لا يمكن حذف العرض: يوجد حجوزات نشطة ولم يفت أوانه.' });
    }

    // إذا لم يكن هناك حجوزات أو العرض منتهي، يسمح بالحذف
    // حذف جميع الحجوزات المرتبطة بالعرض أولاً
    const { error: bookingsDeleteError } = await supabase.from('bookings').delete().eq('offer_id', req.params.id);
    if (bookingsDeleteError) return res.status(500).json({ error: 'فشل حذف الحجوزات المرتبطة بالعرض.' });
    // ثم حذف العرض
    const { error } = await supabase.from('offers').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'تم حذف العرض وجميع الحجوزات المرتبطة به بنجاح.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
