/**
 * 🔍 Universal Network Auditor
 * Validates transit_network.json schema, graph connectivity, and platform destination integrity.
 */

export class NetworkAuditor {
	/**
	 * Run comprehensive integrity audit on transit network data
	 * @param {Object} transitData - Content of transit_network.json
	 * @returns {Object} Report with errors and warnings
	 */
	static audit(transitData) {
		const errors = [];
		const warnings = [];

		if (!transitData) {
			return { isValid: false, errors: ["Data is null or undefined"], warnings: [] };
		}

		const stData = transitData.stationData || {};
		const lines = transitData.lines || {};
		const stKeys = new Set(Object.keys(stData));

		// 1. Audit Lines
		for (const [lineId, line] of Object.entries(lines)) {
			if (!line.stations || line.stations.length === 0) {
				errors.push(`Line "${lineId}" has no stations defined.`);
			}
			if (line.route?.from && !stKeys.has(line.route.from)) {
				warnings.push(`Line "${lineId}" route.from station "${line.route.from}" is not a valid station in stationData.`);
			}
			if (line.route?.to && !stKeys.has(line.route.to)) {
				warnings.push(`Line "${lineId}" route.to station "${line.route.to}" is not a valid station in stationData.`);
			}
		}

		// 2. Audit Stations & Platforms
		for (const [stId, st] of Object.entries(stData)) {
			if (!st.lines || st.lines.length === 0) {
				warnings.push(`Station "${stId}" has no lines associated.`);
			}

			// Validate neighbors
			if (Array.isArray(st.neighbors)) {
				for (const n of st.neighbors) {
					if (!stKeys.has(n.station)) {
						errors.push(`Station "${stId}" has neighbor "${n.station}" which does not exist in stationData.`);
					}
				}
			}

			// Validate platforms
			if (st.platforms) {
				for (const [pNo, p] of Object.entries(st.platforms)) {
					// Line validation
					if (p.line && !lines[p.line]) {
						errors.push(`Station "${stId}" platform ${pNo} references non-existent line "${p.line}".`);
					}
					// Destination validation
					if (p.destination && !stKeys.has(p.destination)) {
						warnings.push(
							`Station "${stId}" platform ${pNo} destination "${p.destination}" does not match any station ID in stationData.`
						);
					}
				}
			}
		}

		return {
			isValid: errors.length === 0,
			totalStations: stKeys.size,
			totalLines: Object.keys(lines).length,
			errors,
			warnings
		};
	}
}
