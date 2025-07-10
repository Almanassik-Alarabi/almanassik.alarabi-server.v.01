// تضمين تلقائي لمكونات الشريط العلوي والسفلي في الصفحات
window.addEventListener('DOMContentLoaded', function() {
    // Top Bar
    const topBarPlaceholder = document.getElementById('top-bar-placeholder');
    if (topBarPlaceholder) {
        fetch('components/top-bar.html')
            .then(res => res.text())
            .then(html => {
                topBarPlaceholder.innerHTML = html;
                // إخفاء شريط البحث في كل الصفحات ما عدا home1.html
                var currentPage = window.location.pathname.split('/').pop();
                if (currentPage !== 'home1.html') {
                    var searchContainer = document.querySelector('.search-container');
                    if (searchContainer) searchContainer.style.display = 'none';
                }
            });
    }
    // Bottom Bar
    const bottomBarPlaceholder = document.getElementById('bottom-bar-placeholder');
    if (bottomBarPlaceholder) {
        fetch('components/bottom-bar.html')
            .then(res => res.text())
            .then(html => {
                bottomBarPlaceholder.innerHTML = html;
                // تفعيل الزر المناسب حسب الصفحة الحالية
                const pageMap = {
                    'home1.html': 'home',
                    'agencies.html': 'agencies',
                    'offers.html': 'offers',
                    'golden.html': 'golden',
                    'learn_omra.html': 'learn'
                };
                const current = window.location.pathname.split('/').pop();
                const activePage = pageMap[current] || 'home';
                const buttons = document.querySelectorAll('.bottom-bar .nav-btn');
                buttons.forEach(btn => btn.classList.remove('active'));
                const activeBtn = document.querySelector(`.bottom-bar .nav-btn[data-page="${activePage}"]`);
                if (activeBtn) {
                    activeBtn.classList.add('active');
                }

                // تعريف دالة التنقل بشكل عالمي بعد إدراج الشريط
                window.navigateToPage = function(page) {
                    const buttons = document.querySelectorAll('.bottom-bar .nav-btn');
                    buttons.forEach(btn => btn.classList.remove('active'));
                    const activeBtn = document.querySelector(`.bottom-bar .nav-btn[data-page="${page}"]`);
                    if (activeBtn) {
                        activeBtn.classList.add('active');
                    }
                    let pageMap = {
                        home: 'home1.html',
                        agencies: 'agencies.html',
                        offers: 'offers.html',
                        golden: 'golden.html',
                        learn: 'learn_omra.html'
                    };
                    if (pageMap[page]) {
                        window.location.href = pageMap[page];
                    }
                };
            });
    }
});
