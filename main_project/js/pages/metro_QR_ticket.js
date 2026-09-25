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
	#cameraStream = null;
	#cameraFacingMode = 'environment';
	#isScanningLive = false;
	#liveScanAnimationId = null;

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
			'ingestionCard', 'dropZone', 'fileInput',
			'btnCaptureCamera', 'btnBrowseFile', 'btnPasteClipboard', 'passCard',
			'passCountdown', 'passQrSubtitle', 'qrDisplayCanvas',
			'btnOpenGateMode', 'btnViewOriginal', 'btnArchiveActive',
			'historyCountBadge', 'btnClearAllHistory', 'historyListContainer',
			'cameraModal', 'cameraVideo', 'btnSwitchCamera', 'btnCloseCameraModal',
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
		// 1. Live Camera Ingestion
		this.#dom.btnCaptureCamera?.addEventListener('click', () => this.#handleCameraCapture());
		this.#dom.btnSwitchCamera?.addEventListener('click', () => this.#toggleCameraFacing());
		this.#dom.btnCloseCameraModal?.addEventListener('click', () => this.#closeCameraModal());

		// 2. File Pick & Drag-and-Drop (Crash-Safe Native & Web Handler)
		this.#dom.dropZone.addEventListener('click', (e) => {
			if (e.target === this.#dom.fileInput) return;
			this.#handleGallerySelection();
		});
		this.#dom.fileInput.addEventListener('change', (e) => this.#handleFileInputChange(e));
		this.#dom.btnBrowseFile?.addEventListener('click', () => this.#handleGallerySelection());

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

		// 3. 1-Tap Paste from Clipboard
		this.#dom.btnPasteClipboard.addEventListener('click', () => this.#handleClipboardPaste());
		document.addEventListener('paste', (e) => this.#handleWindowPaste(e));

		// 4. Gate Mode Modal Controls
		this.#dom.btnOpenGateMode.addEventListener('click', () => this.#openGateModal());
		this.#dom.btnCloseGateModal.addEventListener('click', () => this.#closeGateModal());

		// 5. Original Image Modal Controls
		this.#dom.btnViewOriginal.addEventListener('click', () => this.#openOriginalModal());
		this.#dom.btnCloseOriginalModal.addEventListener('click', () => this.#closeOriginalModal());

		// 6. Move Active Ticket to History
		this.#dom.btnArchiveActive.addEventListener('click', () => this.#archiveActiveTicket());

		// 7. Clear All History Button
		this.#dom.btnClearAllHistory.addEventListener('click', () => this.#promptClearAllHistory());

		// 8. Confirmation Modal Actions
		this.#dom.btnCancelConfirm.addEventListener('click', () => this.#closeConfirmModal());
		this.#dom.btnAcceptConfirm.addEventListener('click', () => {
			if (typeof this.#state.pendingConfirmCallback === 'function') {
				this.#state.pendingConfirmCallback();
			}
			this.#closeConfirmModal();
		});

		// 9. Keyboard Accessibility (Escape to close all modals)
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				if (this.#dom.cameraModal?.classList.contains('active')) this.#closeCameraModal();
				if (this.#dom.confirmModal?.classList.contains('active')) this.#closeConfirmModal();
				if (this.#dom.gateModal?.classList.contains('active')) this.#closeGateModal();
				if (this.#dom.originalModal?.classList.contains('active')) this.#closeOriginalModal();
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

	async #handleCameraCapture() {
		if (window.Capacitor && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins?.Camera) {
			try {
				const image = await window.Capacitor.Plugins.Camera.getPhoto({
					quality: 100,
					allowEditing: false,
					resultType: 'uri',
					source: 'CAMERA'
				});
				if (image?.webPath) {
					const res = await fetch(image.webPath);
					const blob = await res.blob();
					await this.#processImageFile(blob);
				}
			} catch (e) {
				console.warn('Native camera cancelled', e);
			}
		} else {
			await this.#openLiveCameraModal();
		}
	}

	async #handleGallerySelection() {
		if (window.Capacitor && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins?.Camera) {
			try {
				const image = await window.Capacitor.Plugins.Camera.getPhoto({
					quality: 100,
					allowEditing: false,
					resultType: 'dataUrl',
					source: 'PHOTOS'
				});
				console.log('[QR_DIAG] Native Photo Picked. DataURL Length:', image?.dataUrl?.length || 0);
				if (image?.dataUrl) {
					this.#processNativeImage(image.dataUrl);
				} else if (image?.webPath) {
					const res = await fetch(image.webPath);
					const blob = await res.blob();
					console.log('[QR_DIAG] Fetched Blob Size:', blob.size, 'Type:', blob.type);
					await this.#processImageFile(blob);
				}
			} catch (e) {
				console.error('[QR_DIAG] Native gallery error:', e);
				this.#showToast('Gallery error: ' + (e.message || e), 'error');
			}
		} else {
			this.#dom.fileInput.click();
		}
	}

	async #openLiveCameraModal() {
		if (!navigator.mediaDevices?.getUserMedia) {
			this.#showToast(i18n.t('metroTicket.toast.cameraError'), 'error');
			this.#dom.fileInput.click();
			return;
		}

		this.#dom.cameraModal.classList.add('active');
		this.#dom.cameraModal.setAttribute('aria-hidden', 'false');
		await this.#startLiveCameraStream();
	}

	async #startLiveCameraStream() {
		this.#stopLiveCameraStream();

		const constraints = {
			video: {
				facingMode: this.#cameraFacingMode,
				width: { ideal: 1280 },
				height: { ideal: 720 }
			},
			audio: false
		};

		try {
			this.#cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
			this.#dom.cameraVideo.srcObject = this.#cameraStream;
			await this.#dom.cameraVideo.play();
			this.#isScanningLive = true;
			this.#startLiveScanLoop();
		} catch (err) {
			console.error('Camera stream error:', err);
			this.#closeCameraModal();
			this.#showToast(i18n.t('metroTicket.toast.cameraPermissionDenied'), 'error');
		}
	}

	


	async #toggleCameraFacing() {
		this.#cameraFacingMode = (this.#cameraFacingMode === 'environment') ? 'user' : 'environment';
		await this.#startLiveCameraStream();
	}

	#startLiveScanLoop() {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d', { willReadFrequently: true });

		const scanLoop = async () => {
			if (!this.#isScanningLive || !this.#dom.cameraVideo?.videoWidth) {
				if (this.#isScanningLive) {
					this.#liveScanAnimationId = requestAnimationFrame(scanLoop);
				}
				return;
			}

			canvas.width = this.#dom.cameraVideo.videoWidth;
			canvas.height = this.#dom.cameraVideo.videoHeight;
			ctx.drawImage(this.#dom.cameraVideo, 0, 0, canvas.width, canvas.height);

			try {
				let rawText = null;
				// 1. Native BarcodeDetector (Hardware-accelerated)
				if ('BarcodeDetector' in window) {
					try {
						const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
						const barcodes = await detector.detect(canvas);
						if (barcodes?.length > 0 && barcodes[0].rawValue) {
							rawText = barcodes[0].rawValue;
						}
					} catch (_) {}
				}

				// 2. jsQR Engine
				if (!rawText && typeof window.jsQR === 'function') {
					const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
					const qr = window.jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: "dontInvert" });
					if (qr?.data) {
						rawText = qr.data;
					}
				}

				// 3. ZXing Engine
				if (!rawText) {
					const zxText = this.#scanCanvasWithZXing(canvas);
					if (zxText) rawText = zxText;
				}

				if (rawText) {
					if (navigator.vibrate) navigator.vibrate([100]);
					const capturedDataUrl = this.#getOptimizedDataURL(canvas);
					this.#closeCameraModal();
					this.#finalizeGeneratedTicket(rawText, 'Live Camera', capturedDataUrl);
					return;
				}
			} catch (e) {
				console.warn('Live scan loop tick error:', e);
			}

			if (this.#isScanningLive) {
				this.#liveScanAnimationId = requestAnimationFrame(scanLoop);
			}
		};

		this.#liveScanAnimationId = requestAnimationFrame(scanLoop);
	}

	#stopLiveCameraStream() {
		this.#isScanningLive = false;
		if (this.#liveScanAnimationId) {
			cancelAnimationFrame(this.#liveScanAnimationId);
			this.#liveScanAnimationId = null;
		}
		if (this.#cameraStream) {
			this.#cameraStream.getTracks().forEach(track => track.stop());
			this.#cameraStream = null;
		}
		if (this.#dom.cameraVideo) {
			this.#dom.cameraVideo.srcObject = null;
		}
	}

	#closeCameraModal() {
		this.#stopLiveCameraStream();
		if (this.#dom.cameraModal) {
			this.#dom.cameraModal.classList.remove('active');
			this.#dom.cameraModal.setAttribute('aria-hidden', 'true');
		}
	}


	async #processImageFile(fileOrBlob) {
		this.#showToast(i18n.t('metroTicket.toast.scanning'));
		const img = new Image();
		const objectUrl = URL.createObjectURL(fileOrBlob);

		img.onload = async () => {
			try {
				await this.#downscaleAndScan(img);
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
	
	async #processNativeImage(webPath) {
		this.#showToast(i18n.t('metroTicket.toast.scanning'));
		const img = new Image();
		img.onload = async () => {
			await this.#downscaleAndScan(img);
		};
		img.onerror = () => this.#showToast(i18n.t('metroTicket.toast.errorLoading'), 'error');
		img.src = webPath;
	}

	async #downscaleAndScan(img) {
		const origW = img.naturalWidth || img.width;
		const origH = img.naturalHeight || img.height;
		console.log(`[QR_DIAG] Image Loaded: ${origW}x${origH}px`);

		if (!origW || !origH) {
			this.#showToast(`Error: Image has 0px dimensions!`, 'error');
			return;
		}

		const MAX_DIM = 2000;
		let width = origW;
		let height = origH;

		if (width > MAX_DIM || height > MAX_DIM) {
			const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
			width = Math.round(width * ratio);
			height = Math.round(height * ratio);
		}

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(img, 0, 0, width, height);

		console.log(`[QR_DIAG] Scan Canvas Prepared: ${width}x${height}px`);
		await this.#executeMultiEngineScan(canvas, img);
	}

	#scanCanvasWithZXing(canvas) {
		if (typeof window.ZXing === 'undefined') return null;
		try {
			const lumSource = new window.ZXing.HTMLCanvasElementLuminanceSource(canvas);
			const binarizer = new window.ZXing.HybridBinarizer(lumSource);
			const bitmap = new window.ZXing.BinaryBitmap(binarizer);

			const hints = new Map();
			if (window.ZXing.DecodeHintType && window.ZXing.DecodeHintType.TRY_HARDER) {
				hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);
			}

			// A. Dedicated QRCodeReader with HybridBinarizer
			try {
				const qrReader = new window.ZXing.QRCodeReader();
				const result = qrReader.decode(bitmap, hints);
				if (result && result.getText()) return result.getText();
			} catch (_) {}

			// B. MultiFormatReader Fallback
			try {
				const multiReader = new window.ZXing.MultiFormatReader();
				const result = multiReader.decode(bitmap, hints);
				if (result && result.getText()) return result.getText();
			} catch (_) {}

			// C. Inverted Luminance (for dark mode/inverted ticket QR)
			try {
				if (window.ZXing.InvertedLuminanceSource) {
					const invLum = new window.ZXing.InvertedLuminanceSource(lumSource);
					const invBitmap = new window.ZXing.BinaryBitmap(new window.ZXing.HybridBinarizer(invLum));
					const qrReader = new window.ZXing.QRCodeReader();
					const result = qrReader.decode(invBitmap, hints);
					if (result && result.getText()) return result.getText();
				}
			} catch (_) {}
		} catch (err) {
			console.warn('[QR_DIAG] ZXing Canvas Error:', err);
		}
		return null;
	}

	async #executeMultiEngineScan(canvas, rawImg = null) {
		const originalDataUrl = this.#getOptimizedDataURL(canvas);
		let tokenResult = null;

		// 1. Stage 1: Native ZXing HybridBinarizer Canvas Scan
		const zxText = this.#scanCanvasWithZXing(canvas);
		if (zxText) {
			console.log('[QR_DIAG] SUCCESS: ZXing Native decoded token:', zxText);
			tokenResult = { text: zxText, engine: 'ZXing Hybrid Engine' };
		}

		// 2. Stage 2: Direct Image Element with BrowserQRCodeReader
		if (!tokenResult && rawImg && typeof window.ZXing !== 'undefined' && window.ZXing.BrowserQRCodeReader) {
			try {
				console.log('[QR_DIAG] Running BrowserQRCodeReader on direct Image Element...');
				const browserReader = new window.ZXing.BrowserQRCodeReader();
				const bRes = await browserReader.decodeFromImageElement(rawImg);
				if (bRes && bRes.getText()) {
					console.log('[QR_DIAG] SUCCESS: BrowserQRCodeReader decoded token:', bRes.getText());
					tokenResult = { text: bRes.getText(), engine: 'ZXing Image Engine' };
				}
			} catch (err) {
				console.log('[QR_DIAG] BrowserQRCodeReader NotFound:', err.message || err);
			}
		}

		// 3. Stage 3: jsQR Engine
		if (!tokenResult && typeof window.jsQR === 'function') {
			try {
				const ctx = canvas.getContext('2d', { willReadFrequently: true });
				const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				console.log(`[QR_DIAG] Running jsQR on ${canvas.width}x${canvas.height} buffer...`);
				const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
					inversionAttempts: "attemptBoth"
				});
				if (code && code.data) {
					console.log('[QR_DIAG] SUCCESS: jsQR decoded token:', code.data);
					tokenResult = { text: code.data, engine: 'jsQR Engine' };
				}
			} catch (err) {
				console.error('[QR_DIAG] jsQR exception:', err);
			}
		}

		// 4. Stage 4: Multi-Scale Sub-Region Scan (Centered Crops for Screenshots)
		if (!tokenResult && canvas.height > canvas.width * 1.3) {
			console.log('[QR_DIAG] Tall screenshot detected. Running sub-region crop scans...');
			tokenResult = await this.#runSubRegionScans(canvas);
		}

		// 5. Stage 5: Adaptive Contrast & Padded Fallback
		if (!tokenResult) {
			console.log('[QR_DIAG] Running Stage 5 (Adaptive Contrast & Padding)...');
			tokenResult = await this.#runPaddedContrastScan(canvas);
		}

		// Final Decision & Notification
		if (tokenResult && tokenResult.text) {
			this.#showToast(`✅ QR Found (${tokenResult.engine})`, 'success');
			this.#finalizeGeneratedTicket(tokenResult.text, tokenResult.engine, originalDataUrl);
		} else {
			this.#showToast(`⚠️ QR Not Detected on ${canvas.width}x${canvas.height}px image`, 'warning');
			this.#finalizeRawImagePass(originalDataUrl);
		}
	}

	async #runSubRegionScans(canvas) {
		// Crop Middle 60% and Bottom 60% where tickets usually have QR
		const regions = [
			{ y: 0.15, h: 0.70, name: 'Center' },
			{ y: 0.35, h: 0.65, name: 'Lower-Half' }
		];

		for (const reg of regions) {
			const cropCanvas = document.createElement('canvas');
			cropCanvas.width = canvas.width;
			cropCanvas.height = Math.round(canvas.height * reg.h);
			const cCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
			cCtx.drawImage(
				canvas,
				0, Math.round(canvas.height * reg.y), canvas.width, cropCanvas.height,
				0, 0, cropCanvas.width, cropCanvas.height
			);

			const zxText = this.#scanCanvasWithZXing(cropCanvas);
			if (zxText) {
				return { text: zxText, engine: `ZXing Sub-Region (${reg.name})` };
			}

			if (typeof window.jsQR === 'function') {
				const imgData = cCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
				const code = window.jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: "attemptBoth" });
				if (code && code.data) {
					return { text: code.data, engine: `jsQR Sub-Region (${reg.name})` };
				}
			}
		}
		return null;
	}

	async #runPaddedContrastScan(canvas) {
		const paddedCanvas = document.createElement('canvas');
		const pad = 40;
		paddedCanvas.width = canvas.width + (pad * 2);
		paddedCanvas.height = canvas.height + (pad * 2);
		const pCtx = paddedCanvas.getContext('2d', { willReadFrequently: true });

		pCtx.fillStyle = '#FFFFFF';
		pCtx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
		pCtx.drawImage(canvas, pad, pad);

		const zxRes = this.#scanCanvasWithZXing(paddedCanvas);
		if (zxRes) {
			return { text: zxRes, engine: 'ZXing Padded' };
		}

		if (typeof window.jsQR === 'function') {
			const imgData = pCtx.getImageData(0, 0, paddedCanvas.width, paddedCanvas.height);
			const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
				inversionAttempts: "attemptBoth"
			});
			if (code && code.data) {
				return { text: code.data, engine: 'jsQR Padded' };
			}
		}

		// Adaptive Mean-Luminance Binarization
		const imgData = pCtx.getImageData(0, 0, paddedCanvas.width, paddedCanvas.height);
		const d = imgData.data;
		let sum = 0;
		const total = d.length / 4;
		for (let i = 0; i < d.length; i += 4) {
			sum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
		}
		const avgLuma = sum / total;
		const threshold = Math.max(80, Math.min(avgLuma * 0.90, 180));

		for (let i = 0; i < d.length; i += 4) {
			const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
			const binary = gray > threshold ? 255 : 0;
			d[i] = binary;
			d[i + 1] = binary;
			d[i + 2] = binary;
		}
		pCtx.putImageData(imgData, 0, 0);

		const zxContrastRes = this.#scanCanvasWithZXing(paddedCanvas);
		if (zxContrastRes) {
			return { text: zxContrastRes, engine: 'ZXing Contrast' };
		}

		if (typeof window.jsQR === 'function') {
			const bCode = window.jsQR(imgData.data, imgData.width, imgData.height, {
				inversionAttempts: "attemptBoth"
			});
			if (bCode && bCode.data) {
				return { text: bCode.data, engine: 'jsQR Adaptive-Contrast' };
			}
		}

		return null;
	}

	#finalizeGeneratedTicket(tokenText, engineName, originalDataUrl) {
		const ticketId = 't_' + Date.now();
		const now = Date.now();
		const expiresAt = now + (TicketWalletApp.#DMRC_VALIDITY_MINUTES * 60 * 1000);

		// TVM Dispenser के लिए केवल शुद्ध 100% वेक्टर QR कैनवस बनाना (No Screenshots)
		const cleanCanvas = document.createElement('canvas');
		cleanCanvas.width = 400;
		cleanCanvas.height = 400;
		this.#renderVectorQrToCanvas(cleanCanvas, tokenText);
		const cleanQrDataUrl = cleanCanvas.toDataURL('image/png');

		const newTicket = {
			id: ticketId,
			type: 'VECTOR_QR',
			tokenText: tokenText,
			cleanQrDataUrl: cleanQrDataUrl, // 👈 सिर्फ प्योर QR कोड
			engine: engineName,
			originalImage: originalDataUrl,
			createdAt: now,
			expiresAt: expiresAt,
			isExpired: false
		};

		this.#addNewTicketToWallet(newTicket);
		this.#showToast(i18n.t('metroTicket.toast.qrGenerated', { engine: engineName }));
	}

	#finalizeRawImagePass(originalDataUrl) {
		const ticketId = 't_' + Date.now();
		const now = Date.now();
		const expiresAt = now + (TicketWalletApp.#DMRC_VALIDITY_MINUTES * 60 * 1000);

		const newTicket = {
			id: ticketId,
			type: 'RAW_IMAGE',
			tokenText: null,
			cleanQrDataUrl: null, // यदि QR डिकोड नहीं हुआ तो TVM में स्क्रीनशॉट नहीं भेजा जाएगा
			engine: 'Direct Screenshot Mode',
			originalImage: originalDataUrl,
			createdAt: now,
			expiresAt: expiresAt,
			isExpired: false
		};

		this.#addNewTicketToWallet(newTicket);
		this.#showToast(i18n.t('metroTicket.toast.qrNotDetected'), 'warning');
	}

	#addNewTicketToWallet(newTicket) {
		// If there is already an active ticket, demote it to archived
		if (this.#state.activeTicketId) {
			const currentActive = this.#state.history.find(t => t.id === this.#state.activeTicketId);
			if (currentActive) {
				// Retain in history
			}
		}

		// Insert new ticket at the top of history
		this.#state.history.unshift(newTicket);

		// Limit history to MAX_HISTORY_ITEMS (13)
		if (this.#state.history.length > TicketWalletApp.#MAX_HISTORY_ITEMS) {
			this.#state.history = this.#state.history.slice(0, TicketWalletApp.#MAX_HISTORY_ITEMS);
		}

		this.#state.activeTicketId = newTicket.id;
		this.#persistStore();
		this.#renderActivePassCard();
		this.#renderHistoryList();
	}

	#renderActivePassCard() {
		// स्थिति 1: जब कोई एक्टिव टिकट नहीं है -> Pass Card छुपाएं और Ingestion Card दिखाएं
		if (!this.#state.activeTicketId) {
			this.#dom.passCard.classList.remove('active');
			this.#dom.passCard.style.display = 'none';
			if (this.#dom.ingestionCard) this.#dom.ingestionCard.style.display = '';

			if (this.#state.timerIntervalId) {
				clearInterval(this.#state.timerIntervalId);
				this.#state.timerIntervalId = null;
			}
			return;
		}

		const ticket = this.#state.history.find(t => t.id === this.#state.activeTicketId);
		if (!ticket || (!ticket.tokenText && !ticket.originalImage)) {
			this.#state.activeTicketId = null;
			this.#dom.passCard.classList.remove('active');
			this.#dom.passCard.style.display = 'none';
			if (this.#dom.ingestionCard) this.#dom.ingestionCard.style.display = '';
			return;
		}

		// स्थिति 2: जब एक्टिव टिकट मौजूद है -> Pass Card दिखाएं और Ingestion Card छुपाएं
		this.#dom.passCard.style.display = '';
		this.#dom.passCard.classList.add('active');
		if (this.#dom.ingestionCard) this.#dom.ingestionCard.style.display = 'none';

		if (ticket.type === 'VECTOR_QR' && ticket.tokenText) {
			this.#dom.passQrSubtitle.textContent = i18n.t('metroTicket.cards.pass.turnstileSubtitle');
			this.#renderVectorQrToCanvas(this.#dom.qrDisplayCanvas, ticket.tokenText);
			// स्क्रीन पर रेंडर हुआ QR कोड सीधे TVM के लिए सेव करें
			ticket.cleanQrDataUrl = this.#dom.qrDisplayCanvas.toDataURL('image/png');
			this.#persistStore();
		} else if (ticket.originalImage) {
			this.#dom.passQrSubtitle.textContent = 'Rendered from Original Pic';
			this.#renderImageToCanvas(this.#dom.qrDisplayCanvas, ticket.originalImage);
		}

		this.#startCountdownTimer(ticket.expiresAt);
	}

	#renderVectorQrToCanvas(canvas, text) {
		try {
			// engine_vector_painter.js (Kazuhiko Arase QR Engine: Type 0 Auto, Error Correction 'M')
			const qrFactory = typeof window.qrcode === 'function' ? window.qrcode : (typeof qrcode === 'function' ? qrcode : null);
			if (qrFactory) {
				const qr = qrFactory(0, 'M');
				qr.addData(text);
				qr.make();

				const moduleCount = qr.getModuleCount();
				const ctx = canvas.getContext('2d');
				const size = canvas.width;
				const cellSize = size / (moduleCount + 2); // 1-module quiet zone margin
				const margin = cellSize;

				// High-Contrast White Background for Turnstile Gate Optical Scanners
				ctx.fillStyle = '#FFFFFF';
				ctx.fillRect(0, 0, size, size);

				// Crisp High-Precision Black Modules
				ctx.fillStyle = '#000000';
				for (let row = 0; row < moduleCount; row++) {
					for (let col = 0; col < moduleCount; col++) {
						if (qr.isDark(row, col)) {
							ctx.fillRect(
								Math.round(margin + col * cellSize),
								Math.round(margin + row * cellSize),
								Math.ceil(cellSize),
								Math.ceil(cellSize)
							);
						}
					}
				}
				return;
			}
		} catch (err) {
			console.error('Vector QR rendering error:', err);
		}
	}

	#renderImageToCanvas(canvas, dataUrl) {
		const ctx = canvas.getContext('2d');
		const img = new Image();
		img.onload = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
		};
		img.src = dataUrl;
	}

	#startCountdownTimer(expiresAt) {
		if (this.#state.timerIntervalId) {
			clearInterval(this.#state.timerIntervalId);
		}

		const updateTimer = () => {
			const remainingMs = expiresAt - Date.now();
			if (remainingMs <= 0) {
				this.#dom.passCountdown.textContent = i18n.t('metroTicket.cards.history.statusExpired');
				this.#dom.passCountdown.classList.add('expired');
				clearInterval(this.#state.timerIntervalId);
				this.#state.timerIntervalId = null;
				this.#renderHistoryList();
				return;
			}

			const totalSeconds = Math.floor(remainingMs / 1000);
			const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
			const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
			const seconds = String(totalSeconds % 60).padStart(2, '0');

			this.#dom.passCountdown.textContent = `${hours}:${minutes}:${seconds}`;
			this.#dom.passCountdown.classList.remove('expired');
		};

		updateTimer();
		this.#state.timerIntervalId = setInterval(updateTimer, 1000);
	}

	#renderHistoryList() {
		const total = this.#state.history.length;
		this.#dom.historyCountBadge.textContent = `${total}/${TicketWalletApp.#MAX_HISTORY_ITEMS}`;
		this.#dom.btnClearAllHistory.disabled = total === 0;

		if (total === 0) {
			this.#dom.historyListContainer.innerHTML = `
				<div class="history-empty-state" data-i18n="metroTicket.cards.history.empty">
					${i18n.t('metroTicket.cards.history.empty')}
				</div>
			`;
			return;
		}

		this.#dom.historyListContainer.innerHTML = this.#state.history.map(item => {
			const isActive = item.id === this.#state.activeTicketId;
			const isExpired = item.expiresAt <= Date.now();
			const dateStr = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

			let statusPill = '';
			if (isActive) {
				statusPill = `<span class="history-status-pill active">● ${i18n.t('metroTicket.cards.history.statusActive')}</span>`;
			} else if (isExpired) {
				statusPill = `<span class="history-status-pill expired">${i18n.t('metroTicket.cards.history.statusExpired')}</span>`;
			} else {
				statusPill = `<span class="history-status-pill archived">${i18n.t('metroTicket.cards.history.statusArchived')}</span>`;
			}

			return `
				<div class="history-item ${isActive ? 'active' : ''}" data-ticket-id="${item.id}">
					<div class="history-thumb-wrap">
						<img src="${item.originalImage}" alt="Thumb" class="history-thumb" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%22 height=%22100%22 fill=%22%23cbd5e1%22/></svg>'">
					</div>
					<div class="history-meta">
						<div class="history-meta-top">
							<span class="history-engine-name">${this.#escapeHtml(item.engine || 'QR Pass')}</span>
							${statusPill}
						</div>
						<span class="history-time">${dateStr}</span>
					</div>
					<div class="history-item-actions">
						${!isActive ? `
							<button type="button" class="btn-restore-ticket" data-restore-id="${item.id}">
								${i18n.t('metroTicket.cards.history.btnRestore')}
							</button>
						` : ''}
						<button type="button" class="btn-delete-history-item" data-delete-id="${item.id}" title="Delete" aria-label="Delete">
							🗑️
						</button>
					</div>
				</div>
			`;
		}).join('');

		// Bind Dynamic History Item Event Listeners
		this.#dom.historyListContainer.querySelectorAll('.btn-restore-ticket').forEach(btn => {
			btn.addEventListener('click', (e) => {
				const id = e.currentTarget.getAttribute('data-restore-id');
				this.#restoreTicketToActive(id);
			});
		});

		this.#dom.historyListContainer.querySelectorAll('.btn-delete-history-item').forEach(btn => {
			btn.addEventListener('click', (e) => {
				const id = e.currentTarget.getAttribute('data-delete-id');
				this.#deleteTicketFromHistory(id);
			});
		});
	}

	#restoreTicketToActive(ticketId) {
		const target = this.#state.history.find(t => t.id === ticketId);
		if (!target) return;

		this.#state.activeTicketId = ticketId;
		this.#persistStore();
		this.#renderActivePassCard();
		this.#renderHistoryList();

		this.#dom.passCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
		this.#showToast(i18n.t('metroTicket.toast.restoredToGatePass'));
	}

	#deleteTicketFromHistory(ticketId) {
		this.#state.history = this.#state.history.filter(t => t.id !== ticketId);
		if (this.#state.activeTicketId === ticketId) {
			this.#state.activeTicketId = this.#state.history.length > 0 ? this.#state.history[0].id : null;
		}
		this.#persistStore();
		this.#renderActivePassCard();
		this.#renderHistoryList();
		this.#showToast(i18n.t('metroTicket.toast.deletedFromHistory'));
	}

	#archiveActiveTicket() {
		if (!this.#state.activeTicketId) return;
		this.#state.activeTicketId = null;
		this.#persistStore();
		this.#renderActivePassCard();
		this.#renderHistoryList();
		this.#showToast(i18n.t('metroTicket.toast.movedToHistory'));
	}

	#promptClearAllHistory() {
		this.#openConfirmModal(
			i18n.t('metroTicket.modals.confirm.title'),
			i18n.t('metroTicket.modals.confirm.clearAllDesc'),
			() => {
				this.#state.history = [];
				this.#state.activeTicketId = null;
				this.#persistStore();
				this.#renderActivePassCard();
				this.#renderHistoryList();
				this.#showToast(i18n.t('metroTicket.toast.allCleared'));
			}
		);
	}

	#openGateModal() {
		if (!this.#state.activeTicketId) return;
		const active = this.#state.history.find(t => t.id === this.#state.activeTicketId);
		if (!active) return;

		if (active.type === 'VECTOR_QR' && active.tokenText) {
			this.#renderVectorQrToCanvas(this.#dom.gateModalCanvas, active.tokenText);
		} else {
			this.#renderImageToCanvas(this.#dom.gateModalCanvas, active.originalImage);
		}

		this.#dom.gateModal.classList.add('active');
		this.#dom.gateModal.setAttribute('aria-hidden', 'false');
	}

	#closeGateModal() {
		this.#dom.gateModal.classList.remove('active');
		this.#dom.gateModal.setAttribute('aria-hidden', 'true');
	}

	#openOriginalModal() {
		if (!this.#state.activeTicketId) return;
		const active = this.#state.history.find(t => t.id === this.#state.activeTicketId);
		if (!active?.originalImage) {
			this.#showToast(i18n.t('metroTicket.toast.noOriginalImage'));
			return;
		}

		this.#dom.originalImagePreview.src = active.originalImage;
		this.#dom.originalModal.classList.add('active');
		this.#dom.originalModal.setAttribute('aria-hidden', 'false');
	}

	#closeOriginalModal() {
		this.#dom.originalModal.classList.remove('active');
		this.#dom.originalModal.setAttribute('aria-hidden', 'true');
	}

	#openConfirmModal(title, desc, onConfirm) {
		this.#dom.confirmModalTitle.textContent = title;
		this.#dom.confirmModalDesc.textContent = desc;
		this.#state.pendingConfirmCallback = onConfirm;
		this.#dom.confirmModal.classList.add('active');
		this.#dom.confirmModal.setAttribute('aria-hidden', 'false');
	}

	#closeConfirmModal() {
		this.#dom.confirmModal.classList.remove('active');
		this.#dom.confirmModal.setAttribute('aria-hidden', 'true');
		this.#state.pendingConfirmCallback = null;
	}

	#loadPersistedStore() {
		try {
			const saved = localStorage.getItem(TicketWalletApp.#STORAGE_KEY) || localStorage.getItem(TicketWalletApp.#LEGACY_STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				this.#state.history = Array.isArray(parsed.history) ? parsed.history : [];
				// केवल तभी एक्टिव टिकट सेट करें जब वह हिस्ट्री में मौजूद हो और अभी एक्सपायर न हुआ हो
				if (parsed.activeTicketId) {
					const active = this.#state.history.find(t => t.id === parsed.activeTicketId);
					if (active && active.expiresAt > Date.now()) {
						this.#state.activeTicketId = parsed.activeTicketId;
					} else {
						this.#state.activeTicketId = null;
					}
				} else {
					this.#state.activeTicketId = null;
				}
			}
		} catch (e) {
			console.warn('Failed to parse persisted wallet store:', e);
			this.#state.history = [];
			this.#state.activeTicketId = null;
		}

		this.#renderActivePassCard();
		this.#renderHistoryList();
	}

	#persistStore() {
		try {
			const payload = {
				activeTicketId: this.#state.activeTicketId,
				history: this.#state.history
			};
			localStorage.setItem(TicketWalletApp.#STORAGE_KEY, JSON.stringify(payload));
		} catch (e) {
			console.warn('Failed to persist wallet store (Storage Quota):', e);
		}
	}

	#getOptimizedDataURL(canvas) {
		try {
			return canvas.toDataURL('image/jpeg', 0.82);
		} catch (_) {
			return canvas.toDataURL();
		}
	}

	#showToast(message, type = 'info') {
		if (typeof Toast?.show === 'function') {
			Toast.show(message, type);
		}
	}

	#escapeHtml(str) {
		if (typeof str !== 'string') return '';
		return str.replace(/[&<>'"]/g, tag => ({
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			"'": '&#39;',
			'"': '&quot;'
		}[tag] || tag));
	}
}