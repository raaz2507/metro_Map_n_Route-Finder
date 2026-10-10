/**
 * 📋 Help Living UI Component Preview Registry
 * Single Source of Truth for live component visual mockups embedded in help guides.
 * Dynamically cloned from application source pages to guarantee 100% theme,
 * language, and layout synchronization without duplicating HTML/CSS code or relying on static images.
 */
export const HELP_PREVIEW_REGISTRY = Object.freeze([
	{
		id: "sidebar-nav",
		sourcePage: "index.html",
		sourceSelector: "#sidebar-nav",
		targetContainerId: "live-mockup-sidebar-nav",
		description: "Home page side dock navigation pill bar"
	},
	{
		id: "route-priority",
		sourcePage: "index.html",
		sourceSelector: ".route-priority",
		targetContainerId: "live-mockup-route-priority",
		description: "Route Finder Priority Selector (Shortest vs Less Interchange)"
	},
	{
		id: "recent-chips",
		sourcePage: "index.html",
		sourceSelector: "#recent-searches .filter-chips",
		targetContainerId: "live-mockup-recent-chips",
		description: "Recent Searches filter chips (Recent, Most Used, A-Z)"
	},
	{
		id: "settings-tabs",
		sourcePage: "index.html",
		sourceSelector: ".settings-folder-tabs",
		targetContainerId: "live-mockup-settings-tabs",
		description: "App Settings folder tabs (Alarm, Map, Packs, Backup)"
	},
	{
		id: "speedometer",
		sourcePage: "index.html",
		sourceSelector: "#speedometer-widget",
		targetContainerId: "live-mockup-speedometer",
		description: "Live Speedometer telemetry widget"
	},
	{
		id: "alarm-widget",
		sourcePage: "index.html",
		sourceSelector: "#alarmWidget",
		targetContainerId: "live-mockup-alarm-widget",
		description: "2.5D Unified Metro Alarm Tracker Widget with Notch & LED Display"
	},
	{
		id: "setting-alarm",
		sourcePage: "index.html",
		sourceSelector: "#panel-setting-alarm .settings-fieldset:first-child",
		targetContainerId: "live-mockup-setting-alarm",
		description: "Alarm Geofence & Arrival Trigger Controls"
	},
	{
		id: "setting-map",
		sourcePage: "index.html",
		sourceSelector: "#panel-setting-map .settings-fieldset",
		targetContainerId: "live-mockup-setting-map",
		description: "Map Display & Line Toggles Fieldset"
	},
	{
		id: "setting-packs",
		sourcePage: "index.html",
		sourceSelector: "#panel-setting-packs .settings-fieldset:first-of-type",
		targetContainerId: "live-mockup-setting-packs",
		description: "Language & Theme Packs Manager Fieldset"
	},
	{
		id: "setting-backup",
		sourcePage: "index.html",
		sourceSelector: "#panel-setting-backup .settings-fieldset",
		targetContainerId: "live-mockup-setting-backup",
		description: "Backup & Restore Action Bar Fieldset"
	},
	{
		id: "header-toolbar",
		sourcePage: "CURRENT_DOM",
		sourceSelector: ".toolbar",
		targetContainerId: "live-mockup-header-toolbar",
		description: "Universal Header Utility Toolbar (Themes, Language, Font Scale)"
	},
	{
		id: "footer-pass",
		sourcePage: "CURRENT_DOM",
		sourceSelector: ".footer-pass-card",
		targetContainerId: "live-mockup-footer-pass",
		description: "2.5D Mobile Pass & QR Code Commuter Card"
	},
	{
		id: "pwa-banner",
		sourcePage: "index.html",
		sourceSelector: "#pwa-install-banner",
		targetContainerId: "live-mockup-pwa-banner",
		description: "Progressive Web App (PWA) Direct Install Banner"
	}
]);
