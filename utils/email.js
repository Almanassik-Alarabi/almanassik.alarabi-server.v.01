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
    subject: 'إشعار حجز جديد في نظام العمرة',
    html: `
      <div style="direction:rtl;text-align:right;font-family:'Tajawal',Arial,sans-serif;">
        <h2>إشعار حجز جديد</h2>
        <p>تمت الموافقة على حجز جديد وهو الآن بانتظار موافقة وكالتكم.</p>
        <ul>
      
          
          <li><b>اسم العرض:</b> ${offer.title}</li>
          <li><b>نوع الغرفة:</b> ${booking.room_type || ''}</li>
        </ul>
        <p>يرجى الدخول إلى لوحة تحكم الوكالة لمراجعة الطلب واتخاذ الإجراء المناسب.</p>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { sendAgencyBookingNotification };
