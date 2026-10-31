# CropCycle Connect — Smart Matching Engine Specification

## 1. Executive Overview

The Smart Matching Engine connects agricultural residue listings created by farmers with industrial buyers, bioprocessing plants, and agricultural cooperatives.

The engine calculates a **multi-factor compatibility score** that ranks suitable candidates based on geographic proximity, batch volume alignment, processing capacity, and intended circular economy use.

> **CRITICAL ASSUMPTION:**  
> The calculated score is a **compatibility and logistics alignment ranking** (0–100), **NOT** a mathematical guarantee or probability that a commercial transaction will close. Contractual pricing, moisture content inspection, and final quality acceptance remain subject to buyer-seller agreement.

---

## 2. Mathematical Scoring Formula

$$\text{Final Match Score} = 100 \times \Big( 0.40 \cdot \text{Quantity Fit} + 0.30 \cdot \text{Proximity} + 0.20 \cdot \text{Capacity Fit} + 0.10 \cdot \text{Use-Case Fit} \Big)$$

All sub-component scores are normalized in the range $[0.0, 1.0]$. The final composite score is bounded between $0$ and $100$.

### Component Weights

| Component | Weight | Rationale |
|---|---|---|
| **Quantity Fit** | **40%** | Bulk logistics cost is heavily determined by batch volume. Delivering too little leaves freight underutilized; delivering too much strains immediate unloading. |
| **Proximity** | **30%** | Crop residue has low bulk density; hauling distances beyond 100–150 km quickly make transport uneconomical and carbon-intensive. |
| **Capacity Fit** | **20%** | Ensures that the buyer's facility infrastructure (storage yards, daily intake hoppers) can safely absorb the listing without operational bottlenecks. |
| **Use-Case Fit** | **10%** | Rewards high-synergy biological conversions (e.g., paddy straw into bio-CNG or mushrooms; bagasse into paper) where feedstock value is maximized. |

---

## 3. Algorithm Stages

### Step 1: Compatibility (Hard Eligibility Gate)
Before any scores are computed, candidates must pass three strict boolean eligibility checks:
1. **Residue Type Matching:** The buyer's `accepted_types` array must contain the listing's `residue_type` (case-insensitive, whitespace-trimmed).
2. **Operational Availability:** The buyer must be actively accepting residue (`available !== false` and `availability_status !== 'no'`). Buyers marked on-hold are filtered out.
3. **Valid Listing Quantity:** The listing must have a positive numeric quantity $> 0$ tonnes.

*Candidates failing any of these conditions are excluded from the ranked list and placed in an "Ineligible / Excluded" category with the exact exclusion reason.*

---

### Step 2: Component Scorers

#### A. Quantity Fit ($0.0 - 1.0$)
$$\text{Quantity Fit} = \frac{\min(Q_{\text{listing}}, Q_{\text{buyer}})}{\max(Q_{\text{listing}}, Q_{\text{buyer}})}$$

- **Exact alignment ($Q_L = Q_B$):** Produces $1.0$ (e.g. 50t vs 50t).
- **Listing below requirement ($Q_L < Q_B$):** Produces fulfillment ratio (e.g. 18t vs 20t $\to 0.90$).
- **Listing above requirement ($Q_L > Q_B$):** Reflects surplus handling (e.g. 100t vs 50t $\to 0.50$).

#### B. Proximity Fit ($0.0 - 1.0$)
Based on Indian administrative boundaries and freight economics:
- **Same District / City locality:** $1.00$ ($\approx < 25\text{ km}$ local haulage).
- **Same State (intra-state):** $0.75$ ($\approx 70\text{--}120\text{ km}$ regional route).
- **Adjacent / Neighboring State:** $0.45$ ($\approx 200\text{--}350\text{ km}$ inter-state transit).
- **Distant State (long-haul):** $0.20$ ($> 500\text{ km}$ freight route).
- **Missing / Incomplete Location:** $0.25$ (conservative fallback with UI notice).

#### C. Available Capacity Fit ($0.0 - 1.0$)
Let $C_{\max}$ be the buyer's specified `max_intake_tonnes` (or $2 \times Q_{\text{required}}$ buffer if unspecified).
- If $Q_{\text{listing}} \le C_{\max}$: $\text{Capacity Fit} = 1.00$ (easily absorbed).
- If $Q_{\text{listing}} > C_{\max}$: $\text{Capacity Fit} = \max\Big(0.10, \frac{C_{\max}}{Q_{\text{listing}}}\Big)$.
  *Triggers a warning: "Exceeds single-batch max intake. Multi-stage delivery required."*

#### D. Use-Case Compatibility ($0.0 - 1.0$)
Assesses feedstock suitability for the buyer's declared `intended_use`:
- **Optimal Circular Pairing ($1.00$):** Feedstocks with high industrial yield (e.g., Paddy Straw $\to$ Biofuel/Bio-CNG/Mushroom; Sugarcane Bagasse $\to$ Paper & Pulp/Energy).
- **Verified Accepted Intake ($0.75$):** Material explicitly listed by buyer for commercial processing.
- **General Valorization ($0.50$):** Standard agricultural biomass compatibility.

---

### Step 3: Multi-Candidate Ranking & Top-3 Highlights
1. All compatible candidates are sorted descending by `Final Match Score`.
2. Tie-breaking prioritizes `Proximity Fit` (shorter transport), followed by `Quantity Fit`.
3. The top 3 ranked entries are awarded distinctive visual badges:
   - **Rank 1:** `#1 Best Match` (Gold tier)
   - **Rank 2:** `#2 Strong Match` (Silver tier)
   - **Rank 3:** `#3 Alternative Match` (Bronze tier)

---

### Step 4: Transparent Narrative Explanations
Every candidate presents an actionable breakdown across 5 dimensions:
- **Residue:** Confirms feedstock compatibility.
- **Quantity:** States exact batch coverage (e.g. "18t fulfills 90% of buyer's 20t batch").
- **Proximity:** Details physical location and estimated freight transit.
- **Capacity:** Notes yard intake headroom and batch limitations.
- **Use-Case:** Outlines value-chain conversion and circular synergy.
- **Interactive Points Pill:** Displays individual points contributing to the 100-point total ($40 + 30 + 20 + 10$).

---

### Step 5: Edge Case Handling
- **No Compatible Buyers:** UI presents an empathetic empty state explaining the exact mismatch (e.g. no active buyers accepting this crop residue) with clear guidance.
- **Missing / Null Locations:** Fallback proximity score ($0.25$) prevents crashes and highlights a warning pill.
- **On-Hold Buyers:** Filtered out from active matches; accessible in an "On Hold" toggle with explanations.
- **Single-Batch Overflows:** Overcapacity warnings alert farmers when staggered deliveries will be required.
- **Invalid / Zero / Negative Quantities:** Flagged immediately with validation error before processing.

---

## 4. Verification & Automated Test Suite

A 26-assertion test suite verifies all scoring logic and edge cases:
```bash
npm test
```
Result: `26 / 26 tests passed` (covering all weights, sensitivity shifts, rankings, and edge cases).
