// جلب الإحصائيات من الـ API الجاهز
async function fetchDashboardData() {
  const token = localStorage.getItem('umrah_admin_token');
  const headers = { 'Authorization': 'Bearer ' + token };

  // متغيرات النتائج
  let stats = {
    totalAgencies: 0,
    totalPilgrims: 0,
    totalOffers: 0,
    pendingRequests: 0,
    pendingAgenciesCount: 0,
    adminActivityCount: 0,
    totalApprovedAgencies: 0,
    totalRejectedAgencies: 0,
    totalBookings: 0,
    totalAcceptedBookings: 0,
    totalRejectedBookings: 0,
    totalAdmins: 0,
    totalUsers: 0,
    activeAdminsNow: 0,
  };
  let pendingAgencies = [], months = [], monthlyBookings = [], agencyLabels = [], agencyCounts = [], agencyDetails = null, adminActivityLogs = [], topAgenciesLabels = [], topAgenciesCounts = [], topOffersLabels = [], topOffersCounts = [], siteVisitsMonths = [], siteVisitsCounts = [], topAgencyYears = [], topAgencyNames = [], topAgencyCounts = [];

  // تحديث الإحصائيات مباشرة بعد كل تحميل
  function updateStatsUI() {
    renderStats(stats);
  }


  // جلب عدد المدراء (main + sub فقط)
  const adminsPromise = fetch('http://192.168.100.23:3001/api/admin/all', { headers })
    .then(r => r.json())
    .then(d => {
      if (Array.isArray(d.admins)) {
        stats.totalAdmins = d.admins.filter(a => a.role === 'main' || a.role === 'sub').length;
        updateStatsUI();
      }
    });

  // جلب عدد المدراء النشطين الآن (main + sub فقط)
  const activeAdminsPromise = fetch('http://192.168.100.23:3001/api/admin/active-now', { headers })
    .then(r => r.json())
    .then(d => {
      stats.activeAdminsNow = d.count || 0;
      updateStatsUI();
    });

  // بقية البيانات
  const promises = [
    fetch('http://192.168.100.23:3001/api/stats/total-agencies', { headers }).then(r => r.json()).then(d => { stats.totalAgencies = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/total-pilgrims', { headers }).then(r => r.json()).then(d => { stats.totalPilgrims = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/total-offers', { headers }).then(r => r.json()).then(d => { stats.totalOffers = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/pending-requests', { headers }).then(r => r.json()).then(d => { stats.pendingRequests = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/pending-agencies', { headers }).then(r => r.json()).then(d => { pendingAgencies = d.agencies || []; stats.pendingAgenciesCount = pendingAgencies.length; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/monthly-bookings', { headers }).then(r => r.json()).then(d => { months = d.months || []; monthlyBookings = d.counts || []; }),
    fetch('http://192.168.100.23:3001/api/stats/agencies-by-wilaya', { headers }).then(r => r.json()).then(d => { agencyLabels = d.labels || []; agencyCounts = d.counts || []; }),
    fetch('http://192.168.100.23:3001/api/stats/admin-activity', { headers }).then(r => r.json()).then(d => { adminActivityLogs = d.logs || []; stats.adminActivityCount = adminActivityLogs.length; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/total-approved-agencies', { headers }).then(r => r.json()).then(d => { stats.totalApprovedAgencies = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/total-rejected-agencies', { headers }).then(r => r.json()).then(d => { stats.totalRejectedAgencies = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/total-bookings', { headers }).then(r => r.json()).then(d => { stats.totalBookings = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/total-accepted-bookings', { headers }).then(r => r.json()).then(d => { stats.totalAcceptedBookings = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/total-rejected-bookings', { headers }).then(r => r.json()).then(d => { stats.totalRejectedBookings = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/top-agencies-by-offers', { headers }).then(r => r.json()).then(d => { topAgenciesLabels = d.labels || []; topAgenciesCounts = d.counts || []; }),
    fetch('http://192.168.100.23:3001/api/stats/top-requested-offers', { headers }).then(r => r.json()).then(d => { topOffersLabels = d.labels || []; topOffersCounts = d.counts || []; }),
    fetch('http://192.168.100.23:3001/api/stats/total-users', { headers }).then(r => r.json()).then(d => { stats.totalUsers = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/top-agency-by-offers-per-year', { headers }).then(r => r.json()).then(d => { topAgencyYears = d.years || []; topAgencyNames = d.topAgencies || []; topAgencyCounts = d.topCounts || []; }),
    fetch('http://192.168.100.23:3001/api/site-stats/monthly', { headers }).then(r => r.json()).then(d => { siteVisitsMonths = d.months || []; siteVisitsCounts = d.counts || []; }),
  ];

  await Promise.allSettled([adminsPromise, activeAdminsPromise, ...promises]);

  await Promise.allSettled(promises);

  if (pendingAgencies.length > 0) {
    agencyDetails = pendingAgencies[0];
  }
// جلب الإحصائيات من الـ API الجاهز
async function fetchDashboardData() {
  const token = localStorage.getItem('umrah_admin_token');
  const headers = { 'Authorization': 'Bearer ' + token };

  // متغيرات النتائج
  let stats = {
    totalAgencies: 0,
    totalPilgrims: 0,
    totalOffers: 0,
    pendingRequests: 0,
    pendingAgenciesCount: 0,
    adminActivityCount: 0,
    totalApprovedAgencies: 0,
    totalRejectedAgencies: 0,
    totalBookings: 0,
    totalAcceptedBookings: 0,
    totalRejectedBookings: 0,
    totalAdmins: 0,
    totalUsers: 0,
    activeAdminsNow: 0,
  };
  let pendingAgencies = [], months = [], monthlyBookings = [], agencyLabels = [], agencyCounts = [], agencyDetails = null, adminActivityLogs = [], topAgenciesLabels = [], topAgenciesCounts = [], topOffersLabels = [], topOffersCounts = [], siteVisitsMonths = [], siteVisitsCounts = [], topAgencyYears = [], topAgencyNames = [], topAgencyCounts = [];

  // تحديث الإحصائيات مباشرة بعد كل تحميل
  function updateStatsUI() {
    renderStats(stats);
  }


  // جلب عدد المدراء (main + sub فقط)
  const adminsPromise = fetch('http://192.168.100.23:3001/api/admin/all', { headers })
    .then(r => r.json())
    .then(d => {
      if (Array.isArray(d.admins)) {
        stats.totalAdmins = d.admins.filter(a => a.role === 'main' || a.role === 'sub').length;
        updateStatsUI();
      }
    });

  // جلب عدد المدراء النشطين الآن (main + sub فقط)
  const activeAdminsPromise = fetch('http://192.168.100.23:3001/api/admin/active-now', { headers })
    .then(r => r.json())
    .then(d => {
      stats.activeAdminsNow = d.count || 0;
      updateStatsUI();
    });

  // بقية البيانات
  const promises = [
    fetch('http://192.168.100.23:3001/api/stats/total-agencies', { headers }).then(r => r.json()).then(d => { stats.totalAgencies = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/total-pilgrims', { headers }).then(r => r.json()).then(d => { stats.totalPilgrims = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/total-offers', { headers }).then(r => r.json()).then(d => { stats.totalOffers = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/pending-requests', { headers }).then(r => r.json()).then(d => { stats.pendingRequests = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/pending-agencies', { headers }).then(r => r.json()).then(d => { pendingAgencies = d.agencies || []; stats.pendingAgenciesCount = pendingAgencies.length; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/monthly-bookings', { headers }).then(r => r.json()).then(d => { months = d.months || []; monthlyBookings = d.counts || []; }),
    fetch('http://192.168.100.23:3001/api/stats/agencies-by-wilaya', { headers }).then(r => r.json()).then(d => { agencyLabels = d.labels || []; agencyCounts = d.counts || []; }),
    fetch('http://192.168.100.23:3001/api/stats/admin-activity', { headers }).then(r => r.json()).then(d => { adminActivityLogs = d.logs || []; stats.adminActivityCount = adminActivityLogs.length; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/total-approved-agencies', { headers }).then(r => r.json()).then(d => { stats.totalApprovedAgencies = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/total-rejected-agencies', { headers }).then(r => r.json()).then(d => { stats.totalRejectedAgencies = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/total-bookings', { headers }).then(r => r.json()).then(d => { stats.totalBookings = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/total-accepted-bookings', { headers }).then(r => r.json()).then(d => { stats.totalAcceptedBookings = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/total-rejected-bookings', { headers }).then(r => r.json()).then(d => { stats.totalRejectedBookings = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/top-agencies-by-offers', { headers }).then(r => r.json()).then(d => { topAgenciesLabels = d.labels || []; topAgenciesCounts = d.counts || []; }),
    fetch('http://192.168.100.23:3001/api/stats/top-requested-offers', { headers }).then(r => r.json()).then(d => { topOffersLabels = d.labels || []; topOffersCounts = d.counts || []; }),
    fetch('http://192.168.100.23:3001/api/stats/total-users', { headers }).then(r => r.json()).then(d => { stats.totalUsers = d.total || 0; updateStatsUI(); }),
    fetch('http://192.168.100.23:3001/api/stats/top-agency-by-offers-per-year', { headers }).then(r => r.json()).then(d => { topAgencyYears = d.years || []; topAgencyNames = d.topAgencies || []; topAgencyCounts = d.topCounts || []; }),
    fetch('http://192.168.100.23:3001/api/site-stats/monthly', { headers }).then(r => r.json()).then(d => { siteVisitsMonths = d.months || []; siteVisitsCounts = d.counts || []; }),
  ];

  await Promise.allSettled([adminsPromise, activeAdminsPromise, ...promises]);

  await Promise.allSettled(promises);

  if (pendingAgencies.length > 0) {
    agencyDetails = pendingAgencies[0];
  }

  return {
    stats,
    pendingAgencies,
    months,
    monthlyBookings,
    agencyLabels,
    agencyCounts,
    agencyDetails,
    adminActivityLogs,
    topAgenciesLabels,
    topAgenciesCounts,
    topOffersLabels,
    topOffersCounts,
    siteVisitsMonths,
    siteVisitsCounts,
    topAgencyYears,
    topAgencyNames,
    topAgencyCounts,
  };
}

// عند كل زيارة للوحة التحكم (dashboard.html) يتم زيادة عداد زيارات الشهر الحالي
fetch('http://192.168.100.23:3001/api/site-stats/visit', { method: 'POST' });

// تعبئة الإحصائيات
function renderStats(stats) {
  const statsGrid = document.getElementById("statsGrid");
  // استثناء الحقول غير المرغوبة من الإحصائيات
  const statsKeys = Object.keys(stats).filter(key => !['totalAgencies', 'totalUsers', 'totalPilgrims', 'totalRejectedAgencies', 'totalRejectedBookings', 'adminActivityCount'].includes(key));
  statsGrid.innerHTML = `
    <div style="margin-bottom:8px;font-size:1rem;color:#888;">
      عدد الإحصائيات المعروضة: <b>${statsKeys.length}</b>
    </div>
    <div class="stats-flex-wrap stats-2-rows">
      <!-- البطاقات -->
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.totalApprovedAgencies}</div>
            <div class="stat-label">الوكالات المقبولة</div>
          </div>
          <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.totalOffers}</div>
            <div class="stat-label">العروض النشطة</div>
          </div>
          <div class="stat-icon"><i class="fas fa-tags"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.pendingRequests}</div>
            <div class="stat-label">الطلبات المعلقة</div>
          </div>
          <div class="stat-icon"><i class="fas fa-clock"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.pendingAgenciesCount}</div>
            <div class="stat-label">الوكالات المعلقة</div>
          </div>
          <div class="stat-icon"><i class="fas fa-user-clock"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.totalBookings}</div>
            <div class="stat-label">إجمالي الحجوزات</div>
          </div>
          <div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.totalAcceptedBookings}</div>
            <div class="stat-label">الحجوزات المقبولة</div>
          </div>
          <div class="stat-icon"><i class="fas fa-check"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.totalAdmins}</div>
            <div class="stat-label">عدد المدراء</div>
          </div>
          <div class="stat-icon"><i class="fas fa-user-shield"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.activeAdminsNow}</div>
            <div class="stat-label">المدراء النشطون الآن</div>
          </div>
          <div class="stat-icon"><i class="fas fa-bolt"></i></div>
        </div>
      </div>
    </div>
  `;

  // إضافة CSS ديناميكي إذا لم يكن موجوداً
  if (!document.getElementById('stats-flex-wrap-style')) {
    const style = document.createElement('style');
    style.id = 'stats-flex-wrap-style';
    style.innerHTML = `
      .stats-flex-wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        justify-content: center;
        align-items: stretch;
        flex-direction: row;
        flex-wrap: wrap;
      }
      .stats-2-rows {
        flex-wrap: wrap;
        flex-direction: row;
        max-width: 1000px;
        margin: 0 auto;
      }
      .stats-2-rows .stat-card {
        min-width: 180px;
        flex: 1 1 22%;
        max-width: 22%;
        box-sizing: border-box;
      }
      @media (max-width: 900px) {
        .stats-2-rows .stat-card {
          min-width: 140px;
          max-width: 48%;
        }
      }
      @media (max-width: 600px) {
        .stats-2-rows .stat-card {
          min-width: 120px;
          max-width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// جلب تفاصيل وكالة واحدة
async function fetchAgencyDetails(id) {
  // TODO: Replace with local API call
  // Example: fetch agency details from your API
  // Remove/comment the following block if you implement the API call
  return null;
}

// عرض تفاصيل الوكالة في المودال
function showAgencyDetailsModal(agency) {
  const modal = document.getElementById("agencyDetailsModal");
  const content = document.getElementById("agencyDetailsContent");
  content.innerHTML = `
    <div style="text-align:center;">
      ${
        agency.photo_profil
          ? `<img src="${agency.photo_profil}" alt="صورة الملف" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:1rem;">`
          : ""
      }
      <h4 style="margin-bottom:0.5rem;">${agency.nom_agence || ""}</h4>
      <div style="color:#888; margin-bottom:1rem;">${
        agency.email || ""
      }</div>
    </div>
    <table style="width:100%; direction:rtl; border-collapse:collapse;">
      <tr><td style="padding:4px 0;">الولاية:</td><td>${
        agency.wilaya || ""
      }</td></tr>
      <tr><td style="padding:4px 0;">الهاتف:</td><td>${
        agency.telephone || ""
      }</td></tr>
      <tr><td style="padding:4px 0;">رقم الرخصة التجارية:</td><td>${
        agency.commercial_license_number || ""
      }</td></tr>
      <tr><td style="padding:4px 0;">تاريخ الإنشاء:</td><td>${
        agency.date_creation
          ? new Date(agency.date_creation).toLocaleString("ar-EG")
          : ""
      }</td></tr>
      <tr><td style="padding:4px 0;">اللغة المفضلة:</td><td>${
        agency.langue_preferee || ""
      }</td></tr>
      <tr><td style="padding:4px 0;">الموقع الجغرافي:</td><td>${
        agency.latitude && agency.longitude
          ? `${agency.latitude}, ${agency.longitude}`
          : ""
      }</td></tr>
    </table>
    ${
      agency.photo_couverture
        ? `<div style="margin-top:1rem;"><img src="${agency.photo_couverture}" alt="صورة الغلاف" style="width:100%;max-height:120px;object-fit:cover;border-radius:6px;"></div>`
        : ""
    }
  `;
  modal.style.display = "flex";
}

// إغلاق المودال
document.addEventListener("DOMContentLoaded", function () {
  var closeBtn = document.getElementById("closeAgencyModal");
  if (closeBtn) {
    closeBtn.onclick = function () {
      var modal = document.getElementById("agencyDetailsModal");
      if (modal) modal.style.display = "none";
    };
  }
  var modal = document.getElementById("agencyDetailsModal");
  if (modal) {
    modal.onclick = function (e) {
      if (e.target === this) this.style.display = "none";
    };
  }
});

// تم حذف دالة عرض الوكالات المعلقة من لوحة التحكم بناءً على طلبك

// رسم المخططات
function renderCharts(
  months,
  monthlyBookings,
  agencyLabels,
  agencyCounts,
  topAgenciesLabels,
  topAgenciesCounts,
  topOffersLabels,
  topOffersCounts,
  siteVisitsMonths,
  siteVisitsCounts
) {
  // مخطط الحجوزات الشهرية
  new Chart(
    document.getElementById("monthlyBookingsChart").getContext("2d"),
    {
      type: "line",
      data: {
        labels: months,
        datasets: [
          {
            label: "الحجوزات",
            data: monthlyBookings,
            backgroundColor: "rgba(25, 135, 84, 0.2)",
            borderColor: "#198754",
            borderWidth: 3,
            pointBackgroundColor: "#ffd700",
            pointBorderColor: "#14532d",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: "الشهر" } },
          y: {
            beginAtZero: true,
            title: { display: true, text: "عدد الحجوزات" },
          },
        },
      },
    }
  );

  // مخطط توزيع الوكالات المقبولة فقط حسب الولاية
  new Chart(
    document.getElementById("agencyDistributionChart").getContext("2d"),
    {
      type: "pie",
      data: {
        labels: agencyLabels,
        datasets: [
          {
            data: agencyCounts,
            backgroundColor: [
              "#198754",
              "#ffd700",
              "#43e97b",
              "#fa709a",
              "#fee140",
              "#14532d",
            ],
            borderColor: "#fff",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percent = total ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} وكالة (${percent}%)`;
              }
            }
          }
        },
      },
    }
  );

  // منحنى بياني لأكثر الوكالات التي لديها عروض
  new Chart(
    document.getElementById("topAgenciesByOffersChart").getContext("2d"),
    {
      type: "bar",
      data: {
        labels: topAgenciesLabels,
        datasets: [
          {
            label: "عدد العروض",
            data: topAgenciesCounts,
            backgroundColor: "#43e97b",
            borderColor: "#198754",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.label}: ${context.raw} عرض`;
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: "الوكالة" } },
          y: { beginAtZero: true, title: { display: true, text: "عدد العروض" } }
        }
      },
    }
  );

  // منحنى بياني لأكثر العروض طلبا
  new Chart(
    document.getElementById("topRequestedOffersChart").getContext("2d"),
    {
      type: "bar",
      data: {
        labels: topOffersLabels,
        datasets: [
          {
            label: "عدد الطلبات",
            data: topOffersCounts,
            backgroundColor: "#fa709a",
            borderColor: "#c2185b",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.label}: ${context.raw} طلب`;
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: "العرض" } },
          y: { beginAtZero: true, title: { display: true, text: "عدد الطلبات" } }
        }
      },
    }
  );

  // منحنى بياني لأكثر وكالة أضافت عروضًا في كل سنة خلال آخر 10 سنوات
  new Chart(
    document.getElementById("topAgencyByOffersPerYearChart").getContext("2d"),
    {
      type: "bar",
      data: {
        labels: window.dashboardData.topAgencyYears,
        datasets: [
          {
            label: "اسم الوكالة الأعلى",
            data: window.dashboardData.topAgencyCounts,
            backgroundColor: "#ffd700",
            borderColor: "#198754",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function(context) {
                // السنة
                return `السنة: ${context[0].label}`;
              },
              label: function(context) {
                // اسم الوكالة وعدد العروض
                const idx = context.dataIndex;
                const agency = window.dashboardData.topAgencyNames[idx] || "—";
                return `الوكالة: ${agency} | عدد العروض: ${context.raw}`;
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: "السنة" } },
          y: { beginAtZero: true, title: { display: true, text: "عدد العروض" } }
        }
      },
    }
  );

  // مخطط زيارات الموقع الشهري
  new Chart(
    document.getElementById("siteVisitsMonthlyChart").getContext("2d"),
    {
      type: "line",
      data: {
        labels: siteVisitsMonths,
        datasets: [
          {
            label: "عدد الزوار",
            data: siteVisitsCounts,
            backgroundColor: "rgba(33, 150, 243, 0.2)",
            borderColor: "#2196f3",
            borderWidth: 3,
            pointBackgroundColor: "#ffd700",
            pointBorderColor: "#14532d",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: "الشهر" } },
          y: {
            beginAtZero: true,
            title: { display: true, text: "عدد الزوار" },
          },
        },
      },
    }
  );
}

// تحديث حالة النشاط كل دقيقتين
function startAdminActivityHeartbeat() {
  const token = localStorage.getItem('umrah_admin_token');
  if (!token) return;
  function updateActivity(isActive) {
    fetch('http://192.168.100.23:3001/api/admin/update-activity-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ is_active: isActive })
    });
  }
  // عند تحميل الصفحة اعتبره نشط
  updateActivity(true);
  // كل دقيقتين
  setInterval(() => updateActivity(true), 2 * 60 * 1000);
  // عند إغلاق الصفحة اعتبره خامل
  window.addEventListener('beforeunload', () => updateActivity(false));
}

document.addEventListener('DOMContentLoaded', startAdminActivityHeartbeat);


// أرسل نبضة النشاط أولاً ثم جلب الإحصائيات مباشرة
async function sendHeartbeatAndLoadDashboard() {
  const token = localStorage.getItem('umrah_admin_token');
  if (token) {
    try {
      await fetch('http://192.168.100.23:3001/api/admin/update-activity-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ is_active: true })
      });
    } catch {}
  }
  // ثم جلب الإحصائيات
  fetchDashboardData().then((data) => {
    window.dashboardData = data;
    renderStats(data.stats);
    renderCharts(
      data.months,
      data.monthlyBookings,
      data.agencyLabels,
      data.agencyCounts,
      data.topAgenciesLabels,
      data.topAgenciesCounts,
      data.topOffersLabels,
      data.topOffersCounts,
      data.siteVisitsMonths,
      data.siteVisitsCounts
    );
  });
}

sendHeartbeatAndLoadDashboard();



 // Unified sidebar loader
function applyLanguage(lang) {
  // Update all elements with data-ar, data-en, data-fr
  document.querySelectorAll('[data-ar], [data-en], [data-fr]').forEach(function(el) {
    if (el.dataset[lang]) {
      el.textContent = el.dataset[lang];
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
      // Wait for sidebar to be in DOM before selecting
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
  return {
    stats,
    pendingAgencies,
    months,
    monthlyBookings,
    agencyLabels,
    agencyCounts,
    agencyDetails,
    adminActivityLogs,
    topAgenciesLabels,
    topAgenciesCounts,
    topOffersLabels,
    topOffersCounts,
    siteVisitsMonths,
    siteVisitsCounts,
    topAgencyYears,
    topAgencyNames,
    topAgencyCounts,
  };
}

// عند كل زيارة للوحة التحكم (dashboard.html) يتم زيادة عداد زيارات الشهر الحالي
fetch('http://192.168.100.23:3001/api/site-stats/visit', { method: 'POST' });

// تعبئة الإحصائيات
function renderStats(stats) {
  const statsGrid = document.getElementById("statsGrid");
  // استثناء الحقول غير المرغوبة من الإحصائيات
  const statsKeys = Object.keys(stats).filter(key => !['totalAgencies', 'totalUsers', 'totalPilgrims', 'totalRejectedAgencies', 'totalRejectedBookings', 'adminActivityCount'].includes(key));
  statsGrid.innerHTML = `
    <div style="margin-bottom:8px;font-size:1rem;color:#888;">
      عدد الإحصائيات المعروضة: <b>${statsKeys.length}</b>
    </div>
    <div class="stats-flex-wrap stats-2-rows">
      <!-- البطاقات -->
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.totalApprovedAgencies}</div>
            <div class="stat-label">الوكالات المقبولة</div>
          </div>
          <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.totalOffers}</div>
            <div class="stat-label">العروض النشطة</div>
          </div>
          <div class="stat-icon"><i class="fas fa-tags"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.pendingRequests}</div>
            <div class="stat-label">الطلبات المعلقة</div>
          </div>
          <div class="stat-icon"><i class="fas fa-clock"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.pendingAgenciesCount}</div>
            <div class="stat-label">الوكالات المعلقة</div>
          </div>
          <div class="stat-icon"><i class="fas fa-user-clock"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.totalBookings}</div>
            <div class="stat-label">إجمالي الحجوزات</div>
          </div>
          <div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.totalAcceptedBookings}</div>
            <div class="stat-label">الحجوزات المقبولة</div>
          </div>
          <div class="stat-icon"><i class="fas fa-check"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.totalAdmins}</div>
            <div class="stat-label">عدد المدراء</div>
          </div>
          <div class="stat-icon"><i class="fas fa-user-shield"></i></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div>
            <div class="stat-number">${stats.activeAdminsNow}</div>
            <div class="stat-label">المدراء النشطون الآن</div>
          </div>
          <div class="stat-icon"><i class="fas fa-bolt"></i></div>
        </div>
      </div>
    </div>
  `;

  // إضافة CSS ديناميكي إذا لم يكن موجوداً
  if (!document.getElementById('stats-flex-wrap-style')) {
    const style = document.createElement('style');
    style.id = 'stats-flex-wrap-style';
    style.innerHTML = `
      .stats-flex-wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        justify-content: center;
        align-items: stretch;
        flex-direction: row;
        flex-wrap: wrap;
      }
      .stats-2-rows {
        flex-wrap: wrap;
        flex-direction: row;
        max-width: 1000px;
        margin: 0 auto;
      }
      .stats-2-rows .stat-card {
        min-width: 180px;
        flex: 1 1 22%;
        max-width: 22%;
        box-sizing: border-box;
      }
      @media (max-width: 900px) {
        .stats-2-rows .stat-card {
          min-width: 140px;
          max-width: 48%;
        }
      }
      @media (max-width: 600px) {
        .stats-2-rows .stat-card {
          min-width: 120px;
          max-width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// جلب تفاصيل وكالة واحدة
async function fetchAgencyDetails(id) {
  // TODO: Replace with local API call
  // Example: fetch agency details from your API
  // Remove/comment the following block if you implement the API call
  return null;
}

// عرض تفاصيل الوكالة في المودال
function showAgencyDetailsModal(agency) {
  const modal = document.getElementById("agencyDetailsModal");
  const content = document.getElementById("agencyDetailsContent");
  content.innerHTML = `
    <div style="text-align:center;">
      ${
        agency.photo_profil
          ? `<img src="${agency.photo_profil}" alt="صورة الملف" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:1rem;">`
          : ""
      }
      <h4 style="margin-bottom:0.5rem;">${agency.nom_agence || ""}</h4>
      <div style="color:#888; margin-bottom:1rem;">${
        agency.email || ""
      }</div>
    </div>
    <table style="width:100%; direction:rtl; border-collapse:collapse;">
      <tr><td style="padding:4px 0;">الولاية:</td><td>${
        agency.wilaya || ""
      }</td></tr>
      <tr><td style="padding:4px 0;">الهاتف:</td><td>${
        agency.telephone || ""
      }</td></tr>
      <tr><td style="padding:4px 0;">رقم الرخصة التجارية:</td><td>${
        agency.commercial_license_number || ""
      }</td></tr>
      <tr><td style="padding:4px 0;">تاريخ الإنشاء:</td><td>${
        agency.date_creation
          ? new Date(agency.date_creation).toLocaleString("ar-EG")
          : ""
      }</td></tr>
      <tr><td style="padding:4px 0;">اللغة المفضلة:</td><td>${
        agency.langue_preferee || ""
      }</td></tr>
      <tr><td style="padding:4px 0;">الموقع الجغرافي:</td><td>${
        agency.latitude && agency.longitude
          ? `${agency.latitude}, ${agency.longitude}`
          : ""
      }</td></tr>
    </table>
    ${
      agency.photo_couverture
        ? `<div style="margin-top:1rem;"><img src="${agency.photo_couverture}" alt="صورة الغلاف" style="width:100%;max-height:120px;object-fit:cover;border-radius:6px;"></div>`
        : ""
    }
  `;
  modal.style.display = "flex";
}

// إغلاق المودال
document.addEventListener("DOMContentLoaded", function () {
  var closeBtn = document.getElementById("closeAgencyModal");
  if (closeBtn) {
    closeBtn.onclick = function () {
      var modal = document.getElementById("agencyDetailsModal");
      if (modal) modal.style.display = "none";
    };
  }
  var modal = document.getElementById("agencyDetailsModal");
  if (modal) {
    modal.onclick = function (e) {
      if (e.target === this) this.style.display = "none";
    };
  }
});

// تم حذف دالة عرض الوكالات المعلقة من لوحة التحكم بناءً على طلبك

// رسم المخططات
function renderCharts(
  months,
  monthlyBookings,
  agencyLabels,
  agencyCounts,
  topAgenciesLabels,
  topAgenciesCounts,
  topOffersLabels,
  topOffersCounts,
  siteVisitsMonths,
  siteVisitsCounts
) {
  // مخطط الحجوزات الشهرية
  new Chart(
    document.getElementById("monthlyBookingsChart").getContext("2d"),
    {
      type: "line",
      data: {
        labels: months,
        datasets: [
          {
            label: "الحجوزات",
            data: monthlyBookings,
            backgroundColor: "rgba(25, 135, 84, 0.2)",
            borderColor: "#198754",
            borderWidth: 3,
            pointBackgroundColor: "#ffd700",
            pointBorderColor: "#14532d",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: "الشهر" } },
          y: {
            beginAtZero: true,
            title: { display: true, text: "عدد الحجوزات" },
          },
        },
      },
    }
  );

  // مخطط توزيع الوكالات المقبولة فقط حسب الولاية
  new Chart(
    document.getElementById("agencyDistributionChart").getContext("2d"),
    {
      type: "pie",
      data: {
        labels: agencyLabels,
        datasets: [
          {
            data: agencyCounts,
            backgroundColor: [
              "#198754",
              "#ffd700",
              "#43e97b",
              "#fa709a",
              "#fee140",
              "#14532d",
            ],
            borderColor: "#fff",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percent = total ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} وكالة (${percent}%)`;
              }
            }
          }
        },
      },
    }
  );

  // منحنى بياني لأكثر الوكالات التي لديها عروض
  new Chart(
    document.getElementById("topAgenciesByOffersChart").getContext("2d"),
    {
      type: "bar",
      data: {
        labels: topAgenciesLabels,
        datasets: [
          {
            label: "عدد العروض",
            data: topAgenciesCounts,
            backgroundColor: "#43e97b",
            borderColor: "#198754",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.label}: ${context.raw} عرض`;
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: "الوكالة" } },
          y: { beginAtZero: true, title: { display: true, text: "عدد العروض" } }
        }
      },
    }
  );

  // منحنى بياني لأكثر العروض طلبا
  new Chart(
    document.getElementById("topRequestedOffersChart").getContext("2d"),
    {
      type: "bar",
      data: {
        labels: topOffersLabels,
        datasets: [
          {
            label: "عدد الطلبات",
            data: topOffersCounts,
            backgroundColor: "#fa709a",
            borderColor: "#c2185b",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.label}: ${context.raw} طلب`;
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: "العرض" } },
          y: { beginAtZero: true, title: { display: true, text: "عدد الطلبات" } }
        }
      },
    }
  );

  // منحنى بياني لأكثر وكالة أضافت عروضًا في كل سنة خلال آخر 10 سنوات
  new Chart(
    document.getElementById("topAgencyByOffersPerYearChart").getContext("2d"),
    {
      type: "bar",
      data: {
        labels: window.dashboardData.topAgencyYears,
        datasets: [
          {
            label: "اسم الوكالة الأعلى",
            data: window.dashboardData.topAgencyCounts,
            backgroundColor: "#ffd700",
            borderColor: "#198754",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function(context) {
                // السنة
                return `السنة: ${context[0].label}`;
              },
              label: function(context) {
                // اسم الوكالة وعدد العروض
                const idx = context.dataIndex;
                const agency = window.dashboardData.topAgencyNames[idx] || "—";
                return `الوكالة: ${agency} | عدد العروض: ${context.raw}`;
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: "السنة" } },
          y: { beginAtZero: true, title: { display: true, text: "عدد العروض" } }
        }
      },
    }
  );

  // مخطط زيارات الموقع الشهري
  new Chart(
    document.getElementById("siteVisitsMonthlyChart").getContext("2d"),
    {
      type: "line",
      data: {
        labels: siteVisitsMonths,
        datasets: [
          {
            label: "عدد الزوار",
            data: siteVisitsCounts,
            backgroundColor: "rgba(33, 150, 243, 0.2)",
            borderColor: "#2196f3",
            borderWidth: 3,
            pointBackgroundColor: "#ffd700",
            pointBorderColor: "#14532d",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: "الشهر" } },
          y: {
            beginAtZero: true,
            title: { display: true, text: "عدد الزوار" },
          },
        },
      },
    }
  );
}

// تحديث حالة النشاط كل دقيقتين
function startAdminActivityHeartbeat() {
  const token = localStorage.getItem('umrah_admin_token');
  if (!token) return;
  function updateActivity(isActive) {
    fetch('http://192.168.100.23:3001/api/admin/update-activity-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ is_active: isActive })
    });
  }
  // عند تحميل الصفحة اعتبره نشط
  updateActivity(true);
  // كل دقيقتين
  setInterval(() => updateActivity(true), 2 * 60 * 1000);
  // عند إغلاق الصفحة اعتبره خامل
  window.addEventListener('beforeunload', () => updateActivity(false));
}

document.addEventListener('DOMContentLoaded', startAdminActivityHeartbeat);


// أرسل نبضة النشاط أولاً ثم جلب الإحصائيات مباشرة
async function sendHeartbeatAndLoadDashboard() {
  const token = localStorage.getItem('umrah_admin_token');
  if (token) {
    try {
      await fetch('http://192.168.100.23:3001/api/admin/update-activity-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ is_active: true })
      });
    } catch {}
  }
  // ثم جلب الإحصائيات
  fetchDashboardData().then((data) => {
    window.dashboardData = data;
    renderStats(data.stats);
    renderCharts(
      data.months,
      data.monthlyBookings,
      data.agencyLabels,
      data.agencyCounts,
      data.topAgenciesLabels,
      data.topAgenciesCounts,
      data.topOffersLabels,
      data.topOffersCounts,
      data.siteVisitsMonths,
      data.siteVisitsCounts
    );
  });
}

sendHeartbeatAndLoadDashboard();



 // Unified sidebar loader
function applyLanguage(lang) {
  // Update all elements with data-ar, data-en, data-fr
  document.querySelectorAll('[data-ar], [data-en], [data-fr]').forEach(function(el) {
    if (el.dataset[lang]) {
      el.textContent = el.dataset[lang];
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
      // Wait for sidebar to be in DOM before selecting
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