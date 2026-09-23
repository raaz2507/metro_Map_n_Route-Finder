/**
 * @file DomUtils.js
 * @module core/DomUtils
 * @description Enterprise DOM Selection & Defensive String Sanitization Utilities.
 */

/**
 * Maps a key-selector dictionary into a key-element object reference.
 * 
 * @param {Record<string, string>} selectorMap - Key to CSS selector mapping
 * @param {Document|HTMLElement} [root=document] - Root container for scoping
 * @returns {Record<string, HTMLElement|null>}
 */
export function getElements(selectorMap, root = document) {
    const elements = {};
    for (const [key, selector] of Object.entries(selectorMap)) {
        elements[key] = root.querySelector(selector);
    }
    return elements;
}

/**
 * Enterprise XSS Defensive Sanitizer: Converts HTML special characters into safe HTML entities.
 * Prevents script injection vectors when rendering dynamic data strings.
 * 
 * @param {any} str - Input value to sanitize
 * @returns {string} Sanitized string safe for DOM interpolation
 */
export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}