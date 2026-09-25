# 🏛️ Unified Multi-Platform Architecture (Web, PWA & Capacitor Native)

> **Core Philosophy:** "Write Once, Run Everywhere with Zero Code Duplication"  
> **Source Directory Authority:** `main_project/`

---

## 🗺️ Architectural Ecosystem Diagram

```
                              ┌─────────────────────────────────────────┐
                              │         CORE WEB APPLICATION           │
                              │             (main_project/)             │
                              │  • HTML5 / ES2022 Modular OOP JS        │
                              │  • Responsive CSS Design Tokens         │
                              │  • Verified Multi-City Datasets         │
                              │  • PWA Manifest & Service Worker        │
                              └────────────────────┬────────────────────┘
                                                   │
                ┌──────────────────────────────────┼──────────────────────────────────┐
                │                                  │                                  │
                ▼                                  ▼                                  ▼
 ┌─────────────────────────────┐    ┌─────────────────────────────┐    ┌─────────────────────────────┐
 │    1. GITHUB PAGES (WEB)    │    │    2. PROGRESSIVE WEB APP   │    │    3. CAPACITOR (ANDROID)   │
 │        (Cloud Hosted)       │    │      (Browser Standalone)   │    │      (Native APK / AAB)     │
 ├─────────────────────────────┤    ├─────────────────────────────┤    ├─────────────────────────────┤
 │ • Desktop & Mobile Browsers │    │ • "Add to Home Screen" UI   │    │ • Pure Native Android App   │
 │ • Automated CI/CD Deploy    │    │ • Offline Service Worker    │    │ • Local Asset Bridge        │
 │ • Zero Maintenance Hosting  │    │ • Stale-While-Revalidate    │    │ • Native GPS / Haptics API  │
 │ • HTTPS Secure Origin       │    │ • 0ms Cache-First Loading   │    │ • Google Play Store Ready   │
 └─────────────────────────────┘    └─────────────────────────────┘    └─────────────────────────────┘
```

---

## 🛡️ 4 Core Architectural Principles & Best Practices

### 1. 🎯 Single Source of Truth (`main_project/`)
* सारा यूआई कोड, बिजनेस लॉजिक, स्टाइलिंग और मल्टी-सिटी डेटा केवल `main_project/` में रहता है।
* कोई कोड डुप्लीकेशन नहीं — एक जगह बग फिक्स या नया स्टेशन जोड़ने पर वह वेब, PWA और Android APK तीनों में एक साथ लाइव हो जाता है।

### 2. ⚡ Platform Awareness & Adaptive Execution
JavaScript रनटाइम पर खुद पहचान करता है कि वह किस एनवायरनमेंट में चल रहा है:

```javascript
// Native vs Web Environment Detection Pattern
const isNativeApp = Boolean(window.Capacitor?.isNativePlatform());

if (isNativeApp) {
    // 📱 Native Android Mode: Use Native Plugins
    console.log("Running as Native Android APK");
} else {
    // 🌐 Web / PWA Mode: Use Standard Browser Web APIs
    console.log("Running as Web / PWA");
}
```

### 3. 🔄 Dual Caching & Asset Delivery Lifecycle

| प्लेटफॉर्म | एसेट लोडिंग और कैशे का तरीका | सर्विस वर्कर की भूमिका |
| :--- | :--- | :--- |
| **Web (GitHub Pages)** | CDN/नेटवर्क से फेच होता है। | केवल सपोर्टेड ब्राउज़र्स में बैकग्राउंड कैशे। |
| **PWA (Mobile Web)** | `sw.js` (Service Worker) कैशे से तुरंत (0ms) लोड होता है। | **सक्रिय**: ऑफलाइन सपोर्ट और डेटा कैशे के लिए। |
| **Capacitor APK (Native)** | APK पैकेज के अंदर से लोकल (`localhost` / `file://`) लोड होता है। | **निष्क्रिय / बायपास**: सभी एसेट्स पहले से फोन में हैं। |

### 4. 📳 Progressive Hardware Enhancement (GPS, Haptics & Network)
* **GPS Geolocation**:
  - *Android APK*: `@capacitor/geolocation` (हाई-एक्यूरेसी GPS हार्डवेयर एक्सेस)।
  - *Web/PWA*: `navigator.geolocation` (ब्राउज़र परमिशन आधारित)।
* **Haptics (Vibration Feedback)**:
  - *Android APK*: `@capacitor/haptics` (क्रंच टिकटिंग फीडबैक)।
  - *Web/PWA*: `navigator.vibrate` (फॉलबैक)।

---

## 🚀 Deployment & Build Workflow

1. **Web Deployment**: `.github/workflows/deploy_pages.yml` ➔ Automatic push to GitHub Pages.
2. **PWA Updates**: Service Worker auto-detects hash updates in `sw.js` and updates the cache.
3. **Android APK Build**:
   ```bash
   npx cap sync android
   cd android && ./gradlew assembleRelease
   ```
