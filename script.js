/* ==========================================================================
   VGR V-326 — landing page interactions
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  // Each init runs independently so a problem in one (e.g. an older browser
  // missing an API) can't stop the others from working.
  [initNavToggle, initRevealOnScroll, initCountdown, initOrderForm].forEach(function (fn) {
    try {
      fn();
    } catch (err) {
      /* one feature failing should not break the rest of the page */
    }
  });
});

/** Array.prototype.forEach over a NodeList, for slightly wider compatibility. */
function forEachNode(nodeList, callback) {
  Array.prototype.forEach.call(nodeList, callback);
}

/**
 * Mobile navigation toggle.
 */
function initNavToggle() {
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('primaryNav');

  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  forEachNode(nav.querySelectorAll('a'), function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/**
 * Reveals elements with a blur-to-sharp transition as they scroll into view.
 */
function initRevealOnScroll() {
  var items = document.querySelectorAll('.reveal-blur');
  if (!items.length) return;

  // Safety net set up first and unconditionally: if IntersectionObserver is
  // missing, misbehaves, or throws in some browser, content still becomes
  // visible after a short delay instead of staying blank forever.
  var revealAll = function () {
    forEachNode(items, function (el) { el.classList.add('is-visible'); });
  };
  var fallbackTimer = setTimeout(revealAll, 2500);

  try {
    if (!('IntersectionObserver' in window)) {
      clearTimeout(fallbackTimer);
      revealAll();
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    forEachNode(items, function (el) { observer.observe(el); });
  } catch (err) {
    clearTimeout(fallbackTimer);
    revealAll();
  }
}

/**
 * Sale countdown timer.
 *
 * IMPORTANT: set SALE_END to a real, fixed end date/time for your current
 * promotion. Don't silently push this date forward every time it expires —
 * an "ending soon" countdown that never actually ends is a misleading
 * pattern. When the promotion ends, update the price and this date together.
 */
function initCountdown() {
  var SALE_END = new Date('2026-09-21T23:59:59+03:00').getTime();

  var daysEl = document.getElementById('cd-days');
  var hoursEl = document.getElementById('cd-hours');
  var minutesEl = document.getElementById('cd-minutes');
  var secondsEl = document.getElementById('cd-seconds');

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function tick() {
    var diff = SALE_END - Date.now();

    if (diff <= 0) {
      daysEl.textContent = '0';
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      secondsEl.textContent = '00';
      clearInterval(timerId);
      return;
    }

    var totalSeconds = Math.floor(diff / 1000);
    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;

    daysEl.textContent = String(days);
    hoursEl.textContent = pad(hours);
    minutesEl.textContent = pad(minutes);
    secondsEl.textContent = pad(seconds);
  }

  tick();
  var timerId = setInterval(tick, 1000);
}

/**
 * Order form: validates input, sends the lead to Telegram, shows a
 * confirmation message.
 *
 * SECURITY NOTE: this sends the message directly from the browser using a
 * Telegram bot token, which means the token is visible to anyone who views
 * the page source. That's an acceptable trade-off for a small landing page,
 * but it does mean someone could technically use this token to send messages
 * through your bot. For stronger security later, move this call into a
 * Cloudflare Pages Function (or similar serverless function) so the token
 * never reaches the browser, and call that function from here instead.
 */
function initOrderForm() {
  var form = document.getElementById('orderForm');
  var status = document.getElementById('orderStatus');

  if (!form || !status) return;

  var TELEGRAM_BOT_TOKEN = '8052812976:AAHQegsC3jl73r6s7AcR7pxKhrPEiwr6Lvw';
  var TELEGRAM_CHAT_ID = '493693610';

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var nameInput = document.getElementById('name');
    var phoneInput = document.getElementById('phone');
    var submitBtn = form.querySelector('button[type="submit"]');

    var name = nameInput.value.trim();
    var phone = phoneInput.value.trim();
    var phonePattern = /^\+?[0-9\s\-()]{10,15}$/;

    if (name.length < 2) {
      status.textContent = "Будь ласка, вкажіть, як до вас звертатись.";
      status.style.color = '#d8a44c';
      nameInput.focus();
      return;
    }

    if (!phonePattern.test(phone)) {
      status.textContent = 'Перевірте номер телефону — здається, у ньому помилка.';
      status.style.color = '#d8a44c';
      phoneInput.focus();
      return;
    }

    var text = 'Нове замовлення VGR V-326' +
      '\nІм\'я: ' + name +
      '\nТелефон: ' + phone +
      '\nЦіна: 999 грн';

    var apiUrl = 'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';

    if (!('fetch' in window)) {
      status.textContent = 'Ваш браузер застарілий для автоматичної відправки. Зателефонуйте нам, будь ласка, за номером у контактах.';
      status.style.color = '#d8a44c';
      return;
    }

    submitBtn.disabled = true;
    status.textContent = 'Надсилаємо заявку...';
    status.style.color = '#9ca3a8';

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text })
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Telegram request failed');
        status.textContent = 'Дякуємо! Вашу заявку прийнято. Ми зв\'яжемося з вами найближчим часом.';
        status.style.color = '#22c7a9';
        form.reset();
      })
      .catch(function () {
        status.textContent = 'Не вдалося надіслати заявку автоматично. Зателефонуйте нам, будь ласка, за номером у контактах.';
        status.style.color = '#d8a44c';
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });
}
