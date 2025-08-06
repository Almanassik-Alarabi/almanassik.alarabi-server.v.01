const nodemailer = require('nodemailer');

// إعداد ترانسبورت بسيط (يمكنك تعديله لاحقاً)
const transporter = nodemailer.createTransport({
  service: 'gmail', // أو استخدم SMTP خاص بك
  auth: {
    user: process.env.NOTIFY_EMAIL_USER,
    pass: process.env.NOTIFY_EMAIL_PASS
  }
});

async function sendAgencyBookingNotification(to, booking, offer) {
  const mailOptions = {
    from: process.env.NOTIFY_EMAIL_USER,
    to,
    subject: `✨ لديك طلب حجز جديد من مُعتمر  يبحث عن تجربة روحانية فريدة عبر وكالتكم - ${offer.agency_name || ''} -`,
    html: `
      <div style="direction:rtl;text-align:right;font-family:'Tajawal',Arial,sans-serif;background:#f9f9f9;padding:32px 0;">
        <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;box-shadow:0 2px 8px #0001;padding:32px;">
          <h2 style="color:#1e7e34;margin-bottom:8px;">🚀 تهانينا!</h2>
          <p style="font-size:18px;">معتمر جديد اختاركم من بين الجميع لتنظيم رحلته الروحية عبر <b>منصّة المناسك العربي</b> — لأنكم ببساطة تستحقون الثقة.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <h3 style="color:#007bff;">👇 إليكم تفاصيل الحجز التي تحتاجونها:</h3>
          <ul style="list-style:none;padding:0;font-size:17px;">
            <li>📅 <b>تاريخ الانطلاق:</b> ${booking.trip_date || ''}</li>
            <li>🛏️ <b>نوع الغرفة المطلوبة:</b> ${booking.room_type || ''}</li>
            <li>📍 <b>حالة الحجز:</b> <span style="color:#ff9800;">بانتظار التأكيد</span></li>
            <li>💸 <b>السعر الأصلي:</b> <span style="text-decoration:line-through;color:#888;">${booking.original_price || ''} د.ج</span></li>
            <li>🎁 <b>بعد تفعيل "هدية المناسك":</b> <span style="color:#1e7e34;font-weight:bold;">${booking.final_price || ''} د.ج فقط</span></li>
            <li style="color:#888;font-size:15px;">(العميل استفاد من عرض المنصة، وسيتذكركم بالخير دائمًا)</li>
          </ul>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <h3 style="color:#007bff;">📣 ما الذي يحدث الآن؟</h3>
          <ul style="font-size:16px;line-height:2;">
            <li>⬩ تم إشعار المعتمر بأن طلبه قيد المعالجة.</li>
            <li>⬩ ننتظر منكم تأكيد الحجز أو تحديث حالته من خلال لوحة التحكم الخاصة بكم.</li>
            <li>⬩ <b style="color:#e53935;">كل دقيقة تأخير = فرصة مهدورة! 😉</b></li>
          </ul>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <div style="margin:24px 0;text-align:center;">
            <a href="${offer.booking_url || '#'}" style="display:inline-block;background:#1e7e34;color:#fff;padding:14px 32px;border-radius:8px;font-size:18px;text-decoration:none;font-weight:bold;">🔗 الدخول السريع للوحة الحجز</a>
            <div style="margin-top:8px;font-size:15px;color:#888;">اضغط أعلاه لعرض طلب الحجز مباشرة</div>
          </div>
          <p style="font-size:16px;">إذا واجهتكم أي ملاحظة أو استفسار، فريق الدعم جاهز لخدمتكم على مدار الساعة.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <div style="font-size:16px;">
            شكراً لاختياركم <b>منصة المناسك العربي</b> – شركاؤكم في كل خطوة نحو مكة.<br><br>
            مع كامل التقدير،<br>
            فريق المناسك العربي 🕋<br>
            <a href="mailto:almanassik.alarabi@gmail.com" style="color:#007bff;">📩 almanassik.alarabi@gmail.com</a><br>
            <span>📞 0776504860</span><br>
            <a href="https://www.Almanassik.alarabi.com" style="color:#007bff;">🌐 www.Almanassik.alarabi.com</a>
          </div>
        </div>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { sendAgencyBookingNotification };
