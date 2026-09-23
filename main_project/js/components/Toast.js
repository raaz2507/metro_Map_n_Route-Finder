/**
 * 🍞 Toast - Enterprise ES2022 Private OOP Singleton Component
 * Non-blocking, accessible, auto-dismissing toast notification engine.
 */
import { eventBus } from "../core/event-bus.js";

class ToastManager {
    // Private State Fields
    #container = null;
    #toasts = new Map();
    #maxToasts = 4;
    #defaultDuration = 4000; // 4 seconds

    constructor() {
        this.#ensureContainer();
        this.#bindEventBus();
    }

    /**
     * DOM में सिंगल टोस्ट कंटेनर की उपस्थिति सुनिश्चित करता है
     */
    #ensureContainer() {
        if (!this.#container) {
            let container = document.getElementById("app-toast-container");
            if (!container) {
                container = document.createElement("div");
                container.id = "app-toast-container";
                container.className = "toast-container";
                container.setAttribute("aria-live", "polite");
                container.setAttribute("role", "status");
                document.body.appendChild(container);
            }
            this.#container = container;
        }
    }

    /**
     * EventBus से आने वाले ग्लोबल टोस्ट इवेंट्स को बाइंड करता है
     */
    #bindEventBus() {
        eventBus.on("SHOW_TOAST", (payload) => {
            if (!payload) return;
            if (typeof payload === "string") {
                this.show(payload);
            } else {
                this.show(payload.message, payload);
            }
        });
    }

    /**
     * मुख्य शो मेथड
     * @param {string} message - दिखाने वाला टेक्स्ट
     * @param {Object} [options={}] - सेटिंग्स (type, title, duration, actionText, onAction)
     * @returns {string} Toast ID
     */
    show(message, options = {}) {
        this.#ensureContainer();
        if (!message) return null;

        const type = options.type || "info"; // "success" | "error" | "warning" | "info"
        const title = options.title || "";
        const duration = typeof options.duration === "number" ? options.duration : this.#defaultDuration;
        const toastId = "toast_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

        // यदि अधिकतम सीमा से अधिक टोस्ट हैं, तो सबसे पुराने को हटाएं
        if (this.#toasts.size >= this.#maxToasts) {
            const oldestId = this.#toasts.keys().next().value;
            this.dismiss(oldestId);
        }

        // DOM एलिमेंट का निर्माण
        const toastEl = this.#createToastElement(toastId, message, title, type, duration, options);
        this.#container.appendChild(toastEl);

        // स्मूथ एंट्री एनिमेशन (Next Frame)
        requestAnimationFrame(() => {
            toastEl.classList.add("toast-visible");
        });

        // ऑटो-डिस्मिस टाइमर
        let timer = null;
        if (duration > 0) {
            timer = setTimeout(() => {
                this.dismiss(toastId);
            }, duration);
        }

        this.#toasts.set(toastId, { element: toastEl, timer });
        return toastId;
    }

    /**
     * हेल्पर शॉर्टकट मेथड्स
     */
    success(message, options = {}) {
        return this.show(message, { ...options, type: "success" });
    }

    error(message, options = {}) {
        return this.show(message, { ...options, type: "error" });
    }

    warning(message, options = {}) {
        return this.show(message, { ...options, type: "warning" });
    }

    info(message, options = {}) {
        return this.show(message, { ...options, type: "info" });
    }

    /**
     * टोस्ट को स्क्रीन से हटाना (Dismiss)
     */
    dismiss(toastId) {
        const toast = this.#toasts.get(toastId);
        if (!toast) return;

        if (toast.timer) {
            clearTimeout(toast.timer);
        }

        const el = toast.element;
        el.classList.remove("toast-visible");
        el.classList.add("toast-hiding");

        // एनिमेशन समाप्त होने पर DOM से रिमूव करें
        setTimeout(() => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
            this.#toasts.delete(toastId);
        }, 300);
    }

    /**
     * टोस्ट DOM एलिमेंट तैयार करना
     */
    #createToastElement(id, message, title, type, duration, options) {
        const item = document.createElement("div");
        item.className = `toast-item toast-${type}`;
        item.id = id;
        item.setAttribute("tabindex", "0");

        // 1. आइकॉन सिंबल
        const iconSymbols = {
            success: "✓",
            error: "✕",
            warning: "!",
            info: "ℹ"
        };
        const icon = document.createElement("span");
        icon.className = "toast-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = iconSymbols[type] || "ℹ";

        // 2. कंटेंट
        const content = document.createElement("div");
        content.className = "toast-content";

        if (title) {
            const titleEl = document.createElement("div");
            titleEl.className = "toast-title";
            titleEl.textContent = title;
            content.appendChild(titleEl);
        }

        const messageEl = document.createElement("div");
        messageEl.className = "toast-message";
        messageEl.textContent = message;
        content.appendChild(messageEl);

        // ऑप्शनल एक्शन बटन
        if (options.actionText && typeof options.onAction === "function") {
            const actionBtn = document.createElement("button");
            actionBtn.type = "button";
            actionBtn.className = "toast-action-btn";
            actionBtn.textContent = options.actionText;
            actionBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                try {
                    options.onAction();
                } catch (err) {
                    console.error("[Toast] Action execution error:", err);
                }
                this.dismiss(id);
            });
            content.appendChild(actionBtn);
        }

        // 3. क्लोज बटन
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "toast-close-btn";
        closeBtn.setAttribute("aria-label", "Close notification");
        closeBtn.innerHTML = "&times;";
        closeBtn.addEventListener("click", () => this.dismiss(id));

        // असेंबल करें
        item.appendChild(icon);
        item.appendChild(content);
        item.appendChild(closeBtn);

        // 4. ऑटो-प्रोग्रेस बार
        if (duration > 0) {
            const progress = document.createElement("div");
            progress.className = "toast-progress";
            progress.style.animationDuration = `${duration}ms`;
            item.appendChild(progress);
        }

        // Escape Key सपोर्ट
        item.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.dismiss(id);
            }
        });

        return item;
    }
}

export const Toast = new ToastManager();