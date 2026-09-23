/**
 * =========================================================================
 * TVM KIOSK CONTROLLER APPLICATION (ES2022 OOP CLASS)
 * =========================================================================
 */

import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';
import { SvgTicketController } from '../components/svg_ticket_controller.js';

class TvmKioskApp {
	/** @type {SvgTicketController|null} */
	#ticketCtrl = null;

	/** @type {AudioContext|null} */
	#audioCtx = null;

	/** @type {Record<string, HTMLElement>} */
	#dom = {};

	constructor() {
		this.#cacheDom();
		this.#bindEvents();
		this.#initSvgFromLocalPath();
	}

	/* -------------------------------------------------------------------------
	   1. DOM CACHING
	   ------------------------------------------------------------------------- */
	#cacheDom() {
		const ids = [
			'dispense-bay', 'dispenser-led', 'btn-print', 'sound-toggle',
			'ticket-mount-point', 'input-passenger', 'input-from', 'input-to',
			'input-price', 'input-ticket-num', 'input-status', 'input-duration',
			'btn-open-svg', 'ticket-paper', 'kiosk-tray-well'
		];
		this.#dom = Object.fromEntries(
			ids.map(id => [
				id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
				document.getElementById(id) ?? document.querySelector('.' + id)
			])
		);
		// querySelector fallbacks
		this.#dom.ticketPaper  = document.getElementById('ticket-paper');
		this.#dom.kioskTrayWell = document.querySelector('.kiosk-tray-well');
	}

	/* -------------------------------------------------------------------------
	   2. SVG TICKET FETCH & MOUNT
	   ------------------------------------------------------------------------- */
	async #initSvgFromLocalPath() {
		let svgSource = '';
		try {
			const resp = await fetch('./assets/images/metro_ticket.svg');
			if (resp.ok) {
				svgSource = await resp.text();
				console.log('✓ Ticket SVG loaded: ./assets/images/metro_ticket.svg');
			}
		} catch (e) {
			console.warn('fetch() blocked. Trying window fallback:', e);
		}

		if (!svgSource && window.METRO_TICKET_SVG) {
			svgSource = window.METRO_TICKET_SVG;
			console.log('✓ SVG loaded via window fallback.');
		}

		const mount = document.getElementById('ticket-mount-point');
		if (mount && svgSource) {
			mount.innerHTML = svgSource;
			const svgRoot = mount.querySelector('svg');
			if (svgRoot) {
				svgRoot.id = 'ticket-svg-root';
				this.#ticketCtrl = new SvgTicketController(svgRoot);
				this.#applyFormDataToTicket();
				if (this.#dom.dispenserLed) this.#dom.dispenserLed.classList.add('ready');
			}
		}
	}

	/* -------------------------------------------------------------------------
	   3. EVENT BINDING (ZERO INLINE EVENTS)
	   ------------------------------------------------------------------------- */
	#bindEvents() {
		// Live form sync
		['inputPassenger','inputFrom','inputTo','inputPrice','inputTicketNum','inputStatus','inputDuration']
			.forEach(key => {
				const el = this.#dom[key];
				if (el) {
					el.addEventListener('input',  () => this.#applyFormDataToTicket());
					el.addEventListener('change', () => this.#applyFormDataToTicket());
				}
			});

		// Print / Dispense button
		const printBtn = document.getElementById('btn-print');
		if (printBtn) {
			printBtn.addEventListener('click', () => this.#triggerDispense());
		}

		// Open SVG standalone
		const openSvgBtn = document.getElementById('btn-open-svg');
		if (openSvgBtn) {
			openSvgBtn.addEventListener('click', () =>
				window.open('./assets/images/metro_ticket.svg', '_blank')
			);
		}
	}

	/* -------------------------------------------------------------------------
	   4. TICKET DATA SYNC
	   ------------------------------------------------------------------------- */
	#applyFormDataToTicket() {
		if (!this.#ticketCtrl) return;
		const d = this.#dom;
		this.#ticketCtrl.setPassengerDetails({
			name:  d.inputPassenger?.value || '',
			from:  d.inputFrom?.value || '',
			to:    d.inputTo?.value || '',
			price: d.inputPrice?.value || ''
		});
		this.#ticketCtrl.setTicketNumber(d.inputTicketNum?.value || '');
		this.#ticketCtrl.setLiveDateTime(parseInt(d.inputDuration?.value, 10) || 90);
		this.#ticketCtrl.setTicketStatus(d.inputStatus?.value || 'valid');
	}

	/* -------------------------------------------------------------------------
	   5. THERMAL PRINTER AUDIO SYNTHESIS
	   ------------------------------------------------------------------------- */
	#playPrinterSound() {
		const soundToggle = document.getElementById('sound-toggle');
		if (!soundToggle?.checked) return;
		try {
			if (!this.#audioCtx) {
				const AudioClass = window.AudioContext || window.webkitAudioContext;
				if (AudioClass) this.#audioCtx = new AudioClass();
			}
			if (!this.#audioCtx) return;
			if (this.#audioCtx.state === 'suspended') this.#audioCtx.resume();

			const ctx = this.#audioCtx;
			const now = ctx.currentTime;

			const playNoise = (start, dur, vol, freq) => {
				const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
				const data = buf.getChannelData(0);
				for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
				const src = ctx.createBufferSource();
				const filt = ctx.createBiquadFilter();
				const gain = ctx.createGain();
				src.buffer = buf;
				filt.type = 'bandpass';
				filt.frequency.value = freq;
				filt.Q.value = 0.8;
				gain.gain.setValueAtTime(0.0001, start);
				gain.gain.exponentialRampToValueAtTime(vol, start + 0.012);
				gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
				src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
				src.start(start); src.stop(start + dur);
			};

			// Motor hum
			const motor = ctx.createOscillator();
			const mGain = ctx.createGain();
			motor.type = 'triangle';
			motor.frequency.setValueAtTime(74, now);
			motor.frequency.linearRampToValueAtTime(82, now + 2.35);
			mGain.gain.setValueAtTime(0.0001, now);
			mGain.gain.exponentialRampToValueAtTime(0.018, now + 0.05);
			mGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.45);
			motor.connect(mGain); mGain.connect(ctx.destination);
			motor.start(now); motor.stop(now + 2.46);

			// Paper feed texture
			for (let i = 0; i < 17; i++) playNoise(now + 0.08 + (i * 0.135), 0.075, 0.022, 1750);

			// Cutter + settle
			playNoise(now + 2.48, 0.06, 0.075, 1050);
			playNoise(now + 2.91, 0.08, 0.035, 620);
			playNoise(now + 3.03, 0.05, 0.018, 850);

		} catch (e) {
			console.warn('Web Audio API error:', e);
		}
	}

	/* -------------------------------------------------------------------------
	   6. 3-STEP DISPENSE STATE MACHINE
	   ------------------------------------------------------------------------- */
	#setTicketDropDistance() {
		const paper = document.getElementById('ticket-paper');
		const tray  = document.querySelector('.kiosk-tray-well');
		if (!paper || !tray) return;
		const dist = Math.round(tray.getBoundingClientRect().top - paper.getBoundingClientRect().top + 8);
		paper.style.setProperty('--ticket-drop-distance', `${Math.min(72, Math.max(18, dist))}px`);
	}

	#triggerDispense() {
		const bay    = document.getElementById('dispense-bay');
		const led    = document.getElementById('dispenser-led');
		const btn    = document.getElementById('btn-print');
		if (!btn || !bay || !led) return;

		btn.disabled = true;
		this.#playPrinterSound();
		bay.className = 'ticket-dispense-bay state-idle';
		led.className = 'dispenser-led active';
		this.#applyFormDataToTicket();

		setTimeout(() => { bay.className = 'ticket-dispense-bay state-dispensing'; }, 80);
		setTimeout(() => {
			this.#setTicketDropDistance();
			bay.className = 'ticket-dispense-bay state-dispensed';
			led.className = 'dispenser-led ready';
			btn.disabled  = false;
		}, 2900);
	}
}

// Auto-init with Header & Footer rendering
const initApp = async () => {
	await HeaderComponent.render('tvm_dispenser');
	FooterComponent.render();
	new TvmKioskApp();
};

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initApp);
} else {
	initApp();
}