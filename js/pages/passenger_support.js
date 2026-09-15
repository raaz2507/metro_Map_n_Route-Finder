import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';
import i18n from "../core/i18n.js";


document.addEventListener("DOMContentLoaded", () => {
	const controller = new PassengerSupportController();
	controller.init();
});

class PassengerSupportController {
	#activeNetwork = "dmrc_delhi";
	#networkMeta = null;
	async init() {
		// 1. Initialize Universal Layout Header & Footer
		await HeaderComponent.render("passenger_support");
		FooterComponent.render();
		// 2. Resolve Active Network (From URL query or localStorage)
		const urlParams = new URLSearchParams(window.location.search);
		this.#activeNetwork = urlParams.get("network") || localStorage.getItem("active_network") || "dmrc_delhi";
		// 3. Bind Accordion Toggles
		this.#bindAccordion();
		// 4. Bind Floating Navigation & ScrollSpy
		this.#bindFloatingNav();
		// 5. Load and Apply Network-Specific Portals & Helplines
		await this.#loadNetworkData();
	}
	#bindAccordion() {
		document.querySelectorAll(".item-summary").forEach((item) => {
			item.addEventListener("click", () => {
				const parent = item.closest(".support-item");
				parent.classList.toggle("collapsed");
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
	async #loadNetworkData() {
		
		const current = NETWORK_DEFAULTS[this.#activeNetwork] || NETWORK_DEFAULTS.dmrc_delhi;
		// 1. Update Links
		const setLink = (id, url) => {
			const el = document.getElementById(id);
			if (el && url) el.href = url;
		};
		setLink("btn-vigilance-url", current.links.vigilance);
		setLink("btn-security-url", current.links.security);
		setLink("btn-lostfound-url", current.links.lostFound);
		setLink("btn-women-url", current.links.women);
		setLink("btn-divyang-url", current.links.divyang);
		setLink("btn-parking-url", current.links.parking);
		// 2. Update Depot Location text if available
		const depotSub = document.getElementById("depot-subtitle");
		if (depotSub && current.depot) {
			depotSub.textContent = `Central Depot: ${current.depot}`;
		}
		// 3. Render Dynamic Helplines
		const helplineContainer = document.getElementById("helplines-list-container");
		if (helplineContainer && current.helplines) {

		}
	}
}