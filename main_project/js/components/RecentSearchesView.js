/**
 * 🕒 RecentSearchesView - Search History & Filter Chips UI Component
 * Exact Mirror of Dashboard Recent Searches Engine
 */
import { centerClass } from "../core/CenterClass.js";

export class RecentSearchesView {
	#listEl = null;
	#clearBtn = null;
	#filterChips = [];
	#activeFilter = "recent";
	#onSelectCallback = null;
	#settings = { currentLang: "en" };
	#abortController = null;

	constructor(options = {}) {
		this.#listEl = document.querySelector(options.listSelector || "#recent-search-list");
		this.#clearBtn = document.querySelector(options.clearSelector || "#clearRecentSearches");
		this.#filterChips = document.querySelectorAll(".filter-chips button");
		this.#onSelectCallback = options.onSelectRoute || null;
		this.#abortController = new AbortController();

		this.#bindEvents();
	}

		render(currentLang = "en") {
		if (!this.#listEl) return;
		this.#settings.currentLang = currentLang;

		const searches = centerClass.getRecentSearches();

		if (searches.length === 0) {
			this.#listEl.innerHTML = `
				<li class="recent-list-empty">
					${this.#settings.currentLang === "hi" ? "कोई हाल की खोज नहीं मिली।" : "No recent searches found."}
				</li>
			`;
			if (this.#clearBtn) this.#clearBtn.style.display = "none";
			return;
		} 
		
		if (this.#clearBtn) this.#clearBtn.style.display = "block";

		let displaySearches = [...searches];
		if (this.#activeFilter === "most-used") {
			displaySearches.sort((a, b) => (b.count || 1) - (a.count || 1));
		} else if (this.#activeFilter === "az") {
			displaySearches.sort((a, b) => {
				const fromA = centerClass.getStationName(a.fromId, this.#settings.currentLang);
				const fromB = centerClass.getStationName(b.fromId, this.#settings.currentLang);
				return fromA.localeCompare(fromB, this.#settings.currentLang);
			});
		} else {
			displaySearches.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
		}

		// 🚀 OPTIMIZATION: Vanilla JS DOM Diffing (No innerHTML Thrashing)
		const existingItems = Array.from(this.#listEl.querySelectorAll('.recent-search-item'));
		
		// Remove empty state if present
		const emptyState = this.#listEl.querySelector('.recent-list-empty');
		if (emptyState) emptyState.remove();

		displaySearches.forEach((item, index) => {
			const fromName = centerClass.getStationName(item.fromId, this.#settings.currentLang);
			const toName = centerClass.getStationName(item.toId, this.#settings.currentLang);
			const fromDots = this.#getStationLineDotsHTML(item.fromId);
			const toDots = this.#getStationLineDotsHTML(item.toId);
			
			let li = existingItems[index];
			
			if (!li) {
				// Create new node only if we don't have enough existing ones
				li = document.createElement('li');
				li.className = 'recent-search-item';
				li.innerHTML = `
					<button type="button" class="recent-search-btn">
						<span class="from"></span>
						<span class="arrow">→</span>
						<span class="to"></span>
					</button>
					<button type="button" class="delete-search-btn" title="Delete">
						<img src="./assets/icons/trash-can-solid-full.svg" alt="🗑️" aria-hidden="true">
					</button>
				`;
				this.#listEl.appendChild(li);
			}

			// Update attributes & text dynamically without destroying the DOM elements
			const searchBtn = li.querySelector('.recent-search-btn');
			searchBtn.title = `${fromName} → ${toName}`;
			searchBtn.setAttribute('data-from', fromName);
			searchBtn.setAttribute('data-to', toName);
			
			searchBtn.querySelector('.from').innerHTML = `${fromDots}<span>${fromName}</span>`;
			searchBtn.querySelector('.to').innerHTML = `${toDots}<span>${toName}</span>`;

			const deleteBtn = li.querySelector('.delete-search-btn');
			deleteBtn.setAttribute('data-from-id', item.fromId);
			deleteBtn.setAttribute('data-to-id', item.toId);
		});

		// 🧹 Remove any excess DOM nodes (if searches were deleted)
		for (let i = displaySearches.length; i < existingItems.length; i++) {
			existingItems[i].remove();
		}
	}

		#bindEvents() {
		const signal = this.#abortController.signal;

		if (this.#clearBtn) {
			this.#clearBtn.addEventListener("click", () => {
				centerClass.clearRecentSearches();
				this.render(this.#settings.currentLang);
			}, { signal });
		}

		if (this.#listEl) {
			this.#listEl.addEventListener("click", (e) => {
				const deleteBtn = e.target.closest(".delete-search-btn");
				const searchBtn = e.target.closest(".recent-search-btn");

				if (deleteBtn) {
					const fromId = deleteBtn.getAttribute("data-from-id");
					const toId = deleteBtn.getAttribute("data-to-id");
					centerClass.deleteRecentSearch(fromId, toId);
					this.render(this.#settings.currentLang);
				} else if (searchBtn) {
					const from = searchBtn.getAttribute("data-from");
					const to = searchBtn.getAttribute("data-to");
					if (typeof this.#onSelectCallback === "function") {
						this.#onSelectCallback(from, to);
					}
				}
			}, { signal });
		}

		this.#filterChips.forEach((btn) => {
			btn.addEventListener("click", () => {
				this.#filterChips.forEach((b) => b.classList.remove("active"));
				btn.classList.add("active");

				const text = btn.textContent.trim().toLowerCase();
				if (text.includes("most") || text.includes("अधिक")) {
					this.#activeFilter = "most-used";
				} else if (text.includes("a-z") || text.includes("वर्णमाला")) {
					this.#activeFilter = "az";
				} else {
					this.#activeFilter = "recent";
				}
				this.render(this.#settings.currentLang);
			}, { signal });
		});
	}

	/**
	 * 🧹 टियरडाउन और मेमोरी क्लीनअप
	 */
	destroy() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
		}
		if (this.#listEl) this.#listEl.innerHTML = "";
	}

	#getStationLineDotsHTML(stationId) {
		if (!stationId) return "";
		const metroData = centerClass.getMetroData();
		const station = metroData?.stationData?.[stationId];
		if (!station || !Array.isArray(station.lines)) return "";
		const dots = station.lines.map((lineKey) => {
			const lineObj = metroData.lines?.[lineKey];
			const color = lineObj?.color || "#999999";
			const lineName = lineObj?.name?.[this.#settings.currentLang] || lineObj?.name?.en || lineKey;
			return `<span class="line-dot" style="background-color: ${color};" title="${lineName}"></span>`;
		}).join("");
		return `<span class="line-dots">${dots}</span>`;
	}
}