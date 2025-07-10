// Handle admin login form submission
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const successMessage = document.getElementById('success-message');
const successText = document.getElementById('success-text');

loginForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  errorMessage.style.display = 'none';
  successMessage.style.display = 'none';

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('http://192.168.100.23:3001/api/admin/login-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      // Save token for future authenticated requests
      if (data.access_token) {
        localStorage.setItem('umrah_admin_token', data.access_token);
      }
      successText.textContent = 'تم تسجيل الدخول بنجاح!';
      successMessage.style.display = 'block';
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } else {
      errorText.textContent = data.message || 'فشل تسجيل الدخول. تحقق من البيانات.';
      errorMessage.style.display = 'block';
    }
  } catch (err) {
    errorText.textContent = 'حدث خطأ في الاتصال بالخادم.';
    errorMessage.style.display = 'block';
  }
});

// Password visibility toggle
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
togglePassword.addEventListener('click', function () {
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  passwordInput.setAttribute('type', type);
  this.classList.toggle('fa-eye-slash');
});
