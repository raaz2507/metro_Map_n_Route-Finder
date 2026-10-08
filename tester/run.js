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
import { FareAuditor } from './engine/FareAuditor.js';
import { RouteFinder } from '../main_project/js/services/route/RouteFinder.js';
import { FareCalculator } from '../main_project/js/services/fare/FareCalculator.js';
import { calculateNeighborDistance } from '../main_project/js/core/data-utils.js';

// Modular City Datasets Import
import { delhiNcrTestCases } from './datasets/delhi_ncr.cases.js';
import { mumbaiTestCases } from './datasets/mumbai.cases.js';
import { bengaluruTestCases } from './datasets/bengaluru.cases.js';
import { agraTestCases } from './datasets/agra.cases.js';
import { jaipurTestCases } from './datasets/jaipur.cases.js';
import { kanpurTestCases } from './datasets/kanpur.cases.js';
import { lucknowTestCases } from './datasets/lucknow.cases.js';
import { kolkataTestCases } from './datasets/kolkata.cases.js';
import { hyderabadTestCases } from './datasets/hyderabad.cases.js';
import { chennaiTestCases } from './datasets/chennai.cases.js';
import { puneTestCases } from './datasets/pune.cases.js';
import { nagpurTestCases } from './datasets/nagpur.cases.js';
import { ahmedabadTestCases } from './datasets/ahmedabad_gandhinagar.cases.js';
import { bhopalTestCases } from './datasets/bhopal.cases.js';
import { indoreTestCases } from './datasets/indore.cases.js';
import { kochiTestCases } from './datasets/kochi.cases.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Registry of all modular test datasets
const cityDatasets = {
	delhi_ncr: { title: "Delhi NCR Metro", cases: delhiNcrTestCases },
	mumbai: { title: "Mumbai Metro & Monorail", cases: mumbaiTestCases },
	bengaluru: { title: "Bengaluru (Namma Metro)", cases: bengaluruTestCases },
	agra: { title: "Agra Metro", cases: agraTestCases },
	jaipur: { title: "Jaipur Metro", cases: jaipurTestCases },
	kanpur: { title: "Kanpur Metro", cases: kanpurTestCases },
	lucknow: { title: "Lucknow Metro", cases: lucknowTestCases },
	kolkata: { title: "Kolkata Metro", cases: kolkataTestCases },
	hyderabad: { title: "Hyderabad Metro", cases: hyderabadTestCases },
	chennai: { title: "Chennai Metro", cases: chennaiTestCases },
	pune: { title: "Pune Metro", cases: puneTestCases },
	nagpur: { title: "Nagpur Metro", cases: nagpurTestCases },
	ahmedabad_gandhinagar: { title: "Ahmedabad-Gandhinagar Metro", cases: ahmedabadTestCases },
	bhopal: { title: "Bhopal Metro", cases: bhopalTestCases },
	indore: { title: "Indore Metro", cases: indoreTestCases },
	kochi: { title: "Kochi Metro", cases: kochiTestCases }
};

// Parse CLI Args
const args = process.argv.slice(2);
const runAll = args.includes('--all');
const cityArg = args.find(a => a.startsWith('--city='))?.split('=')[1] || 'bengaluru';

const citiesToTest = runAll ? Object.keys(cityDatasets) : [cityArg];

let hasAnyFailures = false;

for (const city of citiesToTest) {
	const datasetConfig = cityDatasets[city];
	if (!datasetConfig) {
		console.error(`❌ Unknown city: "${city}". Supported: ${Object.keys(cityDatasets).join(', ')}`);
		process.exit(1);
	}

	const runner = new TestRunner();
	runner.start();
	runner.header(`${datasetConfig.title} Test Harness`);

	// Canonical data path in main_project
	const dataPath = path.resolve(__dirname, `../main_project/data/india/cities/${city}/transit_network.json`);
	if (!fs.existsSync(dataPath)) {
		console.error(`❌ Data file not found: ${dataPath}`);
		hasAnyFailures = true;
		continue;
	}

	const rawMetroData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
	const metroData = calculateNeighborDistance(rawMetroData);

	// 1. Structural & Canonical Network Audit
	runner.section("Data Integrity & Canonical Graph Audit");
	const auditResult = NetworkAuditor.audit(metroData);
	console.log(`  Stations: ${auditResult.totalStations} | Lines: ${auditResult.totalLines}`);
	if (auditResult.errors.length > 0) {
		console.log(`  ❌ Errors found (${auditResult.errors.length}):`);
		auditResult.errors.slice(0, 10).forEach(e => console.log(`     - ${e}`));
	} else {
		console.log(`  ✔ No structural graph errors.`);
	}

	// 2. Fare Rules & Policies Audit
	runner.section("Fare Rules & Policy Completeness Audit");
	const fareAuditResult = FareAuditor.auditFareRules(metroData);
	console.log(`  Policies: ${fareAuditResult.totalPolicies} | Currency: ${fareAuditResult.currency}`);
	if (fareAuditResult.errors.length > 0) {
		console.log(`  ❌ Fare errors found (${fareAuditResult.errors.length}):`);
		fareAuditResult.errors.forEach(e => console.log(`     - ${e}`));
	} else {
		console.log(`  ✔ All operational lines have authentic farePolicy & non-zero slabs.`);
	}

	// 3. Route, Platform & Fare Verification
	runner.section("Route, Platform & Official Fare Assertions");
	const routeFinder = new RouteFinder(metroData);
	const fareCalculator = new FareCalculator(metroData.fareRules || {});

	for (const testCase of datasetConfig.cases) {
		try {
			const routeResult = routeFinder.findRoute(
				testCase.from,
				testCase.to,
				testCase.routeType || "leastTransfers",
				testCase.options || {}
			);

			if (routeResult) {
				// Reuse production FareCalculator engine
				const calculatedFare = fareCalculator.calculateFare({
					path: routeResult.path,
					totalDistanceMeters: routeResult.totalDistanceMeters,
					startId: routeResult.source?.id,
					endId: routeResult.destination?.id,
					segments: routeResult.steps,
					coachClass: testCase.coachClass || "standard",
					journeyDate: testCase.journeyDate || new Date()
				});
				routeResult.calculatedFare = calculatedFare;
			}

			runner.assertRoute(testCase, routeResult);
		} catch (err) {
			console.error(`  ❌ Exception in test ${testCase.id}: ${err.message}`);
			console.error(err.stack);
		}
	}

	// 4. Print City Summary
	const stats = runner.summary();
	if (stats.failed > 0 || auditResult.errors.length > 0 || fareAuditResult.errors.length > 0) {
		hasAnyFailures = true;
	}
}

if (hasAnyFailures) {
	process.exitCode = 1;
}

