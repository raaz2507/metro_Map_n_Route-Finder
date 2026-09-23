# 🗺️ 4-Stage Greedy Data Pipeline Architecture & Universal Rules

> **Zero Data Loss Guarantee**: We never directly guess or structure raw data in a single jump. All data scraping, filtering, domain structuring, and production integrations must strictly follow this 4-Stage Progressive Greedy Pipeline.

---

## 🏛️ The 4-Stage Greedy Pipeline Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 1: RAW GREEDY SCRAPING (*_scraped_raw.json)                         │
│  - 100% of raw data from official websites/APIs is captured greedily.      │
│  - ZERO fields, nested attributes, or CMS tags are dropped at this stage.   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Automated deduplication & syntax clean)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 2: BASIC CLEANED (*_scraped_cleaned.json)                           │
│  - Trims whitespace, removes exact duplicate keys, fixes string encodings.  │
│  - Retains all underlying data points without structural mutation.          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 
                                       │ 🚨 MANDATORY DEVELOPER SUPERVISION BOUNDARY
                                       │ ◄── [For networks without manual schema design,
                                       │      AUTOMATION MUST STOP HERE AT STAGE 2!]
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 3: MASTER STRUCTURED (*_structured.json)                            │
│  - Created ONLY with direct manual developer supervision & schema decisions.│
│  - Harmonizes gates landmarks, state-aware parking matrices, layout URLs.  │
│  - (Currently, ONLY Namo Bharat NCRTC has completed Stage 3).              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Future integration - FROZEN FOR NOW)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 4: PRODUCTION CORE (data.json & stations_data.json) [FROZEN]         │
│  - Production application database files used by client-side routing.       │
│  - STRICT RULE: Do NOT touch or mutate Stage 4 files at this stage!         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Strict Operational Boundaries & Rules for Developers / AI Agents

1. **RULE 1: STOP AT STAGE 2 FOR UNSUPERVISED METRO NETWORKS**:
   - For transit networks whose domain master schema has not yet been manually designed and approved by the developer (e.g. DMRC Delhi Metro, NMRC Noida Metro, Rapid Metro Gurugram, Mumbai Metro, Bengaluru Namma Metro), automation and scripts **MUST STOP at Stage 2 (Cleaned)**.
   - Never write scripts that hallucinate or auto-generate `*_structured.json` for unsupervised networks without the developer actively guiding the schema decisions.

2. **RULE 2: PRODUCTION CORE FILES ARE FROZEN**:
   - `data/data.json` and `data/stations_data.json` are **100% locked and frozen**.
   - Do not attempt to merge, alter, or rewrite Stage 4 files until all 30+ metro systems reach supervised Stage 3 master status.

3. **RULE 3: PRESERVE ALL ORIGINAL CMS & DOMAIN ATTRIBUTES**:
   - Never discard layout vector URLs (`pdf`), high-resolution layout maps (`png`), timing rules, or localized language tags during cleaning.

4. **RULE 4: SINGLE SOURCE OF TRUTH (SSOT) VIA MANIFEST**:
   - All network pipelines, source URLs, and active pipeline stages are registered in `import_data/master_audit_manifest.json`.

---

## 📊 Live Network Pipeline Register

| Network ID | Transit System Name | Source URL | Current Pipeline Stage | Supervised Status |
| :--- | :--- | :--- | :--- | :--- |
| `ncrtc_rrts` | Namo Bharat (NCRTC RRTS) | `https://namobharat.ncrtc.in/` | `Stage 3: Master Structured` | 🟢 **Supervised & Completed** |
| `dmrc_delhi` | Delhi Metro (DMRC) | `https://www.delhimetrorail.com/` | `Stage 2: Basic Cleaned` | 🟡 **Awaiting Supervision** |
| `nmrc_noida` | Noida Aqua Line (NMRC) | `https://www.nmrcnoida.com/` | `Stage 2: Basic Cleaned` | 🟡 **Awaiting Supervision** |
| `rapid_metro_gurugram` | Rapid Metro Gurugram | `https://www.delhimetrorail.com/rapid-metro` | `Stage 2: Basic Cleaned` | 🟡 **Awaiting Supervision** |
| *Future Networks (30+)* | Mumbai, Namma Metro, etc. | Official Portals | `Stage 1 / Stage 2` | ⚪ **Pending Intake** |

---

## 🚀 Step-by-Step Guide for Adding a New Metro Network (Out of 30+)

1. **Step 1 (Scrape Raw)**: Run or write the network scraper (`scrape_<network>_stations.py`) to greedily capture 100% of station data into `import_data/<network>_data/<network>_all_stations_scraped_raw.json`.
2. **Step 2 (Basic Clean)**: Run automated cleaner script to output `<network>_all_stations_scraped_cleaned.json`.
3. **Step 3 (STOP & Review)**: Register the network in `master_audit_manifest.json` with `"pipeline_stage": "stage_2_cleaned"` and `"supervised_by_developer": false`.
4. **Step 4 (Developer Supervision Session)**: In a dedicated pair programming session with the developer, review unique domain attributes (gates, parking tariffs, platforms) and generate the master `<network>_all_stations_structured.json` (Stage 3).
5. **Step 5 (Update Manifest)**: Switch `"pipeline_stage": "stage_3_structured"` and `"supervised_by_developer": true`.
