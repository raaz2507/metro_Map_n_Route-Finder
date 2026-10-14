/**
 * 🧠 ConversationContext - Multi-Turn State Machine & Slot Tracker
 * Preserves active route context, handles follow-up resolution, and manages clarifications.
 */

export class ConversationContext {
	#sessionId = null;
	#currentIntent = null;
	#slots = {
		source: null,
		destination: null,
		station: null,
		line: null
	};
	#lastRouteResult = null;
	#pendingClarification = null;
	#history = [];

	constructor() {
		this.reset();
	}

	/**
	 * Reset conversation state (New Chat action)
	 */
	reset() {
		this.#sessionId = "session_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
		this.#currentIntent = null;
		this.#slots = {
			source: null,
			destination: null,
			station: null,
			line: null
		};
		this.#lastRouteResult = null;
		this.#pendingClarification = null;
		this.#history = [];
	}

	get sessionId() {
		return this.#sessionId;
	}

	get currentIntent() {
		return this.#currentIntent;
	}

	get slots() {
		return { ...this.#slots };
	}

	get lastRouteResult() {
		return this.#lastRouteResult;
	}

	get pendingClarification() {
		return this.#pendingClarification;
	}

	get history() {
		return [...this.#history];
	}

	setCurrentIntent(intent) {
		this.#currentIntent = intent;
	}

	/**
	 * Merge newly extracted slots into context
	 * @param {Object} newSlots 
	 */
	updateSlots(newSlots = {}) {
		if (newSlots.source) this.#slots.source = newSlots.source;
		if (newSlots.destination) this.#slots.destination = newSlots.destination;
		if (newSlots.station) this.#slots.station = newSlots.station;
		if (newSlots.line) this.#slots.line = newSlots.line;
	}

	/**
	 * Set pending clarification state (e.g. user needs to pick between candidates or provide source)
	 */
	setPendingClarification(clarification) {
		this.#pendingClarification = clarification;
	}

	clearPendingClarification() {
		this.#pendingClarification = null;
	}

	/**
	 * Store successful route result for subsequent follow-up queries
	 */
	saveRouteResult(routeData) {
		this.#lastRouteResult = routeData;
		if (routeData?.source) this.#slots.source = routeData.source;
		if (routeData?.destination) this.#slots.destination = routeData.destination;
		this.clearPendingClarification();
	}

	/**
	 * Resolve follow-up slots when user doesn't mention stations explicitly
	 * e.g., "किराया कितना है?" or "How much time will it take?"
	 */
	resolveFollowUpSlots(intent, newEntities) {
		let source = newEntities.source || this.#slots.source;
		let destination = newEntities.destination || this.#slots.destination;
		let station = newEntities.station || this.#slots.station;

		if ((!source || !destination) && this.#lastRouteResult) {
			if (!source) source = this.#lastRouteResult.source;
			if (!destination) destination = this.#lastRouteResult.destination;
		}

		if (!station && this.#lastRouteResult) {
			station = destination || source;
		}

		return { source, destination, station };
	}

	/**
	 * Swap source and destination for return trip
	 */
	getSwappedReturnSlots() {
		if (!this.#lastRouteResult && (!this.#slots.source || !this.#slots.destination)) {
			return null;
		}

		const src = this.#slots.source || this.#lastRouteResult?.source;
		const dst = this.#slots.destination || this.#lastRouteResult?.destination;

		if (!src || !dst) return null;

		return {
			source: dst,
			destination: src
		};
	}

	/**
	 * Record conversation turn
	 */
	recordTurn(userText, botResponse) {
		this.#history.push({
			timestamp: Date.now(),
			userText,
			botResponse
		});
		if (this.#history.length > 30) {
			this.#history.shift();
		}
	}

	/**
	 * Export state for persistent chat sessions
	 */
	exportState() {
		return {
			sessionId: this.#sessionId,
			currentIntent: this.#currentIntent,
			slots: { ...this.#slots },
			lastRouteResult: this.#lastRouteResult,
			pendingClarification: this.#pendingClarification,
			history: [...this.#history]
		};
	}

	/**
	 * Restore state from saved chat session
	 */
	restoreState(state) {
		if (!state) return;
		this.#sessionId = state.sessionId || this.#sessionId;
		this.#currentIntent = state.currentIntent || null;
		this.#slots = state.slots ? { ...state.slots } : { source: null, destination: null, station: null, line: null };
		this.#lastRouteResult = state.lastRouteResult || null;
		this.#pendingClarification = state.pendingClarification || null;
		this.#history = Array.isArray(state.history) ? [...state.history] : [];
	}
}
