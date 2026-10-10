/**
 * 🎨 LivePreviewService - Enterprise Headless Component Cloner
 * Fetches real application HTML pages (cached once in memory), extracts live components via DOMParser,
 * sanitizes unique IDs to avoid collision with help page DOM, wraps them in a safe dummy visual frame,
 * and synchronizes translations and theme states reactively.
 */
import { HELP_PREVIEW_REGISTRY } from "../config/help-previews.config.js";
import i18n from "../core/i18n.js";

export class LivePreviewService {
	// In-memory document cache to prevent redundant HTTP network requests
	static #cache = new Map();

	/**
	 * 🚀 Initialize and mount all registered live UI previews
	 */
	static async mountAll() {
		for (const entry of HELP_PREVIEW_REGISTRY) {
			try {
				await this.mount(entry);
			} catch (err) {
				console.warn(`[LivePreviewService] Failed to mount preview "${entry.id}":`, err);
			}
		}
	}

	/**
	 * 📦 Mount a single live component preview
	 * @param {Object} entry Registry entry configuration
	 */
	static async mount(entry) {
		const container = document.getElementById(entry.targetContainerId);
		if (!container) return;

		// 1. Fetch & parse source HTML document (cached in memory) or query live rendered DOM
		let sourceEl = null;
		if (entry.sourcePage === "CURRENT_DOM") {
			sourceEl = document.querySelector(entry.sourceSelector);
		} else {
			let doc = this.#cache.get(entry.sourcePage);
			if (!doc) {
				const response = await fetch(entry.sourcePage);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status} fetching ${entry.sourcePage}`);
				}
				const htmlText = await response.text();
				doc = new DOMParser().parseFromString(htmlText, "text/html");
				this.#cache.set(entry.sourcePage, doc);
			}
			sourceEl = doc.querySelector(entry.sourceSelector);
		}

		if (!sourceEl) {
			console.warn(`[LivePreviewService] Selector "${entry.sourceSelector}" not found in ${entry.sourcePage}`);
			return;
		}

		// 3. Clone deep and sanitize IDs to prevent DOM ID collisions
		const clone = sourceEl.cloneNode(true);
		this.#sanitizeElement(clone);

		// Enrich mockups with realistic preview data
		if (entry.id === "speedometer") {
			clone.setAttribute("data-motion", "CRUISING");
			const numEl = clone.querySelector(".speed-number");
			if (numEl) numEl.textContent = "45.8";
		} else if (entry.id === "alarm-widget") {
			clone.classList.remove("is-inactive");
			const stationEl = clone.querySelector(".alarm-station-name");
			if (stationEl) {
				stationEl.textContent = "Rajiv Chowk";
				stationEl.removeAttribute("data-i18n");
			}
			const statusEl = clone.querySelector(".alarm-status-label");
			if (statusEl) {
				statusEl.textContent = "ACTIVE";
				statusEl.removeAttribute("data-i18n");
			}
			const distEl = clone.querySelector("#alarmLiveDistance") || clone.querySelector(".alarm-distance-badge span:last-child");
			if (distEl) distEl.textContent = "450 m";
		} else if (entry.id === "setting-packs") {
			const listGroup = clone.querySelector(".packs-list-group");
			if (listGroup) {
				listGroup.innerHTML = `
					<div class="pack-item-row">
						<div class="settings-label-wrapper">
							<span class="settings-label">🇮🇳 हिन्दी (Hindi Pack)</span>
							<span class="pack-meta-text">Northern Region • ~140 KB</span>
						</div>
						<div class="pack-action-wrapper">
							<span class="btn-settings-action btn-pack-download" style="cursor: default; pointer-events: none; padding: 4px 10px; font-size: 11px;">📥 Download</span>
						</div>
					</div>
				`;
			}
		}

		// 4. Wrap inside live-mockup-frame (treat as living visual blueprint)
		const frame = document.createElement("div");
		frame.className = "live-ui-mockup-frame";
		frame.setAttribute("role", "img");
		frame.setAttribute("aria-label", entry.description || "Live UI Component Preview");

		// Settings fieldsets require their scoped panel ancestor (.settings-tab-panel[data-panel="..."])
		// to trigger 100% of existing CSS rules without copying or duplicating styles.
		if (entry.id.startsWith("setting-")) {
			const panelName = entry.id.replace("setting-", "");
			const panelWrapper = document.createElement("div");
			panelWrapper.className = "settings-tab-panel active";
			panelWrapper.setAttribute("data-panel", panelName);
			panelWrapper.appendChild(clone);
			frame.appendChild(panelWrapper);
		} else if (entry.id === "header-toolbar") {
			// Ensure dropdown popovers & panels remain closed in the visual mockup
			clone.querySelectorAll(".custom-dropdown-menu, .font-scale-panel").forEach((panel) => {
				panel.classList.remove("show");
			});
			// Header toolbar requires its scoped header ancestor (<header class="main-header">)
			// to trigger 100% of existing header.css rules without duplicating styles.
			const headerWrapper = document.createElement("header");
			headerWrapper.className = "main-header";
			headerWrapper.appendChild(clone);
			frame.appendChild(headerWrapper);
		} else {
			frame.appendChild(clone);
		}

		// 5. Render into container & apply active i18n translation
		container.replaceChildren(frame);
		if (typeof i18n?.translateDOM === "function") {
			i18n.translateDOM(container);
		}
	}

	/**
	 * 🛡️ Strip IDs and disable interactive elements to keep it as a safe visual mockup
	 * @param {HTMLElement} element 
	 */
	static #sanitizeElement(element) {
		element.removeAttribute("id");
		element.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));

		// Ensure all buttons/links are disabled for interaction
		element.querySelectorAll("button, a, input, select").forEach((interactive) => {
			interactive.setAttribute("tabindex", "-1");
			interactive.setAttribute("aria-hidden", "true");
			if ("disabled" in interactive) {
				interactive.setAttribute("disabled", "true");
			}
		});
	}
}
