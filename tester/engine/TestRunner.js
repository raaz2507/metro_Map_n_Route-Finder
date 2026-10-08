/**
 * 🧪 Universal Test Runner Engine for Metro Route & Platform Testing
 * Provides ANSI colored output, granular assertion breakdown, and timing analytics.
 */

export class TestRunner {
	#stats = {
		total: 0,
		passed: 0,
		failed: 0,
		startTime: 0,
		endTime: 0
	};

	#colors = {
		reset: "\x1b[0m",
		bright: "\x1b[1m",
		dim: "\x1b[2m",
		red: "\x1b[31m",
		green: "\x1b[32m",
		yellow: "\x1b[33m",
		blue: "\x1b[34m",
		magenta: "\x1b[35m",
		cyan: "\x1b[36m",
		gray: "\x1b[90m"
	};

	start() {
		this.#stats = { total: 0, passed: 0, failed: 0, startTime: Date.now(), endTime: 0 };
	}

	header(title) {
		const c = this.#colors;
		console.log(`\n${c.cyan}${c.bright}══════════════════════════════════════════════════════════════════${c.reset}`);
		console.log(`  ${c.bright}🚇 ${title.toUpperCase()}${c.reset}`);
		console.log(`${c.cyan}${c.bright}══════════════════════════════════════════════════════════════════${c.reset}\n`);
	}

	section(name) {
		const c = this.#colors;
		console.log(`\n${c.yellow}${c.bright}▶ ${name}${c.reset}`);
		console.log(`${c.gray}──────────────────────────────────────────────────────────────────${c.reset}`);
	}

	/**
	 * Run an individual test case
	 * @param {Object} testCase 
	 * @param {Object} routeResult - Actual output from RouteFinder.findRoute()
	 */
	assertRoute(testCase, routeResult) {
		this.#stats.total++;
		const c = this.#colors;
		const failures = [];

		if (!routeResult || !routeResult.path || routeResult.path.length === 0) {
			this.#stats.failed++;
			console.log(`  ${c.red}✖ [FAIL]${c.reset} ${c.bright}${testCase.id || "Route"}:${c.reset} ${testCase.desc}`);
			console.log(`    ${c.red}→ Error: No route found between "${testCase.from}" and "${testCase.to}"!${c.reset}`);
			return false;
		}

		// 1. Verify Path Endpoints
		const actualSource = routeResult.source?.id;
		const actualDest = routeResult.destination?.id;
		if (actualSource !== testCase.from) {
			failures.push(`Source station mismatch: expected "${testCase.from}", got "${actualSource}"`);
		}
		if (actualDest !== testCase.to) {
			failures.push(`Destination station mismatch: expected "${testCase.to}", got "${actualDest}"`);
		}

		// 2. Verify Expected Steps / Interchanges count
		if (testCase.expectedInterchanges !== undefined) {
			const actualInterchanges = routeResult.interchangesCount ?? (routeResult.steps.length - 1);
			if (actualInterchanges !== testCase.expectedInterchanges) {
				failures.push(`Interchanges count mismatch: expected ${testCase.expectedInterchanges}, got ${actualInterchanges}`);
			}
		}

		// 3. Verify Specific Expected Platforms & Transfers
		if (Array.isArray(testCase.expectedPlatforms)) {
			for (const exp of testCase.expectedPlatforms) {
				// Find matching step in routeResult
				let matchedStep = null;
				if (exp.atStation) {
					matchedStep = routeResult.steps.find(s => s.fromStation === exp.atStation && (!exp.line || s.line === exp.line));
				} else if (exp.stepIndex !== undefined) {
					matchedStep = routeResult.steps[exp.stepIndex];
				}

				if (!matchedStep) {
					failures.push(`Station/Step not found in route steps: atStation="${exp.atStation || 'step[' + exp.stepIndex + ']'}"`);
					continue;
				}

				// Check Platform Number
				const actualPlat = String(matchedStep.platformNo || "").trim();
				const expectedPlat = String(exp.platform || "").trim();
				if (expectedPlat && actualPlat !== expectedPlat) {
					failures.push(
						`Platform mismatch at "${matchedStep.fromStation}" (${matchedStep.line}): expected Platform ${expectedPlat}, but got Platform ${actualPlat}`
					);
				}

				// Check Terminal Station (direction) if specified
				if (exp.terminal) {
					const actualTerm = String(matchedStep.terminalStationId || "").trim();
					const expTerm = String(exp.terminal || "").trim();
					if (actualTerm !== expTerm && !actualTerm.includes(expTerm)) {
						failures.push(
							`Terminal direction mismatch at "${matchedStep.fromStation}": expected towards "${expTerm}", but got "${actualTerm}"`
						);
					}
				}
			}
		}

		// 4. Verify Fare Calculation (Official Benchmark & Zero-Fare Invariant)
		if (testCase.expectedFare !== undefined || routeResult.calculatedFare !== undefined) {
			const actualFare = Number(routeResult.calculatedFare?.totalFare ?? routeResult.fare ?? 0);
			const currency = routeResult.calculatedFare?.currency || "INR";

			// Invariant Check: Different origin & dest can never be ₹0
			if (testCase.from !== testCase.to && actualFare <= 0) {
				failures.push(`Fare Invariant Violation: Calculated fare is ₹0 or negative (${actualFare})! Missing farePolicy or faulty slab.`);
			}

			// Expected Benchmark Check
			if (testCase.expectedFare !== undefined) {
				const expected = Number(testCase.expectedFare);
				if (actualFare !== expected) {
					failures.push(
						`Fare mismatch: expected official fare ₹${expected}, but engine calculated ₹${actualFare} ${currency}`
					);
				}
			}
		}

		// Output result
		const routeTitle = `${testCase.from} ➔ ${testCase.to}`;
		if (failures.length === 0) {
			this.#stats.passed++;
			const stepsStr = routeResult.steps.map(s => `${s.fromStation} [Plat ${s.platformNo}]`).join(" ➔ ");
			const fareStr = routeResult.calculatedFare ? ` | Fare: ₹${routeResult.calculatedFare.totalFare}` : "";
			console.log(`  ${c.green}✔ [PASS]${c.reset} ${c.bright}${testCase.id || "Route"}:${c.reset} ${testCase.desc}${c.green}${fareStr}${c.reset}`);
			console.log(`    ${c.gray}Steps: ${stepsStr} ➔ ${testCase.to}${c.reset}`);
			if (testCase.sourceVerification?.officialUrl) {
				console.log(`    ${c.dim}Source: ${testCase.sourceVerification.officialUrl} (${testCase.sourceVerification.notificationRef || "Official Notice"})${c.reset}`);
			}
			return true;
		} else {
			this.#stats.failed++;
			console.log(`  ${c.red}✖ [FAIL]${c.reset} ${c.bright}${testCase.id || "Route"}:${c.reset} ${testCase.desc}`);
			for (const f of failures) {
				console.log(`    ${c.red}→ ${f}${c.reset}`);
			}
			if (testCase.sourceVerification?.officialUrl) {
				console.log(`    ${c.yellow}Official Source Benchmark: ${testCase.sourceVerification.officialUrl}${c.reset}`);
			}
			console.log(`    ${c.dim}Actual Steps:${c.reset}`);
			routeResult.steps.forEach((s, idx) => {
				console.log(`      [Step ${idx + 1}] ${s.line} from ${s.fromStation} (Plat ${s.platformNo}) to ${s.toStation} | Towards: ${s.terminalStationId}`);
			});
			return false;
		}
	}

	summary() {
		this.#stats.endTime = Date.now();
		const elapsedMs = this.#stats.endTime - this.#stats.startTime;
		const { total, passed, failed } = this.#stats;
		const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
		const c = this.#colors;

		console.log(`\n${c.cyan}${c.bright}══════════════════════════════════════════════════════════════════${c.reset}`);
		console.log(`  ${c.bright}📊 TEST EXECUTION SUMMARY${c.reset}`);
		console.log(`${c.cyan}${c.bright}══════════════════════════════════════════════════════════════════${c.reset}`);
		console.log(`  Total Tests : ${total}`);
		console.log(`  Passed      : ${c.green}${c.bright}${passed}${c.reset}`);
		console.log(`  Failed      : ${failed > 0 ? c.red + c.bright + failed : c.gray + "0"}${c.reset}`);
		console.log(`  Success Rate: ${passRate === "100.0" ? c.green : c.yellow}${c.bright}${passRate}%${c.reset}`);
		console.log(`  Duration    : ${elapsedMs}ms`);
		console.log(`${c.cyan}${c.bright}══════════════════════════════════════════════════════════════════${c.reset}\n`);

		return { total, passed, failed, passRate: Number(passRate), elapsedMs };
	}
}
