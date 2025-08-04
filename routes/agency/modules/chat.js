const express = require('express');
const router = express.Router();
const supabase = require('../../../supabaseClient');
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../../../utils/cloudinary');

// إعداد multer للملفات المؤقتة في الذاكرة
const storage = multer.memoryStorage();
const upload = multer({ storage });

// جلب كل المحادثات الخاصة بالمستخدم (وكالة أو أدمن)
router.get('/chats', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى إرسال رمز التوثيق (توكن).' });
  }
  const token = authHeader.split(' ')[1];
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData || !userData.user) {
    return res.status(401).json({ error: 'توكن غير صالح أو منتهي.' });
  }
  const user_id = userData.user.id;
  // جلب المحادثات التي تخص الوكالة أو الأدمن
  try {
    const { data: agencyChats, error: agencyErr } = await supabase
      .from('chats')
      .select('*')
      .or(`agency_id.eq.${user_id},admin_id.eq.${user_id}`)
      .order('created_at', { ascending: false });
    if (agencyErr) return res.status(500).json({ error: agencyErr.message });
    res.json({ chats: agencyChats });
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

// إرسال رسالة جديدة (وكالة أو أدمن فقط، مع التحقق من ملكية المحادثة)
router.post('/chats/:chat_id/messages', upload.single('image'), async (req, res) => {
  const chat_id = req.params.chat_id;
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى إرسال رمز التوثيق (توكن).' });
  }
  const token = authHeader.split(' ')[1];
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData || !userData.user) {
    return res.status(401).json({ error: 'توكن غير صالح أو منتهي.' });
  }
  const user_id = userData.user.id;
  // جلب المحادثة للتحقق من الصلاحية
  const { data: chat, error: chatErr } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chat_id)
    .single();
  if (chatErr || !chat) {
    return res.status(404).json({ error: 'المحادثة غير موجودة.' });
  }
  let sender_type = null;
  if (chat.agency_id === user_id) sender_type = 'agency';
  else if (chat.admin_id === user_id) sender_type = 'admin';
  else return res.status(403).json({ error: 'غير مصرح لك بإرسال رسالة في هذه المحادثة.' });

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
        sender_id: user_id,
        sender_type,
        message,
        image_url: imageUrl
      })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ status: 'ok', message: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// إنشاء محادثة جديدة بين وكالة وأدمن (يجب أن يكون المستخدم وكالة)
router.post('/chats', async (req, res) => {
  let { admin_id } = req.body;
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
  // إذا لم يُرسل admin_id، اختر أي أدمن عشوائي من جدول admins
  if (!admin_id) {
    const { data: admins, error: adminErr } = await supabase
      .from('admins')
      .select('id')
      .limit(1);
    if (adminErr || !admins || admins.length === 0) {
      return res.status(400).json({ error: 'لا يوجد أدمن متاح.' });
    }
    admin_id = admins[0].id;
  }
  // تحقق من عدم وجود محادثة سابقة بين نفس الوكالة ونفس الأدمن
  const { data: existing, error: existErr } = await supabase
    .from('chats')
    .select('*')
    .eq('agency_id', agency_id)
    .eq('admin_id', admin_id)
    .maybeSingle();
  if (existing) {
    return res.json({ status: 'ok', chat: existing });
  }
  try {
    const { data, error } = await supabase
      .from('chats')
      .insert({
        agency_id,
        admin_id
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
