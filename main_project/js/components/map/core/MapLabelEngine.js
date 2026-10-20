/**
 * 🏷️ MapLabelEngine.js - High-Performance Station Label Formatting & Word-Wrapping Utility
 * Responsible for intelligent station name wrapping, parenthesis separation, and text formatting.
 */

export class MapLabelEngine {
	/**
	 * Intelligent word wrapping for station labels (e.g. parenthesis separation)
	 * @param {string} str
	 * @returns {Array<string>}
	 */
	static getWrappedLines(str) {
		if (!str) return [str];
		const trimmed = str.trim();

		const parenMatch = trimmed.match(/^([^(]+)\s*(\(.*\))$/);
		if (parenMatch) {
			return [parenMatch[1].trim(), parenMatch[2].trim()];
		}

		const words = trimmed.split(/\s+/);
		if (trimmed.length <= 8 || words.length <= 1) {
			return [trimmed];
		}

		let line1 = "";
		let line2 = "";
		const targetLen = trimmed.length / 2;

		for (let i = 0; i < words.length; i++) {
			if ((line1 + words[i]).length <= targetLen + 2 || i === 0) {
				line1 += (line1 ? " " : "") + words[i];
			} else {
				line2 += (line2 ? " " : "") + words[i];
			}
		}
		return line2 ? [line1, line2] : [line1];
	}
}
