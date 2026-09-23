# 🚇 All-India Metro Transit Fare Policies & Universal Schema Mapping

This document provides a comprehensive technical audit of the fare calculation policies and fare structures across all operational and under-construction transit networks in India, mapped against the **`universal_transit_schema.js` (v3.0)** specification.

---

## 1. Universal Fare Schema Taxonomy (`universal_transit_schema.js`)

Under `universal_transit_schema.js`, every transit network's tariff structure is categorized into one of **5 canonical fare models** under `fareRules.policies.<policy_id>.fareModel`:

| `fareModel` | Description | Calculation Mechanism | Key Fields in Policy Schema |
| :--- | :--- | :--- | :--- |
| **`distance_based`** | Calculated based on track distance slabs (km/m) | `fareTables.weekday` / `fareTables.holiday` with `minKm`, `maxKm`, `fare` | `calculation: { distanceUnit: "km", rounding: "nearest" }` |
| **`station_count_based`** | Calculated based on number of stations traversed | `fareTables.weekday` with `minStations`, `maxStations`, `fare` | `calculation: { distanceUnit: "stations", rounding: "exact" }` |
| **`station_pair`** | Fixed origin-destination lookup (Point-to-Point) | Ordered `stations` array + $N \times N$ `fareMatrix` | `stations: [...]`, `fareMatrix: [[...]]`, `coachClasses` |
| **`flat_fare`** | Single uniform price across all stations in corridor | Single entry slab `{ minKm: 0, maxKm: null, fare: X }` | `fareModel: "flat_fare"`, single base product |
| **`zone_based`** | Fares determined by crossing concentric geographical zones | Radial ring crossing tariff table | `zones: {...}`, `zoneMatrix: [...]` |

---

## 2. All-India Metro Transit Fare Policy Master Table

| # | City / Region | Transit System | Operator / Agency | Primary `fareModel` | Base Fare Range (₹) | Ticketing Products & Discounts | Dynamic / Holiday Pricing |
| :-: | :--- | :--- | :--- | :---: | :---: | :--- | :---: |
| **1** | **Delhi NCR** | **Delhi Metro (DMRC)** | DMRC | `distance_based` | ₹11 – ₹64 | • Token (Base)<br>• Smart Card (10% Off)<br>• NCMC RuPay | Sunday & Nat. Holidays: Discounted slabs (₹11 – ₹54). Off-peak hours additional 10% off. |
| **2** | **Delhi NCR** | **Airport Express Line** | DMRC | `station_pair` | ₹11 – ₹75 | • QR Ticket / Token<br>• Trip Pass (30/45 trips)<br>• Smart Card | Fixed 7x7 point-to-point matrix. |
| **3** | **Noida / Gr. Noida** | **Noida Aqua Line** | NMRC | `station_count_based` | ₹10 – ₹50 | • QR Ticket (Base)<br>• NMRC CITY1 Card (10% Off)<br>• SBI NCMC Card | Sunday & Nat. Holidays: Discounted slabs (₹10 – ₹40). |
| **4** | **Gurugram** | **Rapid Metro Gurugram** | HMRTC / DMRC | `flat_fare` | ₹20 (Flat) | • DMRC Smart Card<br>• Token / QR Ticket | Uniform ₹20 across all 11 stations. |
| **5** | **Delhi-Meerut** | **Namo Bharat (RRTS)** | NCRTC | `station_pair` (Multi-Class) | **Standard:** ₹20 – ₹210<br>**Premium:** ₹25 – ₹250 | • NCRTC Mobile App QR<br>• Namo Bharat Card / NCMC<br>• Paper QR | Class segregation: Standard Coach vs Premium Coach ($23 \times 23$ matrix). |
| **6** | **Mumbai** | **Maha Mumbai Metro (Line 2A & 7)** | MMMOCL / MMRDA | `distance_based` | ₹10 – ₹80 | • Mumbai 1 Card (NCMC)<br>• Paper QR / App QR | Slabs per 3-6 km (0-3 km: ₹10, 3-12 km: ₹20, ..., 42-48 km: ₹80). |
| **7** | **Mumbai** | **Mumbai Metro (Line 1 - Versova-Ghatkopar)** | MMOPL (Reliance Infra) | `distance_based` | ₹10 – ₹40 | • Smart Card (Store Value)<br>• Trip Pass<br>• Paper/Mobile QR | 4 telescopic slabs (0-3 km: ₹10, 3-8 km: ₹20, 8-12 km: ₹30, >12 km: ₹40). |
| **8** | **Mumbai** | **Mumbai Metro (Line 3 - Aqua Line)** | MMRC | `distance_based` | ₹10 – ₹50 | • NCMC RuPay Card<br>• Mobile App QR | Phase 1 (Aarey to BKC): Distance slabs identical to Line 2A/7 tariff structure. |
| **9** | **Navi Mumbai** | **Navi Mumbai Metro (Line 1)** | CIDCO / Maha Metro | `distance_based` | ₹10 – ₹40 | • Token / Paper QR<br>• NCMC Card | 0-2 km: ₹10, 2-4 km: ₹15, 4-6 km: ₹20, 6-8 km: ₹25, 8-10 km: ₹30, >10 km: ₹40. |
| **10** | **Bengaluru** | **Namma Metro** | BMRCL | `distance_based` | ₹10 – ₹60 | • Namma Metro Smart Card (5% Off)<br>• WhatsApp / App QR (5% Off)<br>• NCMC Card | Telescopic distance slabs with 5% discount on digital tickets. |
| **11** | **Hyderabad** | **Hyderabad Metro** | L&T Metro / HMRL | `distance_based` | ₹10 – ₹60 | • Nebula Smart Card (10% Off)<br>• WhatsApp QR<br>• Super Saver Holiday Card (₹59 flat) | Distance slabs (0-2 km: ₹10, up to >26 km: ₹60). Super Saver off-peak card. |
| **12** | **Chennai** | **Chennai Metro** | CMRL | `distance_based` | ₹10 – ₹50 | • CMRL Travel Card (20% Off)<br>• WhatsApp/Static QR (20% Off)<br>• Singara Chennai NCMC | 20% flat discount on all digital / card transactions. |
| **13** | **Kolkata** | **Kolkata Metro (Blue, Green, Purple, Orange)** | Metro Railway (Indian Railways) | `distance_based` / `zone_based` | ₹5 – ₹25 (Green line: ₹5 – ₹50) | • Smart Card (Store Value)<br>• Paper Token / QR Ticket | Lowest base fare in India (0-2 km: ₹5, 2-5 km: ₹10, 5-10 km: ₹15, 10-20 km: ₹20, >20 km: ₹25). Special river-tunnel tariff for Green Line. |
| **14** | **Kochi** | **Kochi Metro** | KMRL | `distance_based` | ₹10 – ₹60 | • Kochi1 Card (20%-33% Off)<br>• Trip Pass<br>• QR Ticket | Distance slabs (0-2 km: ₹10, 2-5 km: ₹20, ..., >20 km: ₹60). Periodic promotional discounts. |
| **15** | **Ahmedabad / Gandhinagar** | **Ahmedabad Metro** | GMRC | `distance_based` | ₹5 – ₹30 | • GMRC Smart Card (10% Off)<br>• Paper QR Ticket | Telescopic slabs (0-2.5 km: ₹5, 2.5-7.5 km: ₹10, up to >27 km: ₹30). |
| **16** | **Pune** | **Pune Metro** | Maha Metro / PMRDA | `distance_based` | ₹10 – ₹35 | • One Pune Card (NCMC)<br>• Student Pass (30% Off)<br>• Weekend Pass (30% Off) | Distance slabs with weekend 30% discount on Saturdays & Sundays. |
| **17** | **Nagpur** | **Nagpur Metro** | Maha Metro | `distance_based` | ₹5 – ₹35 | • Maha Card (10% Off)<br>• Daily Pass (₹100) | Ultra-short slab starting at ₹5 (0-1.5 km: ₹5, 1.5-3 km: ₹10, ..., >12 km: ₹30). |
| **18** | **Lucknow** | **Lucknow Metro** | UPMRCL | `distance_based` | ₹10 – ₹60 | • GoSmart Card (10% Off)<br>• Tourist Card (₹100/₹250)<br>• QR Token | Stage/distance slabs (1 stn: ₹10, 2 stn: ₹15, 3-6 stn: ₹20, up to >17 stn: ₹60). |
| **19** | **Kanpur** | **Kanpur Metro** | UPMRCL | `distance_based` | ₹10 – ₹30 | • GoSmart Card (10% Off)<br>• QR Token | Same UPMRCL telescopic distance framework as Lucknow. |
| **20** | **Agra** | **Agra Metro** | UPMRCL | `distance_based` | ₹10 – ₹30 | • GoSmart Card (10% Off)<br>• QR Token | Same UPMRCL telescopic distance framework. |
| **21** | **Jaipur** | **Jaipur Metro** | JMRC | `distance_based` | ₹6 – ₹22 | • Metro Smart Card (10%-15% Off)<br>• Token | 1-2 stn: ₹6, 3-5 stn: ₹12, 6-8 stn: ₹18, >8 stn: ₹22. Peak / Off-peak slabs. |
| **22** | **Bhopal** | **Bhopal Metro** | MPMRCL | `distance_based` | ₹10 – ₹40 | • NCMC Card<br>• Paper QR | Priority corridor: 0-2 km: ₹10, 2-4 km: ₹15, etc. |
| **23** | **Indore** | **Indore Metro** | MPMRCL | `distance_based` | ₹10 – ₹40 | • NCMC Card<br>• Paper QR | Super Corridor: standard distance-based tariff. |

---

## 3. Key Technical Takeaways for Universal Fare Scraper

1. **Dominance of `distance_based` Model (>80%)**:
   - अधिकांश भारतीय मेट्रो सिस्टम (DMRC, Mumbai, Bengaluru, Chennai, Hyderabad, Kochi, Ahmedabad, Pune, Nagpur, UP Metros) **डिस्टेंस स्लैब** आधारित हैं।
   - इसलिए, फेयर इंजन को मुख्य रूप से `{ minKm, maxKm, fare }` स्लैब्स पार्स करने में सक्षम होना चाहिए।

2. **Special Exceptions (`station_pair`)**:
   - **Airport Express Line** और **NCRTC Namo Bharat RRTS** पूरे नेटवर्क के लिए $N \times N$ मैट्रिक्स का उपयोग करते हैं।
   - Namo Bharat में **Standard Class** और **Premium Class** के 2 अलग-अलग मैट्रिक्स होते हैं।

3. **`station_count_based` Exception**:
   - **NMRC Noida Aqua Line** सीधे स्टेशन की संख्या गिनकर किराया तय करता है (दूरी नहीं)।

4. **`flat_fare` Exception**:
   - **Rapid Metro Gurugram** में स्टेशन या दूरी से कोई फर्क नहीं पड़ता, सभी के लिए फ्लैट ₹20 है।
