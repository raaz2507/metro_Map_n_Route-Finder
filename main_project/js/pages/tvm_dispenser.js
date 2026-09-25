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
	#activeQrUrl = null;
	
	/** @type {AudioContext|null} */
	#audioCtx = null;
	
	/** @type {Record<string, HTMLElement|null>} */
	#dom = {};

	constructor() {
		this.#cacheDom();
		this.#bootstrapFormFromStorage();
		this.#bindEvents();
		this.#initSvgFromLocalPath();
	}

	/* -------------------------------------------------------------------------
	   1. DOM CACHING (CENTRALIZED)
	   ------------------------------------------------------------------------- */
	#cacheDom() {
		const queries = {
			dispenseBay: '#dispense-bay', dispenserLed: '#dispenser-led',
			btnPrint: '#btn-print', soundToggleBtn: '#sound-toggle-btn',
			ticketMountPoint: '#ticket-mount-point', ticketPaper: '#ticket-paper',
			kioskTrayWell: '.kiosk-tray-well',
			
			btnTvmSettings: '#btn-tvm-settings', btnCloseSettings: '#btn-close-settings',
			tvmSettingsOverlay: '#tvm-settings-overlay', rightPanelColumn: '.right-panel-column',
			btnSaveSettings: '#btn-save-settings', btnCancelSettings: '#btn-cancel-settings',
			
			btnTvmGateMode: '#btn-tvm-gate-mode', gateModal: '#gateModal',
			gateModalCanvas: '#gateModalCanvas', btnCloseGateModal: '#btnCloseGateModal',
			inputPassenger: '#input-passenger', inputFrom: '#input-from',
			inputTo: '#input-to', inputPrice: '#input-price',
			inputTicketNum: '#input-ticket-num', inputStatus: '#input-status',
			inputDuration: '#input-duration'
		};
		for (const [key, selector] of Object.entries(queries)) {
			this.#dom[key] = document.querySelector(selector);
		}
	}

	/* -------------------------------------------------------------------------
	   2. LOCAL STORAGE (CORE ARCHITECTURE STYLE)
	   ------------------------------------------------------------------------- */
	#bootstrapFormFromStorage() {
		try {
			const saved = localStorage.getItem('tvm_kiosk_form_data');
			if (saved) {
				const data = JSON.parse(saved);
				const d = this.#dom;
				
				// फॉर्म में सेव की गई वैल्यूज वापस भरें
				if (data.passenger && d.inputPassenger) d.inputPassenger.value = data.passenger;
				if (data.from && d.inputFrom) d.inputFrom.value = data.from;
				if (data.to && d.inputTo) d.inputTo.value = data.to;
				if (data.price && d.inputPrice) d.inputPrice.value = data.price;
			}
		} catch (e) {
			console.warn('[TvmKioskApp] Storage read error:', e);
		}
	}
	/* -------------------------------------------------------------------------
	   3. EVENT BINDING
	   ------------------------------------------------------------------------- */
	#bindEvents() {
		const d = this.#dom;
		const inputs = [d.inputPassenger, d.inputFrom, d.inputTo, d.inputPrice, d.inputTicketNum, d.inputStatus, d.inputDuration];
		inputs.forEach(el => {
			if (el) {
				el.addEventListener('input', () => this.#applyFormDataToTicket());
				el.addEventListener('change', () => this.#applyFormDataToTicket());
			}
		});
		d.btnPrint?.addEventListener('click', () => this.#triggerDispense());
		d.btnTvmSettings?.addEventListener('click', () => this.#openTvmSettings());
		d.btnTvmGateMode?.addEventListener('click', () => this.#openGateModal());
		d.soundToggleBtn?.addEventListener('click', (e) => {
			const span = e.currentTarget.querySelector('span');
			if (span) {
				const isMuted = span.innerText === '🔇';
				span.innerText = isMuted ? '🔊' : '🔇';
				span.style.opacity = isMuted ? '1' : '0.5';
			}
		});
		d.btnCloseSettings?.addEventListener('click', () => this.#closeTvmSettings());
		d.tvmSettingsOverlay?.addEventListener('click', () => this.#closeTvmSettings());
		d.btnSaveSettings?.addEventListener('click', () => this.#closeTvmSettings());
		d.btnCancelSettings?.addEventListener('click', () => this.#closeTvmSettings());
		d.btnCloseGateModal?.addEventListener('click', () => this.#closeGateModal());
	}

	/* -------------------------------------------------------------------------
	   4. SVG TICKET FETCH & INITIALIZATION
	   ------------------------------------------------------------------------- */
	async #initSvgFromLocalPath() {
		let svgSource = '';
		try {
			const resp = await fetch('./assets/images/metro_ticket.svg');
			if (resp.ok) svgSource = await resp.text();
		} catch (e) {
			console.warn('fetch() blocked. Trying window fallback:', e);
		}
		if (!svgSource && window.METRO_TICKET_SVG) {
			svgSource = window.METRO_TICKET_SVG;
		}
		const mount = this.#dom.ticketMountPoint;
		if (mount && svgSource) {
			mount.innerHTML = svgSource;
			const svgRoot = mount.querySelector('svg');
			
			if (svgRoot) {
				svgRoot.id = 'ticket-svg-root';
				this.#dom.ticketSvgRoot = svgRoot; 
				this.#ticketCtrl = new SvgTicketController(svgRoot);
				
				this.#loadTicketFromWallet();
				this.#init3DTiltEffect();
				this.#dom.dispenserLed?.classList.add('ready');
			}
		}
	}


	/* -------------------------------------------------------------------------
	   5. DATA SYNC (WALLET & FORM & LOCAL STORAGE)
	------------------------------------------------------------------------- */
	#loadTicketFromWallet() {
		try {
			const rawData = localStorage.getItem('metro_ticket_wallet_store');
			if (rawData) {
				const store = JSON.parse(rawData);
				if (store?.activeTicketId && Array.isArray(store.history)) {
					const activeRecord = store.history.find(t => t.id === store.activeTicketId);
					if (activeRecord?.cleanQrDataUrl) {
						if (this.#ticketCtrl) {
							this.#ticketCtrl.setQrCode(activeRecord.cleanQrDataUrl);
							this.#activeQrUrl = activeRecord.cleanQrDataUrl;
							this.#dom.btnTvmGateMode?.classList.remove('hidden');
						}
						setTimeout(() => this.#triggerDispense(), 800);
						return;
					}
				}
			}
		} catch (e) {
			console.warn("Wallet data not found:", e);
		}
		this.#applyFormDataToTicket();
	}


	#applyFormDataToTicket() {
		const d = this.#dom;
		
		// 1. Data Object बनाना
		const dataToPersist = {
			passenger: d.inputPassenger?.value || '',
			from: d.inputFrom?.value || '',
			to: d.inputTo?.value || '',
			price: d.inputPrice?.value || ''
		};
		// 2. Local Storage में JSON के रूप में सेव करना (Persistence)
		try {
			localStorage.setItem('tvm_kiosk_form_data', JSON.stringify(dataToPersist));
		} catch (e) {
			console.warn('[TvmKioskApp] Storage write error:', e);
		}
		
		// 3. Ticket Controller में डेटा पास करना
		if (!this.#ticketCtrl) return;
		
		this.#ticketCtrl.setPassengerDetails({
			name:  dataToPersist.passenger,
			from:  dataToPersist.from,
			to:    dataToPersist.to,
			price: dataToPersist.price
		});
		
		this.#ticketCtrl.setTicketNumber(d.inputTicketNum?.value || '');
		this.#ticketCtrl.setLiveDateTime(parseInt(d.inputDuration?.value, 10) || 90);
		this.#ticketCtrl.setTicketStatus(d.inputStatus?.value || 'valid');
		
		// 4. सिमुलेशन नाम सेट करना
		this.#ticketCtrl.setHeaderTitle("VIRTUAL METRO PASS");
	}
	/* -------------------------------------------------------------------------
	   6. 2.5D REAL PARALLAX TILT EFFECT
	   ------------------------------------------------------------------------- */
	#init3DTiltEffect() {
		const wrapper = this.#dom.ticketPaper;
		const mount = this.#dom.ticketMountPoint;
		const svgRoot = this.#dom.ticketSvgRoot;
		
		if (!wrapper || !mount || !svgRoot) return;
		mount.style.transformStyle = 'preserve-3d';
		
		const popElements = svgRoot.querySelectorAll('text, g[id*="qr"], path[fill="none"], .yatra-marg-logo');
		const originalTransforms = new Map();
		
		popElements.forEach(el => {
			originalTransforms.set(el, el.getAttribute('transform') || '');
			el.style.transition = 'transform 0.1s linear';
		});
		wrapper.addEventListener('mousemove', (e) => {
			const rect = wrapper.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			
			const centerX = rect.width / 2;
			const centerY = rect.height / 2;
			
			const rotateX = ((y - centerY) / centerY) * -10; 
			const rotateY = ((x - centerX) / centerX) * 10;
			
			mount.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
			mount.style.transition = 'none';
			const shiftX = (x - centerX) / centerX;
			const shiftY = (y - centerY) / centerY;
			popElements.forEach(el => {
				const depthAmount = el.tagName === 'text' ? 5 : 3; 
				const offsetX = shiftX * depthAmount;
				const offsetY = shiftY * depthAmount;
				
				const oldTx = originalTransforms.get(el);
				el.style.transform = `${oldTx} translate(${offsetX}px, ${offsetY}px)`;
			});
		});
		wrapper.addEventListener('mouseleave', () => {
			mount.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
			mount.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
			
			popElements.forEach(el => {
				el.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
				el.style.transform = originalTransforms.get(el);
			});
		});
		
		wrapper.addEventListener('mouseenter', () => {
			mount.style.transition = 'transform 0.1s'; 
			popElements.forEach(el => el.style.transition = 'transform 0.1s linear');
		});
	}
	/* -------------------------------------------------------------------------
	   7. MODALS & POPUPS
	   ------------------------------------------------------------------------- */
	#openTvmSettings() {
		this.#dom.rightPanelColumn?.classList.add('active');
		this.#dom.tvmSettingsOverlay?.classList.add('active');
	}
	#closeTvmSettings() {
		this.#dom.rightPanelColumn?.classList.remove('active');
		this.#dom.tvmSettingsOverlay?.classList.remove('active');
	}
	#openGateModal() {
		if (!this.#activeQrUrl || !this.#dom.gateModalCanvas) return;
		
		const canvas = this.#dom.gateModalCanvas;
		const ctx = canvas.getContext('2d');
		const img = new Image();
		
		img.onload = () => {
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			
			this.#dom.gateModal?.classList.add('active');
			this.#dom.gateModal?.setAttribute('aria-hidden', 'false');
		};
		img.src = this.#activeQrUrl;
	}
	#closeGateModal() {
		this.#dom.gateModal?.classList.remove('active');
		this.#dom.gateModal?.setAttribute('aria-hidden', 'true');
	}
	/* -------------------------------------------------------------------------
	   8. PRINTER & DISPENSE LOGIC
	   ------------------------------------------------------------------------- */
	#setTicketDropDistance() {
		const paper = this.#dom.ticketPaper;
		const tray  = this.#dom.kioskTrayWell;
		if (!paper || !tray) return;
		
		const dist = Math.round(tray.getBoundingClientRect().top - paper.getBoundingClientRect().top + 8);
		paper.style.setProperty('--ticket-drop-distance', `${Math.min(72, Math.max(18, dist))}px`);
	}
	#triggerDispense() {
		const d = this.#dom;
		if (!d.btnPrint || !d.dispenseBay || !d.dispenserLed) return;
		d.btnPrint.disabled = true;
		this.#playPrinterSound();
		
		d.dispenseBay.className = 'ticket-dispense-bay state-idle';
		d.dispenserLed.className = 'dispenser-led active';
		
		this.#applyFormDataToTicket();
		setTimeout(() => { 
			d.dispenseBay.className = 'ticket-dispense-bay state-dispensing'; 
		}, 80);
		
		setTimeout(() => {
			this.#setTicketDropDistance();
			d.dispenseBay.className = 'ticket-dispense-bay state-dispensed';
			d.dispenserLed.className = 'dispenser-led ready';
			d.btnPrint.disabled = false;
		}, 2900);
	}
	#playPrinterSound() {
		const span = this.#dom.soundToggleBtn?.querySelector('span');
		if (span && span.innerText === '🔇') return;
		
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
			for (let i = 0; i < 17; i++) playNoise(now + 0.08 + (i * 0.135), 0.075, 0.022, 1750);
			playNoise(now + 2.48, 0.06, 0.075, 1050);
			playNoise(now + 2.91, 0.08, 0.035, 620);
			playNoise(now + 3.03, 0.05, 0.018, 850);
		} catch (e) {
			console.warn('Web Audio API error:', e);
		}
	}
}
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