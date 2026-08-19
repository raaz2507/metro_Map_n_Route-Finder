export class RouteFinder {
	#stationData;
	#fareRules;
	#lines;

	static LEAST_TRANSFER_PENALTY = 1000;
	static SHORT_ROUTE_TRANSFER_PENALTY = 0.5;

	constructor(metroData) {
		this.#stationData = metroData.stationData;
		this.#fareRules = metroData.fareRules;
		this.#lines = metroData.lines;
		this.#init();
	}
	#init(){}

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
			return { tokenFare: 0, smartCardFare: 0, offPeakFare: 0, offPeakSmartFare: 0 };
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

		// उत्पाद छूट दरें (Products Discount Percentages)
		const smartCardPct = policy?.products?.smart_card?.discountPercent ?? 10;
		const offPeakPct = policy?.products?.off_peak_smart_card?.discountPercent ?? 10;

		const smartCardFare = Math.round(baseFare * (1 - smartCardPct / 100));
		const offPeakFare = Math.round(baseFare * (1 - offPeakPct / 100));
		const offPeakSmartFare = Math.round(baseFare * (1 - (smartCardPct + offPeakPct) / 100));

		return {
			tokenFare: baseFare,
			smartCardFare: smartCardFare,
			offPeakFare: offPeakFare,
			offPeakSmartFare: offPeakSmartFare
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

		// स्टेप्स एरे और वॉकवे टाइम की गणना
		let totalWalkwayTime = 0;
		let totalWalkwayDistance = 0;
		const steps = [];
		for (let i = 0; i < result.path.length - 1; i++) {
			const currStation = this.#stationData[result.path[i]];
			const nextStationId = result.path[i + 1];
			const neighbor = currStation.neighbors?.find(n => n.station === nextStationId);
			const dist = neighbor ? neighbor.distance : 0;
			const stepTime = (dist / 600) + 0.5;
			steps.push({
				type: "rail",
				from: result.path[i],
				to: nextStationId,
				distance: dist,
				time: Math.round(stepTime * 10) / 10
			});
		}
		// इंटरचेंज ट्रांसफर स्टेप्स
		if (result.interchanges > 0) {
			// इंटरचेंज समय (औसतन 4-5 मिनट प्रति ट्रांसफर)
			totalWalkwayTime = result.interchanges * 5;
		}
		const totalTrainTime = Math.ceil((result.totalDistance / 600) + (result.path.length - 1) * 0.5);
		const totalTime = totalTrainTime + totalWalkwayTime;
		return {
			path: result.path,
			totalDistance: result.totalDistance,      // पटरियों की दूरी (meters)
			totalWalkwayDistance: totalWalkwayDistance,// वॉकवे दूरी (meters)
			totalTrainTime: totalTrainTime,            // ट्रेन का समय (minutes)
			totalWalkwayTime: totalWalkwayTime,        // वॉकवे समय (minutes)
			totalTime: totalTime,                      // कुल यात्रा समय (minutes)
			interchanges: result.interchanges,
			totalFare: totalFare,                      // 4 किरायों का ऑब्जेक्ट
			steps: steps
		};
	}

	/**
	 * कुल दूरी (मीटर), स्टेशनों की संख्या और इंटरचेंज के आधार पर सटीक यात्रा समय (Minutes) निकालता है।
	 */
	#calculateTime(distanceInMeters, stationCount, interchanges) {
		if (stationCount <= 1) return 0;
		// 1. ट्रेन की वास्तविक मूविंग टाइमिंग (36 km/h = 600m/min)
		const movingMinutes = distanceInMeters / 600;
		// 2. हर स्टेशन पर 30 सेकंड (0.5 मिनट) का हॉल्ट/रुकने का समय
		const haltMinutes = (stationCount - 1) * 0.5;
		// 3. इंटरचेंज ट्रांसफर का औसतन समय (4 मिनट प्रति इंटरचेंज)
		const transferMinutes = interchanges * 4;
		// कुल समय (पूर्णांक में राउंड ऑफ)
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