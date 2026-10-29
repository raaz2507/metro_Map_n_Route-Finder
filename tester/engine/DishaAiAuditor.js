/**
 * 🧠 DishaAiAuditor - Comprehensive Test & Audit Suite for Disha AI
 * Tests:
 * 1. Intent Precision & Recall (Multilingual / Multi-Script)
 * 2. Slot & Entity Extraction (Directional, Typo, Ambiguity, Outside Localities)
 * 3. Multi-Turn Context & Slot Fulfillment
 * 4. Multi-Network Portability (Delhi, Mumbai, Bengaluru)
 * 5. Storage Integrity & LRU/Pin Constraints
 * 6. Latency Benchmark (<60ms SLA)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { centerClass } from "../../main_project/js/core/CenterClass.js";
import { StationSearchEngine } from "../../main_project/js/services/search/StationSearchEngine.js";
import { TextNormalizer } from "../../main_project/js/services/ai/nlu/TextNormalizer.js";
import { IntentClassifier } from "../../main_project/js/services/ai/nlu/IntentClassifier.js";
import { StationEntityResolver } from "../../main_project/js/services/ai/nlu/StationEntityResolver.js";
import { DishaAiEngine } from "../../main_project/js/services/ai/DishaAiEngine.js";
import { DishaAiChatStorage } from "../../main_project/js/services/ai/DishaAiChatStorage.js";
import { TransitNetworkHelper } from "../../main_project/js/services/ai/TransitNetworkHelper.js";
import i18n from "../../main_project/js/core/i18n.js";
import en from "../../main_project/lang/en.js";
import hi from "../../main_project/lang/hi.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DishaAiAuditor {
	#stats = { total: 0, passed: 0, failed: 0 };
	#colors = {
		reset: "\x1b[0m",
		bright: "\x1b[1m",
		dim: "\x1b[2m",
		red: "\x1b[31m",
		green: "\x1b[32m",
		yellow: "\x1b[33m",
		blue: "\x1b[34m",
		cyan: "\x1b[36m",
		gray: "\x1b[90m"
	};

	constructor() {
		this.#initMockEnvironment();
	}

	#initMockEnvironment() {
		// Mock browser globals for Node.js test environment
		if (typeof global.document === "undefined") {
			global.document = {
				documentElement: { lang: "en", dir: "ltr" },
				querySelectorAll: () => [],
				querySelector: () => null
			};
		}
		if (typeof global.window === "undefined") {
			global.window = global;
		}
		if (typeof global.localStorage === "undefined") {
			const store = new Map();
			global.localStorage = {
				getItem: (k) => store.get(k) || null,
				setItem: (k, v) => store.set(k, String(v)),
				removeItem: (k) => store.delete(k),
				clear: () => store.clear()
			};
		}

		// Register core dictionaries
		i18n.registerLanguage("en", en);
		i18n.registerLanguage("hi", hi);
	}

	/**
	 * Load network dataset into CenterClass for testing
	 */
	loadNetwork(cityKey = "delhi_ncr") {
		const filePath = path.resolve(__dirname, `../../main_project/data/india/cities/${cityKey}/transit_network.json`);
		if (!fs.existsSync(filePath)) {
			throw new Error(`Data file not found for network: ${cityKey}`);
		}
		const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));

		const enPath = path.resolve(__dirname, `../../main_project/locales/en/india/${cityKey}_station_details_locale.json`);
		const hiPath = path.resolve(__dirname, `../../main_project/locales/hi/india/${cityKey}_station_details_locale.json`);
		const enLocale = fs.existsSync(enPath) ? JSON.parse(fs.readFileSync(enPath, "utf8")) : {};
		const hiLocale = fs.existsSync(hiPath) ? JSON.parse(fs.readFileSync(hiPath, "utf8")) : {};

		centerClass.getMetroData = () => raw;
		centerClass.getStationDetails = (id) => raw.stationData?.[id] || null;

		centerClass.getStationName = (id, lang = "en") => {
			const normId = String(id).toLowerCase();
			if (lang === "hi") {
				const hiName = hiLocale.stations?.[id]?.name || hiLocale.stations?.[normId]?.name;
				if (hiName) return hiName;
			}
			const enName = enLocale.stations?.[id]?.name || enLocale.stations?.[normId]?.name;
			if (enName) return enName;
			const st = raw.stationData?.[id];
			if (!st) return id;
			return (typeof st.name === "object" ? st.name[lang] || st.name.en : st.name) || id;
		};

		centerClass.getAllStationNames = (id) => {
			const normId = String(id).toLowerCase();
			const names = new Set();
			const enName = enLocale.stations?.[id]?.name || enLocale.stations?.[normId]?.name;
			if (enName) names.add(enName);
			const hiName = hiLocale.stations?.[id]?.name || hiLocale.stations?.[normId]?.name;
			if (hiName) names.add(hiName);
			const st = raw.stationData?.[id];
			if (st?.name) {
				if (typeof st.name === "string") names.add(st.name);
				else if (typeof st.name === "object") Object.values(st.name).forEach(n => { if (n) names.add(n); });
			}
			return Array.from(names);
		};

		centerClass.getStationAliases = (id) => {
			const normId = String(id).toLowerCase();
			const aliases = new Set();
			const enA = enLocale.stations?.[id]?.aliases || enLocale.stations?.[normId]?.aliases;
			if (Array.isArray(enA)) enA.forEach(a => aliases.add(a));
			const hiA = hiLocale.stations?.[id]?.aliases || hiLocale.stations?.[normId]?.aliases;
			if (Array.isArray(hiA)) hiA.forEach(a => aliases.add(a));
			const st = raw.stationData?.[id];
			if (Array.isArray(st?.aliases)) st.aliases.forEach(a => aliases.add(a));
			return Array.from(aliases);
		};

		const searchEngine = new StationSearchEngine(raw);
		centerClass.getStationSearchEngine = () => searchEngine;

		centerClass.searchRoute = (src, dst, opt = {}) => {
			if (!raw.stationData?.[src] || !raw.stationData?.[dst]) return null;
			return {
				source: { id: src, name: centerClass.getStationName(src, opt.lang || "en") },
				destination: { id: dst, name: centerClass.getStationName(dst, opt.lang || "en") },
				path: [src, dst],
				totalStations: 6,
				interchanges: 1,
				travelTimeMinutes: 22,
				fare: { normal: 40, smartCard: 36 },
				linesUsed: [{ name: "Line 1", color: "#007acc" }]
			};
		};
		return raw;
	}

	/**
	 * 1. Intent Classification Audit
	 */
	auditIntents(testCases) {
		const c = this.#colors;
		console.log(`\n${c.yellow}${c.bright}▶ 1. INTENT CLASSIFICATION AUDIT (${testCases.length} Cases)${c.reset}`);
		console.log(`${c.gray}──────────────────────────────────────────────────────────────────${c.reset}`);

		let passed = 0;
		for (const tc of testCases) {
			this.#stats.total++;
			const normData = TextNormalizer.normalize(tc.text);
			const entities = StationEntityResolver.resolve(normData, tc.lang);
			const { intent, confidence } = IntentClassifier.classify(normData, entities, null, tc.lang);

			if (intent === tc.expectedIntent) {
				passed++;
				this.#stats.passed++;
				console.log(`  ${c.green}✔ [PASS]${c.reset} ${c.bright}${tc.id}:${c.reset} "${tc.text}" ➔ ${c.cyan}${intent}${c.reset} (${confidence * 100}%)`);
			} else {
				this.#stats.failed++;
				console.log(`  ${c.red}✖ [FAIL]${c.reset} ${c.bright}${tc.id}:${c.reset} "${tc.text}"`);
				console.log(`    ${c.red}→ Expected: ${tc.expectedIntent} | Got: ${intent} (${confidence * 100}%)${c.reset}`);
			}
		}
		return passed;
	}

	/**
	 * 2. Station Entity & Slot Extraction Audit
	 */
	auditEntities(testCases) {
		const c = this.#colors;
		console.log(`\n${c.yellow}${c.bright}▶ 2. STATION ENTITY & SLOT EXTRACTION AUDIT (${testCases.length} Cases)${c.reset}`);
		console.log(`${c.gray}──────────────────────────────────────────────────────────────────${c.reset}`);

		let passed = 0;
		for (const tc of testCases) {
			this.#stats.total++;
			const normData = TextNormalizer.normalize(tc.text);
			const resolved = StationEntityResolver.resolve(normData, tc.lang);

			const actualSourceId = resolved.source?.id || null;
			const actualDestId = resolved.destination?.id || null;
			const isAmbiguous = Boolean(resolved.isAmbiguous);
			const unverified = resolved.unverifiedLocality || null;

			let ok = true;
			const errors = [];

			if (tc.expectedSource !== undefined && actualSourceId !== tc.expectedSource) {
				ok = false;
				errors.push(`Source mismatch: expected "${tc.expectedSource}", got "${actualSourceId}"`);
			}
			if (tc.expectedDest !== undefined && actualDestId !== tc.expectedDest) {
				ok = false;
				errors.push(`Destination mismatch: expected "${tc.expectedDest}", got "${actualDestId}"`);
			}
			if (tc.expectedAmbiguous !== undefined && isAmbiguous !== tc.expectedAmbiguous) {
				ok = false;
				errors.push(`Ambiguity mismatch: expected ${tc.expectedAmbiguous}, got ${isAmbiguous}`);
			}
			if (tc.expectedUnverified !== undefined && unverified !== tc.expectedUnverified) {
				ok = false;
				errors.push(`Unverified locality mismatch: expected "${tc.expectedUnverified}", got "${unverified}"`);
			}

			if (ok) {
				passed++;
				this.#stats.passed++;
				const srcLabel = actualSourceId || "none";
				const dstLabel = actualDestId || "none";
				console.log(`  ${c.green}✔ [PASS]${c.reset} ${c.bright}${tc.id}:${c.reset} "${tc.text}" ➔ [${srcLabel} ➔ ${dstLabel}]`);
			} else {
				this.#stats.failed++;
				console.log(`  ${c.red}✖ [FAIL]${c.reset} ${c.bright}${tc.id}:${c.reset} "${tc.text}"`);
				for (const err of errors) {
					console.log(`    ${c.red}→ ${err}${c.reset}`);
				}
			}
		}
		return passed;
	}

	/**
	 * 3. Multi-Turn Conversational Memory & Slot Filling Audit
	 */
	async auditConversations(convCases) {
		const c = this.#colors;
		console.log(`\n${c.yellow}${c.bright}▶ 3. MULTI-TURN CONVERSATION & MEMORY AUDIT (${convCases.length} Flows)${c.reset}`);
		console.log(`${c.gray}──────────────────────────────────────────────────────────────────${c.reset}`);

		let passed = 0;
		for (const flow of convCases) {
			this.#stats.total++;
			const engine = new DishaAiEngine();
			let flowPassed = true;
			const flowLogs = [];

			for (let i = 0; i < flow.turns.length; i++) {
				const turn = flow.turns[i];
				const res = await engine.processMessage(turn.userQuery, { lang: turn.lang });

				if (turn.expectClarification) {
					if (!engine.context.pendingClarification) {
						flowPassed = false;
						flowLogs.push(`Turn ${i + 1}: Expected pending clarification, but found none`);
					}
				}
				if (turn.expectRouteFound) {
					const lastRoute = engine.context.lastRouteResult;
					if (!lastRoute) {
						flowPassed = false;
						flowLogs.push(`Turn ${i + 1}: Expected route to be found, but route result is null`);
					} else {
						if (turn.expectedSource && lastRoute.source?.id !== turn.expectedSource) {
							flowPassed = false;
							flowLogs.push(`Turn ${i + 1}: Expected source "${turn.expectedSource}", got "${lastRoute.source?.id}"`);
						}
						if (turn.expectedDest && lastRoute.destination?.id !== turn.expectedDest) {
							flowPassed = false;
							flowLogs.push(`Turn ${i + 1}: Expected dest "${turn.expectedDest}", got "${lastRoute.destination?.id}"`);
						}
					}
				}
			}

			if (flowPassed) {
				passed++;
				this.#stats.passed++;
				console.log(`  ${c.green}✔ [PASS]${c.reset} ${c.bright}${flow.id}:${c.reset} ${flow.desc}`);
			} else {
				this.#stats.failed++;
				console.log(`  ${c.red}✖ [FAIL]${c.reset} ${c.bright}${flow.id}:${c.reset} ${flow.desc}`);
				for (const err of flowLogs) {
					console.log(`    ${c.red}→ ${err}${c.reset}`);
				}
			}
		}
		return passed;
	}

	/**
	 * 4. Multi-Network Portability Audit (Zero Cross-City Contamination)
	 */
	auditMultiNetwork(networkCases) {
		const c = this.#colors;
		console.log(`\n${c.yellow}${c.bright}▶ 4. MULTI-NETWORK PORTABILITY AUDIT (${networkCases.length} Networks)${c.reset}`);
		console.log(`${c.gray}──────────────────────────────────────────────────────────────────${c.reset}`);

		let passed = 0;
		for (const nc of networkCases) {
			this.#stats.total++;
			this.loadNetwork(nc.cityKey);

			const normData = TextNormalizer.normalize(nc.query);
			const resolved = StationEntityResolver.resolve(normData, nc.lang);
			const hubs = TransitNetworkHelper.getTopNetworkHubs(3);

			const srcOk = resolved.source?.id === nc.expectedSource;
			const dstOk = resolved.destination?.id === nc.expectedDest;
			const hubsOk = Array.isArray(hubs) && hubs.length > 0;

			if (srcOk && dstOk && hubsOk) {
				passed++;
				this.#stats.passed++;
				console.log(`  ${c.green}✔ [PASS]${c.reset} [Network: ${nc.cityKey}] "${nc.query}" ➔ [${resolved.source?.id} ➔ ${resolved.destination?.id}]`);
				console.log(`    ${c.gray}Active Hubs: ${hubs.map(h => h.id).join(", ")}${c.reset}`);
			} else {
				this.#stats.failed++;
				console.log(`  ${c.red}✖ [FAIL]${c.reset} [Network: ${nc.cityKey}] "${nc.query}"`);
				if (!srcOk) console.log(`    ${c.red}→ Source expected "${nc.expectedSource}", got "${resolved.source?.id}"${c.reset}`);
				if (!dstOk) console.log(`    ${c.red}→ Destination expected "${nc.expectedDest}", got "${resolved.destination?.id}"${c.reset}`);
				if (!hubsOk) console.log(`    ${c.red}→ Failed to discover dynamic network hubs!${c.reset}`);
			}
		}
		return passed;
	}

	/**
	 * 5. Storage Integrity, Pin Limit & LRU Constraints Audit
	 */
	auditStorage() {
		const c = this.#colors;
		console.log(`\n${c.yellow}${c.bright}▶ 5. LOCAL STORAGE, PIN LIMIT & LRU AUDIT${c.reset}`);
		console.log(`${c.gray}──────────────────────────────────────────────────────────────────${c.reset}`);

		localStorage.clear();

		// Test 1: Smart Title Generation
		this.#stats.total++;
		const title1 = DishaAiChatStorage.generateSmartTitle("jharoda se model town kaise jaun");
		const titleOk = title1 === "jharoda se model town kaise jaun";
		if (titleOk) {
			this.#stats.passed++;
			console.log(`  ${c.green}✔ [PASS]${c.reset} Smart Title Generation: "${title1}"`);
		} else {
			this.#stats.failed++;
			console.log(`  ${c.red}✖ [FAIL]${c.reset} Smart Title Generation unexpected: "${title1}"`);
		}

		// Test 2: Pin Limit (Max 13 pinned chats)
		this.#stats.total++;
		for (let i = 1; i <= 15; i++) {
			const id = `pin_test_${i}`;
			DishaAiChatStorage.saveChat({ id, title: `Chat ${i}`, messages: [{ role: "user", text: `Chat ${i}` }] });
			DishaAiChatStorage.togglePin(id);
		}
		const allChats = DishaAiChatStorage.getAllChats();
		const pinnedCount = allChats.filter(ch => ch.isPinned).length;
		if (pinnedCount <= 13) {
			this.#stats.passed++;
			console.log(`  ${c.green}✔ [PASS]${c.reset} Max Pin Constraint: exactly ${pinnedCount} chats pinned (limit: 13)`);
		} else {
			this.#stats.failed++;
			console.log(`  ${c.red}✖ [FAIL]${c.reset} Max Pin Constraint violated: ${pinnedCount} pinned chats!`);
		}

		// Test 3: Total Chat Limit (Max 25 chats)
		this.#stats.total++;
		for (let i = 1; i <= 30; i++) {
			DishaAiChatStorage.saveChat({ id: `lru_sess_${i}`, title: `Msg ${i}`, messages: [{ role: "user", text: `Msg ${i}` }] });
		}
		const finalChats = DishaAiChatStorage.getAllChats();
		if (finalChats.length <= 25) {
			this.#stats.passed++;
			console.log(`  ${c.green}✔ [PASS]${c.reset} LRU Total Session Cap: exactly ${finalChats.length} retained (max: 25)`);
		} else {
			this.#stats.failed++;
			console.log(`  ${c.red}✖ [FAIL]${c.reset} LRU Total Session Cap violated: ${finalChats.length} stored!`);
		}
	}

	/**
	 * 6. Latency & Performance SLA Benchmark (<60ms SLA)
	 */
	auditPerformance(queries, maxTimeMs = 60) {
		const c = this.#colors;
		console.log(`\n${c.yellow}${c.bright}▶ 6. PERFORMANCE & LATENCY BENCHMARK (<${maxTimeMs}ms SLA)${c.reset}`);
		console.log(`${c.gray}──────────────────────────────────────────────────────────────────${c.reset}`);

		this.loadNetwork("delhi_ncr");
		const engine = new DishaAiEngine();

		let totalDuration = 0;
		for (const q of queries) {
			this.#stats.total++;
			const t0 = performance.now();
			const normData = TextNormalizer.normalize(q);
			const entities = StationEntityResolver.resolve(normData, "en");
			IntentClassifier.classify(normData, entities, null, "en");
			const elapsed = performance.now() - t0;
			totalDuration += elapsed;

			if (elapsed <= maxTimeMs) {
				this.#stats.passed++;
				console.log(`  ${c.green}✔ [PASS]${c.reset} "${q}" processed in ${c.bright}${elapsed.toFixed(2)}ms${c.reset}`);
			} else {
				this.#stats.failed++;
				console.log(`  ${c.red}✖ [FAIL]${c.reset} "${q}" exceeded SLA: ${elapsed.toFixed(2)}ms > ${maxTimeMs}ms`);
			}
		}

		const avgMs = (totalDuration / queries.length).toFixed(2);
		console.log(`  ${c.cyan}→ Average Resolution Latency: ${avgMs}ms${c.reset}`);
	}

	/**
	 * Output Final Audit Summary
	 */
	summary() {
		const c = this.#colors;
		const { total, passed, failed } = this.#stats;
		const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

		console.log(`\n${c.cyan}${c.bright}══════════════════════════════════════════════════════════════════${c.reset}`);
		console.log(`  ${c.bright}🤖 DISHA AI TEST HARNESS SUMMARY${c.reset}`);
		console.log(`${c.cyan}${c.bright}══════════════════════════════════════════════════════════════════${c.reset}`);
		console.log(`  Total Checks: ${total}`);
		console.log(`  Passed      : ${c.green}${c.bright}${passed}${c.reset}`);
		console.log(`  Failed      : ${failed > 0 ? c.red + c.bright + failed : c.gray + "0"}${c.reset}`);
		console.log(`  Success Rate: ${passRate === "100.0" ? c.green : c.yellow}${c.bright}${passRate}%${c.reset}`);
		console.log(`${c.cyan}${c.bright}══════════════════════════════════════════════════════════════════${c.reset}\n`);

		return { total, passed, failed, passRate: Number(passRate) };
	}
}
