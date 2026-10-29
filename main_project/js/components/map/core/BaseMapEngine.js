/**
 * 🗺️ BaseMapEngine.js - Abstract Base Engine Interface for Metro Map Visualizers
 * 
 * Defines the standard lifecycle, interaction, and styling contract that all map
 * rendering engines (2D Canvas, 2.5D Isometric Canvas, 3D WebGL / Three.js,
 * and future 4th GIS / Vector engines) must implement.
 */

import { MapGeometry } from "./MapGeometry.js";

export class BaseMapEngine {
	#container = null;
	#metroData = null;
	#options = {};

	/**
	 * @param {Object} params
	 * @param {HTMLElement|string} params.container - Container DOM element or selector
	 * @param {Object} params.metroData - Normalized metro network dataset
	 * @param {Object} [params.options={}] - Engine-specific options & configuration
	 */
	constructor({ container, metroData, ...options } = {}) {
		if (new.target === BaseMapEngine) {
			throw new TypeError("[BaseMapEngine] Cannot instantiate abstract class BaseMapEngine directly.");
		}

		this.#container = typeof container === "string" ? (typeof document !== "undefined" ? document.querySelector(container) : null) : container;
		this.#metroData = metroData || {};
		this.#options = options || {};

		// Standard Event Callbacks
		this.onStationClick = null;
		this.onStationHover = null;
		this.onTransformChange = null;
		this.onFpsUpdate = null;
	}

	get container() {
		return this.#container;
	}

	set container(val) {
		this.#container = typeof val === "string" ? (typeof document !== "undefined" ? document.querySelector(val) : null) : val;
	}

	get metroData() {
		return this.#metroData;
	}

	set metroData(val) {
		this.#metroData = val || {};
	}

	get options() {
		return this.#options;
	}

	// =========================================================================
	// 1. Lifecycle Methods (Must be implemented by subclasses)
	// =========================================================================

	/**
	 * Initializes the rendering engine, DOM elements, and event bindings.
	 */
	init() {
		throw new Error(`[${this.constructor.name}] Method 'init()' must be implemented.`);
	}

	/**
	 * Destroys the engine, disposes shaders/textures/contexts, and tears down event listeners.
	 */
	destroy() {
		throw new Error(`[${this.constructor.name}] Method 'destroy()' must be implemented.`);
	}

	/**
	 * Handles viewport resize events.
	 */
	resize() {
		throw new Error(`[${this.constructor.name}] Method 'resize()' must be implemented.`);
	}

	/**
	 * Requests a render frame (dirty-check render trigger).
	 */
	requestRender() {
		throw new Error(`[${this.constructor.name}] Method 'requestRender()' must be implemented.`);
	}

	// =========================================================================
	// 2. Viewport & Camera Control Methods
	// =========================================================================

	/**
	 * Gets current zoom scale.
	 * @returns {number}
	 */
	get zoom() {
		return 1.0;
	}

	/**
	 * Sets the zoom level.
	 * @param {number} val
	 */
	setZoom(val) {
		throw new Error(`[${this.constructor.name}] Method 'setZoom(val)' must be implemented.`);
	}

	/**
	 * Sets viewport panning offset.
	 * @param {number} x
	 * @param {number} y
	 */
	setPan(x, y) {
		throw new Error(`[${this.constructor.name}] Method 'setPan(x, y)' must be implemented.`);
	}

	/**
	 * Centers and fits the network into view.
	 * @param {number} [paddingRatio=1.0]
	 */
	fitToScreen(paddingRatio = 1.0) {
		throw new Error(`[${this.constructor.name}] Method 'fitToScreen(paddingRatio)' must be implemented.`);
	}

	// =========================================================================
	// 3. Route Highlighting & Filtering Methods
	// =========================================================================

	/**
	 * Highlights an active route path through the network.
	 * @param {Array<string>|Object} path - Array of station IDs or route object
	 */
	highlightRoute(path) {
		throw new Error(`[${this.constructor.name}] Method 'highlightRoute(path)' must be implemented.`);
	}

	/**
	 * Clears active route highlight and restores default network visibility.
	 */
	clearRoute() {
		throw new Error(`[${this.constructor.name}] Method 'clearRoute()' must be implemented.`);
	}

	/**
	 * Toggles active route visibility on or off without clearing data.
	 */
	toggleRouteVisibility() {
		throw new Error(`[${this.constructor.name}] Method 'toggleRouteVisibility()' must be implemented.`);
	}

	/**
	 * Highlights a single transit line and dims others.
	 * @param {string|null} lineId
	 */
	highlightLine(lineId) {
		throw new Error(`[${this.constructor.name}] Method 'highlightLine(lineId)' must be implemented.`);
	}

	/**
	 * Highlights stations of a given structural layout (e.g. underground, elevated).
	 * @param {string|null} layout
	 */
	highlightLayout(layout) {
		throw new Error(`[${this.constructor.name}] Method 'highlightLayout(layout)' must be implemented.`);
	}

	/**
	 * Highlights stations by operational status (e.g. operational, under_construction).
	 * @param {string|null} status
	 */
	highlightStatus(status) {
		throw new Error(`[${this.constructor.name}] Method 'highlightStatus(status)' must be implemented.`);
	}

	/**
	 * Highlights stations by type (e.g. interchange, terminal).
	 * @param {string|null} stType
	 */
	highlightStationType(stType) {
		throw new Error(`[${this.constructor.name}] Method 'highlightStationType(stType)' must be implemented.`);
	}

	/**
	 * Configures map display visibility settings (e.g. showUnderConstruction, showApproved).
	 * @param {Object} [settings={}]
	 */
	setMapDisplaySettings(settings = {}) {
		// Optional hook for map visualizers
	}

	// =========================================================================
	// 4. Theme & Localization
	// =========================================================================

	/**
	 * Applies the visual color theme (light / dark).
	 * @param {string} theme
	 */
	setTheme(theme) {
		throw new Error(`[${this.constructor.name}] Method 'setTheme(theme)' must be implemented.`);
	}

	/**
	 * Sets the active language code for station labels.
	 * @param {string} lang
	 */
	setLanguage(lang) {
		throw new Error(`[${this.constructor.name}] Method 'setLanguage(lang)' must be implemented.`);
	}

	/**
	 * Returns true if system or application is currently in dark mode
	 * @returns {boolean}
	 */
	get isDarkMode() {
		return (typeof document !== "undefined") && (
			document.body.getAttribute("data-mode") === "dark" ||
			document.body.classList.contains("dark-mode") ||
			document.documentElement.classList.contains("dark")
		);
	}

	// =========================================================================
	// 5. Shared Metric Ratio & Infrastructure Classification (DRY Helpers)
	// =========================================================================

	/**
	 * Canonical infrastructure layout classifier (elevated, underground, cut_and_cover, surface)
	 * @param {string} layout
	 * @returns {"elevated"|"underground"|"cut_and_cover"|"surface"}
	 */
	classifyLayout(layout) {
		return MapGeometry.classifyLayout(layout);
	}

	/**
	 * Returns real-world elevation in meters (+14m, -16m, -7m, 0m)
	 * @param {string} layout
	 * @returns {number}
	 */
	getRealElevationMeters(layout) {
		return MapGeometry.getRealElevationMeters(layout);
	}

	/**
	 * Converts real-world meters to SVG world coordinate units
	 * @param {number} meters
	 * @returns {number}
	 */
	metersToWorldUnits(meters) {
		return MapGeometry.metersToWorldUnits(meters);
	}

	/**
	 * Converts SVG world coordinate units to real-world meters
	 * @param {number} units
	 * @returns {number}
	 */
	worldUnitsToMeters(units) {
		return MapGeometry.worldUnitsToMeters(units);
	}

	/**
	 * Layout check helpers
	 */
	isUnderground(layout) {
		const c = MapGeometry.classifyLayout(layout);
		return c === "underground" || c === "cut_and_cover";
	}

	isElevated(layout) {
		return MapGeometry.classifyLayout(layout) === "elevated";
	}

	isSurface(layout) {
		return MapGeometry.classifyLayout(layout) === "surface";
	}

	/**
	 * Computes visual elevation in engine units for a structural layout type
	 * Subclasses (CanvasRenderer, Metro3DEngine) override this to project into screen or 3D units.
	 * @param {string} layout
	 * @returns {number}
	 */
	getLayoutElevation(layout) {
		return 0;
	}
}
