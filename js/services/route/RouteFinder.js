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
        this.#networks = metroData.fareRules?.networks || {};
        this.#walkingSpeed = metroData.avgHumanWalkingSpeedMetersPerMin || 80;
        this.#routeCache.clear();
        this.#terminalCache.clear();
        if (!this.#dijkstraEngine) {
            this.#dijkstraEngine = new DijkstraAlgo(this.#stationData, this.#lines);
        } else {
            this.#dijkstraEngine.updateData(this.#stationData, this.#lines);
        }
    }

    /**
     * मुख्य पब्लिक मेथड: दो स्टेशनों के बीच संपूर्ण रूट खोजें
     * 
     * @param {string} startName - शुरुआती स्टेशन का नाम (English, Hindi या ID)
     * @param {string} endName - अंतिम स्टेशन का नाम (English, Hindi या ID)
     * @param {string} [routeType="leastTransfers"] - "leastTransfers" | "shortestDistance"
     * @returns {Object|null}
     */
    findRoute(startName, endName, routeType = "leastTransfers") {
        const startId = this.findStationIdByName(startName);
        const endId = this.findStationIdByName(endName);
        if (!startId || !endId) return null;
        // ⚡ Cache Check
        const cacheKey = `${startId}:${endId}:${routeType}`;
        if (this.#routeCache.has(cacheKey)) {
            return this.#routeCache.get(cacheKey);
        }
        const dijkstraResult = this.#dijkstraEngine.findPath(startId, endId, routeType);
        if (!dijkstraResult || !dijkstraResult.path || dijkstraResult.path.length === 0) {
            return null;
        }
        const path = dijkstraResult.path;
        const journeyData = this.#buildJourneyDetails(path, dijkstraResult.segments);
        const routeResult = {
            source: {
                id: startId,
                name: this.#getStationNames(startId)
            },
            destination: {
                id: endId,
                name: this.#getStationNames(endId)
            },
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
            const line = this.#lines[seg.line];
            const networkParams = this.#getNetworkParams(seg.line);
            const trainTravelSeconds = Math.round((seg.distance / networkParams.speed) * 60) + Math.round(networkParams.halt * 60);
            if (!currentStep || currentStep.line !== seg.line) {
                if (currentStep) {
                    const transferData = this.#calculateStationTransferSeconds(seg.from, seg.to);
                    if (transferData.transferSeconds) {
                        totalTimeSeconds += transferData.transferSeconds;
                        walkways.push({
                            stationId: seg.from,
                            nextStationId: seg.to,
                            distanceMeters: transferData.distanceMeters,
                            timeSeconds: transferData.transferSeconds
                        });
                    }
                }
                currentStep = {
                    type: currentStep ? "interchange" : "board",
                    line: seg.line,
                    lineName: line?.name || { en: seg.line, hi: seg.line },
					shortName: line?.short_name || line?.name || { en: seg.line, hi: seg.line }, 
                    lineColor: line?.color || "#888888",
                    fromStation: seg.from,
                    toStation: seg.to,
                    stationsCount: 1,
                    distanceMeters: seg.distance,
                    travelTimeSeconds: trainTravelSeconds,
                    intermediateStations: [seg.from, seg.to]
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
        // ✅ प्रत्येक स्टेप के लिए असली टर्मिनल स्टेशन (Towards Terminal) और प्लेटफॉर्म निकालें
                // 📊 हर स्टेशन के लिए वास्तविक Hop Distance और Time Minutes पहले से कैलकुलेट करें
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

                const transferData = this.#calculateStationTransferSeconds(step.toStation, nextStep.fromStation);
                step.nextTransferSeconds = transferData?.transferSeconds || 180;
				step.nextTransferDistanceMeters = transferData?.distanceMeters || null;
                cumulativeSeconds += step.nextTransferSeconds;
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
            if (platInfo.line === targetLineId) {
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
        const station = this.#stationData[stationId];
        if (!station) return { distanceMeters: null, transferSeconds: null };

        const isWalkway = (station.properties?.station_type || station.station_type) === "walkway";
        const isInterchange = (station.properties?.station_type || station.station_type) === "interchange" || (station.lines && station.lines.length > 1);

        let distanceMeters = null;

        // 1. जब 2 अलग-अलग वॉकवे स्टेशन हों (उदा: Noida Sec 51 <-> Sec 52 Skywalk)
        if (nextStationId && this.#stationData[nextStationId] && stationId !== nextStationId) {
            const nextStation = this.#stationData[nextStationId];
            const isNextWalkway = (nextStation.properties?.station_type || nextStation.station_type) === "walkway";
            if (isWalkway && isNextWalkway) {
                distanceMeters = getDistance(station, nextStation);
            }
        }

        // 2. स्टेशन के अंदर इंटरचेंज (उदा: Kashmere Gate / Rajiv Chowk)
        if (!distanceMeters || distanceMeters <= 0) {
            const propDist = station.properties?.walkway_distance_meters || station.properties?.interchange_distance_meters;
            if (propDist) {
                distanceMeters = propDist;
            } else if (isWalkway) {
                distanceMeters = 400; // स्काईवॉक (~5 मिनट)
            } else if (isInterchange) {
                distanceMeters = 200; // वर्टिकल क्रॉसओवर (~2.5 मिनट)
            }
        }

        if (!distanceMeters || distanceMeters <= 0 || !this.#walkingSpeed) {
            return { distanceMeters: 0, transferSeconds: 0 };
        }

        const transferSeconds = Math.round((distanceMeters * 60) / this.#walkingSpeed);
        return { distanceMeters, transferSeconds };
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