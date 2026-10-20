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
		 * 2 stations ke beech coordinate distance / gap badhane ke liye scale multiplier.
		 * Is multiplier ko badhane se map me stations ke beech ki doori scale hoti hai.
		 * (Pahle ye variable map JS me `#scaleMultiplier = 2.0` ke roop me declare tha).
		 */
		SCALE_MULTIPLIER: 2.2,

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
