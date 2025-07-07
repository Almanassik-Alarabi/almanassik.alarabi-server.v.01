let agencies = [];

// Helper to get token from localStorage
function getAuthToken() {
  return localStorage.getItem('umrah_admin_token') || '';
}

// عرض صورة قبل الرفع
function previewImage(input, imgId) {
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById(imgId).src = e.target.result;
      document.getElementById(imgId).style.display = "block";
      // Store base64 in hidden input
      if (imgId === "profilPreview") {
        document.querySelector('input[name="photo_profil"]').value = e.target.result;
      } else if (imgId === "coverPreview") {
        document.querySelector('input[name="photo_couverture"]').value = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  }
}

// جلب الوكالات من API وليس من supabase مباشرة
async function fetchAgencies() {
  try {
    const token = getAuthToken();
    const response = await fetch('http://192.168.100.23:3001/api/agencies/all', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('فشل الاتصال بـ API');
    const result = await response.json();
    agencies = Array.isArray(result) ? result : (result.agencies || []);
    renderAgencies();
  } catch (err) {
    agencies = [];
    renderAgencies();
    // إضافة رسالة توضيحية للمشكلة
    showErrorMessage('تعذر الاتصال بالخادم. تأكد أن السيرفر يعمل على http://192.168.100.23:3001 وأن إعدادات CORS صحيحة.');
  }
}

// عرض الوكالات بشكل احترافي (يعرض الصورة من url المخزن في قاعدة البيانات)
function renderAgencies(filtered = null) {
  const grid = document.getElementById("agenciesGrid");
  const list = filtered || agencies;
  grid.innerHTML = list.length
    ? list
        .map((agency) => {
          return `
        <div class="agency-card" data-id="${agency.id}">
          <div class="agency-header" style="background-image: url('${agency.background_url || "../assets/images/default-cover.jpg"}')">
            <div class="agency-logo">
              ${agency.logo_url
                ? `<img src="${agency.logo_url}" alt="Profile Picture" onerror="this.src='../assets/images/default-profile.jpg'">`
                : `<i class="fas fa-building"></i>`}
            </div>
          </div>
          <div class="agency-body">
            <h3 class="agency-name">${agency.name || ""}</h3>
            <div class="agency-email"><i class="fas fa-envelope"></i> ${agency.email || ""}</div>
            <div class="agency-info">
              <div class="agency-phone"><i class="fas fa-phone"></i> ${agency.phone || ""}</div>
              <span class="agency-status status-${agency.is_approved ? "active" : "pending"}">
                <span data-ar="${agency.is_approved ? "نشط" : "معلق"}" data-en="${agency.is_approved ? "Active" : "Pending"}" data-fr="${agency.is_approved ? "Actif" : "En attente"}">${agency.is_approved ? "نشط" : "معلق"}</span>
              </span>
            </div>
            <div class="agency-extra">
              ${agency.license_number
                ? `<div><i class="fas fa-id-card"></i> رخصة تجارية: ${agency.license_number}</div>`
                : ""}
              ${agency.wilaya
                ? `<div><i class="fas fa-map-marker-alt"></i> الولاية: ${agency.wilaya}</div>`
                : ""}
             
            </div>
            <div class="agency-actions">
              <button type="button" class="btn btn-success btn-sm" onclick="showAgencyDetails('${agency.id}')">
                <i class="fas fa-eye"></i>
                <span data-ar="عرض" data-en="View" data-fr="Voir">عرض</span>
              </button>
              <button type="button" class="btn btn-warning btn-sm" onclick="editAgency('${agency.id}')">
                <i class="fas fa-edit"></i>
                <span data-ar="تعديل" data-en="Edit" data-fr="Modifier">تعديل</span>
              </button>
              <button type="button" class="btn btn-danger btn-sm" onclick="deleteAgency('${agency.id}')">
                <i class="fas fa-trash"></i>
                <span data-ar="حذف" data-en="Delete" data-fr="Supprimer">حذف</span>
              </button>
            </div>
          </div>
        </div>
      `;
        })
        .join("")
    : `<div style="text-align:center;color:#888;padding:40px;">لا توجد وكالات حاليا</div>`;
}

// فتح نافذة إضافة وكالة
function openAddModal() {
  resetAddAgencyForm();
  document.getElementById("addAgencyModal").style.display = "block";
  document.body.style.overflow = "hidden";
  const form = document.getElementById("addAgencyForm");
  form.dataset.editId = "";
  document.getElementById("profilPreview").style.display = "none";
  document.getElementById("coverPreview").style.display = "none";
  // Email: enable and required in add mode, show it
  const emailInput = form.querySelector('[name="email"]');
  emailInput.disabled = false;
  emailInput.required = true;
  emailInput.value = '';
  emailInput.parentElement.style.display = '';
}
function closeAddModal() {
  document.getElementById("addAgencyModal").style.display = "none";
  document.body.style.overflow = "auto";
}
function resetAddAgencyForm() {
  document.getElementById("addAgencyForm").reset();
  document.getElementById("addAgencyForm").dataset.editId = "";
  document.getElementById("profilPreview").style.display = "none";
  document.getElementById("coverPreview").style.display = "none";
}

// إضافة أو تعديل وكالة مع إرسال الصور كـ base64
async function submitAddAgency(event) {
  event.preventDefault();
  const form = event.target;

  // إظهار مؤشر جاري التنفيذ
  showNotification('جاري إرسال البيانات ...', 'info');

  // اجلب base64 من الحقول المخفية
  let logo = form.photo_profil.value;
  let background = form.photo_couverture.value;

  // حفظ البيانات عبر API
  const agencyData = {
    name: form.nom_agence.value,
    email: form.email.value,
    phone: form.telephone.value,
    wilaya: form.wilaya.value,
    license_number: form.commercial_license_number.value,
    logo, // base64 or empty
    background, // base64 or empty
    latitude: form.latitude.value,
    longitude: form.longitude.value,
    location_name: form.full_address.value, // location_name = full_address
    full_address: form.full_address.value,
    is_approved: form.approuve.checked,
    // add other fields as needed
  };
  const editId = form.dataset.editId;
  let result;
  const token = getAuthToken();
  try {
      let response;
      if (editId) {
        response = await fetch(`http://192.168.100.23:3001/api/agencies/update/${editId}`, {
          method: "PUT",
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(agencyData)
        });
      } else {
        response = await fetch('http://192.168.100.23:3001/api/agencies/add', {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ...agencyData, password: '12345678' })
        });
      }
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        throw new Error('الخادم أعاد استجابة غير متوقعة: ' + text);
      }
      if (!response.ok) throw new Error(result.error || 'فشل العملية');
      closeAddModal();
      fetchAgencies();
      showSuccessMessage(editId ? "تم تعديل الوكالة بنجاح" : "تمت إضافة الوكالة بنجاح");
    } catch (err) {
      showErrorMessage(err.message || "حدث خطأ أثناء الحفظ");
    }
}

// عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("addAgencyForm")
    .addEventListener("submit", submitAddAgency);
  fetchAgencies();
});

// تعديل وكالة
function editAgency(id) {
  const agency = agencies.find((a) => a.id === id);
  if (!agency) return;
  openAddModal();
  const form = document.getElementById("addAgencyForm");
  form.nom_agence.value = agency.name || "";
  // Email: disable and remove required in edit mode, show it
  const emailInput = form.querySelector('[name="email"]');
  emailInput.value = agency.email || "";
  emailInput.disabled = true;
  emailInput.required = false;
  emailInput.parentElement.style.display = '';
  form.telephone.value = agency.phone || "";
  form.wilaya.value = agency.wilaya || "";
  form.commercial_license_number.value = agency.license_number || "";
  // الصور: يجب تعبئة الحقول المخفية بقيم base64 أو تركها فارغة
  form.photo_profil.value = "";
  form.photo_couverture.value = "";
  // إذا كانت الصور موجودة كروابط، اعرضها فقط في المعاينة
  if (agency.logo_url) {
    document.getElementById("profilPreview").src = agency.logo_url;
    document.getElementById("profilPreview").style.display = "block";
  } else {
    document.getElementById("profilPreview").style.display = "none";
  }
  if (agency.background_url) {
    document.getElementById("coverPreview").src = agency.background_url;
    document.getElementById("coverPreview").style.display = "block";
  } else {
    document.getElementById("coverPreview").style.display = "none";
  }
  // العنوان والموقع
  form.full_address.value = agency.full_address || agency.location_name || '';
  form.latitude.value = agency.latitude || '';
  form.longitude.value = agency.longitude || '';
  form.approuve.checked = !!agency.is_approved;
  form.dataset.editId = agency.id;
  // تأكد من تعبئة حقول الإدخال المرتبطة بالـ id
  document.getElementById('fullAddressInput').value = agency.full_address || agency.location_name || '';
  document.getElementById('wilayaInput').value = agency.wilaya || '';
  document.getElementById('latitudeInput').value = agency.latitude || '';
  document.getElementById('longitudeInput').value = agency.longitude || '';
}

// عرض تفاصيل الوكالة بشكل احترافي (يعرض الصورة من url المخزن في قاعدة البيانات)
function showAgencyDetails(id) {
  const agency = agencies.find((a) => a.id === id);
  if (!agency) return;
  let html = `
    <div style="text-align:center; margin-bottom: 20px;">
      <div style="display: flex; justify-content: center; gap: 24px; align-items: flex-end;">
        <div style="position: relative;">
          <img src="${agency.background_url || "../assets/images/default-cover.jpg"}"
            alt="غلاف"
            style="width: 100%; height: 100%; object-fit: cover; border-radius: 14px; box-shadow: 0 2px 12px #0002; border: 2px solid #eee;">
          <img src="${agency.logo_url || "../assets/images/default-profile.jpg"}"
            alt="صورة"
            style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; position: absolute; left: 50%; bottom: -30px; transform: translateX(-50%); border: 4px solid #fff; box-shadow: 0 2px 8px #0002;left : 50%; ">
        </div>
      </div>
      <div style="margin-top: 45px;">
        <h3 style="margin:10px 0 5px 0;">${agency.name || ""}</h3>
        <span class="agency-status status-${agency.is_approved ? "active" : "pending"}"
          style="padding:3px 10px;border-radius:8px;background:${agency.is_approved ? "#d4f5e9" : "#ffe6c1"};color:${agency.is_approved ? "#1a7f5a" : "#b77d00"};font-size:13px;">
          ${agency.is_approved ? "نشطة" : "معلقة"}
        </span>
      </div>
    </div>
    <div style="margin-top:15px;">
      <div><b>البريد:</b> ${agency.email || ""}</div>
      <div><b>الهاتف:</b> ${agency.phone || ""}</div>
      <div><b>الولاية:</b> ${agency.wilaya || ""}</div>
      <div><b>العنوان:</b> ${agency.location_name || ""}</div>
      <div><b>رخصة تجارية:</b> ${agency.license_number || ""}</div>
      <div><b>الحساب البنكي:</b> ${agency.bank_account || ""}</div>
      <div><b>الموقع:</b> ${agency.latitude || ""}, ${agency.longitude || ""}</div>
      ${
        agency.latitude && agency.longitude
          ? `<div style="margin-top:10px;">
              <div id="agencyDetailsMap" style="width:100%;height:250px;border-radius:10px;"></div>
            </div>`
          : ""
      }
    </div>
  `;

  // بعد إدراج html، إذا كان هناك إحداثيات، اعرض الخريطة
  setTimeout(() => {
    if (agency.latitude && agency.longitude && document.getElementById('agencyDetailsMap')) {
      // تأكد من تحميل Leaflet
      if (typeof L !== "undefined") {
        const map = L.map('agencyDetailsMap').setView([agency.latitude, agency.longitude], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        L.marker([agency.latitude, agency.longitude]).addTo(map);
      } else {
        document.getElementById('agencyDetailsMap').innerHTML = '<div style="color:red;text-align:center;padding:30px;">خريطة غير متوفرة</div>';
      }
    }
  }, 100);
  document.getElementById("agencyDetailsContent").innerHTML = html;
  document.getElementById("agencyDetailsModal").style.display = "block";
  document.body.style.overflow = "hidden";
}
function closeAgencyDetailsModal() {
  document.getElementById("agencyDetailsModal").style.display = "none";
  document.body.style.overflow = "auto";
}

// حذف وكالة وعروضها
async function deleteAgency(id) {
  if (!confirm("هل أنت متأكد أنك تريد حذف هذه الوكالة وجميع عروضها؟")) return;
  try {
    const token = getAuthToken();
    const response = await fetch(`http://192.168.100.23:3001/api/agencies/remove/${id}`, {
      method: "DELETE",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error("فشل حذف الوكالة من الخادم");
    fetchAgencies();
    showSuccessMessage("تم حذف الوكالة وجميع عروضها بنجاح");
  } catch (err) {
    showErrorMessage("فشل حذف الوكالة: " + (err.message || err));
  }
}

// البحث
function searchAgencies(searchTerm) {
  searchTerm = searchTerm.trim().toLowerCase();
  if (!searchTerm) {
    renderAgencies();
    return;
  }
  const filtered = agencies.filter(
    (a) =>
      (a.name && a.name.toLowerCase().includes(searchTerm)) ||
      (a.email && a.email.toLowerCase().includes(searchTerm)) ||
      (a.phone && a.phone.toLowerCase().includes(searchTerm)) ||
      (a.wilaya && a.wilaya.toLowerCase().includes(searchTerm)) ||
      (a.license_number && a.license_number.toLowerCase().includes(searchTerm))
  );
  renderAgencies(filtered);
}

// تصدير البيانات CSV
function exportData() {
  if (!agencies.length) return;
  const header = Object.keys(agencies[0]);
  const csv = [
    header.join(","),
    ...agencies.map((row) =>
    header
      .map(
      (field) =>
        `"${(row[field] || "").toString().replace(/"/g, '""')}"`
      )
      .join(",")
    ),
  ].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "agencies.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// رسالة نجاح عائمة
function showSuccessMessage(message) {
  showNotification(message, 'success');
}
function showErrorMessage(message) {
  showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
  // Remove any existing notification
  const old = document.getElementById('customNotification');
  if (old) old.remove();
  const notif = document.createElement('div');
  notif.id = 'customNotification';
  notif.style.position = 'fixed';
  notif.style.top = '30px';
  notif.style.left = '50%';
  notif.style.transform = 'translateX(-50%)';
  notif.style.zIndex = '99999';
  notif.style.background = type === 'success' ? '#4caf50' : (type === 'error' ? '#f44336' : '#2196f3');
  notif.style.color = '#fff';
  notif.style.padding = '16px 32px';
  notif.style.borderRadius = '8px';
  notif.style.boxShadow = '0 2px 12px #0002';
  notif.style.fontSize = '1.1rem';
  notif.style.fontWeight = 'bold';
  notif.style.textAlign = 'center';
  notif.style.opacity = '0.98';
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => {
    notif.style.transition = 'opacity 0.5s';
    notif.style.opacity = '0';
    setTimeout(() => notif.remove(), 500);
  }, 2500);
}

// قائمة ولايات الجزائر بالعربية والفرنسية
const wilayas = [
  { ar: "أدرار", fr: "Adrar" },
  { ar: "الشلف", fr: "Chlef" },
  { ar: "الأغواط", fr: "Laghouat" },
  { ar: "أم البواقي", fr: "Oum El Bouaghi" },
  { ar: "باتنة", fr: "Batna" },
  { ar: "بجاية", fr: "Béjaïa" },
  { ar: "بسكرة", fr: "Biskra" },
  { ar: "بشار", fr: "Béchar" },
  { ar: "البليدة", fr: "Blida" },
  { ar: "البويرة", fr: "Bouira" },
  { ar: "تمنراست", fr: "Tamanrasset" },
  { ar: "تبسة", fr: "Tébessa" },
  { ar: "تلمسان", fr: "Tlemcen" },
  { ar: "تيارت", fr: "Tiaret" },
  { ar: "تيزي وزو", fr: "Tizi Ouzou" },
  { ar: "الجزائر", fr: "Alger" },
  { ar: "الجلفة", fr: "Djelfa" },
  { ar: "جيجل", fr: "Jijel" },
  { ar: "سطيف", fr: "Sétif" },
  { ar: "سعيدة", fr: "Saïda" },
  { ar: "سكيكدة", fr: "Skikda" },
  { ar: "سيدي بلعباس", fr: "Sidi Bel Abbès" },
  { ar: "عنابة", fr: "Annaba" },
  { ar: "قالمة", fr: "Guelma" },
  { ar: "قسنطينة", fr: "Constantine" },
  { ar: "المدية", fr: "Médéa" },
  { ar: "مستغانم", fr: "Mostaganem" },
  { ar: "المسيلة", fr: "M'Sila" },
  { ar: "معسكر", fr: "Mascara" },
  { ar: "ورقلة", fr: "Ouargla" },
  { ar: "وهران", fr: "Oran" },
  { ar: "البيض", fr: "El Bayadh" },
  { ar: "إليزي", fr: "Illizi" },
  { ar: "برج بوعريريج", fr: "Bordj Bou Arreridj" },
  { ar: "بومرداس", fr: "Boumerdès" },
  { ar: "الطارف", fr: "El Tarf" },
  { ar: "تندوف", fr: "Tindouf" },
  { ar: "تيسمسيلت", fr: "Tissemsilt" },
  { ar: "الوادي", fr: "El Oued" },
  { ar: "خنشلة", fr: "Khenchela" },
  { ar: "سوق أهراس", fr: "Souk Ahras" },
  { ar: "تيبازة", fr: "Tipaza" },
  { ar: "ميلة", fr: "Mila" },
  { ar: "عين الدفلى", fr: "Aïn Defla" },
  { ar: "النعامة", fr: "Naâma" },
  { ar: "عين تموشنت", fr: "Aïn Témouchent" },
  { ar: "غرداية", fr: "Ghardaïa" },
  { ar: "غليزان", fr: "Relizane" },
];

// اقتراح ولايات ديناميكي
function filterWilayas(val) {
  const input = val.trim().toLowerCase();
  const suggestions = wilayas.filter(
    (w) => w.ar.includes(input) || w.fr.toLowerCase().includes(input)
  );
  const list = suggestions
    .map(
    (w) =>
      `<div class="suggestion-item" onclick="selectWilaya('${w.ar}', '${w.fr}')">${w.ar} / ${w.fr}</div>`
    )
    .join("");
  document.getElementById("wilayaSuggestions").innerHTML = list;
  document.getElementById("wilayaSuggestions").style.display = list
    ? "block"
    : "none";
}
function selectWilaya(ar, fr) {
  const input = document.getElementById("wilayaInput");
  // إذا كتب بالعربية أو الفرنسية، نضع ما كتبه المستخدم
  const userLang = input.value.match(/[ء-ي]/) ? "ar" : "fr";
  input.value = userLang === "ar" ? ar : fr;
  document.getElementById("wilayaSuggestions").style.display = "none";
}
// إغلاق القائمة عند فقدان التركيز
document.addEventListener("click", function (e) {
  if (!e.target.closest(".form-group")) {
    document.getElementById("wilayaSuggestions").style.display = "none";
  }
});

// الموقع الجغرافي: تلقائي أو من الخريطة
function getCurrentLocation() {
  if (!navigator.geolocation) {
    showErrorMessage("المتصفح لا يدعم تحديد الموقع الجغرافي");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    function (pos) {
      document.getElementById("latitudeInput").value =
        pos.coords.latitude;
      document.getElementById("longitudeInput").value =
        pos.coords.longitude;
    },
    function () {
      showErrorMessage("تعذر الحصول على الموقع تلقائياً");
    },
    { enableHighAccuracy: true }
  );
}

// خريطة الجزائر
let map, marker;
function openMapModal() {
  document.getElementById("mapModal").style.display = "block";
  document.body.style.overflow = "hidden";
  setTimeout(() => {
    if (!map) {
      map = L.map("map").setView([28.0339, 1.6596], 5); // الجزائر
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      map.on("click", function (e) {
        if (marker) map.removeLayer(marker);
        marker = L.marker(e.latlng).addTo(map);
      });
    } else {
      map.invalidateSize();
    }
  }, 200);
}
function closeMapModal() {
  document.getElementById("mapModal").style.display = "none";
  document.body.style.overflow = "auto";
}
function confirmMapLocation() {
  if (!marker) {
    showErrorMessage("اختر موقعاً من الخريطة أولاً");
    return;
  }
  const latlng = marker.getLatLng();
  document.getElementById("latitudeInput").value = latlng.lat;
  document.getElementById("longitudeInput").value = latlng.lng;
  closeMapModal();
}

// Language switcher for main content and sidebar
function applyLanguage(lang) {
  // Update all elements with data-ar, data-en, data-fr
  document.querySelectorAll('[data-ar], [data-en], [data-fr]').forEach(function(el) {
    if (el.dataset[lang]) {
      el.textContent = el.dataset[lang];
    }
  });
  // Update placeholder attributes for inputs
  document.querySelectorAll('[data-ar-placeholder], [data-en-placeholder], [data-fr-placeholder]').forEach(function(input) {
    if (input.dataset[lang + 'Placeholder']) {
      input.placeholder = input.dataset[lang + 'Placeholder'];
    }
  });
  // Update language button active state
  document.querySelectorAll('.lang-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  // Save language to localStorage
  localStorage.setItem('umrah_admin_lang', lang);
}
function setupLanguageSwitcher() {
  // Set initial language from localStorage or default to 'ar'
  var lang = localStorage.getItem('umrah_admin_lang') || 'ar';
  applyLanguage(lang);
  // Add event listeners
  document.querySelectorAll('.lang-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      applyLanguage(btn.dataset.lang);
    });
  });
}
document.addEventListener('DOMContentLoaded', function() {
  fetch('sidebar.html')
    .then(response => response.text())
    .then(html => {
      document.getElementById('sidebar').innerHTML = html;
      // Highlight the active sidebar link based on current page
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
      setupLanguageSwitcher();
    });
  // If sidebar loads after DOMContentLoaded, also run language switcher for main content
  setupLanguageSwitcher();
});

// Address suggestions using Nominatim
let addressTimeout;
function addressSuggestions(val) {
  clearTimeout(addressTimeout);
  const input = val.trim();
  if (!input) {
    document.getElementById('addressSuggestionsList').innerHTML = '';
    document.getElementById('addressSuggestionsList').style.display = 'none';
    return;
  }
  addressTimeout = setTimeout(async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(input)}`;
      const response = await fetch(url, { headers: { 'Accept-Language': 'ar,en' } });
      const results = await response.json();
      if (results && results.length > 0) {
        const list = results.slice(0, 5).map(place =>
          `<div class="suggestion-item" onclick="selectAddressSuggestion('${encodeURIComponent(place.display_name)}', '${place.lat}', '${place.lon}', '${(place.address && (place.address.state || place.address.county || '')) || ''}')">${place.display_name}</div>`
        ).join('');
        document.getElementById('addressSuggestionsList').innerHTML = list;
        document.getElementById('addressSuggestionsList').style.display = 'block';
      } else {
        document.getElementById('addressSuggestionsList').innerHTML = '';
        document.getElementById('addressSuggestionsList').style.display = 'none';
      }
    } catch (err) {
      document.getElementById('addressSuggestionsList').innerHTML = '';
      document.getElementById('addressSuggestionsList').style.display = 'none';
    }
  }, 300);
}
function selectAddressSuggestion(encodedDisplayName, lat, lon, state) {
  const displayName = decodeURIComponent(encodedDisplayName);
  document.getElementById('fullAddressInput').value = displayName;
  document.getElementById('latitudeInput').value = lat;
  document.getElementById('longitudeInput').value = lon;
  document.getElementById('wilayaInput').value = state;
  document.getElementById('addressSuggestionsList').innerHTML = '';
  document.getElementById('addressSuggestionsList').style.display = 'none';
  // Optionally, set location_name to the address
  // document.getElementsByName('location_name')[0].value = displayName;
}

// Geocode address using OpenStreetMap Nominatim
async function geocodeAddress() {
  const address = document.getElementById('fullAddressInput').value.trim();
  if (!address) return;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(address)}`;
    const response = await fetch(url, { headers: { 'Accept-Language': 'ar,en' } });
    const results = await response.json();
    if (results && results.length > 0) {
      const place = results[0];
      document.getElementById('latitudeInput').value = place.lat;
      document.getElementById('longitudeInput').value = place.lon;
      if (place.display_name) {
        document.getElementById('fullAddressInput').value = place.display_name;
      }
      if (place.address && place.address.state) {
        document.getElementById('wilayaInput').value = place.address.state;
      } else if (place.address && place.address.county) {
        document.getElementById('wilayaInput').value = place.address.county;
      }
    } else {
      showErrorMessage('لم يتم العثور على نتائج لهذا العنوان.');
    }
  } catch (err) {
    showErrorMessage('حدث خطأ أثناء جلب بيانات العنوان.');
  }
}