// manage_offers.js

// Helper function to handle API requests (supports FormData for file uploads)
async function apiRequest(url, method = "GET", data = null) {
  let options = { method };

  if (data instanceof FormData) {
    options.body = data;
    // لا تضع Content-Type عند استخدام FormData
  } else if (data) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(data);
  } else {
    options.headers = { "Content-Type": "application/json" };
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "حدث خطأ في الاتصال بالخادم");
  }
  return response.json();
}

// إضافة عرض جديد (يدعم رفع ملفات)
async function addOffer(offerOrFormData) {
  return apiRequest(
    "http://192.168.100.23:3001/api/offers/add",
    "POST",
    offerOrFormData
  );
}

// جلب جميع العروض
async function getAllOffers() {
  return apiRequest("http://192.168.100.23:3001/api/offers/all");
}

// تعديل عرض (يدعم رفع ملفات)
async function updateOffer(id, updatedFieldsOrFormData) {
  return apiRequest(
    `http://192.168.100.23:3001/api/offers/update/${id}`,
    "PUT",
    updatedFieldsOrFormData
  );
}

// حذف عرض مع إرسال التوكن
async function deleteOffer(id) {
  const token = localStorage.getItem("umrah_admin_token");
  const url = `http://192.168.100.23:3001/api/offers/delete/${id}`;
  const options = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? "Bearer " + token : "",
    },
  };
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "فشل حذف العرض");
  }
  return response.json();
}

// مثال على الاستخدام (يمكن ربطها مع واجهة المستخدم)
window.manageOffers = {
  addOffer,
  getAllOffers,
  updateOffer,
  deleteOffer,
};

// === دعم تغيير اللغة للعروض ===
function applyOffersLanguage(lang) {
  // تغيير النصوص الثابتة
  document
    .querySelectorAll("[data-ar], [data-en], [data-fr]")
    .forEach(function (el) {
      if (el.dataset[lang]) {
        el.textContent = el.dataset[lang];
      }
    });
  // تغيير placeholder البحث
  var searchInput = document.getElementById("searchOffers");
  if (searchInput && searchInput.dataset[lang + "Placeholder"]) {
    searchInput.placeholder = searchInput.dataset[lang + "Placeholder"];
  }
}

function setupOffersLanguageSwitcher() {
  var lang = localStorage.getItem("umrah_admin_lang") || "ar";
  applyOffersLanguage(lang);
  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.lang === lang);
    btn.onclick = function () {
      localStorage.setItem("umrah_admin_lang", btn.dataset.lang);
      applyOffersLanguage(btn.dataset.lang);
      document.querySelectorAll(".lang-btn").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      // إعادة تحميل العروض باللغة الجديدة إذا كان الـ API يدعم ذلك
      loadAndRenderOffers();
    };
  });
}

// تحميل الشريط الجانبي وجلب وعرض العروض عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", function () {
  // تحميل الشريط الجانبي
  fetch("sidebar.html")
    .then((response) => response.text())
    .then((html) => {
      document.getElementById("sidebar").innerHTML = html;
      // تمييز الصفحة الحالية
      var current = window.location.pathname.split("/").pop();
      if (!current || current === "") current = "dashboard.html";
      var interval = setInterval(function () {
        var links = document.querySelectorAll(".sidebar-menu a");
        if (links.length) {
          links.forEach(function (link) {
            link.classList.remove("active");
            var href = link.getAttribute("href");
            if (href && href !== "#" && current === href) {
              link.classList.add("active");
            }
          });
          clearInterval(interval);
        }
      }, 10);
      setupOffersLanguageSwitcher();
    });

  // جلب وعرض العروض
  loadAndRenderOffers();

  // تفعيل زر إضافة عرض
  const addOfferModal = document.getElementById("addOfferModal");
  const mainContent = document.getElementById("mainContent");
  const openBtn = document.getElementById("openAddOfferModalBtn");
  const closeBtn = document.getElementById("closeAddOfferModalBtn");
  const cancelBtn = document.getElementById("cancelAddOfferBtn");

  if (openBtn) {
    openBtn.onclick = function () {
      addOfferModal.style.display = "flex";
      document.body.style.overflow = "hidden";
      addOfferModal.style.zIndex = "99999";
      if (mainContent) mainContent.classList.add("modal-open");
      addOfferModal.classList.add('show');
      populateAgenciesSelect();
      populateAirlinesSelect();
    };
  }
  if (closeBtn) {
    closeBtn.onclick = function () {
      addOfferModal.style.display = "none";
      document.body.style.overflow = "";
      document.getElementById("addOfferForm").reset();
      addOfferModal.style.zIndex = "";
      if (mainContent) mainContent.classList.remove("modal-open");
      addOfferModal.classList.remove('show');
    };
  }
  if (cancelBtn) {
    cancelBtn.onclick = function () {
      addOfferModal.style.display = "none";
      document.body.style.overflow = "";
      document.getElementById("addOfferForm").reset();
      addOfferModal.style.zIndex = "";
      if (mainContent) mainContent.classList.remove("modal-open");
      addOfferModal.classList.remove('show');
    };
  }

  // --- أيقونات الخدمات المتاحة ---
  const SERVICE_ICONS = [
    { key: "visa",    label: "تأشيرة", icon: "🛂" },
    { key: "meals",   label: "الإطعام", icon: "🍽️" },
    { key: "transport", label: "النقل", icon: "🚌" },
    { key: "guide",   label: "الإرشاد", icon: "🧑‍🏫" },
    { key: "flight",  label: "طيران", icon: "✈️" },
  ];

  // --- إدراج أيقونات الخدمات في نموذج إضافة عرض ---
  const servicesIconsContainer = document.getElementById("servicesIconsContainer");
  const servicesInput = document.getElementById("servicesInput");
  if (servicesIconsContainer && servicesInput) {
    servicesIconsContainer.innerHTML = SERVICE_ICONS.map(s =>
      `<div class="service-icon-select" data-key="${s.key}" title="${s.label}">
        <span class="icon">${s.icon}</span>
        <span class="label">${s.label}</span>
      </div>`
    ).join("");
    servicesIconsContainer.querySelectorAll(".service-icon-select").forEach(el => {
      el.onclick = function() {
        el.classList.toggle("selected");
        updateServicesInputFromIcons();
      };
    });
    function updateServicesInputFromIcons() {
      const selected = Array.from(servicesIconsContainer.querySelectorAll(".service-icon-select.selected"))
        .map(el => el.dataset.key);
      servicesInput.value = selected.join(",");
    }
  }

  // --- عرض الأسعار بأيقونات أشخاص فقط في نموذج إضافة عرض ---
  const priceLabels = [
    { id: "price_double_label", n: 2 },
    { id: "price_triple_label", n: 3 },
    { id: "price_quad_label", n: 4 },
    { id: "price_quint_label", n: 5 },
  ];
  priceLabels.forEach(({id, n}) => {
    const el = document.getElementById(id);
    if (el) {
      let icon = `<span style='font-size:1.3em;color:#176a3d;'>&#128100;</span>`.repeat(n);
      el.innerHTML = `<span style='display:inline-flex;gap:2px;'>${icon}</span>`;
    }
  });
});

// دالة لجلب وعرض العروض
let allOffersCache = [];
async function loadAndRenderOffers() {
  const grid = document.getElementById("offersGrid");
  grid.innerHTML =
    '<div style="text-align:center;color:#888;padding:40px;">جاري التحميل...</div>';
  try {
    const lang = localStorage.getItem("umrah_admin_lang") || "ar";
    const token = localStorage.getItem("umrah_admin_token");
    let url = "http://192.168.100.23:3001/api/offers/all?lang=" + lang;
    const response = await fetch(url, {
      headers: {
        Authorization: token ? "Bearer " + token : "",
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      // عرض رسالة الخطأ القادمة من السيرفر إن وجدت
      let errMsg = "فشل تحميل العروض";
      try {
        const err = await response.clone().json();
        if (err && (err.message || err.error)) errMsg = err.message || err.error;
      } catch {}
      grid.innerHTML =
        '<div style="color:red;text-align:center;padding:40px;">' + errMsg + '</div>';
      return;
    }
    const data = await response.json();
    const offers = data.offers || [];
    allOffersCache = offers; // حفظ كل العروض في الكاش للبحث
    renderOffers(offers);
  } catch (err) {
    grid.innerHTML =
      '<div style="color:red;text-align:center;padding:40px;">' +
      (err && err.message ? err.message : "فشل تحميل العروض") +
      '</div>';
  }
}

// --- أيقونات الخدمات المتاحة ---
const SERVICE_ICONS = [
  { key: "visa",    label: "تأشيرة", icon: "🛂" },
  { key: "meals",   label: "الإطعام", icon: "🍽️" },
  { key: "transport", label: "النقل", icon: "🚌" },
  { key: "guide",   label: "الإرشاد", icon: "🧑‍🏫" },
  { key: "flight",  label: "طيران", icon: "✈️" },
];

// --- إدراج أيقونات الخدمات في نموذج إضافة عرض (تفاعلية وجميلة) ---
document.addEventListener("DOMContentLoaded", function () {
  const servicesIconsContainer = document.getElementById("servicesIconsContainer");
  const servicesInput = document.getElementById("servicesInput");
  if (servicesIconsContainer && servicesInput) {
    servicesIconsContainer.innerHTML = SERVICE_ICONS.map(s =>
      `<div class="service-icon-select" data-key="${s.key}" title="${s.label}">
        <span class="icon">${s.icon}</span>
        <span class="label">${s.label}</span>
      </div>`
    ).join("");
    servicesIconsContainer.querySelectorAll(".service-icon-select").forEach(el => {
      el.onclick = function() {
        el.classList.toggle("selected");
        updateServicesInputFromIcons();
      };
      el.onkeydown = function(e) {
        if (e.key === "Enter" || e.key === " ") {
          el.classList.toggle("selected");
          updateServicesInputFromIcons();
        }
      };
      el.tabIndex = 0;
      el.style.transition = "transform 0.15s, box-shadow 0.15s";
      el.onmouseover = function() { el.style.transform = "scale(1.08)"; el.style.boxShadow = "0 6px 24px #176a3d33"; };
      el.onmouseout = function() { el.style.transform = ""; el.style.boxShadow = ""; };
    });
    function updateServicesInputFromIcons() {
      const selected = Array.from(servicesIconsContainer.querySelectorAll(".service-icon-select.selected"))
        .map(el => el.dataset.key);
      servicesInput.value = selected.join(",");
    }
  }
});


// --- عرض الأسعار بأيقونات أشخاص فقط في نموذج إضافة عرض ---
document.addEventListener("DOMContentLoaded", function () {
  // استبدال تسميات الأسعار بأيقونات: دائماً "مستخدمين" ثم "مجموعة مستخدمين"
  const priceLabels = [
    { id: "price_double_label", icon: '<i class="fa-solid fa-users"></i><i class="fa-solid fa-user-group"></i>' },
    { id: "price_triple_label", icon: '<i class="fa-solid fa-users"></i><i class="fa-solid fa-user-group"></i>' },
    { id: "price_quad_label", icon: '<i class="fa-solid fa-users"></i><i class="fa-solid fa-user-group"></i>' },
    { id: "price_quint_label", icon: '<i class="fa-solid fa-users"></i><i class="fa-solid fa-user-group"></i>' },
  ];
  priceLabels.forEach(({id, icon}) => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `<span style='display:inline-flex;gap:2px;color:#176a3d;font-size:1.3em;'>${icon}</span>`;
    }
  });

  // --- حساب مدة الرحلة تلقائياً ---
  const depInput = document.querySelector('input[name="departure_date"]');
  const retInput = document.querySelector('input[name="return_date"]');
  const durInput = document.querySelector('input[name="duration_days"]');
  function updateDuration() {
    if (depInput && retInput && durInput && depInput.value && retInput.value) {
      const dep = new Date(depInput.value);
      const ret = new Date(retInput.value);
      if (!isNaN(dep) && !isNaN(ret) && ret >= dep) {
        const diff = Math.round((ret - dep) / (1000 * 60 * 60 * 24)) + 1;
        durInput.value = diff;
      } else {
        durInput.value = '';
      }
    }
  }
  if (depInput && retInput && durInput) {
    depInput.addEventListener('change', updateDuration);
    retInput.addEventListener('change', updateDuration);
  }
});

// دالة لجلب وعرض العروض
function renderOffers(offers) {
  const grid = document.getElementById("offersGrid");
  if (!offers.length) {
    grid.innerHTML =
      '<div style="text-align:center;color:#888;padding:40px;">لا توجد عروض حاليا</div>';
    return;
  }
  grid.innerHTML = offers
    .map(
      (offer) => {
        // صورة العرض
        let mainImage = '';
        if (offer.main_image && (offer.main_image.startsWith('data:image') || offer.main_image.match(/^https?:\/\//))) {
          mainImage = offer.main_image;
        } else {
          mainImage = 'public/admin/img/default.jpg';
        }
        // --- السعر الخماسي فقط ---
        let priceQuint = offer.price_quint ? offer.price_quint : null;
        // --- دائرة السعر ---
        let priceCircle = priceQuint ? `
          <div class="price-circle">
            <div class="people-icons" style="display:flex;flex-direction:row;justify-content:center;align-items:center;width:100%;margin-bottom:2px;gap:0;">
              <span style='display:inline-flex;gap:2px;color:#176a3d;font-size:1.3em;'><i class="fa-solid fa-users"></i><i class="fa-solid fa-user-group"></i></span>
            </div>
            <div class="price-val">${priceQuint} <span class="da">DA</span></div>
          </div>
        ` : `<div class="price-circle no-price">لا يوجد</div>`;
        // --- المعلومات الأساسية فقط ---
        return `
      <div class="agency-card">
        <div class="agency-header" style="background-image:url('${mainImage}')"></div>
        <div class="agency-body">
          <h3 class="agency-name">${offer.title || ""}</h3>
          <div class="agency-extra">${offer.hotel_name ? `<b>الفندق:</b> ${offer.hotel_name}` : ""}</div>
          <div class="agency-extra">${offer.description || ""}</div>
          <div class="agency-extra">
            <b>الخدمات:</b>
            <span style="display:inline-flex;gap:8px;vertical-align:middle;font-size:1.7em;">
              ${getServiceIcons(offer.services)}
            </span>
          </div>
          <div class="agency-extra" style="display:flex;justify-content:center;align-items:center;margin:18px 0 0 0;">
            ${priceCircle}
          </div>
          <div class="agency-actions">
            <button class="btn btn-info btn-sm" onclick="showOfferDetailsById('${offer.id}')"><i class="fas fa-eye"></i> تفاصيل</button>
            <button class="btn btn-danger btn-sm" onclick="(function(){if(confirm('هل أنت متأكد أنك تريد حذف هذا العرض؟')){deleteOffer('${offer.id}').then(()=>{alert('تم حذف العرض بنجاح');loadAndRenderOffers();}).catch(()=>{alert('فشل حذف العرض');});}})();"><i class="fas fa-trash-alt"></i> حذف</button>
          </div>
        </div>
      </div>
    `;
      }
    )
    .join("");
}

// تفعيل البحث الفوري
const searchInput = document.getElementById("searchOffers");
if (searchInput) {
  searchInput.addEventListener("input", function () {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      renderOffers(allOffersCache);
      return;
    }
    const filtered = allOffersCache.filter((offer) => {
      return (
        (offer.title && offer.title.toLowerCase().includes(q)) ||
        (offer.description && offer.description.toLowerCase().includes(q)) ||
        (offer.hotel_name && offer.hotel_name.toLowerCase().includes(q)) ||
        (offer.price_double && String(offer.price_double).includes(q)) ||
        (offer.services && Object.keys(offer.services).filter(k => offer.services[k]).join('، ').toLowerCase().includes(q))
      );
    });
    renderOffers(filtered);
  });
}

// تفعيل زر x لإغلاق نافذة إضافة عرض
const closeBtn = document.getElementById("closeAddOfferModalBtn");
if (closeBtn) {
  closeBtn.onclick = function () {
    const addOfferModal = document.getElementById("addOfferModal");
    if (addOfferModal) addOfferModal.style.display = "none";
    document.body.style.overflow = "";
    const addOfferForm = document.getElementById("addOfferForm");
    if (addOfferForm) addOfferForm.reset();
    addOfferModal.style.zIndex = "";
    const mainContent = document.getElementById("mainContent");
    if (mainContent) mainContent.classList.remove("modal-open");
    addOfferModal.classList.remove('show');
  };
}

// --- تفاصيل العرض: جلب اسم وإيميل الوكالة بدلاً من id ---
async function showOfferDetailsById(offerId) {
  const modal = document.getElementById("offerDetailsModal");
  const content = document.getElementById("offerDetailsContent");
  modal.style.display = "flex";
  modal.style.alignItems = "flex-start";
  modal.style.justifyContent = "center";
  modal.style.padding = "60px 0 0 0";
  modal.style.background = "rgba(34,40,49,0.85)";
  modal.style.transition = "background 0.3s";
  document.body.style.overflow = "hidden";
  content.innerHTML = `
    <div style="text-align:center;padding:48px;font-size:18px;color:#176a3d;">
      <span style="display:inline-block;width:32px;height:32px;border:4px solid #eee;border-top:4px solid #176a3d;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:12px;"></span>
      <br>جاري تحميل تفاصيل العرض...
    </div>
    <style>
      @keyframes spin { 100% { transform: rotate(360deg); } }
    </style>
  `;
  try {
    const lang = localStorage.getItem("umrah_admin_lang") || "ar";
    const token = localStorage.getItem("umrah_admin_token");
    // جلب العروض
    const offersRes = await fetch(
      `http://192.168.100.23:3001/api/offers/all?lang=${lang}`,
      {
        headers: {
          Authorization: token ? "Bearer " + token : "",
          "Content-Type": "application/json",
        },
      }
    );
    if (!offersRes.ok) throw new Error("فشل جلب تفاصيل العرض");
    const offersData = await offersRes.json();
    const offer = (offersData.offers || []).find((o) => o.id == offerId);
    if (!offer) throw new Error("العرض غير موجود");
    // جلب بيانات الوكالة
    let agencyName = "";
    let agencyEmail = "";
    if (offer.agency_id) {
      const agenciesRes = await fetch('http://192.168.100.23:3001/api/agencies/all', {
        headers: {
          Authorization: token ? "Bearer " + token : "",
          "Content-Type": "application/json",
        },
      });
      if (agenciesRes.ok) {
        const agenciesData = await agenciesRes.json();
        const agenciesArr = Array.isArray(agenciesData) ? agenciesData : (agenciesData.agencies || []);
        const agency = agenciesArr.find(a => a.id == offer.agency_id);
        if (agency) {
          agencyName = agency.name || "";
          agencyEmail = agency.email || "";
        }
      }
    }
    // Helper to convert Arabic-Indic digits to Latin digits
    function toLatinDigits(str) {
      if (!str) return "";
      return String(str).replace(
        /[\u0660-\u0669]/g,
        (d) =>
          "0123456789"[
            "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669".indexOf(
              d
            )
          ]
      );
    }
    // --- عرض الأسعار بأيقونات أشخاص فقط في تفاصيل العرض ---
    function peopleIcons(n) {
      if (!n || isNaN(n)) return '';
      n = Number(n);
      if (n === 2) {
        // لشخصين فقط: أيقونة واحدة
        return `<span style=\"display:inline-flex;gap:2px;color:#176a3d;font-size:1.3em;\"><i class='fa-solid fa-user-group'></i></span>`;
      } else if (n === 3) {
        // لثلاثة أشخاص: أيقونة users فقط
        return `<span style=\"display:inline-flex;gap:2px;color:#176a3d;font-size:1.3em;\"><i class='fa-solid fa-users'></i></span>`;
      } else if (n === 4) {
        // لأربع أشخاص: أيقونتان user-group
        return `<span style=\"display:inline-flex;gap:2px;color:#176a3d;font-size:1.3em;\"><i class='fa-solid fa-user-group'></i><i class='fa-solid fa-user-group'></i></span>`;
      }
      // لباقي الفئات: أيقونتان مختلفتان
      return `<span style=\"display:inline-flex;gap:2px;color:#176a3d;font-size:1.3em;\"><i class='fa-solid fa-users'></i><i class='fa-solid fa-user-group'></i></span>`;
    }
    function priceRow(n, val) {
      if (!val) return '';
      return `<span style=\"background:#f4f7fb;padding:6px 18px;border-radius:7px;display:flex;align-items:center;gap:8px;margin-bottom:2px;\">${peopleIcons(n)} <span style=\"color:#176a3d;font-weight:bold\">${val}</span> DA</span>`;
    }
    content.innerHTML = `
  <div id="offer-details-box" style="
    background:#fff;
    border-radius:16px;
    box-shadow:0 4px 32px #0003;
    max-width:920px;
    width:99vw;
    max-height:83vh;
    margin:auto auto auto auto;
    font-family:'Cairo',Tahoma,Arial,sans-serif;
    direction:rtl;
    position:relative;
    display:flex;
    flex-direction:column;
    align-items:stretch;
    border:1.5px solid #e7ecef;
  ">
    <!-- زر إغلاق ثابت -->
    <button onclick="document.getElementById('offerDetailsModal').style.display='none';document.body.style.overflow='';"
      style="
        position:absolute;left:14px;top:14px;align-self:flex-start;
        background:#f3f6fb;color:#176a3d;
        border:none;border-radius:50%;width:36px;height:36px;
        font-size:24px;cursor:pointer;font-weight:bold;transition:background 0.2s;z-index:10;
      "
      title="إغلاق"
      onmouseover="this.style.background='#e1e8ef'"
      onmouseout="this.style.background='#f3f6fb'"
    >&times;</button>
    <div id="offer-details-scroll-content" style="
      overflow-y:auto;
      padding:18px 14px 14px 14px;
      flex:1 1 auto;
      min-height:0;
      display:flex;
      flex-direction:row;
      gap:24px;
    ">
      <!-- صورة العرض الرئيسية -->
      <div style="flex:0 0 320px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;">
        ${offer.main_image && (offer.main_image.startsWith('data:image') || offer.main_image.match(/^https?:\/\//))
          ? `<img src="${offer.main_image}" alt="Main Image"
              style="width:100%;max-width:320px;max-height:200px;border-radius:12px;object-fit:cover;box-shadow:0 2px 10px #0001;margin-bottom:18px;">`
          : `<img src="public/admin/img/default.jpg" alt="Main Image"
              style="width:100%;max-width:320px;max-height:200px;border-radius:12px;object-fit:cover;box-shadow:0 2px 10px #0001;margin-bottom:18px;">`
        }
        <div style="margin-top:auto;margin-bottom:0;">
        <b>صور الفندق:</b>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:5px;justify-content:center;">
            ${(offer.hotel_images || [])
              .map(
                (img) =>
                  (img && (img.startsWith('data:image') || img.match(/^https?:\/\//)))
                    ? `<img src="${img}" style="margin:5px; max-width:45%;max-height:45%;border-radius:5px;object-fit:cover;box-shadow:0 10px 10px #0001;">`
                    : `<img src="public/admin/img/default.jpg" style="margin:5px; max-width:45%;max-height:45%;border-radius:5px;object-fit:cover;box-shadow:0 10px 10px #0001;">`
              )
              .join("")}
          </div>
        </div>
      </div>
      <!-- تفاصيل العرض -->
      <div style="flex:1 1 0;display:flex;flex-direction:column;justify-content:flex-start;">
        <h3 style="margin-bottom:18px;color:#176a3d;text-align:center;font-size:1.5em;letter-spacing:0.5px">
          ${offer.title || ""}
        </h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 24px;font-size:1.07em;line-height:1.8">
          <div><b>الوكالة:</b> ${agencyName || ""}</div>
          <div><b>إيميل الوكالة:</b> ${agencyEmail || ""}</div>
          <div><b>الفندق:</b> ${offer.hotel_name || ""}</div>
          <div><b>الوصف:</b> ${offer.description || ""}</div>
          <div><b>المسافة إلى الحرم:</b> ${toLatinDigits(offer.hotel_distance) || ""} متر</div>
          <div><b>الخدمات:</b>
            <span style="display:inline-flex;gap:10px;vertical-align:middle;font-size:2em;">
              ${getServiceIcons(offer.services) || "<span style='font-size:0.7em;color:#aaa'>لا يوجد</span>"}
            </span>
          </div>
          <div><b>شركة الطيران:</b> ${toLatinDigits(offer.airline_id) || ""}</div>
          <div><b>نوع الرحلة:</b> ${offer.flight_type || ""}</div>
          <div><b>الدخول:</b> ${offer.entry || ""}</div>
          <div><b>الخروج:</b> ${offer.exit || ""}</div>
          <div><b>تاريخ الذهاب:</b> ${toLatinDigits(offer.departure_date) || ""}</div>
          <div><b>تاريخ العودة:</b> ${toLatinDigits(offer.return_date) || ""}</div>
          <div><b>مدة الرحلة:</b> ${toLatinDigits(offer.duration_days) || ""} يوم</div>
          <div></div>
        </div>
        <div style="margin:18px 0 0 0;">
          <b>الأسعار:</b>
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;">
            ${
              priceRow(2, offer.price_double) +
              priceRow(3, offer.price_triple) +
              priceRow(4, offer.price_quad) +
              priceRow(5, offer.price_quint)
            }
          </div>
        </div>
        <div style="margin-top:16px;text-align:left;font-size:0.97em;color:#888;">
          <b>تاريخ الإنشاء:</b> ${
            offer.created_at
              ? toLatinDigits(
                  new Date(offer.created_at).toLocaleString("ar-EG")
                )
              : ""
          }
        </div>
      </div>
    </div>
  </div>
  <style>
    #offer-details-scroll-content::-webkit-scrollbar {
      width: 8px;
    }
    #offer-details-scroll-content::-webkit-scrollbar-thumb {
      background: #e2e6ea;
      border-radius: 4px;
    }
    #offer-details-scroll-content:hover::-webkit-scrollbar-thumb {
      background: #bfc7ce;
    }
    @media (max-width: 800px) {
      #offer-details-scroll-content { flex-direction:column; gap:12px;}
      #offer-details-box {max-width:99vw;}
    }
  </style>
`;
    setTimeout(() => {
      const scrollCont = document.getElementById(
        "offer-details-scroll-content"
      );
      if (scrollCont) scrollCont.scrollTop = 0;
    }, 0);
  } catch (err) {
    content.innerHTML =
      '<div style="color:red;text-align:center;padding:40px;font-size:18px;">فشل تحميل تفاصيل العرض</div>';
  }
}

// أضف هذه الدالة في الأعلى (بعد تعريف SERVICE_ICONS أو في أي مكان قبل renderOffers وshowOfferDetailsById)
function getServiceIcons(services) {
  if (!services) return "";
  // إذا كان services نصاً (string)، حوّله إلى كائن (object)
  if (typeof services === "string") {
    try {
      // إذا كان JSON (مثلاً '{"visa":true,"meals":true}')
      services = JSON.parse(services);
    } catch {
      // إذا كان سلسلة مفصولة بفواصل (مثلاً 'visa,meals')
      const arr = services.split(',').map(s => s.trim()).filter(Boolean);
      const obj = {};
      arr.forEach(k => obj[k] = true);
      services = obj;
    }
  }
  const icons = {
    visa:    '<span title="تأشيرة" style="margin-left:4px;font-size:1.2em;">🛂</span>',
    meals:   '<span title="الإطعام" style="margin-left:4px;font-size:1.2em;">🍽️</span>',
    transport: '<span title="النقل" style="margin-left:4px;font-size:1.2em;">🚌</span>',
    guide:   '<span title="الإرشاد" style="margin-left:4px;font-size:1.2em;">🧑‍🏫</span>',
    flight:  '<span title="طيران" style="margin-left:4px;font-size:1.2em;">✈️</span>',
  };
  const keyMap = {
    visa: "visa",
    تأشيرة: "visa",
    meals: "meals",
    اطعام: "meals",
    فطور: "meals",
    transport: "transport",
    نقل: "transport",
    guide: "guide",
    ارشاد: "guide",
    طيران: "flight",
    flight: "flight",
  };
  return Object.keys(services)
    .filter((k) => services[k])
    .map((k) => icons[keyMap[k]] || `<span title="${k}" style="margin-left:4px;font-size:1.2em;">🔹</span>`)
    .join("");
}

// دالة لجلب الوكالات وتعبئة قائمة الاختيار في نموذج إضافة عرض
async function populateAgenciesSelect() {
  const select = document.getElementById('agencySelect');
  if (!select) return;
  select.innerHTML = '<option value="">جاري التحميل...</option>';
  try {
    const token = localStorage.getItem('umrah_admin_token');
    if (!token) {
      select.innerHTML = '<option value="">يجب تسجيل الدخول أولاً</option>';
      return;
    }
    const res = await fetch('http://192.168.100.23:3001/api/agencies/all', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) {
      select.innerHTML = '<option value="">تعذر تحميل الوكالات (HTTP ' + res.status + ')</option>';
      return;
    }
    const data = await res.json();
    const agencies = Array.isArray(data.agencies) ? data.agencies : [];
    if (agencies.length === 0) {
      select.innerHTML = '<option value="">لا توجد وكالات متاحة</option>';
      return;
    }
    select.innerHTML = '<option value="">اختر الوكالة</option>';
    agencies.forEach(agency => {
      const opt = document.createElement('option');
      opt.value = agency.id || agency._id || agency.agency_id || agency.uuid || agency.name;
      opt.textContent = agency.name;
      select.appendChild(opt);
    });
  } catch (e) {
    select.innerHTML = '<option value="">تعذر تحميل الوكالات (راجع الكونسول)</option>';
  }
}

// دالة لجلب شركات الطيران وتعبئة قائمة الاختيار في نموذج إضافة عرض
async function populateAirlinesSelect() {
  const select = document.getElementById('airlineSelect');
  if (!select) return;
  select.innerHTML = '<option value="">جاري التحميل...</option>';
  try {
    const token = localStorage.getItem('umrah_admin_token');
    const res = await fetch('http://192.168.100.23:3001/api/airlines/all', {
      method: 'GET',
      headers: {
        'Authorization': token ? 'Bearer ' + token : '',
        'Accept': 'application/json'
      }
    });
    if (!res.ok) {
      select.innerHTML = '<option value="">تعذر تحميل شركات الطيران</option>';
      return;
    }
    const data = await res.json();
    const airlines = Array.isArray(data.airlines) ? data.airlines : (Array.isArray(data) ? data : []);
    select.innerHTML = '<option value="">بدون</option>';
    airlines.forEach(airline => {
      const opt = document.createElement('option');
      opt.value = airline.id || airline._id || airline.airline_id || airline.uuid || airline.name;
      opt.textContent = airline.name;
      select.appendChild(opt);
    });
  } catch (e) {
    select.innerHTML = '<option value="">تعذر تحميل شركات الطيران</option>';
  }
}

// عند فتح نافذة إضافة عرض، عبئ قائمة الوكالات وقائمة شركات الطيران
document.getElementById('openAddOfferModalBtn').addEventListener('click', function() {
  document.getElementById('addOfferModal').classList.add('show');
  populateAgenciesSelect();
  populateAirlinesSelect();
});

document.getElementById('closeAddOfferModalBtn').onclick =
document.getElementById('cancelAddOfferBtn').onclick = function() {
  document.getElementById('addOfferModal').classList.remove('show');
};

// إرسال نموذج إضافة عرض جديد (يرسل كل شيء دفعة واحدة إلى /api/offers/add)
var addOfferForm = document.getElementById("addOfferForm");
if (addOfferForm) {
  // دالة مساعدة لتحويل ملف صورة إلى base64
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  addOfferForm.onsubmit = async function (e) {
    e.preventDefault();
    const form = addOfferForm;
    const token = localStorage.getItem("umrah_admin_token");
    const addOfferModal = document.getElementById("addOfferModal");

    // بناء كائن البيانات
    const offerData = {
      agency_id: form.agency_id ? form.agency_id.value : "",
      title: form.title ? form.title.value : "",
      flight_type: form.flight_type ? form.flight_type.value : "",
      departure_date: form.departure_date ? form.departure_date.value : "",
      return_date: form.return_date ? form.return_date.value : "",
      duration_days: form.duration_days ? form.duration_days.value : "",
      hotel_name: form.hotel_name ? form.hotel_name.value : "",
      hotel_distance: form.hotel_distance ? form.hotel_distance.value : "",
      description: form.description ? form.description.value : "",
      entry: form.entry ? form.entry.value : "",
      exit: form.exit ? form.exit.value : "",
      price_double: form.price_double ? form.price_double.value : "",
      price_triple: form.price_triple ? form.price_triple.value : "",
      price_quad: form.price_quad ? form.price_quad.value : "",
      price_quint: form.price_quint ? form.price_quint.value : "",
      airline_id: form.airline_id && form.airline_id.value ? form.airline_id.value : "",
    };
    // تأكد من عدم وجود entry_exit في البيانات المرسلة
    if ('entry_exit' in offerData) delete offerData.entry_exit;

    // الخدمات (services) من الأيقونات المختارة
    const servicesInput = document.getElementById("servicesInput");
    const selectedServices = servicesInput && servicesInput.value
      ? servicesInput.value.split(",").map(s => s.trim()).filter(Boolean)
      : [];
    const servicesMap = {};
    selectedServices.forEach(s => servicesMap[s] = true);
    offerData.services = servicesMap;

    try {
      // الصورة الرئيسية
      if (form.main_image_file && form.main_image_file.files && form.main_image_file.files.length > 0) {
        offerData.main_image = await fileToBase64(form.main_image_file.files[0]);
      } else if (form.main_image && form.main_image.value) {
        offerData.main_image = form.main_image.value;
      } else {
        offerData.main_image = "";
      }

      // صور الفندق (مصفوفة base64)
      offerData.hotel_images = [];
      if (form.hotel_images_file && form.hotel_images_file.files && form.hotel_images_file.files.length > 0) {
        for (let i = 0; i < form.hotel_images_file.files.length; i++) {
          const imgBase64 = await fileToBase64(form.hotel_images_file.files[i]);
          offerData.hotel_images.push(imgBase64);
        }
      } else if (form.hotel_images && form.hotel_images.value) {
        form.hotel_images.value.split(",").map(s => s.trim()).filter(Boolean).forEach(imgName => {
          offerData.hotel_images.push(imgName);
        });
      }

      // إرسال البيانات كـ JSON
      const response = await fetch("http://192.168.100.23:3001/api/offers/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? "Bearer " + token : "",
        },
        body: JSON.stringify(offerData),
      });

      if (!response.ok) {
        let errMsg = "فشل إضافة العرض";
        try {
          const err = await response.clone().json();
          if (err && err.message) errMsg = err.message;
          else if (err && err.error) errMsg = err.error;
        } catch {}
        showShortMessage(errMsg, 'error');
        return;
      }

      if (addOfferModal) {
        addOfferModal.style.display = "none";
        addOfferModal.classList.remove('show');
      }
      document.body.style.overflow = "";
      addOfferForm.reset();
      loadAndRenderOffers();
      showShortMessage("تمت إضافة العرض بنجاح", 'success');
    } catch (err) {
      showShortMessage("حدث خطأ أثناء معالجة الصور أو إرسال البيانات", 'error');
    }
  }
}

// رسالة قصيرة عائمة
function showShortMessage(message, type = 'info') {
  const old = document.getElementById('shortMsg');
  if (old) old.remove();
  const msg = document.createElement('div');
  msg.id = 'shortMsg';
  msg.style.position = 'fixed';
  msg.style.top = '30px';
  msg.style.left = '50%';
  msg.style.transform = 'translateX(-50%)';
  msg.style.zIndex = '99999';
  msg.style.background = type === 'success' ? '#4caf50' : (type === 'error' ? '#f44336' : '#2196f3');
  msg.style.color = '#fff';
  msg.style.padding = '12px 28px';
  msg.style.borderRadius = '8px';
  msg.style.boxShadow = '0 2px 12px #0002';
  msg.style.fontSize = '1.05rem';
  msg.style.fontWeight = 'bold';
  msg.style.textAlign = 'center';
  msg.style.opacity = '0.98';
  msg.textContent = message;
  document.body.appendChild(msg);
  setTimeout(() => {
    msg.style.transition = 'opacity 0.5s';
    msg.style.opacity = '0';
    setTimeout(() => msg.remove(), 500);
  }, 2000);
}

// تصدير البيانات إلى ملف Excel/CSV
var exportBtn = document.getElementById("exportOffersBtn");
if (exportBtn) {
  exportBtn.onclick = async function () {
    const lang = localStorage.getItem("umrah_admin_lang") || "ar";
    const token = localStorage.getItem("umrah_admin_token");
    let url = "http://192.168.100.23:3001/api/offers/all?lang=" + lang;
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: token ? "Bearer " + token : "",
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      const offers = data.offers || [];
      if (!offers.length) return alert("لا توجد بيانات للتصدير");
      // بناء CSV
      const csvRows = [];
      const headers = [
        "ID",
        "Agency",
        "Title",
        "Description",
        "Hotel",
        "Hotel Distance",
        "Services",
        "Airline",
        "Flight Type",
        "Departure",
        "Return",
        "Duration",
        "Entry/Exit",
        "Price Double",
        "Price Triple",
        "Price Quad",
        "Price Quint",
        "Created At",
      ];
      csvRows.push(headers.join(","));
      offers.forEach((o) => {
        csvRows.push(
          [
            o.id,
            o.agency_id,
            '"' + (o.title || "").replace(/"/g, '""') + '"',
            '"' + (o.description || "").replace(/"/g, '""') + '"',
            o.hotel_name || "",
            o.hotel_distance || "",
            o.services
              ? Object.keys(o.services)
                  .filter((k) => o.services[k])
                  .join("|")
              : "",
            o.airline_id || "",
            o.flight_type || "",
            o.departure_date || "",
            o.return_date || "",
            o.duration_days || "",
            ((o.entry && o.exit) ? (o.entry + "/" + o.exit) : "") || "",
            o.price_double || "",
            o.price_triple || "",
            o.price_quad || "",
            o.price_quint || "",
            o.created_at || "",
          ]
            .map((v) => (v == null ? "" : v))
            .join(",")
        );
      });
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "offers_export.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert("فشل تصدير البيانات");
    }
  };
}

// --- CSS للأيقونات المختارة وغير المختارة (يحقن تلقائياً) ---
(function injectServiceIconsCSS() {
  const style = document.createElement('style');
  style.innerHTML = `
    #servicesIconsContainer {
      display: flex; gap: 18px; margin: 18px 0 10px 0; flex-wrap: wrap; justify-content: center;
    }
    .service-icon-select {
      display: flex; flex-direction: column; align-items: center; cursor: pointer;
      border: 2.5px solid #e0e6ef; border-radius: 14px; padding: 18px 18px 10px 18px;
      transition: border 0.2s, background 0.2s, box-shadow 0.2s, transform 0.15s;
      font-size: 2.2em; background: #f8fafc;
      box-shadow: 0 2px 12px #0001;
      min-width: 90px;
      margin-bottom: 8px;
      outline: none;
    }
    .service-icon-select.selected {
      border-color: #176a3d;
      background: #e9f7ef;
      box-shadow: 0 4px 18px #176a3d22;
      transform: scale(1.08);
    }
    .service-icon-select:focus {
      border-color: #176a3d;
      box-shadow: 0 0 0 3px #176a3d33;
    }
    .service-icon-select .icon {
      font-size: 2.6em;
      margin-bottom: 8px;
    }
    .service-icon-select .label {
      font-size: 1em;
      color: #176a3d;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
  `;
  document.head.appendChild(style);
})();

// --- CSS احترافي لبطاقات العروض (offers) لجعلها أكثر جاذبية وحداثة ---
(function injectOffersCardCSS() {
  const style = document.createElement('style');
  style.innerHTML = `
    #offersGrid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 36px 28px;
      padding: 28px 0 36px 0;
      align-items: stretch;
    }
    .agency-card {
      background: linear-gradient(135deg, #f8fafc 70%, #e9f7ef 100%);
      border-radius: 22px;
      box-shadow: 0 8px 36px #176a3d22, 0 2px 12px #0001;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: box-shadow 0.18s, transform 0.18s;
      border: 1.5px solid #e7ecef;
      min-height: 440px;
      position: relative;
      z-index: 1;
    }
    .agency-card::before {
      content: '';
      display: block;
      height: 7px;
      width: 100%;
      background: linear-gradient(90deg, #176a3d 0%, #1abc9c 100%);
      position: absolute;
      top: 0; left: 0; right: 0;
      z-index: 2;
      opacity: 0.18;
    }
    .agency-card:hover {
      box-shadow: 0 16px 56px #176a3d33, 0 4px 18px #0002;
      transform: translateY(-6px) scale(1.03);
      border-color: #176a3d44;
    }
    .agency-header {
      background-size: cover;
      background-position: center;
      min-height: 180px;
      max-height: 220px;
      width: 100%;
      border-radius: 22px 22px 0 0;
      box-shadow: 0 2px 16px #0001;
      position: relative;
      z-index: 1;
      border-bottom: 1.5px solid #e7ecef;
    }
    .agency-body {
      flex: 1 1 auto;
      padding: 22px 20px 16px 20px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 10px;
    }
    .agency-name {
      color: #176a3d;
      font-size: 1.32em;
      font-weight: bold;
      margin: 0 0 8px 0;
      letter-spacing: 0.7px;
      text-align: center;
      min-height: 2.2em;
      line-height: 1.3;
    }
    .agency-extra {
      color: #222;
      font-size: 1.04em;
      margin-bottom: 2px;
      word-break: break-word;
      line-height: 1.7;
    }
    .agency-extra b {
      color: #176a3d;
      font-weight: bold;
      font-size: 1em;
    }
    .agency-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 12px;
    }
    .agency-card .btn {
      border-radius: 9px;
      font-size: 1em;
      padding: 7px 18px;
      transition: background 0.15s, color 0.15s, box-shadow 0.15s;
      box-shadow: 0 1px 4px #176a3d11;
      font-weight: 500;
    }
    .agency-card .btn-danger {
      background: #fbe9e9;
      color: #c0392b;
      border: 1.5px solid #f5b7b1;
    }
    .agency-card .btn-danger:hover {
      background: #f8d7da;
      color: #a93226;
      box-shadow: 0 2px 8px #c0392b22;
    }
    .agency-card .btn-info {
      background: #e9f7ef;
      color: #176a3d;
      border: 1.5px solid #b7e5c1;
    }
    .agency-card .btn-info:hover {
      background: #d4efdf;
      color: #117a3d;
      box-shadow: 0 2px 8px #176a3d22;
    }
    /* خدمات العرض بشكل أفقي وأيقونات أكبر */
    .agency-extra span[style*='display:inline-flex'] {
      gap: 14px !important;
      font-size: 2em !important;
      align-items: center;
      margin-top: 4px;
      margin-bottom: 2px;
    }
    /* الأسعار بشكل واضح */
    .agency-extra span[style*='display:flex'][style*='flex-wrap:wrap'] {
      gap: 10px !important;
      margin-top: 4px;
      margin-bottom: 2px;
    }
    /* تحسين مظهر السعر */
    .agency-extra span[style*='background:#f4f7fb'] {
      background: #f4f7fb;
      border-radius: 8px;
      padding: 6px 14px;
      font-size: 1.04em;
      color: #176a3d;
      font-weight: 500;
      box-shadow: 0 1px 4px #176a3d11;
      margin-bottom: 2px;
    }
    /* Responsive */
    @media (max-width: 800px) {
      #offersGrid {
        grid-template-columns: 1fr;
        gap: 18px 0;
        padding: 12px 0 18px 0;
      }
      .agency-card {
        min-height: 320px;
        border-radius: 14px;
      }
      .agency-header {
        min-height: 110px;
        border-radius: 14px 14px 0 0;
      }
      .agency-body {
        padding: 12px 8px 10px 8px;
      }
    }
  `;
  document.head.appendChild(style);
})();

// CSS لدائرة السعر
(function injectOfferPriceCircleCSS() {
  const style = document.createElement('style');
  style.innerHTML = `
    .price-circle {
      width: 130px;
      height: 130px;
      border-radius: 50%;
      background: #e9f7ef;
      box-shadow: 0 2px 12px #176a3d22;
      margin: 0 auto 10px auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 2px solid #b7e5c1;
      position: relative;
      overflow: hidden;
    }
    .people-icons {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 2px;
      position: relative;
      z-index: 2;
    }
    .people-icons .row {
      display: flex;
      justify-content: center;
      width: 100%;
      margin-bottom: 0px;
    }
    .people-icons .row.center {
      justify-content: center;
    }
    .person {
      font-size: 1.25em;
      color: #1976d2;
      margin: 0 2px;
      display: inline-block;
      line-height: 1.1;
    }
    .price-val {
      font-size: 1.08em;
      color: #176a3d;
      font-weight: bold;
      margin-top: 2px;
      text-align: center;
      z-index: 2;
    }
    .da {
      font-size: 0.95em;
      color: #888;
      font-weight: normal;
      margin-left: 2px;
    }
  `;
  document.head.appendChild(style);
})();

// نافذة تأكيد حذف عرض
function confirmDeleteOffer(offerId) {
  if (!window.confirm('هل أنت متأكد أنك تريد حذف هذا العرض؟')) return;
  deleteOffer(offerId)
    .then(() => {
      alert('تم حذف العرض بنجاح');
      loadAndRenderOffers();
    })
    .catch(() => {
      alert('فشل حذف العرض');
    });
}
