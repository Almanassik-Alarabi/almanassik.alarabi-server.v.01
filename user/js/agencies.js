// جلب الوكالات من API وتخزينها في متغير عام
let allAgencies = [];
async function loadAgencies() {
    const grid = document.getElementById('agencies-grid');
    grid.innerHTML = '<div style="text-align:center;padding:30px;">جاري التحميل...</div>';
    try {
        const res = await fetch('http://192.168.100.23:3001/api/user/agencies');
        const data = await res.json();
        if (data.status === 'ok' && Array.isArray(data.agencies)) {
            allAgencies = data.agencies;
            renderAgencies(allAgencies);
            fillWilayaFilter(allAgencies);
        } else {
            grid.innerHTML = '<div style="text-align:center;width:100%;color:#c00;">حدث خطأ أثناء جلب البيانات.</div>';
        }
    } catch (e) {
        grid.innerHTML = '<div style="text-align:center;width:100%;color:#c00;">تعذر الاتصال بالخادم.</div>';
    }
}

// عرض الوكالات في الشبكة
function renderAgencies(agencies) {
    const grid = document.getElementById('agencies-grid');
    grid.innerHTML = '';
    if (!agencies.length) {
        grid.innerHTML = '<div style="text-align:center;padding:40px;">لا توجد وكالات مطابقة.</div>';
        return;
    }
    agencies.forEach(agency => {
        grid.appendChild(createAgencyCard(agency));
    });
}

// تعبئة قائمة الولايات
function fillWilayaFilter(agencies) {
    const select = document.querySelector('.wilaya-filter');
    if (!select) return;
    const wilayas = Array.from(new Set(agencies.map(a => a.wilaya).filter(Boolean)));
    select.innerHTML = '<option value="">كل الولايات</option>' + wilayas.map(w => `<option value="${w}">${w}</option>`).join('');
}

// إنشاء بطاقة وكالة بنفس تنسيق العروض
function createAgencyCard(agency) {
    const card = document.createElement('div');
    card.className = 'agency-card';

    // شارة الاعتماد
    if (agency.is_approved) {
        const badge = document.createElement('span');
        badge.className = 'card-badge approved-badge';
        badge.innerHTML = '<i class="fas fa-check-circle"></i> <span>معتمدة</span>';
        card.appendChild(badge);
    }


    // صورة الغلاف
    const bg = document.createElement('img');
    bg.className = 'agency-image';
    bg.src = agency.background_url || 'img/images123.jpg';
    bg.alt = agency.name;
    card.appendChild(bg);

    // الشعار بشكل دائري فوق صورة الغلاف في الجانب الأيمن
    if (agency.logo_url) {
        const logoWrapper = document.createElement('div');
        logoWrapper.className = 'agency-logo-wrapper';
        logoWrapper.style.position = 'absolute';
        logoWrapper.style.top = '18px';
        logoWrapper.style.right = '18px';
        logoWrapper.style.zIndex = '3';
        logoWrapper.style.background = '#fff';
        logoWrapper.style.borderRadius = '50%';
        logoWrapper.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
        logoWrapper.style.padding = '4px';
        logoWrapper.style.width = '62px';
        logoWrapper.style.height = '62px';
        logoWrapper.style.display = 'flex';
        logoWrapper.style.alignItems = 'center';
        logoWrapper.style.justifyContent = 'center';

        const logo = document.createElement('img');
        logo.src = agency.logo_url;
        logo.alt = agency.name + ' logo';
        logo.style.width = '54px';
        logo.style.height = '54px';
        logo.style.objectFit = 'cover';
        logo.style.borderRadius = '50%';
        logoWrapper.appendChild(logo);
        card.appendChild(logoWrapper);
    }

    // محتوى البطاقة
    const content = document.createElement('div');
    content.className = 'agency-content';

    // العنوان فقط بدون تقييم
    const title = document.createElement('div');
    title.className = 'agency-title';
    const h3 = document.createElement('h3');
    h3.textContent = agency.name;
    title.appendChild(h3);
    content.appendChild(title);

    // الموقع
    const meta = document.createElement('div');
    meta.className = 'agency-meta';
    meta.innerHTML = '<i class="fas fa-map-marker-alt"></i> <span>' + (agency.location_name || '-') + '</span>';
    content.appendChild(meta);

    // وصف مختصر
    // تم حذف السطر النصي "الوكالة متواجدة في ولاية ..."


    // ميزات افتراضية (ترخيص)
    const features = document.createElement('div');
    features.className = 'agency-features';
    features.innerHTML = '<span class="feature-badge">ترخيص: ' + (agency.license_number || '-') + '</span>';
    content.appendChild(features);

    // عنصر العروض المتاحة (سيتم تعبئته لاحقاً)
    const offersList = document.createElement('div');
    offersList.className = 'agency-active-offers';
    offersList.style.margin = '10px 0 0 0';
    offersList.innerHTML = '<span style="color:#888;font-size:14px;">جاري جلب العروض المتاحة...</span>';
    content.appendChild(offersList);

    // جلب العروض المتاحة من API (المسار الصحيح)
    fetch(`http://192.168.100.23:3001/api/user/agency/${agency.id}/active-offers`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'ok' && Array.isArray(data.offers) && data.offers.length > 0) {
                offersList.innerHTML = '<span style="color:#388e3c;font-weight:500;font-size:15px;">العروض المتاحة:</span>' +
                    '<ul style="margin:7px 0 0 0;padding-right:18px;list-style:square inside;color:#222;font-size:14px;">' +
                    data.offers.map(o => `<li><i class=\'fas fa-gift\' style=\'color:var(--primary-color);margin-left:5px;\'></i> <span style=\'font-weight:500;\'>${o.title || o.name}</span> <span style=\'color:#888;font-size:13px;\'>${o.departure_date ? '(المغادرة: ' + o.departure_date.split('T')[0] + ')' : ''}</span></li>`).join('') + '</ul>';
            } else {
                offersList.innerHTML = '<span style="color:#888;font-size:14px;">لا توجد عروض متاحة حالياً</span>';
            }
        })
        .catch(() => {
            offersList.innerHTML = '<span style="color:#c00;font-size:14px;">تعذر جلب العروض</span>';
        });

    // الفوتر (زر العروض وزر الموقع)
    const footer = document.createElement('div');
    footer.className = 'agency-footer';
    // زر العروض
    const offersBtn = document.createElement('button');
    offersBtn.className = 'view-btn';
    offersBtn.innerHTML = '<i class="fas fa-gift"></i> عروض الوكالة';
    offersBtn.onclick = () => {
        window.location.href = `offers.html?agency=${agency.id}`;
    };
    footer.appendChild(offersBtn);
    // زر الموقع بتنسيق جميل
    if (agency.latitude && agency.longitude) {
        const mapBtn = document.createElement('a');
        mapBtn.className = 'map-btn';
        mapBtn.title = 'عرض موقع الوكالة على الخريطة';
        mapBtn.href = `https://www.google.com/maps/search/?api=1&query=${agency.latitude},${agency.longitude}`;
        mapBtn.target = '_blank';
        mapBtn.rel = 'noopener';
        mapBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> الموقع';
        footer.appendChild(mapBtn);
    }
    content.appendChild(footer);

    card.appendChild(content);
    return card;
}


// البحث والفلاتر
function setupAgencyFilters() {
    const searchInput = document.querySelector('.search-input');
    const wilayaSelect = document.querySelector('.wilaya-filter');
    const nearbyBtn = document.querySelector('.nearby-btn');

    function filterAndRender() {
        let filtered = allAgencies;
        const searchVal = searchInput.value.trim().toLowerCase();
        const wilayaVal = wilayaSelect.value;
        if (searchVal) {
            filtered = filtered.filter(a =>
                (a.name && a.name.toLowerCase().includes(searchVal)) ||
                (a.location_name && a.location_name.toLowerCase().includes(searchVal)) ||
                (a.wilaya && a.wilaya.toLowerCase().includes(searchVal))
            );
        }
        if (wilayaVal) {
            filtered = filtered.filter(a => a.wilaya === wilayaVal);
        }
        renderAgencies(filtered);
    }

    searchInput.addEventListener('input', filterAndRender);
    wilayaSelect.addEventListener('change', filterAndRender);

    // زر الأقرب
    nearbyBtn.addEventListener('click', function() {
        if (!navigator.geolocation) {
            alert('المتصفح لا يدعم تحديد الموقع الجغرافي');
            return;
        }
        nearbyBtn.disabled = true;
        nearbyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تحديد الأقرب...';
        navigator.geolocation.getCurrentPosition(function(pos) {
            const { latitude, longitude } = pos.coords;
            // حساب المسافة لكل وكالة
            let agenciesWithDist = allAgencies.map(a => {
                let dist = (a.latitude && a.longitude) ? calcDistance(latitude, longitude, a.latitude, a.longitude) : Infinity;
                return { ...a, _distance: dist };
            });
            agenciesWithDist = agenciesWithDist.filter(a => a._distance !== Infinity);
            agenciesWithDist.sort((a, b) => a._distance - b._distance);
            renderAgencies(agenciesWithDist);
            nearbyBtn.disabled = false;
            nearbyBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> الأقرب إليك';
        }, function() {
            alert('تعذر الحصول على موقعك');
            nearbyBtn.disabled = false;
            nearbyBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> الأقرب إليك';
        });
    });
}

// دالة حساب المسافة بين نقطتين (Haversine)
function calcDistance(lat1, lon1, lat2, lon2) {
    function toRad(x) { return x * Math.PI / 180; }
    const R = 6371; // نصف قطر الأرض كم
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

document.addEventListener('DOMContentLoaded', () => {
    loadAgencies();
    setupAgencyFilters();
});
