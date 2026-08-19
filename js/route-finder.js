import { getDistance } from "./data-utils.js";

export class RouteFinder {
	#stationData;
	#fareRules;
	#lines;
	#networks;
	#walkingSpeed;
	static LEAST_TRANSFER_PENALTY = 1000;
	static SHORT_ROUTE_TRANSFER_PENALTY = 0.5;
	constructor(metroData) {
		this.#stationData = metroData.stationData;
		this.#fareRules = metroData.fareRules;
		this.#lines = metroData.lines;
		this.#networks = metroData.fareRules?.networks || {};
		this.#walkingSpeed = metroData.avgHumanWalkingSpeedMetersPerMin || 80;
		this.#init();
	}
	#init(){}

    // नेटवर्क स्पीड और हॉल्ट प्राप्त करने वाला हेल्पर मेथड
	#getNetworkParams(lineId) {
		const line = this.#lines?.[lineId];
		const networkKey = line?.network || "dmrc";
		const netConfig = this.#networks[networkKey] || {};
		return {
			speed: netConfig.avgSpeedMetersPerMin || 600,
			halt: netConfig.stationHaltMinutes ?? 0.5
		};
	}

		/**
	 * यूनिफाइड ट्रांसफर समय कैलकुलेटर
	 */
	#calculateStationTransferSeconds(stationId, nextStationId = null) {
		const station = this.#stationData?.[stationId];
		if (!station) return { distanceMeters: null, transferSeconds: null };

		const isWalkway = (station.properties?.station_type || station.station_type) === "walkway";
		const isInterchange = (station.properties?.station_type || station.station_type) === "interchange" || (station.lines && station.lines.length > 1);

		let distanceMeters = null;

		// 1. केवल तब getDistance चलाएं जब 2 स्टेशन्स वास्तव में अलग-अलग हों (जैसे Noida Sec 51 ↔ Sec 52)
		if (nextStationId && this.#stationData[nextStationId] && stationId !== nextStationId) {
			const nextStation = this.#stationData[nextStationId];
			// यदि nextStation भी एक अलग वॉकवे स्टेशन है
			const isNextWalkway = (nextStation.properties?.station_type || nextStation.station_type) === "walkway";
			if (isWalkway && isNextWalkway) {
				distanceMeters = getDistance(station, nextStation);
			}
		}

		// 2. यदि एक ही स्टेशन बिल्डिंग के अंदर ट्रांसफर है (उदा: Welcome / Kashmere Gate / Rajouri Garden):
		if (!distanceMeters || distanceMeters <= 0) {
			const stationDist = station.properties?.walkway_distance_meters 
				|| station.properties?.interchange_distance_meters;

			if (stationDist) {
				distanceMeters = stationDist;
			} else if (isWalkway) {
				distanceMeters = 400; // Walkway Skywalk (~5 min)
			} else if (isInterchange) {
				distanceMeters = 200; // Normal Vertical Crossover (~3 min)
			}
		}

		// 3. यदि कोई भी कंडीशन मैच न हो -> Return null
		if (!distanceMeters || distanceMeters <= 0 || !this.#walkingSpeed || this.#walkingSpeed <= 0) {
			return { distanceMeters: null, transferSeconds: null };
		}

		// 4. Pure Dynamic Seconds Calculation = Math.round((distanceMeters * 60) / walkingSpeed)
		const transferSeconds = Math.round((distanceMeters * 60) / this.#walkingSpeed);

		return {
			distanceMeters,
			transferSeconds
		};
	}

	/**
	 * UI / External Callers के लिए पब्लिक मेथड
	 */
	getStationTransferData(stationId, nextStationId = null) {
		return this.#calculateStationTransferSeconds(stationId, nextStationId);
	}
	/**
	 * Start और End स्टेशन के बीच का रूट ढूंढता है।
	 * @param {string} startName - शुरुआती स्टेशन का नाम (English, Hindi या ID)
	 * @param {string} endName - अंतिम स्टेशन का नाम (English, Hindi या ID)
	 * @param {string} routeType - "shortestDistance" या "leastTransfers"
	 * @returns {Object|null} रूट के विवरण का ऑब्जेक्ट या null
	 */

	/**
	 * इनपुट नाम (English/Hindi/ID) को स्टेशन ID में बदलता है।
	 */
	#findStationIdByName(name) {
		if (!name) return null;
		const normalizedInput = name.trim().toLowerCase();

		const station = Object.values(this.#stationData).find((s) => {
			if (!s) return false;
			const enName = s.name?.en || "";
			const hiName = s.name?.hi || "";
			return (
				enName.toLowerCase() === normalizedInput ||
				hiName.toLowerCase() === normalizedInput ||
				s.id.toLowerCase() === normalizedInput
			);
		});
		return station ? station.id : null;
	}

	/**
	 * State-Space Dijkstra Algorithm (Dijkstra at station-line platform level)
	 */
	#runDijkstra(startId, endId, routeType) {
		const dists = {}; // Key: "stationId-line" -> Distance
		const prev = {}; // Key: "stationId-line" -> { parentId, parentLine, edgeLine }
		const visited = new Set();
		const queue = new PriorityQueue(); // Array-based Priority Queue

		// 1. शुरुआती स्टेशन के सभी संभव लाइनों के प्लेटफॉर्म्स को कतार में डालें
		const startLines = this.#stationData[startId].lines || [];
		startLines.forEach((line) => {
			const startKey = `${startId}-${line}`;
			dists[startKey] = 0;
			queue.push({
				id: startId,
				dist: 0,
				interchanges: 0,
				line: line,
			});
		});

		let endNodeReached = null;

		// 2. Dijkstra Loop
		while (!queue.isEmpty()) {
			const curr = queue.pop();

			const currKey = `${curr.id}-${curr.line}`;
			if (visited.has(currKey)) continue;
			visited.add(currKey);

			// गंतव्य स्टेशन पर पहुँच गए
			if (curr.id === endId) {
				endNodeReached = curr;
				break;
			}

			const station = this.#stationData[curr.id];
			if (!station || !station.neighbors) continue;

			station.neighbors.forEach((neighbor) => {
				const neighborId = neighbor.station;
				const edgeLine = neighbor.line;

				// क्या प्लेटफॉर्म/लाइन बदलना पड़ रहा है?
				const isTransfer = curr.line !== edgeLine;

				let weight = neighbor.distance;
				let transferCost = 0;

				if (isTransfer) {
					transferCost = 1;
					if (routeType === "leastTransfers") {
						// "Less Interchange" के लिए: प्रत्येक लाइन ट्रांसफर पर 1000 किमी का भारी जुर्माना (penalty)
						weight += RouteFinder.LEAST_TRANSFER_PENALTY;
					} else {
						// "Shortest Distance" के लिए: ट्रांसफर पर थोड़ा पेनल्टी (+0.5 किमी) ताकि फालतू ट्रांसफर न हो
						weight += RouteFinder.SHORT_ROUTE_TRANSFER_PENALTY;
					}
				}

				const nextKey = `${neighborId}-${edgeLine}`;
				const newDist = curr.dist + weight;

				if (dists[nextKey] === undefined || newDist < dists[nextKey]) {
					dists[nextKey] = newDist;
					prev[nextKey] = {
						parentId: curr.id,
						parentLine: curr.line,
						edgeLine: edgeLine,
					};

					queue.push({
						id: neighborId,
						dist: newDist,
						interchanges: curr.interchanges + transferCost,
						line: edgeLine,
					});
				}
			});
		}

		if (!endNodeReached) return null;

		// 3. पाथ री-कंस्ट्रक्शन (Path Reconstruction)
		const path = [];
		let tempState = `${endId}-${endNodeReached.line}`;
		let totalDistance = 0;

		while (tempState) {
			const parts = tempState.split("-");
			const stationId = parts[0];

			// पाथ में डुप्लीकेट नाम न आएं (जैसे ट्रांसफर के दौरान एक ही स्टेशन का नाम दोबारा आना)
			if (path[0] !== stationId) {
				path.unshift(stationId);
			}

			const parentInfo = prev[tempState];
			if (parentInfo) {
				// दो स्टेशनों के बीच की वास्तविक भौगोलिक दूरी जोड़ें (बिना किसी पेनल्टी के)
				const parentStation = this.#stationData[parentInfo.parentId];
				const edge = parentStation.neighbors.find(
					(n) => n.station === stationId && n.line === parentInfo.edgeLine,
				);
				if (edge) {
					totalDistance += edge.distance;
				}
				tempState = `${parentInfo.parentId}-${parentInfo.parentLine}`;
			} else {
				tempState = null;
			}
		}

		return {
			path,
			totalDistance,
			interchanges: endNodeReached.interchanges,
		};
	}

	/**
	 * data.json के पॉलिसी-बेस्ड नियमों के अनुसार dynamic किराया निकालता है।
	 */
	#calculateFare(distanceInMeters, startId, endId) {
		// 1. एयरपोर्ट एक्सप्रेस फेयर मैट्रिक्स जाँचें (Station-Pair Fare)
		const airportMatrix = this.#fareRules?.policies?.airport_express?.fareMatrix;
		if (startId && endId && airportMatrix?.[startId]?.[endId] != null) {
			const baseFare = airportMatrix[startId][endId];
			return {
				tokenFare: baseFare,
				smartCardFare: baseFare,
				offPeakFare: baseFare,
				offPeakSmartFare: baseFare
			};
		}

		// 2. मानक DMRC दूरी-आधारित किराया (dmrc_standard)
		const policy = this.#fareRules?.policies?.dmrc_standard;
		const slabs = policy?.fareTables?.weekday || [];
		
		if (!slabs.length) {
			console.warn("⚠️ [Fare Warning] No fare slabs found for policy.");
			return { tokenFare: null, smartCardFare: null, offPeakFare: null, offPeakSmartFare: null };
		}

		const distanceKm = Number((distanceInMeters / 1000).toFixed(2));
		let baseFare = slabs.at(-1).fare;

		for (const slab of slabs) {
			if (slab.maxKm === null) {
				if (distanceKm >= slab.minKm) {
					baseFare = slab.fare;
					break;
				}
			} else if (distanceKm >= slab.minKm && distanceKm < slab.maxKm) {
				baseFare = slab.fare;
				break;
			}
		}

		// उत्पाद छूट दरें (Products Discount Percentages - Fallback is 0%)
		const smartCardPct = policy?.products?.smart_card?.discountPercent ?? 0;
		const offPeakPct = policy?.products?.off_peak_smart_card?.discountPercent ?? 0;

		const smartCardFare = Math.round(baseFare * (1 - smartCardPct / 100));
		const offPeakFare = Math.round(baseFare * (1 - offPeakPct / 100));
		const offPeakSmartFare = Math.round(baseFare * (1 - (smartCardPct + offPeakPct) / 100));

		return {
			tokenFare: baseFare,
			smartCardFare: smartCardFare,
			offPeakFare: offPeakFare,
			offPeakSmartFare: offPeakSmartFare,
			smartCardPct: smartCardPct,
			offPeakPct: offPeakPct,
			offPeakSmartPct: smartCardPct + offPeakPct
		};
	}

	findRoute(startName, endName, routeType = "shortestDistance") {
		const startId = this.#findStationIdByName(startName);
		const endId = this.#findStationIdByName(endName);
		if (!startId || !endId) return null;
		if (startId === endId) {
			return {
				path: [startId],
				totalDistance: 0,
				totalWalkwayDistance: 0,
				totalTrainTime: 0,
				totalWalkwayTime: 0,
				totalTime: 0,
				interchanges: 0,
				totalFare: { tokenFare: 0, smartCardFare: 0, offPeakFare: 0, offPeakSmartFare: 0 },
				steps: []
			};
		}
		const result = this.#runDijkstra(startId, endId, routeType);
		if (!result) return null;

		// DMRC NORM: किराया हमेशा Shortest Distance से ही तय रहेगा
		let shortestResult = result;
		if (routeType !== "shortestDistance") {
			shortestResult = this.#runDijkstra(startId, endId, "shortestDistance") || result;
		}
		const totalFare = this.#calculateFare(shortestResult.totalDistance, startId, endId);

				// स्टेप्स एरे, ट्रेन टाइम (Seconds) और वॉकवे टाइम (Seconds) की dynamic गणना
		let totalTrainSeconds = 0;
		let totalWalkwaySeconds = 0;
		let totalWalkwayDistance = 0;
		let hasMissingInterchangeData = false;
		const steps = [];

		for (let i = 0; i < result.path.length - 1; i++) {
			const currStationId = result.path[i];
			const nextStationId = result.path[i + 1];
			const currStation = this.#stationData[currStationId];
			const neighbor = currStation.neighbors?.find(n => n.station === nextStationId);
			const dist = neighbor ? neighbor.distance : 0;
			
			const netParams = this.#getNetworkParams(neighbor?.line);
			// ट्रेन समय (सेकंड्स में)
			const stepSeconds = Math.round(((dist / netParams.speed) + netParams.halt) * 60);
			totalTrainSeconds += stepSeconds;

			steps.push({
				type: "rail",
				from: currStationId,
				to: nextStationId,
				line: neighbor?.line,
				distance: dist,
				timeSeconds: stepSeconds,
				timeMinutes: Math.round((stepSeconds / 60) * 10) / 10
			});

						// यदि यह एक इंटरचेंज स्टेशन है
			if (i < result.path.length - 2) {
				const nextNeighbor = this.#stationData[nextStationId]?.neighbors?.find(n => n.station === result.path[i + 2]);
				if (neighbor && nextNeighbor && neighbor.line !== nextNeighbor.line) {
					const nextStationAfterTransfer = result.path[i + 2] || null;
					const transferData = this.#calculateStationTransferSeconds(nextStationId, nextStationAfterTransfer);
					if (transferData.transferSeconds !== null) {
						totalWalkwaySeconds += transferData.transferSeconds;
						totalWalkwayDistance += (transferData.distanceMeters || 0);
					} else {
						hasMissingInterchangeData = true;
					}

					steps.push({
						type: "transfer",
						atStation: nextStationId,
						fromLine: neighbor.line,
						toLine: nextNeighbor.line,
						distanceMeters: transferData.distanceMeters,
						transferSeconds: transferData.transferSeconds
					});
				}
			}
		}

		const totalTrainTimeMinutes = Math.ceil(totalTrainSeconds / 60);
		const totalWalkwayTimeMinutes = hasMissingInterchangeData && totalWalkwaySeconds === 0 
			? null 
			: Math.ceil(totalWalkwaySeconds / 60);

		const totalTimeSeconds = totalTrainSeconds + totalWalkwaySeconds;
		const totalTimeMinutes = Math.ceil(totalTimeSeconds / 60);

		return {
			path: result.path,
			totalDistance: result.totalDistance,       // पटरियों की दूरी (meters)
			totalWalkwayDistance: totalWalkwayDistance, // वॉकवे दूरी (meters)
			totalTrainTime: totalTrainTimeMinutes,     // ट्रेन का समय (minutes)
			totalWalkwayTime: totalWalkwayTimeMinutes, // वॉकवे समय (minutes)
			totalTime: totalTimeMinutes,               // कुल यात्रा समय (minutes)
			totalTimeSeconds: totalTimeSeconds,         // कुल समय (seconds)
			totalTrainSeconds: totalTrainSeconds,       // कुल ट्रेन समय (seconds)
			totalWalkwaySeconds: totalWalkwaySeconds,   // कुल वॉकवे समय (seconds)
			interchanges: result.interchanges,
			totalFare: totalFare,                       // 4 किरायों का ऑब्जेक्ट
			steps: steps
		};
	}

	#calculateTime(distanceInMeters, stationCount, interchanges, lineId = null) {
		if (stationCount <= 1) return 0;
		const netParams = this.#getNetworkParams(lineId);
		const movingMinutes = distanceInMeters / netParams.speed;
		const haltMinutes = (stationCount - 1) * netParams.halt;
		const transferMinutes = Math.ceil((interchanges * 200) / this.#walkingSpeed);
		return Math.ceil(movingMinutes + haltMinutes + transferMinutes);
	}
}

class PriorityQueue {
	#heap = [];

	size() {
		return this.#heap.length;
	}

	isEmpty() {
		return this.#heap.length === 0;
	}

	push(item) {
		this.#heap.push(item);
		this.#bubbleUp();
	}

	pop() {
		if (this.#heap.length === 0) return null;

		if (this.#heap.length === 1) {
			return this.#heap.pop();
		}

		const min = this.#heap[0];

		this.#heap[0] = this.#heap.pop();
		this.#bubbleDown();

		return min;
	}

	#bubbleUp() {
		let index = this.#heap.length - 1;

		while (index > 0) {
			const parentIndex = Math.floor((index - 1) / 2);

			if (this.#heap[parentIndex].dist <= this.#heap[index].dist) {
				break;
			}

			[this.#heap[parentIndex], this.#heap[index]] = [
				this.#heap[index],
				this.#heap[parentIndex],
			];

			index = parentIndex;
		}
	}

	#bubbleDown() {
		let index = 0;
		const length = this.#heap.length;

		while (true) {
			let smallest = index;

			const left = index * 2 + 1;
			const right = index * 2 + 2;

			if (left < length && this.#heap[left].dist < this.#heap[smallest].dist) {
				smallest = left;
			}

			if ( right < length && this.#heap[right].dist < this.#heap[smallest].dist) {
				smallest = right;
			}

			if (smallest === index) {
				break;
			}

			[
				this.#heap[index], 
				this.#heap[smallest]] = [this.#heap[smallest], 
				this.#heap[index],
			];

			index = smallest;
		}
	}
}