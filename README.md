# PulseRoute AI: Dynamic Emergency Navigation & Ambulance Route Intelligence

> **AI-Based Ambulance Route Intelligence Platform**  
> *Dynamic Emergency Navigation Using Traffic, Road-Condition Analysis, and Explainable AI*  
> **Relevant SDGs:** Goal 3 (Good Health & Well-Being) • Goal 11 (Sustainable Cities & Communities)

---

## 🚑 Project Overview

In critical medical emergencies (acute myocardial infarction, stroke, polytrauma), every minute in transit directly impacts survival probability. Conventional navigation apps prioritize **geographical distance** or general consumer traffic flow, failing to factor emergency vehicle constraints, sudden lane closures, or signal gridlock.

**PulseRoute AI** is an emergency route intelligence platform that:
- Evaluates candidate routes using real-time road conditions, dynamic traffic speeds, and hazard penalties.
- Explains route choices to dispatchers (*"Route B recommended (+38.9% faster); Route A rejected due to Panjagutta flyover congestion"*).
- Monitors ambulance transit with telemetry HUD and **dynamically reroutes vehicles mid-transit** if unexpected road closures or accidents occur.
- Incorporates destination hospital readiness (ICU bed capacity, ER wait times, trauma center levels).

---

## ⚡ The Core Paradox: Why the Shortest Road Fails

| Corridor | Distance | Est. Travel Time | Road Condition | AI Decision |
| :--- | :---: | :---: | :--- | :--- |
| **Route A (Direct Arterial)** | **5.0 km** | **18.0 min** | Heavy Urban Congestion (18 km/h) | ❌ **Rejected** (High Transit Latency) |
| **Route B (Expressway Bypass)** | **7.0 km** | **11.0 min** | Moderate Flow (55 km/h bypass) | ✅ **Recommended** (**38.9% Faster**) |
| **Route C (Inner Ring Link)** | **6.0 km** | **15.0 min** | Minor Road Construction | ⚠️ **Standby Detour** |

### Mathematical Evaluation Metric (Section 12)
$$\text{Simulated Improvement} = \frac{T_{\text{baseline}} - T_{\text{AI}}}{T_{\text{baseline}}} \times 100 = \frac{18 - 11}{18} \times 100 = 38.9\%$$

---

## 📐 Mathematical Formulation & Cost Algorithm

The road network is represented as a directed multigraph $G = (V, E)$, where:
- $V$: Intersections, hospital trauma bays, and emergency scenes.
- $E$: Road segments connecting vertices.
- $t_e$: Dynamic travel time predicted for road segment $e$.

$$\text{Transit Time: } T(R) = \sum_{e \in R} t_e$$

To account for verified hazards, signal bottlenecks, and uncertainty, the system introduces a penalty function $P(R)$ weighted by sensitivity hyperparameter $\lambda$:

$$\text{Total Cost Function: } C(R) = T(R) + \lambda \cdot P(R)$$
$$\text{Optimal Route: } R^* = \arg\min_{R \in \mathcal{R}} C(R)$$

*Note: Confirmed closures apply $t_e = \infty$, strictly disqualifying blocked corridors.*

---

## 🛠️ System Architecture

- **Frontend**: Vanilla HTML5, CSS3 (tactical emergency HUD design system, glassmorphism), JavaScript (ES6+).
- **Interactive Mapping**: Leaflet.js with CartoDB DarkMatter tiles, dynamic polyline rendering, and custom animated SVG ambulance markers with heading rotation.
- **Synthesized Audio Engine**: Web Audio API dual-tone European/US emergency wail & dispatch chimes (zero external audio file dependencies).
- **Backend**: Node.js + Express REST API (`/api/routes/calculate`, `/api/incidents`, `/api/hospitals`, `/api/ml/predict-segment`, `/api/analytics`).
- **Intelligence Layer**: Graph cost minimization with configurable penalty factor $\lambda$, plus a simulated HistGradientBoosting ML segment predictor.

---

## 🚀 Running the Platform

1. **Start the Express Server**:
   ```bash
   npm start
   ```
2. **Access the Dispatcher Dashboard**:
   Open [http://localhost:3000](http://localhost:3000) in any web browser.

---

## 🎬 4-Step Hackathon Jury Demonstration Script

1. **Select Emergency Preset**:
   - In the left sidebar, click **"Scenario 1: Jubilee Hills Checkpost to Apollo Hospitals"**.
   - Observe how the dashboard evaluates Route A (5.2 km direct, 18 min) vs Route B (7.0 km bypass, 11 min).
   - Point to the **38.9% Transit Time Reduction** card and the Explainable AI tags.
2. **Launch Vehicle Simulation**:
   - Click **"Start Dispatch"** at the bottom of the map.
   - Watch the animated ambulance navigate the green corridor with real-time velocity (54 km/h) and countdown ETA.
3. **Trigger Mid-Transit Dynamic Rerouting**:
   - While the ambulance is in motion, click **"⚡ Live Mid-Transit Reroute Demo"**.
   - The system injects an unexpected chemical spill closure on Route B.
   - Watch the visual siren pulse, hear the reroute chime, and see the vehicle automatically divert onto Route C without dispatcher panic.
4. **Inspect ML Inferences & Presentation Deck**:
   - Click **"🧠 ML Predictor"** in the top navigation to adjust peak hour and rain sliders to inspect feature importance.
   - Click **"📋 Jury Presentation Mode"** to walk judges through the research papers, mathematical formulas, and pre-answered jury defense questions.

---

## 🎯 Jury Defense: Quick Reference

- **Q1: Why not just use Google Maps?**
  *Google Maps does not provide emergency-specific hospital ICU bed readiness, dispatcher incident penalty threshold tuning ($\lambda$), automated green corridor reroute alerts, or explainable delay breakdowns.*
- **Q2: Where is the AI?**
  *Stage 1 implements Dijkstra/A* graph cost minimization with dynamic edge penalties. Stage 2 incorporates machine learning regression predicting segment velocities from time of day, weather, and incident severity.*
- **Q3: Can this be deployed immediately?**
  *No; this prototype is a dispatcher decision-support tool. Field deployment requires emergency service protocol certification and municipality telemetry integration.*
