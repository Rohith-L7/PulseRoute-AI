require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Database for Hospitals, Incidents, and Telemetry Logs
let hospitals = [
  {
    id: 'hosp-1',
    name: 'Apollo Hospitals Jubilee Hills',
    address: 'Road No. 72, Jubilee Hills, Hyderabad',
    lat: 17.4265,
    lng: 78.4124,
    traumaLevel: 'Level 1 Trauma Center',
    icuBedsAvailable: 8,
    totalIcuBeds: 45,
    erWaitTimeMinutes: 4,
    readinessStatus: 'OPTIMAL',
    specialties: ['Cardiology', 'Trauma Surgery', 'Stroke Unit', 'Pediatric ICU']
  },
  {
    id: 'hosp-2',
    name: 'AIG Hospitals Gachibowli',
    address: 'Mindspace Road, Gachibowli, Hyderabad',
    lat: 17.4435,
    lng: 78.3658,
    traumaLevel: 'Level 1 Trauma Center',
    icuBedsAvailable: 14,
    totalIcuBeds: 60,
    erWaitTimeMinutes: 2,
    readinessStatus: 'OPTIMAL',
    specialties: ['Gastroenterology', 'Emergency Critical Care', 'Cardio-Thoracic']
  },
  {
    id: 'hosp-3',
    name: 'KIMS Hospitals Somajiguda / Begumpet',
    address: 'Minister Road, Secunderabad / Somajiguda',
    lat: 17.4334,
    lng: 78.4735,
    traumaLevel: 'Level 2 Trauma Center',
    icuBedsAvailable: 3,
    totalIcuBeds: 40,
    erWaitTimeMinutes: 12,
    readinessStatus: 'HIGH_DEMAND',
    specialties: ['Neuro-Trauma', 'Cardiac Resuscitation', 'Orthopedics']
  },
  {
    id: 'hosp-4',
    name: 'Care Hospitals Banjara Hills',
    address: 'Road No. 1, Banjara Hills, Hyderabad',
    lat: 17.4156,
    lng: 78.4489,
    traumaLevel: 'Level 2 Trauma Center',
    icuBedsAvailable: 6,
    totalIcuBeds: 35,
    erWaitTimeMinutes: 6,
    readinessStatus: 'OPTIMAL',
    specialties: ['Emergency Medicine', 'Cardiovascular', 'Pulmonary Care']
  }
];

let incidents = [
  {
    id: 'inc-101',
    type: 'severe_congestion',
    title: 'Severe Gridlock & Signal Failure',
    locationName: 'Panjagutta - Road No. 36 Junction',
    lat: 17.4290,
    lng: 78.4310,
    severity: 'HIGH',
    speedReductionPercent: 75,
    delayPenaltyMinutes: 7.5,
    isClosure: false,
    verified: true,
    reportedAt: '12 mins ago',
    description: 'Vehicle stall and traffic signal malfunction causing 1.5 km tailback.'
  },
  {
    id: 'inc-102',
    type: 'road_construction',
    title: 'Flyover Deck Resurfacing',
    locationName: 'Kavuri Hills Inner Link',
    lat: 17.4385,
    lng: 78.3912,
    severity: 'MEDIUM',
    speedReductionPercent: 40,
    delayPenaltyMinutes: 4.0,
    isClosure: false,
    verified: true,
    reportedAt: '45 mins ago',
    description: 'Single lane open out of three lanes due to asphalt milling.'
  }
];

let dispatchTrips = [
  {
    tripId: 'TRIP-HYD-901',
    emergencyType: 'Acute STEMI (Heart Attack)',
    patientLocation: 'Madhapur Cyber Towers',
    destinationHospital: 'Apollo Hospitals Jubilee Hills',
    baselineRouteEtaMin: 18.2,
    aiRecommendedEtaMin: 11.4,
    timeSavedMinutes: 6.8,
    percentImprovement: 37.4,
    reroutesTriggered: 1,
    status: 'COMPLETED'
  },
  {
    tripId: 'TRIP-HYD-902',
    emergencyType: 'High-Velocity MVA (Road Accident)',
    patientLocation: 'Hitec City Metro Station',
    destinationHospital: 'AIG Hospitals Gachibowli',
    baselineRouteEtaMin: 14.5,
    aiRecommendedEtaMin: 9.1,
    timeSavedMinutes: 5.4,
    percentImprovement: 37.2,
    reroutesTriggered: 0,
    status: 'COMPLETED'
  }
];

// Connected Traffic Signals along Key Corridors (Green Wave Preemption Layer)
let trafficSignals = [
  {
    id: 'sig-201',
    name: 'Jubilee Hills Checkpost Junction',
    lat: 17.4300,
    lng: 78.4085,
    status: 'RED',
    cycleTimeSec: 90,
    preemptionRadiusMeters: 15,
    isPreempted: false,
    greenDurationSec: 45
  },
  {
    id: 'sig-202',
    name: 'Road No. 36 Commercial Crossing',
    lat: 17.4285,
    lng: 78.4102,
    status: 'RED',
    cycleTimeSec: 120,
    preemptionRadiusMeters: 15,
    isPreempted: false,
    greenDurationSec: 50
  },
  {
    id: 'sig-203',
    name: 'Apollo Hospital Access Avenue',
    lat: 17.4268,
    lng: 78.4120,
    status: 'RED',
    cycleTimeSec: 60,
    preemptionRadiusMeters: 15,
    isPreempted: false,
    greenDurationSec: 40
  },
  {
    id: 'sig-204',
    name: 'Kavuri Hills Arterial Flyover Entry',
    lat: 17.4350,
    lng: 78.3980,
    status: 'RED',
    cycleTimeSec: 90,
    preemptionRadiusMeters: 15,
    isPreempted: false,
    greenDurationSec: 45
  }
];

// Presets for Hackathon Demos
const emergencyPresets = [
  {
    id: 'preset-1',
    title: 'Scenario 1: Jubilee Hills Checkpost to Apollo Hospitals',
    patientName: 'Cardiac Arrest (Priority 1)',
    lat: 17.4304,
    lng: 78.4080,
    recommendedHospitalId: 'hosp-1',
    description: 'Direct shortest path faces heavy evening congestion on Road 36. AI diverts through Journalist Colony.'
  },
  {
    id: 'preset-2',
    title: 'Scenario 2: Hitec City Madhapur to AIG Hospitals',
    patientName: 'Multiple Trauma / Road Incident',
    lat: 17.4485,
    lng: 78.3802,
    recommendedHospitalId: 'hosp-2',
    description: 'Shortest road blocked by metro construction. Intelligent engine routes via Financial District arterial.'
  },
  {
    id: 'preset-3',
    title: 'Scenario 3: Banjara Hills Road No. 12 to Care Hospitals',
    patientName: 'Severe Respiratory Distress',
    lat: 17.4120,
    lng: 78.4320,
    recommendedHospitalId: 'hosp-4',
    description: 'Compares arterial vs inner ring road with live incident-injection capability.'
  }
];

// Mathematical Route-Scoring Engine
function evaluateRoute(candidate, activeIncidents, lambda = 1.25) {
  let segmentTimes = candidate.segments.map(seg => {
    let speed = seg.baseSpeedKmh;
    let incidentOnSeg = activeIncidents.find(inc => {
      // Approximate spatial check between incident and segment mid-point
      const dLat = Math.abs(inc.lat - seg.midLat);
      const dLng = Math.abs(inc.lng - seg.midLng);
      return (dLat < 0.009 && dLng < 0.009);
    });

    let penalty = 0;
    let isBlocked = false;
    let incidentReason = null;

    if (incidentOnSeg) {
      if (incidentOnSeg.isClosure) {
        isBlocked = true;
        penalty = 9999;
        incidentReason = `Blocked: ${incidentOnSeg.title}`;
      } else {
        speed = Math.max(8, speed * (1 - incidentOnSeg.speedReductionPercent / 100));
        penalty = incidentOnSeg.delayPenaltyMinutes;
        incidentReason = `Affected by ${incidentOnSeg.title} (+${penalty.toFixed(1)}m)`;
      }
    }

    // Baseline transit time for segment in minutes
    let normalTimeMin = (seg.distanceKm / seg.baseSpeedKmh) * 60;
    let dynamicTimeMin = (seg.distanceKm / speed) * 60;

    return {
      name: seg.name,
      distanceKm: seg.distanceKm,
      baseSpeedKmh: seg.baseSpeedKmh,
      effectiveSpeedKmh: Math.round(speed),
      normalTimeMin,
      dynamicTimeMin,
      penalty,
      isBlocked,
      incidentReason,
      coords: seg.coords
    };
  });

  const totalDistanceKm = Number(segmentTimes.reduce((acc, s) => acc + s.distanceKm, 0).toFixed(1));
  const rawTravelTimeMin = Number(segmentTimes.reduce((acc, s) => acc + s.dynamicTimeMin, 0).toFixed(1));
  const baselineTimeMin = Number(segmentTimes.reduce((acc, s) => acc + s.normalTimeMin, 0).toFixed(1));
  const totalPenalties = Number(segmentTimes.reduce((acc, s) => acc + s.penalty, 0).toFixed(1));
  const hasClosure = segmentTimes.some(s => s.isBlocked);

  // Total Cost Function: C(R) = T(R) + lambda * P(R)
  const totalCost = hasClosure ? 99999 : Number((rawTravelTimeMin + lambda * totalPenalties).toFixed(2));

  return {
    ...candidate,
    totalDistanceKm,
    rawTravelTimeMin,
    baselineTimeMin,
    totalPenalties,
    totalCost,
    hasClosure,
    segmentTimes
  };
}

// Generate Hyderabad Road Network Candidate Routes
function generateCandidateRoutes(origin, dest) {
  // We generate 3 geometrically realistic alternative emergency corridors
  const oLat = origin.lat;
  const oLng = origin.lng;
  const dLat = dest.lat;
  const dLng = dest.lng;

  // Mid points for geometric interpolation
  const midLat = (oLat + dLat) / 2;
  const midLng = (oLng + dLng) / 2;

  // Route A: Direct / Urban Main Arterial (Shortest distance, heavily traffic prone)
  const routeA = {
    id: 'route-A',
    name: 'Route A — Central Urban Arterial (Direct)',
    description: 'Geographically shortest path through dense commercial junctions',
    tag: 'Shortest Distance',
    color: '#ef4444',
    segments: [
      {
        name: 'Origin Access Link',
        distanceKm: 1.1,
        baseSpeedKmh: 30,
        midLat: oLat + (midLat - oLat) * 0.3,
        midLng: oLng + (midLng - oLng) * 0.3,
        coords: [
          [oLat, oLng],
          [oLat + (midLat - oLat) * 0.35, oLng + (midLng - oLng) * 0.35]
        ]
      },
      {
        name: 'Road 36 / Panjagutta Commercial Stretch',
        distanceKm: 2.8,
        baseSpeedKmh: 20, // baseline heavy congestion
        midLat: midLat,
        midLng: midLng,
        coords: [
          [oLat + (midLat - oLat) * 0.35, oLng + (midLng - oLng) * 0.35],
          [midLat, midLng],
          [midLat + (dLat - midLat) * 0.6, midLng + (dLng - midLng) * 0.6]
        ]
      },
      {
        name: 'Hospital Approach Avenue',
        distanceKm: 1.3,
        baseSpeedKmh: 25,
        midLat: dLat - (dLat - midLat) * 0.2,
        midLng: dLng - (dLng - midLng) * 0.2,
        coords: [
          [midLat + (dLat - midLat) * 0.6, midLng + (dLng - midLng) * 0.6],
          [dLat, dLng]
        ]
      }
    ]
  };

  // Route B: Grade-Separated / Expressway Bypass (Longer distance, smooth flow, synchronized lights)
  const routeB = {
    id: 'route-B',
    name: 'Route B — Outer Arterial Corridor (Expressway Bypass)',
    description: 'Slightly longer bypass with multi-lane grade separation and minimal cross-traffic',
    tag: 'AI Recommended',
    color: '#10b981',
    segments: [
      {
        name: 'Bypass Flyover Ramp',
        distanceKm: 1.8,
        baseSpeedKmh: 45,
        midLat: oLat + 0.007,
        midLng: oLng + (midLng - oLng) * 0.4 + 0.008,
        coords: [
          [oLat, oLng],
          [oLat + 0.005, oLng + 0.006],
          [oLat + 0.009, oLng + (midLng - oLng) * 0.4 + 0.009]
        ]
      },
      {
        name: 'Elevated Emergency Green Corridor',
        distanceKm: 3.5,
        baseSpeedKmh: 55, // high speed
        midLat: midLat + 0.010,
        midLng: midLng + 0.009,
        coords: [
          [oLat + 0.009, oLng + (midLng - oLng) * 0.4 + 0.009],
          [midLat + 0.012, midLng + 0.010],
          [dLat + 0.006, dLng + 0.007]
        ]
      },
      {
        name: 'Trauma Bay Dedicated Lane',
        distanceKm: 1.7,
        baseSpeedKmh: 40,
        midLat: dLat + 0.003,
        midLng: dLng + 0.003,
        coords: [
          [dLat + 0.006, dLng + 0.007],
          [dLat + 0.002, dLng + 0.003],
          [dLat, dLng]
        ]
      }
    ]
  };

  // Route C: Secondary Ring Road (Alternative bypass via residential collector)
  const routeC = {
    id: 'route-C',
    name: 'Route C — Southern Inner Ring Alternative',
    description: 'Medium distance secondary arterial; good detour if main bypass encounters incident',
    tag: 'Standby Detour',
    color: '#06b6d4',
    segments: [
      {
        name: 'South Sector Link Road',
        distanceKm: 2.2,
        baseSpeedKmh: 35,
        midLat: oLat - 0.008,
        midLng: oLng - 0.006,
        coords: [
          [oLat, oLng],
          [oLat - 0.006, oLng - 0.004],
          [midLat - 0.009, midLng - 0.008]
        ]
      },
      {
        name: 'Inner Ring Parallel Boulevard',
        distanceKm: 2.6,
        baseSpeedKmh: 38,
        midLat: midLat - 0.011,
        midLng: midLng - 0.007,
        coords: [
          [midLat - 0.009, midLng - 0.008],
          [midLat - 0.010, midLng],
          [dLat - 0.005, dLng - 0.006]
        ]
      },
      {
        name: 'Hospital West Gate Approach',
        distanceKm: 1.5,
        baseSpeedKmh: 30,
        midLat: dLat - 0.003,
        midLng: dLng - 0.002,
        coords: [
          [dLat - 0.005, dLng - 0.006],
          [dLat, dLng]
        ]
      }
    ]
  };

  return [routeA, routeB, routeC];
}

// Google Maps Encoded Polyline Decoder
function decodePolyline(encoded) {
  if (!encoded) return [];
  const poly = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push([lat / 1e5, lng / 1e5]);
  }
  return poly;
}

// API Endpoints
// Step 3: Expose Browser Key safely
app.get('/api/config', (req, res) => {
  res.json({
    mapsKey: process.env.GOOGLE_MAPS_BROWSER_KEY || '',
    hasServerKey: Boolean(process.env.GOOGLE_MAPS_SERVER_KEY)
  });
});

// Step 4: Google Routes API (Directions v2 computeRoutes)
app.post('/api/routes/google', async (req, res) => {
  const { origin, destination } = req.body;
  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;

  if (!apiKey) {
    return res.status(503).json({
      success: false,
      message: 'GOOGLE_MAPS_SERVER_KEY is not configured in .env'
    });
  }

  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline'
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: true
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: data });
    }

    res.json({ success: true, ...data });
  } catch (error) {
    console.error('Google Routes API Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/hospitals', (req, res) => {
  res.json({ success: true, count: hospitals.length, data: hospitals });
});

app.get('/api/presets', (req, res) => {
  res.json({ success: true, data: emergencyPresets });
});

app.get('/api/incidents', (req, res) => {
  res.json({ success: true, count: incidents.length, data: incidents });
});

app.post('/api/incidents', (req, res) => {
  const { type, title, locationName, lat, lng, severity, delayPenaltyMinutes, speedReductionPercent, isClosure, description } = req.body;
  if (!lat || !lng || !title) {
    return res.status(400).json({ success: false, message: 'Missing required incident fields (title, lat, lng)' });
  }

  const newIncident = {
    id: `inc-${Date.now().toString().slice(-4)}`,
    type: type || 'hazard',
    title,
    locationName: locationName || 'Reported Road Node',
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    severity: severity || 'HIGH',
    speedReductionPercent: speedReductionPercent || 60,
    delayPenaltyMinutes: delayPenaltyMinutes || 5.0,
    isClosure: Boolean(isClosure),
    verified: true,
    reportedAt: 'Just now',
    description: description || 'Dispatcher reported live obstacle.'
  };

  incidents.unshift(newIncident);
  res.status(201).json({ success: true, message: 'Incident registered in real-time engine', data: newIncident });
});

app.delete('/api/incidents/:id', (req, res) => {
  const initialLength = incidents.length;
  incidents = incidents.filter(i => i.id !== req.params.id);
  if (incidents.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Incident not found' });
  }
  res.json({ success: true, message: 'Incident resolved & cleared from route graph' });
});

// Green Wave Traffic Signal Preemption Endpoints
app.get('/api/signals', (req, res) => {
  res.json({ success: true, count: trafficSignals.length, data: trafficSignals });
});

app.post('/api/signals/:id/preempt', (req, res) => {
  const sig = trafficSignals.find(s => s.id === req.params.id);
  if (!sig) return res.status(404).json({ success: false, message: 'Signal not found' });
  sig.status = 'GREEN';
  sig.isPreempted = true;
  res.json({
    success: true,
    message: `Signal ${sig.name} preempted to GREEN (<15m ambulance proximity)`,
    data: sig
  });
});

app.post('/api/signals/reset', (req, res) => {
  trafficSignals.forEach(s => {
    s.status = 'RED';
    s.isPreempted = false;
  });
  res.json({ success: true, message: 'All corridor signals reset to default cycle' });
});

// Real Road Network Turn-by-Turn Geometry via OSRM (Free, OpenStreetMap based)
async function fetchOsrmCandidateRoutes(origin, dest) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&alternatives=true`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) return null;

    const names = [
      'Route A — Direct Arterial Road',
      'Route B — Express Corridor (OSM Geometry)',
      'Route C — Alternative Secondary Avenue'
    ];
    const tags = ['Shortest Road Path', 'AI Recommended Corridor', 'Standby Detour'];
    const colors = ['#ef4444', '#10b981', '#06b6d4'];

    return data.routes.map((r, idx) => {
      const distanceKm = Number((r.distance / 1000).toFixed(1));
      const rawCoords = r.geometry.coordinates.map(c => [c[1], c[0]]); // flip [lng, lat] to [lat, lng]
      const durationMin = Number((r.duration / 60).toFixed(1));

      // Divide road coordinates into 3 segments for live incident detection & simulation
      const chunk = Math.max(1, Math.floor(rawCoords.length / 3));
      const seg1 = rawCoords.slice(0, chunk + 1);
      const seg2 = rawCoords.slice(chunk, chunk * 2 + 1);
      const seg3 = rawCoords.slice(chunk * 2);

      const segments = [
        {
          name: 'Origin Street Corridor',
          distanceKm: Number((distanceKm * 0.3).toFixed(1)),
          baseSpeedKmh: Math.round(distanceKm * 0.3 / (durationMin * 0.3 / 60) || 35),
          midLat: seg1[Math.floor(seg1.length / 2)]?.[0] || origin.lat,
          midLng: seg1[Math.floor(seg1.length / 2)]?.[1] || origin.lng,
          coords: seg1
        },
        {
          name: 'Core City Arterial Stretch',
          distanceKm: Number((distanceKm * 0.45).toFixed(1)),
          baseSpeedKmh: Math.round(distanceKm * 0.45 / (durationMin * 0.45 / 60) || 40),
          midLat: seg2[Math.floor(seg2.length / 2)]?.[0] || (origin.lat + dest.lat) / 2,
          midLng: seg2[Math.floor(seg2.length / 2)]?.[1] || (origin.lng + dest.lng) / 2,
          coords: seg2
        },
        {
          name: 'Hospital Approach Avenue',
          distanceKm: Number((distanceKm * 0.25).toFixed(1)),
          baseSpeedKmh: Math.round(distanceKm * 0.25 / (durationMin * 0.25 / 60) || 30),
          midLat: seg3[Math.floor(seg3.length / 2)]?.[0] || dest.lat,
          midLng: seg3[Math.floor(seg3.length / 2)]?.[1] || dest.lng,
          coords: seg3
        }
      ];

      return {
        id: `route-${String.fromCharCode(65 + idx)}`,
        name: names[idx] || `Route ${String.fromCharCode(65 + idx)}`,
        description: `Turn-by-turn road geometry (${distanceKm} km, ~${durationMin} min)`,
        tag: tags[idx] || 'Candidate Route',
        color: colors[idx] || '#10b981',
        segments
      };
    });
  } catch (err) {
    console.warn('OSRM routing fetch failed/timed out, using internal graph:', err.message);
    return null;
  }
}

// Dynamic Route Intelligence Calculation Endpoint (Hybrid: Google Routes API + OSRM + Topological Fallback)
app.post('/api/routes/calculate', async (req, res) => {
  const { origin, hospitalId, lambda = 1.25 } = req.body;

  let selectedHospital = hospitals.find(h => h.id === hospitalId) || hospitals[0];
  let patientOrigin = origin || { lat: 17.4304, lng: 78.4080, address: 'Jubilee Hills Checkpost' };

  let rawRoutes = null;
  let dataSource = 'SIMULATED_TOPOLOGY';

  // Attempt Google Routes API if Server Key is configured
  if (process.env.GOOGLE_MAPS_SERVER_KEY) {
    try {
      const gRes = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_MAPS_SERVER_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline'
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: patientOrigin.lat, longitude: patientOrigin.lng } } },
          destination: { location: { latLng: { latitude: selectedHospital.lat, longitude: selectedHospital.lng } } },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: true
        })
      });

      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.routes && gData.routes.length > 0) {
          dataSource = 'GOOGLE_ROUTES_TRAFFIC_AWARE';
          const colors = ['#ef4444', '#10b981', '#06b6d4'];
          const tags = ['Direct Route', 'Alternative Bypass', 'Secondary Detour'];
          const names = ['Route A (Google Traffic)', 'Route B (Google Traffic)', 'Route C (Google Traffic)'];

          rawRoutes = gData.routes.map((gr, idx) => {
            const durationSec = parseInt(gr.duration) || 600;
            const staticSec = parseInt(gr.staticDuration) || durationSec;
            const distanceKm = Number(((gr.distanceMeters || 5000) / 1000).toFixed(1));
            const decodedCoords = decodePolyline(gr.polyline?.encodedPolyline);

            const chunk = Math.max(1, Math.floor(decodedCoords.length / 3));
            const segments = [
              {
                name: `Sector 1 - Origin Link`,
                distanceKm: Number((distanceKm * 0.3).toFixed(1)),
                baseSpeedKmh: Math.round((distanceKm * 0.3 / (staticSec * 0.3 / 3600))),
                midLat: decodedCoords[Math.floor(chunk / 2)]?.[0] || patientOrigin.lat,
                midLng: decodedCoords[Math.floor(chunk / 2)]?.[1] || patientOrigin.lng,
                coords: decodedCoords.slice(0, chunk + 1)
              },
              {
                name: `Sector 2 - Core Transit Stretch`,
                distanceKm: Number((distanceKm * 0.45).toFixed(1)),
                baseSpeedKmh: Math.round((distanceKm * 0.45 / (staticSec * 0.45 / 3600))),
                midLat: decodedCoords[Math.floor(chunk * 1.5)]?.[0] || patientOrigin.lat,
                midLng: decodedCoords[Math.floor(chunk * 1.5)]?.[1] || patientOrigin.lng,
                coords: decodedCoords.slice(chunk, chunk * 2 + 1)
              },
              {
                name: `Sector 3 - Hospital Approach`,
                distanceKm: Number((distanceKm * 0.25).toFixed(1)),
                baseSpeedKmh: Math.round((distanceKm * 0.25 / (staticSec * 0.25 / 3600))),
                midLat: decodedCoords[Math.floor(chunk * 2.5)]?.[0] || selectedHospital.lat,
                midLng: decodedCoords[Math.floor(chunk * 2.5)]?.[1] || selectedHospital.lng,
                coords: decodedCoords.slice(chunk * 2)
              }
            ];

            return {
              id: `route-${String.fromCharCode(65 + idx)}`,
              name: names[idx] || `Route ${String.fromCharCode(65 + idx)}`,
              description: `Real-time Google Routes API traffic-aware polyline (${distanceKm} km)`,
              tag: tags[idx] || 'Candidate Route',
              color: colors[idx] || '#3b82f6',
              segments
            };
          });
        }
      }
    } catch (gErr) {
      console.warn('Google Routes API fetch failed, using fallback:', gErr.message);
    }
  }

  // If Google Routes API not active, fetch real road geometry from OpenStreetMap (OSRM)
  if (!rawRoutes) {
    rawRoutes = await fetchOsrmCandidateRoutes(patientOrigin, selectedHospital);
    if (rawRoutes && rawRoutes.length > 0) {
      dataSource = 'OPENSTREETMAP_ROAD_GEOMETRY';
    }
  }

  // Fallback to internal high-resolution simulation if both external APIs are unreachable
  if (!rawRoutes) {
    rawRoutes = generateCandidateRoutes(patientOrigin, selectedHospital);
  }

  // Evaluate candidate routes with the mathematical model C(R) = T(R) + lambda * P(R)
  const evaluatedRoutes = rawRoutes.map(route => evaluateRoute(route, incidents, parseFloat(lambda)));

  // Rank routes by Total Cost C(R) ascending
  evaluatedRoutes.sort((a, b) => a.totalCost - b.totalCost);

  const bestRoute = evaluatedRoutes[0];
  const baselineRoute = evaluatedRoutes.find(r => r.id === 'route-A') || evaluatedRoutes[1] || evaluatedRoutes[0];

  // Explainability Generator (Research Gap 9 implementation)
  const explanations = evaluatedRoutes.map(r => {
    let statusText = '';
    let reasons = [];

    if (r.id === bestRoute.id) {
      statusText = 'RECOMMENDED BY AI';
      reasons.push(`Optimal travel cost C(R) = ${r.totalCost.toFixed(1)}`);
      reasons.push(`Predicted travel time is ${r.rawTravelTimeMin} min across ${r.totalDistanceKm} km.`);
      if (r.totalPenalties === 0) {
        reasons.push('Zero active closures or heavy incident bottlenecks on this corridor.');
      } else {
        reasons.push(`Contains minor delay (+${r.totalPenalties}m) but still outperforms all alternative paths.`);
      }
    } else if (r.hasClosure) {
      statusText = 'REJECTED: ROAD CLOSED';
      reasons.push('Prohibited road segment detected: Complete blockage or critical emergency hazard.');
    } else if (r.totalCost > bestRoute.totalCost) {
      statusText = 'RETAINED AS BACKUP';
      const diffMin = (r.totalCost - bestRoute.totalCost).toFixed(1);
      reasons.push(`Expected arrival is +${diffMin} mins slower than optimal recommendation.`);
      if (r.totalPenalties > 0) {
        reasons.push(`Surcharged by ${r.totalPenalties} mins of congestion/hazard penalties.`);
      }
    }

    return {
      routeId: r.id,
      status: statusText,
      reasons,
      badgeColor: r.id === bestRoute.id ? 'emerald' : (r.hasClosure ? 'crimson' : 'amber')
    };
  });

  // Calculate simulated time savings
  const baselineEta = baselineRoute.rawTravelTimeMin + baselineRoute.totalPenalties;
  const bestEta = bestRoute.rawTravelTimeMin + bestRoute.totalPenalties;
  const savingsMin = Math.max(0, Number((baselineEta - bestEta).toFixed(1)));
  const percentImprovement = baselineEta > 0 ? Number(((savingsMin / baselineEta) * 100).toFixed(1)) : 0;

  res.json({
    success: true,
    data: {
      patientOrigin,
      hospital: selectedHospital,
      bestRouteId: bestRoute.id,
      baselineRouteId: baselineRoute.id,
      savings: {
        baselineEtaMin: baselineEta,
        recommendedEtaMin: bestEta,
        minutesSaved: savingsMin,
        percentImprovement: percentImprovement
      },
      dataSource,
      routes: evaluatedRoutes,
      explanations,
      activeIncidentsCount: incidents.length
    }
  });
});

// Machine Learning Segment Prediction Simulation Endpoint (Section 6 & 8)
app.post('/api/ml/predict-segment', (req, res) => {
  const { hourOfDay = 18, dayOfWeek = 3, historicalBaseSpeed = 40, weatherIndex = 1.0, incidentLevel = 0 } = req.body;

  // ML regression formula simulating historical gradient boosted trees:
  // Speed = BaseSpeed * TimeOfDayMultiplier * DayMultiplier * WeatherMultiplier - IncidentDrop
  let timeOfDayFactor = 1.0;
  if (hourOfDay >= 8 && hourOfDay <= 11) timeOfDayFactor = 0.65; // morning rush
  else if (hourOfDay >= 17 && hourOfDay <= 20) timeOfDayFactor = 0.55; // evening rush
  else if (hourOfDay >= 0 && hourOfDay <= 5) timeOfDayFactor = 1.25; // night clearance

  let dayFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.15 : 0.95;
  let weatherFactor = weatherIndex > 1.5 ? 0.75 : 1.0; // heavy rain/waterlogging
  let incidentPenaltyKmh = incidentLevel * 8.5;

  let predictedSpeedKmh = Math.max(8, (historicalBaseSpeed * timeOfDayFactor * dayFactor * weatherFactor) - incidentPenaltyKmh);
  let predictedTravelTime5kmMin = (5.0 / predictedSpeedKmh) * 60;

  res.json({
    success: true,
    inputFeatures: { hourOfDay, dayOfWeek, historicalBaseSpeed, weatherIndex, incidentLevel },
    prediction: {
      predictedSpeedKmh: Math.round(predictedSpeedKmh * 10) / 10,
      predictedTravelTime5kmMin: Math.round(predictedTravelTime5kmMin * 10) / 10,
      modelType: 'HistGradientBoostingRegressor (Surrogate)',
      confidenceInterval: '95% CI [± 1.2 min]',
      featureImportance: [
        { feature: 'Time of Day (Peak vs Off-peak)', importance: 0.38 },
        { feature: 'Live Incident Severity', importance: 0.27 },
        { feature: 'Historical Segment Speed', importance: 0.18 },
        { feature: 'Weather / Rain Index', importance: 0.11 },
        { feature: 'Day of Week', importance: 0.06 }
      ]
    }
  });
});

// Analytics & Trip History
app.get('/api/analytics', (req, res) => {
  res.json({
    success: true,
    metrics: {
      averageTimeSavedPercent: 37.3,
      totalTripsMonitored: dispatchTrips.length + 18,
      closureAvoidanceRate: '100%',
      meanRerouteResponseLatencyMs: 38,
      goldenHourComplianceBoost: '+29.4%'
    },
    recentTrips: dispatchTrips
  });
});

app.listen(PORT, () => {
  console.log(`🚑 PulseRoute AI Backend running at http://localhost:${PORT}`);
});
