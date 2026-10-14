/**
 * 🚀 Disha AI Master Test CLI
 * Usage:
 *   node tester/run-ai.js
 */

import { DishaAiAuditor } from "./engine/DishaAiAuditor.js";
import { dishaAiTestCases } from "./datasets/disha_ai.cases.js";

async function run() {
	const c = {
		reset: "\x1b[0m",
		bright: "\x1b[1m",
		cyan: "\x1b[36m"
	};

	console.log(`\n${c.cyan}${c.bright}══════════════════════════════════════════════════════════════════${c.reset}`);
	console.log(`  ${c.bright}🤖 DISHA AI ENTERPRISE NLU & ENGINE AUDIT HARNESS${c.reset}`);
	console.log(`  Multi-Network • Multi-Lingual • Offline-First SLA`);
	console.log(`${c.cyan}${c.bright}══════════════════════════════════════════════════════════════════${c.reset}`);

	const auditor = new DishaAiAuditor();

	// Baseline network: Delhi NCR
	auditor.loadNetwork("delhi_ncr");

	// 1. Intent Classification (30 Cases)
	auditor.auditIntents(dishaAiTestCases.intents);

	// 2. Station Entity & Slot Extraction (10 Cases)
	auditor.auditEntities(dishaAiTestCases.entities);

	// 3. Multi-Turn Conversation Memory & Slot Fulfillment
	await auditor.auditConversations(dishaAiTestCases.conversations);

	// 4. Multi-Network Portability (Delhi, Mumbai, Bengaluru)
	auditor.auditMultiNetwork(dishaAiTestCases.networks);

	// 5. Storage Integrity, Pin Limit (13), and LRU (25) Constraints
	auditor.auditStorage();

	// 6. Latency & Performance SLA Benchmark (<60ms)
	auditor.auditPerformance([
		"from rajiv chowk to kashmere gate",
		"jharoda se model town kaise jaun",
		"what is the fare to botanical garden",
		"राजीव चौक से कश्मीरी गेट कैसे जाएं",
		"nearest metro station"
	], dishaAiTestCases.performanceSLA.maxResolutionTimeMs);

	const summary = auditor.summary();

	if (summary.failed > 0) {
		process.exit(1);
	} else {
		process.exit(0);
	}
}

run().catch((err) => {
	console.error("\n❌ Fatal error during Disha AI audit:", err);
	process.exit(1);
});
