import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';
import { appStateStore } from "../core/app-state-store.js";
import i18n from "../core/i18n.js";
import { metroDataStore } from "../core/metro-data-store.js";
import { Toast } from "../components/Toast.js";

document.addEventListener("DOMContentLoaded", () => {
	const controller = new PassengerSupportController();
	controller.init();
});

class PassengerSupportController {
	#activeCity = "delhi_ncr";
	#activeNetwork = null;
	#supportData = null;
	#unsubscribeLang = null;

	async init() {
		// 1. Initialize Universal Layout Header & Footer
		FooterComponent.render();
		await HeaderComponent.render("passenger_support");
		

		// 2. Strict URL Parameter Resolution (Zero Guesswork / Multi-user consistent)
		const urlParams = new URLSearchParams(window.location.search);
		this.#activeCity = urlParams.get("city");
		this.#activeNetwork = urlParams.get("network") || null;

		if (!this.#activeCity) {
			this.#renderCitySelectionRequiredState();
			return;
		}

		// 3. Bind Accordion Toggles
		this.#bindAccordion();

		// 4. Bind Floating Navigation & ScrollSpy
		this.#bindFloatingNav();

		// 5. Load and Apply City-Specific passenger_support.json
		await this.#loadSupportData();

		// 6. Subscribe to Dynamic Language Changes
		this.#unsubscribeLang = appStateStore.subscribe("currentLang", () => {
			this.#renderLanguageStrings();
		});
	}

	destroy() {
		if (this.#unsubscribeLang) {
			this.#unsubscribeLang();
			this.#unsubscribeLang = null;
		}
	}

	#bindAccordion() {
		const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

		document.querySelectorAll(".item-summary").forEach((item) => {
			item.addEventListener("click", (e) => {
				const callBtn = e.target.closest("a[href^='tel:']");

				// 📞 Smart Call Handler for Desktop with i18n
				if (callBtn) {
					if (!isMobile) {
						e.preventDefault();
						const rawTel = callBtn.getAttribute("href").replace("tel:", "").trim();
						try {
							navigator.clipboard?.writeText(rawTel);
						} catch (err) {}

						const title = i18n.t("passengerSupport.toast.noDialerTitle") || "📞 Helpline Contact";
						const message = i18n.t("passengerSupport.toast.noDialerMsg", { number: rawTel }) || 
							`No dialer on desktop. Helpline number ${rawTel} copied to clipboard!`;

						Toast.info(message, { title });
					}
					return; // Stop accordion toggle on call button click
				}

				// Accordion Toggle (Only when clicking outside buttons/links)
				if (e.target.closest("a, button")) return;

				const parent = item.closest(".support-item");
				if (parent) {
					parent.classList.toggle("collapsed");
				}
			});
		});
	}
	
	#bindFloatingNav() {
		const tabBtns = document.querySelectorAll(".floating-bottom-bar .seg-tab-btn");

		const setActiveBtn = (targetId) => {
			tabBtns.forEach((b) => {
				const id = b.getAttribute("data-tab") || b.hash?.replace("#", "");
				b.classList.toggle("active", id === targetId);
			});
		};

		// 1. Instant Active State + Smooth Scroll
		tabBtns.forEach((btn) => {
			btn.addEventListener("click", (e) => {
				e.preventDefault();
				const targetId = btn.getAttribute("data-tab") || btn.hash?.replace("#", "");
				const targetSec = document.getElementById(targetId);

				if (targetSec) {
					setActiveBtn(targetId);
					targetSec.scrollIntoView({ behavior: "smooth", block: "start" });
				}
			});
		});

		// 2. ScrollSpy via IntersectionObserver
		const observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					setActiveBtn(entry.target.id);
				}
			});
		}, {
			threshold: 0.35,
			rootMargin: "-20% 0px -40% 0px"
		});

		document.querySelectorAll(".tab-panel").forEach((section) => {
			observer.observe(section);
		});
	}

	async #loadSupportData() {
		this.#supportData = await metroDataStore.loadPassengerSupport(this.#activeCity);

		const networks = this.#supportData?.networks || {};
		const hasActualContent = Object.values(networks).some(net => 
			(net.helplines && Object.keys(net.helplines).length > 0) || 
			(net.portals && Object.keys(net.portals).length > 0)
		);

		if (this.#supportData && hasActualContent) {
			this.#populateCityData();
		} else {
			this.#renderUnavailableState();
		}
	}

	#renderUnavailableState() {
		const mainContent = document.getElementById("main-content");
		if (!mainContent) return;

		const cityName = this.#activeCity.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

		mainContent.innerHTML = `
			<header class="support-hero">
				<div class="hero-badge">
					<span class="support-ico ico-info ico-sm" aria-hidden="true"></span>
					<span>Directory Notice</span>
				</div>
				<h1>Passenger Support Directory</h1>
				<p>Support details, statutory contacts, and commuter facilities.</p>
			</header>

			<section class="support-unavailable-card">
				<div class="support-unavailable-icon">📋</div>
				<h3>Passenger Support Data Coming Soon</h3>
				<p>Official commuter helpline and regulatory directory for <strong>${cityName}</strong> is currently being compiled.</p>
				<p class="support-emergency-note">For immediate police or medical assistance, please dial National Emergency <strong>112</strong>.</p>
				<a href="index.html?city=${encodeURIComponent(this.#activeCity)}" class="drawer-btn support-return-btn">
					<span>Back to City Map</span>
				</a>
			</section>
		`;
	}


	#renderCitySelectionRequiredState() {
		const mainContent = document.getElementById("main-content");
		if (!mainContent) return;

		mainContent.innerHTML = `
			<header class="support-hero">
				<div class="hero-badge">
					<span class="support-ico ico-info ico-sm" aria-hidden="true"></span>
					<span>Directory Notice</span>
				</div>
				<h1>Passenger Support Directory</h1>
				<p>Official helpline directory, statutory contacts, and commuter facilities.</p>
			</header>

			<section class="support-unavailable-card">
				<div class="support-unavailable-icon">🏙️</div>
				<h3>Select Transit Network / City</h3>
				<p>Please choose a transit city from our official transit network directory to view authentic helplines and legal passenger support.</p>
				<p class="support-emergency-note">For immediate nationwide assistance, dial <strong>112</strong> (Police/Ambulance) or <strong>1090</strong> (Women Helpline).</p>
				<a href="TransitNetworkSelector.html" class="drawer-btn support-return-btn">
					<span>Browse Transit Networks & Cities</span>
				</a>
			</section>
		`;
	}


	#populateCityData() {
		if (!this.#supportData || !this.#supportData.networks) return;

		const networks = this.#supportData.networks;
		const netKeys = Object.keys(networks);

		// If no network selected, default to the first one
		if (!this.#activeNetwork || !networks[this.#activeNetwork]) {
			this.#activeNetwork = netKeys[0];
		}

		// Render Network Pills if multiple networks exist
		const pillContainer = document.getElementById("network-selector-container");
		if (pillContainer) {
			if (netKeys.length > 1) {
				pillContainer.innerHTML = netKeys.map((key) => `
					<button type="button" class="network-pill-btn ${key === this.#activeNetwork ? 'active' : ''}" data-network="${key}">
						${networks[key].network_name || key.toUpperCase()}
					</button>
				`).join("");
				pillContainer.classList.remove("hidden");

				pillContainer.querySelectorAll(".network-pill-btn").forEach((btn) => {
					btn.addEventListener("click", () => {
						this.#activeNetwork = btn.dataset.network;
						pillContainer.querySelectorAll(".network-pill-btn").forEach((b) => b.classList.remove("active"));
						btn.classList.add("active");
						this.#renderActiveNetwork(networks[this.#activeNetwork]);
					});
				});
			} else {
				pillContainer.classList.add("hidden");
			}
		}

		this.#renderActiveNetwork(networks[this.#activeNetwork]);
	}

	#renderActiveNetwork(net) {
		if (!net) return;

		const portals = net.portals || {};

		// Helper to bind link safely and prevent '#' reload jump
		const setLink = (id, url) => {
			const el = document.getElementById(id);
			if (!el) return;
			if (url && url !== "#") {
				el.href = url;
				el.target = "_blank";
				el.rel = "noopener noreferrer";
				el.onclick = null;
			} else {
				el.removeAttribute("href");
				el.onclick = (e) => {
					e.preventDefault();
					Toast.info(i18n.t("passengerSupport.toast.noPortalLink") || "Official portal link not available for this network.");
				};
			}
		};

		// 1. Legal & Safety Portal Links (Exact HTML IDs)
		setLink("btn-vigilance-url", portals.vigilance_portal);
		setLink("btn-cisf-guidelines", portals.contact_us || portals.official_website);
		setLink("btn-baggage-rules", portals.travel_advisory || portals.official_website);

		// 2. Commuter Amenities Links (Exact HTML IDs)
		setLink("btn-women-safety", portals.women_safety);
		setLink("btn-accessibility-guide", portals.differently_abled);
		setLink("btn-parking-tariffs", portals.parking_facilities);

		// 3. Render Dynamic Localized Strings
		this.#renderLanguageStrings();
	}

	#renderLanguageStrings() {
		if (!this.#supportData || !this.#supportData.networks) return;
		const net = this.#supportData.networks[this.#activeNetwork];
		if (!net) return;

		const helplines = net.helplines || {};
		const facilities = net.facilities || {};

		// 1. Hero Description with network name interpolation
		const heroDesc = document.getElementById("hero-desc-text");
		if (heroDesc) {
			const netName = net.network_name || (typeof this.#supportData.city_name === 'object' ? this.#supportData.city_name.en : this.#supportData.city_name) || "";
			heroDesc.textContent = i18n.t("passengerSupport.hero.desc", { network: netName });
		}

		// 2. Lost & Found Depot Subtitle
		const depotSub = document.getElementById("depot-subtitle");
		if (depotSub) {
			if (facilities.central_lost_found_office) {
				const hours = facilities.lost_found_operating_hours ? ` (${facilities.lost_found_operating_hours})` : "";
				const locationText = `${facilities.central_lost_found_office}${hours}`;
				depotSub.textContent = i18n.t("passengerSupport.cards.lostFound.subtitle", { depotLocation: locationText });
			} else {
				depotSub.textContent = i18n.t("passengerSupport.cards.lostFound.subtitle", { depotLocation: "Transit Central Depot" });
			}
		}

		// 3. Helplines & Click-to-Call
		// Main Operations Helpline
		const mainNum = helplines.customer_care || "155370";
		const labelMain = document.getElementById("label-helpline-main");
		const btnMain = document.getElementById("btn-call-main");
		if (labelMain) labelMain.textContent = `${i18n.t("passengerSupport.helplines.dmrc.title")}: ${mainNum}`;
		if (btnMain) btnMain.href = `tel:${mainNum.replace(/[^0-9+]/g, '')}`;

		// Security Helpline
		const secNum = helplines.security_cisf || helplines.police_emergency || "155655";
		const labelSec = document.getElementById("label-helpline-security");
		const btnSec = document.getElementById("btn-call-security");
		if (labelSec) labelSec.textContent = `${i18n.t("passengerSupport.helplines.cisf.title")}: ${secNum}`;
		if (btnSec) btnSec.href = `tel:${secNum.replace(/[^0-9+]/g, '')}`;

		// Women SOS Helpline
		const womenNum = helplines.women_safety || "1090";
		const labelWomen = document.getElementById("label-helpline-women");
		const btnWomen = document.getElementById("btn-call-women");
		if (labelWomen) labelWomen.textContent = `${i18n.t("passengerSupport.helplines.women.title")}: ${womenNum}`;
		if (btnWomen) btnWomen.href = `tel:${womenNum.replace(/[^0-9+]/g, '')}`;
	}
}