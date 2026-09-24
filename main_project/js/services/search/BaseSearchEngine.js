/**
 * 🔍 BaseSearchEngine - Multi-Input Concurrent UI Binding Base Class
 * Enterprise ES2022 OOP Superclass with Levenshtein Distance, Acronyms, and Multi-Input Map Lifecycle.
 */
export class BaseSearchEngine {
	#bindings = new Map();

	constructor() {}

	/**
	 * 🧠 Levenshtein Distance Algorithm (Fast Dynamic Programming)
	 */
	levenshteinDistance(a, b) {
		if (!a || !b) return (a || "").length || (b || "").length;
		if (a === b) return 0;

		const al = a.length;
		const bl = b.length;
		const matrix = [];

		for (let i = 0; i <= al; i++) matrix[i] = [i];
		for (let j = 0; j <= bl; j++) matrix[0][j] = j;

		for (let i = 1; i <= al; i++) {
			for (let j = 1; j <= bl; j++) {
				const cost = a[i - 1] === b[j - 1] ? 0 : 1;
				matrix[i][j] = Math.min(
					matrix[i - 1][j] + 1,
					matrix[i][j - 1] + 1,
					matrix[i - 1][j - 1] + cost
				);
			}
		}
		return matrix[al][bl];
	}

	/**
	 * 🔤 एक्रोनम जेनरेटर (उदा: "Rajiv Chowk" -> "rc", "AIIMS" -> "aiims")
	 */
	generateAcronym(fullName) {
		if (!fullName || typeof fullName !== "string") return "";
		const words = fullName.trim().split(/[\s-]+/).filter(Boolean);
		return words.map((w) => w[0].toLowerCase()).join("");
	}

	/**
	 * 🎯 Smart Typo Matcher
	 */
	hasTypoMatch(query, fullName, words = []) {
		const q = (query || "").toLowerCase();
		const full = (fullName || "").toLowerCase();
		const qLen = q.length;

		if (qLen < 2) return false;
		const maxAllowedDist = qLen <= 4 ? 1 : 2;

		if (full.startsWith(q[0])) {
			const fullPrefix = full.substring(0, qLen);
			if (this.levenshteinDistance(q, fullPrefix) <= maxAllowedDist) {
				return true;
			}
		}

		for (const word of words) {
			const wLower = word.toLowerCase();
			if (wLower.startsWith(q[0])) {
				const wordPrefix = wLower.substring(0, qLen);
				if (this.levenshteinDistance(q, wordPrefix) <= maxAllowedDist) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * HTML XSS सैनिटाइज़र
	 */
	escapeHTML(str) {
		if (!str) return "";
		return String(str)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	renderDropdownItem(item, idx) {
		return `<div class="autocomplete-item" data-index="${idx}">${this.escapeHTML(item.name || item.id)}</div>`;
	}

	/**
	 * 🔌 मल्टी-इनपुट समवर्ती UI बाइंडर (Start और End दोनों स्टेशन एक साथ काम करेंगे)
	 */
	bindUI({ inputEl, dropdownEl, onSelect, onInput, searchHandler }) {
		if (!inputEl || !dropdownEl) return;

		// यदि यह इनपुट पहले से बाउंड है, तो पुराना लिसनर साफ़ करें
		if (this.#bindings.has(inputEl)) {
			const prev = this.#bindings.get(inputEl);
			if (prev.abortController) prev.abortController.abort();
			this.#bindings.delete(inputEl);
		}

		const abortController = new AbortController();
		const signal = abortController.signal;

		const bindingState = {
			inputEl,
			dropdownEl,
			onSelect,
			onInput,
			searchHandler,
			currentResults: [],
			focusedIndex: -1,
			justSelected: false,
			abortController
		};

		this.#bindings.set(inputEl, bindingState);

		// 1. Live Input Event
		inputEl.addEventListener("input", (e) => {
			const query = e.target.value.trim();
			if (onInput) onInput(query);

			if (query.length === 0) {
				this.hideDropdown(dropdownEl);
				return;
			}

			const results = searchHandler ? searchHandler(query) : this.search(query);
			bindingState.currentResults = results || [];

			if (bindingState.currentResults.length === 0) {
				this.hideDropdown(dropdownEl);
				return;
			}

			this.#renderDropdown(bindingState);
		}, { signal });

		// 2. Keyboard Navigation
		inputEl.addEventListener("keydown", (e) => {
			if (dropdownEl.hasAttribute("hidden") || bindingState.currentResults.length === 0) return;

			const items = dropdownEl.querySelectorAll("[data-index]");
			if (items.length === 0) return;

			if (e.key === "ArrowDown") {
				e.preventDefault();
				bindingState.focusedIndex = (bindingState.focusedIndex + 1) % items.length;
				this.#updateFocusedItem(items, bindingState.focusedIndex);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				bindingState.focusedIndex = (bindingState.focusedIndex - 1 + items.length) % items.length;
				this.#updateFocusedItem(items, bindingState.focusedIndex);
			} else if (e.key === "Enter") {
				if (bindingState.focusedIndex >= 0 && bindingState.currentResults[bindingState.focusedIndex]) {
					e.preventDefault();
					this.#selectItem(bindingState, bindingState.currentResults[bindingState.focusedIndex]);
				}
			} else if (e.key === "Escape") {
				this.hideDropdown(dropdownEl);
			}
		}, { signal });

		// 3. Focus Event (यदि इनपुट में टेक्स्ट है तो फोकस पर ड्रॉपडाउन दिखाएं)
		inputEl.addEventListener("focus", () => {
			if (bindingState.justSelected) return;

			const query = inputEl.value.trim();
			if (query.length > 0) {
				const results = searchHandler ? searchHandler(query) : this.search(query);
				bindingState.currentResults = results || [];
				if (bindingState.currentResults.length > 0) {
					this.#renderDropdown(bindingState);
				}
			}
		}, { signal });

		// 4. Outside Document Click
		document.addEventListener("click", (e) => {
			if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
				this.hideDropdown(dropdownEl);
			}
		}, { signal });
	}

	#renderDropdown(bindingState) {
		const { dropdownEl, currentResults } = bindingState;
		if (!dropdownEl || !currentResults || currentResults.length === 0) {
			this.hideDropdown(dropdownEl);
			return;
		}

		bindingState.focusedIndex = -1;
		dropdownEl.innerHTML = currentResults.map((item, idx) => this.renderDropdownItem(item, idx)).join("");

		dropdownEl.querySelectorAll("[data-index]").forEach((itemEl) => {
			itemEl.addEventListener("click", (e) => {
				e.stopPropagation();
				const idx = parseInt(itemEl.getAttribute("data-index"), 10);
				if (bindingState.currentResults[idx]) {
					this.#selectItem(bindingState, bindingState.currentResults[idx]);
				}
			});
		});

		dropdownEl.removeAttribute("hidden");
		dropdownEl.classList.add("active");
		dropdownEl.style.display = "flex";
	}

	#updateFocusedItem(items, focusedIndex) {
		items.forEach((item, idx) => {
			if (idx === focusedIndex) {
				item.classList.add("focused");
				item.scrollIntoView({ block: "nearest" });
			} else {
				item.classList.remove("focused");
			}
		});
	}

	#selectItem(bindingState, item) {
		bindingState.justSelected = true; 
		
		this.hideDropdown(bindingState.dropdownEl);
		if (typeof bindingState.onSelect === "function") {
			bindingState.onSelect(item);
		}

		setTimeout(() => {
			bindingState.justSelected = false;
		}, 200);
	}

	hideDropdown(dropdownEl = null) {
		if (dropdownEl) {
			dropdownEl.setAttribute("hidden", "");
			dropdownEl.classList.remove("active");
			dropdownEl.style.display = "none";
			dropdownEl.innerHTML = "";
		} else {
			for (const [inputEl, state] of this.#bindings.entries()) {
				if (state.dropdownEl) {
					state.dropdownEl.setAttribute("hidden", "");
					state.dropdownEl.classList.remove("active");
					state.dropdownEl.style.display = "none";
					state.dropdownEl.innerHTML = "";
				}
			}
		}
	}

	destroy() {
		for (const [inputEl, state] of this.#bindings.entries()) {
			if (state.abortController) {
				state.abortController.abort();
			}
			this.hideDropdown(state.dropdownEl);
		}
		this.#bindings.clear();
	}
}