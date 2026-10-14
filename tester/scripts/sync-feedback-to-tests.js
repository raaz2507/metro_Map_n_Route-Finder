/**
 * 🔄 Sync Feedback to Test Cases Script
 * Usage:
 *   node tester/scripts/sync-feedback-to-tests.js [optional_google_sheet_webapp_url]
 *
 * Fetches user negative feedback queries from Google Sheets and appends them
 * directly into tester/datasets/disha_ai.cases.js so you can fix & verify!
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { AI_CONFIG } from "../../main_project/js/config/ai-config.js";

const CASES_FILE_PATH = path.resolve(__dirname, "../datasets/disha_ai.cases.js");

// Google Apps Script URL from central AI_CONFIG or CLI parameter
const WEBAPP_URL = process.argv[2] || process.env.DISHA_FEEDBACK_SHEET_URL || AI_CONFIG.feedbackEndpoint;

async function fetchFromGoogleSheet(url) {
	console.log(`📡 Fetching negative feedback from Google Sheet: ${url}`);
	const res = await fetch(url + "?action=get_unresolved");
	if (!res.ok) {
		throw new Error(`Google Sheets responded with HTTP ${res.status}`);
	}
	const data = await res.json();
	return Array.isArray(data.rows) ? data.rows : [];
}

function processAndAppendCases(fetchedRows) {
	if (!fs.existsSync(CASES_FILE_PATH)) {
		console.error("❌ Cases file not found:", CASES_FILE_PATH);
		process.exit(1);
	}

	let fileContent = fs.readFileSync(CASES_FILE_PATH, "utf8");

	let newCount = 0;
	const timestamp = new Date().toISOString().slice(0, 10);

	for (const row of fetchedRows) {
		const query = (row.query || row[1] || "").trim();
		const lang = (row.lang || row[3] || "hi").trim();
		const network = (row.network || row[4] || "delhi_ncr").trim();

		if (!query) continue;

		// Check if query is already present in dataset to avoid duplicates
		if (fileContent.includes(JSON.stringify(query)) || fileContent.includes(`"${query}"`)) {
			console.log(`⏩ Skipping duplicate query: "${query}"`);
			continue;
		}

		newCount++;
		const caseId = `SHEET_${timestamp}_${String(newCount).padStart(3, "0")}`;

		// Generate formatted test case block
		const caseBlock = `\n\t\t// Added from User Feedback (${timestamp}) [Network: ${network}]\n` +
			`\t\t{\n` +
			`\t\t\tid: "${caseId}",\n` +
			`\t\t\ttext: ${JSON.stringify(query)},\n` +
			`\t\t\tlang: "${lang}",\n` +
			`\t\t\texpectedIntent: "ROUTE_SEARCH", // TODO: Verify or update expected slots\n` +
			`\t\t},`;

		// Insert into intents array
		const intentsAnchor = "intents: [";
		const pos = fileContent.indexOf(intentsAnchor);
		if (pos >= 0) {
			const insertAt = pos + intentsAnchor.length;
			fileContent = fileContent.slice(0, insertAt) + caseBlock + fileContent.slice(insertAt);
		}
	}

	if (newCount > 0) {
		fs.writeFileSync(CASES_FILE_PATH, fileContent, "utf8");
		console.log(`\n✅ Successfully added ${newCount} new test cases to: ${CASES_FILE_PATH}`);
		console.log(`👉 Run 'node tester/run-ai.js' to see which queries need fixing!`);
	} else {
		console.log(`\nℹ️ No new queries to append (all queries were either empty or already in the test suite).`);
	}
}

async function run() {
	if (!WEBAPP_URL) {
		console.log("ℹ️ No Google Sheets URL provided.");
		console.log("👉 Usage: node tester/scripts/sync-feedback-to-tests.js <YOUR_GOOGLE_APPS_SCRIPT_URL>");
		console.log("\nSimulating with local mock user feedback payload for demonstration...");
		
		const mockFeedbacks = [
			{ query: "soorghat se gtb jaana hai kaise jaun", lang: "hi", network: "delhi_ncr" },
			{ query: "bhai rajiv chowk se model town ka kiraya", lang: "hi", network: "delhi_ncr" }
		];
		processAndAppendCases(mockFeedbacks);
		return;
	}

	try {
		const rows = await fetchFromGoogleSheet(WEBAPP_URL);
		console.log(`📥 Received ${rows.length} rows from Google Sheets.`);
		processAndAppendCases(rows);
	} catch (err) {
		console.error("❌ Failed to fetch from Google Sheets:", err.message);
	}
}

run();
