/**
 * Recent Searches Service - LocalStorage & History Management Class
 * Handles LocalStorage persistence, deduplication (13 items limit),
 * backward compatibility station ID migration, single item deletion, and clearing all.
 */
export class RecentSearchService {
	#baseStorageKey = "metro-recent-searches";
	#maxLimit = 13;
	#metroData;
	#cityKey;
	#stationNameIndex = null; // 🚀 O(1) Lookup Cache for Memory Optimization

	constructor(metroData, cityKey = "delhi_ncr") {
		this.#metroData = metroData;
		this.#cityKey = cityKey;
	}

	get #storageKey() {
		return `${this.#baseStorageKey}-${this.#cityKey}`;
	}

	/**
	 * 🏗️ वन-टाइम इंडेक्स बिल्डर (Garbage Collection Churn रोकने के लिए)
	 */
	#buildIndex() {
		this.#stationNameIndex = new Map();
		if (!this.#metroData?.stationData) return;
		
		for (const [id, st] of Object.entries(this.#metroData.stationData)) {
			if (!st) continue;
			this.#stationNameIndex.set(id.toLowerCase(), st);
			if (st.name?.en) this.#stationNameIndex.set(st.name.en.toLowerCase().trim(), st);
			if (st.name?.hi) this.#stationNameIndex.set(st.name.hi.toLowerCase().trim(), st);
		}
	}

	/**
	 * ⚡ नाम (Hindi/English/ID) से स्टेशन ढूँढने का O(1) हेल्पर
	 */
	findStationByName(name) {
		if (!name || !this.#metroData?.stationData) return null;
		
		// अगर इंडेक्स अभी तक नहीं बना है, तो सिर्फ पहली बार बनाएँ
		if (!this.#stationNameIndex) {
			this.#buildIndex();
		}
		
		const normalized = name.trim().toLowerCase();
		return this.#stationNameIndex.get(normalized) || null;
	}

	/**
	 * हाल की खोजों को LocalStorage से फेच करें और ID माइग्रेट करें
	 * @returns {Array<Object>}
	 */
	getSearches() {
		let searches = [];
		try {
			const scopedKey = this.#storageKey;
			let stored = localStorage.getItem(scopedKey);
			
			if (stored) {
				searches = JSON.parse(stored);
			} else {
				const legacyStored = localStorage.getItem(this.#baseStorageKey);
				if (legacyStored) {
					const legacySearches = JSON.parse(legacyStored);
					searches = legacySearches.filter(item => {
						const startObj = this.findStationByName(item.fromId || item.from);
						const endObj = this.findStationByName(item.toId || item.to);
						return startObj && endObj;
					});
					if (searches.length > 0) {
						localStorage.setItem(scopedKey, JSON.stringify(searches));
					}
				}
			}
		} catch (e) {
			console.error("Error loading recent searches", e);
		}

		return searches
			.map((item) => {
				let startObj, endObj;
				if (item.fromId && item.toId) {
					startObj = this.#metroData?.stationData?.[item.fromId];
					endObj = this.#metroData?.stationData?.[item.toId];
				} else {
					startObj = this.findStationByName(item.from);
					endObj = this.findStationByName(item.to);
				}
				
				return {
					fromId: startObj ? startObj.id : null,
					toId: endObj ? endObj.id : null,
					count: item.count || 1,
					timestamp: item.timestamp || Date.now(),
				};
			})
			.filter((item) => item.fromId && item.toId);
	}

	/**
	 * नया रूट सहेजें (Deduplication + 13 Record Limit)
	 */
	saveSearch(fromVal, toVal) {
		if (!fromVal || !toVal) return;

		const startStation = this.findStationByName(fromVal);
		const endStation = this.findStationByName(toVal);
		if (!startStation || !endStation) return;

		// 🐛 BUG FIX: UI वाली फ़िल्टर्ड लिस्ट के बजाय सीधे localStorage से रॉ डेटा (Raw Data) पढ़ें
		let searches = [];
		try {
			const stored = localStorage.getItem(this.#storageKey);
			if (stored) searches = JSON.parse(stored);
		} catch (e) {}

		const existingIndex = searches.findIndex(
			(item) => item.fromId === startStation.id && item.toId === endStation.id
		);

		if (existingIndex > -1) {
			searches[existingIndex].count = (searches[existingIndex].count || 1) + 1;
			searches[existingIndex].timestamp = Date.now();
			const item = searches.splice(existingIndex, 1)[0];
			searches.unshift(item);
		} else {
			searches.unshift({
				fromId: startStation.id,
				toId: endStation.id,
				count: 1,
				timestamp: Date.now(),
			});
		}

		if (searches.length > this.#maxLimit) {
			searches = searches.slice(0, this.#maxLimit);
		}

		localStorage.setItem(this.#storageKey, JSON.stringify(searches));
	}

	/**
	 * एक विशिष्ट रूट हटाएं
	 */
	deleteSearch(fromId, toId) {
		// 🐛 BUG FIX: डिलीट करते समय भी रॉ डेटा (Raw Data) ही पढ़ें ताकि दूसरे नेटवर्क का डेटा न उड़े
		let searches = [];
		try {
			const stored = localStorage.getItem(this.#storageKey);
			if (stored) searches = JSON.parse(stored);
		} catch (e) {}
		
		searches = searches.filter(
			(item) => !(item.fromId === fromId && item.toId === toId)
		);
		localStorage.setItem(this.#storageKey, JSON.stringify(searches));
	}

	/**
	 * पूरी हिस्ट्री साफ़ करें
	 */
	clearAll() {
		localStorage.removeItem(this.#storageKey);
	}
}