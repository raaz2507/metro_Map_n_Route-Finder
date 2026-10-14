/**
 * 🚉 StationEntityResolver - Transit Slot & Entity Extractor
 * Identifies Source, Destination, Station Candidates, and Unverified Localities
 * 100% Dynamic, Network-Agnostic, and Language-Agnostic.
 * Zero Hardcoded Cities, Stations, Aliases, or Languages.
 */

import { centerClass } from "../../../core/CenterClass.js";
import i18n from "../../../core/i18n.js";
import { TransitNetworkHelper } from "../TransitNetworkHelper.js";
import { TextNormalizer } from "./TextNormalizer.js";

export class StationEntityResolver {
	/**
	 * Main Resolution Entry Point
	 * @param {Object} normData - Normalized query tokens and text
	 * @param {string} [lang="en"] - Active language
	 * @returns {Object} { source, destination, station, candidates, isAmbiguous, unverifiedLocality }
	 */
	static resolve(normData, lang = "en") {
		const text = normData.lowerText;
		const rawText = normData.rawText;

		// 1. Try directional pair extraction (e.g., "from X to Y", "X to Y", "X se Y", "X se Y tak")
		const directional = this.#extractDirectionalStations(text, rawText, lang);
		if (directional && (directional.source || directional.destination || directional.unverifiedLocality || directional.isAmbiguous)) {
			return directional;
		}

		// 2. Fallback: Sliding N-Gram Search across query tokens
		const nGramMatches = this.#extractSlidingNgrams(normData, lang);

		let source = null;
		let destination = null;
		let station = null;
		let candidates = [];
		let isAmbiguous = false;

		if (nGramMatches.length >= 2) {
			source = nGramMatches[0].station;
			destination = nGramMatches[1].station;
		} else if (nGramMatches.length === 1) {
			const single = nGramMatches[0];
			station = single.station;
			candidates = single.candidates || [];
			isAmbiguous = single.isAmbiguous;
			if (single.isDestinationIntent) {
				destination = single.station;
			} else if (single.isSourceIntent) {
				source = single.station;
			}
		}

		return {
			source,
			destination,
			station: station || source || destination || null,
			candidates: candidates.length > 0 ? candidates : (source ? [source] : (destination ? [destination] : [])),
			isAmbiguous,
			unverifiedLocality: null
		};
	}

	/**
	 * Safe regex string escaping compatible with Unicode (/u) mode
	 */
	static #escapeRegexLiteral(str) {
		return (str || "").replace(/[\\^$*+?.()|[\]{}]/g, "\\$&");
	}

	/**
	 * Directional pattern parsing driven dynamically by language NLU route markers
	 */
	static #extractDirectionalStations(text, rawText, lang) {
		const nluConfig = i18n.getNluConfig(lang) || i18n.getNluConfig("en") || {};
		const markers = nluConfig.routeMarkers || {};
		const betweenPairs = markers.betweenPairs || [{ from: "from", to: "to" }];

		// 1. Check between pairs: e.g. "from <SRC> to <DST>", "<SRC> se <DST> tak"
		for (const pair of betweenPairs) {
			const fromEsc = this.#escapeRegexLiteral(pair.from);
			const toEsc = this.#escapeRegexLiteral(pair.to);
			const pairRegex = new RegExp(`(?:\\b${fromEsc}\\s+)?([\\p{L}\\p{M}\\p{N}\\s-]+?)\\s+(?:${toEsc})\\s+([\\p{L}\\p{M}\\p{N}\\s-]+)`, "iu");
			const match = text.match(pairRegex) || rawText.match(pairRegex);
			if (match && match[1] && match[2]) {
				const cleanSrc = this.#cleanStationCandidate(match[1], lang);
				const cleanDst = this.#cleanStationCandidate(match[2], lang);
				if (cleanSrc && cleanDst) {
					return this.#resolveStationPair(cleanSrc, cleanDst, lang);
				}
			}
		}

		// 2. Generic connectors: e.g. "X -> Y", "X to Y", "X ➔ Y", "X - Y"
		const connectors = markers.connectors || ["to", "->", "-->", "➔", "-"];
		const connectorPattern = connectors.map(c => this.#escapeRegexLiteral(c)).join("|");
		const connRegex = new RegExp(`([\\p{L}\\p{M}\\p{N}\\s-]+?)\\s+(?:${connectorPattern})\\s+([\\p{L}\\p{M}\\p{N}\\s-]+)`, "iu");
		const connMatch = text.match(connRegex) || rawText.match(connRegex);
		if (connMatch && connMatch[1] && connMatch[2]) {
			const cleanSrc = this.#cleanStationCandidate(connMatch[1], lang);
			const cleanDst = this.#cleanStationCandidate(connMatch[2], lang);
			if (cleanSrc && cleanDst) {
				return this.#resolveStationPair(cleanSrc, cleanDst, lang);
			}
		}

		// 3. Destination explicit (e.g. "to <DEST>", "<DEST> jana hai")
		const destPrefixes = (markers.destPrefixes || ["to"]).map(p => this.#escapeRegexLiteral(p)).join("|");
		const destRegex = new RegExp(`(?:(?:${destPrefixes})\\s+([\\p{L}\\p{M}\\p{N}\\s-]+))|(?:([\\p{L}\\p{M}\\p{N}\\s-]+?)\\s+(?:${destPrefixes}))`, "iu");
		const destMatch = text.match(destRegex) || rawText.match(destRegex);

		const srcPrefixes = (markers.sourcePrefixes || ["from"]).map(p => this.#escapeRegexLiteral(p)).join("|");
		const srcRegex = new RegExp(`(?:(?:${srcPrefixes})\\s+([\\p{L}\\p{M}\\p{N}\\s-]+))|(?:([\\p{L}\\p{M}\\p{N}\\s-]+?)\\s+(?:${srcPrefixes}))`, "iu");

		if (destMatch) {
			const candidateDst = this.#cleanStationCandidate(destMatch[1] || destMatch[2], lang);
			// Check if remainder has a source
			const remainder = (destMatch.input || text).replace(destMatch[0], " ").trim();
			const remSrcMatch = remainder.match(srcRegex);
			if (remSrcMatch) {
				const candidateSrc = this.#cleanStationCandidate(remSrcMatch[1] || remSrcMatch[2], lang);
				if (candidateSrc && candidateDst) {
					return this.#resolveStationPair(candidateSrc, candidateDst, lang);
				}
			}

			if (candidateDst) {
				const destination = this.#matchStation(candidateDst, lang);
				const candidates = this.#searchStationCandidates(candidateDst, lang);
				const cluster = TransitNetworkHelper.detectAmbiguousCluster(candidateDst, candidates, lang);

				return {
					source: null,
					destination,
					station: destination,
					candidates: cluster.clusterCandidates,
					isAmbiguous: cluster.isAmbiguous,
					unverifiedLocality: (!destination && candidates.length === 0) ? candidateDst : null
				};
			}
		}

		// 4. Source explicit (e.g. "from <SRC>", "<SRC> se")
		const srcMatch = text.match(srcRegex) || rawText.match(srcRegex);
		if (srcMatch) {
			const candidateSrc = this.#cleanStationCandidate(srcMatch[1] || srcMatch[2], lang);
			// Check if remainder has a destination
			const remainder = (srcMatch.input || text).replace(srcMatch[0], " ").trim();
			const remDestMatch = remainder.match(destRegex);
			if (remDestMatch) {
				const candidateDst = this.#cleanStationCandidate(remDestMatch[1] || remDestMatch[2], lang);
				if (candidateSrc && candidateDst) {
					return this.#resolveStationPair(candidateSrc, candidateDst, lang);
				}
			}

			if (candidateSrc) {
				const source = this.#matchStation(candidateSrc, lang);
				const candidates = this.#searchStationCandidates(candidateSrc, lang);
				const cluster = TransitNetworkHelper.detectAmbiguousCluster(candidateSrc, candidates, lang);

				return {
					source,
					destination: null,
					station: source,
					candidates: cluster.clusterCandidates,
					isAmbiguous: cluster.isAmbiguous,
					unverifiedLocality: (!source && candidates.length === 0) ? candidateSrc : null
				};
			}
		}

		return null;
	}

	/**
	 * Get stopwords set for active language
	 */
	static #getStopwords(lang) {
		const nluConfig = i18n.getNluConfig(lang) || i18n.getNluConfig("en") || {};
		const words = nluConfig.stopwords || [
			"metro", "train", "station", "route", "fare", "time", "please"
		];
		return new Set(words.map(w => w.toLowerCase().trim()));
	}

	/**
	 * Strips conversational filler, pronouns, intent phrases, and polite words
	 * dynamically based on the active language's stopwords list.
	 * @param {string} str
	 * @param {string} lang
	 * @returns {string} Cleaned station name
	 */
	static #cleanStationCandidate(str, lang = "en") {
		if (!str || typeof str !== "string") return "";
		const withoutFillers = TextNormalizer.stripTransitFillers(str, lang);
		const stopwords = this.#getStopwords(lang);
		const words = withoutFillers.trim().toLowerCase().split(/\s+/).filter(Boolean);

		// Strip leading stopwords
		while (words.length > 0 && stopwords.has(words[0])) {
			words.shift();
		}

		// Strip trailing stopwords
		while (words.length > 0 && stopwords.has(words[words.length - 1])) {
			words.pop();
		}

		return words.join(" ").trim();
	}

	/**
	 * Check if candidate has an exact single match in search results
	 */
	static #isExactSingleMatch(query, candidates, lang) {
		if (!candidates || candidates.length === 0) return false;
		if (candidates.length === 1) return true;

		const q = (query || "").trim().toLowerCase();
		const top = candidates[0];
		const enName = (typeof top.name === "object" ? top.name.en : top.name || "").toLowerCase();
		const locName = (centerClass.getStationName(top.id, lang) || "").toLowerCase();

		return enName === q || locName === q || top.id === q;
	}

	/**
	 * Resolves both source and destination candidates for a pair dynamically
	 */
	static #resolveStationPair(rawSrc, rawDst, lang) {
		const cleanSrc = this.#cleanStationCandidate(rawSrc, lang);
		const cleanDst = this.#cleanStationCandidate(rawDst, lang);

		const source = this.#matchStation(cleanSrc, lang);
		const destination = this.#matchStation(cleanDst, lang);

		const srcCandidates = this.#searchStationCandidates(cleanSrc, lang);
		const dstCandidates = this.#searchStationCandidates(cleanDst, lang);

		const srcCluster = TransitNetworkHelper.detectAmbiguousCluster(cleanSrc, srcCandidates, lang);
		const dstCluster = TransitNetworkHelper.detectAmbiguousCluster(cleanDst, dstCandidates, lang);

		const isSrcAmbiguous = srcCluster.isAmbiguous && !this.#isExactSingleMatch(cleanSrc, srcCandidates, lang);
		const isDstAmbiguous = dstCluster.isAmbiguous && !this.#isExactSingleMatch(cleanDst, dstCandidates, lang);

		// If BOTH are ambiguous
		if (isSrcAmbiguous && isDstAmbiguous) {
			return {
				source: null,
				destination: null,
				station: null,
				candidates: srcCluster.clusterCandidates.slice(0, 4),
				isAmbiguous: true,
				ambiguousSlot: "source_then_dest",
				rawSrc: cleanSrc,
				srcCandidates: srcCluster.clusterCandidates.slice(0, 4),
				rawDst: cleanDst,
				dstCandidates: dstCluster.clusterCandidates.slice(0, 4),
				unverifiedLocality: null
			};
		}

		// Destination is ambiguous, Source is clear
		if (isDstAmbiguous && source) {
			return {
				source,
				destination: null,
				station: source,
				candidates: dstCluster.clusterCandidates.slice(0, 4),
				isAmbiguous: true,
				ambiguousSlot: "destination",
				ambiguousQuery: cleanDst,
				unverifiedLocality: null
			};
		}

		// Source is ambiguous, Destination is clear
		if (isSrcAmbiguous && destination) {
			return {
				source: null,
				destination,
				station: destination,
				candidates: srcCluster.clusterCandidates.slice(0, 4),
				isAmbiguous: true,
				ambiguousSlot: "source",
				ambiguousQuery: cleanSrc,
				unverifiedLocality: null
			};
		}

		let unverifiedLocality = null;
		if (!source && srcCandidates.length === 0 && (destination || dstCandidates.length > 0)) {
			unverifiedLocality = cleanSrc;
		} else if ((source || srcCandidates.length > 0) && !destination && dstCandidates.length === 0) {
			unverifiedLocality = cleanDst;
		} else if (!source && srcCandidates.length === 0 && !destination && dstCandidates.length === 0) {
			unverifiedLocality = cleanSrc;
		}

		return {
			source,
			destination,
			station: source || destination || null,
			candidates: [],
			isAmbiguous: false,
			unverifiedLocality
		};
	}

	/**
	 * Sliding N-Gram Search across query tokens
	 */
	static #extractSlidingNgrams(normData, lang) {
		const tokens = normData.tokens;
		if (!tokens || tokens.length === 0) return [];

		const stopwords = this.#getStopwords(lang);
		const nluConfig = i18n.getNluConfig(lang) || i18n.getNluConfig("en") || {};
		const markers = nluConfig.routeMarkers || {};
		const sourcePre = new Set((markers.sourcePre || markers.sourcePrefixes || ["from"]).map(s => s.toLowerCase()));
		const sourcePost = new Set((markers.sourcePost || []).map(s => s.toLowerCase()));
		const destPre = new Set((markers.destPre || markers.destPrefixes || ["to"]).map(s => s.toLowerCase()));
		const destPost = new Set((markers.destPost || []).map(s => s.toLowerCase()));

		const results = [];
		const usedIndices = new Set();
		const maxN = Math.min(4, tokens.length);

		// Scan from largest window (4 tokens) down to 1 token
		for (let n = maxN; n >= 1; n--) {
			for (let i = 0; i <= tokens.length - n; i++) {
				let overlap = false;
				for (let j = i; j < i + n; j++) {
					if (usedIndices.has(j)) {
						overlap = true;
						break;
					}
				}
				if (overlap) continue;

				const slice = tokens.slice(i, i + n);
				const phrase = slice.join(" ");

				// Skip if phrase is purely stopwords
				if (slice.every(w => stopwords.has(w))) continue;

				const searchMatches = this.#searchStationCandidates(phrase, lang);
				if (searchMatches.length > 0) {
					const topStation = searchMatches[0];
					const cluster = TransitNetworkHelper.detectAmbiguousCluster(phrase, searchMatches, lang);

					const prevToken = (i > 0 ? tokens[i - 1] : "").toLowerCase();
					const nextToken = (i + n < tokens.length ? tokens[i + n] : "").toLowerCase();

					const isSource = sourcePre.has(prevToken) || sourcePost.has(nextToken);
					const isDest = destPre.has(prevToken) || destPost.has(nextToken);

					results.push({
						station: topStation,
						startIndex: i,
						isAmbiguous: cluster.isAmbiguous,
						candidates: cluster.clusterCandidates.slice(0, 4),
						isSourceIntent: isSource,
						isDestinationIntent: isDest
					});

					for (let j = i; j < i + n; j++) {
						usedIndices.add(j);
					}
				}
			}
		}

		// Sort by appearance order in query tokens
		results.sort((a, b) => a.startIndex - b.startIndex);

		return results;
	}

	/**
	 * Search candidates dynamically using StationSearchEngine and active metro data
	 */
	static #searchStationCandidates(query, lang) {
		if (!query || query.length < 2) return [];

		const qLower = query.toLowerCase().trim();
		const stopwords = this.#getStopwords(lang);

		// Reject pure digits (e.g. "2", "3" from "gate 2")
		if (/^\d+$/.test(qLower)) return [];

		// Reject common stopword tokens
		if (stopwords.has(qLower)) return [];

		// Check if active metroData has custom network aliases
		const metroData = centerClass.getMetroData();
		if (metroData?.aliases?.[qLower]) {
			const directStation = centerClass.getStationDetails(metroData.aliases[qLower]);
			if (directStation) return [directStation];
		}

		const cleaned = query
			.split(" ")
			.filter(w => !stopwords.has(w))
			.join(" ")
			.trim();

		if (!cleaned || cleaned.length < 2) return [];

		try {
			const engine = centerClass.getStationSearchEngine();
			if (engine && typeof engine.search === "function") {
				const matches = engine.search(cleaned, lang);
				if (Array.isArray(matches) && matches.length > 0) {
					return matches;
				}
			}
		} catch (e) {
			console.warn("[StationEntityResolver] Dynamic station search failed:", e);
		}

		return [];
	}

	/**
	 * Match single station string
	 */
	static #matchStation(str, lang) {
		if (!str) return null;
		const candidates = this.#searchStationCandidates(str, lang);
		return candidates.length > 0 ? candidates[0] : null;
	}
}
