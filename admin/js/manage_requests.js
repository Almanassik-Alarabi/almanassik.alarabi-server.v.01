// === Modal Logic ===
function showModal(id) {
  document.getElementById(id).style.display = "flex";
  document.body.style.overflow = "hidden";
}
function hideModal(id) {
  document.getElementById(id).style.display = "none";
  document.body.style.overflow = "";
}

document.getElementById("closeRequestDetailsModalBtn").onclick = () => hideModal("requestDetailsModal");
document.querySelectorAll(".modal").forEach(modal => {
  modal.onclick = function(e) {
    if (e.target === modal) hideModal(modal.id);
  };
});

// === Load and Display Requests ===
async function loadRequests(filter = "", status = "") {
  const table = document.getElementById("requestsTable").querySelector("tbody");
  table.innerHTML = "<tr><td colspan='8'>جاري التحميل...</td></tr>";
  // TODO: Replace with local API call to fetch umrah_requests
  // let query = supabase.from("umrah_requests").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  let { data: requests, error } = await query;
  if (error || !requests) {
    table.innerHTML = "<tr><td colspan='8' style='color:red;'>فشل تحميل البيانات</td></tr>";
    return;
  }
  // Filter by search
  if (filter) {
    requests = requests.filter(r =>
      (r.agency_name && r.agency_name.includes(filter)) ||
      (r.contact_name && r.contact_name.includes(filter)) ||
      (r.contact_phone && r.contact_phone.includes(filter)) ||
      (r.contact_email && r.contact_email.includes(filter))
    );
  }
  if (requests.length === 0) {
    table.innerHTML = "<tr><td colspan='8'>لا توجد طلبات</td></tr>";
    return;
  }
  table.innerHTML = requests.map(req => {
    return `<tr>
      <td>${req.agency_name || ""}</td>
      <td>${req.contact_name || ""}</td>
      <td>${req.contact_phone || ""}</td>
      <td>${req.contact_email || ""}</td>
      <td>${req.num_pilgrims || ""}</td>
      <td>${req.travel_date || ""}</td>
      <td>${statusBadge(req.status)}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="showRequestDetails('${req.id}')"><i class="fas fa-eye"></i></button>
        ${req.status === "قيد الانتظار"
          ? `<button class="btn btn-success btn-sm" onclick="updateRequestStatus('${req.id}','مقبول')"><i class="fas fa-check"></i></button>
             <button class="btn btn-danger btn-sm" onclick="updateRequestStatus('${req.id}','مرفوض')"><i class="fas fa-times"></i></button>`
          : ""}
      </td>
    </tr>`;
  }).join("");
}

// === Status Badge ===
function statusBadge(status) {
  if (status === "مقبول") return '<span style="color:#2ca87f;font-weight:700;">مقبول</span>';
  if (status === "مرفوض") return '<span style="color:#c0392b;font-weight:700;">مرفوض</span>';
  return '<span style="color:#d9a441;font-weight:700;">قيد الانتظار</span>';
}

// === Show Request Details Modal ===
async function showRequestDetails(id) {
  // TODO: Replace with local API call to fetch request by id
  // let { data: req } = await supabase.from("umrah_requests").select("*").eq("id", id).single();
  if (!req) return;
  let html = `
    <div><b>اسم الوكالة:</b> ${req.agency_name || ""}</div>
    <div><b>اسم المسؤول:</b> ${req.contact_name || ""}</div>
    <div><b>الهاتف:</b> ${req.contact_phone || ""}</div>
    <div><b>البريد الإلكتروني:</b> ${req.contact_email || ""}</div>
    <div><b>الولاية:</b> ${req.wilaya || ""}</div>
    <div><b>عدد المعتمرين:</b> ${req.num_pilgrims || ""}</div>
    <div><b>تاريخ السفر:</b> ${req.travel_date || ""}</div>
    <div><b>ملاحظات:</b> ${req.notes || ""}</div>
    <div><b>الحالة:</b> ${statusBadge(req.status)}</div>
    <div><b>تاريخ الإنشاء:</b> ${(req.created_at || "").slice(0, 16).replace("T", " ")}</div>
  `;
  document.getElementById("requestDetailsContent").innerHTML = html;
  showModal("requestDetailsModal");
}

// === Update Status ===
async function updateRequestStatus(id, newStatus) {
  if (!confirm("هل أنت متأكد من تغيير حالة الطلب؟")) return;
  // TODO: Replace with local API call to update request status
  // const { error } = await supabase.from("umrah_requests").update({ status: newStatus }).eq("id", id);
  if (error) {
    alert("فشل تحديث الحالة");
    return;
  }
  loadRequests(
    document.getElementById("searchRequests").value.trim(),
    document.getElementById("statusFilter").value
  );
}

// === Search & Filter Listeners ===
var searchRequestsInput = document.getElementById("searchRequests");
if (searchRequestsInput) {
  searchRequestsInput.oninput = function () {
    loadAgencyRequests(this.value.trim());
  };
}
var statusFilterInput = document.getElementById("statusFilter");
if (statusFilterInput) {
  statusFilterInput.onchange = function () {
    loadRequests(document.getElementById("searchRequests").value.trim(), this.value);
  };
}

// === Load All Agencies ===
async function loadAllAgencies() {
  try {
    const response = await fetch('http://192.168.100.23:3001/api/agencies/all');
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    return [];
  }
}

// === Agency Registration Requests ===
let allAgenciesCache = [];
async function loadAgencyRequests(filter = "") {
  const table = document.getElementById("agencyRequestsTable")?.querySelector("tbody");
  if (!table) return;
  table.innerHTML = "<tr><td colspan='7'>جاري التحميل...</td></tr>";
  try {
    const token = localStorage.getItem('umrah_admin_token');
    const headers = token
      ? { "Content-Type": "application/json", "Authorization": "Bearer " + token }
      : { "Content-Type": "application/json" };
    const response = await fetch('http://192.168.100.23:3001/api/agencies/pending', { headers });
    if (!response.ok) {
      table.innerHTML = "<tr><td colspan='7' style='color:red;'>فشل تحميل البيانات</td></tr>";
      return;
    }
    const result = await response.json();
    let agencies = result.agencies || [];
    allAgenciesCache = agencies;
    if (filter) {
      const f = filter.trim().toLowerCase();
      agencies = agencies.filter(a =>
        (a.name && a.name.toLowerCase().includes(f)) ||
        (a.phone && a.phone.replace(/\s+/g, '').includes(f.replace(/\s+/g, '')))
      );
    }
    if (agencies.length === 0) {
      table.innerHTML = "<tr><td colspan='7'>لا توجد طلبات تسجيل وكالات جديدة</td></tr>";
      return;
    }
    table.innerHTML = agencies.map(agency => `
      <tr>
        <td>${agency.name || ""}</td>
        <td>${agency.manager_name || ""}</td>
        <td>${agency.phone || ""}</td>
        <td>${agency.email || ""}</td>
        <td>${agency.wilaya || ""}</td>
        <td>${agency.is_approved ? "مقبولة" : "معلقة"}</td>
        <td>
          <button class="btn btn-info btn-sm" onclick="showAgencyDetails('${agency.id}')"><i class="fas fa-eye"></i></button>
          <button class="btn btn-success btn-sm" onclick="approveAgency('${agency.id}', true)"><i class="fas fa-check"></i></button>
          <button class="btn btn-danger btn-sm" onclick="approveAgency('${agency.id}', false)"><i class="fas fa-times"></i></button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    table.innerHTML = "<tr><td colspan='7' style='color:red;'>فشل الاتصال بالخادم</td></tr>";
  }
}

// === Approve/Reject Agency ===
async function approveAgency(id, isApproved) {
  const token = localStorage.getItem('umrah_admin_token');
  if (isApproved) {
    if (!confirm("هل أنت متأكد من قبول هذا الطلب؟")) return;
    try {
      const response = await fetch(`http://192.168.100.23:3001/api/agencies/status/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": "Bearer " + token } : {})
        },
        body: JSON.stringify({ is_approved: true })
      });
      const data = await response.json();
      if (response.ok) {
        alert("تم تحديث حالة الوكالة بنجاح");
        loadAgencyRequests();
      } else {
        alert(data.error || "فشل تحديث حالة الوكالة");
      }
    } catch (err) {
      alert("فشل الاتصال بالخادم");
    }
  } else {
    if (!confirm("هل أنت متأكد من رفض (وحذف) هذا الطلب؟ سيتم حذف الوكالة نهائياً!")) return;
    try {
      const response = await fetch(`http://192.168.100.23:3001/api/agencies/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": "Bearer " + token } : {})
        }
      });
      const data = await response.json();
      if (response.ok) {
        alert("تم حذف الوكالة بنجاح");
        loadAgencyRequests();
      } else {
        alert(data.error || "فشل حذف الوكالة");
      }
    } catch (err) {
      alert("فشل الاتصال بالخادم");
    }
  }
}

// === Show Agency Details Modal ===
async function showAgencyDetails(id) {
  const token = localStorage.getItem('umrah_admin_token');
  try {
    const headers = token
      ? { "Content-Type": "application/json", "Authorization": "Bearer " + token }
      : { "Content-Type": "application/json" };
    const response = await fetch(`http://192.168.100.23:3001/api/agencies/all`, { headers });
    if (!response.ok) return alert("فشل تحميل بيانات الوكالة");
    const agencies = await response.json();
    const agency = Array.isArray(agencies) ? agencies.find(a => a.id === id) : (agencies.agencies || []).find(a => a.id === id);
    if (!agency) return alert("لم يتم العثور على بيانات الوكالة");
    let html = `
      <div><b>اسم الوكالة:</b> ${agency.name || ""}</div>
      <div><b>اسم المسؤول:</b> ${agency.manager_name || ""}</div>
      <div><b>الهاتف:</b> ${agency.phone || ""}</div>
      <div><b>البريد الإلكتروني:</b> ${agency.email || ""}</div>
      <div><b>الولاية:</b> ${agency.wilaya || ""}</div>
      <div><b>رقم الرخصة:</b> ${agency.license_number || ""}</div>
      <div><b>رقم الحساب البنكي:</b> ${agency.bank_account || ""}</div>
      <div><b>العنوان:</b> ${agency.location_name || ""}</div>
      <div><b>الحالة:</b> ${agency.is_approved ? "مقبولة" : "معلقة"}</div>
    `;
    document.getElementById("requestDetailsContent").innerHTML = html;
    showModal("requestDetailsModal");
  } catch (err) {
    alert("فشل الاتصال بالخادم");
  }
}

// === On Load ===
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById("requestsTable")) loadRequests();
  if (document.getElementById("agencyRequestsTable")) loadAgencyRequests();

  // No sidebar or language switcher logic here; handled in HTML.
  fetch('sidebar.html')
    .then(response => response.text())
    .then(html => {
      document.getElementById('sidebar').innerHTML = html;
      // Sidebar active highlight
      var current = window.location.pathname.split('/').pop();
      if (!current || current === '') current = 'dashboard.html';
      var interval = setInterval(function() {
        var links = document.querySelectorAll('.sidebar-menu a');
        if (links.length) {
          links.forEach(function(link) {
            link.classList.remove('active');
            var href = link.getAttribute('href');
            if (href && href !== '#' && current === href) {
              link.classList.add('active');
            }
          });
          clearInterval(interval);
        }
      }, 10);

      // Language switcher logic
      setupLanguageSwitcher();
    });

  // Language switcher functions
  function applyLanguage(lang) {
    document.querySelectorAll('[data-ar], [data-en], [data-fr]').forEach(function(el) {
      if (el.dataset[lang]) {
        el.textContent = el.dataset[lang];
      }
    });
    document.querySelectorAll('[data-ar-placeholder], [data-en-placeholder], [data-fr-placeholder]').forEach(function(input) {
      if (input.dataset[lang + 'Placeholder']) {
        input.placeholder = input.dataset[lang + 'Placeholder'];
      }
    });
    document.querySelectorAll('.lang-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    localStorage.setItem('umrah_admin_lang', lang);
  }
  function setupLanguageSwitcher() {
    var lang = localStorage.getItem('umrah_admin_lang') || 'ar';
    applyLanguage(lang);
    document.querySelectorAll('.lang-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        applyLanguage(btn.dataset.lang);
      });
    });
  }
  // If sidebar loads after DOMContentLoaded, also run language switcher for main content
  setupLanguageSwitcher();
});