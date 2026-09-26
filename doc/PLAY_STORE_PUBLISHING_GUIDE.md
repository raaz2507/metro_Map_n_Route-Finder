# 🚀 Google Play Store Publishing Guide
## Metro Map & Route Finder (Android / Capacitor App)

> **Document Version:** 1.0.0  
> **Target App Package ID:** `com.metro.map.route.finder`  
> **Framework:** Capacitor 8.x + Vanilla JS (Enterprise ES2022)

---

## 📋 Table of Contents
1. [Phase 1: Pre-Requisites & Requirements](#phase-1-pre-requisites--requirements)
2. [Phase 2: App Assets & Store Listing Graphics](#phase-2-app-assets--store-listing-graphics)
3. [Phase 3: Android Project & App Configuration](#phase-3-android-project--app-configuration)
4. [Phase 4: Release Keystore Creation & Management](#phase-4-release-keystore-creation--management)
5. [Phase 5: Building Production Android App Bundle (.aab)](#phase-5-building-production-android-app-bundle-aab)
6. [Phase 6: Google Play Console Step-by-Step Setup](#phase-6-google-play-console-step-by-step-setup)
7. [Phase 7: Data Safety, Privacy Policy & Compliance](#phase-7-data-safety-privacy-policy--compliance)
8. [Phase 8: Closed Testing (12/20 Testers) & Production Rollout](#phase-8-closed-testing-1220-testers--production-rollout)
9. [Future Updates & Versioning Checklist](#future-updates--versioning-checklist)

---

## 📌 Phase 1: Pre-Requisites & Requirements

### 1. Google Play Console Account
- **URL:** [https://play.google.com/console](https://play.google.com/console)
- **Fee:** $25 USD (one-time lifetime fee).
- **Identity Verification:** Government-issued photo ID (PAN Card, Driving License, or Passport).
- **DUNS Number:** Required *only* if registering an Organization/Business account. For Individual accounts, government photo ID is sufficient.

### 2. Google's 14-Day Closed Testing Rule (For Personal Accounts Created After Nov 2023)
- Google requires **12 to 20 opted-in testers** to test the app continuously for **14 days** in Closed Testing before applying for Production release.

### 3. Hosted Privacy Policy URL (Mandatory)
Google Play policy requires a valid, publicly accessible Privacy Policy URL since the app uses Camera (QR scanning) and Geolocation.
- **Recommended Host:** GitHub Pages  
- **URL Example:** `https://raaz2507.github.io/metro_Map_n_Route-Finder/privacy_policy.html`

---

## 🎨 Phase 2: App Assets & Store Listing Graphics

Play Store listing ke liye ye exact dimensions ke graphics taiyar karein:

| Asset | Exact Dimensions | Format | Requirement | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **App Icon** | `512 × 512 px` | PNG (32-bit color, with alpha) | **Mandatory** | Clean rounded/square logo (Max 1MB) |
| **Feature Graphic** | `1024 × 500 px` | JPG or PNG (24-bit, no alpha) | **Mandatory** | Banner banner shown in Play Store search (Max 15MB) |
| **Phone Screenshots** | Min `2` to Max `8` | JPG / PNG (16:9 or 9:16) | **Mandatory** | Min dimension: 320px, Max: 3840px |
| **Tablet Screenshots** | `7-inch` & `10-inch` | JPG / PNG | Optional | Recommended for tablet ranking |

### Store Listing Text Copy:
* **App Name (Max 30 chars):** `Metro Map & Route Finder`
* **Short Description (Max 80 chars):** `Offline metro route planner, fare calculator, interactive maps & QR ticket pass.`
* **Full Description (Max 4000 chars):** Detail features like:
  - 🗺️ Interactive multi-city transit maps (Delhi NCR, Mumbai, Bengaluru, etc.).
  - ⚡ Dijkstra algorithm for fast routing (Shortest time / Minimum interchange).
  - 🎫 Pure Vector QR ticket wallet & scanner.
  - 🔔 Proximity arrival alarms & live telemetry.
  - 🌐 100% offline functionality.

---

## ⚙️ Phase 3: Android Project & App Configuration

### 1. `capacitor.config.json` Verification
Ensure package ID matches your desired Google Play ID:
```json
{
  "appId": "com.metro.map.route.finder",
  "appName": "Metro Map & Route Finder",
  "webDir": "main_project"
}
```

### 2. `android/app/build.gradle` Versioning
Har naye release ke liye `versionCode` aur `versionName` increment karna zaroori hai:
```groovy
defaultConfig {
    applicationId "com.metro.map.route.finder"
    minSdkVersion rootProject.ext.minSdkVersion // 24+
    targetSdkVersion rootProject.ext.targetSdkVersion // 34+ (Play Store Requirement)
    versionCode 1          // 👈 Har update par +1 karein (1, 2, 3...)
    versionName "1.0.0"    // 👈 Semantic version string
}
```

---

## 🔐 Phase 4: Release Keystore Creation & Management

Play Store par upload hone wali build cryptographically signed honi chahiye.

### 1. Generate Keystore via Terminal
PowerShell me project root par command run karein:
```powershell
keytool -genkey -v -keystore metro-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias metro-key
```

### 2. Enter Information:
- **Keystore Password:** (Strong password choose karein aur note kar lein)
- **First and Last Name:** Aapka naam ya Developer brand name
- **Organizational Unit / Org:** Independent Developer
- **City / State / Country:** E.g., `Mumbai`, `MH`, `IN`

> ⚠️ **CRITICAL SECURITY WARNING:**  
> `metro-release-key.jks` file aur uska password Google Drive / Password Manager me safe backup karein.  
> Agar yeh key file kho gayi, to aap Google Play par **kabhi bhi naya update release nahi kar payenge**!

---

## 📦 Phase 5: Building Production Android App Bundle (.aab)

Google Play Store `.apk` accept nahi karta, sirf **`.aab` (Android App Bundle)** accept karta hai.

### Option A: Android Studio GUI (Recommended)
1. Web assets sync karein:
   ```powershell
   npx cap sync android
   ```
2. Android Studio me `android` folder open karein.
3. Menu me jayein: **Build $\rightarrow$ Generate Signed Bundle / APK...**
4. Select karein: **Android App Bundle** $\rightarrow$ Click **Next**.
5. Form fill karein:
   - **Key store path:** `metro-release-key.jks` file select karein.
   - **Key store password:** Apna password enter karein.
   - **Key alias:** `metro-key`
   - **Key password:** Apna password enter karein.
6. Destination folder choose karein aur **release** variant select karein.
7. Click **Create / Finish**.
8. Aapki signed `.aab` file create ho jayegi:
   📁 `android/app/release/app-release.aab`

---

## 🌐 Phase 6: Google Play Console Step-by-Step Setup

1. **Create App:**
   - Log in to [Play Console](https://play.google.com/console).
   - Click **Create app**.
   - App name: `Metro Map & Route Finder`
   - Default language: `English (United States)` or `Hindi`
   - App or game: `App`
   - Free or paid: `Free`
   - Accept Declarations $\rightarrow$ Click **Create app**.

2. **Dashboard Checklist (Complete All 10 Steps):**
   - **Privacy Policy:** Enter your GitHub Pages Privacy Policy URL.
   - **App Access:** Select *"All functionality is available without special access"*.
   - **Ads:** Select *"No, my app does not contain ads"*.
   - **Content Ratings:** Start questionnaire $\rightarrow$ Category: *Utility / Productivity / Communication* $\rightarrow$ Answer questions $\rightarrow$ Save (Rating will be *Everyone / 3+*).
   - **Target Audience:** Select *13+* or *All ages*.
   - **News Apps:** Select *No*.
   - **COVID-19 Contact Tracing:** Select *No*.
   - **Financial Features:** Select *None*.
   - **Government Apps:** Select *No*.

---

## 🛡️ Phase 7: Data Safety, Privacy Policy & Compliance

Google Play Data Safety form me declare karein:

| Data Type | Collected / Shared | Purpose | Ephemeral? |
| :--- | :--- | :--- | :--- |
| **Approximate / Precise Location** | Collected (On-Device only) | App functionality (Nearby Stations & Arrival Alarm) | Not stored on server |
| **Photos / Media** | Processed On-Device | QR Code extraction & Ticket storage | Stored locally in IndexedDB/LocalStorage |
| **Camera** | Processed On-Device | Live QR ticket scanning | No photos transmitted |

---

## 👥 Phase 8: Closed Testing (12/20 Testers) & Production Rollout

### 1. Upload to Closed Testing Track:
1. Play Console left menu $\rightarrow$ **Testing $\rightarrow$ Closed testing**.
2. Click **Create track** (or select default *Alpha / Closed testing*).
3. Click **Create new release**.
4. Drag & drop your signed `app-release.aab`.
5. Release name: `1.0.0 (Initial Release)`.
6. Add Release notes.
7. Click **Next $\rightarrow$ Save $\rightarrow$ Start rollout to Closed testing**.

### 2. Adding Testers:
1. Under Closed testing, open the **Testers** tab.
2. Create an Email List (Add Gmail IDs of 12-20 friends/family).
3. Copy the **Join on Android / Join on the web** opt-in link and share with testers.
4. Testers must install the app and keep it installed for 14 continuous days.

### 3. Apply for Production:
14 days complete hone ke baad Play Console dashboard par **Apply for Production** button activate ho jayega. Click karke production approval request submit karein.

---

## 🔄 Future Updates & Versioning Checklist

Jab bhi aap koi naya feature ya bug fix release karein:

1. Code changes complete karein aur test karein.
2. `android/app/build.gradle` me:
   - `versionCode` ko `1` se badhakar `2` karein.
   - `versionName` ko `"1.0.1"` ya `"1.1.0"` karein.
3. Sync & Build naya `.aab`:
   ```powershell
   npx cap sync android
   ```
4. Android Studio se Signed Bundle generate karein.
5. Play Console $\rightarrow$ **Production $\rightarrow$ Create new release** me nayi `.aab` upload karein.
6. Submit for review (Updates usually approve within 4-24 hours).
