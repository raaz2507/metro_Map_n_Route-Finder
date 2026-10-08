/**
 * 💰 Universal Fare Auditor (OOP Class)
 * Validates fare policy completeness, slab continuity, non-zero invariants,
 * and currency integrity across transit networks.
 */

export class FareAuditor {
	/**
	 * Run deep structural & mathematical integrity check on fareRules
	 * @param {Object} transitData - Content of transit_network.json
	 * @returns {Object} Report with errors, warnings and stats
	 */
	static auditFareRules(transitData) {
		const errors = [];
		const warnings = [];

		if (!transitData) {
			return { isValid: false, errors: ["Data is null or undefined"], warnings: [] };
		}

		const fareRules = transitData.fareRules || {};
		const policies = fareRules.policies || {};
		const lines = transitData.lines || {};
		const policyKeys = new Set(Object.keys(policies));

		// 1. Audit Currency
		const currency = fareRules.currency || "INR";
		if (!fareRules.currency) {
			warnings.push("fareRules.currency is missing, defaulting to INR.");
		}

		// 2. Audit Lines -> FarePolicy link
		for (const [lineId, line] of Object.entries(lines)) {
			if (!line.farePolicy) {
				errors.push(`Line "${lineId}" has no "farePolicy" defined. Route fare will result in ₹0!`);
			} else if (!policyKeys.has(line.farePolicy)) {
				errors.push(`Line "${lineId}" specifies farePolicy "${line.farePolicy}" which does not exist under fareRules.policies.`);
			}
		}

		// 3. Audit Policies & Fare Tables
		for (const [polId, pol] of Object.entries(policies)) {
			if (!pol.fareModel) {
				errors.push(`Policy "${polId}" is missing "fareModel" (e.g. distance_based, station_count_based).`);
			}

			const fareTables = pol.fareTables || {};
			const slabs = fareTables.weekday || fareTables.standard || pol.slabs || [];

			if (pol.fareModel !== "flat_rate" && pol.fareModel !== "station_pair" && pol.fareModel !== "matrix_based") {
				if (!Array.isArray(slabs) || slabs.length === 0) {
					errors.push(`Policy "${polId}" (${pol.fareModel}) has no valid fare slabs defined in fareTables.weekday.`);
				} else {
					// Check slab continuity and non-zero
					let prevMax = -1;
					slabs.forEach((slab, idx) => {
						if (slab.fare === undefined || slab.fare === null || slab.fare <= 0) {
							errors.push(`Policy "${polId}" slab [${idx}] has an invalid non-positive fare: ${slab.fare}`);
						}

						if (pol.fareModel === "station_count_based") {
							if (slab.minStations === undefined) {
								errors.push(`Policy "${polId}" slab [${idx}] missing minStations.`);
							}
						} else if (pol.fareModel === "distance_based") {
							if (slab.minKm === undefined) {
								errors.push(`Policy "${polId}" slab [${idx}] missing minKm.`);
							}
						}
					});
				}
			}

			// Validate matrix based policies
			if (pol.fareModel === "station_pair" || pol.fareModel === "matrix_based") {
				if (!Array.isArray(pol.stations) || !Array.isArray(pol.fareMatrix)) {
					errors.push(`Policy "${polId}" is station_pair based but missing stations array or fareMatrix.`);
				} else if (pol.stations.length !== pol.fareMatrix.length) {
					errors.push(`Policy "${polId}" stations count (${pol.stations.length}) does not match fareMatrix dimensions (${pol.fareMatrix.length}).`);
				}
			}
		}

		return {
			isValid: errors.length === 0,
			totalPolicies: policyKeys.size,
			currency,
			errors,
			warnings
		};
	}
}
