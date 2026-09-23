/**
 * 🚇 RouteFinder - Journey Planning & Routing Coordinator
 * Enterprise ES2022 OOP Class with Private Encapsulation (#)
 * 
 * विशेषताएँ:
 * 1. DijkstraAlgo Encapsulation: यह क्लास पाथ निकालने के लिए अंदर DijkstraAlgo का उपयोग करती है।
 * 2. Walkway & Skywalks: नोएडा 51-52 जैसे वॉकवे स्टेशनों पर पैदल दूरी व समय का हिसाब।
 * 3. Step-by-Step Instructions: यूजर के लिए स्पष्ट यात्रा निर्देश (Boarding, Interchanges, Alighting)।
 * 4. Multi-Network Speeds: DMRC, NMRC, RRTS की औसत गति के अनुसार सटीक यात्रा समय।
 * 5. Hindi & English Station Resolver: किसी भी भाषा या ID से स्टेशन खोजना।
 */

import { DijkstraAlgo } from "./DijkstraAlgo.js";
import { getDistance, getStationName } from "../../core/data-utils.js";

export class RouteFinder {
	// Private State Fields
	#stationData = null;
	#lines = null;
	#transfers = null;
	#networks = null;
	#walkingSpeed = 80; // Meters per minute (~4.8 km/h)
	#dijkstraEngine = null;
	#routeCache = new Map();     // ⚡ Full Journey Cache
	#terminalCache = new Map();  // ⚡ Terminal Resolution Cache

	/**
	 * @param {Object} metroData - MetroDataStore से प्राप्त पूर्ण ऑब्जेक्ट
	 */
	constructor(metroData = {}) {
		this.updateData(metroData);
	}

	/**
	 * नया डेटा अपडेट करें (उदा: जब शहर बदला जाए)
	 */
	updateData(metroData = {}) {
		this.#stationData = metroData.stationData || {};
		this.#lines = metroData.lines || {};
		this.#transfers = metroData.transfers || {};
		this.#networks = metroData.fareRules?.networks || {};
		this.#walkingSpeed = metroData.avgHumanWalkingSpeedMetersPerMin || 80;
		this.#routeCache.clear();
		this.#terminalCache.clear();
		if (!this.#dijkstraEngine) {
			this.#dijkstraEngine = new DijkstraAlgo(this.#stationData, this.#transfers, this.#lines);
		} else {
			this.#dijkstraEngine.updateData(this.#stationData, this.#transfers, this.#lines);
		}
	}

	/**
	 * मुख्य पब्लिक मेथड: दो स्टेशनों के बीच संपूर्ण रूट खोजें
	 * 
	 * @param {string} startName - शुरुआती स्टेशन का नाम (English, Hindi या ID)
	 * @param {string} endName - अंतिम स्टेशन का नाम (English, Hindi या ID)
	 * @param {string} [routeType="leastTransfers"] - "leastTransfers" | "shortestDistance"
	 * @param {Object} [options={}] - अतिरिक्त ऑप्शंस (उदा: includeUnderConstruction)
	 * @returns {Object|null}
	 */
	findRoute(startName, endName, routeType = "leastTransfers", options = {}) {
		const startId = this.findStationIdByName(startName);
		const endId = this.findStationIdByName(endName);
		if (!startId || !endId) return null;
		const includeUnderConstruction = options.includeUnderConstruction ?? false;
		// ⚡ Cache Check
		const cacheKey = `${startId}:${endId}:${routeType}:${includeUnderConstruction ? 1 : 0}`;
		if (this.#routeCache.has(cacheKey)) {
			return this.#routeCache.get(cacheKey);
		}
		const dijkstraResult = this.#dijkstraEngine.findPath(startId, endId, routeType, options);
		if (!dijkstraResult || !dijkstraResult.path || dijkstraResult.path.length === 0) {
			return null;
		}
		const path = dijkstraResult.path;
		const journeyData = this.#buildJourneyDetails(path, dijkstraResult.segments);

		const startStatus = this.#stationData[startId]?.properties?.status || "operational";
		const endStatus = this.#stationData[endId]?.properties?.status || "operational";
		const hasUnderConstruction = startStatus !== "operational" || endStatus !== "operational" ||
			(dijkstraResult.linesUsed || []).some(lId => (this.#lines?.[lId]?.status || "operational") !== "operational");

		const routeResult = {
			source: {
				id: startId,
				name: this.#getStationNames(startId),
				status: startStatus
			},
			destination: {
				id: endId,
				name: this.#getStationNames(endId),
				status: endStatus
			},
			hasUnderConstruction,
			path: path,
			totalStations: path.length,
			interchangesCount: dijkstraResult.interchanges,
			totalDistanceMeters: dijkstraResult.totalDistanceMeters,
			totalTravelTimeSeconds: journeyData.totalTimeSeconds,
			linesUsed: dijkstraResult.linesUsed,
			steps: journeyData.steps,
			walkways: journeyData.walkways,
			stationsList: this.#getStationDetailsList(path)
		};
		if (this.#routeCache.size >= 50) {
			const oldestKey = this.#routeCache.keys().next().value;
			this.#routeCache.delete(oldestKey);
		}
		this.#routeCache.set(cacheKey, routeResult);
		return routeResult;
	}

	/**
	 * स्टेशन नाम (Hindi / English / ID) से स्टेशन ID खोजना
	 * @param {string} name 
	 * @returns {string|null}
	 */
	findStationIdByName(name) {
		if (!name || typeof name !== "string") return null;

		const normalized = name.trim().toLowerCase();

		// 1. Direct ID match
		if (this.#stationData[normalized]) {
			return normalized;
		}

		// 2. Search by English/Hindi names or synonyms
		for (const [id, station] of Object.entries(this.#stationData)) {
			if (!station) continue;

			const enName = station.name?.en?.toLowerCase();
			const hiName = station.name?.hi?.toLowerCase();

			if (enName === normalized || hiName === normalized || id.toLowerCase() === normalized) {
				return id;
			}
		}

		return null;
	}

	/**
	 * वॉकवे या इंटरचेंज ट्रांसफर डेटा प्राप्त करने का पब्लिक मेथड
	 */
	getStationTransferData(stationId, nextStationId = null) {
		return this.#calculateStationTransferSeconds(stationId, nextStationId);
	}

	// =========================================================================
	// 🛠️ PRIVATE JOURNEY & TIMING BUILDERS
	// =========================================================================

		/**
	 * ट्रांसफर समय (सेकंड में) की डायनामिक गणना (Zero Fake Data)
	 */
	#calculateTransferTime(tData = {}, distanceMeters = 0) {
		let sec = 0;
		const mode = tData.transfer_mode;
		if (mode === "cross_platform") {
			sec = 45;
		} else if (mode === "vertical") {
			const levels = Number(tData.levels) || 1;
			sec = Math.max(levels * 60, Math.round((distanceMeters * 60) / this.#walkingSpeed));
		} else {
			sec = Math.round((distanceMeters * 60) / this.#walkingSpeed);
		}
		if (tData.security_check_required) {
			sec += 120; // सुरक्षा जांच
		}
		return sec;
	}

	/**
	 * यात्रा को स्टेप्स और टाइमिंग में विभाजित करता है
	 */
	#buildJourneyDetails(path, segments) {
		if (path.length <= 1) {
			return { steps: [], walkways: [], totalTimeSeconds: 0 };
		}
		const steps = [];
		const walkways = [];
		let totalTimeSeconds = 0;
		let currentStep = null;

		for (let i = 0; i < segments.length; i++) {
			const seg = segments[i];

			// 🔄 1. ट्रांसफर सेगमेंट (प्लेटफॉर्म बदलाव या वॉकवे)
			if (seg.isTransfer) {
				const tData = seg.transferData || {};
				const dist = Number(tData.distance_meters) || Number(seg.distance) || 0;
				const transferSec = this.#calculateTransferTime(tData, dist);
				totalTimeSeconds += transferSec;

				if (currentStep) {
					currentStep.nextTransfer = {
						type: tData.type || (seg.from === seg.to ? "interchange" : "walkway"),
						transferMode: tData.transfer_mode || "corridor",
						distanceMeters: dist,
						transferSeconds: transferSec,
						levels: tData.levels || null,
						wheelchairAccessible: tData.wheelchair_accessible ?? true,
						securityCheckRequired: !!tData.security_check_required,
						freeERickshaw: !!tData.free_e_rickshaw
					};
					currentStep.nextTransferSeconds = transferSec;
					currentStep.nextTransferDistanceMeters = dist;
				}

				if (tData.type === "walkway" || seg.from !== seg.to) {
					walkways.push({
						stationId: seg.from,
						nextStationId: seg.to,
						distanceMeters: dist,
						timeSeconds: transferSec,
						transferMode: tData.transfer_mode || "skywalk",
						freeERickshaw: !!tData.free_e_rickshaw,
						securityCheckRequired: !!tData.security_check_required
					});
				}
				continue;
			}

			// 🚂 2. ट्रेन सेगमेंट
			const line = this.#lines[seg.line];
			const networkParams = this.#getNetworkParams(seg.line);
			const trainTravelSeconds = Math.round((seg.distance / networkParams.speed) * 60) + Math.round(networkParams.halt * 60);

			if (!currentStep || currentStep.line !== seg.line || currentStep.toStation !== seg.from) {
				currentStep = {
					type: steps.length === 0 ? "board" : "interchange",
					line: seg.line,
					lineName: line?.name || { en: seg.line, hi: seg.line },
					shortName: line?.short_name || line?.name || { en: seg.line, hi: seg.line }, 
					lineColor: line?.color || "#888888",
					fromStation: seg.from,
					toStation: seg.to,
					stationsCount: 1,
					distanceMeters: seg.distance,
					travelTimeSeconds: trainTravelSeconds,
					intermediateStations: [seg.from, seg.to],
					// 🏷️ 5 यूनिवर्सल टाइप्स के लिए मेटाडेटा (Zero Hardcoding)
					farePolicy: line?.farePolicy || "dmrc_standard",
					operator: line?.operator || "dmrc",
					network: line?.network || "dmrc",
					isTrackShared: !!line?.sharedTrack
				};
				steps.push(currentStep);
			} else {
				currentStep.toStation = seg.to;
				currentStep.stationsCount += 1;
				currentStep.distanceMeters += seg.distance;
				currentStep.travelTimeSeconds += trainTravelSeconds;
				currentStep.intermediateStations.push(seg.to);
			}
			totalTimeSeconds += trainTravelSeconds;
		}

		// ✅ प्रत्येक स्टेप के लिए असली टर्मिनल स्टेशन और प्लेटफॉर्म निकालें
		let cumulativeSeconds = 0;
		steps.forEach((step, idx) => {
			const terminalId = this.getTerminalStationId(step.intermediateStations, step.line);
			step.terminalStationId = terminalId;
			step.terminalName = this.#getStationNames(terminalId);

			const startStationObj = this.#stationData[step.fromStation];
			step.platformNo = this.getInterchangePlatformNumber(startStationObj, step.line, terminalId);

			const stationIds = step.intermediateStations || [step.fromStation, step.toStation];
			const avgSecondsPerStation = stationIds.length > 1 ? (step.travelTimeSeconds / (stationIds.length - 1)) : 120;

			step.stations = stationIds.map((stId, sIdx) => {
				let hopDistanceKm = null;
				if (sIdx > 0) {
					const prevSt = this.#stationData[stationIds[sIdx - 1]];
					const edge = prevSt?.neighbors?.find((n) => n.station === stId && n.line === step.line);
					if (edge && edge.distance) {
						hopDistanceKm = (Number(edge.distance) / 1000).toFixed(1);
					}
					cumulativeSeconds += avgSecondsPerStation;
				}

				return {
					id: stId,
					hopDistanceKm: hopDistanceKm,
					timeMinutes: Math.round(cumulativeSeconds / 60)
				};
			});

			if (idx < steps.length - 1) {
				const nextStep = steps[idx + 1];
				const interchangeStation = this.#stationData[step.toStation];
				const nextTerminalId = this.getTerminalStationId(nextStep.intermediateStations, nextStep.line);
				step.nextPlatformNo = this.getInterchangePlatformNumber(interchangeStation, nextStep.line, nextTerminalId);

				cumulativeSeconds += (step.nextTransferSeconds || 0);
			}
		});

		return { steps, walkways, totalTimeSeconds };
	}
	/**
	 * लाइन की दिशा में अंतिम टर्मिनल स्टेशन (Line Terminal) खोजें
	 */
	getTerminalStationId(stationIds, lineId) {
		if (!stationIds || stationIds.length < 2) return "";
		const prevId = stationIds[stationIds.length - 2];
		const currentId = stationIds[stationIds.length - 1];
		const cacheKey = `${prevId}:${currentId}:${lineId}`;

		if (this.#terminalCache.has(cacheKey)) {
			return this.#terminalCache.get(cacheKey);
		}

		let tempCurrent = currentId;
		let tempPrev = prevId;

		for (let iter = 0; iter < 100; iter++) {
			const currentStation = this.#stationData?.[tempCurrent];
			if (!currentStation || !currentStation.neighbors) break;
			const nextNeighbors = currentStation.neighbors.filter(
				(n) => n.line === lineId && n.station !== tempPrev
			);
			if (nextNeighbors.length === 0) break;
			tempPrev = tempCurrent;
			tempCurrent = nextNeighbors[0].station;
		}

		const terminalId = tempCurrent || "";
		this.#terminalCache.set(cacheKey, terminalId);
		return terminalId;
	}
	/**
	 * इंटरचेंज स्टेशन के लिए सही प्लेटफॉर्म नंबर निकालें
	 */
	getInterchangePlatformNumber(stationOrId, targetLineId, terminalStationId) {
		const station = typeof stationOrId === "string" ? this.#stationData?.[stationOrId] : stationOrId;
		if (!station || !station.platforms) return "__";
		const platforms = station.platforms;
		const matchingPlatforms = [];
		for (const [platNo, platInfo] of Object.entries(platforms)) {
			if (platInfo.line === targetLineId && platInfo.is_open !== false) {
				matchingPlatforms.push({ platNo, platInfo });
			}
		}
		if (matchingPlatforms.length === 0) return "__";
		if (matchingPlatforms.length === 1) return matchingPlatforms[0].platNo;
		if (terminalStationId) {
			const normalizedTerminalId = terminalStationId.toLowerCase().replace(/_/g, "");
			for (const p of matchingPlatforms) {
				const dest = (p.platInfo.destination || "").toLowerCase().replace(/_/g, "");
				if (dest.includes(normalizedTerminalId) || normalizedTerminalId.includes(dest)) {
					return p.platNo;
				}
			}
		}
		return matchingPlatforms[0].platNo;
	}

	/**
	 * दो स्टेशनों के बीच वॉकवे और इंटरचेंज समय की गणना (सेकंड में)
	 */
	#calculateStationTransferSeconds(stationId, nextStationId = null) {
		const station = this.#stationData?.[stationId];
		if (!station) return { distanceMeters: 0, transferSeconds: 0 };

		// 1. यदि #transfers डिक्शनरी में उपलब्ध हो (O(1) लुकअप)
		if (this.#transfers?.[stationId]) {
			const stationTransfers = this.#transfers[stationId];
			for (const fromLine of Object.keys(stationTransfers)) {
				for (const [targetKey, tData] of Object.entries(stationTransfers[fromLine])) {
					const [targetStationId] = targetKey.split(":");
					if (!nextStationId || targetStationId === nextStationId) {
						const dist = Number(tData.distance_meters) || 0;
						const sec = this.#calculateTransferTime(tData, dist);
						return { distanceMeters: dist, transferSeconds: sec, transferData: tData };
					}
				}
			}
		}

		// 2. यदि दो अलग स्टेशन हों और कोऑर्डिनेट्स मौजूद हों
		if (nextStationId && this.#stationData[nextStationId] && stationId !== nextStationId) {
			const nextStation = this.#stationData[nextStationId];
			const dist = getDistance(station, nextStation);
			if (dist > 0) {
				const sec = Math.round((dist * 60) / this.#walkingSpeed);
				return { distanceMeters: dist, transferSeconds: sec };
			}
		}

		return { distanceMeters: 0, transferSeconds: 0 };
	}

	/**
	 * लाइन के अनुसार स्पीड और हॉल्ट प्राप्त करें
	 */
	#getNetworkParams(lineId) {
		const line = this.#lines[lineId];
		const networkKey = line?.network || "dmrc";
		const netConfig = this.#networks[networkKey] || {};

		return {
			speed: netConfig.avgSpeedMetersPerMin || 600,
			halt: netConfig.stationHaltMinutes ?? 0.5
		};
	}

	/**
	 * स्टेशन के बहुभाषी नाम प्राप्त करें
	 */
	#getStationNames(stationId) {
		const station = this.#stationData[stationId];
		return {
			en: getStationName(station, "en") || stationId,
			hi: getStationName(station, "hi") || stationId
		};
	}

	/**
	 * पाथ के सभी स्टेशनों की विस्तृत लिस्ट
	 */
	#getStationDetailsList(path) {
		return path.map((stId) => {
			const st = this.#stationData[stId];
			return {
				id: stId,
				name: this.#getStationNames(stId),
				lines: st?.lines || [],
				stationType: st?.properties?.station_type || st?.station_type || "normal",
				location: st?.location || null
			};
		});
	}
}