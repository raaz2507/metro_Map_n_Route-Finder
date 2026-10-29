/**
 * other.js - Transit Media & Metro Map Showcase Page Controller
 * Architecture: Clean, Decoupled ES2022 Class-Based Controllers
 */
import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';
import { Toast } from '../components/Toast.js';
import { centerClass } from '../core/CenterClass.js';
import { appStateStore } from '../core/app-state-store.js';
import { eventBus } from '../core/event-bus.js';
import { APP_CONFIG } from '../config/app-config.js';

/* =============================================================================
   1. METRO MAP CARD CONTROLLER (Isolated ES2022 Singleton Class)
   ============================================================================= */
class MetroMapCardController {
	static #CACHE_NAME = 'transit_pdf_cache_v1';
	static #REGISTRY_PATH = 'data/india/india_transit_registry.json';
	static #cachedCityData = null;
	static #activeNetwork = '';
	static #isSubscribed = false;

	/**
	 * Main Initializer for Metro Map Action Card
	 */
	static async init() {
		const listContainer = document.getElementById('map-networks-list');
		const subtitleEl = document.getElementById('map-card-subtitle');
		if (!listContainer || !subtitleEl) return;

		// 1. URL Se city aur network parameters read karein
		const urlParams = new URLSearchParams(window.location.search);
		const cityId = urlParams.get('city');
		this.#activeNetwork = urlParams.get('network') || urlParams.get('net') || localStorage.getItem('active_network') || '';

		// Agar URL me city parameter nahi hai, to koi button load nahi hoga
		if (!cityId) {
			listContainer.innerHTML = '';
			subtitleEl.textContent = centerClass.t('pages.other.mapCard.selectCity');
			return;
		}

		// 2. Registry se data load karein
		try {
			const response = await fetch(this.#REGISTRY_PATH);
			if (!response.ok) {
				throw new Error(`Failed to load registry: ${response.status}`);
			}
			const registry = await response.json();
			this.#cachedCityData = registry?.cities?.[cityId] || null;

			if (!this.#cachedCityData) {
				subtitleEl.textContent = centerClass.t('pages.other.mapCard.transitInfo');
				Toast.show(centerClass.t('pages.other.toasts.cityNotFound'), { type: 'warning' });
				return;
			}

			// Render active language view
			this.#renderCurrentState();

			// 3. Listen to language changes via AppStateStore & EventBus for instant live updates
			if (!this.#isSubscribed) {
				const rerender = () => {
					this.#renderCurrentState();
				};
				appStateStore.subscribe('currentLang', rerender);
				eventBus.on('app:language-changed', rerender);
				eventBus.on('LANGUAGE_PACK_CHANGED', rerender);
				this.#isSubscribed = true;
			}

		} catch (error) {
			console.error('[MetroMapCardController] Init error:', error);
			Toast.show(centerClass.t('pages.other.toasts.registryLoadError'), { type: 'danger' });
		}
	}

	/**
	 * Re-renders subtitle and network buttons using current active language
	 */
	static #renderCurrentState() {
		const listContainer = document.getElementById('map-networks-list');
		const subtitleEl = document.getElementById('map-card-subtitle');
		if (!listContainer || !subtitleEl || !this.#cachedCityData) return;

		const currentLang = centerClass.currentLanguage || document.body.getAttribute('data-lang') || 'en';
		const cityName = this.#cachedCityData.name?.[currentLang] || this.#cachedCityData.name?.en || 'City';
		
		subtitleEl.textContent = centerClass.t('pages.other.mapCard.transitSuffix', { city: cityName });

		this.#renderNetworkRows(this.#cachedCityData.networks || {}, listContainer, currentLang, this.#activeNetwork);
	}

	/**
	 * Networks aur unke verified buttons render karta hai (Zero Broken Links)
	 */
	static #renderNetworkRows(networksObj, container, lang, activeNetwork) {
		container.innerHTML = '';

		// 1. Operational aur Map-Ready networks filter karein (Under Construction exclude honge)
		let validNetworks = Object.entries(networksObj).filter(([_, net]) => {
			const isOperational = net?.status === 'operational' || net?.status === 'operational_partial';
			const map = net?.map;
			const hasMap = map && (map.official_url || map.official_pdf_url || map.local_pdf);
			return isOperational && hasMap;
		});

		// 2. Single Network vs Group Filter:
		// Agar user ne koi specific network select kiya hai (e.g. dmrc), to sirf wahi 1 dikhega
		if (activeNetwork && activeNetwork !== 'all') {
			const singleMatch = validNetworks.filter(([key]) => key === activeNetwork);
			if (singleMatch.length > 0) {
				validNetworks = singleMatch;
			}
		}

		// Agar kisi network me map nahi hai to list khali rahegi
		if (validNetworks.length === 0) {
			return;
		}

		validNetworks.forEach(([netKey, net]) => {
			const mapData = net.map;
			const netName = net.name?.[lang] || net.name?.en || netKey;

			const row = document.createElement('div');
			row.className = 'network-item-row';

			// Network Title
			const nameEl = document.createElement('span');
			nameEl.className = 'network-name';
			nameEl.textContent = netName;
			nameEl.title = netName;
			row.appendChild(nameEl);

			// Action Buttons Group
			const btnGroup = document.createElement('div');
			btnGroup.className = 'network-btn-group';

			// 1. Official Web Map Link (Only if present)
			if (mapData.official_url) {
				const webBtn = document.createElement('a');
				webBtn.href = mapData.official_url;
				webBtn.target = '_blank';
				webBtn.rel = 'noopener noreferrer';
				webBtn.className = 'btn-micro-action btn-map-web';
				webBtn.title = centerClass.t('pages.other.mapCard.titleWeb', { network: netName });
				webBtn.textContent = centerClass.t('pages.other.mapCard.btnWeb');
				btnGroup.appendChild(webBtn);
			}

			// 2. Official PDF Map Link (Direct Official External Link - Zero CORS/X-Frame block)
			if (mapData.official_pdf_url) {
				const pdfBtn = document.createElement('a');
				pdfBtn.href = mapData.official_pdf_url;
				pdfBtn.target = '_blank';
				pdfBtn.rel = 'noopener noreferrer';
				pdfBtn.className = 'btn-micro-action btn-map-official-pdf';
				pdfBtn.title = centerClass.t('pages.other.mapCard.titlePdf', { network: netName });
				pdfBtn.textContent = centerClass.t('pages.other.mapCard.btnPdf');
				btnGroup.appendChild(pdfBtn);
			}

			// 3. Fast In-App / Cached PDF Button (Only if present) - Name remains 'Fast'
			if (mapData.local_pdf) {
				const fastBtn = document.createElement('button');
				fastBtn.type = 'button';
				fastBtn.className = 'btn-micro-action btn-map-inapp-pdf';
				fastBtn.title = centerClass.t('pages.other.mapCard.titleFast');
				fastBtn.textContent = centerClass.t('pages.other.mapCard.btnFast');

				const pdfUrl = this.#resolvePdfUrl(mapData.local_pdf);

				// Cache state check karein (Agar pehle se cached hai to .is-cached solid fill)
				this.#checkAndApplyCacheState(fastBtn, pdfUrl);

				// Click event: Progress download or instant cache in-app view
				fastBtn.addEventListener('click', (e) => {
					e.preventDefault();
					this.#handlePdfAction(fastBtn, pdfUrl, netName, 'Fast Map');
				});

				btnGroup.appendChild(fastBtn);
			}

			row.appendChild(btnGroup);
			container.appendChild(row);
		});
	}

	/**
	 * Local PDF ke liye absolute ya hosting URL banata hai
	 */
	static #resolvePdfUrl(localPdfPath) {
		const isCapacitorApp = typeof window !== 'undefined' && 
			((window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
			window.location.protocol === 'capacitor:' ||
			(window.location.hostname === 'localhost' && !window.location.port));
		const isGitHubPages = window.location.hostname.includes('github.io');

		// 1. Android APK mein ya GitHub Pages par: hamesha GitHub Raw se download kare
		if (isCapacitorApp || isGitHubPages) {
			return `https://raw.githubusercontent.com/raaz2507/metro_Map_n_Route-Finder/main/transit_assets/transit_maps/${localPdfPath}`;
		}

		// 2. Local computer / Live Server par: root se seedhe access kare
		return `../transit_assets/transit_maps/${localPdfPath}`;
	}

	/**
	 * CacheStorage me PDF ki upasthiti check karta hai
	 */
	static async #checkAndApplyCacheState(btn, pdfUrl) {
		if (!('caches' in window)) return;
		try {
			const cache = await caches.open(this.#CACHE_NAME);
			const match = await cache.match(pdfUrl);
			if (match) {
				btn.classList.add('is-cached');
				btn.title = centerClass.t('pages.other.mapCard.titleOfflineReady');
			}
		} catch (err) {
			console.warn('[MetroMapCard] Cache check error:', err);
		}
	}

	/**
	 * Unified Smart PDF Action Handler (Cache-First + In-App Full-Screen Viewer)
	 */
	static async #handlePdfAction(btn, pdfUrl, netName, badgeLabel) {
		if (!('caches' in window)) {
			PdfViewerModalController.open(pdfUrl, netName, badgeLabel);
			return;
		}

		try {
			const cache = await caches.open(this.#CACHE_NAME);
			const cachedResponse = await cache.match(pdfUrl);

			// Agar pehle se Cache me hai -> Turant In-App Modal me Instant Open!
			if (cachedResponse) {
				const blob = await cachedResponse.blob();
				const blobUrl = URL.createObjectURL(blob);
				// Firefox PDF.js worker throws 'Message: undefined' on iframe blob: URLs; pass real pdfUrl when reachable
				const viewUrl = (window.location.protocol.startsWith('http') && navigator.onLine !== false) ? pdfUrl : blobUrl;
				PdfViewerModalController.open(viewUrl, netName, badgeLabel, blobUrl);
				return;
			}

			// Agar cache me nahi hai -> In-Button Progress Download Shuru
			btn.classList.add('is-downloading');
			btn.style.setProperty('--download-progress', '0%');

			const response = await fetch(pdfUrl);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText || 'File Not Found'}`);
			}

			const contentLength = response.headers.get('content-length');
			const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

			let loadedBytes = 0;
			const chunks = [];

			if (response.body && totalBytes > 0) {
				const reader = response.body.getReader();
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					chunks.push(value);
					loadedBytes += value.length;
					const percent = Math.min(Math.round((loadedBytes / totalBytes) * 100), 100);
					btn.style.setProperty('--download-progress', `${percent}%`);
				}
			} else {
				const blob = await response.blob();
				chunks.push(await blob.arrayBuffer());
			}

			// 100% Download complete confirmation
			btn.style.setProperty('--download-progress', '100%');

			const finalBlob = new Blob(chunks, { type: 'application/pdf' });

			// CacheStorage me save karein (Offline Ready)
			await cache.put(pdfUrl, new Response(finalBlob.slice(), {
				headers: { 'Content-Type': 'application/pdf' }
			}));

			// UI state update
			btn.classList.remove('is-downloading');
			btn.classList.add('is-cached');
			btn.title = centerClass.t('pages.other.mapCard.titleOfflineReady');
			btn.style.removeProperty('--download-progress');

			Toast.show(centerClass.t('pages.other.toasts.downloadSuccess', { network: netName }), { type: 'success' });

			// 100% download hone par hi In-App Viewer Modal kholein!
			const blobUrl = URL.createObjectURL(finalBlob);
			// Firefox PDF.js worker throws 'Message: undefined' on iframe blob: URLs; pass real pdfUrl when reachable
			const viewUrl = (window.location.protocol.startsWith('http') && navigator.onLine !== false) ? pdfUrl : blobUrl;
			PdfViewerModalController.open(viewUrl, netName, badgeLabel, blobUrl);

		} catch (error) {
			console.error(`[MetroMapCard] Download failed for ${netName} (${pdfUrl}):`, error);
			btn.classList.remove('is-downloading');
			btn.style.removeProperty('--download-progress');
			const errorMsg = centerClass.t('pages.other.toasts.downloadError') || 'Map download failed. Please check network.';
			Toast.show(errorMsg, { type: 'danger' });
			// Error aane par modal KABHI NAHI kholega
		}
	}
}

/* =============================================================================
   2. IN-APP PDF VIEWER MODAL CONTROLLER (Clean, Zero App Exit)
   ============================================================================= */
class PdfViewerModalController {
	static #modal = null;
	static #frame = null;
	static #title = null;
	static #badge = null;
	static #downloadBtn = null;
	static #closeBtn = null;
	static #loading = null;
	static #activeBlobUrl = null;

	static init() {
		this.#modal = document.getElementById('pdf-viewer-modal');
		if (!this.#modal) return;

		this.#frame = document.getElementById('pdf-viewer-frame');
		this.#title = document.getElementById('pdf-viewer-title');
		this.#badge = document.getElementById('pdf-viewer-badge');
		this.#downloadBtn = document.getElementById('pdf-viewer-download');
		this.#closeBtn = document.getElementById('pdf-viewer-close');
		this.#loading = document.getElementById('pdf-viewer-loading');

		// Close button click
		this.#closeBtn?.addEventListener('click', () => this.close());

		// Escape key to close
		window.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.#modal?.classList.contains('is-active')) {
				this.close();
			}
		});

		// Frame load listener to hide loading overlay
		this.#frame?.addEventListener('load', () => {
			this.#loading?.classList.add('is-hidden');
		});
	}

	static open(url, networkName, badgeText, downloadBlobUrl = null) {
		if (!this.#modal || !this.#frame) return;

		// Clean up previous blob URL if any
		if (this.#activeBlobUrl && this.#activeBlobUrl.startsWith('blob:')) {
			URL.revokeObjectURL(this.#activeBlobUrl);
		}
		this.#activeBlobUrl = downloadBlobUrl || (url.startsWith('blob:') ? url : null);

		// Header information
		if (this.#title) this.#title.textContent = `${networkName} Map`;
		if (this.#badge) this.#badge.textContent = badgeText || centerClass.t('pages.other.modal.badge');
		if (this.#downloadBtn) {
			this.#downloadBtn.href = downloadBlobUrl || url;
			this.#downloadBtn.download = `${networkName.replace(/\s+/g, '_')}_Map.pdf`;
		}

		// Show loading spinner overlay
		this.#loading?.classList.remove('is-hidden');

		// Set iframe source
		this.#frame.src = url;

		// Activate modal overlay
		this.#modal.classList.add('is-active');
		this.#modal.setAttribute('aria-hidden', 'false');
		document.body.style.overflow = 'hidden';
	}

	static close() {
		if (!this.#modal || !this.#frame) return;

		this.#modal.classList.remove('is-active');
		this.#modal.setAttribute('aria-hidden', 'true');
		this.#frame.src = 'about:blank';
		document.body.style.removeProperty('overflow');

		if (this.#activeBlobUrl && this.#activeBlobUrl.startsWith('blob:')) {
			URL.revokeObjectURL(this.#activeBlobUrl);
			this.#activeBlobUrl = null;
		}
	}
}

/* =============================================================================
   3. YOUTUBE CARD CONTROLLER (Clean Architecture with Centralized Config)
   ============================================================================= */
class YouTubeCardController {
	static init() {
		const shortsBtn = document.getElementById('yt-btn-shorts');
		const channelBtn = document.getElementById('yt-btn-channel');

		if (shortsBtn) {
			shortsBtn.href = APP_CONFIG.YOUTUBE?.SHORTS_URL || 'https://www.youtube.com';
		}
		if (channelBtn) {
			channelBtn.href = APP_CONFIG.YOUTUBE?.CHANNEL_URL || 'https://www.youtube.com';
		}
	}
}

/* =============================================================================
   PAGE BOOTSTRAP
   ============================================================================= */
document.addEventListener('DOMContentLoaded', () => {
	// Initialize global dynamic header and footer
	HeaderComponent.render('other');
	FooterComponent.render();

	// Initialize In-App PDF Viewer Modal
	PdfViewerModalController.init();

	// Initialize Metro Map Card
	MetroMapCardController.init();

	// Initialize YouTube 2.5D Action Card
	YouTubeCardController.init();
});



