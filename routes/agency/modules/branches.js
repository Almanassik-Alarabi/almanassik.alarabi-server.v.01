const express = require('express');
const router = express.Router();
const supabase = require('../../../supabaseClient');

// جلب كل فروع الوكالة
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
    // جلب جميع الفروع
    const { data: branches, error: branchesError } = await supabase
      .from('agency_branches')
      .select('*')
      .eq('agency_id', agency_id);
    if (branchesError) return res.status(500).json({ error: branchesError.message });

    // جلب جميع ربط الفروع بالمطارات
    const { data: branchAirports, error: branchAirportsError } = await supabase
      .from('agency_branches_airports')
      .select('agency_id, airport_id')
      .in('agency_id', branches.map(b => b.id));
    if (branchAirportsError) return res.status(500).json({ error: branchAirportsError.message });

    // بناء مصفوفة airport_ids لكل فرع
    const branchIdToAirports = {};
    branchAirports.forEach(rel => {
      if (!branchIdToAirports[rel.agency_id]) branchIdToAirports[rel.agency_id] = [];
      branchIdToAirports[rel.agency_id].push(rel.airport_id);
    });
    const branchesWithAirports = branches.map(b => ({
      ...b,
      airport_ids: branchIdToAirports[b.id] || []
    }));
    res.json({ branches: branchesWithAirports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// إضافة فرع جديد
router.post('/', async (req, res) => {
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
  const { email, password, wilaya, name, location_name, latitude, longitude, manager_phone, airport_ids } = req.body;
  if (!email || !password || !wilaya || !name || !latitude || !longitude || !manager_phone) {
    return res.status(400).json({ error: 'يرجى تعبئة جميع الحقول المطلوبة' });
  }
  try {
    // أولاً: إضافة الفرع
    const { data: branch, error: branchError } = await supabase
      .from('agency_branches')
      .insert({
        agency_id,
        email,
        password,
        wilaya,
        name,
        location_name,
        latitude: Number(latitude),
        longitude: Number(longitude),
        manager_phone
      })
      .select()
      .single();
    if (branchError) {
      return res.status(400).json({ error: branchError.message });
    }
    // ثانياً: ربط المطارات إذا تم إرسال airport_ids
    if (Array.isArray(airport_ids) && airport_ids.length > 0) {
      const airportsToInsert = airport_ids.map(airport_id => ({
        agency_id: branch.id,
        airport_id: Number(airport_id)
      }));
      const { error: airportsError } = await supabase
        .from('agency_branches_airports')
        .insert(airportsToInsert);
      if (airportsError) {
        return res.status(400).json({ error: 'تم إضافة الفرع لكن حدث خطأ في ربط المطارات: ' + airportsError.message });
      }
    }
    res.json({ status: 'ok', branch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// تعديل معلومات فرع
router.put('/:id', async (req, res) => {
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
  const branch_id = req.params.id;
  const fields = req.body;
  try {
    // تحقق أن الفرع يخص هذه الوكالة
    const { data: branch, error: branchError } = await supabase
      .from('agency_branches')
      .select('id')
      .eq('id', branch_id)
      .eq('agency_id', agency_id)
      .single();
    if (branchError || !branch) {
      return res.status(404).json({ error: 'الفرع غير موجود أو لا تملك صلاحية تعديله.' });
    }
    // تحديث بيانات الفرع (بدون airport_ids)
    const { airport_ids, ...fieldsToUpdate } = fields;
    // إذا أرسل name فقط أو location_name فقط أو كلاهما، أضفهما
    const updateObj = {};
    if (fieldsToUpdate.name !== undefined) updateObj.name = fieldsToUpdate.name;
    if (fieldsToUpdate.location_name !== undefined) updateObj.location_name = fieldsToUpdate.location_name;
    // باقي الحقول
    ['email','password','wilaya','latitude','longitude','manager_phone'].forEach(k => {
      if (fieldsToUpdate[k] !== undefined) updateObj[k] = fieldsToUpdate[k];
    });
    const { error: updateError } = await supabase
      .from('agency_branches')
      .update(updateObj)
      .eq('id', branch_id)
      .eq('agency_id', agency_id);
    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }
    // تحديث ربط المطارات إذا تم إرسال airport_ids
    if (Array.isArray(airport_ids)) {
      // حذف جميع الربط القديم
      await supabase
        .from('agency_branches_airports')
        .delete()
        .eq('agency_id', branch_id);
      // إضافة الربط الجديد
      if (airport_ids.length > 0) {
        const airportsToInsert = airport_ids.map(airport_id => ({
          agency_id: branch_id,
          airport_id: Number(airport_id)
        }));
        await supabase
          .from('agency_branches_airports')
          .insert(airportsToInsert);
      }
    }
    res.json({ status: 'ok', message: 'تم تحديث بيانات الفرع وربط المطارات بنجاح.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// حذف فرع
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
  const branch_id = req.params.id;
  try {
    // تحقق أن الفرع يخص هذه الوكالة
    const { data: branch, error: branchError } = await supabase
      .from('agency_branches')
      .select('id')
      .eq('id', branch_id)
      .eq('agency_id', agency_id)
      .single();
    if (branchError || !branch) {
      return res.status(404).json({ error: 'الفرع غير موجود أو لا تملك صلاحية حذفه.' });
    }
    // حذف جميع الربط مع المطارات أولاً
    await supabase
      .from('agency_branches_airports')
      .delete()
      .eq('agency_id', branch_id);
    // ثم حذف الفرع
    const { error: deleteError } = await supabase
      .from('agency_branches')
      .delete()
      .eq('id', branch_id)
      .eq('agency_id', agency_id);
    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }
    res.json({ status: 'ok', message: 'تم حذف الفرع وجميع ربط المطارات بنجاح.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
