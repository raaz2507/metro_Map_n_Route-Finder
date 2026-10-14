/**
 * 🛰️ DishaAiFeedbackService - Resilient Offline-First Feedback Sync Engine
 * Handles:
 * 1. Immediate dispatch when online
 * 2. Atomic offline queue in localStorage when offline
 * 3. Automatic synchronization when device reconnects ('online' event)
 * 4. Deduplication safeguards and sync locks
 */

import { appStateStore } from "../../core/app-state-store.js";
import { AI_CONFIG } from "../../config/ai-config.js";

const FEEDBACK_QUEUE_KEY = "disha_feedback_pending_queue";
const MAX_QUEUE_SIZE = AI_CONFIG.queue?.maxPendingSize || 50;

export const DEFAULT_SHEET_ENDPOINT = AI_CONFIG.feedbackEndpoint;

export class DishaAiFeedbackService {
	static #isSyncing = false;
	static #isInitialized = false;

	/**
	 * Initialize online reconnection listener
	 */
	static init() {
		if (this.#isInitialized || typeof window === "undefined") return;
		this.#isInitialized = true;

		// Listen for device coming back online
		window.addEventListener("online", () => {
			this.flushQueue();
		});

		// Trigger sync on boot if online
		if (navigator.onLine) {
			setTimeout(() => this.flushQueue(), 3000);
		}
	}

	/**
	 * Get active feedback webhook endpoint URL
	 */
	static getEndpointUrl() {
		return localStorage.getItem("disha_feedback_endpoint_url") || DEFAULT_SHEET_ENDPOINT;
	}

	/**
	 * Set custom Google Apps Script Web App URL
	 */
	static setEndpointUrl(url) {
		if (url && typeof url === "string") {
			localStorage.setItem("disha_feedback_endpoint_url", url.trim());
		}
	}

	/**
	 * Queue or immediately send user feedback
	 * @param {Object} payload - { query, botText, isSuccess, lang, feedbackType, cityKey }
	 */
	static async recordAndSync(payload) {
		this.init();

		const entry = {
			id: "fb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
			timestamp: new Date().toISOString(),
			query: (payload.query || "").trim(),
			botResponse: (payload.botText || "").trim(),
			isSuccess: Boolean(payload.isSuccess),
			feedbackType: payload.feedbackType || (payload.isSuccess ? "up" : "down"),
			lang: payload.lang || "en",
			network: payload.cityKey || appStateStore.getState("currentCity") || "delhi_ncr",
			synced: false
		};

		// 1. Try immediate send if online
		if (typeof navigator !== "undefined" && navigator.onLine) {
			const sent = await this.#sendToSheet(entry);
			if (sent) {
				return { queued: false, sent: true, id: entry.id };
			}
		}

		// 2. Fallback to offline queue
		this.#enqueue(entry);
		return { queued: true, sent: false, id: entry.id };
	}

	/**
	 * Push entry to offline queue with deduplication and size cap
	 */
	static #enqueue(entry) {
		try {
			const queue = this.getPendingQueue();
			// Prevent duplicate submission of identical query within short window
			const duplicate = queue.find(item => item.query === entry.query && item.feedbackType === entry.feedbackType);
			if (duplicate) return;

			queue.push(entry);
			if (queue.length > MAX_QUEUE_SIZE) {
				queue.shift(); // Evict oldest
			}
			localStorage.setItem(FEEDBACK_QUEUE_KEY, JSON.stringify(queue));
		} catch (e) {
			console.warn("[DishaAiFeedbackService] Failed to enqueue feedback:", e);
		}
	}

	/**
	 * Read pending queue
	 */
	static getPendingQueue() {
		try {
			const raw = localStorage.getItem(FEEDBACK_QUEUE_KEY);
			if (!raw) return [];
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed : [];
		} catch (e) {
			return [];
		}
	}

	/**
	 * Flush pending queue when online
	 */
	static async flushQueue() {
		if (this.#isSyncing) return;
		if (typeof navigator !== "undefined" && !navigator.onLine) return;

		const queue = this.getPendingQueue();
		if (queue.length === 0) return;

		this.#isSyncing = true;
		const remaining = [];

		for (const item of queue) {
			const ok = await this.#sendToSheet(item);
			if (!ok) {
				remaining.push(item);
			}
		}

		try {
			if (remaining.length === 0) {
				localStorage.removeItem(FEEDBACK_QUEUE_KEY);
			} else {
				localStorage.setItem(FEEDBACK_QUEUE_KEY, JSON.stringify(remaining));
			}
		} catch (e) {
			console.warn("[DishaAiFeedbackService] Failed to update queue:", e);
		} finally {
			this.#isSyncing = false;
		}
	}

	/**
	 * Send individual entry to Google Sheets Web App
	 */
	static async #sendToSheet(entry) {
		const endpoint = this.getEndpointUrl();
		if (!endpoint || endpoint.includes("YOUR_DEPLOYMENT_ID_HERE")) {
			// Endpoint not yet configured by developer, keep in local queue safely
			return false;
		}

		try {
			// Using text/plain mode prevents CORS preflight in Google Apps Script
			const response = await fetch(endpoint, {
				method: "POST",
				mode: "no-cors",
				headers: {
					"Content-Type": "text/plain;charset=utf-8"
				},
				body: JSON.stringify({
					action: "log_feedback",
					data: entry
				})
			});
			// In no-cors mode, successful dispatch gives type 'opaque' with status 0
			return true;
		} catch (err) {
			console.warn("[DishaAiFeedbackService] Sync attempt failed:", err);
			return false;
		}
	}
}
