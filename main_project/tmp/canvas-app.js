/**
 * ⚡ canvas-app.js - Standalone High-Performance 2.5D Controller
 * Directly loads transit data with auto-path discovery & fault tolerance.
 */

import { normalizeStationCoordinates } from "../js/core/data-utils.js";
import { MapCanvasRenderer } from "./MapCanvasRenderer.js";

document.addEventListener("DOMContentLoaded", async () => {
	const fpsBadge = document.getElementById("fpsBadge");
	const stationCountBadge = document.getElementById("stationCountBadge");
	const zoomLevelBadge = document.getElementById("zoomLevelBadge");
	const zoomOutput = document.getElementById("zoomOutput");
	const modeBadge = document.getElementById("modeBadge");
	const btnZoomIn = document.getElementById("btnZoomIn");
	const btnZoomOut = document.getElementById("btnZoomOut");
	const btnResetZoom = document.getElementById("btnResetZoom");
	const btnToggle25D = document.getElementById("btnToggle25D");

	const tooltip = document.getElementById("canvasTooltip");
	const tooltipStationName = document.getElementById("tooltipStationName");
	const tooltipLayoutBadge = document.getElementById("tooltipLayoutBadge");
	const tooltipLines = document.getElementById("tooltipLines");
	const tooltipStatus = document.getElementById("tooltipStatus");

	// Diagnostic status message helper
	const setStatus = (msg) => {
		if (stationCountBadge) stationCountBadge.textContent = msg;
		console.log(`[Canvas Testbed] ${msg}`);
	};

	try {
		setStatus("Loading transit network...");

		// 1. Robust data fetch with multiple path resolutions (handles root or /tmp/ subfolder)
		const networkPaths = [
			"../data/india/cities/delhi_ncr/transit_network.json",
			"./data/india/cities/delhi_ncr/transit_network.json",
			"/data/india/cities/delhi_ncr/transit_network.json",
			"data/india/cities/delhi_ncr/transit_network.json"
		];

		let rawData = null;
		for (const p of networkPaths) {
			try {
				const res = await fetch(p);
				if (res.ok) {
					rawData = await res.json();
					console.log(`[Canvas Testbed] Loaded network from: ${p}`);
					break;
				}
			} catch (_) {}
		}

		if (!rawData || !rawData.stationData) {
			throw new Error("Unable to locate transit_network.json at relative paths.");
		}

		// 2. Load station names locale
		const localePaths = [
			"../locales/en/india/delhi_ncr_station_details_locale.json",
			"./locales/en/india/delhi_ncr_station_details_locale.json",
			"/locales/en/india/delhi_ncr_station_details_locale.json",
			"locales/en/india/delhi_ncr_station_details_locale.json"
		];

		let localeData = null;
		for (const p of localePaths) {
			try {
				const res = await fetch(p);
				if (res.ok) {
					localeData = await res.json();
					break;
				}
			} catch (_) {}
		}

		// 3. Ensure coordinates are fully normalized (Decimal Lat/Lon)
		try {
			normalizeStationCoordinates(rawData);
		} catch (e) {
			console.warn("[Canvas Testbed] normalizeStationCoordinates notice:", e);
		}

		// 4. Attach display names to stations
		const stationData = rawData.stationData || {};
		Object.entries(stationData).forEach(([id, st]) => {
			const locName = localeData?.stations?.[id]?.name;
			const fallbackName = id
				.split("_")
				.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
				.join(" ");

			st.name = {
				en: locName || fallbackName,
				hi: localeData?.stations?.[id]?.name_hi || locName || fallbackName
			};
		});

		const count = Object.keys(stationData).length;
		setStatus(`Stations: ${count}`);

		// 5. Initialize Canvas Hardware Renderer
		const renderer = new MapCanvasRenderer({
			container: "#mapContainer",
			metroData: rawData,
			is25D: false
		});

		// 6. Connect Live Diagnostic & FPS Callbacks
		renderer.onFpsUpdate = (fps) => {
			if (fpsBadge) {
				fpsBadge.textContent = `${fps} FPS`;
				if (fps >= 55) {
					fpsBadge.style.color = "#34d399";
					fpsBadge.style.borderColor = "rgba(16, 185, 129, 0.4)";
				} else {
					fpsBadge.style.color = "#f59e0b";
					fpsBadge.style.borderColor = "rgba(245, 158, 11, 0.4)";
				}
			}
		};

		const updateZoomUI = (zoom) => {
			const pct = `${Math.round(zoom * 100)}%`;
			if (zoomLevelBadge) zoomLevelBadge.textContent = `Zoom: ${pct}`;
			if (zoomOutput) zoomOutput.textContent = pct;
		};

		renderer.onTransformChange = ({ zoom }) => {
			updateZoomUI(zoom);
		};

		// 7. Connect Hover Tooltip
		renderer.onStationHover = (st, clientX, clientY) => {
			if (!st) {
				if (tooltip) tooltip.hidden = true;
				return;
			}

			if (tooltip && tooltipStationName) {
				const name = st.name?.en || st.id;
				tooltipStationName.textContent = name;

				const layout = st.properties?.layout || "elevated";
				tooltipLayoutBadge.textContent = layout.toUpperCase();
				tooltipLayoutBadge.className = `layout-badge layout-${layout}`;

				const lines = (st.lines || []).join(", ");
				tooltipLines.textContent = `Lines: ${lines}`;

				const status = st.properties?.status || "operational";
				tooltipStatus.textContent = status.replace(/_/g, " ").toUpperCase();

				tooltip.style.left = `${clientX}px`;
				tooltip.style.top = `${clientY}px`;
				tooltip.hidden = false;
			}
		};

		// 8. Connect Click Event
		renderer.onStationClick = (st) => {
			console.log("[Canvas Map] Station clicked:", st);
		};

		// 9. Connect Controls
		if (btnZoomIn) {
			btnZoomIn.addEventListener("click", () => {
				renderer.setZoom(renderer.zoom * 1.3);
				updateZoomUI(renderer.zoom);
			});
		}

		if (btnZoomOut) {
			btnZoomOut.addEventListener("click", () => {
				renderer.setZoom(renderer.zoom / 1.3);
				updateZoomUI(renderer.zoom);
			});
		}

		if (btnResetZoom) {
			btnResetZoom.addEventListener("click", () => {
				renderer.fitToScreen(renderer.is25D ? 2.0 : 1.0);
				updateZoomUI(renderer.zoom);
			});
		}

		if (btnToggle25D) {
			btnToggle25D.addEventListener("click", () => {
				const is25 = renderer.toggle25D();
				btnToggle25D.classList.toggle("active", is25);
				btnToggle25D.textContent = is25 ? "2D" : "2.5D";
				if (modeBadge) {
					modeBadge.textContent = is25 ? "Mode: 2.5D Flight Deck" : "Mode: 2D";
				}
				updateZoomUI(renderer.zoom);
			});
		}

	} catch (err) {
		console.error("[Canvas Testbed] Failed to initialize:", err);
		setStatus(`Error: ${err.message}`);
		const container = document.getElementById("mapContainer");
		if (container) {
			container.innerHTML = `
				<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#f87171; text-align:center; padding:20px; font-family:sans-serif;">
					<h3 style="margin-bottom:10px;">⚠️ Failed to load Metro Data</h3>
					<p style="color:#94a3b8; max-width:500px; font-size:14px; margin-bottom:15px;">${err.message}</p>
					<button onclick="location.reload()" style="background:#3b82f6; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Retry</button>
				</div>
			`;
		}
	}
});
