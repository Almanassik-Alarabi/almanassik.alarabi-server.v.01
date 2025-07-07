// تسجيل نشاط المدراء في admin_activity_logs و admin_online_status
const supabase = require('../supabaseClient');

// يسجل كل تفاعل للمدير (action: string, target_type/target_id optional)
async function logAdminActivity({ admin_id, action, target_type = null, target_id = null }) {
  if (!admin_id || !action) return;
  // سجل في admin_activity_logs
  await supabase.from('admin_activity_logs').insert([
    { admin_id, action, target_type, target_id }
  ]);
  // حدث آخر ظهور في admin_online_status
  const { data: existing } = await supabase
    .from('admin_online_status')
    .select('id')
    .eq('admin_id', admin_id)
    .single();
  if (existing && existing.id) {
    await supabase
      .from('admin_online_status')
      .update({ is_active: true, last_seen: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('admin_online_status')
      .insert([{ admin_id, is_active: true, last_seen: new Date().toISOString() }]);
  }
}

// حذف سجلات النشاط الأقدم من عام كامل
async function cleanupOldAdminActivityLogs() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  await supabase
    .from('admin_activity_logs')
    .delete()
    .lt('created_at', oneYearAgo.toISOString());
}

module.exports = { logAdminActivity, cleanupOldAdminActivityLogs };
