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


// Business Needs Finder: local, illustrative guidance only; no data is sent to a server.
const businessFinder = document.querySelector('#business-finder-form');
if (businessFinder) {
  const industryGuides = {
    retail: {name:'Retail & shops',modules:['Sales & invoicing','Inventory & stock alerts','Purchase & suppliers','Accounts & reports'],note:'Start by reviewing how billing, stock movement, supplier purchases and daily sales summaries fit your shop workflow.'},
    distribution: {name:'Wholesale & distribution',modules:['Sales & customer balances','Purchase & suppliers','Inventory & dispatch','Accounts & reports'],note:'Prioritize order fulfilment, stock availability, supplier activity and customer balances.'},
    manufacturing: {name:'Manufacturing',modules:['Purchase & stores','Inventory & materials','Projects / job costing','Accounts & reports'],note:'Confirm whether your installation supports the production and job-tracking steps you need before choosing a plan.'},
    services: {name:'Professional services',modules:['CRM & customer follow-up','Projects & team work','Billing & expenses','Accounts & reports'],note:'Review project tracking, customer records, billing and expense visibility with the Vikora team.'},
    construction: {name:'Construction & projects',modules:['Projects & job tracking','Purchase & materials','Inventory / stores','Accounts & cost reports'],note:'Map project stages, material purchases and cost review to the modules available in your proposed setup.'},
    hospitality: {name:'Hospitality',modules:['Sales & billing','Purchase & suppliers','Inventory & stock','HR & accounts'],note:'Explore how stock, purchasing, staffing records and financial reporting could fit your daily operation.'},
    other: {name:'Mixed / other business',modules:['CRM & sales','Purchase & inventory','Accounts & finance','Reports & MIS'],note:'A short product demo is the best way to map your specific workflow to available modules.'}
  };
  const needLabels = {
    sales:'Sales, CRM & invoicing', inventory:'Purchase, suppliers & inventory',
    finance:'Accounts & finance', projects:'Projects & job tracking',
    people:'Users, roles & HR / payroll', reports:'Reports & management dashboards'
  };
  businessFinder.addEventListener('submit', event => {
    event.preventDefault();
    const industryKey = document.querySelector('#finder-industry').value;
    const team = document.querySelector('#finder-team').value;
    const setup = document.querySelector('#finder-setup').value;
    if (!industryKey || !team || !setup) return;
    const guide = industryGuides[industryKey] || industryGuides.other;
    const selectedNeeds = [...businessFinder.querySelectorAll('input[name="finder-need"]:checked')].map(input => input.value);
    const modules = [...new Set([...guide.modules, ...selectedNeeds.map(key => ({
      sales:'CRM & sales', inventory:'Purchase & inventory', finance:'Accounts & finance',
      projects:'Projects & job costing', people:'HR & payroll / user permissions',
      reports:'Reports & MIS'
    }[key]))].filter(Boolean))];
    const teamLabel = {solo:'Single-user starting point',small:'Small team: compare single-user and multi-user options',medium:'Multi-user setup: review server + client requirements',large:'Larger team: confirm licensing and capacity with Vikora'}[team];
    const setupLabel = {one:'One computer',network:'Office server with connected client computers',unsure:'Setup consultation recommended'}[setup];
    const result = document.querySelector('#finder-result');
    result.replaceChildren();
    const icon = document.createElement('div'); icon.className='finder-result-icon'; icon.textContent='✳'; result.append(icon);
    const kicker = document.createElement('span'); kicker.className='article-kicker'; kicker.textContent='YOUR PERSONALIZED STARTING POINT'; result.append(kicker);
    const heading = document.createElement('h3'); heading.textContent=guide.name+' — a practical starting point'; result.append(heading);
    const intro = document.createElement('p'); intro.textContent=guide.note; result.append(intro);
    const summary = document.createElement('div'); summary.className='finder-result-preview';
    [['YOUR TEAM',teamLabel],['PREFERRED SETUP',setupLabel],['MODULES TO EXPLORE',modules.join(' · ')]].forEach(([label,value])=>{
      const caption=document.createElement('span'); caption.textContent=label;
      const textNode=document.createElement('b'); textNode.textContent=value;
      summary.append(caption,textNode);
    });
    result.append(summary);
    if (selectedNeeds.length) {
      const needsTitle=document.createElement('p'); needsTitle.textContent='Your selected priorities:'; result.append(needsTitle);
      const list=document.createElement('ul'); list.className='finder-result-list';
      selectedNeeds.forEach(key=>{const item=document.createElement('li');item.textContent=needLabels[key];list.append(item);});
      result.append(list);
    }
    const plan=document.createElement('a'); plan.className='finder-plan'; plan.href='#plans';
    plan.textContent=team==='solo'?'Explore the single-user licence':team==='small'?'Compare licence options':'Review multi-user licensing';
    result.append(plan);
    const note=document.createElement('p');note.className='finder-note';
    note.textContent=team==='large'?'Your team may exceed the currently described multi-user setup (one server + up to nine clients). Confirm capacity, licence terms and available modules with Vikora before purchase.':'This is a recommendation to guide your demo, not a guarantee that every module is included in your chosen licence. Confirm current features, pricing and setup with Vikora.';
    result.append(note);
    const contact=document.createElement('a');contact.className='button button-lime';contact.href='#contact';contact.style.marginTop='18px';contact.textContent='Discuss my business needs ↗';
    contact.addEventListener('click',()=>{
      const topic=document.querySelector('#contact-form select[name="topic"]');
      const message=document.querySelector('#contact-form textarea[name="message"]');
      if(topic) topic.value='Book a free demo';
      if(message) message.value='Business type: '+guide.name+'\nTeam: '+teamLabel+'\nSetup: '+setupLabel+'\nModules to explore: '+modules.join(', ')+'\nPriorities: '+(selectedNeeds.map(key=>needLabels[key]).join(', ')||'Open to guidance');
    });
    result.append(contact);
    result.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
  });
}


// Tutorial report lab: interactive illustrative charts, never live financial data.
const reportLab = document.querySelector('.tutorial-report-lab');
if (reportLab) {
  const reportViews = {
    sales: {
      label:'SALES OVERVIEW', metricLabel:'Sales value', metricValue:'₹8.4L', metricChange:'Illustrative total',
      ring:72, ringLabel:'Target indicator', chartTitle:'Sales by period', legend:'Sales value index',
      values:[48,61,54,73,66,88], periods:['Jan','Feb','Mar','Apr','May','Jun'],
      noteTitle:'Read the sales trend',
      note:'Compare periods, look for changes, and investigate which products or customers may explain the movement.'
    },
    stock: {
      label:'INVENTORY WATCH', metricLabel:'Items to review', metricValue:'12', metricChange:'Illustrative alert count',
      ring:64, ringLabel:'Stock coverage sample', chartTitle:'Stock status by group', legend:'Availability index',
      values:[82,64,47,71,39,58], periods:['Core','Home','Parts','Tools','Pack','Other'],
      noteTitle:'Spot stock that needs attention',
      note:'Review low-stock and reorder signals, confirm recent purchases and movements, then decide which items need follow-up.'
    },
    finance: {
      label:'FINANCE SNAPSHOT', metricLabel:'Operating overview', metricValue:'₹3.1L', metricChange:'Illustrative sample total',
      ring:81, ringLabel:'Plan indicator', chartTitle:'Monthly review index', legend:'Illustrative finance index',
      values:[42,57,51,69,74,81], periods:['Jan','Feb','Mar','Apr','May','Jun'],
      noteTitle:'Use reports to ask better questions',
      note:'Compare income, costs, outstanding balances and cash-flow indicators where available. Investigate exceptions before making decisions.'
    }
  };
  const put = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
  const draw = key => {
    const data = reportViews[key] || reportViews.sales;
    put('report-dashboard-label', data.label);
    put('report-metric-label', data.metricLabel);
    put('report-metric-value', data.metricValue);
    put('report-metric-change', data.metricChange);
    put('report-ring-value', String(data.ring));
    const ring = document.getElementById('report-ring');
    if (ring) ring.style.setProperty('--ring-progress', data.ring + '%');
    put('report-ring-label', data.ringLabel);
    put('report-chart-title', data.chartTitle);
    put('report-legend-label', data.legend);
    put('report-note-title', data.noteTitle);
    put('report-note-text', data.note);
    const chart = document.getElementById('tutorial-report-chart');
    if (chart) {
      chart.replaceChildren();
      data.values.forEach((value, index) => {
        const column = document.createElement('div'); column.className = 'report-bar-column';
        const number = document.createElement('span'); number.textContent = value;
        const bar = document.createElement('i'); bar.style.height = value + '%';
        const period = document.createElement('small'); period.textContent = data.periods[index];
        column.append(number, bar, period); chart.append(column);
      });
      chart.setAttribute('aria-label', 'Illustrative bar chart: ' + data.chartTitle);
    }
    reportLab.querySelectorAll('.report-choice').forEach(button => {
      const active = button.dataset.report === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };
  reportLab.querySelectorAll('.report-choice').forEach(button => {
    button.addEventListener('click', () => draw(button.dataset.report));
  });
  draw('sales');
}


// VIKAA support assistant: try the secure server-side AI API, with local starter guidance as fallback.
const vikaa = document.querySelector('.vikaa-widget');
if (vikaa) {
  const API_URL = 'https://vikaa-support-api.onrender.com/api/chat';
  const panel = document.getElementById('vikaa-panel');
  const launcher = vikaa.querySelector('.vikaa-launcher');
  const closeButton = vikaa.querySelector('.vikaa-close');
  const form = document.getElementById('vikaa-form');
  const input = document.getElementById('vikaa-input');
  const sendButton = form.querySelector('button[type="submit"]');
  const messages = document.getElementById('vikaa-messages');
  const promptButtons = vikaa.querySelectorAll('[data-vikaa-prompt]');
  const history = [];
  const helpTopics = [
    {keys:['sales entry','sales invoice','sale entry','customer invoice','sales voucher','pass a sales'],title:'Sales entry — typical workflow',body:'1. Open the Sales module and choose the appropriate sales invoice/order screen.\n2. Select the customer and verify invoice date, branch and reference.\n3. Add the correct items or services, quantities, rates, tax and any permitted discount.\n4. Check totals and payment/credit details, then save or submit according to your role.\n5. Verify the saved record and related stock/accounts impact if those integrations are enabled. Confirm exact screen names and tax rules for your installation.'},
    {keys:['purchase','supplier bill','purchase entry','purchase invoice','vendor bill','goods receipt'],title:'Purchase and supplier entry',body:'1. Open Purchase and choose the purchase order, bill or receipt screen matching your document.\n2. Select the supplier and check invoice date and reference.\n3. Add items/services, quantities, rates, tax and other charges.\n4. Match received quantities and supporting documents before saving.\n5. Verify Inventory/Accounts only if those modules are linked in your setup. Avoid creating a duplicate bill.'},
    {keys:['inventory','stock','stock entry','item entry','warehouse','opening stock'],title:'Inventory and stock',body:'Confirm the item code, unit of measure, warehouse/location and quantity. For incoming goods, follow your configured purchase/receipt workflow; for outgoing goods, use the authorised issue, dispatch or sales workflow. Check the transaction date and quantity before posting, then review the stock ledger/report if available.'},
    {keys:['journal','accounting entry','accounts entry','ledger','debit','credit','expense entry','payment entry','receipt entry'],title:'Accounts entry — check before posting',body:'Identify the document type: supplier invoice, customer receipt, payment, expense, or journal adjustment. Use the matching Accounts screen rather than a journal when a dedicated transaction exists. Confirm company/branch, date, ledger accounts, debit/credit balance, tax treatment and reference. For statutory or tax-sensitive entries, confirm with your accountant before posting.'},
    {keys:['report','mis','dashboard','sales trend','profit','financial report','balance sheet','trial balance'],title:'Reports & MIS',body:'Open Reports & MIS or the relevant module report. Choose company/branch, date range and filters; generate the report; compare totals with source transactions; investigate differences by opening individual records. Available reports depend on your edition and permissions. Website charts are examples, not live customer data.'},
    {keys:['login','log in','sign in','password','cannot open','access denied','permission','module not visible','error','failed','not working','troubleshoot','trouble shoot','crash','slow'],title:'Troubleshooting access or errors',body:'1. Confirm the correct company and user account. 2. Refresh and sign in again. 3. Ask an administrator to verify role, module permissions and branch scope. 4. Check whether other users see the issue. 5. Record the exact error and steps, removing private details. Never share passwords, OTPs, database files or customer records in chat. If it persists, contact Vikora support with a redacted screenshot.'},
    {keys:['user','role','permission','new employee','add user','branch access'],title:'Users and permissions',body:'An administrator can typically open Settings → Users & Permissions, create/select a user, assign an appropriate role and grant only required module actions. Apply branch scope where supported, save and test. If a module is missing, verify both licence and permissions.'},
    {keys:['license','licence','activation','expiry','renew','rental','multi user','multi-user','client machine','server'],title:'Licence and multi-user setup',body:'Check the licence type, registered machine/server details, seat limit and expiry date in your official licence documents. For server/client setups, follow the instructions supplied with your installation. Do not bypass licence limits or share secret keys; contact Vikora support if activation fails.'}
  ];
  const openVikaa = () => { panel.hidden = false; launcher.setAttribute('aria-expanded','true'); input.focus(); };
  const closeVikaa = () => { panel.hidden = true; launcher.setAttribute('aria-expanded','false'); launcher.focus(); };
  const addMessage = (text, who) => {
    const row = document.createElement('div');
    row.className = 'vikaa-message ' + (who === 'user' ? 'vikaa-user' : 'vikaa-bot');
    const badge = document.createElement('span'); badge.textContent = who === 'user' ? 'You' : 'V';
    const bubble = document.createElement('p'); bubble.textContent = text;
    row.append(badge, bubble); messages.append(row); messages.scrollTop = messages.scrollHeight;
    return bubble;
  };
  const getLocalAnswer = question => {
    const q = question.toLowerCase().replace(/[^a-z0-9\\s-]/g, ' ');
    let best = null, bestScore = 0;
    helpTopics.forEach(topic => {
      const score = topic.keys.reduce((total,key) => total + (q.includes(key) ? Math.max(1,key.split(' ').length) : 0),0);
      if (score > bestScore) { best = topic; bestScore = score; }
    });
    return best && bestScore > 0
      ? best.title + '\\n\\n' + best.body
      : 'I could not find a reliable answer in the starter help notes. Include the module name, what you were trying to do, and the exact error with private details removed. For installation-specific help, contact hello@vikora.com or +91 99117 18105.';
  };
  const ask = async question => {
    const clean = question.trim();
    if (!clean) return;
    addMessage(clean, 'user');
    const reply = addMessage('VIKAA is checking your question…', 'bot');
    input.disabled = true; sendButton.disabled = true;
    try {
      const response = await fetch(API_URL, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:clean,history:history.slice(-8)})
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'AI support is temporarily unavailable');
      }
      const result = await response.json();
      reply.textContent = result.answer || getLocalAnswer(clean);
      history.push({role:'user',content:clean},{role:'assistant',content:reply.textContent});
    } catch {
      reply.textContent = getLocalAnswer(clean) + '\\n\\nAI connection is not ready right now, so I’ve shown the available starter guidance instead.';
    } finally {
      input.disabled = false; sendButton.disabled = false; input.focus(); messages.scrollTop = messages.scrollHeight;
    }
  };
  launcher.addEventListener('click', () => panel.hidden ? openVikaa() : closeVikaa());
  closeButton.addEventListener('click', closeVikaa);
  form.addEventListener('submit', event => {
    event.preventDefault(); const question = input.value; input.value = ''; ask(question);
  });
  promptButtons.forEach(button => button.addEventListener('click', () => ask(button.dataset.vikaaPrompt)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) closeVikaa(); });
}
