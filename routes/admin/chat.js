const express = require('express');
const router = express.Router();
const supabase = require('../../supabaseAdmin');




// جلب جميع الوكالات مع معلومات المستخدم من auth (البريد الإلكتروني)
router.get('/all', async (req, res) => {
  const supabase = getSupabase(req);
  // السماح فقط للمدير العام أو المدير الفرعي الذي لديه صلاحية إدارة الوكالات (permissions.manage_agencies)
  const { data: currentAdmin, error: currentAdminError } = await supabase.from('admins').select('role, permissions').eq('id', req.user.id).single();
  if (currentAdminError || !currentAdmin) {
    return res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول.' });
  }
  if (
    currentAdmin.role !== 'main' &&
    !(currentAdmin.permissions && currentAdmin.permissions.manage_agencies === true)
  ) {
    return res.status(403).json({ error: 'غير مصرح. هذه العملية تتطلب صلاحية المدير العام أو مدير فرعي لديه صلاحية إدارة الوكالات.' });
  }

  // جلب جميع الوكالات
  const { data: agencies, error } = await supabase.from('agencies').select('*');
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // جلب إيميلات المستخدمين من auth لكل وكالة
  const agenciesWithEmail = await Promise.all(
    agencies.map(async (agency) => {
      // جلب المستخدم من auth
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(agency.id);
      return {
        ...agency,
        email: userData && userData.user ? userData.user.email : null
      };
    })
  );

  res.json({ agencies: agenciesWithEmail });
});

// ميدلواير للتحقق من التوكن (مبسط)
async function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'يرجى إرسال التوكن في الهيدر' });
    }
    const token = authHeader.split(' ')[1];
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) {
        return res.status(401).json({ error: 'توكن غير صالح أو منتهي الصلاحية.' });
    }
    req.admin = data.user;
    next();
}

router.use(verifyToken);


const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../../utils/cloudinary');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// جلب كل المحادثات الخاصة بالمدير
router.get('/chats', async (req, res) => {
  const adminId = req.admin.id;
  try {
    const { data: chats, error } = await supabase
      .from('chats')
      .select('*')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ chats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// جلب رسائل محادثة معينة
router.get('/chats/:chat_id/messages', async (req, res) => {
  const chat_id = req.params.chat_id;
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chat_id)
      .order('sent_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// إرسال رسالة جديدة (نص أو صورة)
router.post('/chats/:chat_id/messages', upload.single('image'), async (req, res) => {
  const chat_id = req.params.chat_id;
  const adminId = req.admin.id;
  // جلب المحادثة للتحقق من الصلاحية
  const { data: chat, error: chatErr } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chat_id)
    .single();
  if (chatErr || !chat) {
    return res.status(404).json({ error: 'المحادثة غير موجودة.' });
  }
  if (chat.admin_id !== adminId) {
    return res.status(403).json({ error: 'غير مصرح لك بإرسال رسالة في هذه المحادثة.' });
  }
  let message = req.body.message || '';
  let imageUrl = null;
  // إذا تم رفع صورة
  if (req.file) {
    try {
      const streamUpload = (buffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'umrah_chat' },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(buffer).pipe(stream);
        });
      };
      const result = await streamUpload(req.file.buffer);
      imageUrl = result.secure_url;
    } catch (err) {
      return res.status(500).json({ error: 'فشل رفع الصورة: ' + err.message });
    }
  }
  if (!message && !imageUrl) {
    return res.status(400).json({ error: 'الرسالة أو الصورة مطلوبة.' });
  }
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id,
        sender_id: adminId,
        sender_type: 'admin',
        message,
        image_url: imageUrl,
        is_read: false
      })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ status: 'ok', message: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// إنشاء محادثة جديدة بين مدير ووكالة
router.post('/chats', async (req, res) => {
  const adminId = req.admin.id;
  const { agency_id } = req.body;
  if (!agency_id) {
    return res.status(400).json({ error: 'يرجى تحديد الوكالة.' });
  }
  // تحقق من عدم وجود محادثة سابقة بين نفس المدير ونفس الوكالة
  const { data: existing, error: existErr } = await supabase
    .from('chats')
    .select('*')
    .eq('agency_id', agency_id)
    .eq('admin_id', adminId)
    .maybeSingle();
  if (existing) {
    return res.json({ status: 'ok', chat: existing });
  }
  try {
    const { data, error } = await supabase
      .from('chats')
      .insert({
        agency_id,
        admin_id: adminId
      })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ status: 'ok', chat: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// تحديث جميع الرسائل غير المقروءة من الوكالة إلى مقروءة عند فتح المحادثة
router.post('/chats/:chat_id/messages/read', async (req, res) => {
  const chat_id = req.params.chat_id;
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chat_id)
      .eq('is_read', false)
      .eq('sender_type', 'agency');
    if (error) return res.status(400).json({ error: error.message });
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
