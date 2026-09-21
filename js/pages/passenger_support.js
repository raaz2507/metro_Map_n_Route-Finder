import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';
import i18n from "../core/i18n.js";

document.addEventListener("DOMContentLoaded", () => {
	const controller = new PassengerSupportController();
	controller.init();
});

class PassengerSupportController {
	#activeCity = "delhi_ncr";
	#activeNetwork = null;
	#supportData = null;

	async init() {
		// 1. Initialize Universal Layout Header & Footer
		await HeaderComponent.render("passenger_support");
		FooterComponent.render();

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
		const tabPanels = document.querySelectorAll(".tab-panel");
		tabBtns.forEach((btn) => {
			btn.addEventListener("click", () => {
				tabBtns.forEach((b) => b.classList.remove("active"));
				btn.classList.add("active");
				const targetTab = btn.getAttribute("data-tab");
				const targetPanel = document.getElementById(targetTab);
				if (targetPanel) {
					const offset = targetPanel.getBoundingClientRect().top + window.scrollY - 80;
					window.scrollTo({ top: offset, behavior: "smooth" });
				}
			});
		});

		// ScrollSpy to highlight active tab
		window.addEventListener("scroll", () => {
			const scrollPosition = window.scrollY + 120;
			tabPanels.forEach((panel) => {
				const top = panel.offsetTop;
				const height = panel.offsetHeight;
				const id = panel.getAttribute("id");
				if (scrollPosition >= top && scrollPosition < top + height) {
					tabBtns.forEach((btn) => {
						btn.classList.toggle("active", btn.getAttribute("data-tab") === id);
					});
				}
			});
		});
	}

	async #loadSupportData() {
		const dataPath = `data/cities/${this.#activeCity}/passenger_support.json`;
		try {
			const res = await fetch(dataPath);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			this.#supportData = await res.json();
		} catch (err) {
			console.warn(`[PassengerSupport] Support data not found for "${this.#activeCity}". Using universal transit assistance.`);
			this.#renderUniversalFallback();
			return;
		}

		if (!this.#supportData || !this.#supportData.networks) {
			this.#renderUniversalFallback();
			return;
		}

		const networks = this.#supportData.networks;
		// Filter networks that have actual helpline or portal data
		const validNetworkKeys = Object.keys(networks).filter(k => {
			const net = networks[k];
			const hasHelplines = net.helplines && Object.keys(net.helplines).length > 0;
			const hasPortals = net.portals && Object.keys(net.portals).length > 0;
			return hasHelplines || hasPortals;
		});

		if (validNetworkKeys.length === 0) {
			this.#renderUniversalFallback();
			return;
		}

		if (!this.#activeNetwork || !networks[this.#activeNetwork]) {
			this.#activeNetwork = validNetworkKeys[0];
		}

		// 1. Render Network Switcher if city has multiple operators (e.g. DMRC, NMRC, RRTS)
		this.#renderNetworkSwitcher(validNetworkKeys, networks);

		// 2. Render Active Operator Details
		this.#renderActiveNetwork(networks[this.#activeNetwork]);
	}

	#renderUniversalFallback() {
		const container = document.getElementById("network-selector-container");
		if (container) {
			container.style.display = "none";
			container.classList.add("hidden");
		}

		const heroDesc = document.getElementById("hero-desc-text");
		if (heroDesc) {
			heroDesc.textContent = "Direct access to official transit authorities, safety guidelines, and 24x7 emergency assistance.";
		}

		const depotSub = document.getElementById("depot-subtitle");
		if (depotSub) {
			depotSub.textContent = "Central Transit Depot Inventory";
		}

		const setUniversalCall = (labelId, btnId, labelText, num) => {
			const label = document.getElementById(labelId);
			const btn = document.getElementById(btnId);
			if (label) label.textContent = `${labelText}: ${num}`;
			if (btn) btn.href = `tel:${num}`;
		};

		setUniversalCall("label-helpline-main", "btn-call-main", "Emergency Dispatch", "112");
		setUniversalCall("label-helpline-security", "btn-call-security", "Security Control", "112");
		setUniversalCall("label-helpline-women", "btn-call-women", "Women SOS Helpline", "112");

		// Hide operator portal buttons if no official portals are registered
		const portalBtnIds = [
			"btn-vigilance-url",
			"btn-security-url",
			"btn-lostfound-url",
			"btn-women-url",
			"btn-divyang-url",
			"btn-parking-url"
		];
		portalBtnIds.forEach(id => {
			const btn = document.getElementById(id);
			if (btn) btn.style.display = "none";
		});
	}

	#renderNetworkSwitcher(keys, networks) {
		const container = document.getElementById("network-selector-container");
		if (!container) return;

		if (keys.length <= 1) {
			container.style.display = "none";
			container.classList.add("hidden");
			return;
		}

		container.style.display = "flex";
		container.classList.remove("hidden");
		container.innerHTML = "";

		keys.forEach((netKey) => {
			const net = networks[netKey];
			const btn = document.createElement("button");
			btn.className = `network-pill-btn ${netKey === this.#activeNetwork ? "active" : ""}`;
			btn.type = "button";
			btn.textContent = net.network_name || netKey.toUpperCase();
			btn.addEventListener("click", () => {
				this.#activeNetwork = netKey;
				container.querySelectorAll(".network-pill-btn").forEach(b => b.classList.remove("active"));
				btn.classList.add("active");
				this.#renderActiveNetwork(networks[netKey]);
			});
			container.appendChild(btn);
		});
	}

	#renderActiveNetwork(net) {
		if (!net) return;

		const portals = net.portals || {};
		const helplines = net.helplines || {};
		const facilities = net.facilities || {};

		// Update Hero Description
		const heroDesc = document.getElementById("hero-desc-text");
		if (heroDesc) {
			const netName = net.network_name || (typeof this.#supportData.city_name === 'object' ? this.#supportData.city_name.en : this.#supportData.city_name) || "";
			heroDesc.textContent = `Direct access to verified official authorities, safety guidelines, passenger amenities, and 24x7 emergency assistance for ${netName}.`;
		}

		// Helper to update external links safely
		const setLink = (id, url) => {
			const el = document.getElementById(id);
			if (!el) return;
			if (url && url !== "#") {
				el.href = url;
				el.style.display = "inline-flex";
			} else {
				el.style.display = "none";
			}
		};

		// 1. Legal & Portals
		setLink("btn-vigilance-url", portals.vigilance_portal);
		setLink("btn-security-url", portals.contact_us || portals.official_website);
		setLink("btn-lostfound-url", portals.lost_and_found);

		// 2. Amenities
		setLink("btn-women-url", portals.women_safety);
		setLink("btn-divyang-url", portals.differently_abled);
		setLink("btn-parking-url", portals.parking_facilities);

		// 3. Central Lost & Found Depot Subtitle
		const depotSub = document.getElementById("depot-subtitle");
		if (depotSub) {
			if (facilities.central_lost_found_office) {
				const hours = facilities.lost_found_operating_hours ? ` (${facilities.lost_found_operating_hours})` : "";
				depotSub.textContent = `Depot: ${facilities.central_lost_found_office}${hours}`;
			} else {
				depotSub.textContent = "Central Transit Depot Inventory";
			}
		}

		// 4. Helplines & Click-to-Call
		// Main Operations Helpline
		const mainNum = helplines.customer_care || "112";
		const labelMain = document.getElementById("label-helpline-main");
		const btnMain = document.getElementById("btn-call-main");
		if (labelMain) labelMain.textContent = `Customer Care: ${mainNum}`;
		if (btnMain) btnMain.href = `tel:${mainNum.replace(/[^0-9+]/g, '')}`;

		// Security Helpline
		const secNum = helplines.security_cisf || helplines.police_emergency || "112";
		const labelSec = document.getElementById("label-helpline-security");
		const btnSec = document.getElementById("btn-call-security");
		if (labelSec) labelSec.textContent = `Security Control: ${secNum}`;
		if (btnSec) btnSec.href = `tel:${secNum.replace(/[^0-9+]/g, '')}`;

		// Women SOS Helpline
		const womenNum = helplines.women_safety || "1090";
		const labelWomen = document.getElementById("label-helpline-women");
		const btnWomen = document.getElementById("btn-call-women");
		if (labelWomen) labelWomen.textContent = `Women Commuter SOS: ${womenNum}`;
		if (btnWomen) btnWomen.href = `tel:${womenNum.replace(/[^0-9+]/g, '')}`;
	}
}