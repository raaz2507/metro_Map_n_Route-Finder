/**
 * =========================================================================
 * SVG TICKET CONTROLLER (OOP CLASS-BASED)
 * =========================================================================
 * Dynamically controls and updates SVG ticket values:
 * - Header Title (e.g. "DELHI METRO", "TRAIN TICKET")
 * - Date Value ("04 SEP", "7 JUNE")
 * - Departure Time ("09:00", "15:30")
 * - Arrival / Validity Time ("10:30", "23:59")
 * =========================================================================
 */

class SvgTicketController {
	/** @type {SVGElement|HTMLElement|Document|null} */
	#svgRoot = null;
	#countdownTimer = null;

	/**
	 * @param {SVGElement|HTMLElement|string|null} [containerOrSelector=null] 
	 * Target SVG element, container element, or CSS selector. Defaults to document.
	 */
	constructor(containerOrSelector = null) {
		this.attach(containerOrSelector);
	}

	/**
	 * Attach controller to an SVG or DOM container
	 * @param {SVGElement|HTMLElement|string|null} [target=null]
	 * @returns {this}
	 */
	attach(target = null) {
		if (typeof window === 'undefined' && !target) return this;
		
		if (!target) {
			this.#svgRoot = document;
		} else if (typeof target === 'string') {
			this.#svgRoot = document.querySelector(target) || document;
		} else {
			this.#svgRoot = target;
		}
		return this;
	}

	/**
	 * Internal helper to find elements inside SVG scope
	 * @param {string} id 
	 * @returns {SVGElement|HTMLElement|null}
	 */
	#getEl(id) {
		if (!this.#svgRoot) return null;
		if (typeof this.#svgRoot.getElementById === 'function') {
			return this.#svgRoot.getElementById(id);
		}
		return this.#svgRoot.querySelector ? this.#svgRoot.querySelector(`#${id}`) : null;
	}

	/**
	 * Update the main Header Title
	 * @param {string} title Text to show (e.g. "METRO PASS", "MUMBAI METRO")
	 * @returns {this}
	 */
	setHeaderTitle(title) {
		if (typeof title !== 'string') return this;
		const el = this.#getEl('ticket-header-title-val');
		if (el) el.textContent = title;
		return this;
	}

	/**
	 * Update the Bottom Stub Title (e.g. "YATRA MARG", "SINGLE TICKET")
	 * @param {string} title 
	 * @returns {this}
	 */
	setStubTitle(title) {
		if (typeof title !== 'string') return this;
		const el = this.#getEl('stub-title-val');
		if (el) {
			const parts = title.trim().split(/\s+/);
			if (parts.length >= 2) {
				el.innerHTML = `<tspan x="944" y="100" font-size="42px" letter-spacing="3px">${parts[0]}</tspan><tspan x="944" y="142" font-size="42px" letter-spacing="3px">${parts.slice(1).join(' ')}</tspan>`;
			} else {
				el.innerHTML = `<tspan x="944" y="120" font-size="38px" letter-spacing="2px">${title}</tspan>`;
			}
		}
		return this;
	}

	/**
	 * Update Date text
	 * @param {string} dateStr Formatted date (e.g. "04 SEP", "07 JUNE")
	 * @returns {this}
	 */
	setDate(dateStr) {
		if (typeof dateStr !== 'string') return this;
		const el = this.#getEl('ticket-header-date-val');
		if (el) el.textContent = dateStr;
		return this;
	}

	/**
	 * Update Year text on the line below date
	 * @param {string|number} yearStr Year (e.g. "2026", 2026)
	 * @returns {this}
	 */
	setYear(yearStr) {
		if (yearStr === undefined || yearStr === null) return this;
		const el = this.#getEl('ticket-header-year-val');
		if (el) el.textContent = String(yearStr);
		return this;
	}

	/**
	 * Update Departure / Entry time
	 * @param {string} departureStr Departure/Entry time (e.g. "09:00 AM", "04:25 PM")
	 * @returns {this}
	 */
	setDeparture(departureStr) {
		if (typeof departureStr !== 'string') return this;
		const el = this.#getEl('ticket-header-departure-val');
		if (el) el.textContent = departureStr;
		return this;
	}

	/**
	 * Update Entry Time (Metro term)
	 * @param {string} timeStr Entry time (e.g. "09:00 AM", "04:25 PM")
	 * @returns {this}
	 */
	setEntryTime(timeStr) {
		return this.setDeparture(timeStr);
	}

	/**
	 * Update Arrival / Valid Till time
	 * @param {string} arriveStr Arrival/Validity time (e.g. "10:30 AM", "05:55 PM")
	 * @returns {this}
	 */
	setArrive(arriveStr) {
		if (typeof arriveStr !== 'string') return this;
		const el = this.#getEl('ticket-header-arrive-val');
		if (el) el.textContent = arriveStr;
		return this;
	}

	/**
	 * Update Valid Till time (Metro term)
	 * @param {string} timeStr Validity time (e.g. "10:30 AM", "05:55 PM")
	 * @returns {this}
	 */
	setValidTill(timeStr) {
		return this.setArrive(timeStr);
	}

	/**
	 * Update all header fields in a single call
	 * @param {Object} options
	 * @param {string} [options.title] Header title
	 * @param {string} [options.date] Date string
	 * @param {string|number} [options.year] Year string
	 * @param {string} [options.departure] Departure time
	 * @param {string} [options.entryTime] Entry time alias
	 * @param {string} [options.arrive] Arrive time
	 * @param {string} [options.validTill] Valid Till time alias
	 * @returns {this}
	 */
	updateHeader({ title, date, year, departure, entryTime, arrive, validTill } = {}) {
		if (title !== undefined) this.setHeaderTitle(title);
		if (date !== undefined) this.setDate(date);
		if (year !== undefined) this.setYear(year);
		if (entryTime !== undefined) this.setEntryTime(entryTime);
		else if (departure !== undefined) this.setDeparture(departure);
		if (validTill !== undefined) this.setValidTill(validTill);
		else if (arrive !== undefined) this.setArrive(arrive);
		return this;
	}

	/**
	 * Set Passenger Name
	 * @param {string} name (e.g. "JOHN SMITH", "RAHUL SHARMA")
	 * @returns {this}
	 */
	setPassengerName(name) {
		const el = this.#getEl('ticket-passenger-name-val');
		if (el) el.textContent = name !== undefined && name !== null && name !== '' ? String(name).toUpperCase() : '________';
		return this;
	}

	/**
	 * Set Starting Station (FROM:)
	 * @param {string} station (e.g. "KASHMERE GATE", "RAJIV CHOWK")
	 * @returns {this}
	 */
	setFromStation(station) {
		const el = this.#getEl('ticket-from-val');
		if (el) el.textContent = station !== undefined && station !== null && station !== '' ? String(station).toUpperCase() : '________';
		return this;
	}

	/**
	 * Set Destination Station (TO:)
	 * @param {string} station (e.g. "NOIDA CITY CENTRE", "AIRPORT")
	 * @returns {this}
	 */
	setToStation(station) {
		const el = this.#getEl('ticket-to-val');
		if (el) el.textContent = station !== undefined && station !== null && station !== '' ? String(station).toUpperCase() : '________';
		return this;
	}

	/**
	 * Set Ticket Price / Fare
	 * @param {string|number} price (e.g. "30 RS", "50 INR", 40)
	 * @returns {this}
	 */
	setPrice(price) {
		const el = this.#getEl('ticket-price-val');
		if (el) {
			if (price === undefined || price === null || price === '') {
				el.textContent = '________';
			} else {
				const str = String(price).trim();
				el.textContent = str.match(/(RS|INR|₹|EURO|\$)/i) ? str.toUpperCase() : `₹ ${str}`;
			}
		}
		return this;
	}

	/**
	 * Set all passenger and trip details in a single call
	 * @param {Object} options
	 * @param {string} [options.name] Passenger Name
	 * @param {string} [options.from] From Station
	 * @param {string} [options.to] Destination Station
	 * @param {string|number} [options.price] Fare / Price
	 * @returns {this}
	 */
	setPassengerDetails({ name, from, to, price } = {}) {
		if (name !== undefined) this.setPassengerName(name);
		if (from !== undefined) this.setFromStation(from);
		if (to !== undefined) this.setToStation(to);
		if (price !== undefined) this.setPrice(price);
		return this;
	}

	/**
	 * Set the left footer network text (e.g. "BHARTIYE METRO", "DELHI METRO")
	 * @param {string} text
	 * @returns {this}
	 */
	setFooterLeft(text) {
		const el = this.#getEl('ticket-footer-left-val');
		if (el) el.textContent = text !== undefined && text !== null && text !== '' ? String(text).toUpperCase() : 'BHARTIYE METRO';
		return this;
	}

	/**
	 * Alias for setFooterLeft
	 * @param {string} text
	 * @returns {this}
	 */
	setFooterNetwork(text) {
		return this.setFooterLeft(text);
	}

	/**
	 * Set Ticket Number / ID in the footer left slot.
	 * If ticketNum is provided (e.g. "T1 0123456789-A", "DEL-94821"), it displays it.
	 * If ticketNum is empty, null, or undefined, it automatically defaults to "BHARTIYE METRO".
	 * 
	 * @param {string|number} [ticketNum]
	 * @returns {this}
	 */
	setTicketNumber(ticketNum) {
		const el = this.#getEl('ticket-footer-left-val');
		if (el) {
			if (ticketNum !== undefined && ticketNum !== null && String(ticketNum).trim() !== '') {
				el.textContent = String(ticketNum).toUpperCase();
			} else {
				el.textContent = 'BHARTIYE METRO';
			}
		}
		return this;
	}

	/**
	 * Alias for setTicketNumber
	 * @param {string|number} [ticketId]
	 * @returns {this}
	 */
	setTicketId(ticketId) {
		return this.setTicketNumber(ticketId);
	}

	/**
	 * Set the right footer class text (e.g. "ECONOMY CLASS", "STANDARD CLASS", "VIP")
	 * @param {string} text
	 * @returns {this}
	 */
	setFooterClass(text) {
		const el = this.#getEl('ticket-footer-class-val');
		if (el) el.textContent = text !== undefined && text !== null && text !== '' ? String(text).toUpperCase() : 'ECONOMY CLASS';
		return this;
	}

	/**
	 * Set all footer details in a single call
	 * @param {Object} options
	 * @param {string} [options.network] Network text (e.g. "BHARTIYE METRO")
	 * @param {string} [options.ticketNumber] Ticket ID / Number (e.g. "T1 0123456789-A")
	 * @param {string} [options.classType] Class text (e.g. "ECONOMY CLASS")
	 * @returns {this}
	 */
	setFooterDetails({ network, ticketNumber, classType } = {}) {
		if (ticketNumber !== undefined) this.setTicketNumber(ticketNumber);
		else if (network !== undefined) this.setFooterLeft(network);
		if (classType !== undefined) this.setFooterClass(classType);
		return this;
	}

	/**
	 * Convenient helper to automatically populate live current Date and Time
	 * @param {number} [durationMinutes=45] Duration in minutes to add for arrive time
	 * @returns {this}
	 */
	setLiveDateTime(durationMinutes = 45) {
		const now = new Date();
		const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase();
		const yearStr = String(now.getFullYear());
		const depStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
		
		const arrDate = new Date(now.getTime() + durationMinutes * 60000);
		const arrStr = arrDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

		this.updateHeader({
			date: dateStr,
			year: yearStr,
			entryTime: depStr,
			validTill: arrStr
		});
		this.setTicketStatus('valid', { text: arrStr });
		return this;
	}

	/**
	 * Set ticket validity status (Green = Active/Valid, Red = Expired/Invalid)
	 * @param {'valid'|'active'|'expired'|'invalid'} status
	 * @param {Object} [options={}]
	 * @param {string} [options.text] Custom time or message to show
	 * @returns {this}
	 */
	setTicketStatus(status = 'valid', { text } = {}) {
		const valEl = this.#getEl('ticket-header-arrive-val');
		const labelEl = this.#getEl('ticket-status-label');
		const isGood = status === 'valid' || status === 'active';

		if (valEl) {
			if (valEl.classList) {
				valEl.classList.remove('ticket-status-valid', 'ticket-status-expired');
				valEl.classList.add(isGood ? 'ticket-status-valid' : 'ticket-status-expired');
			}
			valEl.style.fill = isGood ? '#4ADE80' : '#EF4444';
			valEl.setAttribute('fill', isGood ? '#4ADE80' : '#EF4444');
			if (text !== undefined) {
				valEl.textContent = text;
			}
		}
		if (labelEl) {
			labelEl.textContent = isGood ? 'VALID TILL' : 'EXPIRED';
			labelEl.style.fill = isGood ? '#ECE1C0' : '#EF4444';
			labelEl.setAttribute('fill', isGood ? '#ECE1C0' : '#EF4444');
		}
		return this;
	}

	/**
	 * Start a live dynamic clock & countdown timer:
	 * Dynamically updates ENTRY TIME and VALID TILL.
	 * Automatically turns GREEN when active, and RED when expired!
	 * 
	 * @param {number} [durationMinutes=45] Duration in minutes
	 * @returns {this}
	 */
	startLiveCountdown(durationMinutes = 45) {
		this.stopLiveCountdown();

		const startTime = new Date();
		const expiryTime = new Date(startTime.getTime() + durationMinutes * 60000);

		const updateTick = () => {
			const now = new Date();
			const isExpired = now >= expiryTime;

			const dateStr = startTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase();
			const yearStr = String(startTime.getFullYear());
			const entryStr = startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
			const validStr = expiryTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

			this.setDate(dateStr);
			this.setYear(yearStr);
			this.setEntryTime(entryStr);
			this.setValidTill(validStr);

			if (isExpired) {
				this.setTicketStatus('expired', { text: validStr });
				this.stopLiveCountdown();
			} else {
				this.setTicketStatus('valid', { text: validStr });
			}
		};

		updateTick();
		this.#countdownTimer = setInterval(updateTick, 1000);
		return this;
	}

	/**
	 * Stop active live countdown timer
	 * @returns {this}
	 */
	stopLiveCountdown() {
		if (this.#countdownTimer) {
			clearInterval(this.#countdownTimer);
			this.#countdownTimer = null;
		}
		return this;
	}

	/**
	 * Get the QR code SVG group element
	 * @returns {SVGElement|HTMLElement|null}
	 */
	getQrContainer() {
		return this.#getEl('upper-vector-qr-code');
	}

	/**
	 * Set or update the scan instruction micro-text under the QR code
	 * @param {string} text (e.g. "SCAN AT AFC GATES FOR ENTRY & EXIT")
	 * @returns {this}
	 */
	setQrInstruction(text) {
		const el = this.#getEl('ticket-qr-instruction');
		if (el) el.textContent = text !== undefined && text !== null && text !== '' ? String(text).toUpperCase() : 'SCAN AT AFC GATES FOR ENTRY & EXIT';
		return this;
	}

	/**
	 * Set or update the single journey validity text under the instruction line
	 * @param {string} text (e.g. "• VALID FOR SINGLE JOURNEY •")
	 * @returns {this}
	 */
	setQrValidity(text) {
		const el = this.#getEl('ticket-qr-validity');
		if (el) el.textContent = text !== undefined && text !== null && text !== '' ? String(text).toUpperCase() : '• VALID FOR SINGLE JOURNEY •';
		return this;
	}

	/**
	 * Dynamically set or replace the QR Code:
	 * Supports:
	 * 1. Image URL or Base64 Data URL ("data:image/png;base64,...", "ticket_qr.png")
	 * 2. Raw SVG string (`<svg...>`, `<path...>`, `<rect...>`)
	 * 3. 2D boolean/number matrix ([ [1, 0, ...], ... ])
	 * 
	 * @param {string|Array<Array<number|boolean>>} qrData 
	 * @param {Object} [options={}]
	 * @param {string} [options.color] Color to apply (e.g. "#5F7374", "#1A365D")
	 * @returns {this}
	 */
	setQrCode(qrData, options = {}) {
		const container = this.getQrContainer();
		if (!container) return this;

		const color = options.color || '#5F7374';

		if (typeof qrData === 'string') {
			const trimmed = qrData.trim();
			if (trimmed.startsWith('<svg') || trimmed.startsWith('<g') || trimmed.startsWith('<path') || trimmed.startsWith('<rect')) {
				// Raw SVG markup
				container.innerHTML = trimmed;
				if (options.color) this.setQrColor(color);
			} else if (trimmed.startsWith('data:') || trimmed.startsWith('http') || trimmed.startsWith('/') || trimmed.startsWith('./')) {
				// Image or Data URL: centered in the QR slot bounds (X: 631..735, Y: 170..280)
				container.innerHTML = `<image x="631" y="174" width="104" height="104" preserveAspectRatio="xMidYMid meet" href="${trimmed}" xlink:href="${trimmed}"/>`;
			} else {
				container.innerHTML = trimmed;
			}
		} else if (Array.isArray(qrData)) {
			// 2D Matrix grid
			const size = qrData.length;
			const modSize = 104 / size;
			let rects = '';
			for (let r = 0; r < size; r++) {
				for (let c = 0; c < size; c++) {
					if (qrData[r][c]) {
						rects += `<rect x="${(631 + c * modSize).toFixed(2)}" y="${(174 + r * modSize).toFixed(2)}" width="${modSize.toFixed(2)}" height="${modSize.toFixed(2)}" style="fill:${color};"/>`;
					}
				}
			}
			container.innerHTML = `<g>${rects}</g>`;
		}

		if (options.color) {
			this.setQrColor(color);
		}
		return this;
	}

	/**
	 * Set or change the fill color of the QR code modules
	 * @param {string} color CSS color (e.g. "#5F7374", "#0A2540", "#000000")
	 * @returns {this}
	 */
	setQrColor(color) {
		if (typeof color !== 'string') return this;
		const container = this.getQrContainer();
		if (!container) return this;

		const coloredEls = container.querySelectorAll('rect, path, polygon, circle');
		coloredEls.forEach(el => {
			const currentFill = el.getAttribute('fill') || el.style.fill;
			if (currentFill !== 'none' && currentFill !== '#FFFFFF' && currentFill !== 'white') {
				el.setAttribute('fill', color);
				el.style.fill = color;
			}
		});
		return this;
	}

	/**
	 * Set or change the color and opacity of the train watermark illustration
	 * @param {string} color CSS color (e.g. "#5F7374", "#B88D4B", "#1A365D", "#8C7E68")
	 * @param {number|null} [opacity=null] Optional opacity (e.g. 0.35, 0.5, 0.2)
	 * @returns {this}
	 */
	setTrainColor(color, opacity = null) {
		const trainEl = this.#getEl('train-illustration-graphic');
		if (!trainEl) return this;

		if (opacity !== null && typeof opacity === 'number') {
			trainEl.style.opacity = opacity;
			trainEl.setAttribute('opacity', opacity);
			// Check child group
			const innerGroup = trainEl.querySelector('g');
			if (innerGroup) {
				innerGroup.style.opacity = opacity;
				innerGroup.setAttribute('opacity', opacity);
			}
		}

		if (typeof color === 'string') {
			const elements = trainEl.querySelectorAll('path, polygon, rect');
			elements.forEach(el => {
				const currentFill = el.getAttribute('fill') || el.style.fill;
				if (currentFill !== 'none') {
					el.setAttribute('fill', color);
					el.style.fill = color;
				}
			});
		}
		return this;
	}

	/**
	 * Set or change the fill color of the bottom stub QR code
	 * @param {string} color CSS color (e.g. "#ECE1C0", "#B88D4B", "#FFFFFF")
	 * @returns {this}
	 */
	setStubQrColor(color) {
		if (typeof color !== 'string') return this;
		const container = this.#getEl('stub-qr-code');
		if (!container) return this;

		const coloredEls = container.querySelectorAll('rect, path, polygon, circle');
		coloredEls.forEach(el => {
			const currentFill = el.getAttribute('fill') || el.style.fill;
			if (currentFill !== 'none' && currentFill !== '#5F7374') {
				el.setAttribute('fill', color);
				el.style.fill = color;
			}
		});
		return this;
	}
}

// Global Browser Export & CommonJS Export
if (typeof window !== 'undefined') {
	window.SvgTicketController = SvgTicketController;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { SvgTicketController };
}
export { SvgTicketController };