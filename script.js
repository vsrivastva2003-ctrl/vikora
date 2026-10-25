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


// Interactive trade selector: all figures are illustrative sample data, not live customer results.
const tradeShowcase = document.querySelector('#trade-showcase');
if (tradeShowcase) {
  const tradeExamples = {
    retail: {
      title:'Retail & shops', subtitle:'Sales, stock movement, and margins in one view.',
      kpis:[['Sales this month','₹8.4L','Illustrative total'],['Stock alerts','12','Items to review'],['Orders','286','Illustrative count']],
      chart:'Sales by product group',caption:'Example breakdown · not actual results',
      bars:[['Essentials',86],['Home',68],['Personal care',52],['Seasonal',34]],
      benefitTitle:'Know what sells—and what needs attention.',
      description:'Bring daily sales, stock levels, purchase activity, and finance records together so owners can review operations without chasing separate spreadsheets.',
      benefits:['Spot low-stock items earlier','Review product and category sales','Connect billing, inventory, and accounts'],
      workflow:['Sales','Inventory','Accounts','Reports'],
      creativeTitle:'From daily entries to a visual business picture.',
      creativeDescription:'Dashboards, connected records, and clear reports for faster review.'
    },
    distribution: {
      title:'Wholesale & distribution', subtitle:'Track orders, purchasing, stock, and customer balances.',
      kpis:[['Order value','₹12.6L','Illustrative total'],['Reorder alerts','18','Items to review'],['Open orders','74','Illustrative count']],
      chart:'Orders by product line',caption:'Example index · not actual results',
      bars:[['Electrical',91],['Hardware',73],['Plumbing',59],['Tools',42]],
      benefitTitle:'Keep stock and fulfilment moving together.',
      description:'See a sample view of order pipelines, supplier purchases, stock availability, and receivables in a connected operating workflow.',
      benefits:['Review pending orders and fulfilment','Monitor reorder points and supplier activity','Follow customer balances and invoices'],
      workflow:['Orders','Purchase','Inventory','Dispatch','Accounts'],
      creativeTitle:'Turn supply-chain activity into clear signals.',
      creativeDescription:'Use connected records and exception-focused reports to help teams coordinate.'
    },
    manufacturing: {
      title:'Manufacturing', subtitle:'Bring materials, production jobs, and costs into view.',
      kpis:[['Job orders','42','Illustrative count'],['Material alerts','9','Items to review'],['On-time jobs','87%','Sample indicator']],
      chart:'Production status by work cell',caption:'Example index · not actual results',
      bars:[['Assembly',88],['Finishing',72],['Packaging',64],['Inspection',47]],
      benefitTitle:'Connect materials, work orders, and costs.',
      description:'A configured ERP can help teams coordinate purchasing, stores, production activity, job costing, and finance records in one operating picture.',
      benefits:['Review material availability before work starts','Track work orders and job progress','Compare planned and recorded costs'],
      workflow:['Purchase','Stores','Work orders','Quality','Accounts'],
      creativeTitle:'A technical view of the production flow.',
      creativeDescription:'Visual status boards and linked records help teams see where work is waiting.'
    },
    services: {
      title:'Professional services', subtitle:'Understand project delivery, team workload, and billing.',
      kpis:[['Project value','₹6.2L','Illustrative total'],['Active projects','16','Illustrative count'],['Billable hours','74%','Sample indicator']],
      chart:'Workload by service line',caption:'Example index · not actual results',
      bars:[['Consulting',83],['Implementation',71],['Support',62],['Training',45]],
      benefitTitle:'Connect client work to delivery and billing.',
      description:'For consulting, IT, and service teams, project records, assigned work, expenses, invoicing, and reporting can be brought into one review process.',
      benefits:['Review project progress and assignments','Connect expenses and timesheets where configured','Track invoices and project-level costs'],
      workflow:['CRM','Projects','Team','Billing','Reports'],
      creativeTitle:'Make complex work easier to explain.',
      creativeDescription:'Project views and visual summaries help teams communicate progress and priorities.'
    },
    construction: {
      title:'Construction & projects', subtitle:'Review jobs, materials, budgets, and project milestones.',
      kpis:[['Project budget','₹28L','Illustrative total'],['Open tasks','23','Illustrative count'],['Materials due','7','Items to review']],
      chart:'Project activity by work package',caption:'Example index · not actual results',
      bars:[['Civil work',84],['Electrical',66],['Finishing',54],['Procurement',39]],
      benefitTitle:'See project activity and costs side by side.',
      description:'Use project, purchase, inventory, and accounts workflows to review work packages, materials, expenses, and progress based on the modules configured for your team.',
      benefits:['Review milestones and open tasks','Monitor material requests and purchases','Bring project costs into finance reporting'],
      workflow:['Project','Purchase','Stores','Site work','Accounts'],
      creativeTitle:'From site activity to a management view.',
      creativeDescription:'Organize operational details into readable project summaries and status reports.'
    },
    hospitality: {
      title:'Hospitality', subtitle:'Explore purchasing, stock, service operations, and cost review.',
      kpis:[['Daily sales','₹1.8L','Illustrative total'],['Stock checks','11','Items to review'],['Purchase orders','8','Illustrative count']],
      chart:'Operating spend by category',caption:'Example index · not actual results',
      bars:[['Food supplies',82],['Housekeeping',58],['Utilities',46],['Maintenance',32]],
      benefitTitle:'Keep service operations and back-office records connected.',
      description:'For hospitality businesses, configured sales, purchase, inventory, HR, and accounts modules can help bring stock, supplier spend, staffing records, and reports together.',
      benefits:['Review supply usage and purchase activity','Monitor operating costs by category','Connect people, inventory, and finance records'],
      workflow:['Sales','Purchase','Inventory','HR','Accounts'],
      creativeTitle:'A clearer operational picture behind the guest experience.',
      creativeDescription:'Use simple visuals and organized records to support daily reviews and planning.'
    }
  };
  const setText = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };
  const renderTrade = key => {
    const data = tradeExamples[key] || tradeExamples.retail;
    setText('trade-title', data.title);
    setText('trade-subtitle', data.subtitle);
    data.kpis.forEach((kpi, index) => {
      setText('kpi-' + ['one','two','three'][index] + '-label', kpi[0]);
      setText('kpi-' + ['one','two','three'][index] + '-value', kpi[1]);
      setText('kpi-' + ['one','two','three'][index] + '-note', kpi[2]);
    });
    setText('chart-title', data.chart);
    setText('chart-caption', data.caption);
    const bars = document.getElementById('trade-bars');
    bars.replaceChildren();
    data.bars.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'trade-bar-row';
      const name = document.createElement('span');
      name.textContent = label;
      const track = document.createElement('div');
      track.className = 'trade-bar-track';
      const fill = document.createElement('i');
      fill.style.width = value + '%';
      track.append(fill);
      const score = document.createElement('b');
      score.textContent = value;
      row.append(name, track, score);
      bars.append(row);
    });
    setText('benefit-title', data.benefitTitle);
    setText('benefit-description', data.description);
    const list = document.getElementById('benefit-list');
    list.replaceChildren();
    data.benefits.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      list.append(li);
    });
    const workflow = document.getElementById('trade-workflow-items');
    workflow.replaceChildren();
    data.workflow.forEach((item, index) => {
      if (index) {
        const arrow = document.createElement('i');
        arrow.textContent = '→';
        workflow.append(arrow);
      }
      const step = document.createElement('span');
      step.textContent = item;
      workflow.append(step);
    });
    setText('creative-title', data.creativeTitle);
    setText('creative-description', data.creativeDescription);
    tradeShowcase.querySelectorAll('.trade-option').forEach(button => {
      const active = button.dataset.trade === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };
  tradeShowcase.querySelectorAll('.trade-option').forEach(button => {
    button.addEventListener('click', () => renderTrade(button.dataset.trade));
  });
  document.getElementById('trade-contact-link')?.addEventListener('click', () => {
    const topic = document.querySelector('#contact-form select[name="topic"]');
    const message = document.querySelector('#contact-form textarea[name="message"]');
    if (topic) topic.value = 'Something else';
    if (message && !message.value) message.value = 'I would like to see how Vikora-One could support my business category.';
  });
  renderTrade('retail');
}
