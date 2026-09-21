/**
 * @file metro_QR_ticket.js
 * Metro Pass Wallet & Dynamic QR Ticket Page Controller
 * Enterprise ES2022 Private OOP (#) Component
 * Connects Multi-Engine Fallback Pipeline (BarcodeDetector -> jsQR -> ZXing -> Padded -> Contrast)
 * with Pure Vector QR Generation, AppStateStore, EventBus, and Universal i18n Hub.
 */
import { HeaderComponent } from "../components/Header.js";
import { FooterComponent } from "../components/Footer.js";
import { Toast } from "../components/Toast.js";
import { eventBus } from "../core/event-bus.js";
import { appStateStore } from "../core/app-state-store.js";
import i18n from "../core/i18n.js";

// DOM Ready initialization
document.addEventListener('DOMContentLoaded', () => {
	const app = new TicketWalletApp();
	app.init();
});

class TicketWalletApp {
	static #STORAGE_KEY = 'metro_ticket_wallet_store';
	static #LEGACY_STORAGE_KEY = 'metro_ticket_wallet_store_poc';
	static #DMRC_VALIDITY_MINUTES = 180; // 3 Hours
	static #MAX_HISTORY_ITEMS = 13; // Max 13 tickets limit

	#state = {
		activeTicketId: null,
		history: [],
		timerIntervalId: null,
		pendingConfirmCallback: null
	};

	#dom = {};

	constructor() {}

	/**
	 * Initialize Universal Layout, Store, DOM Handles, and Event Listeners
	 */
	async init() {
		// 1. Render Universal Layout Header & Footer
		await HeaderComponent.render('ticket');
		FooterComponent.render('app-footer');

		// 2. Cache DOM Elements
		this.#initDomHandles();

		// 3. Bind UI & Accessibility Events
		this.#bindEvents();

		// 4. Reactive Store Subscriptions (Multi-Language Live Switch)
		this.#bindStoreSubscriptions();

		// 5. Load and Render Persisted Wallet Store
		this.#loadPersistedStore();
	}

	/**
	 * Cache DOM element handles via array mapping
	 */
	#initDomHandles() {
		const elementIds = [
			'ingestionCard', 'dropZone', 'fileInput', 'cameraInput',
			'btnCaptureCamera', 'btnPasteClipboard', 'passCard',
			'passCountdown', 'passQrSubtitle', 'qrDisplayCanvas',
			'btnOpenGateMode', 'btnViewOriginal', 'btnArchiveActive',
			'historyCountBadge', 'btnClearAllHistory', 'historyListContainer',
			'gateModal', 'gateModalCanvas', 'btnCloseGateModal',
			'originalModal', 'originalImagePreview', 'btnCloseOriginalModal',
			'confirmModal', 'confirmModalTitle', 'confirmModalDesc',
			'btnCancelConfirm', 'btnAcceptConfirm'
		];

		this.#dom = Object.fromEntries(
			elementIds.map(id => [id, document.getElementById(id)])
		);
	}

	/**
	 * Reactive subscriptions for language and theme updates
	 */
	#bindStoreSubscriptions() {
		// Re-render dynamic list whenever user switches language from Header
		appStateStore.subscribe('currentLang', () => {
			this.#renderHistoryList();
			if (this.#state.activeTicketId) {
				const activeRecord = this.#state.history.find(t => t.id === this.#state.activeTicketId);
				if (activeRecord && activeRecord.expiresAt <= Date.now()) {
					this.#dom.passCountdown.textContent = i18n.t('metroTicket.cards.history.statusExpired');
				}
			}
		});
	}

	#bindEvents() {
		// Direct Camera Capture
		this.#dom.btnCaptureCamera.addEventListener('click', () => this.#dom.cameraInput.click());
		this.#dom.cameraInput.addEventListener('change', (e) => this.#handleFileInputChange(e));

		// 1-Tap Paste from Clipboard
		this.#dom.btnPasteClipboard.addEventListener('click', () => this.#handleClipboardPaste());

		// File Drop & Click Select
		this.#dom.dropZone.addEventListener('click', () => this.#dom.fileInput.click());
		this.#dom.fileInput.addEventListener('change', (e) => this.#handleFileInputChange(e));

		// Drag & Drop
		this.#dom.dropZone.addEventListener('dragover', (e) => {
			e.preventDefault();
			this.#dom.dropZone.classList.add('dragover');
		});
		this.#dom.dropZone.addEventListener('dragleave', () => this.#dom.dropZone.classList.remove('dragover'));
		this.#dom.dropZone.addEventListener('drop', (e) => {
			e.preventDefault();
			this.#dom.dropZone.classList.remove('dragover');
			if (e.dataTransfer?.files?.[0]) {
				this.#processImageFile(e.dataTransfer.files[0]);
			}
		});

		// Document Level Paste Event (Ctrl+V)
		document.addEventListener('paste', (e) => this.#handleWindowPaste(e));

		// Gate Mode Modal Controls
		this.#dom.btnOpenGateMode.addEventListener('click', () => this.#openGateModal());
		this.#dom.btnCloseGateModal.addEventListener('click', () => this.#closeGateModal());

		// Original Image Modal Controls
		this.#dom.btnViewOriginal.addEventListener('click', () => this.#openOriginalModal());
		this.#dom.btnCloseOriginalModal.addEventListener('click', () => this.#closeOriginalModal());

		// Move Active Ticket to History
		this.#dom.btnArchiveActive.addEventListener('click', () => this.#archiveActiveTicket());

		// Clear All History Button
		this.#dom.btnClearAllHistory.addEventListener('click', () => this.#promptClearAllHistory());

		// Confirmation Modal Actions
		this.#dom.btnCancelConfirm.addEventListener('click', () => this.#closeConfirmModal());
		this.#dom.btnAcceptConfirm.addEventListener('click', () => {
			if (typeof this.#state.pendingConfirmCallback === 'function') {
				this.#state.pendingConfirmCallback();
			}
			this.#closeConfirmModal();
		});

		// Keyboard Accessibility (Escape to close modals)
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				if (this.#dom.confirmModal.classList.contains('active')) this.#closeConfirmModal();
				if (this.#dom.gateModal.classList.contains('active')) this.#closeGateModal();
				if (this.#dom.originalModal.classList.contains('active')) this.#closeOriginalModal();
			}
		});
	}

	async #handleClipboardPaste() {
		try {
			if (!navigator.clipboard?.read) {
				this.#showToast(i18n.t('metroTicket.toast.selectImage'));
				this.#dom.fileInput.click();
				return;
			}

			const items = await navigator.clipboard.read();
			let foundImage = false;

			for (const item of items) {
				const imageType = item.types.find(t => t.startsWith('image/'));
				if (imageType) {
					const blob = await item.getType(imageType);
					await this.#processImageFile(blob);
					foundImage = true;
					break;
				}
			}

			if (!foundImage) {
				this.#showToast(i18n.t('metroTicket.toast.noClipboard'));
			}
		} catch (err) {
			this.#showToast(i18n.t('metroTicket.toast.selectingFile'));
			this.#dom.fileInput.click();
		}
	}

	#handleWindowPaste(event) {
		const items = event.clipboardData?.items;
		if (!items) return;
		for (const item of items) {
			if (item.type.startsWith('image/')) {
				const file = item.getAsFile();
				if (file) this.#processImageFile(file);
				break;
			}
		}
	}

	#handleFileInputChange(event) {
		const file = event.target?.files?.[0];
		if (file) {
			this.#processImageFile(file);
			event.target.value = '';
		}
	}

	async #processImageFile(fileOrBlob) {
		this.#showToast(i18n.t('metroTicket.toast.scanning'));

		const img = new Image();
		const objectUrl = URL.createObjectURL(fileOrBlob);

		img.onload = async () => {
			try {
				await this.#executeMultiEngineScan(img);
			} finally {
				URL.revokeObjectURL(objectUrl);
			}
		};

		img.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			this.#showToast(i18n.t('metroTicket.toast.errorLoading'), 'error');
		};

		img.src = objectUrl;
	}

	async #executeMultiEngineScan(img) {
		const rawCanvas = document.createElement('canvas');
		const rawCtx = rawCanvas.getContext('2d', { willReadFrequently: true });
		rawCanvas.width = img.naturalWidth || img.width;
		rawCanvas.height = img.naturalHeight || img.height;
		rawCtx.drawImage(img, 0, 0);

		const originalDataUrl = this.#getOptimizedDataURL(rawCanvas);
		let tokenResult = null;

		// 1. Stage 1: Native BarcodeDetector (Hardware-accelerated)
		if ('BarcodeDetector' in window) {
			try {
				const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
				const barcodes = await detector.detect(rawCanvas);
				if (barcodes && barcodes.length > 0) {
					tokenResult = {
						text: barcodes[0].rawValue,
						engine: 'Native BarcodeDetector'
					};
				}
			} catch (e) {
				// Fallback to software decoders
			}
		}

		// 2. Stage 2: jsQR Engine (Fastest pure JS)
		if (!tokenResult && typeof window.jsQR === 'function') {
			try {
				const imgData = rawCtx.getImageData(0, 0, rawCanvas.width, rawCanvas.height);
				const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
					inversionAttempts: 'attemptBoth'
				});
				if (code && (code.data || code.binaryData)) {
					tokenResult = {
						text: code.data,
						binary: code.binaryData,
						engine: 'jsQR (Engine 1)'
					};
				}
			} catch (e) {
				console.warn('jsQR scan pass error:', e);
			}
		}

		// 3. Stage 3: ZXing Global Engine
		if (!tokenResult && window.ZXing) {
			try {
				const imgData = rawCtx.getImageData(0, 0, rawCanvas.width, rawCanvas.height);
				tokenResult = this.#scanWithZXing(imgData);
			} catch (e) {
				console.warn('ZXing scan pass error:', e);
			}
		}

		// 4. Stage 4: High-Contrast Binarization Fallback
		if (!tokenResult) {
			try {
				const contrastCanvas = this.#createBinarizedCanvas(rawCanvas);
				const contrastCtx = contrastCanvas.getContext('2d', { willReadFrequently: true });
				const contrastImgData = contrastCtx.getImageData(0, 0, contrastCanvas.width, contrastCanvas.height);

				if (typeof window.jsQR === 'function') {
					const code = window.jsQR(contrastImgData.data, contrastImgData.width, contrastImgData.height, {
						inversionAttempts: 'attemptBoth'
					});
					if (code && (code.data || code.binaryData)) {
						tokenResult = {
							text: code.data,
							binary: code.binaryData,
							engine: 'jsQR (High-Contrast Pass)'
						};
					}
				}

				if (!tokenResult && window.ZXing) {
					tokenResult = this.#scanWithZXing(contrastImgData);
					if (tokenResult) tokenResult.engine = 'ZXing (High-Contrast Pass)';
				}
			} catch (e) {
				console.warn('High contrast pass error:', e);
			}
		}

		// 5. Stage 5: Padded Margin Fallback (Tight crop recovery)
		if (!tokenResult) {
			try {
				const paddedCanvas = this.#createPaddedCanvas(rawCanvas, 40);
				const paddedCtx = paddedCanvas.getContext('2d', { willReadFrequently: true });
				const paddedImgData = paddedCtx.getImageData(0, 0, paddedCanvas.width, paddedCanvas.height);

				if (typeof window.jsQR === 'function') {
					const code = window.jsQR(paddedImgData.data, paddedImgData.width, paddedImgData.height, {
						inversionAttempts: 'attemptBoth'
					});
					if (code && (code.data || code.binaryData)) {
						tokenResult = {
							text: code.data,
							binary: code.binaryData,
							engine: 'jsQR (Padded Pass)'
						};
					}
				}

				if (!tokenResult && window.ZXing) {
					tokenResult = this.#scanWithZXing(paddedImgData);
					if (tokenResult) tokenResult.engine = 'ZXing (Padded Pass)';
				}
			} catch (e) {
				console.warn('Padded pass error:', e);
			}
		}

		// SUCCESS: Render Pure Mathematical Vector QR
		if (tokenResult && (tokenResult.text || tokenResult.binary)) {
			try {
				this.#renderPureVectorQR(tokenResult);
				const cleanQrDataUrl = this.#getOptimizedDataURL(this.#dom.qrDisplayCanvas);

				this.#createNewTicketRecord({
					tokenPayload: tokenResult.text || (tokenResult.binary ? '[Binary Token ' + tokenResult.binary.length + ' bytes]' : null),
					cleanQrDataUrl: cleanQrDataUrl,
					originalDataUrl: originalDataUrl,
					isPureVector: true,
					isError: false
				});

				this.#showToast(i18n.t('metroTicket.toast.qrGenerated', { engine: tokenResult.engine }), 'success');
				return;
			} catch (err) {
				console.error('Vector rendering error:', err);
			}
		}

		// FAILURE CASE: Clear Error Screen with instruction
		this.#renderErrorCanvas();
		const errorCanvasDataUrl = this.#getOptimizedDataURL(this.#dom.qrDisplayCanvas);

		this.#createNewTicketRecord({
			tokenPayload: null,
			cleanQrDataUrl: errorCanvasDataUrl,
			originalDataUrl: originalDataUrl,
			isPureVector: false,
			isError: true
		});

		this.#showToast(i18n.t('metroTicket.toast.qrNotDetected'), 'warning');
	}

	#scanWithZXing(imageData) {
		try {
			const w = imageData.width;
			const h = imageData.height;
			const luminances = new Uint8ClampedArray(w * h);
			for (let i = 0; i < w * h; i++) {
				luminances[i] = Math.round(0.299 * imageData.data[i * 4] + 0.587 * imageData.data[i * 4 + 1] + 0.114 * imageData.data[i * 4 + 2]);
			}
			const source = new ZXing.RGBLuminanceSource(luminances, w, h);
			const bitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(source));
			const hints = new Map();
			hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.QR_CODE]);
			hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

			const reader = new ZXing.MultiFormatReader();
			const result = reader.decode(bitmap, hints);

			if (result) {
				return {
					text: result.getText(),
					engine: 'ZXing (Engine 2)'
				};
			}
		} catch (e) {
			// Expected when code is not found
		}
		return null;
	}

	#createBinarizedCanvas(srcCanvas) {
		const canvas = document.createElement('canvas');
		canvas.width = srcCanvas.width;
		canvas.height = srcCanvas.height;
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		ctx.drawImage(srcCanvas, 0, 0);

		const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const data = imgData.data;
		for (let i = 0; i < data.length; i += 4) {
			const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
			const val = gray > 128 ? 255 : 0;
			data[i] = val;
			data[i + 1] = val;
			data[i + 2] = val;
		}
		ctx.putImageData(imgData, 0, 0);
		return canvas;
	}

	#createPaddedCanvas(srcCanvas, padding) {
		const canvas = document.createElement('canvas');
		canvas.width = srcCanvas.width + (padding * 2);
		canvas.height = srcCanvas.height + (padding * 2);
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = '#FFFFFF';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(srcCanvas, padding, padding);
		return canvas;
	}

	#renderPureVectorQR(tokenResult) {
		const canvas = this.#dom.qrDisplayCanvas;
		const ctx = canvas.getContext('2d');
		const size = 600;
		canvas.width = size;
		canvas.height = size;

		ctx.fillStyle = '#FFFFFF';
		ctx.fillRect(0, 0, size, size);

		if (typeof window.qrcode === 'function') {
			let qr = null;
			for (let type = 1; type <= 40; type++) {
				try {
					qr = window.qrcode(type, 'M');
					if (tokenResult.binary && tokenResult.binary.length > 0) {
						qr.addData(new window.QR8BitByte(tokenResult.binary));
					} else {
						qr.addData(tokenResult.text);
					}
					qr.make();
					break;
				} catch (e) {
					qr = null;
				}
			}

			if (qr) {
				const moduleCount = qr.getModuleCount();
				const margin = 36;
				const activeSize = size - (margin * 2);
				const cellSize = activeSize / moduleCount;

				ctx.fillStyle = '#000000';
				for (let r = 0; r < moduleCount; r++) {
					for (let c = 0; c < moduleCount; c++) {
						if (qr.isDark(r, c)) {
							const x = margin + (c * cellSize);
							const y = margin + (r * cellSize);
							ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cellSize), Math.ceil(cellSize));
						}
					}
				}
				return;
			}
		}

		// Fallback renderer
		ctx.fillStyle = '#0f172a';
		ctx.font = 'bold 20px Inter, sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('QR Token Detected', size / 2, size / 2 - 20);
		ctx.font = '14px Inter, sans-serif';
		ctx.fillText(tokenResult.engine, size / 2, size / 2 + 20);
	}

	#renderErrorCanvas() {
		const canvas = this.#dom.qrDisplayCanvas;
		const ctx = canvas.getContext('2d');
		const size = 600;
		canvas.width = size;
		canvas.height = size;

		ctx.fillStyle = '#f8fafc';
		ctx.fillRect(0, 0, size, size);

		ctx.fillStyle = '#ef4444';
		ctx.font = 'bold 50px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('⚠️', size / 2, size / 2 - 50);

		ctx.fillStyle = '#0f172a';
		ctx.font = 'bold 22px Outfit, sans-serif';
		ctx.fillText('QR Code Not Readable', size / 2, size / 2 + 10);

		ctx.fillStyle = '#64748b';
		ctx.font = '15px Inter, sans-serif';
		ctx.fillText('Tap "Original Pic" button below to', size / 2, size / 2 + 45);
		ctx.fillText('view and scan your original ticket at gate', size / 2, size / 2 + 70);
	}

	#createNewTicketRecord({ tokenPayload, cleanQrDataUrl, originalDataUrl, isPureVector, isError }) {
		const now = Date.now();
		const validityMs = TicketWalletApp.#DMRC_VALIDITY_MINUTES * 60 * 1000;
		const expiresAt = now + validityMs;

		const newTicket = {
			id: 'ticket_' + now + '_' + Math.random().toString(36).substring(2, 6),
			createdAt: now,
			expiresAt: expiresAt,
			status: 'active',
			tokenPayload: tokenPayload,
			cleanQrDataUrl: cleanQrDataUrl,
			originalDataUrl: originalDataUrl,
			isPureVector: isPureVector,
			isError: isError
		};

		// Demote previously active ticket
		if (this.#state.activeTicketId) {
			const prev = this.#state.history.find(t => t.id === this.#state.activeTicketId);
			if (prev) {
				prev.status = (prev.expiresAt <= now) ? 'expired' : 'archived';
			}
		}

		this.#state.history.unshift(newTicket);
		this.#state.activeTicketId = newTicket.id;
		this.#enforceMaxLimit();

		this.#persistStore();
		this.#renderActiveTicket();
		this.#renderHistoryList();

		// Emit Global EventBus Notification
		eventBus.emit('TICKET_ACTIVATED', newTicket);
	}

	#enforceMaxLimit() {
		if (this.#state.history.length > TicketWalletApp.#MAX_HISTORY_ITEMS) {
			this.#state.history = this.#state.history.slice(0, TicketWalletApp.#MAX_HISTORY_ITEMS);
		}
	}

	#renderActiveTicket() {
		if (!this.#state.activeTicketId) {
			this.#dom.passCard.classList.remove('active');
			this.#dom.ingestionCard.style.display = 'flex';
			if (this.#state.timerIntervalId) clearInterval(this.#state.timerIntervalId);
			return;
		}

		const activeRecord = this.#state.history.find(t => t.id === this.#state.activeTicketId);
		if (!activeRecord) return;

		const img = new Image();
		img.onload = () => {
			const ctx = this.#dom.qrDisplayCanvas.getContext('2d');
			ctx.clearRect(0, 0, this.#dom.qrDisplayCanvas.width, this.#dom.qrDisplayCanvas.height);
			ctx.drawImage(img, 0, 0, this.#dom.qrDisplayCanvas.width, this.#dom.qrDisplayCanvas.height);

			const modalCtx = this.#dom.gateModalCanvas.getContext('2d');
			modalCtx.fillStyle = '#ffffff';
			modalCtx.fillRect(0, 0, this.#dom.gateModalCanvas.width, this.#dom.gateModalCanvas.height);
			modalCtx.drawImage(img, 0, 0, this.#dom.gateModalCanvas.width, this.#dom.gateModalCanvas.height);

			this.#dom.passCard.classList.add('active');
			this.#dom.ingestionCard.style.display = 'none';
			this.#startTimer(activeRecord);
		};
		img.src = activeRecord.cleanQrDataUrl;
	}

	#openOriginalModal() {
		const activeRecord = this.#state.history.find(t => t.id === this.#state.activeTicketId);
		if (!activeRecord || !activeRecord.originalDataUrl) {
			this.#showToast(i18n.t('metroTicket.toast.noOriginalImage'), 'warning');
			return;
		}

		this.#dom.originalImagePreview.src = activeRecord.originalDataUrl;
		this.#dom.originalModal.classList.add('active');
		this.#dom.originalModal.setAttribute('aria-hidden', 'false');
	}

	#closeOriginalModal() {
		this.#dom.originalModal.classList.remove('active');
		this.#dom.originalModal.setAttribute('aria-hidden', 'true');
	}

	#startTimer(ticketRecord) {
		if (this.#state.timerIntervalId) clearInterval(this.#state.timerIntervalId);

		const updateCountdown = () => {
			const remainingMs = ticketRecord.expiresAt - Date.now();

			if (remainingMs <= 0) {
				clearInterval(this.#state.timerIntervalId);
				this.#dom.passCountdown.textContent = i18n.t('metroTicket.cards.history.statusExpired');
				ticketRecord.status = 'expired';
				this.#persistStore();
				this.#renderHistoryList();

				// Emit EventBus Notification
				eventBus.emit('TICKET_EXPIRED', ticketRecord);
				return;
			}

			const totalSecs = Math.floor(remainingMs / 1000);
			const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
			const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
			const secs = String(totalSecs % 60).padStart(2, '0');
			this.#dom.passCountdown.textContent = hrs + ':' + mins + ':' + secs;
		};

		updateCountdown();
		this.#state.timerIntervalId = setInterval(updateCountdown, 1000);
	}

	#archiveActiveTicket() {
		if (!this.#state.activeTicketId) return;

		const activeRecord = this.#state.history.find(t => t.id === this.#state.activeTicketId);
		if (activeRecord) {
			activeRecord.status = (activeRecord.expiresAt <= Date.now()) ? 'expired' : 'archived';
			eventBus.emit('TICKET_ARCHIVED', activeRecord);
		}

		this.#state.activeTicketId = null;
		if (this.#state.timerIntervalId) clearInterval(this.#state.timerIntervalId);

		this.#dom.passCard.classList.remove('active');
		this.#dom.ingestionCard.style.display = 'flex';

		this.#persistStore();
		this.#renderHistoryList();
		this.#showToast(i18n.t('metroTicket.toast.movedToHistory'), 'success');
	}

	#requestRestoreTicket(ticketId) {
		const targetTicket = this.#state.history.find(t => t.id === ticketId);
		if (!targetTicket) return;

		if (this.#state.activeTicketId && this.#state.activeTicketId !== ticketId) {
			this.#openConfirmModal(
				i18n.t('metroTicket.modals.confirm.title'),
				i18n.t('metroTicket.modals.confirm.replaceActiveDesc'),
				() => this.#executeRestoreTicket(ticketId),
				i18n.t('metroTicket.modals.confirm.confirm'),
				false
			);
			return;
		}

		this.#executeRestoreTicket(ticketId);
	}

	#executeRestoreTicket(ticketId) {
		const targetTicket = this.#state.history.find(t => t.id === ticketId);
		if (!targetTicket) return;

		if (this.#state.activeTicketId) {
			const prev = this.#state.history.find(t => t.id === this.#state.activeTicketId);
			if (prev) prev.status = (prev.expiresAt <= Date.now()) ? 'expired' : 'archived';
		}

		targetTicket.status = (targetTicket.expiresAt <= Date.now()) ? 'expired' : 'active';
		this.#state.activeTicketId = ticketId;

		this.#persistStore();
		this.#renderActiveTicket();
		this.#renderHistoryList();
		this.#showToast(i18n.t('metroTicket.toast.restoredToGatePass'), 'success');

		eventBus.emit('TICKET_ACTIVATED', targetTicket);
	}

	#deleteHistoryItem(ticketId) {
		const index = this.#state.history.findIndex(t => t.id === ticketId);
		if (index === -1) return;

		const isCurrentActive = (this.#state.activeTicketId === ticketId);
		this.#state.history.splice(index, 1);

		if (isCurrentActive) {
			this.#state.activeTicketId = null;
			this.#dom.passCard.classList.remove('active');
			this.#dom.ingestionCard.style.display = 'flex';
			if (this.#state.timerIntervalId) clearInterval(this.#state.timerIntervalId);
		}

		this.#persistStore();
		this.#renderHistoryList();
		this.#showToast(i18n.t('metroTicket.toast.deletedFromHistory'));

		eventBus.emit('TICKET_DELETED', { id: ticketId });
	}

	#promptClearAllHistory() {
		if (this.#state.history.length === 0) return;

		this.#openConfirmModal(
			i18n.t('metroTicket.modals.confirm.title'),
			i18n.t('metroTicket.modals.confirm.clearAllDesc'),
			() => this.#executeClearAllHistory(),
			i18n.t('metroTicket.cards.history.btnClearAll'),
			true
		);
	}

	#executeClearAllHistory() {
		this.#state.history = [];
		this.#state.activeTicketId = null;
		if (this.#state.timerIntervalId) clearInterval(this.#state.timerIntervalId);

		this.#dom.passCard.classList.remove('active');
		this.#dom.ingestionCard.style.display = 'flex';

		this.#persistStore();
		this.#renderHistoryList();
		this.#showToast(i18n.t('metroTicket.toast.allCleared'));

		eventBus.emit('TICKETS_CLEARED');
	}

	#renderHistoryList() {
		const container = this.#dom.historyListContainer;
		container.innerHTML = '';

		const count = this.#state.history.length;
		this.#dom.historyCountBadge.textContent = count + '/' + TicketWalletApp.#MAX_HISTORY_ITEMS;
		this.#dom.btnClearAllHistory.disabled = (count === 0);

		if (count === 0) {
			container.innerHTML = `<div class="history-empty-state">${i18n.t('metroTicket.cards.history.empty')}</div>`;
			return;
		}

		const currentLang = appStateStore.getState('currentLang') || 'en';
		const locale = currentLang === 'hi' ? 'hi-IN' : 'en-IN';

		this.#state.history.forEach((ticket) => {
			const isActive = (this.#state.activeTicketId === ticket.id);
			const isExpired = (ticket.expiresAt <= Date.now());
			const status = isActive ? 'active' : (isExpired ? 'expired' : 'archived');

			const itemEl = document.createElement('div');
			itemEl.className = 'history-item ' + (isActive ? 'is-active' : '');

			const d = new Date(ticket.createdAt);
			const dateStr = d.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
			const timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

			const thumbSrc = ticket.cleanQrDataUrl || ticket.originalDataUrl;

			const statusText = status === 'active'
				? `● ${i18n.t('metroTicket.cards.history.statusActive')}`
				: (status === 'expired'
					? `✕ ${i18n.t('metroTicket.cards.history.statusExpired')}`
					: `◷ ${i18n.t('metroTicket.cards.history.statusArchived')}`);

			itemEl.innerHTML = `
				<div class="history-thumb-wrap">
					<img src="${thumbSrc}" class="history-thumb" alt="QR Thumb">
				</div>
				<div class="history-meta">
					<span class="history-date">${dateStr}, ${timeStr}</span>
					<span class="history-status-pill ${status}">
						${statusText}
					</span>
				</div>
				<div class="history-item-actions">
					${!isActive ? `<button type="button" class="btn-restore-ticket" data-id="${ticket.id}" title="${i18n.t('metroTicket.cards.history.btnRestore')}"><span>🔄</span> ${i18n.t('metroTicket.cards.history.btnRestore')}</button>` : ''}
					<button type="button" class="btn-delete-history-item" data-id="${ticket.id}" title="Delete Permanently">🗑️</button>
				</div>
			`;

			const restoreBtn = itemEl.querySelector('.btn-restore-ticket');
			if (restoreBtn) {
				restoreBtn.addEventListener('click', () => this.#requestRestoreTicket(ticket.id));
			}

			const deleteBtn = itemEl.querySelector('.btn-delete-history-item');
			if (deleteBtn) {
				deleteBtn.addEventListener('click', () => this.#deleteHistoryItem(ticket.id));
			}

			container.appendChild(itemEl);
		});
	}

	#openConfirmModal(title, desc, onConfirm, confirmText = 'Confirm', isDanger = false) {
		this.#dom.confirmModalTitle.textContent = title;
		this.#dom.confirmModalDesc.textContent = desc;
		this.#dom.btnAcceptConfirm.textContent = confirmText;
		this.#dom.btnCancelConfirm.textContent = i18n.t('metroTicket.modals.confirm.cancel');

		if (isDanger) {
			this.#dom.btnAcceptConfirm.classList.add('danger');
		} else {
			this.#dom.btnAcceptConfirm.classList.remove('danger');
		}

		this.#state.pendingConfirmCallback = onConfirm;
		this.#dom.confirmModal.classList.add('active');
		this.#dom.confirmModal.setAttribute('aria-hidden', 'false');
	}

	#closeConfirmModal() {
		this.#dom.confirmModal.classList.remove('active');
		this.#dom.confirmModal.setAttribute('aria-hidden', 'true');
		this.#state.pendingConfirmCallback = null;
	}

	#openGateModal() {
		this.#dom.gateModal.classList.add('active');
		this.#dom.gateModal.setAttribute('aria-hidden', 'false');
	}

	#closeGateModal() {
		this.#dom.gateModal.classList.remove('active');
		this.#dom.gateModal.setAttribute('aria-hidden', 'true');
	}

	#persistStore() {
		const store = {
			activeTicketId: this.#state.activeTicketId,
			history: this.#state.history
		};
		try {
			localStorage.setItem(TicketWalletApp.#STORAGE_KEY, JSON.stringify(store));
		} catch (e) {
			if (this.#state.history.length > 2) {
				this.#state.history.pop();
				this.#persistStore();
			}
		}
	}

	#loadPersistedStore() {
		try {
			let raw = localStorage.getItem(TicketWalletApp.#STORAGE_KEY);
			// Backward compatibility with prototype storage
			if (!raw) {
				raw = localStorage.getItem(TicketWalletApp.#LEGACY_STORAGE_KEY);
			}

			if (!raw) {
				this.#renderHistoryList();
				return;
			}

			const store = JSON.parse(raw);
			if (store && Array.isArray(store.history)) {
				this.#state.history = store.history;
				this.#state.activeTicketId = store.activeTicketId;
				this.#enforceMaxLimit();
				this.#renderActiveTicket();
				this.#renderHistoryList();
			}
		} catch (e) {
			this.#state.history = [];
			this.#state.activeTicketId = null;
			this.#renderHistoryList();
		}
	}

	#getOptimizedDataURL(canvas) {
		try {
			return canvas.toDataURL('image/jpeg', 0.82);
		} catch (e) {
			return canvas.toDataURL('image/png');
		}
	}

	#showToast(message, type = "info") {
		Toast.show(message, { type, duration: 3200 });
	}
}