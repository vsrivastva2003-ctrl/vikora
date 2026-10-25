const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');

toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  toggle.textContent = open ? '×' : '☰';
});

nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open menu');
  toggle.textContent = '☰';
}));

document.querySelectorAll('.checkout-start').forEach(link => link.addEventListener('click', () => {
  document.querySelector('#plan-type').value = link.dataset.plan;
  const licenseType = document.querySelector('#license-type');
  licenseType.value = '';
  document.querySelector('#checkout-total').textContent = 'Choose a license type to see your total.';
  document.querySelector('#checkout-status').textContent = 'Payment processing and automatic license and invoice emails are not connected yet.';
  document.querySelector('#customer-location').value = '';
  document.querySelector('#payment-choice').hidden = true;
  document.querySelector('#license-success').hidden = true;
  document.querySelector('#checkout-button').textContent = 'Continue to payment ↗';
  document.querySelector('#checkout').hidden = false;
}));

document.querySelector('.about-actions a[href="#contact"]')?.addEventListener('click', () => {
  document.querySelector('#contact-form select[name="topic"]').value = 'Book a free demo';
});

function updateCheckoutTotal() {
  const plan = document.querySelector('#plan-type').value;
  const licenseType = document.querySelector('#license-type').value;
  const priceTable = {
    Buy: { 'single-user': '₹20,999 / lifetime', 'multi-user': '₹55,000 / lifetime' },
    Rent: { 'single-user': '₹2,999 / month', 'multi-user': '₹5,999 / month' }
  };
  const amount = priceTable[plan]?.[licenseType];
  document.querySelector('#checkout-total').textContent = amount ? `${amount} · local applicable taxes extra` : 'Choose a license type to see your total.';
  document.querySelector('.checkout-license-detail').hidden = licenseType !== 'multi-user';
}

document.querySelector('#license-type').addEventListener('change', updateCheckoutTotal);
document.querySelector('#plan-type').addEventListener('change', updateCheckoutTotal);

document.querySelector('#customer-location').addEventListener('change', event => {
  const india = event.target.value === 'india';
  const route = document.querySelector('#payment-route');
  route.innerHTML = india ? '<span class="razorpay-mark">R</span> Razorpay' : '<span class="paypal-mark">P</span> PayPal';
  document.querySelector('#payment-choice').hidden = !event.target.value;
  document.querySelector('#checkout-button').innerHTML = `Continue to ${india ? 'Razorpay' : 'PayPal'} <span>↗</span>`;
  document.querySelector('#checkout-status').textContent = india
    ? 'Razorpay domestic payments are not connected yet. This preview will not collect a payment.'
    : 'PayPal international payments are not connected yet. This preview will not collect a payment.';
});

document.querySelector('#checkout-form').addEventListener('submit', event => {
  event.preventDefault();
  document.querySelector('#checkout-status').textContent = 'Checkout is not connected yet, so no payment was taken. After a server-verified payment, the customer can generate a license key and receive an invoice by email.';
});

document.querySelector('#generate-license').addEventListener('click', async () => {
  const status = document.querySelector('#license-status');
  status.textContent = 'Connecting to the secure license service…';
  try {
    const response = await fetch('/api/licenses/generate', { method: 'POST' });
    if (!response.ok) throw new Error('License service unavailable');
    const result = await response.json();
    status.textContent = `Your license key: ${result.licenseKey}`;
  } catch {
    status.textContent = 'The secure license service is not connected yet. Your key will be generated here after payment and database setup.';
  }
});

document.querySelector('#contact-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const subject = encodeURIComponent(`Vikora enquiry: ${data.get('topic')}`);
  const body = encodeURIComponent(`Name: ${data.get('name')}\nEmail: ${data.get('email')}\nTopic: ${data.get('topic')}\n\n${data.get('message')}`);
  document.querySelector('#form-note').textContent = 'Opening your email app with your message ready to send.';
  window.location.href = `mailto:hello@vikora.com?subject=${subject}&body=${body}`;
});

const galleryCards = document.querySelectorAll('.about-gallery-card');
if ('IntersectionObserver' in window) {
  const galleryObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        galleryObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16 });
  galleryCards.forEach(card => galleryObserver.observe(card));
} else {
  galleryCards.forEach(card => card.classList.add('is-visible'));
}

// Accessible slideshow controls: manual navigation, reduced-motion support, and optional auto-play.
const showcase = document.querySelector('.vikora-showcase');
if (showcase) {
  const slides = [...showcase.querySelectorAll('.showcase-slide')];
  const dots = [...showcase.querySelectorAll('.showcase-dot')];
  const counter = showcase.querySelector('.showcase-count');
  const playButton = showcase.querySelector('.showcase-play');
  let activeSlide = 0;
  let autoAdvance;
  let inView = false;
  let pausedByUser = false;
  let pausedByFocus = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const showSlide = index => {
    if (!slides.length) return;
    activeSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === activeSlide;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      if (dots[i]) {
        dots[i].classList.toggle('is-active', active);
        dots[i].setAttribute('aria-selected', String(active));
        dots[i].tabIndex = active ? 0 : -1;
      }
    });
    if (counter) {
      counter.innerHTML = `${String(activeSlide + 1).padStart(2, '0')} <i>/ ${String(slides.length).padStart(2, '0')}</i>`;
    }
  };

  const stopAutoAdvance = () => {
    window.clearInterval(autoAdvance);
    autoAdvance = undefined;
    showcase.classList.remove('is-playing');
  };

  const startAutoAdvance = () => {
    stopAutoAdvance();
    if (!reducedMotion && !pausedByUser && inView && !document.hidden &&
        !showcase.matches(':hover') && !pausedByFocus && slides.length > 1) {
      showcase.classList.add('is-playing');
      autoAdvance = window.setInterval(() => showSlide(activeSlide + 1), 6000);
    }
  };

  dots.forEach((dot, i) => dot.addEventListener('click', () => {
    showSlide(i);
    startAutoAdvance();
  }));
  showcase.querySelector('.showcase-prev')?.addEventListener('click', () => {
    showSlide(activeSlide - 1);
    startAutoAdvance();
  });
  showcase.querySelector('.showcase-next')?.addEventListener('click', () => {
    showSlide(activeSlide + 1);
    startAutoAdvance();
  });
  showcase.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { showSlide(activeSlide + 1); startAutoAdvance(); }
    if (event.key === 'ArrowLeft') { showSlide(activeSlide - 1); startAutoAdvance(); }
  });
  playButton?.addEventListener('click', () => {
    pausedByUser = !pausedByUser;
    playButton.textContent = pausedByUser ? '▶' : 'Ⅱ';
    playButton.setAttribute('aria-label', pausedByUser ? 'Play automatic slideshow' : 'Pause automatic slideshow');
    playButton.title = pausedByUser ? 'Play automatic slideshow' : 'Pause automatic slideshow';
    startAutoAdvance();
  });
  showcase.addEventListener('mouseenter', stopAutoAdvance);
  showcase.addEventListener('mouseleave', startAutoAdvance);
  showcase.addEventListener('focusin', () => { pausedByFocus = true; stopAutoAdvance(); });
  showcase.addEventListener('focusout', () => {
    window.setTimeout(() => {
      pausedByFocus = showcase.contains(document.activeElement);
      startAutoAdvance();
    }, 0);
  });
  document.addEventListener('visibilitychange', startAutoAdvance);
  showSlide(0);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      inView ? startAutoAdvance() : stopAutoAdvance();
    }, { threshold: 0.25 }).observe(showcase);
  } else {
    inView = true;
    startAutoAdvance();
  }
}


document.querySelector('#franchise-form')?.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const subject = encodeURIComponent('Vikora franchise / business partner enquiry');
  const body = encodeURIComponent(
    'Franchise / Business Partner Enquiry\n\n' +
    'Name: ' + data.get('name') + '\n' +
    'Email: ' + data.get('email') + '\n' +
    'Phone: ' + data.get('phone') + '\n' +
    'City / State: ' + data.get('location') + '\n' +
    'Business experience: ' + data.get('experience') + '\n' +
    'Investment range: ' + (data.get('investment') || 'Prefer to discuss') + '\n\n' +
    'Plan / questions: ' + (data.get('message') || 'Not provided')
  );
  document.querySelector('#franchise-note').textContent = 'Opening your email app with the enquiry ready. Please send the email to complete your enquiry.';
  window.location.href = 'mailto:hello@vikora.com?subject=' + subject + '&body=' + body;
});
