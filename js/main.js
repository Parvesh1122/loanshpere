/* ============================================================
   LOANSPHERE - Main JavaScript
   All functionality: Eligibility, EMI, Charts, Particles, etc.
   ============================================================ */

/* ============= API CONFIG ============= */
const API_BASE_URL = 'http://localhost:5000';

/* ============= DOCUMENT READY ============= */
document.addEventListener('DOMContentLoaded', function () {

  /* ---------- LOADING SCREEN ---------- */
  setTimeout(function () {
    document.getElementById('loader-wrapper').classList.add('hidden');
  }, 2500);

  /* ---------- AOS INIT ---------- */
  AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true,
    mirror: false,
  });

  /* ---------- PARTICLES.JS ---------- */
  if (typeof particlesJS !== 'undefined') {
    particlesJS('particles-js', {
      particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: '#667eea' },
        shape: { type: 'circle' },
        opacity: { value: 0.3, random: true, anim: { enable: true, speed: 1, opacity_min: 0.1 } },
        size: { value: 3, random: true, anim: { enable: true, speed: 2, size_min: 0.1 } },
        line_linked: { enable: true, distance: 150, color: '#667eea', opacity: 0.15, width: 1 },
        move: { enable: true, speed: 1.5, direction: 'none', random: true, straight: false, out_mode: 'out' }
      },
      interactivity: {
        detect_on: 'canvas',
        events: { onhover: { enable: true, mode: 'grab' }, onclick: { enable: true, mode: 'push' }, resize: true },
        modes: {
          grab: { distance: 140, line_linked: { opacity: 0.3 } },
          push: { particles_nb: 4 }
        }
      },
      retina_detect: true
    });
  }

  /* ---------- THEME TOGGLE ---------- */
  const themeToggle = document.getElementById('themeToggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  let currentTheme = localStorage.getItem('loansphere-theme') || 'dark';
  applyTheme(currentTheme);

  themeToggle.addEventListener('click', function () {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
    localStorage.setItem('loansphere-theme', currentTheme);
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
      icon.className = 'fas fa-moon';
      document.documentElement.setAttribute('data-bs-theme', 'dark');
    } else {
      icon.className = 'fas fa-sun';
      document.documentElement.setAttribute('data-bs-theme', 'light');
    }
  }

  /* ---------- NAVBAR SCROLL EFFECT ---------- */
  const navbar = document.getElementById('mainNav');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    // Scroll-to-top button
    const scrollBtn = document.getElementById('scrollToTop');
    if (window.scrollY > 300) {
      scrollBtn.classList.add('visible');
    } else {
      scrollBtn.classList.remove('visible');
    }
  });

  /* ---------- SMOOTH SCROLL FOR ANCHOR LINKS ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Close mobile menu
        const navCollapse = document.getElementById('navbarNav');
        const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
        if (bsCollapse) bsCollapse.hide();
      }
    });
  });

  /* ---------- NAVBAR ACTIVE LINK ON SCROLL ---------- */
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', function () {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 150;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  });

  /* ---------- ANIMATED COUNTERS ---------- */
  function animateCounters() {
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'));
      const increment = target / 100;
      let current = 0;
      const updateCounter = () => {
        current += increment;
        if (current < target) {
          counter.textContent = Math.ceil(current);
          requestAnimationFrame(updateCounter);
        } else {
          counter.textContent = target;
        }
      };
      updateCounter();
    });
  }

  // Trigger counters when in view
  const statsSection = document.querySelector('.stats-section');
  let countersTriggered = false;
  if (statsSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !countersTriggered) {
          countersTriggered = true;
          animateCounters();
        }
      });
    }, { threshold: 0.3 });
    observer.observe(statsSection);
  }

  /* ---------- EMI CALCULATOR ---------- */
  const emiLoanInput = document.getElementById('emiLoanAmount');
  const emiRateInput = document.getElementById('emiRate');
  const emiTenureInput = document.getElementById('emiTenure');
  let emiChart = null;

  function initEMI() {
    if (emiLoanInput && emiRateInput && emiTenureInput) {
      emiLoanInput.addEventListener('input', calculateEMI);
      emiRateInput.addEventListener('input', calculateEMI);
      emiTenureInput.addEventListener('input', calculateEMI);
      calculateEMI();
    }
  }

  function calculateEMI() {
    const P = parseFloat(emiLoanInput.value) || 0;
    const annualRate = parseFloat(emiRateInput.value) || 0;
    const years = parseFloat(emiTenureInput.value) || 0;

    document.getElementById('emiAmountDisplay').textContent = '₹' + P.toLocaleString('en-IN');
    document.getElementById('emiRateDisplay').textContent = annualRate + '%';
    document.getElementById('emiTenureDisplay').textContent = years + ' Years';

    if (P <= 0 || annualRate <= 0 || years <= 0) {
      ['monthlyEMI','totalInterest','totalAmount','principalAmount','interestAmount',
       'simpleInterest','simplePerYear','totalSimpleAmount'].forEach(id => {
        document.getElementById(id).textContent = '₹0';
      });
      document.getElementById('principalBar').style.width = '0%';
      document.getElementById('interestBar').style.width = '0%';
      try { updateEMIChart(0, 0); } catch(e) {}
      return;
    }

    const months = years * 12;
    const monthlyRate = annualRate / 12 / 100;
    const onePlusRn = Math.pow(1 + monthlyRate, months);
    const EMI = P * monthlyRate * onePlusRn / (onePlusRn - 1);
    const totalPayable = EMI * months;
    const totalInterest = totalPayable - P;

    const emiVal = Math.round(EMI);
    const interestVal = Math.round(totalInterest);
    const totalVal = Math.round(totalPayable);

    // ---- Simple Interest (flat rate) ----
    const simpleInterestTotal = Math.round(P * annualRate * years / 100);
    const simplePerYear = Math.round(P * annualRate / 100);
    const totalSimpleAmount = P + simpleInterestTotal;
    const monthlySimple = Math.round(totalSimpleAmount / months);

    document.getElementById('simpleInterest').textContent = '₹' + simpleInterestTotal.toLocaleString('en-IN');
    document.getElementById('simplePerYear').textContent = '₹' + simplePerYear.toLocaleString('en-IN');
    document.getElementById('totalSimpleAmount').textContent = '₹' + totalSimpleAmount.toLocaleString('en-IN');

    // ---- EMI (Reducing Balance) ----
    document.getElementById('monthlyEMI').textContent = '₹' + emiVal.toLocaleString('en-IN');
    document.getElementById('totalInterest').textContent = '₹' + interestVal.toLocaleString('en-IN');
    document.getElementById('totalAmount').textContent = '₹' + totalVal.toLocaleString('en-IN');
    document.getElementById('principalAmount').textContent = '₹' + Math.round(P).toLocaleString('en-IN');
    document.getElementById('interestAmount').textContent = '₹' + interestVal.toLocaleString('en-IN');

    // Progress bars with smooth transition
    const principalPct = (P / totalPayable) * 100;
    const interestPct = (totalInterest / totalPayable) * 100;
    document.getElementById('principalBar').style.width = principalPct + '%';
    document.getElementById('interestBar').style.width = interestPct + '%';

    // Update chart in-place (no destroy/recreate jitter)
    try { updateEMIChart(P, totalInterest); } catch (e) { console.warn('[EMI] Chart skipped:', e.message); }
  }

  function updateEMIChart(principal, interest) {
    const canvas = document.getElementById('emiChart');
    if (!canvas) return;
    const isZero = principal === 0 && interest === 0;

    if (emiChart) {
      // Update existing chart data in-place — no destroy/recreate = no jitter
      emiChart.data.datasets[0].data = isZero ? [1, 0] : [principal, interest];
      emiChart.update('none');
      return;
    }

    // First time: create chart
    const ctx = canvas.getContext('2d');
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() || '#a0aec0';
    emiChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Principal', 'Total Interest'],
        datasets: [{
          data: isZero ? [1, 0] : [principal, interest],
          backgroundColor: ['#667eea', '#f093fb'],
          borderColor: ['#667eea', '#f093fb'],
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '65%',
        animation: { duration: 0 },
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, padding: 15, usePointStyle: true } }
        }
      }
    });
  }

  initEMI();

  /* ---------- ELIGIBILITY CHECKER (API-powered) ---------- */
  window.checkEligibility = function () {
    const fullName = document.getElementById('fullName').value.trim();
    const age = parseInt(document.getElementById('age').value);
    const income = parseFloat(document.getElementById('monthlyIncome').value);
    const employment = document.getElementById('employmentType').value;
    const creditScore = parseInt(document.getElementById('creditScore').value);
    const existingLoans = document.getElementById('existingLoans').value;
    const loanAmt = parseFloat(document.getElementById('loanAmount').value);
    const loanDur = document.getElementById('loanDuration').value;
    const emiCap = parseFloat(document.getElementById('emiCapacity').value);
    const city = document.getElementById('city').value.trim();

    // Validate
    if (!fullName) { showToast('Please enter your full name.', 'error'); document.getElementById('fullName').focus(); return; }
    if (!age || age < 18 || age > 99) { showToast('Please enter a valid age (18-99).', 'error'); document.getElementById('age').focus(); return; }
    if (!income || income <= 0) { showToast('Please enter your monthly income.', 'error'); document.getElementById('monthlyIncome').focus(); return; }
    if (!employment) { showToast('Please select your employment type.', 'error'); return; }
    if (!creditScore || creditScore < 300 || creditScore > 900) { showToast('Please enter a valid credit score (300-900).', 'error'); document.getElementById('creditScore').focus(); return; }

    // Show loading state
    const btn = document.getElementById('checkEligibilityBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    btn.disabled = true;

    // Build payload
    const payload = {
      fullName,
      age,
      monthlyIncome: income,
      employmentType: employment,
      creditScore,
      existingLoans,
      loanAmount: loanAmt || 0,
      loanDuration: loanDur,
      emiCapacity: emiCap || 0,
      city,
    };

    // Call API
    fetch(API_BASE_URL + '/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    .then(res => {
      if (!res.ok) throw new Error('Server returned ' + res.status);
      return res.json();
    })
    .then(data => {
      console.log('[LoanSphere] API response:', data);
      renderEligibilityResult(data, fullName, income, creditScore);
    })
    .catch(err => {
      console.error('[LoanSphere] API error:', err);
      showToast('ML server not running — using local estimation. To enable AI predictions, run: python app.py', 'info');
      // Fallback: use client-side logic
      fallbackEligibility(fullName, age, income, employment, creditScore, existingLoans, loanAmt, loanDur, emiCap);
    })
    .finally(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    });
  };

  /* ---------- RENDER API RESULT ---------- */
  function renderEligibilityResult(data, fullName, income, creditScore) {
    const { category, approval_pct, risk_level, suggested_amount, suggested_rate } = data;
    const approvalPct = Math.min(100, Math.max(0, approval_pct));

    document.getElementById('resultPlaceholder').classList.add('d-none');
    const resultContent = document.getElementById('resultContent');
    resultContent.classList.remove('d-none');

    const statusEl = document.getElementById('resultStatus');
    if (category === 'eligible') {
      statusEl.className = 'result-status eligible';
      statusEl.innerHTML = '<i class="fas fa-check-circle"></i> <span>Eligible ✓</span>';
    } else if (category === 'partial') {
      statusEl.className = 'result-status partial';
      statusEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span>Partially Eligible</span>';
    } else {
      statusEl.className = 'result-status not-eligible';
      statusEl.innerHTML = '<i class="fas fa-times-circle"></i> <span>Not Eligible</span>';
    }

    // Animate percentage ring
    const circle = document.getElementById('percentageCircle');
    const circumference = 2 * Math.PI * 35;
    circle.style.strokeDasharray = circumference;
    const offset = circumference - (approvalPct / 100) * circumference;
    setTimeout(() => { circle.style.strokeDashoffset = offset; }, 100);
    document.getElementById('percentageText').textContent = approvalPct + '%';

    document.getElementById('suggestedAmount').textContent = '₹' + Math.round(suggested_amount || 0).toLocaleString('en-IN');

    let riskClass = 'text-success';
    if (risk_level && risk_level.toLowerCase().includes('high')) riskClass = 'text-danger';
    else if (risk_level && risk_level.toLowerCase().includes('medium')) riskClass = 'text-warning';

    const riskEl = document.getElementById('riskLevel');
    riskEl.textContent = risk_level || 'Unknown';
    riskEl.className = riskClass;
    document.getElementById('suggestedRate').textContent = suggested_rate || 'N/A';

    // Recommendations
    updateRecommendations(income, creditScore, approvalPct, suggested_amount || 0, category === 'eligible', category === 'partial');

    // Toast
    if (category === 'eligible') {
      showToast('Congratulations ' + fullName + '! You are eligible for a loan!', 'success');
    } else if (category === 'partial') {
      showToast(fullName + ', you are partially eligible. Check suggestions below.', 'info');
    } else {
      showToast('Sorry ' + fullName + ', you are not eligible at this time.', 'error');
    }

    resultContent.style.animation = 'none';
    setTimeout(() => { resultContent.style.animation = 'fadeInUp 0.5s ease'; }, 10);
  }

  /* ---------- FALLBACK CLIENT-SIDE LOGIC (when API is unavailable) ---------- */
  function fallbackEligibility(fullName, age, income, employment, creditScore, existingLoans, loanAmt, loanDur, emiCap) {
    let eligible = false, partial = false;
    let approvalPct = 0, suggestedAmount = 0, riskLevel = '', riskClass = '', suggestedRate = '';
    const highIncome = income >= 75000, mediumIncome = income >= 35000 && income < 75000, lowIncome = income < 35000;
    const goodScore = creditScore > 700, mediumScore = creditScore >= 600 && creditScore <= 700, poorScore = creditScore < 600;

    if (highIncome && goodScore) { eligible = true; approvalPct = Math.min(95, 85 + Math.floor((creditScore - 700) / 5)); suggestedAmount = Math.min(loanAmt || 500000, income * 12 * 5); riskLevel = 'Low Risk'; riskClass = 'text-success'; suggestedRate = '7.5% - 8.5%'; }
    else if (mediumIncome && mediumScore) { partial = true; approvalPct = Math.min(70, 55 + Math.floor((creditScore - 600) / 5)); suggestedAmount = Math.min(loanAmt || 300000, income * 12 * 3); riskLevel = 'Medium Risk'; riskClass = 'text-warning'; suggestedRate = '10% - 12%'; }
    else if ((highIncome && mediumScore) || (mediumIncome && goodScore)) { partial = true; approvalPct = 60 + Math.floor(creditScore / 50); suggestedAmount = Math.min(loanAmt || 400000, income * 12 * 3.5); riskLevel = 'Moderate Risk'; riskClass = 'text-warning'; suggestedRate = '9% - 11%'; }
    else { approvalPct = Math.max(10, Math.min(40, Math.floor(creditScore / 20))); suggestedAmount = 0; riskLevel = 'High Risk'; riskClass = 'text-danger'; suggestedRate = 'N/A'; }

    if (existingLoans === 'two') approvalPct = Math.max(0, approvalPct - 20);
    else if (existingLoans === 'one') approvalPct = Math.max(0, approvalPct - 10);
    if (emiCap && loanAmt) { const e = (loanAmt * (8.5/12/100) * Math.pow(1+(8.5/12/100),loanDur*12)) / (Math.pow(1+(8.5/12/100),loanDur*12)-1); if (e > emiCap*1.3) { approvalPct = Math.max(0, approvalPct-15); riskLevel = 'High Risk - EMI exceeds capacity'; riskClass = 'text-danger'; } }
    approvalPct = Math.min(100, Math.max(0, approvalPct));

    const data = { category: eligible ? 'eligible' : partial ? 'partial' : 'not-eligible', approval_pct: approvalPct, risk_level: riskLevel, suggested_amount: suggestedAmount, suggested_rate: suggestedRate };
    renderEligibilityResult(data, fullName, income, creditScore);
  }

  /* ---------- RECOMMENDATIONS ---------- */
  function updateRecommendations(income, creditScore, approvalPct, suggestedAmount, eligible, partial) {
    const bestBanksEl = document.getElementById('bestBanksList');
    const safestEMIEl = document.getElementById('safestEMIPlan');

    let banks = [];
    if (eligible) {
      banks = [
        '<div class="bank-suggestion"><i class="fas fa-check-circle text-success me-2"></i><strong>SBI</strong> - Best rates for high income (7.5% - 8.5%)</div>',
        '<div class="bank-suggestion"><i class="fas fa-check-circle text-success me-2"></i><strong>HDFC</strong> - Premium customer benefits (8% - 9%)</div>',
        '<div class="bank-suggestion"><i class="fas fa-check-circle text-success me-2"></i><strong>ICICI</strong> - Fast approval (8.25% - 9.25%)</div>',
        '<div class="bank-suggestion"><i class="fas fa-check-circle text-success me-2"></i><strong>Kotak Mahindra</strong> - Flexible EMI options (8.5% - 9.5%)</div>'
      ];
    } else if (partial) {
      banks = [
        '<div class="bank-suggestion"><i class="fas fa-check-circle text-warning me-2"></i><strong>Axis Bank</strong> - Good for medium income (10% - 11.5%)</div>',
        '<div class="bank-suggestion"><i class="fas fa-check-circle text-warning me-2"></i><strong>PNB</strong> - Government scheme benefits (9.5% - 11%)</div>',
        '<div class="bank-suggestion"><i class="fas fa-check-circle text-warning me-2"></i><strong>SBI</strong> - Try with a co-applicant (9% - 10.5%)</div>'
      ];
    } else {
      banks = [
        '<div class="bank-suggestion"><i class="fas fa-times-circle text-danger me-2"></i>Improve credit score to 600+ for better options</div>',
        '<div class="bank-suggestion"><i class="fas fa-times-circle text-danger me-2"></i>Consider a secured loan or adding a co-applicant</div>',
        '<div class="bank-suggestion"><i class="fas fa-times-circle text-danger me-2"></i>Try NBFCs like Bajaj Finserv for lower scores</div>'
      ];
    }
    bestBanksEl.innerHTML = banks.join('');

    if (eligible || partial) {
      const safeEMI = Math.round(suggestedAmount * 0.08 / 12);
      safestEMIEl.innerHTML = '<p><i class="fas fa-shield-alt text-success me-2"></i> Safe EMI Range: <strong>₹' + safeEMI.toLocaleString('en-IN') + '</strong> - <strong>₹' + Math.round(safeEMI * 1.5).toLocaleString('en-IN') + '</strong>/month</p><p><i class="fas fa-clock text-info me-2"></i> Recommended Tenure: <strong>3 - 5 Years</strong></p><p><i class="fas fa-percent text-warning me-2"></i> Keep DTI ratio under <strong>40%</strong></p>';
    } else {
      safestEMIEl.innerHTML = '<p class="text-muted">Check eligibility to see your safest EMI plan.</p>';
    }
  }

  /* ---------- BANK DATA & RENDERING ---------- */
  // Static fallback data (used when API is unavailable)
  const FALLBACK_BANK_DATA = [
    { name: 'SBI', type: 'public', color: '#1a5276', rate: '10.00% - 15.00%', fee: 'Up to 1.50%', maxLoan: '₹1 Cr', tenure: '30 Years', icon: 'fa-building-columns' },
    { name: 'HDFC', type: 'private', color: '#004c8c', rate: '9.99% - 24.00%', fee: '₹6,500 + GST', maxLoan: '₹2 Cr', tenure: '30 Years', icon: 'fa-building-columns' },
    { name: 'ICICI', type: 'private', color: '#f58220', rate: '9.99% - 16.50%', fee: 'Up to 2%', maxLoan: '₹1.5 Cr', tenure: '30 Years', icon: 'fa-building-columns' },
    { name: 'Axis Bank', type: 'private', color: '#97144d', rate: '8.75% - 21.55%', fee: 'Up to 2%', maxLoan: '₹1.5 Cr', tenure: '30 Years', icon: 'fa-building-columns' },
    { name: 'PNB', type: 'public', color: '#0f4d8a', rate: '10.25% onwards', fee: '0.35% of loan amount', maxLoan: '₹75 L', tenure: '30 Years', icon: 'fa-building-columns' },
    { name: 'Kotak Mahindra', type: 'private', color: '#d4145a', rate: '10.99% onwards', fee: 'Up to 5%', maxLoan: '₹2 Cr', tenure: '30 Years', icon: 'fa-building-columns' },
  ];

  let currentBankData = [...FALLBACK_BANK_DATA];

  // Extract min numeric rate from a rate string like "10.00% - 15.00%"
  function parseMinRate(rateStr) {
    const m = rateStr.match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 999;
  }

  // Fetch live rates from backend API, fall back to static data
  window.loadBankRates = function () {
    const btn = document.getElementById('refreshRatesBtn');
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true; }
    fetch(API_BASE_URL + '/api/banks')
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(data => {
        if (data && data.banks && data.banks.length > 0) {
          currentBankData = data.banks;
          window._fullBankData = null; // clear filter snapshot so it picks up new data
          // Update last-updated badge
          const badge = document.getElementById('lastUpdatedBadge');
          if (badge && data.last_updated) {
            badge.innerHTML = '<i class="fas fa-circle text-success" style="font-size:0.5rem;vertical-align:middle;"></i> Live rates · Last updated: ' + data.last_updated;
          }
        }
        sortBanks();
      })
      .catch(err => {
        console.warn('[BankRates] API failed, using fallback:', err);
        currentBankData = [...FALLBACK_BANK_DATA];
        sortBanks();
        showToast('Rates server unavailable — showing reference rates', 'info');
      })
      .finally(() => {
        if (btn) { btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Rates'; btn.disabled = false; }
      });
  };

  function renderBanks(banks) {
    const container = document.getElementById('bankCardsContainer');
    container.innerHTML = banks.map(bank => `
      <div class="col-md-6 col-lg-4" data-aos="fade-up">
        <div class="bank-card glass-card" style="padding: 25px;">
          <span class="bank-type">${bank.type || ''}</span>
          <div class="bank-logo" style="background: ${bank.color};">
            <i class="fas ${bank.icon || 'fa-building-columns'}"></i>
          </div>
          <h5>${bank.name}</h5>
          <div class="bank-details">
            <div class="bank-detail"><span>Interest Rate</span><span style="color:#667eea;font-size:1.2rem;">${bank.rate}</span></div>
            <div class="bank-detail"><span>Processing Fee</span><span>${bank.fee}</span></div>
            <div class="bank-detail"><span>Max Loan Amount</span><span>${bank.maxLoan || '—'}</span></div>
            <div class="bank-detail"><span>Loan Tenure</span><span>${bank.tenure || '—'}</span></div>
          </div>
          <button class="btn btn-glow btn-sm" onclick="showToast('Redirecting to ${bank.name} loan application...', 'info')">
            <i class="fas fa-arrow-right"></i> Apply Now
          </button>
        </div>
      </div>
    `).join('');
  }

  window.filterBanks = function () {
    const search = document.getElementById('bankSearch').value.toLowerCase();
    const type = document.getElementById('bankFilter').value;
    const source = window._fullBankData || currentBankData;
    currentBankData = source.filter(b => {
      const matchSearch = b.name.toLowerCase().includes(search);
      const matchType = type === 'all' || (b.type && b.type === type);
      return matchSearch && matchType;
    });
    sortBanks();
  };

  window.sortBanks = function () {
    const sortBy = document.getElementById('bankSort').value;
    const sorted = [...currentBankData];
    switch (sortBy) {
      case 'rate-asc': sorted.sort((a, b) => parseMinRate(a.rate) - parseMinRate(b.rate)); break;
      case 'rate-desc': sorted.sort((a, b) => parseMinRate(b.rate) - parseMinRate(a.rate)); break;
      case 'name': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    renderBanks(sorted);
    setTimeout(() => { if (AOS) AOS.refresh(); }, 100);
  };

  // Load banks from API on page load
  window.loadBankRates();

  /* ---------- CONTACT FORM ---------- */
  window.handleContact = function (event) {
    event.preventDefault();
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const subject = document.getElementById('contactSubject').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    if (name && email && subject && message) {
      showToast('Thank you ' + name + '! Your message has been sent successfully.', 'success');
      document.getElementById('contactForm').reset();
    } else {
      showToast('Please fill in all fields.', 'error');
    }
    return false;
  };

  /* ---------- NEWSLETTER ---------- */
  window.handleNewsletter = function (event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value.trim();
    if (email) {
      showToast('Subscribed successfully! Welcome to LoanSphere.', 'success');
      event.target.reset();
    } else {
      showToast('Please enter a valid email.', 'error');
    }
    return false;
  };

  /* ---------- TOAST NOTIFICATIONS ---------- */
  window.showToast = function (message, type) {
    const container = document.getElementById('toastContainer');
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = 'toast-notification ' + type;
    toast.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i><span>' + message + '</span><button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>';
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.4s ease forwards';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  };

  /* ---------- CHATBOT ---------- */
  window.toggleChatbot = function () {
    const window = document.getElementById('chatbotWindow');
    window.classList.toggle('open');
  };

  window.sendChatbotMessage = function () {
    const input = document.getElementById('chatbotInput');
    const msg = input.value.trim();
    if (!msg) return;
    const body = document.getElementById('chatbotBody');
    body.innerHTML += '<div class="chatbot-message user"><div class="chatbot-msg">' + msg + '</div></div>';
    input.value = '';
    body.scrollTop = body.scrollHeight;
    // Auto reply
    setTimeout(() => {
      const responses = {
        'hello': 'Hi there! Welcome to LoanSphere. How can I assist you with your loan needs today?',
        'hi': 'Hello! I\'m your LoanSphere assistant. Feel free to ask me anything about loans, eligibility, or EMI.',
        'loan': 'We offer personal, home, education, and business loans. Use our Eligibility Checker to find the best option for you!',
        'eligibility': 'To check eligibility, fill out the form in the Eligibility Checker section. You\'ll need your income, credit score, and employment details.',
        'emi': 'Our EMI Calculator helps you plan monthly payments. Just enter the loan amount, rate, and tenure to get instant results!',
        'credit score': 'Credit scores range from 300-900. A score above 750 is excellent and gets you the best rates.',
        'interest': 'Interest rates vary by bank and your credit profile. Check our Bank Rates section for comparisons!',
        'contact': 'You can reach us via the Contact form, email us at hello@loansphere.in, or call 1800-123-4567.',
      };
      let reply = 'Thank you for your question. Our team will get back to you shortly. For immediate assistance, please use the Eligibility Checker or Contact form.';
      const lower = msg.toLowerCase();
      for (const [key, val] of Object.entries(responses)) {
        if (lower.includes(key)) { reply = val; break; }
      }
      body.innerHTML += '<div class="chatbot-message bot"><div class="chatbot-msg">' + reply + '</div></div>';
      body.scrollTop = body.scrollHeight;
    }, 800);
  };

  /* ---------- VOICE ASSISTANT ---------- */
  window.startVoiceAssistant = function () {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('Voice assistant is not supported in your browser.', 'error');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    const btn = document.getElementById('voiceAssistant');
    btn.classList.add('listening');
    showToast('Listening...', 'info');
    recognition.start();
    recognition.onresult = function (event) {
      const transcript = event.results[0][0].transcript;
      btn.classList.remove('listening');
      document.getElementById('chatbotInput').value = transcript;
      showToast('You said: ' + transcript, 'info');
      // Auto-send to chatbot
      window.sendChatbotMessage();
    };
    recognition.onerror = function () {
      btn.classList.remove('listening');
      showToast('Could not recognize voice. Please try again.', 'error');
    };
    recognition.onend = function () {
      btn.classList.remove('listening');
    };
  };

  /* ---------- PDF GENERATOR ---------- */
  window.downloadPDF = function () {
    const resultContent = document.getElementById('resultContent');
    if (resultContent.classList.contains('d-none')) {
      showToast('Please check eligibility first!', 'error');
      return;
    }
    const status = document.querySelector('#resultStatus span')?.textContent || 'N/A';
    const percentage = document.getElementById('percentageText').textContent;
    const amount = document.getElementById('suggestedAmount').textContent;
    const risk = document.getElementById('riskLevel').textContent;
    const rate = document.getElementById('suggestedRate').textContent;
    const name = document.getElementById('fullName').value || 'Applicant';

    if (typeof html2canvas !== 'undefined' && typeof jspdf !== 'undefined') {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();

      // Colors
      const primaryColor = '#667eea';
      const secondaryColor = '#764ba2';

      // Header
      doc.setFillColor(102, 126, 234);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('LoanSphere', pageWidth / 2, 25, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Loan Eligibility Report', pageWidth / 2, 35, { align: 'center' });

      // Applicant info
      doc.setFontSize(14);
      doc.setTextColor(102, 126, 234);
      doc.setFont('helvetica', 'bold');
      doc.text('Applicant Details', 20, 55);
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      doc.text('Name: ' + name, 20, 65);
      doc.text('Date: ' + new Date().toLocaleDateString('en-IN'), 20, 72);

      // Result
      doc.setFontSize(14);
      doc.setTextColor(102, 126, 234);
      doc.setFont('helvetica', 'bold');
      doc.text('Eligibility Result', 20, 87);
      doc.setDrawColor(102, 126, 234);
      doc.setLineWidth(0.5);
      doc.line(20, 90, 190, 90);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const rows = [
        ['Status', status],
        ['Approval Probability', percentage],
        ['Suggested Loan Amount', amount],
        ['Risk Level', risk],
        ['Suggested Interest Rate', rate],
      ];
      let y = 98;
      rows.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label + ':', 25, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 85, y);
        y += 9;
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated by LoanSphere | This is a simulated eligibility check and does not guarantee actual loan approval.', pageWidth / 2, 280, { align: 'center' });
      doc.text('Visit loansphere.in for more details.', pageWidth / 2, 285, { align: 'center' });

      doc.save('LoanSphere_Eligibility_Report.pdf');
      showToast('PDF report downloaded successfully!', 'success');
    } else {
      // Fallback: print
      window.print();
      showToast('Print dialog opened. Save as PDF from the print options.', 'info');
    }
  };

  /* ---------- SPEAK RESULT ---------- */
  window.speakResult = function () {
    if (!('speechSynthesis' in window)) {
      showToast('Text-to-speech not supported in your browser.', 'error');
      return;
    }
    const status = document.querySelector('#resultStatus span')?.textContent || '';
    const percentage = document.getElementById('percentageText').textContent;
    const amount = document.getElementById('suggestedAmount').textContent;
    const risk = document.getElementById('riskLevel').textContent;
    const name = document.getElementById('fullName').value || 'Applicant';
    const text = 'Hello ' + name + '. Your loan eligibility status is ' + status + '. Approval probability is ' + percentage + '. Suggested loan amount is ' + amount + '. Risk level: ' + risk + '.';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
    showToast('Speaking result...', 'info');
  };

  /* ---------- CLOSE CHATBOT ON ESC ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      const chatbot = document.getElementById('chatbotWindow');
      if (chatbot.classList.contains('open')) chatbot.classList.remove('open');
    }
  });

  /* ---------- INPUT VALIDATION STYLES ---------- */
  document.querySelectorAll('.glass-input[required]').forEach(input => {
    input.addEventListener('invalid', function () {
      this.classList.add('is-invalid');
    });
    input.addEventListener('blur', function () {
      if (this.value && this.classList.contains('is-invalid')) {
        this.classList.remove('is-invalid');
      }
    });
  });

  console.log('%c LoanSphere %c v1.0 - Smart Loan Eligibility Checker ',
    'background:#667eea;color:#fff;padding:5px 0 5px 10px;border-radius:5px 0 0 5px;font-weight:bold;font-size:14px;',
    'background:#764ba2;color:#fff;padding:5px 10px 5px 0;border-radius:0 5px 5px 0;font-weight:bold;font-size:14px;');

}); // End DOMContentLoaded
