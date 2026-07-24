/**
 * Yamaha MT-09 Main Application Script
 * Interactive logic for Color Visualizer, YRC Modes, Configurator, Fuel Calculator & Modals
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initColorVisualizer();
  initAccessoryConfigurator();
  initEngineSimulator();
  initTechTabs();
  initSpecsFilter();
  initFuelCalculator();
  initGalleryModal();
  initBookingModal();
});

/* ==========================================================================
   1. Navigation Bar & Mobile Drawer
   ========================================================================== */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // Close nav on link click in mobile view
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
    });
  });
}

/* ==========================================================================
   2. Color Visualizer (Icon Blue, Tech Black, Midnight Cyan)
   ========================================================================== */
function initColorVisualizer() {
  const colorBtns = document.querySelectorAll('.color-btn');
  const viewerImg = document.getElementById('variant-viewer-img');

  const colorImages = {
    blue: 'images/blue.jpg',
    black: 'images/black.jpg',
    cyan: 'images/cyan.jpg'
  };

  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      colorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const colorKey = btn.dataset.color;
      if (colorImages[colorKey] && viewerImg) {
        viewerImg.style.opacity = '0';
        viewerImg.style.transform = 'scale(0.98)';
        setTimeout(() => {
          viewerImg.src = colorImages[colorKey];
          viewerImg.style.opacity = '1';
          viewerImg.style.transform = 'scale(1)';
        }, 200);
      }
    });
  });
}

/* ==========================================================================
   3. Accessory Configurator & Price Calculator
   ========================================================================== */
function initAccessoryConfigurator() {
  const basePrice = 645000; // Base TL price estimated for MT-09
  const checkboxes = document.querySelectorAll('.acc-checkbox');
  const totalPriceDisplay = document.getElementById('total-config-price');
  const totalWeightDisplay = document.getElementById('total-config-weight');

  function calculateTotals() {
    let price = basePrice;
    let addedWeight = 0;

    checkboxes.forEach(cb => {
      if (cb.checked) {
        price += parseInt(cb.dataset.price || '0', 10);
        addedWeight += parseFloat(cb.dataset.weight || '0');
      }
    });

    if (totalPriceDisplay) {
      totalPriceDisplay.textContent = price.toLocaleString('tr-TR') + ' ₺';
    }
    if (totalWeightDisplay) {
      const baseWeight = 193;
      totalWeightDisplay.textContent = (baseWeight + addedWeight).toFixed(1) + ' kg';
    }
  }

  checkboxes.forEach(cb => {
    cb.addEventListener('change', calculateTotals);
  });
}

/* ==========================================================================
   4. CP3 Live Audio Rev Sound Engine Simulator
   ========================================================================== */
function initEngineSimulator() {
  const startBtn = document.getElementById('startEngineBtn');
  const revBtn = document.getElementById('revBtn');
  const qsBtn = document.getElementById('qsBtn');
  const throttleSlider = document.getElementById('throttleSlider');
  const rpmDisplay = document.getElementById('rpmDisplay');
  const gaugeNeedle = document.getElementById('gaugeNeedle');

  let isEngineRunning = false;

  if (!startBtn || !window.cp3Synth) return;

  startBtn.addEventListener('click', () => {
    if (!isEngineRunning) {
      window.cp3Synth.start();
      isEngineRunning = true;
      startBtn.innerHTML = '<i class="fa-solid fa-power-off"></i> Motoru Durdur';
      startBtn.classList.remove('btn-primary');
      startBtn.classList.add('btn-secondary');
      if (throttleSlider) throttleSlider.disabled = false;
      if (revBtn) revBtn.disabled = false;
      if (qsBtn) qsBtn.disabled = false;
    } else {
      window.cp3Synth.stop();
      isEngineRunning = false;
      startBtn.innerHTML = '<i class="fa-solid fa-play"></i> Motoru Çalıştır';
      startBtn.classList.remove('btn-secondary');
      startBtn.classList.add('btn-primary');
      if (throttleSlider) {
        throttleSlider.disabled = true;
        throttleSlider.value = 1200;
      }
      if (revBtn) revBtn.disabled = true;
      if (qsBtn) qsBtn.disabled = true;
      updateGauge(1200);
    }
  });

  if (throttleSlider) {
    throttleSlider.addEventListener('input', (e) => {
      if (isEngineRunning) {
        window.cp3Synth.setRpm(parseFloat(e.target.value));
      }
    });
  }

  // Quickshifter Pop
  if (qsBtn) {
    qsBtn.addEventListener('click', () => {
      if (isEngineRunning) {
        window.cp3Synth.quickshiftPop();
      }
    });
  }

  // Press & Hold Rev Button
  if (revBtn) {
    let revInterval = null;
    const startRev = () => {
      if (!isEngineRunning) return;
      revInterval = setInterval(() => {
        let currentVal = parseInt(throttleSlider.value, 10);
        if (currentVal < 9800) {
          throttleSlider.value = currentVal + 400;
          window.cp3Synth.setRpm(parseInt(throttleSlider.value, 10));
        }
      }, 50);
    };

    const stopRev = () => {
      clearInterval(revInterval);
      if (isEngineRunning) {
        let returnInterval = setInterval(() => {
          let currentVal = parseInt(throttleSlider.value, 10);
          if (currentVal > 1200) {
            throttleSlider.value = currentVal - 500;
            window.cp3Synth.setRpm(parseInt(throttleSlider.value, 10));
          } else {
            throttleSlider.value = 1200;
            window.cp3Synth.setRpm(1200);
            clearInterval(returnInterval);
          }
        }, 50);
      }
    };

    revBtn.addEventListener('mousedown', startRev);
    revBtn.addEventListener('mouseup', stopRev);
    revBtn.addEventListener('mouseleave', stopRev);
    revBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRev(); });
    revBtn.addEventListener('touchend', stopRev);
  }

  // Callback to update RPM needle and numbers on screen smoothly
  window.cp3Synth.onRpmUpdate = (rpm) => {
    updateGauge(rpm);
  };

  function updateGauge(rpm) {
    if (rpmDisplay) {
      rpmDisplay.textContent = Math.round(rpm);
    }
    if (gaugeNeedle) {
      // Map 1200 - 10500 RPM to angle range -120deg to 120deg
      const minRpm = 1200;
      const maxRpm = 10500;
      const percent = Math.max(0, Math.min(1, (rpm - minRpm) / (maxRpm - minRpm)));
      const angle = -120 + percent * 240;
      gaugeNeedle.style.transform = `rotate(${angle}deg)`;
    }
  }
}

/* ==========================================================================
   5. YRC (Yamaha Ride Control) & Technology Tabs
   ========================================================================== */
function initTechTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetEl = document.getElementById(target);
      if (targetEl) {
        targetEl.classList.add('active');
      }
    });
  });
}

/* ==========================================================================
   6. Specifications Category Filter
   ========================================================================== */
function initSpecsFilter() {
  const specBtns = document.querySelectorAll('.spec-category-btn');
  const specRows = document.querySelectorAll('.spec-row');

  specBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      specBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cat = btn.dataset.category;

      specRows.forEach(row => {
        if (cat === 'all' || row.dataset.category === cat) {
          row.style.display = 'table-row';
        } else {
          row.style.display = 'none';
        }
      });
    });
  });
}

/* ==========================================================================
   7. Fuel & Range Calculator
   ========================================================================== */
function initFuelCalculator() {
  const distanceInput = document.getElementById('calc-distance');
  const fuelPriceInput = document.getElementById('calc-fuel-price');

  const distanceVal = document.getElementById('val-distance');
  const fuelPriceVal = document.getElementById('val-fuel-price');

  const totalFuelCost = document.getElementById('res-fuel-cost');
  const totalLiters = document.getElementById('res-fuel-liters');
  const totalTanks = document.getElementById('res-tank-count');

  function calculate() {
    const km = parseFloat(distanceInput.value);
    const pricePerLiter = parseFloat(fuelPriceInput.value);

    // MT-09 average fuel consumption = 5.0 L / 100 km
    const avgConsumption = 5.0;
    const litersNeeded = (km / 100) * avgConsumption;
    const cost = litersNeeded * pricePerLiter;
    const tanks = litersNeeded / 14.0; // 14 Liters tank size

    if (distanceVal) distanceVal.textContent = km.toLocaleString('tr-TR') + ' km';
    if (fuelPriceVal) fuelPriceVal.textContent = pricePerLiter.toFixed(2) + ' ₺';

    if (totalFuelCost) totalFuelCost.textContent = Math.round(cost).toLocaleString('tr-TR') + ' ₺';
    if (totalLiters) totalLiters.textContent = litersNeeded.toFixed(1) + ' Litre';
    if (totalTanks) totalTanks.textContent = tanks.toFixed(1) + ' Depo';
  }

  if (distanceInput && fuelPriceInput) {
    distanceInput.addEventListener('input', calculate);
    fuelPriceInput.addEventListener('input', calculate);
    calculate();
  }
}

/* ==========================================================================
   8. Gallery Lightbox Modal
   ========================================================================== */
function initGalleryModal() {
  const galleryItems = document.querySelectorAll('.gallery-item');

  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      const imgSrc = item.querySelector('img').src;
      const title = item.querySelector('h4') ? item.querySelector('h4').textContent : 'Yamaha MT-09';
      
      const modal = document.createElement('div');
      modal.className = 'modal active';
      modal.innerHTML = `
        <div class="modal-content glass-panel" style="max-width: 900px; text-align: center;">
          <button class="modal-close">&times;</button>
          <img src="${imgSrc}" style="width: 100%; max-height: 75vh; object-fit: contain; border-radius: 10px; margin-bottom: 15px;">
          <h3 style="color: var(--cyan-neon);">${title}</h3>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.remove();
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });
    });
  });
}

/* ==========================================================================
   9. Booking Modal
   ========================================================================== */
function initBookingModal() {
  const bookingModal = document.getElementById('bookingModal');
  const openBtns = document.querySelectorAll('.open-booking-modal');
  const closeBtn = document.getElementById('closeBookingModal');
  const bookingForm = document.getElementById('bookingForm');

  openBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (bookingModal) bookingModal.classList.add('active');
    });
  });

  if (closeBtn && bookingModal) {
    closeBtn.addEventListener('click', () => {
      bookingModal.classList.remove('active');
    });

    bookingModal.addEventListener('click', (e) => {
      if (e.target === bookingModal) {
        bookingModal.classList.remove('active');
      }
    });
  }

  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('book-name').value;
      alert(`Tebrikler ${name}! Yamaha MT-09 test sürüşü talebiniz başarıyla alındı. Müşteri temsilcimiz en kısa sürede sizinle iletişime geçecektir.`);
      bookingForm.reset();
      bookingModal.classList.remove('active');
    });
  }
}
