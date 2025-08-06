const nodemailer = require('nodemailer');

// إعداد ترانسبورت بسيط (يمكنك تعديله لاحقاً)
const transporter = nodemailer.createTransport({
  service: 'gmail', // أو استخدم SMTP خاص بك
  auth: {
    user: process.env.NOTIFY_EMAIL_USER,
    pass: process.env.NOTIFY_EMAIL_PASS
  }
});

const supabase = require('../supabaseAdmin'); // تأكد من استخدام supabaseAdmin.js للوصول إلى صلاحيات الإدارة

async function sendAgencyBookingNotification(booking, offer) {
  // تحقق من متغيرات البيئة الخاصة بالبريد
  if (!process.env.NOTIFY_EMAIL_USER || !process.env.NOTIFY_EMAIL_PASS) {
    console.error('تحذير: متغيرات البيئة الخاصة بالبريد الإلكتروني (NOTIFY_EMAIL_USER أو NOTIFY_EMAIL_PASS) غير معرفة أو فارغة!');
  } else {
    console.log('✅ متغيرات البريد الإلكتروني معرفة:', process.env.NOTIFY_EMAIL_USER);
  }

  // جلب تفاصيل الحجز دومًا من قاعدة البيانات باستخدام booking.id فقط
  let bookingData = null;
  let offerData = null;
  try {
    console.log('🔎 محاولة جلب بيانات الحجز من جدول bookings. booking.id:', booking.id, 'booking object:', booking);
    const { data: bookingRow, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking.id)
      .single();
    if (bookingError) {
      console.error('❌ خطأ من supabase عند جلب بيانات الحجز:', bookingError);
    }
    if (!bookingRow) {
      console.error('❌ لم يتم العثور على بيانات الحجز في جدول bookings للـ id:', booking.id);
      throw new Error('لم يتم العثور على بيانات الحجز');
    }
    bookingData = bookingRow;
    console.log('✅ بيانات الحجز المسترجعة:', bookingData);

    // جلب بيانات العرض المرتبط بالحجز
    const { data: offerRow, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('id', bookingData.offer_id)
      .single();
    if (offerError) {
      console.error('❌ خطأ من supabase عند جلب بيانات العرض:', offerError);
    }
    if (!offerRow) {
      console.error('❌ لم يتم العثور على بيانات العرض في جدول offers للـ id:', bookingData.offer_id);
      throw new Error('لم يتم العثور على بيانات العرض');
    }
    offerData = offerRow;
    console.log('✅ بيانات العرض المسترجعة:', offerData);
  } catch (err) {
    console.error('فشل جلب بيانات الحجز أو العرض (catch):', err);
    throw err;
  }

  // جلب إيميل الوكالة من جدول auth.users باستخدام Admin API
  let agencyEmail = null;
  try {
    console.log('🔎 محاولة جلب بريد الوكالة من auth.users. agency_id:', offer.agency_id, 'offer object:', offer);
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(offer.agency_id);
    if (userError) {
      console.error('❌ خطأ من supabase عند جلب بريد الوكالة:', userError);
    }
    if (!userData || !userData.user || !userData.user.email) {
      console.error('❌ لم يتم العثور على بريد الوكالة في جدول auth.users للـ id:', offer.agency_id);
      throw new Error('لم يتم العثور على بريد الوكالة');
    }
    agencyEmail = userData.user.email;
    console.log('✅ بريد الوكالة المسترجع:', agencyEmail);
  } catch (err) {
    console.error('فشل جلب بريد الوكالة (catch):', err);
    throw err;
  }

  // حساب السعر حسب نوع الغرفة من بيانات العرض
  let originalPrice = '';
  let finalPrice = '';
  let roomType = (bookingData.room_type || '').trim().toLowerCase();
  let priceValue = null;
  if (roomType === 'ثنائي' || roomType === 'double') {
    priceValue = Number(offerData.price_double);
  } else if (roomType === 'ثلاثي' || roomType === 'triple') {
    priceValue = Number(offerData.price_triple);
  } else if (roomType === 'رباعي' || roomType === 'quad') {
    priceValue = Number(offerData.price_quad);
  } else if (roomType === 'خماسي' || roomType === 'quint') {
    priceValue = Number(offerData.price_quint);
  }
  if (priceValue !== null && !isNaN(priceValue) && priceValue > 0) {
    originalPrice = priceValue;
    if (bookingData.discount_applied) {
      finalPrice = priceValue - 10000;
    } else {
      finalPrice = priceValue;
    }
  } else {
    originalPrice = '';
    finalPrice = '';
  }
  // لوج للتأكد من القيم
  console.log('roomType:', roomType, 'originalPrice:', originalPrice, 'finalPrice:', finalPrice, 'discount_applied:', bookingData.discount_applied, 'departure_date:', offerData.departure_date);

  const mailOptions = {
    from: process.env.NOTIFY_EMAIL_USER,
    to: agencyEmail,
    subject: `✨ لديك طلب حجز جديد من مُعتمر  يبحث عن تجربة روحانية فريدة عبر وكالتكم - ${offer.agency_name || ''} -`,
    html: `
      <div style="direction:rtl;text-align:right;font-family:'Tajawal',Arial,sans-serif;background:#f4f8fb;padding:0;margin:0;">
        <div style="background:#fff;border-radius:16px;box-shadow:0 2px 12px #0001;max-width:600px;margin:32px auto;padding:32px 24px 24px 24px;">
          <div style="text-align:center;margin-bottom:24px;">
            <img src="https://almanassik-alarabi-m5jl.vercel.app/user/img/images.jpeg" alt="مناسك" style="width:64px;height:64px;margin-bottom:8px; border-radius:50%;">
            <h2 style="color:#1e7e34;margin:0 0 8px 0;font-size:28px;">🚀 تهانينا!</h2>
            <div style="font-size:19px;color:#222;">معتمر جديد اختاركم من بين الجميع لتنظيم رحلته الروحية عبر <b>منصّة المناسك العربي</b> — لأنكم ببساطة تستحقون الثقة.</div>
          </div>
          <div style="background:#e3f2fd;border-radius:10px;padding:18px 18px 10px 18px;margin-bottom:18px;">
            <div style="font-size:18px;color:#007bff;font-weight:bold;margin-bottom:8px;">👇 تفاصيل الحجز:</div>
            <div style="font-size:17px;line-height:2;color:#222;">
              📅 <b>تاريخ الانطلاق:</b> ${offerData.departure_date || ''}<br>
              🛏️ <b>نوع الغرفة المطلوبة:</b> ${bookingData.room_type || ''}<br>
              📍 <b>حالة الحجز:</b> <span style="color:#e67e22;">بانتظار التأكيد</span><br>
              ${bookingData.discount_applied && originalPrice !== '' ? `💸 <b>السعر الأصلي:</b> <span style="text-decoration:line-through;color:#e53935;">${originalPrice} د.ج</span><br>🎁 <b>بعد تفعيل <span style='color:#388e3c;'>"هدية المناسك"</span>:</b> <span style="color:#388e3c;font-weight:bold;">${finalPrice} د.ج فقط</span><br><span style=\"color:#888;font-size:15px;\">(العميل استفاد من عرض المنصة، وسيتذكركم بالخير دائمًا)</span>` : (finalPrice !== '' ? `<b>السعر النهائي:</b> <span style="color:#388e3c;font-weight:bold;">${finalPrice} د.ج فقط</span><br>` : '')}
            </div>
          </div>
          <div style="background:#fff3cd;border-radius:10px;padding:14px 18px 10px 18px;margin-bottom:18px;">
            <div style="font-size:17px;color:#856404;font-weight:bold;margin-bottom:6px;">📣 ما الذي يحدث الآن؟</div>
            <div style="font-size:16px;line-height:2;color:#444;">
              ⬩ تم إشعار المعتمر بأن طلبه قيد المعالجة.<br>
              ⬩ ننتظر منكم تأكيد الحجز أو تحديث حالته من خلال لوحة التحكم الخاصة بكم.<br>
              ⬩ <b style="color:#e53935;">كل دقيقة تأخير = فرصة مهدورة! 😉</b>
            </div>
          </div>
          <div style="margin-bottom:18px;text-align:center;">
            <a href="https://almanassik-alarabi-m5jl.vercel.app/agencie/manage_offers.html" style="display:inline-block;background:#1e7e34;color:#fff;font-size:18px;font-weight:bold;padding:12px 32px;border-radius:8px;text-decoration:none;box-shadow:0 2px 8px #0002;transition:background 0.2s;">اضغط هنا لعرض طلب الحجز</a>
          </div>
          <div style="font-size:15px;color:#888;text-align:center;margin-bottom:18px;">إذا واجهتكم أي ملاحظة أو استفسار، فريق الدعم جاهز لخدمتكم على مدار الساعة.</div>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <div style="font-size:16px;text-align:center;color:#222;">
            شكراً لاختياركم <b>منصة المناسك العربي</b> – شركاؤكم في كل خطوة نحو مكة.<br><br>
            مع كامل التقدير،<br>
            فريق المناسك العربي 🕋<br>
            <span>📩 almanassik.alarabi@gmail.com</span> | <span>📞 0776504860</span><br>
            <span>🌐 www.Almanassik.alarabi.com</span>
          </div>
        </div>
      </div>
    `
  };
  try {
    console.log('🚀 محاولة إرسال البريد الإلكتروني للوكالة:', agencyEmail, 'تفاصيل الحجز:', bookingData);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ تم إرسال البريد الإلكتروني بنجاح:', info);
    return info;
  } catch (err) {
    console.error('❌ فشل إرسال البريد الإلكتروني (catch):', err);
    throw err;
  }
}

module.exports = { sendAgencyBookingNotification };
