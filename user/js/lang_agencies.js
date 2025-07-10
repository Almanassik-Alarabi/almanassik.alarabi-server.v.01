// لغة الواجهة للوكالات
const agenciesTranslations = {
  ar: {
    title: "وكالات العمرة",
    nearest: "أقرب الوكالات",
    loading: "جاري التحميل...",
    noData: "لا توجد وكالات متاحة حالياً",
    gps: "GPS"
  },
  en: {
    title: "Umrah Agencies",
    nearest: "Nearest Agencies",
    loading: "Loading...",
    noData: "No agencies available",
    gps: "GPS"
  },
  fr: {
    title: "Agences Omra",
    nearest: "Agences les plus proches",
    loading: "Chargement...",
    noData: "Aucune agence disponible",
    gps: "GPS"
  }
};

function applyAgenciesTranslations(lang) {
  document.title = agenciesTranslations[lang].title;
  document.getElementById('nearestBtn').textContent = agenciesTranslations[lang].nearest;
  // تحديث النصوص الديناميكية لاحقاً في renderAgencies
}

// --- Language switcher logic (مشابه للهوم) ---
function setupAgenciesLangSwitcher() {
  const mainLangBtn = document.getElementById('mainLangBtn');
  const langOptions = document.getElementById('langOptions');
  const langBtns = langOptions ? langOptions.querySelectorAll('.lang-btn') : [];
  function getLangIcon(lang) {
    return { ar: '🇩🇿', en: '🇬🇧', fr: '🇫🇷' }[lang] || '🌐';
  }
  function getLangText(lang) {
    return { ar: 'العربية', en: 'English', fr: 'Français' }[lang] || 'العربية';
  }
  function ensureMainBtnSpans() {
    if (!mainLangBtn.querySelector('.lang-icon')) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'lang-icon';
      mainLangBtn.prepend(iconSpan);
    }
    if (!mainLangBtn.querySelector('.lang-text')) {
      const textSpan = document.createElement('span');
      textSpan.className = 'lang-text';
      mainLangBtn.insertBefore(textSpan, mainLangBtn.querySelector('i') || null);
    }
  }
  function updateMainLangBtn(lang) {
    ensureMainBtnSpans();
    mainLangBtn.querySelector('.lang-icon').textContent = getLangIcon(lang) + ' ';
    mainLangBtn.querySelector('.lang-text').textContent = getLangText(lang);
    mainLangBtn.dataset.lang = lang;
    mainLangBtn.title = getLangText(lang);
    langBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
    localStorage.setItem('preferredLang', lang);
  }
  mainLangBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    langOptions.style.display = langOptions.style.display === 'block' ? 'none' : 'block';
  });
  langBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      const lang = btn.dataset.lang;
      updateMainLangBtn(lang);
      langOptions.style.display = 'none';
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.body.setAttribute('lang', lang);
      applyAgenciesTranslations(lang);
      renderAgencies(agenciesCache, lang);
    });
  });
  document.addEventListener('click', () => {
    langOptions.style.display = 'none';
  });
  // On load
  const preferredLang = localStorage.getItem('preferredLang') || document.documentElement.lang || document.body.getAttribute('lang') || 'ar';
  updateMainLangBtn(preferredLang);
  document.documentElement.lang = preferredLang;
  document.documentElement.dir = preferredLang === 'ar' ? 'rtl' : 'ltr';
  document.body.setAttribute('lang', preferredLang);
  applyAgenciesTranslations(preferredLang);
  renderAgencies(agenciesCache, preferredLang);
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(setupAgenciesLangSwitcher, 400); // بعد تحميل الهيدر
});

// تحديث renderAgencies لقبول اللغة
function renderAgencies(agencies, lang) {
  lang = lang || (localStorage.getItem('preferredLang') || 'ar');
  const container = document.getElementById('agenciesContainer');
  if (!agencies || agencies.length === 0) {
    container.innerHTML = `<div class="no-data">${agenciesTranslations[lang].noData}</div>`;
    return;
  }
  let html = '';
  for (let i = 0; i < agencies.length; i += 2) {
    html += '<div class="agencies-row">';
    for (let j = i; j < i + 2 && j < agencies.length; j++) {
      const agency = agencies[j];
      html += `
      <div class="agency-card">
        <div class="agency-bg" style="background-image:url('${agency.background_url || ''}')"></div>
        <div class="agency-info">
          <img class="agency-logo" src="${agency.logo_url || ''}" alt="شعار الوكالة">
          <div class="agency-name">${agency.name}</div>
          <div class="agency-location">${agency.location_name}</div>
          <button class="agency-gps-btn" onclick="window.open('https://maps.google.com/?q=${agency.latitude},${agency.longitude}', '_blank')">${agenciesTranslations[lang].gps}</button>
        </div>
      </div>
      `;
    }
    html += '</div>';
  }
  container.innerHTML = html;
}

// استبدل renderAgencies في الكود الأصلي بهذا
// وتأكد أن كل استدعاء لها يمرر اللغة
