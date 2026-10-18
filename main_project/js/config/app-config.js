/**
 * 🌐 Global Application Configuration & Canonical URL Hub
 * Single Source of Truth for Domain, Endpoints & Media Channels
 */
export const APP_CONFIG = Object.freeze({
	// 🎯 Base Canonical URL
	CANONICAL_BASE_URL: "https://raaz2507.github.io/metro_Map_n_Route-Finder/",

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
