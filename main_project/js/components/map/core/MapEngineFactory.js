/**
 * 🏭 MapEngineFactory.js - Pluggable Registry & Factory for Metro Map Engines
 * 
 * Implements the Factory + Registry Strategy Pattern to dynamically instantiate
 * and manage map engines (2D Canvas, 2.5D Isometric, 3D WebGL, 4th Vector GIS).
 * Enables seamless addition of new visualizers with zero coupling to core UI logic.
 */

import { BaseMapEngine } from "./BaseMapEngine.js";

export class MapEngineFactory {
	/**
	 * Internal map engine registry storing:
	 * { modeKey: { EngineClass, label, icon, is3D, description } }
	 */
	static #registry = new Map();

	/**
	 * Registers a new map engine class under a unique mode identifier.
	 * 
	 * @param {string} modeKey - Unique key, e.g. "2d", "2.5d", "3d", "vector-gis"
	 * @param {typeof BaseMapEngine} EngineClass - Class extending BaseMapEngine
	 * @param {Object} [meta={}] - UI metadata for the view mode widget
	 * @param {string} [meta.label] - Display label (e.g. "2D", "3D")
	 * @param {string} [meta.icon] - Emoji/SVG icon (e.g. "📐", "🎮")
	 * @param {boolean} [meta.is3D=false] - Whether this engine uses 3D rendering
	 * @param {string} [meta.description=""] - Accessible description
	 */
	static register(modeKey, EngineClass, meta = {}) {
		if (!modeKey || typeof modeKey !== "string") {
			throw new Error("[MapEngineFactory] 'modeKey' must be a non-empty string.");
		}
		if (typeof EngineClass !== "function") {
			throw new Error(`[MapEngineFactory] EngineClass for '${modeKey}' must be a valid constructor.`);
		}

		this.#registry.set(modeKey.toLowerCase(), {
			EngineClass,
			label: meta.label || modeKey.toUpperCase(),
			icon: meta.icon || "🗺️",
			is3D: Boolean(meta.is3D),
			description: meta.description || `${meta.label || modeKey} Map View`
		});
	}

	/**
	 * Unregisters an engine mode.
	 * @param {string} modeKey
	 */
	static unregister(modeKey) {
		if (!modeKey) return false;
		return this.#registry.delete(modeKey.toLowerCase());
	}

	/**
	 * Checks if a specific mode is registered.
	 * @param {string} modeKey
	 * @returns {boolean}
	 */
	static has(modeKey) {
		if (!modeKey) return false;
		return this.#registry.has(modeKey.toLowerCase());
	}

	/**
	 * Creates an instance of the requested map engine.
	 * 
	 * @param {string} modeKey - The mode identifier ("2d", "2.5d", "3d", etc.)
	 * @param {Object} params - Initialization parameters passed to the engine constructor
	 * @returns {BaseMapEngine}
	 */
	static create(modeKey, params = {}) {
		const key = (modeKey || "2d").toLowerCase();
		const entry = this.#registry.get(key);

		if (!entry) {
			console.warn(`[MapEngineFactory] Mode '${modeKey}' not found in registry. Falling back to default.`);
			const firstEntry = this.#registry.values().next().value;
			if (!firstEntry) {
				throw new Error("[MapEngineFactory] No map engines have been registered.");
			}
			return new firstEntry.EngineClass(params);
		}

		return new entry.EngineClass(params);
	}

	/**
	 * Returns an array of metadata for all registered engines,
	 * allowing UI widgets to dynamically render mode switcher buttons.
	 * 
	 * @returns {Array<{ modeKey: string, label: string, icon: string, is3D: boolean, description: string }>}
	 */
	static getRegisteredModes() {
		const list = [];
		for (const [modeKey, entry] of this.#registry.entries()) {
			list.push({
				modeKey,
				label: entry.label,
				icon: entry.icon,
				is3D: entry.is3D,
				description: entry.description
			});
		}
		return list;
	}

	/**
	 * Clears the registry (useful for test resets).
	 */
	static clear() {
		this.#registry.clear();
	}
}
