/**
 * 🚀 Master CLI Test Runner
 * Usage: 
 *   node tester/run.js                     (Runs default: Delhi NCR)
 *   node tester/run.js --city=mumbai       (Runs Mumbai Metro & Monorail)
 *   node tester/run.js --all               (Runs ALL cities in the project)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TestRunner } from './engine/TestRunner.js';
import { NetworkAuditor } from './engine/NetworkAuditor.js';
import { delhiNcrTestCases } from './datasets/delhi_ncr.cases.js';
import { mumbaiTestCases } from './datasets/mumbai.cases.js';
import { RouteFinder } from '../main_project/js/services/route/RouteFinder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI Args
const args = process.argv.slice(2);
const runAll = args.includes('--all');
const cityArg = args.find(a => a.startsWith('--city='))?.split('=')[1] || 'delhi_ncr';

const citiesToTest = runAll ? ['delhi_ncr', 'mumbai'] : [cityArg];

const cityDatasets = {
	delhi_ncr: { title: "Delhi NCR Metro", cases: delhiNcrTestCases },
	mumbai: { title: "Mumbai Metro & Monorail", cases: mumbaiTestCases }
};

let hasAnyFailures = false;

for (const city of citiesToTest) {
	const datasetConfig = cityDatasets[city];
	if (!datasetConfig) {
		console.error(`❌ Unknown city: ${city}. Supported: ${Object.keys(cityDatasets).join(', ')}`);
		process.exit(1);
	}

	const runner = new TestRunner();
	runner.start();
	runner.header(`${datasetConfig.title} Test Harness`);

	// Load Data
	const dataPath = path.resolve(__dirname, `../main_project/data/cities/${city}/transit_network.json`);
	if (!fs.existsSync(dataPath)) {
		console.error(`❌ Data file not found: ${dataPath}`);
		process.exit(1);
	}

	const metroData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

	// 1. Network Audit
	runner.section("Data Integrity & Canonical ID Audit");
	const auditResult = NetworkAuditor.audit(metroData);
	console.log(`  Stations: ${auditResult.totalStations} | Lines: ${auditResult.totalLines}`);
	if (auditResult.errors.length > 0) {
		console.log(`  ❌ Errors found (${auditResult.errors.length}):`);
		auditResult.errors.slice(0, 10).forEach(e => console.log(`     - ${e}`));
	} else {
		console.log(`  ✔ No structural graph errors.`);
	}

	if (auditResult.warnings.length > 0) {
		console.log(`  ⚠️  Platform Destination ID Mismatches (${auditResult.warnings.length}):`);
		const destCounts = {};
		auditResult.warnings.forEach(w => {
			const match = w.match(/destination "([^"]+)"/);
			if (match) {
				destCounts[match[1]] = (destCounts[match[1]] || 0) + 1;
			} else {
				console.log(`     - ${w}`);
			}
		});
		Object.entries(destCounts).forEach(([dest, count]) => {
			console.log(`     - "${dest}": referenced ${count} times`);
		});
	} else {
		console.log(`  ✔ All platform destinations match canonical station IDs.`);
	}

	// 2. Route & Platform Verification
	runner.section("Route & Platform Number Assertions");
	const routeFinder = new RouteFinder(metroData);

	for (const testCase of datasetConfig.cases) {
		try {
			const routeResult = routeFinder.findRoute(testCase.from, testCase.to, testCase.routeType || "leastTransfers", testCase.options || {});
			runner.assertRoute(testCase, routeResult);
		} catch (err) {
			console.error(`  ❌ Exception in test ${testCase.id}: ${err.message}`);
			console.error(err.stack);
		}
	}

	// 3. Print City Summary
	const stats = runner.summary();
	if (stats.failed > 0) {
		hasAnyFailures = true;
	}
}

if (hasAnyFailures) {
	process.exitCode = 1;
}
