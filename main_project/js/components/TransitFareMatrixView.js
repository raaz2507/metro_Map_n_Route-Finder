/**
 * 📊 TransitFareMatrixView - Enterprise Component for Fare Matrix, Slabs & Passes
 * Encapsulates dynamic multi-model fare rendering, network tabs, multi-class toggles,
 * and passes guidelines hub.
 */
import { centerClass } from "../core/CenterClass.js";


export class TransitFareMatrixView {
	#fareContainerEl = null;
	#passesContainerEl = null;
	#tabsNavEl = null;
	#tableContainerEl = null;
	#cityBadgeEl = null;
	#passesGridEl = null;

	#metroData = null;
	#fareRules = null;
	#activeCity = "delhi_ncr";
	#activeLang = "en";
	#activePolicyKey = null;
	#activeMatrixClassPolicyKey = null;
	#abortController = null;

	constructor(options = {}) {
		this.#fareContainerEl = document.querySelector(options.fareSelector || "#fare-matrix-section");
		this.#passesContainerEl = document.querySelector(options.passesSelector || "#passes-guidelines-section");
		this.#cacheDOM();
	}

	get #currency() {
		const curr = this.#fareRules?.currency;
		const map = { INR: "₹", JPY: "¥", EUR: "€", USD: "$", GBP: "£" };
		return this.#fareRules?.currencySymbol || (curr ? map[curr] || curr : "₹");
	}

	get activePolicyKey() {
		return this.#activePolicyKey;
	}

	#cacheDOM() {
		this.#tabsNavEl = document.getElementById("fareNetworkTabs");
		this.#tableContainerEl = document.getElementById("fareTableContainer");
		this.#cityBadgeEl = document.getElementById("activeCityBadge");
		this.#passesGridEl = document.getElementById("passesCardsGrid");
	}

	/**
	 * Render dynamic fare tables and passes cards
	 * @param {Object} params
	 * @param {Object} params.metroData
	 * @param {string} params.cityKey
	 * @param {string} params.lang
	 */
	render({ metroData = null, cityKey = "delhi_ncr", networkKey = null, lang = "en" } = {}) {
		this.#metroData = metroData || this.#metroData;
		this.#activeCity = cityKey || this.#activeCity;
		this.#activeLang = lang || this.#activeLang;
		this.#fareRules = this.#metroData?.fareRules || {};

		// If a specific network is requested, auto-select its matching policy tab
		if (networkKey && networkKey !== "all") {
			const policies = this.#fareRules.policies || {};
			const normNetKey = networkKey.toLowerCase().replace(/[^a-z0-9]/g, "");
			const matchedPolicyKey = Object.keys(policies).find(pKey => {
				const pObj = policies[pKey];
				const normPKey = pKey.toLowerCase().replace(/[^a-z0-9]/g, "");
				const normPNet = (pObj.network || "").toLowerCase().replace(/[^a-z0-9]/g, "");
				return normPKey.includes(normNetKey) || normNetKey.includes(normPKey) ||
				       normPNet.includes(normNetKey) || normNetKey.includes(normPNet);
			});
			if (matchedPolicyKey) {
				this.#activePolicyKey = matchedPolicyKey;
				this.#activeMatrixClassPolicyKey = null;
			}
		}

		if (!this.#fareContainerEl && !this.#passesContainerEl) return;

		// 1. Update City Badge
		if (this.#cityBadgeEl) {
			this.#cityBadgeEl.textContent = centerClass.getCityDisplayName(this.#activeCity);
		}

		// 2. Render Network Tabs
		this.#renderNetworkTabs();

		// 3. Render Table for Active Policy
		this.#renderActiveFareTable();

		// 4. Render Passes & Cards Hub
		this.#renderPassesHub();
	}

	#renderNetworkTabs() {
		if (!this.#tabsNavEl) return;

		const policies = this.#fareRules.policies || {};
		const policyKeys = Object.keys(policies);

		if (policyKeys.length === 0) {
			this.#tabsNavEl.innerHTML = "";
			return;
		}

		// 🌐 Fully Dynamic Schema Filter: Group companion multi-class policies under their primary base policy
		const displayPolicyKeys = [];
		const seenNetworksWithPairMatrix = new Set();

		policyKeys.forEach(pKey => {
			const pObj = policies[pKey];
			if (pObj.isAuxiliary) return;

			// If it's a secondary/companion class matrix for an already included network, toggle it internally
			if (pObj.fareModel === "station_pair" && pObj.network) {
				if (seenNetworksWithPairMatrix.has(pObj.network)) {
					return;
				}
				seenNetworksWithPairMatrix.add(pObj.network);
			}
			displayPolicyKeys.push(pKey);
		});

		if (!this.#activePolicyKey || !policies[this.#activePolicyKey]) {
			this.#activePolicyKey = displayPolicyKeys[0];
			this.#activeMatrixClassPolicyKey = null;
		}

		let html = "";
		displayPolicyKeys.forEach(pKey => {
			const pObj = policies[pKey];
			const label = this.#getPolicyLabel(pKey, pObj);
			const isActive = pKey === this.#activePolicyKey ? "active" : "";
			html += `
				<button type="button" class="fare-network-tab-btn ${isActive}" data-policy="${this.#escapeHTML(pKey)}">
					${label}
				</button>
			`;
		});

		this.#tabsNavEl.innerHTML = html;

		// Bind tab click events with smooth container transition
		this.#tabsNavEl.querySelectorAll(".fare-network-tab-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				const targetPolicy = btn.getAttribute("data-policy");
				if (targetPolicy && targetPolicy !== this.#activePolicyKey) {
					this.#activePolicyKey = targetPolicy;
					this.#activeMatrixClassPolicyKey = null; // Reset coach class to primary for the new network
					
					if (this.#tableContainerEl) {
						this.#tableContainerEl.classList.add("fare-table-snap-out");
						setTimeout(() => {
							this.#renderNetworkTabs();
							this.#renderActiveFareTable();
							this.#renderPassesHub();
							this.#tableContainerEl.classList.remove("fare-table-snap-out");
							this.#tableContainerEl.classList.add("fare-table-snap-in");
							setTimeout(() => {
								this.#tableContainerEl.classList.remove("fare-table-snap-in");
							}, 350);
						}, 180);
					} else {
						this.#renderNetworkTabs();
						this.#renderActiveFareTable();
						this.#renderPassesHub();
					}
				}
			});
		});
	}

	#getPolicyLabel(pKey, pObj) {
		// 1. City Locale Pack Policies (Single Source of Truth)
		const localizedPolicy = centerClass.getPolicyName(pKey);
		if (localizedPolicy) return localizedPolicy;

		// 2. City Locale Pack Networks (Single Source of Truth)
		const netId = pObj?.network || pKey;
		const netName = centerClass.getNetworkName(netId);
		if (netName && netName !== netId) return netName;

		// 3. Fallback
		return pKey;
	}

	#renderActiveFareTable() {
		if (!this.#tableContainerEl) return;

		const policy = this.#fareRules?.policies?.[this.#activePolicyKey];
		if (!policy) {
			this.#tableContainerEl.innerHTML = `<div class="p-4 text-center text-muted">${centerClass.t("smartCardTicket.noFareRules")}</div>`;
			return;
		}

		const model = policy.fareModel || "distance_based";

		if (model === "distance_based" || model === "station_count_based") {
			this.#renderSlabTable(policy, model);
		} else if (model === "station_pair") {
			this.#render2DStationMatrix(policy);
		} else {
			this.#tableContainerEl.innerHTML = `<div class="p-4 text-center text-muted">${centerClass.t("smartCardTicket.noFareRules")}</div>`;
		}
	}

	#renderSlabTable(policy, model) {
		const fareTables = policy.fareTables || {};
		const weekdaySlabs = fareTables.weekday || fareTables.standard || [];
		const holidaySlabs = fareTables.holiday || [];
		const curr = this.#currency;

		const colDistance = model === "station_count_based"
			? centerClass.t("smartCardTicket.colStations")
			: centerClass.t("smartCardTicket.colDistance");
		const colToken = centerClass.t("smartCardTicket.colToken");
		const smartCardProd = policy.products?.smart_card;
		const discountPercent = smartCardProd?.discountPercent || 10;
		const colSmartCard = centerClass.t("smartCardTicket.colSmartCard", { percent: discountPercent });
		const colHoliday = centerClass.t("smartCardTicket.colHoliday");
		const hasHoliday = holidaySlabs.length > 0;

		// ⚡ FIXED FLAT FARE DETECTION: Single slab covering entire network (Universal for any city)
		if (weekdaySlabs.length === 1 && weekdaySlabs[0].maxKm == null && weekdaySlabs[0].maxStations == null) {
			const flatFare = weekdaySlabs[0].fare;
			const scFare = (flatFare * (1 - discountPercent / 100)).toFixed(2).replace(/\.00$/, "");
			this.#tableContainerEl.innerHTML = `
				<div class="flat-fare-container">
					<div class="flat-fare-header">
						<span class="flat-fare-icon">⚡</span>
						<div class="flat-fare-title-group">
							<h3 class="flat-fare-title">${centerClass.t("smartCardTicket.flatFareLabel")}</h3>
							<p class="flat-fare-desc">${centerClass.t("smartCardTicket.flatFareDesc")}</p>
						</div>
					</div>
					<div class="flat-fare-pricing-grid">
						<div class="flat-fare-price-box">
							<span class="flat-fare-lbl">${colToken}</span>
							<span class="flat-fare-val">${curr} ${flatFare}</span>
						</div>
						<div class="flat-fare-price-box highlight-discount">
							<span class="flat-fare-lbl">${colSmartCard}</span>
							<span class="flat-fare-val">${curr} ${scFare}</span>
						</div>
					</div>
				</div>
			`;
			return;
		}

		const kmUnit = centerClass.t("smartCardTicket.kmUnit");
		const stationsUnit = centerClass.t("smartCardTicket.stationsUnit");
		const abovePrefix = centerClass.t("smartCardTicket.abovePrefix");

		let tbodyHTML = "";
		weekdaySlabs.forEach((slab, idx) => {
			let slabText = "";
			if (model === "station_count_based") {
				slabText = slab.maxStations != null 
					? `${slab.minStations} - ${slab.maxStations} ${stationsUnit}`
					: `${abovePrefix} ${slab.minStations} ${stationsUnit}`;
			} else {
				slabText = slab.maxKm != null 
					? `${slab.minKm} - ${slab.maxKm} ${kmUnit}`
					: `${abovePrefix} ${slab.minKm} ${kmUnit}`;
			}

			const standardFare = slab.fare;
			const smartCardFare = (standardFare * (1 - discountPercent / 100)).toFixed(2).replace(/\.00$/, "");
			const holidayFare = hasHoliday && holidaySlabs[idx] ? `${curr} ${holidaySlabs[idx].fare}` : "-";

			tbodyHTML += `
				<tr>
					<td><strong>${this.#escapeHTML(slabText)}</strong></td>
					<td class="fare-cell-price">${curr} ${standardFare}</td>
					<td class="fare-cell-discount">${curr} ${smartCardFare}</td>
					${hasHoliday ? `<td class="fare-cell-holiday">${holidayFare}</td>` : ""}
				</tr>
			`;
		});

		this.#tableContainerEl.innerHTML = `
			<table class="unified-fare-table">
				<thead>
					<tr>
						<th>${this.#escapeHTML(colDistance)}</th>
						<th>${this.#escapeHTML(colToken)}</th>
						<th>${this.#escapeHTML(colSmartCard)}</th>
						${hasHoliday ? `<th>${this.#escapeHTML(colHoliday)}</th>` : ""}
					</tr>
				</thead>
				<tbody>
					${tbodyHTML}
				</tbody>
			</table>
		`;
	}

	#getClassLabel(cKey, cPolicy) {
		const localizedPolicy = centerClass.getPolicyName(cKey);
		if (localizedPolicy) return localizedPolicy;

		if (cKey.includes("premium")) return centerClass.t("smartCardTicket.colPremiumFare");
		if (cKey.includes("standard")) return centerClass.t("smartCardTicket.colStandardFare");

		return cKey;
	}

	#render2DStationMatrix(policy) {
		const stations = policy.stations || [];
		const curr = this.#currency;

		// 🌐 Dynamically discover companion class policies for this network (e.g., standard vs premium, 1st class vs 2nd class)
		const companionClassPolicies = Object.entries(this.#fareRules?.policies || {})
			.filter(([k, p]) => (p.network === policy.network || k === this.#activePolicyKey) && p.fareModel === "station_pair" && Array.isArray(p.fareMatrix));

		if (!this.#activeMatrixClassPolicyKey || !companionClassPolicies.some(([k]) => k === this.#activeMatrixClassPolicyKey)) {
			this.#activeMatrixClassPolicyKey = this.#activePolicyKey;
		}

		const activeEntry = companionClassPolicies.find(([k]) => k === this.#activeMatrixClassPolicyKey) || companionClassPolicies[0] || [this.#activePolicyKey, policy];
		const activePolicyObj = activeEntry[1];
		const activeMatrix = activePolicyObj.fareMatrix || [];

		const cornerLabel = centerClass.t("smartCardTicket.matrixOriginHeader");

		// Header Switcher Bar (Only if multiple coach classes exist for this network)
		let topBarHTML = "";
		const netName = centerClass.getNetworkName(policy.network) || this.#getPolicyLabel(this.#activePolicyKey, policy);
		const panHint = centerClass.t("smartCardTicket.matrixPanHint");

		if (companionClassPolicies.length > 1) {
			const pillsHTML = companionClassPolicies.map(([cKey, cPolicy]) => {
				const isActive = cKey === this.#activeMatrixClassPolicyKey ? "active" : "";
				const pillLabel = this.#getClassLabel(cKey, cPolicy);
				return `
					<button type="button" class="class-pill-btn ${isActive}" data-class-key="${this.#escapeHTML(cKey)}">
						${this.#escapeHTML(pillLabel)}
					</button>
				`;
			}).join("");

			topBarHTML = `
				<div class="class-switch-bar">
					<div class="class-switch-info">
						<span class="active-city-badge">${this.#escapeHTML(netName)}</span>
						<span class="matrix-instruction-hint">${this.#escapeHTML(panHint)}</span>
					</div>
					<div class="class-switch-pills">
						${pillsHTML}
					</div>
				</div>
			`;
		} else {
			topBarHTML = `
				<div class="class-switch-bar">
					<div class="class-switch-info">
						<span class="active-city-badge">${this.#escapeHTML(netName)}</span>
						<span class="matrix-instruction-hint">${this.#escapeHTML(panHint)}</span>
					</div>
				</div>
			`;
		}

		// Top Columns: Destination Stations
		let theadHTML = `
			<thead>
				<tr>
					<th class="matrix-corner-cell">${this.#escapeHTML(cornerLabel)}</th>
					${stations.map((stId, colIdx) => {
						const name = centerClass.getStationName(stId) || stId.replace(/_/g, " ");
						return `<th class="matrix-header-dest" data-col="${colIdx}" title="${this.#escapeHTML(name)}">${this.#escapeHTML(name)}</th>`;
					}).join("")}
				</tr>
			</thead>
		`;

		// Rows: Origin Stations
		let tbodyHTML = "";
		stations.forEach((originId, rowIdx) => {
			const originName = centerClass.getStationName(originId) || originId.replace(/_/g, " ");
			let cellsHTML = "";

			stations.forEach((destId, colIdx) => {
				if (rowIdx === colIdx) {
					cellsHTML += `<td class="matrix-cell matrix-cell-diagonal" data-row="${rowIdx}" data-col="${colIdx}" style="--row: ${rowIdx}; --col: ${colIdx};" title="${this.#escapeHTML(originName)}"><span class="fare-val-dust">-</span></td>`;
				} else {
					const fareVal = activeMatrix[rowIdx]?.[colIdx] ?? "-";
					const destName = centerClass.getStationName(destId) || destId.replace(/_/g, " ");
					const fareDisplay = fareVal !== "-" ? `${curr} ${fareVal}` : "-";
					cellsHTML += `
						<td class="matrix-cell" data-row="${rowIdx}" data-col="${colIdx}" style="--row: ${rowIdx}; --col: ${colIdx};" title="${this.#escapeHTML(originName)} ➔ ${this.#escapeHTML(destName)}: ${fareDisplay}">
							<span class="fare-val-dust">${fareDisplay}</span>
						</td>
					`;
				}
			});

			tbodyHTML += `
				<tr>
					<th class="matrix-header-origin" data-row="${rowIdx}" title="${this.#escapeHTML(originName)}">${this.#escapeHTML(originName)}</th>
					${cellsHTML}
				</tr>
			`;
		});

		this.#tableContainerEl.innerHTML = `
			${topBarHTML}
			<div class="matrix-scroll-wrapper">
				<table class="matrix-2d-table">
					${theadHTML}
					<tbody>
						${tbodyHTML}
					</tbody>
				</table>
			</div>
		`;

		// 🖱️ Initialize freeform 2D pan/drag scroll across entire matrix canvas
		this.#initMatrixPanScroll();

		// 🎯 Initialize row & column crosshair hover highlighting
		this.#initMatrixCrosshairHighlight();

		// Bind dynamic class switcher pills with Thanos snap dust dissolve & reform
		if (companionClassPolicies.length > 1) {
			this.#tableContainerEl.querySelectorAll(".class-pill-btn").forEach(btn => {
				btn.addEventListener("click", () => {
					const chosen = btn.getAttribute("data-class-key");
					if (chosen && chosen !== this.#activeMatrixClassPolicyKey) {
						this.#switchMatrixCoachClass(policy, chosen, companionClassPolicies, stations);
					}
				});
			});
		}
	}

	#switchMatrixCoachClass(policy, chosen, companionClassPolicies, stations) {
		const targetEntry = companionClassPolicies.find(([k]) => k === chosen);
		if (!targetEntry) return;

		this.#activeMatrixClassPolicyKey = chosen;

		// 1. Update pill button active states
		this.#tableContainerEl.querySelectorAll(".class-pill-btn").forEach(btn => {
			btn.classList.toggle("active", btn.getAttribute("data-class-key") === chosen);
		});

		const newPolicyObj = targetEntry[1];
		const newMatrix = newPolicyObj.fareMatrix || [];
		const curr = this.#currency;

		const dustSpans = this.#tableContainerEl.querySelectorAll(".matrix-cell:not(.matrix-cell-diagonal) .fare-val-dust");

		// Phase 1: Disintegrate into glowing ember dust (Thanos snap out)
		dustSpans.forEach(span => {
			span.classList.remove("thanos-dust-in");
			span.classList.add("thanos-dust-out");
		});

		// Phase 2: Reform from dust particles into solid numbers (Thanos reform in)
		setTimeout(() => {
			dustSpans.forEach(span => {
				const td = span.closest(".matrix-cell");
				if (!td) return;
				const r = parseInt(td.getAttribute("data-row"), 10);
				const c = parseInt(td.getAttribute("data-col"), 10);
				const destId = stations[c];
				const originId = stations[r];
				const originName = centerClass.getStationName(originId) || originId.replace(/_/g, " ");
				const destName = centerClass.getStationName(destId) || destId.replace(/_/g, " ");

				const fareVal = newMatrix[r]?.[c] ?? "-";
				const fareDisplay = fareVal !== "-" ? `${curr} ${fareVal}` : "-";

				td.setAttribute("title", `${originName} ➔ ${destName}: ${fareDisplay}`);
				span.textContent = fareDisplay;

				span.classList.remove("thanos-dust-out");
				span.classList.add("thanos-dust-in");
			});

			setTimeout(() => {
				dustSpans.forEach(span => span.classList.remove("thanos-dust-in"));
			}, 700);
		}, 300);
	}

	#initMatrixCrosshairHighlight() {
		const table = this.#tableContainerEl?.querySelector(".matrix-2d-table");
		if (!table) return;

		let lastRow = null;
		let lastCol = null;

		const clearHighlight = () => {
			if (lastRow === null && lastCol === null) return;
			table.querySelectorAll(".matrix-hl-ray, .matrix-hl-active, .matrix-hl-header").forEach(el => {
				el.classList.remove("matrix-hl-ray", "matrix-hl-active", "matrix-hl-header");
			});
			lastRow = null;
			lastCol = null;
		};

		table.addEventListener("mouseover", (e) => {
			const cell = e.target.closest(".matrix-cell");
			if (!cell) {
				if (!e.target.closest("th")) clearHighlight();
				return;
			}

			const rowStr = cell.getAttribute("data-row");
			const colStr = cell.getAttribute("data-col");
			if (rowStr === null || colStr === null) return;
			if (rowStr === lastRow && colStr === lastCol) return;

			clearHighlight();
			lastRow = rowStr;
			lastCol = colStr;

			const rIdx = parseInt(rowStr, 10);
			const cIdx = parseInt(colStr, 10);

			// 1. Highlight target intersection cell
			cell.classList.add("matrix-hl-active");

			// 2. Highlight origin station header (left) and horizontal ray from origin header up to cell
			const originHeader = table.querySelector(`.matrix-header-origin[data-row="${rowStr}"]`);
			if (originHeader) originHeader.classList.add("matrix-hl-header");

			table.querySelectorAll(`td.matrix-cell[data-row="${rowStr}"]`).forEach(td => {
				const c = parseInt(td.getAttribute("data-col"), 10);
				if (c < cIdx) {
					td.classList.add("matrix-hl-ray");
				}
			});

			// 3. Highlight destination station header (top) and vertical ray from dest header down to cell
			const destHeader = table.querySelector(`.matrix-header-dest[data-col="${colStr}"]`);
			if (destHeader) destHeader.classList.add("matrix-hl-header");

			table.querySelectorAll(`td.matrix-cell[data-col="${colStr}"]`).forEach(td => {
				const r = parseInt(td.getAttribute("data-row"), 10);
				if (r < rIdx) {
					td.classList.add("matrix-hl-ray");
				}
			});
		});

		table.addEventListener("mouseleave", clearHighlight);
	}

	#initMatrixPanScroll() {
		const wrapper = this.#tableContainerEl?.querySelector(".matrix-scroll-wrapper");
		if (!wrapper) return;

		let isDown = false;
		let startX = 0;
		let startY = 0;
		let scrollLeft = 0;
		let scrollTop = 0;

		const onMouseMove = (e) => {
			if (!isDown) return;
			e.preventDefault();
			const x = e.pageX - wrapper.offsetLeft;
			const y = e.pageY - wrapper.offsetTop;
			const walkX = x - startX;
			const walkY = y - startY;
			wrapper.scrollLeft = scrollLeft - walkX;
			wrapper.scrollTop = scrollTop - walkY;
		};

		const onMouseUp = () => {
			if (!isDown) return;
			isDown = false;
			wrapper.classList.remove("is-dragging");
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};

		wrapper.addEventListener("mousedown", (e) => {
			if (e.button !== 0 || e.target.closest("button, a")) return;
			isDown = true;
			wrapper.classList.add("is-dragging");
			startX = e.pageX - wrapper.offsetLeft;
			startY = e.pageY - wrapper.offsetTop;
			scrollLeft = wrapper.scrollLeft;
			scrollTop = wrapper.scrollTop;
			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
		});

		wrapper.addEventListener("wheel", (e) => {
			// Horizontal scroll support with Shift+wheel
			if (e.deltaX === 0 && e.shiftKey) {
				wrapper.scrollLeft += e.deltaY;
				e.preventDefault();
			}
		}, { passive: false });
	}

	#renderPassesHub() {
		if (!this.#passesGridEl) return;

		// 🎯 Read products from active policy first (fallback to first available policy)
		const activePolicy = this.#fareRules?.policies?.[this.#activePolicyKey] || Object.values(this.#fareRules?.policies || {})[0];
		const products = activePolicy?.products || {};
		const curr = this.#currency;

		let cardsHTML = "";
		const handledKeys = new Set();

		// 1. Smart Card Unit
		if (products.smart_card) {
			handledKeys.add("smart_card");
			const sc = products.smart_card;
			const minBalance = sc.minBalance != null ? `${curr} ${sc.minBalance}` : "-";
			const maxMinutes = sc.maxTravelTimeMinutes?.otherStation || 180;
			const sameStation = sc.maxTravelTimeMinutes?.sameStation || 20;

			const bullets = [];

			// Bullet 1: Standard discount
			const discountPercent = sc.discountPercent || 10;
			bullets.push(centerClass.t("smartCardTicket.smartCardBullet1", { percent: discountPercent }));

			// Weekend / Holiday discount (e.g. Mumbai 1 SBI card 25% discount)
			if (sc.weekendDiscountPercent) {
				bullets.push(centerClass.t("smartCardTicket.smartCardWeekendBullet", { percent: sc.weekendDiscountPercent }));
			}

			// Off-peak discount: ONLY if off_peak_smart_card or timeRules.off_peak is present!
			if (products.off_peak_smart_card || activePolicy?.timeRules?.off_peak) {
				const offPeakPercent = products.off_peak_smart_card?.discountPercent || 10;
				bullets.push(centerClass.t("smartCardTicket.smartCardBullet2", { percent: offPeakPercent }));
			}

			// Minimum balance
			if (sc.minBalance != null) {
				bullets.push(centerClass.t("smartCardTicket.smartCardBullet3", { amount: minBalance }));
			}

			// Max stay in network
			if (sc.maxTravelTimeMinutes) {
				bullets.push(centerClass.t("smartCardTicket.smartCardBullet4", { minutes: maxMinutes, sameStation: sameStation }));
			}

			// Refundable security deposit
			const deposit = sc.refundableDeposit ?? sc.securityDeposit;
			if (deposit != null) {
				bullets.push(centerClass.t("smartCardTicket.smartCardDepositBullet", { deposit: `${curr} ${deposit}` }));
			}

			cardsHTML += `
				<article class="pass-item-card">
					<div class="pass-card-head">
						<div class="pass-card-title-group">
							<span class="pass-card-icon">💳</span>
							<h3 class="pass-card-title">${sc.label?.[this.#activeLang] || sc.label?.en || centerClass.t("smartCardTicket.products.smart_card")}</h3>
						</div>
						<span class="pass-tag-badge">${centerClass.t("smartCardTicket.dailyCommutersTag")}</span>
					</div>
					<ul class="pass-bullets-list">
						${bullets.map(b => `<li>${this.#escapeHTML(b)}</li>`).join("")}
					</ul>
				</article>
			`;
		}

		// 2. Tourist Card Unit (1-Day & 3-Day) - ONLY IF product is actually defined!
		if (products.tourist_card_1day || products.tourist_card_3day) {
			handledKeys.add("tourist_card_1day");
			handledKeys.add("tourist_card_3day");
			const t1 = products.tourist_card_1day || {};
			const t3 = products.tourist_card_3day || {};

			const cost1 = centerClass.t("smartCardTicket.touristCardCost", {
				cost: t1.cost != null ? `${curr} ${t1.cost}` : "-",
				travelValue: t1.travelValue != null ? `${curr} ${t1.travelValue}` : "-",
				deposit: t1.refundableDeposit != null ? `${curr} ${t1.refundableDeposit}` : "-"
			});

			const cost3 = centerClass.t("smartCardTicket.touristCardCost", {
				cost: t3.cost != null ? `${curr} ${t3.cost}` : "-",
				travelValue: t3.travelValue != null ? `${curr} ${t3.travelValue}` : "-",
				deposit: t3.refundableDeposit != null ? `${curr} ${t3.refundableDeposit}` : "-"
			});

			const excludedLines = t1.excludedLines || t3.excludedLines || [];
			let unlimitedText = "";
			if (excludedLines.length > 0) {
				const excludedNames = excludedLines.map(id => centerClass.getLineShortName(id) || centerClass.getLineName(id) || id).join(", ");
				unlimitedText = centerClass.t("smartCardTicket.touristCardUnlimitedExcluded", { excluded: excludedNames });
				if (unlimitedText === "smartCardTicket.touristCardUnlimitedExcluded") {
					unlimitedText = centerClass.t("smartCardTicket.touristCardUnlimited", { excluded: excludedNames });
				}
			} else {
				unlimitedText = centerClass.t("smartCardTicket.touristCardUnlimitedAll");
				if (unlimitedText === "smartCardTicket.touristCardUnlimitedAll") {
					unlimitedText = centerClass.t("smartCardTicket.touristCardUnlimited", { excluded: "" });
				}
			}

			const refundDeposit = t1.refundableDeposit ?? t3.refundableDeposit;
			const refundText = refundDeposit != null ? centerClass.t("smartCardTicket.touristCardRefund", { deposit: `${curr} ${refundDeposit}` }) : null;

			cardsHTML += `
				<article class="pass-item-card">
					<div class="pass-card-head">
						<div class="pass-card-title-group">
							<span class="pass-card-icon">🏖️</span>
							<h3 class="pass-card-title">${t1.cost && t3.cost ? centerClass.t("smartCardTicket.touristPassTag") : (t1.cost ? centerClass.t("smartCardTicket.touristCard1DayTitle") : centerClass.t("smartCardTicket.touristCard3DayTitle"))}</h3>
						</div>
						<span class="pass-tag-badge">${centerClass.t("smartCardTicket.touristPassTag")}</span>
					</div>
					<ul class="pass-bullets-list">
						${t1.cost ? `<li><strong>${centerClass.t("smartCardTicket.products.tourist_card_1day")}:</strong> ${this.#escapeHTML(cost1)}</li>` : ""}
						${t3.cost ? `<li><strong>${centerClass.t("smartCardTicket.products.tourist_card_3day")}:</strong> ${this.#escapeHTML(cost3)}</li>` : ""}
						<li>${this.#escapeHTML(unlimitedText)}</li>
						${refundText ? `<li>${this.#escapeHTML(refundText)}</li>` : ""}
					</ul>
				</article>
			`;
		}

		// 3. Trip Pass Unit (e.g. Mumbai Metro Line 1 45-Trips Monthly Commuter Pass)
		if (products.trip_pass_45 || products.trip_pass) {
			const tpKey = products.trip_pass_45 ? "trip_pass_45" : "trip_pass";
			handledKeys.add(tpKey);
			const tp = products[tpKey];
			const trips = tp.trips || 45;
			const validityDays = tp.validityDays || 30;

			cardsHTML += `
				<article class="pass-item-card">
					<div class="pass-card-head">
						<div class="pass-card-title-group">
							<span class="pass-card-icon">🎟️</span>
							<h3 class="pass-card-title">${centerClass.t("smartCardTicket.tripPassTitle", { trips })}</h3>
						</div>
						<span class="pass-tag-badge">${centerClass.t("smartCardTicket.tripPassTag")}</span>
					</div>
					<ul class="pass-bullets-list">
						<li>${this.#escapeHTML(centerClass.t("smartCardTicket.tripPassBullet1", { trips, days: validityDays }))}</li>
						<li>${this.#escapeHTML(centerClass.t("smartCardTicket.tripPassBullet2"))}</li>
					</ul>
				</article>
			`;
		}

		// 4. Concessions Unit (e.g. Mumbai Metro Lines 2A, 7 & 3 Concessions for Students, Senior Citizens, Divyangjan)
		if (products.concessions) {
			handledKeys.add("concessions");
			const conc = products.concessions;
			const percent = conc.discountPercent || 25;
			const categoriesList = (conc.categories || ["student", "senior_citizen", "divyangjan"])
				.map(catKey => centerClass.t(`smartCardTicket.categories.${catKey}`) || catKey)
				.join(", ");

			cardsHTML += `
				<article class="pass-item-card">
					<div class="pass-card-head">
						<div class="pass-card-title-group">
							<span class="pass-card-icon">🎓</span>
							<h3 class="pass-card-title">${centerClass.t("smartCardTicket.concessionsTitle")}</h3>
						</div>
						<span class="pass-tag-badge">${centerClass.t("smartCardTicket.concessionsTag")}</span>
					</div>
					<ul class="pass-bullets-list">
						<li>${this.#escapeHTML(centerClass.t("smartCardTicket.concessionsBullet1", { percent, categories: categoriesList }))}</li>
						<li>${this.#escapeHTML(centerClass.t("smartCardTicket.concessionsBullet2"))}</li>
					</ul>
				</article>
			`;
		}

		// 5. Digital QR Ticket Unit
		if (products.qr_ticket) {
			handledKeys.add("qr_ticket");
			const qr = products.qr_ticket;
			const validMinutes = qr.validityMinutes || 60;
			const channels = (qr.channels || ["Travel App", "WhatsApp"]).join(", ");

			const b1 = centerClass.t("smartCardTicket.qrTicketBullet1");
			const b2 = centerClass.t("smartCardTicket.qrTicketBullet2", { minutes: validMinutes });
			const b3 = centerClass.t("smartCardTicket.qrTicketBullet3", { channels: channels });

			cardsHTML += `
				<article class="pass-item-card">
					<div class="pass-card-head">
						<div class="pass-card-title-group">
							<span class="pass-card-icon">📱</span>
							<h3 class="pass-card-title">${qr.label?.[this.#activeLang] || qr.label?.en || centerClass.t("smartCardTicket.products.qr_ticket")}</h3>
						</div>
						<span class="pass-tag-badge">${centerClass.t("smartCardTicket.digitalTag")}</span>
					</div>
					<ul class="pass-bullets-list">
						<li>${this.#escapeHTML(b1)}</li>
						<li>${this.#escapeHTML(b2)}</li>
						<li>${this.#escapeHTML(b3)}</li>
					</ul>
				</article>
			`;
		}

		// 6. NCMC RuPay / Interoperable Card Unit
		if (products.ncmc_card) {
			handledKeys.add("ncmc_card");
			const ncmc = products.ncmc_card;
			const b1 = centerClass.t("smartCardTicket.ncmcBullet1");
			const b2 = centerClass.t("smartCardTicket.ncmcBullet2");
			const b3 = centerClass.t("smartCardTicket.ncmcBullet3", { percent: ncmc.discountPercent || 10 });
			const bullets = [b1, b2, b3];
			if (ncmc.weekendDiscountPercent) {
				bullets.push(centerClass.t("smartCardTicket.smartCardWeekendBullet", { percent: ncmc.weekendDiscountPercent }));
			}

			cardsHTML += `
				<article class="pass-item-card">
					<div class="pass-card-head">
						<div class="pass-card-title-group">
							<span class="pass-card-icon">🏦</span>
							<h3 class="pass-card-title">${products.ncmc_card.label?.[this.#activeLang] || products.ncmc_card.label?.en || centerClass.t("smartCardTicket.products.ncmc_card")}</h3>
						</div>
						<span class="pass-tag-badge">${centerClass.t("smartCardTicket.interoperableTag")}</span>
					</div>
					<ul class="pass-bullets-list">
						${bullets.map(b => `<li>${this.#escapeHTML(b)}</li>`).join("")}
					</ul>
				</article>
			`;
		}

		// 7. 🌐 Fully Generic Global Product Renderer (Paris Navigo, Tokyo Suica/Pasmo, London Oyster, etc.)
		handledKeys.add("token");
		handledKeys.add("off_peak_smart_card");

		Object.entries(products).forEach(([pKey, pProd]) => {
			if (handledKeys.has(pKey)) return;

			const pTitle = pProd.label?.[this.#activeLang] 
				|| pProd.label?.en 
				|| (centerClass.t(`smartCardTicket.products.${pKey}`) !== `smartCardTicket.products.${pKey}` ? centerClass.t(`smartCardTicket.products.${pKey}`) : null)
				|| pKey;

			const pTag = pProd.type ? pProd.type.toUpperCase() : centerClass.t("smartCardTicket.dailyCommutersTag");
			const bullets = [];

			if (pProd.cost != null) {
				bullets.push(`<strong>${centerClass.t("smartCardTicket.colToken")}:</strong> ${curr} ${pProd.cost}`);
			}
			if (pProd.discountPercent != null) {
				bullets.push(`<strong>${centerClass.t("smartCardTicket.colSmartCard", { percent: pProd.discountPercent })}</strong>`);
			}
			if (pProd.validityDays != null) {
				bullets.push(`<strong>Validity:</strong> ${pProd.validityDays} days`);
			}
			if (pProd.validityMinutes != null) {
				bullets.push(`<strong>Validity:</strong> ${pProd.validityMinutes} mins`);
			}
			if (pProd.channels && Array.isArray(pProd.channels)) {
				bullets.push(`<strong>Channels:</strong> ${pProd.channels.join(", ")}`);
			}
			if (pProd.multiplier != null) {
				bullets.push(`<strong>Multiplier:</strong> ${pProd.multiplier}x standard`);
			}
			if (pProd.description?.[this.#activeLang] || pProd.description?.en) {
				bullets.push(pProd.description[this.#activeLang] || pProd.description.en);
			}

			if (bullets.length === 0) {
				bullets.push(pTitle);
			}

			cardsHTML += `
				<article class="pass-item-card">
					<div class="pass-card-head">
						<div class="pass-card-title-group">
							<span class="pass-card-icon">🎫</span>
							<h3 class="pass-card-title">${this.#escapeHTML(pTitle)}</h3>
						</div>
						<span class="pass-tag-badge">${this.#escapeHTML(pTag)}</span>
					</div>
					<ul class="pass-bullets-list">
						${bullets.map(b => `<li>${b}</li>`).join("")}
					</ul>
				</article>
			`;
		});

		this.#passesGridEl.innerHTML = cardsHTML;
	}

	destroy() {
		if (this.#tabsNavEl) this.#tabsNavEl.innerHTML = "";
		if (this.#tableContainerEl) this.#tableContainerEl.innerHTML = "";
		if (this.#passesGridEl) this.#passesGridEl.innerHTML = "";
	}

	#escapeHTML(str) {
		if (typeof str !== "string") return String(str ?? "");
		return str.replace(/[&<>'"]/g, 
			tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
		);
	}
}
