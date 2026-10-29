/**
 * 🌐 Global Application Configuration & Canonical URL Hub
 * Single Source of Truth for Domain, Endpoints & Media Channels
 */
export const APP_CONFIG = Object.freeze({
	// 🎯 Base Canonical URL
	CANONICAL_BASE_URL: "https://raaz2507.github.io/metro_Map_n_Route-Finder/",

	// 🗺️ Metro Map Coordinate & Spacing Configuration
	MAP: {
		/**
		 * 🗺️ 2D & 2.5D Scale Multiplier
		 * 2 stations ke beech coordinate distance / gap badhane ke liye scale multiplier.
		 * Is multiplier ko badhane se map me stations ke beech ki doori scale hoti hai.
		 * (Pahle ye variable map JS me `#scaleMultiplier = 2.0` ke roop me declare tha).
		 */
		SCALE_MULTIPLIER: 2.2,

		/**
		 * 🚇 Canonical Real-World Metric Dimensions (In Actual Meters)
		 * Shared across 2D, 2.5D, and 3D visualizers for unified geometric ratios:
		 * Real DMRC standards: Elevated viaduct rail level ~14m, Underground subway depth ~-16m.
		 */
		REAL_METERS: {
			VIADUCT_HEIGHT: 14.0,       // Standard elevated metro viaduct rail level (+14m DMRC standard)
			UNDERGROUND_DEPTH: -16.0,   // Standard underground tunnel depth (-16m DMRC standard)
			CUT_AND_COVER_DEPTH: -7.0,  // Shallow cut-and-cover trench (-7m)
			AT_GRADE_HEIGHT: 0.0,       // Surface / At-grade track datum (0m)
			TRACK_WIDTH: 2.8,           // Double-track standard gauge corridor width (~2.8m)
			STATION_LENGTH: 80.0,       // Station canopy length (80 meters)
			STATION_WIDTH: 18.0,        // Station platform width (18 meters)
			STATION_RADIUS_NORMAL: 12.0,// Standard station footprint radius in meters
			STATION_RADIUS_INTER: 18.0, // Interchange junction hub radius in meters
		},

		/**
		 * 🌐 3D Map Specific Settings (Real-World Geographic Scale)
		 */
		THREE_D: {
			/**
			 * 📏 1. REAL-WORLD SCALE RATIO (पैमाना / Scale Ratio)
			 * 1 Three.js 3D Unit = Real-World Me Kitne Meters
			 * -------------------------------------------------------------
			 * • 15.0 = (1:15 Ratio) => Stations ke beech sabse zyada doori (~70 units gap)
			 * • 22.0 = (1:22 Ratio) => (Recommended) Balanced realistic scale (~50 units gap)
			 * • 35.0 = (1:35 Ratio) => Thoda compact map (~30 units gap)
			 * • 50.0 = (1:50 Ratio) => Dense city view (~20 units gap)
			 * 
			 * 💡 NOTE: Is number ko chhota karne par (e.g. 15 ya 18) stations aapas me DOOR honge.
			 * Is number ko bada karne par (e.g. 30 ya 40) stations aapas me PAAS aayenge.
			 */
			METERS_PER_UNIT: 22.0,

			/**
			 * 🏔️ 2. VERTICAL HEIGHT EXAGGERATION (ऊंचाई का विज़ुअल मल्टीप्लायर)
			 * 80km ke horizontal map me vertical flyovers aur tunnels ko
			 * aakarshak aur saaf dikhane ke liye height multiplier:
			 * • 1.0 = Pure 100% True Scale (Flyovers ~14m => 0.63 units)
			 * • 9.5 = (Recommended) Cinematic Transit Look (Flyovers ~6.0 units high, tunnels ~-6.9 units deep)
			 */
			VERTICAL_EXAGGERATION: 9.5,

			/**
			 * 🚇 3. REAL-WORLD ASSET DIMENSIONS (In Actual Meters)
			 * Synchronized with canonical MAP.REAL_METERS
			 */
			REAL_METERS: {
				VIADUCT_HEIGHT: 14.0,       // 2-floor elevated metro rail level (+14m)
				UNDERGROUND_DEPTH: -16.0,   // Standard underground subway depth (-16m)
				CUT_AND_COVER_DEPTH: -7.0,  // Cut-and-cover shallow trench (-7m)
				UNDERGROUND_DEPTH_3D: -1.60, // Half-floor visual depth in 3D scene units (subtle excavation trench)
				CUT_AND_COVER_DEPTH_3D: -0.90, // Shallow cut-and-cover trench in 3D units
				AT_GRADE_HEIGHT: 0.0,       // Surface / At-grade track datum (0m)
				STATION_LENGTH: 80.0,       // Station canopy ki lambai (Meters)
				STATION_WIDTH: 18.0,        // Station platform ki chaudaai (Meters)
				TRACK_WIDTH: 2.8,           // Metro track / viaduct ribbon width (Meters)
			},

			/**
			 * 🏛️ 4. PILLAR SPACING & SLIM SCALE
			 * Do pillars ke beech ki 3D doori aur chaudaai:
			 * • PILLAR_SPACING = 9.0 => 2 stations ke beech ~5-6 khule aur sundar pillars
			 * • PILLAR_SCALE = 0.28 => Slim 0.84m pillar width (khula haawadaar gap)
			 */
			PILLAR_SPACING: 9.0,
			PILLAR_SCALE: 0.28,
		},

		/**
		 * 🎛️ 2.5D Camera Orbit & Gesture Limits (Degrees)
		 * Left-Right (Horizontal Rotation / Bearing) aur Up-Down (Vertical Pitch / Tilt) dono ke liye limits:
		 */
		CAMERA_LIMITS: {
			// 🔄 1. Left-Right (Horizontal Rotation / Bearing)
			// -ve = Left turn, +ve = Right turn
			// e.g. { MIN: -45, MAX: 45 } => Sirf ±45° ghumega
			// e.g. { MIN: -180, MAX: 180 } => Full 360° free rotation
			// e.g. { MIN: 0, MAX: 0 } => Bilkul lock
			BEARING: {
				MIN: -45,  // Left-most limit (-ve degrees)
				MAX: 45,   // Right-most limit (+ve degrees)
			},

			// 📐 2. Up-Down (Vertical Tilt / Pitch)
			// 0° = Flat horizon (ground level), 90° = Direct top-down (perpendicular)
			// e.g. { MIN: 20, MAX: 65 } => Camera flips upside down hone se bachega
			// e.g. { MIN: 48, MAX: 48 } => Tilt bilkul lock rahega
			PITCH: {
				MIN: 20,   // Minimum tilt (nearly flat / ground view)
				MAX: 65,   // Maximum tilt (top-down view)
			}
		},
	},

	// 📺 Official Social & Media Channels
	YOUTUBE: {
		HANDLE: "@YatraMarg_app",
		CHANNEL_URL: "https://www.youtube.com/@YatraMarg_app",
		SHORTS_URL: "https://www.youtube.com/@YatraMarg_app/shorts"
	},

	/**
	 * Web, Localhost aur Native App me hamesha sahi shareable base URL return karega
	 * @param {string} path - Optional sub-page path
	 * @returns {string} Fully-qualified absolute URL
	 */
	getBaseUrl(path = "") {
		const isNativeOrLocal = window.location.origin.includes("localhost") || 
			(window.Capacitor && window.Capacitor.isNativePlatform());
		
		const base = isNativeOrLocal 
			? this.CANONICAL_BASE_URL 
			: `${window.location.origin}${window.location.pathname}`;

		const cleanBase = base.endsWith("/") ? base : `${base}/`;
		return path ? `${cleanBase}${path.replace(/^\//, "")}` : cleanBase;
	}
});

export default APP_CONFIG;
