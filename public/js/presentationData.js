// Hackathon Jury Presentation Slides & Reference Dataset
window.HACKATHON_SLIDES = [
  {
    id: 'slide-1',
    navTitle: '1. Problem & SDGs',
    title: 'AI-Based Ambulance Route Intelligence',
    subtitle: 'Dynamic Emergency Navigation Using Traffic & Road-Condition Analysis',
    badge: 'SDG 3 & SDG 11 Aligned',
    content: `
      <div class="slide-grid">
        <div class="slide-card">
          <h4>🚨 The Critical Emergency Gap</h4>
          <p>In life-threatening emergencies (Acute STEMI, Stroke, Severe Trauma), every 60 seconds delay increases mortality risk by 7–10%. Conventional navigation apps optimize for <em>distance</em> or <em>general consumer flow</em>, failing to factor ambulance-specific constraints, dynamic road closures, and signal bottlenecks.</p>
        </div>
        <div class="slide-card">
          <h4>🎯 Sustainable Development Goals</h4>
          <p><strong>SDG 3: Good Health & Well-Being:</strong> Minimizing avoidable transit delays to preserve the "Golden Hour" in emergency medicine.<br><br>
          <strong>SDG 11: Sustainable Cities & Communities:</strong> Fostering intelligent emergency green-corridor planning on urban road networks.</p>
        </div>
      </div>
    `
  },
  {
    id: 'slide-2',
    navTitle: '2. The Core Paradox',
    title: 'Why Geographically Shortest Road Fails',
    subtitle: 'Case Study: The 5km vs 7km Dilemma',
    badge: 'Real-world Paradox',
    content: `
      <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; margin-bottom: 14px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-dim);">
              <th style="padding: 6px;">Corridor</th>
              <th>Distance</th>
              <th>Est. Time</th>
              <th>Road Condition</th>
              <th>AI Decision</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); color: #f87171;">
              <td style="padding: 8px 6px; font-weight: 700;">Route A (Direct)</td>
              <td>5.0 km</td>
              <td>18.0 min</td>
              <td>Heavy Urban Congestion</td>
              <td>❌ REJECTED (High Delay)</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); color: #34d399;">
              <td style="padding: 8px 6px; font-weight: 700;">Route B (Bypass)</td>
              <td>7.0 km</td>
              <td>11.0 min</td>
              <td>Moderate Traffic (Grade Separated)</td>
              <td>✅ RECOMMENDED (+38.9% Faster)</td>
            </tr>
            <tr style="color: #38bdf8;">
              <td style="padding: 8px 6px; font-weight: 700;">Route C (Ring Link)</td>
              <td>6.0 km</td>
              <td>15.0 min</td>
              <td>Road Construction</td>
              <td>⚠️ STANDBY DETOUR</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="slide-card">
        <h4>💡 The Guiding Principle</h4>
        <p>The system prioritizes <strong>survival time and corridor accessibility</strong> rather than shortest Euclidean or road distance. A longer bypass moving at 55 km/h beats a gridlocked direct avenue moving at 12 km/h every single time.</p>
      </div>
    `
  },
  {
    id: 'slide-3',
    navTitle: '3. Math Formulation',
    title: 'Route-Selection Optimization Algorithm',
    subtitle: 'Graph Theory & Risk-Weighted Cost Minimization',
    badge: 'Formal Algorithm',
    content: `
      <div class="slide-grid">
        <div class="slide-card">
          <h4>📐 Graph Definition</h4>
          <p>The road network is represented as a directed multigraph $G = (V, E)$, where $V$ represents intersections & emergency facilities, and $E$ represents road links with length $d_e$ and time $t_e$.</p>
          <div class="formula-display" style="margin-top: 10px;">
            Total Transit Time: T(R) = &Sigma;<sub>e &isin; R</sub> t<sub>e</sub>
          </div>
        </div>
        <div class="slide-card">
          <h4>⚖️ Penalty-Augmented Objective Cost</h4>
          <p>To guard against verified road hazards, lane closures, and signal volatility, we incorporate penalty function $P(R)$ weighted by sensitivity hyperparameter $\lambda$ (default 1.25):</p>
          <div class="formula-display" style="margin-top: 10px;">
            C(R) = T(R) + &lambda; &middot; P(R)<br>
            R* = arg min<sub>R &isin; &Rscr;</sub> C(R)
          </div>
          <p style="font-size: 0.72rem; margin-top: 6px; color: var(--text-dim);">Confirmed closures apply edge cost $t_e = \infty$, strictly enforcing zero-closure violations.</p>
        </div>
      </div>
    `
  },
  {
    id: 'slide-4',
    navTitle: '4. Where is the AI?',
    title: 'Stage-Based Intelligence Architecture',
    subtitle: 'From Heuristic Optimization to Deep Machine Learning',
    badge: 'AI Justification',
    content: `
      <div class="slide-grid">
        <div class="slide-card">
          <h4>Stage 1: Dynamic Route Scoring</h4>
          <p>Real-time edge re-weighting using verified traffic speeds, signal delays, and incident penalties, running on Dijkstra/A* topological graph traversal.</p>
        </div>
        <div class="slide-card">
          <h4>Stage 2: ML Travel-Time Prediction</h4>
          <p>Gradient-boosted regression trained on historical segment features: <code>Time_Of_Day</code>, <code>Day_Of_Week</code>, <code>Weather_Index</code>, and <code>Historical_Speeds</code>.</p>
        </div>
        <div class="slide-card">
          <h4>Stage 3: Dynamic Threshold Rerouting</h4>
          <p>Calculates switching delta $\Delta C = C(R_{curr}) - C(R_{alt})$. Only triggers vehicle reroute if $\Delta C > \tau$ (1.5 min), suppressing erratic route fluttering.</p>
        </div>
        <div class="slide-card">
          <h4>Stage 4: Explainable Decision AI</h4>
          <p>Transforms raw mathematical vectors into clear verbal justifications for dispatchers (e.g. "Panjagutta flyover stalled; diverted via Outer Arterial").</p>
        </div>
      </div>
    `
  },
  {
    id: 'slide-5',
    navTitle: '5. Jury Q&A Defense',
    title: 'Answers to Tough Evaluation Questions',
    subtitle: 'Direct Answers to Expected Jury Inquiries',
    badge: 'Hackathon Defense',
    content: `
      <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.8rem;">
        <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; border-left: 3px solid var(--accent-emerald);">
          <strong>Q: Why not just use Google Maps?</strong><br>
          <span style="color: var(--text-muted);">A: Google Maps is consumer-centric and doesn't support hospital ICU readiness awareness, custom incident-penalty threshold tuning ($\lambda$), automated emergency dispatch handshakes, or explainable delay breakdowns.</span>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; border-left: 3px solid var(--accent-cyan);">
          <strong>Q: How do you prove this improves transit times?</strong><br>
          <span style="color: var(--text-muted);">A: Using standard simulation benchmarking: $\frac{18 - 11}{18} \times 100 = 38.9\%$ reduction in estimated travel time, evaluated alongside a sub-50ms rerouting response latency.</span>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; border-left: 3px solid var(--accent-amber);">
          <strong>Q: Can it be deployed immediately?</strong><br>
          <span style="color: var(--text-muted);">A: No; this prototype is a dispatcher decision-support tool. Full live field deployment requires telemetry hardware certification, emergency service protocol integration, and municipality sign-off.</span>
        </div>
      </div>
    `
  }
];
