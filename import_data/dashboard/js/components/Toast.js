/**
 * @file Toast.js
 * @module components/Toast
 * @description Centralized Enterprise Toast Notification Component for Metro Audit Hub.
 * Hardened with defensive HTML entity sanitization to eliminate XSS risks.
 */
import { escapeHtml } from '../core/DomUtils.js';

export class ToastManager {
    static #getContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-stack-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Master toast display method
     * @param {string} message - Notification text (sanitized before DOM injection)
     * @param {'info'|'success'|'error'|'warning'} type - Visual styling type
     * @param {number} duration - Milliseconds before fading out
     */
    static show(message, type = 'info', duration = 3200) {
        const container = this.#getContainer();
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast-pill toast-${type}`;

        const dotMap = {
            error: 'rose',
            success: 'emerald',
            warning: 'amber',
            info: 'indigo'
        };
        const dotColor = dotMap[type] || 'indigo';
        const safeMessage = escapeHtml(message);

        toast.innerHTML = `
            <span class="status-indicator-dot dot-${dotColor}"></span>
            <span class="toast-message">${safeMessage}</span>
        `;

        container.appendChild(toast);

        // Auto fadeout & removal
        setTimeout(() => {
            toast.classList.add('toast-fadeout');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    // Direct Helper Shortcuts
    static success(msg, duration) { this.show(msg, 'success', duration); }
    static error(msg, duration) { this.show(msg, 'error', duration); }
    static warning(msg, duration) { this.show(msg, 'warning', duration); }
    static info(msg, duration) { this.show(msg, 'info', duration); }
}

export default ToastManager;