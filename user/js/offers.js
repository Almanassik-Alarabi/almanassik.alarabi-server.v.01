// دالة لجلب العروض من API
let allOffers = [];
let agencySet = new Set();
let airportSet = new Set();
async function fetchAndDisplayOffers(filteredOffers = null) {
    // تشخيص: طباعة بيانات العروض في الكونسول
    console.log('allOffers (قبل):', allOffers, 'filteredOffers:', filteredOffers);
    // إذا كان filteredOffers حدث (Event) تجاهله
    if (filteredOffers && typeof filteredOffers === 'object' && filteredOffers instanceof Event) {
        filteredOffers = null;
    }
    const offersContainer = document.querySelector('.offers-container');
    offersContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center;">جاري التحميل...</div>';
    try {
        let offers = filteredOffers;
        if (!offers) {
            const response = await fetch('http://192.168.100.23:3001/api/user/offers');
            let apiResult = await response.json();
            // دعم الاستجابة كمصفوفة أو كائن فيه data
            offers = Array.isArray(apiResult) ? apiResult : apiResult.data || [];
            allOffers = offers;
            // جلب الوكالات من API منفصل
            fetchAgenciesAndAirports(offers);
        }
        // لعرض جميع العروض دائماً عند أول تحميل (بدون أي فلترة)
        if (!filteredOffers) {
            offers = allOffers;
        }
// جلب الوكالات والمطارات من API وتعبئة القوائم
async function fetchAgenciesAndAirports(offers) {
    // جلب الوكالات والمطارات من API موحد
    try {
        const res = await fetch('http://localhost:3001/api/user/with-offers-and-airports');
        const data = await res.json();
        agencySet = new Set();
        airportSet = new Set();
        if (data && data.status === 'ok' && Array.isArray(data.agencies)) {
            // حفظ الوكالات والمطارات في متغير عام لاستخدامه في الفلترة
            window.lastAgenciesWithAirports = data.agencies;
            data.agencies.forEach(agency => {
                if (agency.name) agencySet.add(agency.name);
                // المطارات الخاصة بالوكالة (من agency.airports)
                if (Array.isArray(agency.airports)) {
                    agency.airports.forEach(ap => {
                        if (ap && ap.name) airportSet.add(ap.name);
                    });
                }
            });
        }
        airportSet.delete(undefined); airportSet.delete(null); airportSet.delete("");
        updateAgencyAndAirportLists();
    } catch (e) {
        // fallback: من بيانات العروض فقط
        agencySet = new Set();
        airportSet = new Set();
        offers.forEach(offer => {
            if (offer.agencies && offer.agencies.name) agencySet.add(offer.agencies.name);
            if (offer.departure_airport) airportSet.add(offer.departure_airport);
            else if (offer.airport) airportSet.add(offer.airport);
        });
        airportSet.delete(undefined); airportSet.delete(null); airportSet.delete("");
        updateAgencyAndAirportLists();
    }
}
        if (!Array.isArray(offers) || offers.length === 0) {
            offersContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center;">لا توجد عروض متاحة حالياً</div>';
            return;
        }
        // تحديد أقل سعر quint متوفر
        let minPrice = Infinity;
        let bestOfferId = null;
        offers.forEach(offer => {
            if (Number(offer.price_quint) && Number(offer.price_quint) < minPrice) {
                minPrice = Number(offer.price_quint);
                bestOfferId = offer.id;
            }
        });
        offersContainer.innerHTML = offers.map(offer => {
            // الخدمات (services) كأيقونات مع اسم الخدمة أسفل كل أيقونة
            let servicesHtml = '';
            if (offer.services && typeof offer.services === 'object') {
                servicesHtml = Object.keys(offer.services).filter(key => offer.services[key]).map(key => {
                    let icon = '', label = '';
                    if (key === 'visa') {
                        icon = '<i class="fas fa-passport" title="تأشيرة"></i>';
                        label = 'تأشيرة';
                    } else if (key === 'meals') {
                        icon = '<i class="fas fa-utensils" title="وجبات"></i>';
                        label = 'وجبات';
                    } else if (key === 'transport') {
                        icon = '<i class="fas fa-bus" title="نقل"></i>';
                        label = 'نقل';
                    } else {
                        icon = '<i class="fas fa-check-circle"></i>';
                        label = key;
                    }
                    return `<span class="offer-detail service-icon-with-label">${icon}<span class="service-label">${label}</span></span>`;
                }).join(' ');
            }
            // اسم الوكالة الحقيقي
            let agencyName = offer.agencies && offer.agencies.name ? offer.agencies.name : '';
            // صورة العرض واسمها
            let mainImage = offer.main_image || (offer.hotel_images && offer.hotel_images[0]) || '';
            let imageName = mainImage ? mainImage.split('/').pop() : '';
            // الموقع (entry/exit) كأيقونات مع اسم المدينة
            let locationHtml = '';
            if (offer.entry && offer.exit) {
                locationHtml = `
                  <span class="offer-location"><i class="fas fa-sign-in-alt" title="دخول"></i> ${offer.entry}</span>
                  <span class="offer-location"><i class="fas fa-sign-out-alt" title="خروج"></i> ${offer.exit}</span>
                `;
            } else if (offer.entry) {
                locationHtml = `<span class="offer-location"><i class="fas fa-sign-in-alt" title="دخول"></i> ${offer.entry}</span>`;
            } else if (offer.exit) {
                locationHtml = `<span class="offer-location"><i class="fas fa-sign-out-alt" title="خروج"></i> ${offer.exit}</span>`;
            }
            // شارة أفضل عرض
            let bestBadge = (offer.id === bestOfferId) ? `<div class="offer-badge best-offer"><i class='fas fa-crown'></i> أفضل عرض</div>` : '';
            return `
            <div class="offer-card">
                ${bestBadge}
                <img src="${mainImage}" alt="${offer.title || ''}" class="offer-image">
                <div class="offer-content">
                    
                    <h3 class="offer-title">${offer.title || ''}</h3>
                    <div class="offer-agency-location-row" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                        <div class="offer-agency"><i class="fas fa-building"></i> ${agencyName}</div>
                        <div class="offer-location-group" style="display:flex; gap:7px; align-items:center;">${locationHtml}</div>
                    </div>
                    <div class="offer-details">
                        ${servicesHtml}
                    </div>
                    <div class="offer-price">
                      <button class="offer-btn" style="order:1; margin-left:0px;" onclick="window.location.href='offer-details.html?id=${offer.id}'"><i class="fas fa-eye"></i> تفاصيل</button>
                      <span class="price-amount" style="display: flex; flex-direction: column; align-items: flex-end; order:2; margin-right: 0px;">
                          <span style="display: inline-block; text-align: center; line-height: 1; margin-bottom: 0px;">
                            <span style="display: flex; justify-content: center; gap: 3px;">
                              <i class="fas fa-user" style="color:#d4af37;"></i>
                              <i class="fas fa-user" style="color:#d4af37;"></i>
                              <i class="fas fa-user" style="color:#d4af37;"></i>
                            </span>
                            <span style="display: flex; justify-content: center; gap: 3px; margin-top: 3px;">
                              <i class="fas fa-user" style="color:#d4af37;"></i>
                              <i class="fas fa-user" style="color:#d4af37;"></i>
                            </span>
                          </span>
                          <span style="font-weight: bold; color: #004d40; font-size: 1.05rem;">
                            ${Number(offer.price_quint) ? offer.price_quint + ' DA' : '<span style="color:#bfa338;font-size:0.98em">غير متوفر</span>'}
                          </span>
                      </span>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    } catch (err) {
        offersContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:red;">حدث خطأ أثناء جلب العروض</div>';
    }
}


// تفعيل فلترة العروض
function applyFilters() {
    let filtered = [...allOffers];
    // فلترة باسم الوكالة
    const agencyName = document.getElementById('agencyName').value;
    if (agencyName) {
        filtered = filtered.filter(offer => {
            const name = offer.agencies && offer.agencies.name ? offer.agencies.name : '';
            return name === agencyName;
        });
    }
    // فلترة مطار الإقلاع (فلترة الوكالات أولاً ثم العروض)
    const airport = document.getElementById('airport').value;
    if (airport && window.lastAgenciesWithAirports) {
        // احصل على قائمة الوكالات التي تحتوي على هذا المطار
        const allowedAgencyIds = window.lastAgenciesWithAirports
            .filter(agency => Array.isArray(agency.airports) && agency.airports.some(ap => ap && ap.name === airport))
            .map(agency => agency.id);
        filtered = filtered.filter(offer => allowedAgencyIds.includes(offer.agency_id));
    }
    // ترتيب السعر
    const priceOrder = document.getElementById('priceOrder').value;
    if (priceOrder === 'asc') {
        filtered = filtered.sort((a, b) => Number(a.price_quint) - Number(b.price_quint));
    } else if (priceOrder === 'desc') {
        filtered = filtered.sort((a, b) => Number(b.price_quint) - Number(a.price_quint));
    }
    fetchAndDisplayOffers(filtered);
}

// تحديث قوائم الوكالات والمطارات
function updateAgencyAndAirportLists() {
    const agencySelect = document.getElementById('agencyName');
    const airportSelect = document.getElementById('airport');
    if (agencySelect) {
        // احفظ القيمة المختارة
        const selected = agencySelect.value;
        agencySelect.innerHTML = '<option value="">كل الوكالات</option>' +
            Array.from(agencySet).map(name => `<option value="${name}">${name}</option>`).join('');
        if (selected) agencySelect.value = selected;
    }
    if (airportSelect) {
        const selected = airportSelect.value;
        airportSelect.innerHTML = '<option value="">كل المطارات</option>' +
            Array.from(airportSet).map(name => `<option value="${name}">${name}</option>`).join('');
        if (selected) airportSelect.value = selected;
    }
}

// زر الأقرب للحرم
const nearestBtn = document.getElementById('nearestHaramBtn');
if (nearestBtn) {
    nearestBtn.addEventListener('click', function() {
        let filtered = [...allOffers];
        filtered = filtered.filter(o => o.hotel_distance !== undefined && o.hotel_distance !== null);
        filtered = filtered.sort((a, b) => Number(a.hotel_distance) - Number(b.hotel_distance));
        fetchAndDisplayOffers(filtered);
    });
}

// زر تصفية العروض (زر يدوي فقط)
const filterBtn = document.getElementById('applyFilters');
if (filterBtn) {
    filterBtn.addEventListener('click', applyFilters);
}

// تفعيل الفلترة الآنية عند تغيير أي فلتر
function enableInstantFilters() {
    const agencySelect = document.getElementById('agencyName');
    const airportSelect = document.getElementById('airport');
    const priceOrder = document.getElementById('priceOrder');
    if (agencySelect) agencySelect.addEventListener('change', applyFilters);
    if (airportSelect) airportSelect.addEventListener('change', applyFilters);
    if (priceOrder) priceOrder.addEventListener('change', applyFilters);
}

// تفعيل الفلترة الآنية بعد تحديث القوائم
const origUpdateAgencyAndAirportLists = updateAgencyAndAirportLists;
updateAgencyAndAirportLists = function() {
    origUpdateAgencyAndAirportLists();
    enableInstantFilters();
};

// تحميل العروض عند بدء الصفحة فقط
document.addEventListener('DOMContentLoaded', function() { fetchAndDisplayOffers(); });
