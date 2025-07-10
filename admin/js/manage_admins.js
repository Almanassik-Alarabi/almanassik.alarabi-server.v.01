
// إعداد رابط الـ API الأساسي (يعمل على المنفذ 3001)
const API_BASE = 'http://192.168.100.23:3001/api/admin';

// جلب التوكن من localStorage (متوافق مع بقية الصفحات)
const token = localStorage.getItem('umrah_admin_token');
let currentAdmin = null;

// حماية الصفحة: إذا لم يوجد توكن، إعادة توجيه لصفحة تسجيل الدخول
if (!token) {
    window.location.href = 'login_admin.html';
}

// جلب جميع المدراء وعرضهم في الجدول
async function fetchAdmins() {
    try {
        const res = await fetch(`${API_BASE}/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.status !== 200) throw new Error(data.error || 'فشل في جلب المدراء');
        renderAdmins(data.admins);
    } catch (err) {
        alert(err.message);
    }
}

// جلب بيانات المدير الحالي (من التوكن)
async function fetchCurrentAdmin() {
    // لا يوجد endpoint مباشر، سنجلب كل المدراء ونبحث عن المطابق للـ id في التوكن
    const payload = parseJwt(token);
    if (!payload || !payload.sub) return null;
    try {
        const res = await fetch(`${API_BASE}/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.status !== 200) return null;
        const admin = data.admins.find(a => a.id === payload.sub);
        return admin || null;
    } catch {
        return null;
    }
}

// دالة مساعدة لفك التوكن JWT
function parseJwt(token) {
    try {
        if (!token || typeof token !== 'string' || token.split('.').length !== 3) return null;
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

// عرض المدراء في الجدول
function renderAdmins(admins) {
    const tbody = document.getElementById('adminsTbody');
    tbody.innerHTML = '';
    admins.forEach((admin, idx) => {
        const tr = document.createElement('tr');
        let dateHtml = '';
        if (admin.created_at) {
            const d = new Date(admin.created_at);
            // اليوم/الشهر/السنة
            const dateStr = d.toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' });
            // الساعة والدقائق
            const timeStr = d.toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
            dateHtml = `<span style='font-size:0.95em;color:#888;line-height:1.3;display:inline-block;'>${dateStr}<br>${timeStr}</span>`;
        }
        tr.innerHTML = `
            <td style="text-align:center;font-weight:bold;font-size:1.1em;">${(idx + 1).toLocaleString('en-US')}</td>
            <td style="font-weight:500;">${admin.full_name}</td>
            <td style="direction:ltr;">${admin.email}</td>
            <td><span class="badge ${admin.role === 'main' ? 'bg-success' : 'bg-info'}">${admin.role === 'main' ? 'مدير عام' : 'مدير فرعي'}</span></td>
            <td>${renderPermissions(admin.permissions)}</td>
            <td>${dateHtml}</td>
            <td>
                <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                  ${renderActions(admin)}
                </div>
            </td>
        `;
        tr.style.verticalAlign = 'middle';
        tbody.appendChild(tr);
    });
}

// عرض الصلاحيات بشكل نصي
function renderPermissions(permissions) {
    if (!permissions) return '-';
    let perms = [];
    if (permissions.can_approve_agencies) perms.push('الموافقة على الوكالات');
    if (permissions.manage_agencies) perms.push('إدارة الوكالات');
    if (permissions.manage_offers) perms.push('إدارة العروض');
    if (permissions.manage_bookings) perms.push('إدارة الحجوزات');
    if (permissions.manage_admins) perms.push('إدارة المدراء');
    if (!perms.length) return '-';
    return perms.map(p => `<div style='margin-bottom:2px;white-space:nowrap;'>${p}</div>`).join('');
}

// عرض أزرار الإجراءات حسب الصلاحيات
function renderActions(admin) {
    if (!currentAdmin) return '';
    // لا يمكن حذف أو تعديل المدير العام
    if (admin.role === 'main') return '-';
    // فقط المدير العام أو من لديه صلاحية manage_admins
    if (currentAdmin.role === 'main' || (currentAdmin.permissions && currentAdmin.permissions.manage_admins)) {
        // مرر permissions كسلسلة JSON مع استبدال علامات الاقتباس المفردة
        // استخدم data attributes لتمرير البيانات بأمان
        const permissionsStr = encodeURIComponent(JSON.stringify(admin.permissions || {}));
        const fullNameSafe = admin.full_name.replace(/"/g, '&quot;');
        return `
            <button class="btn btn-sm btn-primary me-1" 
                data-admin-id="${admin.id}"
                data-full-name="${fullNameSafe}"
                data-permissions="${permissionsStr}"
                onclick="openEditAdminModal(this)">تعديل</button>
            <button class="btn btn-sm btn-danger" onclick="deleteAdmin('${admin.id}')">حذف</button>
        `;
    }
    return '-';
}

// فتح نافذة تعديل المدير
window.openEditAdminModal = function(btn) {
    // btn هو الزر نفسه
    const id = btn.getAttribute('data-admin-id');
    const fullName = btn.getAttribute('data-full-name');
    let permissions = {};
    try {
        const permissionsStr = btn.getAttribute('data-permissions');
        if (permissionsStr) {
            permissions = JSON.parse(decodeURIComponent(permissionsStr));
        }
    } catch {}
    document.getElementById('editAdminId').value = id;
    document.getElementById('editFullName').value = fullName;
    // جلب البريد الإلكتروني من الصف نفسه
    const tr = btn.closest('tr');
    if (tr) {
        const emailCell = tr.querySelector('td:nth-child(3)');
        if (emailCell) {
            document.getElementById('editEmail').value = emailCell.textContent.trim();
        }
    }
    document.getElementById('editPassword').value = '';
    document.getElementById('editCanApproveAgencies').checked = !!permissions.can_approve_agencies;
    document.getElementById('editManageAgencies').checked = !!permissions.manage_agencies;
    document.getElementById('editManageOffers').checked = !!permissions.manage_offers;
    document.getElementById('editManageBookings').checked = !!permissions.manage_bookings;
    document.getElementById('editManageAdmins').checked = !!permissions.manage_admins;
    new bootstrap.Modal(document.getElementById('editAdminModal')).show();
}

// حذف مدير
async function deleteAdmin(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المدير؟')) return;
    try {
        const res = await fetch(`${API_BASE}/delete/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.status !== 200) throw new Error(data.error || 'فشل في حذف المدير');
        fetchAdmins();
    } catch (err) {
        alert(err.message);
    }
}

// إضافة مدير فرعي جديد
document.getElementById('addAdminForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const full_name = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const permissions = {
        can_approve_agencies: document.getElementById('canApproveAgencies').checked,
        manage_agencies: document.getElementById('manageAgencies').checked,
        manage_offers: document.getElementById('manageOffers').checked,
        manage_bookings: document.getElementById('manageBookings').checked,
        manage_admins: document.getElementById('manageAdmins').checked
    };
    const body = {
        email,
        password,
        full_name,
        role: 'sub',
        permissions,
        created_by: currentAdmin.id
    };
    try {
        const res = await fetch(`${API_BASE}/add-sub-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.status !== 200) throw new Error(data.error || 'فشل في إضافة المدير');
        bootstrap.Modal.getInstance(document.getElementById('addAdminModal')).hide();
        this.reset();
        fetchAdmins();
    } catch (err) {
        alert(err.message);
    }
});

// تعديل بيانات مدير
document.getElementById('editAdminForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('editAdminId').value;
    const full_name = document.getElementById('editFullName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const password = document.getElementById('editPassword').value;
    const permissions = {
        can_approve_agencies: document.getElementById('editCanApproveAgencies').checked,
        manage_agencies: document.getElementById('editManageAgencies').checked,
        manage_offers: document.getElementById('editManageOffers').checked,
        manage_bookings: document.getElementById('editManageBookings').checked,
        manage_admins: document.getElementById('editManageAdmins').checked
    };
    const body = { full_name, email, permissions };
    if (password) body.password = password;
    try {
        const res = await fetch(`${API_BASE}/update/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.status !== 200) throw new Error(data.error || 'فشل في تعديل بيانات المدير');
        bootstrap.Modal.getInstance(document.getElementById('editAdminModal')).hide();
        fetchAdmins();
    } catch (err) {
        alert(err.message);
    }
});

// إظهار زر إضافة مدير فقط للمدير العام أو من لديه صلاحية manage_admins
function updateAddAdminBtnVisibility() {
    const btn = document.getElementById('addAdminBtn');
    if (!currentAdmin) return btn.style.display = 'none';
    if (currentAdmin.role === 'main' || (currentAdmin.permissions && currentAdmin.permissions.manage_admins)) {
        btn.style.display = 'inline-block';
    } else {
        btn.style.display = 'none';
    }
}

// عرض الدور الحالي
function updateCurrentRole() {
    const span = document.getElementById('currentRole');
    if (!currentAdmin) return span.textContent = '';
    span.textContent = currentAdmin.role === 'main' ? 'مدير عام' : 'مدير فرعي';
}

// بدء التنفيذ
window.addEventListener('DOMContentLoaded', async () => {
    currentAdmin = await fetchCurrentAdmin();
    updateAddAdminBtnVisibility();
    updateCurrentRole();
    // لا تجلب المدراء إلا بعد التأكد من currentAdmin
    if (currentAdmin) {
        await fetchAdmins();
    }
});
