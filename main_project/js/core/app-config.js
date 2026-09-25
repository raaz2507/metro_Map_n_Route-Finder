/**
 * 🌐 Global Application Configuration & Canonical URL Hub
 * Single Source of Truth for Domain & App Endpoints
 */
export const APP_CONFIG = Object.freeze({
	// 🎯 Jab naya domain mile, to sirf yahan change karein:
	CANONICAL_BASE_URL: "https://raaz2507.github.io/metro_Map_n_Route-Finder/",

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