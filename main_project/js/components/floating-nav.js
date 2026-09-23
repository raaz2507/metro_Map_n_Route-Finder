/**
 * Floating Navigation Component with SVG cutout mask animation
 * Handles tab active switching and SVG mask cutout positioning.
 */
export class FloatingNav {
    #wrapper;
    #items;
    #cutoutPath;

    constructor(wrapperSelector = "#floating-nav-wrapper") {
        this.#wrapper = document.querySelector(wrapperSelector);
        this.#init();
    }

    #init() {
        if (!this.#wrapper) return;

        this.#items = this.#wrapper.querySelectorAll(".floating-nav-item");
        this.#cutoutPath = this.#wrapper.querySelector("#cutout-path");

        if (!this.#items.length) return;

        const self = this;
        function activeLink() {
            self.setActiveItem(this);
        }

        this.#items.forEach((item) => item.addEventListener("click", activeLink));

        // Align the mask cutout on load based on default active item
        const activeItem = this.#wrapper.querySelector(".floating-nav-item.active");
        if (activeItem) {
            this.setActiveItem(activeItem);
        }
    }

    /**
     * Active item set karein aur SVG mask cutout path ko translate karein
     * @param {HTMLElement} element 
     */
    setActiveItem(element) {
        if (!element) return;

        this.#items.forEach((item) => item.classList.remove("active"));
        element.classList.add("active");

        const offsetLeft = element.offsetLeft;
        const width = element.offsetWidth;
        const centerX = offsetLeft + width / 2;

        if (this.#cutoutPath) {
            this.#cutoutPath.style.transform = `translate(${centerX}px, 0px)`;
        }
    }
}