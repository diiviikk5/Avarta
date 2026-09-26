/**
 * Avarta — Main JavaScript Engine
 * Handles animations, count-up stats, interactive terminal simulator,
 * case study switcher, and meteorological decision briefing generator.
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initStatsCounter();
  initBgVideo();
  initNavLinks();
  initCaseSwitcher();
  initTerminalSimulator();
  initBriefingGenerator();
});

/**
 * Mobile Hamburger Menu & Overlay Toggle
 */
function initMobileMenu() {
  const burgerBtn = document.getElementById('burgerBtn');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const mobileMenuSheet = document.getElementById('mobileMenuSheet');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link, .mobile-signin-btn');

  if (!burgerBtn || !mobileOverlay || !mobileMenuSheet) return;

  function openMenu() {
    burgerBtn.classList.add('open');
    burgerBtn.setAttribute('aria-expanded', 'true');
    mobileOverlay.removeAttribute('hidden');
    mobileMenuSheet.removeAttribute('hidden');
    document.body.classList.add('menu-open');
  }

  function closeMenu() {
    burgerBtn.classList.remove('open');
    burgerBtn.setAttribute('aria-expanded', 'false');
    mobileOverlay.setAttribute('hidden', '');
    mobileMenuSheet.setAttribute('hidden', '');
    document.body.classList.remove('menu-open');
  }

  function toggleMenu() {
    const isExpanded = burgerBtn.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  burgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  mobileOverlay.addEventListener('click', closeMenu);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burgerBtn.getAttribute('aria-expanded') === 'true') {
      closeMenu();
    }
  });

  mobileNavLinks.forEach((link) => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 720 && burgerBtn.getAttribute('aria-expanded') === 'true') {
      closeMenu();
    }
  });
}

/**
 * Stats Counter Animation
 * easeOutCubic, duration = 1500 + i*80ms, start offset = 480 + i*90ms
 * IntersectionObserver threshold = 0.25
 */
function initStatsCounter() {
  const statsGrid = document.getElementById('statsGrid');
  const statElements = document.querySelectorAll('.stat-value');
  if (!statsGrid || statElements.length === 0) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function formatValue(current, target, decimals, suffix) {
    if (decimals > 0) {
      return current.toFixed(decimals) + suffix;
    }
    return Math.round(current).toString() + suffix;
  }

  function animateStat(element, index) {
    const target = parseFloat(element.getAttribute('data-target') || '0');
    const suffix = element.getAttribute('data-suffix') || '';
    const decimals = parseInt(element.getAttribute('data-decimals') || '0', 10);

    if (prefersReducedMotion) {
      element.textContent = formatValue(target, target, decimals, suffix);
      return;
    }

    const duration = 1500 + index * 80;
    const startDelay = 480 + index * 90;

    setTimeout(() => {
      let startTime = null;

      function step(currentTime) {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);
        const currentValue = target * easedProgress;

        element.textContent = formatValue(currentValue, target, decimals, suffix);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          element.textContent = formatValue(target, target, decimals, suffix);
        }
      }

      requestAnimationFrame(step);
    }, startDelay);
  }

  let animated = false;
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !animated) {
          animated = true;
          statElements.forEach((el, index) => {
            animateStat(el, index);
          });
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.25 }
  );

  observer.observe(statsGrid);
}

/**
 * Background Video Autoplay safety
 */
function initBgVideo() {
  const video = document.querySelector('.bg-video');
  if (video) {
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  }
}

/**
 * Navigation Link Scroll & Active State
 */
function initNavLinks() {
  const navLinks = document.querySelectorAll('.nav-pill .nav-link, .mobile-nav .mobile-nav-link');
  const sections = document.querySelectorAll('section[id], div[id="heroViewport"]');

  window.addEventListener('scroll', () => {
    let currentId = 'heroViewport';
    const scrollPos = window.scrollY + 200;

    sections.forEach((sec) => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        currentId = sec.getAttribute('id');
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === `#${currentId}`) {
        link.classList.add('active');
      }
    });
  });
}

/**
 * Case Study Switcher: August 2025, Super Cyclone Amphan, 2024 Heat Dome
 */
function initCaseSwitcher() {
  const pills = document.querySelectorAll('.case-pill');
  const title = document.getElementById('caseTitle');
  const summary = document.getElementById('caseSummary');
  const mGefs = document.getElementById('mGefs');
  const mObs = document.getElementById('mObs');
  const mCells = document.getElementById('mCells');
  const mMae = document.getElementById('mMae');
  const caveat = document.getElementById('caseCaveat');
  const trackInit = document.getElementById('trackInit');
  const trackValid = document.getElementById('trackValid');
  const trackBbox = document.getElementById('trackBbox');

  const CASE_DATA = {
    rainfall: {
      title: 'August 2025 Northwest India Rain',
      summary: 'An archived NOAA GEFS forecast initialized 19 Aug 2025 00:00 UTC verified against the IMD 23 Aug daily rainfall grid across 2,237 common valid cells.',
      gefs: '44.61 <small>mm/d</small>',
      obs: '469.21 <small>mm/d</small>',
      cells: '2,237',
      mae: '13.97 <small>mm/d</small>',
      caveat: 'Honest demonstration: 5 GEFS members missed the extreme 469 mm/d localized cloudburst peak, establishing need for physics-informed downscaling.',
      init: '2025-08-19 00:00Z',
      valid: '22 Aug 03:00 - 23 Aug 03:00 UTC',
      bbox: '[23.5°N–31.0°N, 71.0°E–79.5°E]'
    },
    cyclone: {
      title: 'Super Cyclone Amphan (May 2020)',
      summary: 'Extreme cyclonic storm with 185 km/h landfall winds reconstructed across Bay of Bengal coastal corridor with GNN spherical vortex tracking.',
      gefs: '124.5 <small>km/h</small>',
      obs: '185.0 <small>km/h</small>',
      cells: '4,812',
      mae: '18.42 <small>km/h</small>',
      caveat: 'Track trajectory correctly predicted landfall within 24 km, but coarse resolution underestimated inner eyewall pressure drop.',
      init: '2020-05-16 12:00Z',
      valid: '18 May 00:00 - 21 May 12:00 UTC',
      bbox: '[12.0°N–23.0°N, 84.0°E–91.0°E]'
    },
    heatwave: {
      title: '2024 North India Severe Heat Dome',
      summary: 'Persistent 500 hPa subtropical ridge trapped extreme subsidence heating across Indo-Gangetic Plains, evaluated against Stull wet-bulb metrics.',
      gefs: '44.2 <small>°C</small>',
      obs: '49.8 <small>°C</small>',
      cells: '6,140',
      mae: '2.14 <small>°C</small>',
      caveat: 'High thermal consistency across 12 ECMWF members; maximum variance occurred over urban heat island centers.',
      init: '2024-05-24 00:00Z',
      valid: '25 May - 31 May 2024 Daily',
      bbox: '[24.0°N–32.5°N, 73.0°E–84.0°E]'
    }
  };

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');

      const caseKey = pill.getAttribute('data-case');
      const data = CASE_DATA[caseKey];
      if (!data) return;

      if (title) title.textContent = data.title;
      if (summary) summary.textContent = data.summary;
      if (mGefs) mGefs.innerHTML = data.gefs;
      if (mObs) mObs.innerHTML = data.obs;
      if (mCells) mCells.textContent = data.cells;
      if (mMae) mMae.innerHTML = data.mae;
      if (caveat) {
        caveat.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${data.caveat}</span>`;
      }
      if (trackInit) trackInit.textContent = data.init;
      if (trackValid) trackValid.textContent = data.valid;
      if (trackBbox) trackBbox.textContent = data.bbox;
    });
  });
}

/**
 * Interactive Terminal Mission Control Simulator
 */
function initTerminalSimulator() {
  const terminalInput = document.getElementById('terminalInput');
  const termOutput = document.getElementById('termOutput');
  const termSubmitBtn = document.getElementById('termSubmitBtn');
  const quickBtns = document.querySelectorAll('.term-quick-btn');

  if (!terminalInput || !termOutput) return;

  function appendLine(html) {
    const line = document.createElement('div');
    line.className = 'term-line';
    line.innerHTML = html;
    termOutput.appendChild(line);
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  function handleCommand(cmdRaw) {
    const cmd = cmdRaw.trim().toLowerCase();
    if (!cmd) return;

    appendLine(`<span class="t-prompt">avarta@ncmrwf:~$</span> <span style="color:#fff;">${cmd}</span>`);

    switch (cmd) {
      case 'help':
        appendLine('<span class="t-cyan">AVAILABLE AVARTA COMMANDS:</span>');
        appendLine('  <span style="color:#facc15;">status</span>     - Show active NWP assimilation pipelines & cluster health');
        appendLine('  <span style="color:#facc15;">scan</span>       - Run multi-variable anomaly detector over 30 Indian regions');
        appendLine('  <span style="color:#facc15;">downscale</span>  - Trigger 5 km PINN downscaler with differentiable moisture flux');
        appendLine('  <span style="color:#facc15;">alerts</span>     - Query OASIS CAP 1.2 emergency feeds & critical infrastructure');
        appendLine('  <span style="color:#facc15;">cases</span>      - List verified historical cases (August 2025, Amphan, Heatwave)');
        appendLine('  <span style="color:#facc15;">clear</span>      - Clear terminal screen');
        break;

      case 'status':
        appendLine('<span class="t-cyan">[SYSTEM STATUS]</span> Operational Core Online');
        appendLine('  Assimilation Engine:  ECMWF IFS (0.25°) + NOAA GEFS (0.5°) Control + 4 Members');
        appendLine('  Valid Grid Domain:    [6.0°N–37.5°N, 68.0°E–98.0°E] (All-India)');
        appendLine('  PINN Acceleration:    Active (PyTorch CUDA / Differentiable Conservation Barrier)');
        appendLine('  OASIS CAP Feed:       NDMA / SACHET XML v1.2 Protocol Synchronized');
        break;

      case 'scan':
        appendLine('<span class="t-cyan">[SCANNING 30 NWP SUB-DIVISIONS...]</span>');
        appendLine('  [!] Severe Anomaly Detected: Western Ghats (148.4 mm/24h orographic moisture flux)');
        appendLine('  [!] High Anomaly Detected:   Konkan Coast & Goa (88.2 mm/24h runoff risk)');
        appendLine('  [!] Offshore Alert:          Bay of Bengal (92 km/h cyclonic surface gusts)');
        appendLine('  Hungarian Hungarian Kalman Tracker: 3 Active Bounding Boxes Assigned');
        break;

      case 'downscale':
        appendLine('<span class="t-cyan">[TRIGGERING 5 KM PINN DOWNSCALING INFERENCE]</span>');
        appendLine('  Input:  Coarse NWP 12 km moisture & wind tensor [16x16]');
        appendLine('  Loss:   Conservation constraint ∇·(qv) + w_oro (5km DEM slope gradient)');
        appendLine('  Result: Generated 5 km resolution field with 50.7% Fourier PSD fine-scale retention');
        appendLine('  Peak:   Predicted 162.4 mm/day (Standard Bilinear only resolved 58.2 mm/day)');
        break;

      case 'alerts':
        appendLine('<span class="t-cyan">[ACTIVE OASIS CAP 1.2 BROADCASTS]</span>');
        appendLine('  ALERT ID:   AVARTA-CAP-2025-08-23-001');
        appendLine('  SEVERITY:   SEVERE | URGENCY: Immediate | CERTAINTY: Observed');
        appendLine('  POLYGON:    Geodesic 5km buffer around vulnerable Ghat corridors');
        appendLine('  IMPACT:     AIIMS buffer clear; NH-66 sector 4 alert; 220kV power lines flagged');
        break;

      case 'cases':
        appendLine('<span class="t-cyan">[VERIFIED CASE CATALOG]</span>');
        appendLine('  1. august-2025.json    - Northwest India Rain (469 mm/d IMD vs 44.6 mm/d GEFS)');
        appendLine('  2. cyclone-amphan.json - Super Cyclone Amphan (185 km/h landfall)');
        appendLine('  3. heatwave-2024.json  - North India Heat Dome (49.8°C wet-bulb)');
        break;

      case 'clear':
        termOutput.innerHTML = '';
        appendLine('<span class="t-cyan">Avarta Meteorological Intelligence Console v0.1.0</span>');
        appendLine('<span class="t-muted">Type "help" for a list of available commands.</span>');
        break;

      default:
        appendLine(`<span style="color:#ef4444;">Command not recognized: '${cmd}'. Type 'help' to see valid commands.</span>`);
        break;
    }
  }

  terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = terminalInput.value;
      terminalInput.value = '';
      handleCommand(val);
    }
  });

  if (termSubmitBtn) {
    termSubmitBtn.addEventListener('click', () => {
      const val = terminalInput.value;
      terminalInput.value = '';
      handleCommand(val);
    });
  }

  quickBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cmd = btn.getAttribute('data-cmd');
      if (cmd) handleCommand(cmd);
    });
  });
}

/**
 * Decision Briefing Copilot Generator
 */
function initBriefingGenerator() {
  const select = document.getElementById('briefingSelect');
  const btn = document.getElementById('generateBriefingBtn');
  const textOutput = document.getElementById('briefText');

  const BRIEFINGS = {
    western_ghats:
      'Active ensemble consensus indicates severe orographic enhancement along windward slopes. 24h accumulation will exceed local drainage absorption limits (148 mm/day). Recommend pre-positioning SDRF teams near vulnerable Ghat cuttings on NH-66 and issuing GKMS agricultural advisory to postpone paddy harvesting.',
    bay_of_bengal:
      'Deep depression vortex tracking northeastward at 14 km/h with gale wind gusts to 92 km/h. Coastal tidal surge expected to breach 1.2m above astronomical tide. Advise immediate return of all mechanized fishing vessels along Paradip-Dhamra corridor and prepare shelters in Balasore.',
    assam_brahmaputra:
      'High-altitude watershed precipitation in Arunachal catchment is propagating downriver. 48-hour flood wave arrival expected at Guwahati gauge. Critical infrastructure buffer: AIIMS Guwahati remains above 100-year inundation level; culverts on NH-27 require continuous debris monitoring.'
  };

  if (!btn || !select || !textOutput) return;

  btn.addEventListener('click', () => {
    const val = select.value;
    textOutput.style.opacity = '0.4';
    setTimeout(() => {
      textOutput.textContent = BRIEFINGS[val] || BRIEFINGS.western_ghats;
      textOutput.style.opacity = '1';
    }, 200);
  });
}
