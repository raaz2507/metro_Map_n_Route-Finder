export class RouteFinder {
	#stationData;
	#fareRules;
	#lineColors;

	static LEAST_TRANSFER_PENALTY = 1000;
	static SHORT_ROUTE_TRANSFER_PENALTY = 0.5;

	constructor(metroData) {
		this.#stationData = metroData.stationData;
		this.#fareRules = metroData.fareRules;
		this.#lineColors = metroData.line_color;
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
	findRoute(startName, endName, routeType = "shortestDistance") {
		const startId = this.#findStationIdByName(startName);
		const endId = this.#findStationIdByName(endName);

		if (!startId || !endId) {
			console.error(
				`Stations not found. Start: ${startName} -> ${startId}, End: ${endName} -> ${endId}`,
			);
			return null;
		}

		// यदि शुरुआत और अंत स्टेशन एक ही हैं
		if (startId === endId) {
			return {
				path: [startId],
				totalDistance: 0,
				totalFare: 0,
				totalTime: 0,
				interchanges: 0,
			};
		}

		const result = this.#runDijkstra(startId, endId, routeType);
		if (!result) return null;

		const totalFare = this.#calculateFare(result.totalDistance);
		const totalTime = this.#calculateTime(
			result.path.length,
			result.interchanges,
		);

		return {
			path: result.path,
			totalDistance: Number(result.totalDistance.toFixed(2)),
			totalFare: totalFare,
			totalTime: totalTime,
			interchanges: result.interchanges,
		};
	}

	/**
	 * इनपुट नाम (English/Hindi/ID) को स्टेशन ID में बदलता है।
	 */
	#findStationIdByName(name) {
		if (!name) return null;
		const normalizedInput = name.trim().toLowerCase();

		const station = Object.values(this.#stationData).find(
			(s) =>
				s.name.toLowerCase() === normalizedInput ||
				s.id.toLowerCase() === normalizedInput ||
				(s.name_hi && s.name_hi.toLowerCase() === normalizedInput),
		);
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
			// कतार को सॉर्ट करें (न्यूनतम दूरी वाला नोड पहले निकालने के लिए - min-heap की तरह)
			// queue.sort((a, b) => a.dist - b.dist);
			// const curr = queue.shift();
			// const queue = [];
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
	 * fareRules.slabs के अनुसार दूरी आधारित किराया निकालता है।
	 */
	#calculateFare(distance) {
		const slabs = this.#fareRules?.slabs;

		if (!slabs?.length) {
			return 0;
		}

		distance = Number(distance.toFixed(2));

		for (const slab of slabs) {
			if ( distance >= slab.minKm && distance < slab.maxKm ) {
				return slab.fare;
			}
		}

		return slabs.at(-1).fare;
	}

	/**
	 * औसत समय की गणना करता है (2 मिनट प्रति स्टेशन + 5 मिनट प्रति इंटरचेंज)।
	 */
	#calculateTime(stationCount, interchanges) {
		if (stationCount <= 1) return 0;
		return (stationCount - 1) * 2 + interchanges * 5;
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
