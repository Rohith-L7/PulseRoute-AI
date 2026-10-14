// Client-side Leaflet Map & Ambulance Simulation Engine
class AmbulanceRouteSimulator {
  constructor(mapContainerId) {
    this.mapContainerId = mapContainerId;
    this.map = null;
    this.routePolylines = {};
    this.hospitalMarkers = [];
    this.incidentMarkers = [];
    this.patientMarker = null;
    this.ambulanceMarker = null;
    
    this.activeRoute = null;
    this.allRoutes = [];
    this.simulationState = {
      isRunning: false,
      isPaused: false,
      progressIndex: 0,
      totalPoints: 0,
      speedMultiplier: 2.0,
      currentSpeedKmh: 45,
      intervalId: null,
      interpolatedPath: [],
      currentRouteId: null
    };

    this.onProgressUpdate = null;
    this.onRerouteOccurred = null;
    this.onSignalPreempted = null;
    this.trafficSignals = [];
    this.signalMarkers = {};
  }

  initMap(center = [17.4300, 78.4100], zoom = 13) {
    if (this.map) return;

    this.map = L.map(this.mapContainerId, {
      zoomControl: false,
      attributionControl: false
    }).setView(center, zoom);

    // Add Leaflet zoom control on bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // OpenStreetMap tile layer (reliable, no API key required)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Handle map clicks to place custom incident
    this.map.on('click', (e) => {
      if (window.onMapLocationSelected) {
        window.onMapLocationSelected(e.latlng);
      }
    });
  }

  renderHospitals(hospitals, onSelectHospital) {
    // Clear previous markers
    this.hospitalMarkers.forEach(m => this.map.removeLayer(m));
    this.hospitalMarkers = [];

    hospitals.forEach(hosp => {
      const icon = L.divIcon({
        className: 'custom-hosp-marker',
        html: `
          <div style="background: rgba(6, 182, 212, 0.9); border: 2px solid #ffffff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(6, 182, 212, 0.7); cursor: pointer;">
            <span style="color: white; font-weight: 800; font-size: 16px;">H</span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = L.marker([hosp.lat, hosp.lng], { icon }).addTo(this.map);
      marker.bindTooltip(`<strong>${hosp.name}</strong><br><span style="color: #10b981;">ICU Beds: ${hosp.icuBedsAvailable}</span>`, {
        direction: 'top',
        className: 'dark-tooltip'
      });

      marker.on('click', () => {
        if (onSelectHospital) onSelectHospital(hosp.id);
      });

      this.hospitalMarkers.push(marker);
    });
  }

  renderPatient(patient) {
    if (this.patientMarker) this.map.removeLayer(this.patientMarker);

    const icon = L.divIcon({
      className: 'patient-marker',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div class="ambulance-pulse-ring" style="border-color: #f43f5e; width: 44px; height: 44px; top: -5px; left: -5px;"></div>
          <div style="background: #f43f5e; width: 26px; height: 26px; border-radius: 50%; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(244, 63, 94, 0.8);">
            <span style="color: white; font-size: 13px;">🚨</span>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    this.patientMarker = L.marker([patient.lat, patient.lng], { icon }).addTo(this.map);
    this.patientMarker.bindTooltip(`<strong>Emergency: ${patient.address || 'Patient Scene'}</strong>`, { direction: 'top' });
  }

  renderIncidents(incidents, onRemoveIncident) {
    this.incidentMarkers.forEach(m => this.map.removeLayer(m));
    this.incidentMarkers = [];

    incidents.forEach(inc => {
      const color = inc.isClosure ? '#ef4444' : '#f59e0b';
      const symbol = inc.isClosure ? '⛔' : '⚠️';
      const icon = L.divIcon({
        className: 'incident-marker-icon',
        html: `
          <div style="background: ${color}; width: 28px; height: 28px; border-radius: 6px; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px ${color}; font-size: 14px; cursor: pointer;">
            ${symbol}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([inc.lat, inc.lng], { icon }).addTo(this.map);
      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 170px;">
          <h4 style="margin: 0 0 4px 0; color: ${color}; font-size: 13px;">${inc.title}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #475569;">${inc.description}</p>
          <div style="font-size: 11px; margin-bottom: 8px;"><strong>Delay Penalty:</strong> +${inc.delayPenaltyMinutes} min</div>
          <button id="del-inc-${inc.id}" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Clear Incident</button>
        </div>
      `);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`del-inc-${inc.id}`);
        if (btn) {
          btn.addEventListener('click', () => {
            if (onRemoveIncident) onRemoveIncident(inc.id);
          });
        }
      });

      this.incidentMarkers.push(marker);
    });
  }

  // Render Smart Connected Traffic Signals on Map
  renderTrafficSignals(signals) {
    Object.values(this.signalMarkers).forEach(m => this.map.removeLayer(m));
    this.signalMarkers = {};
    this.trafficSignals = signals.map(s => ({ ...s }));

    this.trafficSignals.forEach(sig => {
      const isGreen = (sig.status === 'GREEN');
      const icon = L.divIcon({
        className: 'traffic-signal-marker',
        html: `
          <div id="signal-box-${sig.id}" style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div id="signal-pulse-${sig.id}" class="signal-green-pulse" style="display: ${isGreen ? 'block' : 'none'};"></div>
            <div style="background: #0f172a; border: 2px solid ${isGreen ? '#10b981' : '#475569'}; border-radius: 8px; padding: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 4px; align-items: center; width: 22px;">
              <div id="sig-red-${sig.id}" style="width: 12px; height: 12px; border-radius: 50%; background: ${isGreen ? '#331111' : '#ef4444'}; box-shadow: ${isGreen ? 'none' : '0 0 10px #ef4444'}; transition: all 0.3s ease;"></div>
              <div id="sig-green-${sig.id}" style="width: 12px; height: 12px; border-radius: 50%; background: ${isGreen ? '#10b981' : '#052e16'}; box-shadow: ${isGreen ? '0 0 14px #10b981' : 'none'}; transition: all 0.3s ease;"></div>
            </div>
            <div style="width: 4px; height: 8px; background: #64748b;"></div>
            <div id="sig-tag-${sig.id}" style="background: ${isGreen ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)'}; color: #ffffff; font-size: 9px; font-weight: 800; padding: 1px 4px; border-radius: 3px; margin-top: 1px; white-space: nowrap; font-family: sans-serif;">
              ${isGreen ? 'GREEN' : 'RED'}
            </div>
          </div>
        `,
        iconSize: [28, 48],
        iconAnchor: [14, 40]
      });

      const marker = L.marker([sig.lat, sig.lng], { icon, zIndexOffset: 800 }).addTo(this.map);
      marker.bindTooltip(`<strong>🚦 ${sig.name}</strong><br><span id="tip-state-${sig.id}">${isGreen ? '🟢 Green Wave Active' : '🔴 Red Signal (Auto-preempts at <15m)'}</span>`, {
        direction: 'top',
        className: 'dark-tooltip'
      });

      this.signalMarkers[sig.id] = marker;
    });
  }

  // Update Visual State of Signal Marker on Map
  updateSignalMarkerVisual(sigId, isGreen) {
    const redEl = document.getElementById(`sig-red-${sigId}`);
    const greenEl = document.getElementById(`sig-green-${sigId}`);
    const tagEl = document.getElementById(`sig-tag-${sigId}`);
    const pulseEl = document.getElementById(`signal-pulse-${sigId}`);
    const boxEl = document.getElementById(`signal-box-${sigId}`);
    const tipEl = document.getElementById(`tip-state-${sigId}`);

    if (redEl && greenEl && tagEl) {
      redEl.style.background = isGreen ? '#331111' : '#ef4444';
      redEl.style.boxShadow = isGreen ? 'none' : '0 0 10px #ef4444';
      greenEl.style.background = isGreen ? '#10b981' : '#052e16';
      greenEl.style.boxShadow = isGreen ? '0 0 16px #10b981' : 'none';
      tagEl.style.background = isGreen ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)';
      tagEl.innerText = isGreen ? 'GREEN' : 'RED';
      if (boxEl) {
        boxEl.style.borderColor = isGreen ? '#10b981' : '#475569';
      }
      if (pulseEl) {
        pulseEl.style.display = isGreen ? 'block' : 'none';
      }
      if (tipEl) {
        tipEl.innerHTML = isGreen ? '🟢 Green Wave Active (Preempted)' : '🔴 Red Signal';
      }
    }
  }

  // Reset all signals back to RED
  resetTrafficSignals() {
    this.trafficSignals.forEach(sig => {
      sig.status = 'RED';
      sig.isPreempted = false;
      this.updateSignalMarkerVisual(sig.id, false);
    });
  }

  // Calculate distance between two coordinate pairs in meters (Haversine formula)
  computeDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  renderRoutes(routes, recommendedId) {
    this.allRoutes = routes;

    // Clear old route lines
    Object.values(this.routePolylines).forEach(poly => this.map.removeLayer(poly));
    this.routePolylines = {};

    routes.forEach(r => {
      // Collect all coordinates across segments
      let coords = [];
      r.segments.forEach(seg => {
        coords.push(...seg.coords);
      });

      const isRecommended = (r.id === recommendedId);
      const isRejected = r.hasClosure;

      let style = {
        color: isRecommended ? '#10b981' : (isRejected ? '#ef4444' : '#06b6d4'),
        weight: isRecommended ? 6 : 4,
        opacity: isRecommended ? 0.95 : (isRejected ? 0.45 : 0.65),
        dashArray: isRejected ? '6, 8' : null,
        lineCap: 'round',
        lineJoin: 'round'
      };

      const polyline = L.polyline(coords, style).addTo(this.map);
      this.routePolylines[r.id] = polyline;

      polyline.on('click', () => {
        if (window.onSelectRouteCard) window.onSelectRouteCard(r.id);
      });
    });

    // Zoom map to fit recommended route
    const recRoute = routes.find(r => r.id === recommendedId) || routes[0];
    if (recRoute && this.routePolylines[recRoute.id]) {
      this.map.fitBounds(this.routePolylines[recRoute.id].getBounds(), { padding: [50, 50] });
    }
  }

  // Smoothly interpolate points for fluid vehicle animation
  interpolatePoints(coords, steps = 180) {
    if (coords.length < 2) return coords;
    let points = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const segSteps = Math.max(10, Math.floor(steps / (coords.length - 1)));
      for (let s = 0; s <= segSteps; s++) {
        const ratio = s / segSteps;
        const lat = p1[0] + (p2[0] - p1[0]) * ratio;
        const lng = p1[1] + (p2[1] - p1[1]) * ratio;
        points.push([lat, lng]);
      }
    }
    return points;
  }

  // Calculate bearing angle for ambulance rotation
  calculateHeading(p1, p2) {
    const dLng = (p2[1] - p1[1]) * Math.PI / 180;
    const lat1 = p1[0] * Math.PI / 180;
    const lat2 = p2[0] * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  }

  startAmbulanceSimulation(routeId) {
    const route = this.allRoutes.find(r => r.id === routeId);
    if (!route) return;

    this.stopAmbulanceSimulation();
    this.resetTrafficSignals();

    // Flatten route coords
    let rawCoords = [];
    route.segments.forEach(seg => {
      rawCoords.push(...seg.coords);
    });

    this.simulationState.interpolatedPath = this.interpolatePoints(rawCoords, 220);
    this.simulationState.totalPoints = this.simulationState.interpolatedPath.length;
    this.simulationState.progressIndex = 0;
    this.simulationState.currentRouteId = routeId;
    this.simulationState.isRunning = true;
    this.simulationState.isPaused = false;

    // Create Ambulance Marker if not exists
    const initialPos = this.simulationState.interpolatedPath[0];
    this.createOrMoveAmbulanceMarker(initialPos, 0);

    // Audio siren
    window.EmergencyAudio.startSiren();

    // Simulation loop
    const stepInterval = Math.round(100 / this.simulationState.speedMultiplier);
    this.simulationState.intervalId = setInterval(() => {
      this.stepSimulation();
    }, stepInterval);
  }

  createOrMoveAmbulanceMarker(latlng, headingDeg = 0) {
    if (!this.ambulanceMarker) {
      const icon = L.divIcon({
        className: 'custom-ambulance-icon',
        html: `
          <div id="ambulance-sprite" style="position: relative; width: 36px; height: 36px; transform: rotate(${headingDeg}deg); transition: transform 0.15s ease;">
            <div class="ambulance-pulse-ring" style="top: -7px; left: -7px;"></div>
            <div style="background: #ffffff; border: 2px solid #ef4444; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(239, 68, 68, 0.8);">
              <span style="font-size: 18px;">🚑</span>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      this.ambulanceMarker = L.marker(latlng, { icon, zIndexOffset: 1000 }).addTo(this.map);
    } else {
      this.ambulanceMarker.setLatLng(latlng);
      const sprite = document.getElementById('ambulance-sprite');
      if (sprite) {
        sprite.style.transform = `rotate(${headingDeg}deg)`;
      }
    }
  }

  stepSimulation() {
    if (!this.simulationState.isRunning || this.simulationState.isPaused) return;

    const idx = this.simulationState.progressIndex;
    const total = this.simulationState.totalPoints;
    const path = this.simulationState.interpolatedPath;

    if (idx >= total - 1) {
      // Completed Trip!
      this.completeSimulation();
      return;
    }

    const currentPos = path[idx];
    const nextPos = path[idx + 1];
    const heading = this.calculateHeading(currentPos, nextPos);

    this.createOrMoveAmbulanceMarker(currentPos, heading);

    // REAL-TIME SIGNAL DETECTION (< 15-25m proximity preemption)
    this.trafficSignals.forEach(sig => {
      const distMeters = this.computeDistanceMeters(currentPos[0], currentPos[1], sig.lat, sig.lng);
      if (distMeters <= 35 && sig.status === 'RED') {
        sig.status = 'GREEN';
        sig.isPreempted = true;
        this.updateSignalMarkerVisual(sig.id, true);

        if (window.EmergencyAudio) {
          window.EmergencyAudio.playDispatchChime();
        }

        if (this.onSignalPreempted) {
          this.onSignalPreempted({
            signal: sig,
            distanceMeters: Math.round(distMeters)
          });
        }
      }
    });

    // Calculate dynamic speed and remaining distance
    const progressPercent = (idx / total);
    const activeRoute = this.allRoutes.find(r => r.id === this.simulationState.currentRouteId);
    const totalDist = activeRoute ? activeRoute.totalDistanceKm : 6.0;
    const remainingKm = Math.max(0.1, Number((totalDist * (1 - progressPercent)).toFixed(1)));
    
    // Fluctuating realistic emergency speed between 40 - 68 km/h
    const currentSpeed = Math.round(48 + Math.sin(idx * 0.1) * 12);
    this.simulationState.currentSpeedKmh = currentSpeed;

    const remainingEtaMin = Number(((remainingKm / currentSpeed) * 60).toFixed(1));

    if (this.onProgressUpdate) {
      this.onProgressUpdate({
        progressPercent: Math.round(progressPercent * 100),
        remainingKm,
        remainingEtaMin,
        currentSpeedKmh: currentSpeed,
        currentLatLng: currentPos
      });
    }

    this.simulationState.progressIndex++;
  }

  // Dynamic Rerouting Transition while Ambulance is moving!
  performDynamicReroute(newRouteId, destination) {
    if (!this.simulationState.isRunning) {
      this.startAmbulanceSimulation(newRouteId);
      return;
    }

    const currentAmbulancePos = this.ambulanceMarker.getLatLng();
    const newRoute = this.allRoutes.find(r => r.id === newRouteId);
    if (!newRoute) return;

    // Visual Alert: Flash siren and sound alert
    window.EmergencyAudio.playRerouteAlert();

    // Splice current ambulance position to remaining segments of new route
    let newCoords = [[currentAmbulancePos.lat, currentAmbulancePos.lng]];
    newRoute.segments.forEach(seg => {
      newCoords.push(...seg.coords);
    });

    // Re-interpolate from current vehicle position
    this.simulationState.interpolatedPath = this.interpolatePoints(newCoords, 160);
    this.simulationState.totalPoints = this.simulationState.interpolatedPath.length;
    this.simulationState.progressIndex = 0;
    this.simulationState.currentRouteId = newRouteId;

    // Highlight new route
    this.renderRoutes(this.allRoutes, newRouteId);

    if (this.onRerouteOccurred) {
      this.onRerouteOccurred(newRoute);
    }
  }

  pauseSimulation() {
    this.simulationState.isPaused = !this.simulationState.isPaused;
    return this.simulationState.isPaused;
  }

  stopAmbulanceSimulation() {
    this.simulationState.isRunning = false;
    if (this.simulationState.intervalId) {
      clearInterval(this.simulationState.intervalId);
      this.simulationState.intervalId = null;
    }
    window.EmergencyAudio.stopSiren();
  }

  completeSimulation() {
    this.stopAmbulanceSimulation();
    if (this.onProgressUpdate) {
      this.onProgressUpdate({
        progressPercent: 100,
        remainingKm: 0.0,
        remainingEtaMin: 0.0,
        currentSpeedKmh: 0,
        completed: true
      });
    }
  }
}

window.AmbulanceRouteSimulator = AmbulanceRouteSimulator;
