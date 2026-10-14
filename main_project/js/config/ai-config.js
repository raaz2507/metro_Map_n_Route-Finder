/**
 * ⚙️ Disha AI Configuration
 * Centralized settings for Disha AI services, endpoints, and SLAs.
 */

export const AI_CONFIG = {
	// Google Apps Script Web App Endpoint for Feedback & Telemetry
	feedbackEndpoint: "https://script.google.com/macros/s/AKfycbzssuZyTEPqtXGU14jYVDemdF-vWIWos61Aoenkr2YvOnkv9wuNEmwkrzII5qO57bgLIQ/exec",

	// Queue Settings for Offline-First PWA/APK
	queue: {
		maxPendingSize: 50,
		autoSyncOnReconnect: true,
		syncIntervalMs: 10000
	},

	// Session & Storage Constraints
	storage: {
		maxChats: 25,
		maxPinned: 13,
		smartTitleMaxChars: 40
	},

	// Latency SLA Benchmark
	sla: {
		maxResolutionMs: 60
	}
};

export default AI_CONFIG;
