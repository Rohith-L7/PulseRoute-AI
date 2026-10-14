// Main Dispatcher Application Controller
document.addEventListener('DOMContentLoaded', async () => {
  // State
  let state = {
    hospitals: [],
    presets: [],
    incidents: [],
    selectedHospitalId: 'hosp-1',
    activePresetId: 'preset-1',
    currentPatientOrigin: { lat: 17.4304, lng: 78.4080, address: 'Jubilee Hills Checkpost' },
    activeEvaluation: null,
    lambdaPenalty: 1.25,
    isSirenMuted: true
  };

  // Initialize Simulator Engine
  const simulator = new AmbulanceRouteSimulator('map');
  simulator.initMap([17.4300, 78.4100], 13);

  // DOM Elements
  const hospitalListEl = document.getElementById('hospital-list');
  const presetSelectorEl = document.getElementById('preset-selector');
  const routeCardsContainer = document.getElementById('route-cards');
  const incidentsListEl = document.getElementById('incidents-list');
  const lambdaSlider = document.getElementById('lambda-slider');
  const lambdaValDisplay = document.getElementById('lambda-val');
  
  // HUD Telemetry Elements
  const etaValEl = document.getElementById('hud-eta-val');
  const distValEl = document.getElementById('hud-dist-val');
  const speedValEl = document.getElementById('hud-speed-val');
  const statusValEl = document.getElementById('hud-status-val');

  // Impact Banner Elements
  const baselineEtaEl = document.getElementById('stat-baseline-eta');
  const aiEtaEl = document.getElementById('stat-ai-eta');
  const minutesSavedEl = document.getElementById('stat-minutes-saved');
  const percentSavedEl = document.getElementById('stat-percent-saved');

  // Buttons
  const btnStartSim = document.getElementById('btn-start-sim');
  const btnPauseSim = document.getElementById('btn-pause-sim');
  const btnRerouteDemo = document.getElementById('btn-reroute-demo');
  const btnToggleSiren = document.getElementById('btn-toggle-siren');
  const btnOpenJury = document.getElementById('btn-open-jury');
  const btnOpenMl = document.getElementById('btn-open-ml');

  // Modals
  const juryModal = document.getElementById('jury-modal');
  const mlModal = document.getElementById('ml-modal');
  const rerouteToast = document.getElementById('reroute-toast');

  // Setup Simulator Callbacks
  simulator.onProgressUpdate = (telemetry) => {
    if (telemetry.completed) {
      statusValEl.innerText = 'ARRIVED AT TRAUMA BAY';
      statusValEl.style.color = '#10b981';
      btnStartSim.innerHTML = '<span>▶</span> Dispatch Again';
      return;
    }
    etaValEl.innerHTML = `${telemetry.remainingEtaMin} <small>min</small>`;
    distValEl.innerHTML = `${telemetry.remainingKm} <small>km</small>`;
    speedValEl.innerHTML = `${telemetry.currentSpeedKmh} <small>km/h</small>`;
    statusValEl.innerText = `EN ROUTE (${telemetry.progressPercent}%)`;
    statusValEl.style.color = '#38bdf8';
  };

  simulator.onRerouteOccurred = (newRoute) => {
    showRerouteToast(
      'REROUTING ENGAGED',
      `Live hazard detected. Auto-diverted to ${newRoute.name} to avoid gridlock.`
    );
  };

  // Signal Preemption Callback (<15m detection)
  simulator.onSignalPreempted = ({ signal, distanceMeters }) => {
    showRerouteToast(
      '🚦 GREEN WAVE PREEMPTION',
      `Approached ${signal.name} (${distanceMeters}m). Signal flipped RED 🔴 → GREEN 🟢 (Delay: 0s).`
    );
    const hudSignalVal = document.getElementById('hud-signal-val');
    if (hudSignalVal) {
      hudSignalVal.innerHTML = '🟢 GREEN WAVE (PREEMPTED)';
      hudSignalVal.style.color = '#10b981';
    }
    fetch(`/api/signals/${signal.id}/preempt`, { method: 'POST' }).catch(() => {});
  };

  // Fetch Initial Data
  async function loadInitialData() {
    try {
      const [hospRes, presetRes, incRes, configRes, sigRes] = await Promise.all([
        fetch('/api/hospitals').then(r => r.json()),
        fetch('/api/presets').then(r => r.json()),
        fetch('/api/incidents').then(r => r.json()),
        fetch('/api/config').then(r => r.json()).catch(() => ({ hasServerKey: false })),
        fetch('/api/signals').then(r => r.json()).catch(() => ({ success: false }))
      ]);

      if (hospRes.success) state.hospitals = hospRes.data;
      if (presetRes.success) state.presets = presetRes.data;
      if (incRes.success) state.incidents = incRes.data;
      if (sigRes.success) {
        state.trafficSignals = sigRes.data;
        simulator.renderTrafficSignals(state.trafficSignals);
      }

      const googleStatusText = document.getElementById('google-status-text');
      if (googleStatusText) {
        if (configRes && configRes.hasServerKey) {
          googleStatusText.innerHTML = 'GOOGLE ROUTES: <strong style="color: #10b981;">ENABLED</strong>';
        } else {
          googleStatusText.innerHTML = 'TRAFFIC FEED: <strong>LOCAL GRAPH (HYBRID)</strong>';
        }
      }

      renderPresetsUI();
      renderHospitalsUI();
      renderIncidentsUI();

      // Set initial patient origin from preset 1
      if (state.presets.length > 0) {
        state.currentPatientOrigin = {
          lat: state.presets[0].lat,
          lng: state.presets[0].lng,
          address: state.presets[0].title
        };
        state.selectedHospitalId = state.presets[0].recommendedHospitalId;
      }

      simulator.renderHospitals(state.hospitals, (hospId) => {
        state.selectedHospitalId = hospId;
        renderHospitalsUI();
        calculateAndRenderRoutes();
      });

      simulator.renderIncidents(state.incidents, async (incId) => {
        await removeIncident(incId);
      });

      simulator.renderPatient(state.currentPatientOrigin);

      await calculateAndRenderRoutes();
    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  // Render Preset Scenarios
  function renderPresetsUI() {
    presetSelectorEl.innerHTML = '';
    state.presets.forEach(p => {
      const btn = document.createElement('div');
      btn.className = `preset-btn ${p.id === state.activePresetId ? 'active' : ''}`;
      btn.innerHTML = `
        <div class="p-title">
          <span>${p.patientName}</span>
          <span style="font-size: 0.7rem; color: var(--accent-rose);">Priority 1</span>
        </div>
        <div class="p-sub">${p.description}</div>
      `;
      btn.addEventListener('click', () => {
        state.activePresetId = p.id;
        state.currentPatientOrigin = { lat: p.lat, lng: p.lng, address: p.patientName };
        state.selectedHospitalId = p.recommendedHospitalId;
        renderPresetsUI();
        renderHospitalsUI();
        simulator.renderPatient(state.currentPatientOrigin);
        calculateAndRenderRoutes();
      });
      presetSelectorEl.appendChild(btn);
    });
  }

  // Render Hospitals List
  function renderHospitalsUI() {
    hospitalListEl.innerHTML = '';
    state.hospitals.forEach(h => {
      const isSelected = h.id === state.selectedHospitalId;
      const card = document.createElement('div');
      card.className = `hosp-card ${isSelected ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="hosp-header">
          <div class="hosp-name">${h.name}</div>
          <span class="trauma-badge">${h.traumaLevel.replace(' Center', '')}</span>
        </div>
        <div style="font-size: 0.72rem; color: var(--text-dim);">${h.address}</div>
        <div class="hosp-telemetry">
          <span>🏥 ICU: <strong class="icu-count">${h.icuBedsAvailable} Available</strong></span>
          <span>⏱️ ER Wait: <strong>${h.erWaitTimeMinutes}m</strong></span>
        </div>
      `;
      card.addEventListener('click', () => {
        state.selectedHospitalId = h.id;
        renderHospitalsUI();
        calculateAndRenderRoutes();
      });
      hospitalListEl.appendChild(card);
    });
  }

  // Render Incidents List
  function renderIncidentsUI() {
    incidentsListEl.innerHTML = '';
    if (state.incidents.length === 0) {
      incidentsListEl.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-dim); text-align: center; padding: 10px;">No active roadway obstacles registered.</div>`;
      return;
    }

    state.incidents.forEach(inc => {
      const item = document.createElement('div');
      item.className = 'incident-pill';
      item.innerHTML = `
        <div class="incident-info">
          <span class="incident-name">${inc.isClosure ? '⛔' : '⚠️'} ${inc.title}</span>
          <span class="incident-loc">${inc.locationName} (${inc.delayPenaltyMinutes > 100 ? 'ROAD BLOCKED' : '+' + inc.delayPenaltyMinutes + 'm delay'})</span>
        </div>
        <button class="btn-remove-inc" title="Clear incident">✕</button>
      `;

      item.querySelector('.btn-remove-inc').addEventListener('click', async (e) => {
        e.stopPropagation();
        await removeIncident(inc.id);
      });

      incidentsListEl.appendChild(item);
    });
  }

  // Calculate & Evaluate Routes via Backend Engine
  async function calculateAndRenderRoutes() {
    try {
      const res = await fetch('/api/routes/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: state.currentPatientOrigin,
          hospitalId: state.selectedHospitalId,
          lambda: state.lambdaPenalty
        })
      });

      const json = await res.json();
      if (!json.success) return;

      const evalData = json.data;
      state.activeEvaluation = evalData;

      // Update Map Polylines
      simulator.renderRoutes(evalData.routes, evalData.bestRouteId);

      // Update Route Cards
      renderRouteCards(evalData);

      // Update Impact & Analytics Numbers
      baselineEtaEl.innerText = `${evalData.savings.baselineEtaMin} min`;
      aiEtaEl.innerText = `${evalData.savings.recommendedEtaMin} min`;
      minutesSavedEl.innerText = `-${evalData.savings.minutesSaved} min`;
      percentSavedEl.innerText = `${evalData.savings.percentImprovement}%`;

      if (evalData.dataSource === 'GOOGLE_ROUTES_TRAFFIC_AWARE') {
        const googleStatusText = document.getElementById('google-status-text');
        if (googleStatusText) {
          googleStatusText.innerHTML = 'FEED: <strong style="color: #10b981;">GOOGLE ROUTES (LIVE TRAFFIC)</strong>';
        }
      }

      // Update Top HUD
      const bestRoute = evalData.routes.find(r => r.id === evalData.bestRouteId);
      if (bestRoute) {
        etaValEl.innerHTML = `${bestRoute.rawTravelTimeMin} <small>min</small>`;
        distValEl.innerHTML = `${bestRoute.totalDistanceKm} <small>km</small>`;
        statusValEl.innerText = 'DISPATCH READY (STANDBY)';
        statusValEl.style.color = '#10b981';
      }

      // Update Formula String in Impact Card
      const formulaEl = document.getElementById('formula-calc-text');
      if (formulaEl) {
        formulaEl.innerText = `(${evalData.savings.baselineEtaMin}m - ${evalData.savings.recommendedEtaMin}m) / ${evalData.savings.baselineEtaMin}m × 100 = ${evalData.savings.percentImprovement}%`;
      }
    } catch (e) {
      console.error('Route calculation error:', e);
    }
  }

  // Render Right Sidebar Route Comparison Cards
  function renderRouteCards(evalData) {
    routeCardsContainer.innerHTML = '';

    evalData.routes.forEach(r => {
      const isRecommended = (r.id === evalData.bestRouteId);
      const explanation = evalData.explanations.find(e => e.routeId === r.id);

      let cardClass = 'route-card';
      let tagClass = 'tag-cyan';
      let tagText = 'Alternative';

      if (isRecommended) {
        cardClass += ' recommended';
        tagClass = 'tag-emerald';
        tagText = 'AI RECOMMENDED';
      } else if (r.hasClosure) {
        cardClass += ' rejected';
        tagClass = 'tag-rose';
        tagText = 'CLOSED / BLOCKED';
      } else if (r.totalPenalties > 0) {
        cardClass += ' amber';
        tagClass = 'tag-amber';
        tagText = 'CONGESTED DETOUR';
      }

      const card = document.createElement('div');
      card.className = cardClass;
      card.innerHTML = `
        <div class="route-card-header">
          <span class="route-tag ${tagClass}">${tagText}</span>
          <span style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-dim);">Cost C(R): ${r.totalCost > 9000 ? '∞' : r.totalCost.toFixed(1)}</span>
        </div>
        <div class="route-name">${r.name}</div>
        <div class="route-stats-grid">
          <div class="r-stat">
            <span class="s-lbl">Est. Time</span>
            <span class="s-val" style="color: ${isRecommended ? '#10b981' : (r.hasClosure ? '#ef4444' : '#f59e0b')}">${r.rawTravelTimeMin}m</span>
          </div>
          <div class="r-stat">
            <span class="s-lbl">Distance</span>
            <span class="s-val">${r.totalDistanceKm}km</span>
          </div>
          <div class="r-stat">
            <span class="s-lbl">Delays</span>
            <span class="s-val" style="color: ${r.totalPenalties > 0 ? '#f43f5e' : '#10b981'}">+${r.totalPenalties}m</span>
          </div>
        </div>
        <div class="route-explanation">
          ${explanation ? explanation.reasons.join(' ') : r.description}
        </div>
      `;

      card.addEventListener('click', () => {
        simulator.renderRoutes(evalData.routes, r.id);
        // Highlight active card
        document.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected-manual'));
        card.classList.add('selected-manual');
      });

      routeCardsContainer.appendChild(card);
    });
  }

  // Toast Notification
  function showRerouteToast(title, msg) {
    rerouteToast.querySelector('h4').innerText = title;
    rerouteToast.querySelector('p').innerText = msg;
    rerouteToast.classList.add('show');
    setTimeout(() => {
      rerouteToast.classList.remove('show');
    }, 4500);
  }

  // Add Incident Function
  async function addIncident(incidentData) {
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incidentData)
      });
      const json = await res.json();
      if (json.success) {
        state.incidents.unshift(json.data);
        simulator.renderIncidents(state.incidents, removeIncident);
        renderIncidentsUI();
        await calculateAndRenderRoutes();
        window.EmergencyAudio.playDispatchChime();
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Remove Incident Function
  async function removeIncident(incidentId) {
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        state.incidents = state.incidents.filter(i => i.id !== incidentId);
        simulator.renderIncidents(state.incidents, removeIncident);
        renderIncidentsUI();
        await calculateAndRenderRoutes();
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Click on map to place incident
  window.onMapLocationSelected = (latlng) => {
    const title = prompt('Emergency Incident Report Title:', 'Accident / Stalled Vehicle');
    if (!title) return;
    addIncident({
      title,
      locationName: 'Reported Junction Point',
      lat: latlng.lat,
      lng: latlng.lng,
      severity: 'HIGH',
      delayPenaltyMinutes: 6.0,
      speedReductionPercent: 70,
      isClosure: false,
      description: 'Reported by field unit via live telemetry map tap.'
    });
  };

  // Simulation Button Handlers
  btnStartSim.addEventListener('click', () => {
    if (!state.activeEvaluation) return;
    simulator.startAmbulanceSimulation(state.activeEvaluation.bestRouteId);
    btnStartSim.innerHTML = '<span>🔄</span> Restart';
    statusValEl.innerText = 'DISPATCHED (LIVE SIREN)';
    statusValEl.style.color = '#38bdf8';
    const hudSignalVal = document.getElementById('hud-signal-val');
    if (hudSignalVal) {
      hudSignalVal.innerText = 'ARMED (<15m)';
      hudSignalVal.style.color = '#10b981';
    }
  });

  btnPauseSim.addEventListener('click', () => {
    const paused = simulator.pauseSimulation();
    btnPauseSim.innerText = paused ? '▶ Resume' : '⏸ Pause';
  });

  // Reset Signals to Red
  const btnResetSignals = document.getElementById('btn-reset-signals');
  if (btnResetSignals) {
    btnResetSignals.addEventListener('click', () => {
      simulator.resetTrafficSignals();
      fetch('/api/signals/reset', { method: 'POST' }).catch(() => {});
      const hudSignalVal = document.getElementById('hud-signal-val');
      if (hudSignalVal) {
        hudSignalVal.innerText = 'AUTO (<15m)';
        hudSignalVal.style.color = '#10b981';
      }
      showRerouteToast('🚦 SIGNALS RESET', 'All intersection traffic signals reset to normal RED cycle.');
    });
  }

  // Hackathon Wow Feature: Mid-Transit Live Reroute Demo
  btnRerouteDemo.addEventListener('click', async () => {
    // If simulation not running, start it first
    if (!simulator.simulationState.isRunning) {
      simulator.startAmbulanceSimulation(state.activeEvaluation.bestRouteId);
    }

    showRerouteToast('⚠️ SIMULATING SUDDEN OBSTACLE', 'Injecting unexpected oil spill on Route B...');

    setTimeout(async () => {
      // Inject closure incident on current route B
      await addIncident({
        title: 'Chemical Tanker Spill & Full Closure',
        locationName: 'Expressway Bypass Mile 2',
        lat: 17.4360,
        lng: 78.3980,
        severity: 'CRITICAL',
        delayPenaltyMinutes: 999,
        isClosure: true,
        description: 'Complete road closure. Route B impassable. Immediate emergency diversion necessary.'
      });

      // Recalculate routes with new closure
      await calculateAndRenderRoutes();

      // Trigger dynamic reroute on the moving ambulance to the new best route (Route C)
      if (state.activeEvaluation) {
        simulator.performDynamicReroute(state.activeEvaluation.bestRouteId, state.currentPatientOrigin);
      }
    }, 1600);
  });

  // Audio Siren Toggle
  btnToggleSiren.addEventListener('click', () => {
    const isMuted = window.EmergencyAudio.toggleMute();
    btnToggleSiren.innerText = isMuted ? '🔇 Siren Muted' : '🔊 Siren Live';
    btnToggleSiren.style.color = isMuted ? 'var(--text-muted)' : 'var(--accent-rose)';
  });

  // Lambda Slider Handler
  lambdaSlider.addEventListener('input', (e) => {
    state.lambdaPenalty = parseFloat(e.target.value);
    lambdaValDisplay.innerText = state.lambdaPenalty.toFixed(2);
    calculateAndRenderRoutes();
  });

  // Presentation Modal / Jury Mode
  btnOpenJury.addEventListener('click', () => {
    openJuryDeck();
  });

  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      juryModal.classList.remove('active');
      mlModal.classList.remove('active');
    });
  });

  function openJuryDeck() {
    const tabsContainer = document.getElementById('slide-tabs');
    const slideViewEl = document.getElementById('slide-view-container');
    tabsContainer.innerHTML = '';

    window.HACKATHON_SLIDES.forEach((slide, idx) => {
      const tab = document.createElement('button');
      tab.className = `slide-tab-btn ${idx === 0 ? 'active' : ''}`;
      tab.innerText = slide.navTitle;
      tab.addEventListener('click', () => {
        document.querySelectorAll('.slide-tab-btn').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderSlide(slide);
      });
      tabsContainer.appendChild(tab);
    });

    renderSlide(window.HACKATHON_SLIDES[0]);
    juryModal.classList.add('active');
  }

  function renderSlide(slide) {
    const slideViewEl = document.getElementById('slide-view-container');
    slideViewEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="badge-ai">${slide.badge}</span>
      </div>
      <h3 class="slide-title" style="margin-top: 8px;">${slide.title}</h3>
      <div style="font-size: 0.82rem; color: var(--text-dim); margin-bottom: 12px;">${slide.subtitle}</div>
      <div>${slide.content}</div>
    `;
  }

  // Machine Learning Interactive Module
  btnOpenMl.addEventListener('click', () => {
    mlModal.classList.add('active');
    fetchMlPrediction();
  });

  const mlHourInput = document.getElementById('ml-hour');
  const mlRainInput = document.getElementById('ml-rain');
  const mlIncidentInput = document.getElementById('ml-incident');

  [mlHourInput, mlRainInput, mlIncidentInput].forEach(inp => {
    if (inp) {
      inp.addEventListener('input', () => {
        fetchMlPrediction();
      });
    }
  });

  async function fetchMlPrediction() {
    const hour = parseInt(mlHourInput.value);
    const rain = parseFloat(mlRainInput.value);
    const inc = parseInt(mlIncidentInput.value);

    document.getElementById('ml-hour-val').innerText = `${hour}:00 hrs`;
    document.getElementById('ml-rain-val').innerText = rain > 1.2 ? 'Heavy Monsoon Rain' : (rain > 1.0 ? 'Light Drizzle' : 'Clear Skies');
    document.getElementById('ml-inc-val').innerText = inc === 2 ? 'Major Accident' : (inc === 1 ? 'Lane Restriction' : 'No Incident');

    try {
      const res = await fetch('/api/ml/predict-segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hourOfDay: hour,
          historicalBaseSpeed: 45,
          weatherIndex: rain,
          incidentLevel: inc
        })
      });

      const json = await res.json();
      if (!json.success) return;

      const p = json.prediction;
      document.getElementById('ml-pred-speed').innerText = `${p.predictedSpeedKmh} km/h`;
      document.getElementById('ml-pred-time').innerText = `${p.predictedTravelTime5kmMin} min`;

      // Render Feature Importance Bars
      const featList = document.getElementById('ml-feature-bars');
      featList.innerHTML = '';
      p.featureImportance.forEach(f => {
        const row = document.createElement('div');
        row.style.marginBottom = '8px';
        row.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: var(--text-muted); margin-bottom: 3px;">
            <span>${f.feature}</span>
            <span style="font-family: var(--font-mono); color: var(--accent-cyan);">${Math.round(f.importance * 100)}%</span>
          </div>
          <div style="background: rgba(255,255,255,0.06); height: 6px; border-radius: 3px; overflow: hidden;">
            <div style="background: linear-gradient(90deg, #10b981, #06b6d4); width: ${f.importance * 100}%; height: 100%;"></div>
          </div>
        `;
        featList.appendChild(row);
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Load everything
  await loadInitialData();
});
