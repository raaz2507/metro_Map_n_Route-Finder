const fs = require("node:fs/promises");
const path = require("node:path");

const { minify: minifyJS } = require("terser");
const { minify: minifyHTML } = require("html-minifier-terser");
const CleanCSS = require("clean-css");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "main_project");
const OUTPUT = path.join(ROOT, "android-build");

async function build() {

	// Never modify the original source directory.
	await fs.rm(OUTPUT, { recursive: true, force: true });
	await fs.mkdir(OUTPUT, { recursive: true });

	async function processDirectory(sourceDir, outputDir) {
		const entries = await fs.readdir(sourceDir, {
			withFileTypes: true,
		});

		for (const entry of entries) {
			const input = path.join(sourceDir, entry.name);
			const output = path.join(outputDir, entry.name);

			if (entry.isDirectory()) {
				await fs.mkdir(output, { recursive: true });
				await processDirectory(input, output);
				continue;
			}

			if (!entry.isFile()) continue;

			const ext = path.extname(entry.name).toLowerCase();
			const original = await fs.readFile(input);

			// Copy binary and unsupported files unchanged.
			if (![".html", ".htm", ".js", ".mjs", ".cjs", ".css", ".json", ".webmanifest", ".svg"].includes(ext)) {
				await fs.writeFile(output, original);
				continue;
			}

			const source = original.toString("utf8");
			let result = source;

			if (ext === ".html" || ext === ".htm") {
				result = await minifyHTML(source, {
					removeComments: true,
					collapseWhitespace: true,
					minifyCSS: true,
					minifyJS: true,
					removeAttributeQuotes: false,
					removeEmptyAttributes: false,
				});
			} else if (ext === ".js" || ext === ".mjs" || ext === ".cjs") {
				const minified = await minifyJS(source, {
					compress: true,
					mangle: false,
					format: {
						comments: false,
					},
				});

				if (minified.code == null) {
					throw new Error(`JS minification failed: ${input}`);
				}

				result = minified.code;
			
				} else if (ext === ".css") {
					const minified = new CleanCSS({
						level: 1,
						rebase: false,
						inline: []
					}).minify(source);

					if (minified.errors.length) {
						throw new Error(
							`CSS minification failed: ${input}\n` +
							minified.errors.join("\n")
						);
					}

					result = minified.styles;
				} else if (ext === ".json" || ext === ".webmanifest") {
				// Validate JSON and remove formatting whitespace.
				result = JSON.stringify(JSON.parse(source));
			} else if (ext === ".svg") {
				if (input.endsWith(path.join("comic", "assets", "images", "coach.svg"))) {
					await fs.writeFile(output, original);
					continue;
				}

				// Remove XML comments and formatting whitespace only.
				// Preserve SVG elements, attributes, IDs, paths and styles.
				result = source
					.replace(/<!--[\s\S]*?-->/g, "")
					.replace(/>\s+</g, "><")
					.trim();
			}

			await fs.writeFile(output, result, "utf8");
		}
	}

	try {
		await processDirectory(SOURCE, OUTPUT);
		console.log("Android web assets generated successfully.");
		console.log(`Source: ${SOURCE}`);
		console.log(`Output: ${OUTPUT}`);
	} catch (error) {
		// Remove incomplete output so it cannot be synced accidentally.
		await fs.rm(OUTPUT, { recursive: true, force: true });
		throw error;
	}
}

build().catch((error) => {
	console.error("Android asset build failed:");
	console.error(error);
	process.exitCode = 1;
});
