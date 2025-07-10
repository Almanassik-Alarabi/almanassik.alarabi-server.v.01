// supabaseAdmin.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY_ROLE;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;

// ملاحظة هامة للأمان:
// لا تستخدم هذا الملف (supabaseAdmin.js) إلا في الراوترات الخاصة بالإدارة (admin) فقط!
// لا تستورد هذا الملف أبداً في أي كود خاص بالمستخدمين العاديين أو أي كود frontend.
// يجب أن يبقى SUPABASE_KEY_ROLE مخفياً في backend فقط.
// إذا احتجت عمليات CRUD عادية للمستخدمين، استخدم supabaseClient.js (الذي فيه anon/public key فقط).
// مثال: في routes/admin/admin.js أو agencies.js استورد supabaseAdmin فقط عند الحاجة لصلاحيات admin:
// const supabaseAdmin = require('../../supabaseAdmin');
