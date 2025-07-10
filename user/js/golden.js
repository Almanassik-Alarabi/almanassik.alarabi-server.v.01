// دالة لجلب العروض الذهبية من API وعرضها في الصفحة
async function fetchAndDisplayGoldenOffers() {
    const offersContainer = document.querySelector('.offers-container');
    offersContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center;">جاري التحميل...</div>';
    try {
        const response = await fetch('http://192.168.100.23:3001/api/user/offers/golden');
        const offers = await response.json();
        if (!Array.isArray(offers) || offers.length === 0) {
            offersContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center;">لا توجد عروض ذهبية حالياً</div>';
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
        offersContainer.innerHTML = `<section class="offers-container">${offers.map(offer => {
            let servicesHtml = '';
            if (offer.services && typeof offer.services === 'object') {
                servicesHtml = Object.keys(offer.services).filter(key => offer.services[key]).map(key => {
                    return `<span class="service-icon-with-label"><i class="fas fa-check-circle"></i><span class="service-label">${key}</span></span>`;
                }).join(' ');
            }
            let agencyName = offer.agencies && offer.agencies.name ? offer.agencies.name : '';
            let mainImage = offer.main_image || (offer.hotel_images && offer.hotel_images[0]) || '';
            let locationHtml = '';
            if (offer.entry && offer.exit) {
                locationHtml = `<span class="offer-location"><i class="fas fa-plane-departure"></i> ${offer.entry}</span> <span class="offer-location"><i class="fas fa-plane-arrival"></i> ${offer.exit}</span>`;
            }
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
        }).join('')}</section>`;
    } catch (err) {
        offersContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:red;">حدث خطأ أثناء جلب العروض الذهبية</div>';
    }
}

// تحميل المكونات عند بدء الصفحة
window.addEventListener('DOMContentLoaded', fetchAndDisplayGoldenOffers);
