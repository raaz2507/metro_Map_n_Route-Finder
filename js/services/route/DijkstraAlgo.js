/**
 * 🚇 Dijkstra Algorithm - Pure State-Space Graph Solver
 * Enterprise ES2022 OOP Class with Private Encapsulation (#)
 * 
 * विशेषताएँ:
 * 1. State-Space Platform Routing: 'stationId-line' के आधार पर इंटरचेंज और पाथ को ट्रैक करता है।
 * 2. Binary Min-Heap Priority Queue: O((V + E) log V) टाइम कॉम्प्लेक्सिटी में तेज़ पाथफाइंडिंग।
 * 3. Dual Route Modes:
 *    - 'leastTransfers': न्यूनतम इंटरचेंज (कम से कम ट्रेन बदलना)।
 *    - 'shortestDistance': न्यूनतम भौगोलिक दूरी (किमी/मीटर)।
 */

class PriorityQueue {
	#heap = [];

	push(node) {
		this.#heap.push(node);
		this.#bubbleUp();
	}

	pop() {
		if (this.isEmpty()) return null;
		const top = this.#heap[0];
		const bottom = this.#heap.pop();
		if (this.#heap.length > 0) {
			this.#heap[0] = bottom;
			this.#bubbleDown();
		}
		return top;
	}

	isEmpty() {
		return this.#heap.length === 0;
	}

	#bubbleUp() {
		let index = this.#heap.length - 1;
		while (index > 0) {
			const parentIndex = Math.floor((index - 1) / 2);
			if (this.#heap[index].dist >= this.#heap[parentIndex].dist) break;
			[this.#heap[index], this.#heap[parentIndex]] = [this.#heap[parentIndex], this.#heap[index]];
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
			if (right < length && this.#heap[right].dist < this.#heap[smallest].dist) {
				smallest = right;
			}
			if (smallest === index) break;

			[this.#heap[index], this.#heap[smallest]] = [this.#heap[smallest], this.#heap[index]];
			index = smallest;
		}
	}
}

export class DijkstraAlgo {
	// Private State Fields
	#stationData = null;
	#transfers = null;
	#lines = null;
	#pathCache = new Map();

	// Transfer Penalties (वर्चुअल पेनल्टी जिससे एल्गोरिद्म सही रूट चुने)
	static LEAST_TRANSFER_PENALTY = 1000;      // 1000 मीटर की पेनल्टी ताकि लाइन न बदलनी पड़े
	static SHORT_ROUTE_TRANSFER_PENALTY = 0.5; // 0.5 मीटर की हल्की पेनल्टी ताकि व्यर्थ ट्रांसफर न हो

	/**
	 * @param {Object} stationData - स्टेशनों का डेटा (पड़ोसी स्टेशनों और लाइन्स सहित)
	 * @param {Object} transfers - ट्रांसफर्स का डेटा
	 * @param {Object} lines - लाइन्स का डेटा (स्टेटस चेक करने हेतु)
	 */
	constructor(stationData = {}, transfers = {}, lines = {}) {
		this.updateData(stationData, transfers, lines);
	}


	/**
	 * नया डेटा अपडेट करें और ग्राफ नेबर्स की प्री-कंपाइलेशन करें
	 */
	updateData(stationData, transfers = {}, lines = {}) {
		this.#stationData = stationData || {};
		this.#transfers = transfers || {};
		this.#lines = lines || {};
		this.#pathCache.clear();
		// 🚀 Pre-compile Keys (लूप में स्ट्रिंग एलोकेशन खत्म)
		for (const st of Object.values(this.#stationData)) {
			if (st && st.neighbors && Array.isArray(st.neighbors)) {
				for (const n of st.neighbors) {
					if (!n.targetKey) {
						n.targetKey = `${n.station}-${n.line}`;
					}
				}
			}
		}
	}

	/**
	 * दो स्टेशनों के बीच का सबसे अनुकूल पाथ खोजें
	 * @param {string} startStationId - शुरुआती स्टेशन ID
	 * @param {string} endStationId - अंतिम स्टेशन ID
	 * @param {string} routeType - "leastTransfers" | "shortestDistance"
	 * @param {Object} [options={}] - अतिरिक्त ऑप्शंस (उदा: includeUnderConstruction)
	 * @returns {Object|null} पाथ, दूरी, इंटरचेंज और उपयोग की गई लाइन्स
	 */
	findPath(startStationId, endStationId, routeType = "leastTransfers", options = {}) {
		if (!startStationId || !endStationId || !this.#stationData[startStationId] || !this.#stationData[endStationId]) {
			return null;
		}

		const includeUnderConstruction = options.includeUnderConstruction ?? false;

		// ⚡ 1. Cache Check
		const cacheKey = `${startStationId}:${endStationId}:${routeType}:${includeUnderConstruction ? 1 : 0}`;
		if (this.#pathCache.has(cacheKey)) {
			return this.#pathCache.get(cacheKey);
		}

		// यदि शुरुआती और अंतिम स्टेशन एक ही हों
		if (startStationId === endStationId) {
			const startLines = this.#stationData[startStationId].lines || [];
			const result = {
				path: [startStationId],
				totalDistanceMeters: 0,
				interchanges: 0,
				linesUsed: startLines.length > 0 ? [startLines[0]] : [],
				segments: []
			};
			this.#pathCache.set(cacheKey, result);
			return result;
		}

		const dists = {};
		const prev = {};
		const visited = new Set();
		const queue = new PriorityQueue();

		const startLines = this.#stationData[startStationId].lines || [];
		startLines.forEach((line) => {
			if (!includeUnderConstruction) {
				const lineStatus = this.#lines?.[line]?.status || "operational";
				if (lineStatus !== "operational") return;
			}
			const startKey = `${startStationId}-${line}`;
			dists[startKey] = 0;
			queue.push({
				id: startStationId,
				dist: 0,
				interchanges: 0,
				line: line
			});
		});

		// Fallback: If all lines of start station are under-construction, allow them if user explicitly selected this station
		if (queue.isEmpty() && startLines.length > 0) {
			startLines.forEach((line) => {
				const startKey = `${startStationId}-${line}`;
				dists[startKey] = 0;
				queue.push({
					id: startStationId,
					dist: 0,
					interchanges: 0,
					line: line
				});
			});
		}

		let endNodeReached = null;

		while (!queue.isEmpty()) {
			const curr = queue.pop();
			const currKey = `${curr.id}-${curr.line}`;

			if (visited.has(currKey)) continue;
			visited.add(currKey);

			if (curr.id === endStationId) {
				endNodeReached = curr;
				break;
			}

			const station = this.#stationData[curr.id];
			if (!station || !station.neighbors) continue;

			// 1. 🚂 Track Edges (ट्रेन केवल अपनी लाइन के ट्रैक पर आगे बढ़ेगी)
			for (let i = 0; i < station.neighbors.length; i++) {
				const neighbor = station.neighbors[i];
				if (neighbor.line !== curr.line) continue;

				if (!includeUnderConstruction) {
					const lineStatus = this.#lines?.[neighbor.line]?.status || "operational";
					const destStationStatus = this.#stationData[neighbor.station]?.properties?.status || "operational";
					if (lineStatus !== "operational" || destStationStatus !== "operational") continue;
				}

				const neighborId = neighbor.station;
				const weight = Number(neighbor.distance) || 0;
				const nextKey = neighbor.targetKey || `${neighborId}-${curr.line}`;
				const newDist = curr.dist + weight;

				if (dists[nextKey] === undefined || newDist < dists[nextKey]) {
					dists[nextKey] = newDist;
					prev[nextKey] = {
						parentId: curr.id,
						parentLine: curr.line,
						edgeLine: curr.line,
						isTransfer: false,
						distance: weight
					};

					queue.push({
						id: neighborId,
						dist: newDist,
						interchanges: curr.interchanges,
						line: curr.line
					});
				}
			}

			// 2. 🔄 Transfer Edges (प्लेटफॉर्म बदलाव या वॉकवे - 100% शुद्ध O(1) डिक्शनरी लुकअप)
			const stationTransfers = this.#transfers?.[curr.id]?.[curr.line];
			if (stationTransfers) {
				for (const [targetKey, tData] of Object.entries(stationTransfers)) {
					const [targetStationId, targetLine] = targetKey.split(":");
					const transferDist = Number(tData.distance_meters) || 40;
					const penalty = (routeType === "leastTransfers")
						? DijkstraAlgo.LEAST_TRANSFER_PENALTY
						: DijkstraAlgo.SHORT_ROUTE_TRANSFER_PENALTY;

					const weight = transferDist + penalty;
					const nextKey = `${targetStationId}-${targetLine}`;
					const newDist = curr.dist + weight;

					if (dists[nextKey] === undefined || newDist < dists[nextKey]) {
						dists[nextKey] = newDist;
						prev[nextKey] = {
							parentId: curr.id,
							parentLine: curr.line,
							edgeLine: targetLine,
							isTransfer: true,
							transferData: tData,
							distance: transferDist
						};

						queue.push({
							id: targetStationId,
							dist: newDist,
							interchanges: curr.interchanges + 1,
							line: targetLine
						});
					}
				}
			}
		}

		if (!endNodeReached) return null;

		const finalResult = this.#reconstructPath(startStationId, endStationId, endNodeReached, prev);
		
		if (this.#pathCache.size >= 100) {
			const oldestKey = this.#pathCache.keys().next().value;
			this.#pathCache.delete(oldestKey);
		}
		this.#pathCache.set(cacheKey, finalResult);

		return finalResult;
	}

	/**
	 * बैक-ट्रैकिंग द्वारा सटीक स्टेशन पाथ और वास्तविक दूरी निकालें
	 */
	#reconstructPath(startId, endId, endNode, prev) {
		const path = [];
		const segments = [];
		const linesUsedSet = new Set();
		let tempState = `${endId}-${endNode.line}`;
		let totalRealDistance = 0;

		while (tempState) {
			const parts = tempState.split("-");
			const stationId = parts[0];

			if (path[0] !== stationId) {
				path.unshift(stationId);
			}

			const parentInfo = prev[tempState];
			if (parentInfo) {
				const edgeDist = parentInfo.distance || 0;
				totalRealDistance += edgeDist;
				linesUsedSet.add(parentInfo.edgeLine);

				segments.unshift({
					from: parentInfo.parentId,
					to: stationId,
					fromLine: parentInfo.parentLine,
					toLine: parentInfo.edgeLine,
					line: parentInfo.edgeLine,
					distance: edgeDist,
					isTransfer: parentInfo.isTransfer,
					transferData: parentInfo.transferData || null
				});

				tempState = `${parentInfo.parentId}-${parentInfo.parentLine}`;
			} else {
				tempState = null;
			}
		}

		return {
			path,
			totalDistanceMeters: Math.round(totalRealDistance),
			interchanges: endNode.interchanges,
			linesUsed: Array.from(linesUsedSet),
			segments
		};
	}
}