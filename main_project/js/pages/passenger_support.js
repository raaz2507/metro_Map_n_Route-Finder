import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';
import { appStateStore } from "../core/app-state-store.js";
import i18n from "../core/i18n.js";

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
		

		// 2. Resolve Active City & Network (From URL or localStorage)
		const urlParams = new URLSearchParams(window.location.search);
		this.#activeCity = urlParams.get("city") || localStorage.getItem("active_city") || "delhi_ncr";
		this.#activeNetwork = urlParams.get("network") || null;

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
		document.querySelectorAll(".item-summary").forEach((item) => {
			item.addEventListener("click", () => {
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
		try {
			const response = await fetch(`./data/${this.#activeCity}/passenger_support.json`);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			this.#supportData = await response.json();
			this.#populateCityData();
		} catch (error) {
			console.warn("[PassengerSupport] Failed to load city support data, falling back to Delhi NCR.", error);
			try {
				const fallback = await fetch(`./data/delhi_ncr/passenger_support.json`);
				this.#supportData = await fallback.json();
				this.#populateCityData();
			} catch (e) {
				console.error("[PassengerSupport] Total fallback failed:", e);
			}
		}
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

		// Helper to update external links safely (Zero inline style)
		const setLink = (id, url) => {
			const el = document.getElementById(id);
			if (!el) return;
			if (url && url !== "#") {
				el.href = url;
				el.hidden = false;
			} else {
				el.hidden = true;
			}
		};

		// 1. Legal & Portals Links
		setLink("btn-vigilance-url", portals.vigilance_portal);
		setLink("btn-security-url", portals.contact_us || portals.official_website);
		setLink("btn-lostfound-url", portals.lost_and_found);

		// 2. Amenities Links
		setLink("btn-women-url", portals.women_safety);
		setLink("btn-divyang-url", portals.differently_abled);
		setLink("btn-parking-url", portals.parking_facilities);

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