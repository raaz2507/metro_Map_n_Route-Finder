# 🚇 `import_data` Subsystem: Architecture & Operational Manual

> **Single Source of Truth (SSOT)** for Ingestion, Auditing, Normalization, and Staging of all 30+ Indian Transit Networks.

---

## 📌 1. `import_data` क्या है और इसका मुख्य उद्देश्य क्या है?

`import_data` हमारे मुख्य प्रोजेक्ट (`main_project`) का **Universal Data Engineering, Ingestion & Auditing Hub** है।

इसका प्राथमिक काम भारत के सभी 30+ ट्रांजिट नेटवर्क्स (DMRC Delhi, NMRC Noida, NCRTC RRTS Namo Bharat, Rapid Metro Gurugram, Mumbai Metro, Namma Metro Bengaluru, आदि) के आधिकारिक पोर्टल्स और APIs से स्टेशन डेटा, समय-सारिणी (timetables), इंटरचेंज, गेट्स, पार्किंग, फ़ेयर स्लैब्स और पैसेंजर हेल्पलाइन को **बिना किसी डेटा लॉस (Zero Data Loss Guarantee)** के कैप्चर करना, क्लीन करना, ऑडिट करना और प्रोडक्शन के लिए तैयार करना है।

---

## 🏛️ 2. कोर 4-स्टेज ग्रीडी डेटा पाइपलाइन (4-Stage Greedy Pipeline)

पूरा सिस्टम 4 चरणों में काम करता है:

1. **🔴 STAGE 1: RAW GREEDY SCRAPING (`*_raw.json`)**:
   - आधिकारिक वेबसाइट्स/APIs से 100% डेटा बिना किसी फ़ील्ड को छोड़े कैप्चर किया जाता है।
   - Zero Data Loss: कोई भी CMS टैग, इमेज या नेस्टेड एट्रिब्यूट नहीं हटाया जाता।
   - पावर्ड बाई: `universal_scraper.py` + `adapters/`.

2. **🟡 STAGE 2: BASIC CLEANED (`*_cleaned.json`)**:
   - व्हाइटस्पेस ट्रिम, स्ट्रिंग एन्कोडिंग फिक्स, अपरकेस कोड्स, SQL Deduplication.
   - **ZERO STRUCTURAL MUTATION**: कोई मनगढ़ंत टॉप-लेवल स्कीमा नहीं जोड़ा जाता।
   - 🚨 **MANDATORY DEVELOPER SUPERVISION BOUNDARY**: असंरचित नेटवर्क्स के लिए ऑटोमेशन यहीं रुकता है!
   - पावर्ड बाई: `universal_cleaner.py` + `cleaners/`.

3. **🟢 STAGE 3: MASTER STRUCTURED (`*_master.json`)**:
   - केवल डेवलपर के मैनुअल सुपरविजन और स्कीमा निर्णयों के बाद तैयार होता है।
   - गेट्स, लैंडमार्क, पार्किंग मैट्रिक्स, प्लेटफ़ॉर्म और इंटरचेंज का मानकीकरण।

4. **❄️ STAGE 4: PRODUCTION CORE (`data.json` & `stations_data.json`) [FROZEN]**:
   - क्लाइंट-साइड रूटिंग ऐप (`main_project`) द्वारा उपयोग की जाने वाली मुख्य प्रोडक्शन फाइल्स।
   - सख्त नियम: जब तक सभी 30+ नेटवर्क स्टेज 3 तक न पहुँचें, ये 100% फ्रोज़न हैं।

---

## 📂 3. डायरेक्टरी स्ट्रक्चर (Directory Tree)

- `server.py` & `run_server.bat`: ज़ीरो-डिपेंडेंसी पायथन HTTP सर्वर (Port 8080) + Server-Sent Events (SSE) लाइव टर्मिनल लॉग स्ट्रीमिंग।
- `universal_scraper.py`: सेंट्रल मल्टी-प्रोटोकॉल स्क्रैपर (CLI + Web ट्रिगर)।
- `universal_cleaner.py`: सेंट्रल क्लीनर इंजन (5 गोल्डन रूल्स लागू करता है)।
- `universal_support_builder.py`: पैसेंजर सपोर्ट, हेल्पलाइन व लिंक मॉनिटरिंग टूल।
- `master_audit_manifest.json`: सेंट्रल मैनिफ़ेस्ट (SSOT) - सभी नेटवर्क्स का कॉन्फ़िगरेशन, फ़ाइल पाथ्स और एक्टिव स्टेज।
- `india_transit_registry.json`: भारत के सभी शहरों और उनके मेट्रो/RRTS नेटवर्क्स की आधिकारिक रजिस्ट्री।
- `pipeline_core/`: बेस एडाप्टर, बेस क्लीनर, एटॉमिक फ़ाइल मैनेजर, लॉगर और मीडिया हार्वेस्टर।
- `adapters/`: नेटवर्क-विशिष्ट स्क्रैपिंग एडाप्टर्स (DMRC, NMRC, NCRTC, Mumbai, Generic)।
- `cleaners/`: नेटवर्क-विशिष्ट स्टेज 2 क्लीनर प्लगइन्स।
- `datasets/`: प्योर डेटा स्टोर (0% Python Code) - raw, cleaned, master और media डायरेक्टरीज।
- `dashboard/`: वेब-बेस्ड ऑडिट हब (`admin.html`, `station_detail.html`, `help.html`, `admin.js`)।
- `doc/`: आर्किटेक्चर दस्तावेज़ (`DATA_PIPELINE_ARCHITECTURE.md`, `README.md`)।

---

## 🛑 4. कभी न तोड़ने वाले 5 स्वर्ण नियम (Non-Negotiable Rules)

1. **0% Data Loss**: कभी भी स्क्रैप्ड डेटा से वास्तविक स्टेशन या ओरिजिनल पेलोड नहीं हटाया जाएगा।
2. **Stop at Stage 2**: जब तक डेवलपर खुद बैठकर स्कीमा डिजाइन न करे, किसी भी नेटवर्क को जबरन स्टेज 3 में नहीं धकेला जाएगा।
3. **Stage 4 Frozen**: `main_project/data/data.json` और `stations_data.json` को कतई हाथ नहीं लगाना है।
4. **Pure Data Store**: `datasets/` फोल्डर में केवल JSON और मीडिया रहेगा, कोई कोड नहीं।
5. **टैब इंडेंटेशन और एटॉमिक राइट्स**: सभी JSON फाइल्स `indent="\t"` में एटॉमिकली `.tmp` फाइल बनाकर रीनेम होंगी ताकि क्रैश होने पर डेटा करप्ट न हो।
