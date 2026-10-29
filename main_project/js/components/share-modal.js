/**
 * Hybrid Share Modal Component
 * Handles Mobile Native Web Share API (with <div class="timeline-card"> Screenshot + Text + Link),
 * Desktop Custom Share Modal, WhatsApp Web & Telegram Web clipboard image paste,
 * Timeline Card Image Download, Clipboard copy, and Toast notifications.
 */
import { centerClass } from "../core/CenterClass.js";
import { APP_CONFIG } from "../config/app-config.js";

export class ShareModalComponent {
	#elements = {};
	#abortController = null;
	#activeImageBlob = null;

	constructor() {
		this.#abortController = new AbortController();
		this.#getElements();
		this.#initEvents();
	}

	destroy() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
		}
		this.#activeImageBlob = null;
		this.close();
	}

	#getElements() {
		this.#elements = {
			shareModal: document.getElementById("shareModal"),
			closeShareModal: document.getElementById("closeShareModal"),
			shareWhatsAppBtn: document.getElementById("shareWhatsAppBtn"),
			shareTelegramBtn: document.getElementById("shareTelegramBtn"),
			shareSmsBtn: document.getElementById("shareSmsBtn"),
			copyShareUrlBtn: document.getElementById("copyShareUrlBtn"),
			copyShareTextBtn: document.getElementById("copyShareTextBtn"),
			copyShareImageBtn: document.getElementById("copyShareImageBtn"),
			downloadShareCardBtn: document.getElementById("downloadShareCardBtn"),
			shareToast: document.getElementById("shareToast"),
			sharePreviewFrom: document.getElementById("sharePreviewFrom"),
			sharePreviewTo: document.getElementById("sharePreviewTo"),
			sharePreviewDist: document.getElementById("sharePreviewDist"),
			sharePreviewTime: document.getElementById("sharePreviewTime"),
			sharePreviewFare: document.getElementById("sharePreviewFare"),
		};
	}

	#initEvents() {
		const signal = this.#abortController.signal;
		const { closeShareModal, shareModal } = this.#elements;

		if (closeShareModal) {
			closeShareModal.addEventListener("click", () => this.close(), { signal });
		}

		if (shareModal) {
			shareModal.addEventListener("click", (e) => {
				if (e.target === shareModal) {
					this.close();
				}
			}, { signal });
		}

		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && shareModal?.classList.contains("active")) {
				this.close();
			}
		}, { signal });
	}

	/**
	 * 📸 Capture actual <div class="timeline-card"> into a high-res PNG Blob
	 * 🚀 Complete Offline Route Pass with Prominent Brand Bar, Full Journey Header,
	 * Metrics Card, Unclipped Timeline Stations, and Centered Dynamic Route QR Code!
	 * Adheres strictly to Zero-Inline-CSS and Master Design Token Architecture.
	 * @param {string|null} [routeUrl=null]
	 * @returns {Promise<Blob|null>}
	 */
	async captureTimelineCardBlob(routeUrl = null) {
		const timelineCard = document.querySelector(".timeline-card");
		if (!timelineCard) {
			console.warn("[ShareModal] .timeline-card not found in DOM");
			return null;
		}

		if (typeof window.html2canvas !== "function") {
			console.warn("[ShareModal] html2canvas library not loaded on window");
			return null;
		}

		const targetRouteUrl = routeUrl || window.location.href;

		// 🎯 Generate 100% Offline Dynamic Vector QR Code (Synchronous Vector SVG)
		let qrSvgMarkup = "";
		try {
			const qrEngine = typeof window.qrcode === "function" ? window.qrcode : (typeof globalThis.qrcode === "function" ? globalThis.qrcode : null);
			if (qrEngine && targetRouteUrl) {
				const qr = qrEngine(0, "M");
				qr.addData(targetRouteUrl);
				qr.make();
				qrSvgMarkup = qr.createSvgTag(3); // 135x135 pure vector SVG with white background & black modules
			}
		} catch (qrErr) {
			console.warn("[ShareModal] Dynamic offline QR generation fallback:", qrErr);
		}

		if (!qrSvgMarkup) {
			qrSvgMarkup = `<img src="./assets/images/qr-code.png" alt="Scan Route QR Code" class="share-pass-qr-img" />`;
		}

		try {
			// Compute dynamic total height for unconstrained capture
			let calculatedTotalHeight = 540;
			const rows = timelineCard.querySelectorAll(".station-row, .segment-header, .interchange-card, .timeline-card-header");
			rows.forEach((r) => {
				const isInterchange = r.classList.contains("interchange-card");
				const isHeader = r.classList.contains("segment-header") || r.classList.contains("timeline-card-header");
				const minH = isInterchange ? 90 : (isHeader ? 50 : 56);
				const measuredH = r.offsetHeight || 0;
				calculatedTotalHeight += Math.max(measuredH, minH);
			});

			const fullHeight = calculatedTotalHeight;

			const canvas = await window.html2canvas(timelineCard, {
				scale: 2, // 2x high resolution
				useCORS: true,
				logging: false,
				allowTaint: true,
				height: fullHeight,
				windowHeight: fullHeight + 600, // Headroom so viewport bounds never clip bottom
				scrollX: 0,
				scrollY: 0,
				onclone: (clonedDoc, clonedEl) => {
					// 1. Activate modular screenshot capture CSS classes (Pure CSS architecture)
					clonedDoc.body.classList.add("share-pass-capture-active");

					if (clonedEl) {
						// 🌟 PREPEND: Site Brand Bar (Zero Inline CSS, Pure Modular Classes)
						const brandBar = clonedDoc.createElement("div");
						brandBar.className = "share-pass-brand-bar";
						brandBar.innerHTML = `
							<div class="share-pass-brand-identity">
								<img src="./assets/images/site_icon.svg" class="share-pass-brand-logo" alt="Logo" />
								<div class="share-pass-brand-titles">
									<div class="share-pass-brand-title">YATRAMARG METRO</div>
									<div class="share-pass-brand-subtitle">OFFICIAL ROUTE PASS</div>
								</div>
							</div>
							<span class="share-pass-badge">DIGITAL PASS</span>
						`;

						// 🌟 PREPEND: <div class="journey-title-header">
						const origHeader = clonedDoc.querySelector(".journey-title-header");
						let headerClone = null;
						if (origHeader) {
							headerClone = origHeader.cloneNode(true);
							headerClone.classList.add("share-pass-cloned-header");
						}

						// 🌟 PREPEND: <div class="journey-metrics-card"> (Contains Time, Distance, Stations, Fare & First/Last train)
						const origMetrics = clonedDoc.querySelector(".journey-metrics-card");
						let metricsClone = null;
						if (origMetrics) {
							metricsClone = origMetrics.cloneNode(true);
							metricsClone.classList.add("share-pass-cloned-metrics");
							const toggleBox = metricsClone.querySelector(".fare-breakdown-toggle-box, #fareBreakdownBtn");
							if (toggleBox) toggleBox.remove();
						}

						// Insert in order: Brand Bar -> Journey Header -> Metrics & Fare Card -> Timeline
						if (metricsClone) clonedEl.insertBefore(metricsClone, clonedEl.firstChild);
						if (headerClone) clonedEl.insertBefore(headerClone, clonedEl.firstChild);
						clonedEl.insertBefore(brandBar, clonedEl.firstChild);

						// 🌟 APPEND: Centered Dynamic QR Code Footer (Zero Inline CSS, Pure Modular Classes)
						const footer = clonedDoc.createElement("div");
						footer.className = "share-pass-footer-bar";
						footer.innerHTML = `
							<div class="share-pass-qr-card">
								<div class="share-pass-qr-wrapper">
									${qrSvgMarkup}
								</div>
								<span class="share-pass-qr-label">📱 SCAN TO OPEN THIS ROUTE</span>
							</div>
							<div class="share-pass-footer-info">
								<span class="share-pass-footer-tagline">
									<span>📍</span> Real-time Offline Metro Map
								</span>
								<span class="share-pass-footer-url">raaz2507.github.io/metro_Map_n_Route-Finder</span>
								<span class="share-pass-footer-desc">Scan QR with camera to open & navigate this route offline</span>
							</div>
						`;
						clonedEl.appendChild(footer);
					}
				}
			});

			return new Promise((resolve) => {
				canvas.toBlob((blob) => resolve(blob), "image/png");
			});
		} catch (err) {
			console.error("[ShareModal] Error capturing complete route pass screenshot:", err);
			return null;
		}
	}

	/**
	 * 🚇 रूट इंफॉर्मेशन ऑब्जेक्ट से शेयरिंग को स्वतः फॉर्मेट और ट्रिगर करना
	 */
	async shareRoute(routeInfo, lang = "en") {
		if (!routeInfo?.path?.length) return;

		const path = routeInfo.path;
		const startId = path[0];
		const endId = path[path.length - 1];

		const startName = centerClass.getStationName(startId, lang);
		const endName = centerClass.getStationName(endId, lang);
		const distKm = (routeInfo.totalDistanceMeters / 1000).toFixed(1);
		const totalMin = Math.round(routeInfo.totalTravelTimeSeconds / 60);
		const fare = routeInfo.fare?.totalFare || 0;
		const interchangeCount = routeInfo.interchangesCount || (Array.isArray(routeInfo.interchanges) ? routeInfo.interchanges.length : 0);
		const stationsCount = routeInfo.totalStations || path.length;

		const shareUrl = `${APP_CONFIG.getBaseUrl()}?from=${encodeURIComponent(startId)}&to=${encodeURIComponent(endId)}`;
		const shareText = `🚇 Metro Route: ${startName} → ${endName}\n⏱️ Time: ~${totalMin} min | 📏 Distance: ${distKm} km | 💰 Fare: ₹${fare}\n🔗 Details: ${shareUrl}`;

		const shareData = {
			startName,
			endName,
			distKm,
			totalMin,
			tokenFare: fare,
			interchangeCount,
			stationsCount,
			shareUrl,
			shareText
		};

		// 📸 1. Capture actual <div class="timeline-card"> screenshot (Full route, zero cut-off, dynamic route QR)
		this.#showToast(centerClass.t("pages.home.toast.share.capturing") || "Capturing full route timeline...");
		const imageBlob = await this.captureTimelineCardBlob(shareUrl);
		this.#activeImageBlob = imageBlob;

		// 📤 2. Trigger Share (Image + Text + Link)
		await this.#share(shareData, lang, imageBlob);
	}

	/**
	 * Share Action: Mobile Web Share API ya Desktop Custom Share Modal
	 * @param {Object} shareData 
	 * @param {string} currentLang 
	 * @param {Blob|null} imageBlob
	 */
	async #share(shareData, currentLang = "en", imageBlob = null) {
		if (!shareData) return;

		const { shareText, startName, endName } = shareData;

		// A) Mobile Native Share Sheet (yadi available ho)
		const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 
			(window.Capacitor && window.Capacitor.isNativePlatform());

		if (isMobile && navigator.share) {
			try {
				let imageFile = null;
				if (imageBlob) {
					imageFile = new File([imageBlob], `metro-route-${startName}-to-${endName}.png`, { type: "image/png" });
				}

				// Check if sharing files is supported
				if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
					await navigator.share({
						title: `Metro Route: ${startName} → ${endName}`,
						text: shareText,
						files: [imageFile]
					});
					return;
				}

				// Fallback to text-only native share if files sharing is not permitted
				await navigator.share({
					title: `Metro Route: ${startName} → ${endName}`,
					text: shareText
				});
				return;
			} catch (err) {
				if (err.name === "AbortError") return;
			}
		}

		// B) Desktop / Fallback Custom Share Modal (Opens rich options with WhatsApp Web & Telegram Web)
		this.#open(shareData, currentLang, imageBlob);
	}

	/**
	 * Custom Share Modal Open karein aur links fill karein
	 */
	#open(data, currentLang = "en", imageBlob = null) {
		const { startName, endName, distKm, totalMin, tokenFare, shareUrl, shareText } = data;
		const {
			shareModal,
			sharePreviewFrom,
			sharePreviewTo,
			sharePreviewDist,
			sharePreviewTime,
			sharePreviewFare,
			shareWhatsAppBtn,
			shareTelegramBtn,
			shareSmsBtn,
			copyShareUrlBtn,
			copyShareTextBtn,
			copyShareImageBtn,
			downloadShareCardBtn
		} = this.#elements;

		if (!shareModal) return;

		if (sharePreviewFrom) sharePreviewFrom.textContent = startName;
		if (sharePreviewTo) sharePreviewTo.textContent = endName;
		if (sharePreviewDist) sharePreviewDist.textContent = `${distKm} km`;
		if (sharePreviewTime) sharePreviewTime.textContent = `${totalMin} min`;
		if (sharePreviewFare) sharePreviewFare.textContent = `₹${tokenFare}`;

		const encodedText = encodeURIComponent(shareText);
		const encodedUrl = encodeURIComponent(shareUrl);
		const blob = imageBlob || this.#activeImageBlob;

		// 💬 WhatsApp Web: Automatically copy screenshot to clipboard + open WhatsApp Web
		if (shareWhatsAppBtn) {
			shareWhatsAppBtn.onclick = async () => {
				let imgCopied = false;
				if (blob && navigator.clipboard && typeof window.ClipboardItem !== "undefined") {
					try {
						await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
						imgCopied = true;
					} catch (e) {
						console.warn("Clipboard image write failed:", e);
					}
				}

				window.open(`https://web.whatsapp.com/send?text=${encodedText}`, "_blank");
				if (imgCopied) {
					this.#showToast(centerClass.t("pages.home.toast.share.whatsappPasteHint") || "📋 Image copied! Press Ctrl+V in WhatsApp chat.");
				}
			};
		}

		// ✈️ Telegram Web: Automatically copy screenshot to clipboard + open Telegram
		if (shareTelegramBtn) {
			shareTelegramBtn.onclick = async () => {
				let imgCopied = false;
				if (blob && navigator.clipboard && typeof window.ClipboardItem !== "undefined") {
					try {
						await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
						imgCopied = true;
					} catch (e) {}
				}

				window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, "_blank");
				if (imgCopied) {
					this.#showToast(centerClass.t("pages.home.toast.share.telegramPasteHint") || "📋 Image copied! Press Ctrl+V in Telegram chat.");
				}
			};
		}

		if (shareSmsBtn) {
			shareSmsBtn.onclick = () => {
				window.location.href = `sms:?body=${encodedText}`;
			};
		}

		if (copyShareUrlBtn) {
			copyShareUrlBtn.onclick = async () => {
				try {
					await navigator.clipboard.writeText(shareUrl);
					this.#showToast(centerClass.t("pages.home.toast.share.copiedLink"));
				} catch (e) {
					console.error("Clipboard copy failed:", e);
				}
			};
		}

		if (copyShareTextBtn) {
			copyShareTextBtn.onclick = async () => {
				try {
					await navigator.clipboard.writeText(shareText);
					this.#showToast(centerClass.t("pages.home.toast.share.copiedDetails"));
				} catch (e) {
					console.error("Clipboard copy failed:", e);
				}
			};
		}

		// 📋 Copy Image directly to clipboard (for pasting anywhere)
		if (copyShareImageBtn) {
			copyShareImageBtn.onclick = async () => {
				if (!blob) {
					this.#showToast("Preparing screenshot...");
					return;
				}
				if (navigator.clipboard && typeof window.ClipboardItem !== "undefined") {
					try {
						await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
						this.#showToast(centerClass.t("pages.home.toast.share.imageCopied") || "Timeline screenshot copied to clipboard!");
					} catch (e) {
						this.#showToast("Clipboard copy not permitted. Use Save Image instead.");
					}
				} else {
					this.#showToast("Clipboard image not supported on this browser.");
				}
			};
		}

		// 💾 Download screenshot image as .PNG
		if (downloadShareCardBtn) {
			downloadShareCardBtn.onclick = () => {
				if (!blob) {
					this.#showToast("Preparing timeline screenshot...");
					return;
				}
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `timeline-${startName}-to-${endName}.png`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				this.#showToast(centerClass.t("pages.home.toast.share.downloadedCard") || "Route timeline screenshot saved!");
			};
		}

		shareModal.classList.add("active");
		shareModal.setAttribute("aria-hidden", "false");
	}

	close() {
		const { shareModal } = this.#elements;
		if (shareModal) {
			shareModal.classList.remove("active");
			shareModal.setAttribute("aria-hidden", "true");
		}
	}

	#showToast(message) {
		const toast = this.#elements.shareToast;
		if (!toast) return;

		toast.textContent = message;
		toast.classList.add("show");

		setTimeout(() => {
			toast.classList.remove("show");
		}, 3500);
	}
}
