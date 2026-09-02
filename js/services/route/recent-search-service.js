/**
 * Recent Searches Service - LocalStorage & History Management Class
 * Handles LocalStorage persistence, deduplication (13 items limit),
 * backward compatibility station ID migration, single item deletion, and clearing all.
 */
export class RecentSearchService {
    #storageKey = "metro-recent-searches";
    #maxLimit = 13;
    #metroData;

    constructor(metroData) {
        this.#metroData = metroData;
    }

    /**
     * नाम (Hindi/English/ID) से स्टेशन ढूँढने का हेल्पर
     */
    findStationByName(name) {
        if (!name || !this.#metroData?.stationData) return null;
        const normalized = name.trim().toLowerCase();
        return Object.values(this.#metroData.stationData).find((s) => {
            if (!s) return false;
            const enName = s.name?.en || "";
            const hiName = s.name?.hi || "";
            return (
                enName.toLowerCase() === normalized ||
                hiName.toLowerCase() === normalized ||
                s.id.toLowerCase() === normalized
            );
        });
    }

    /**
     * हाल की खोजों को LocalStorage से फेच करें और ID माइग्रेट करें
     * @returns {Array<Object>}
     */
    getSearches() {
        let searches = [];
        try {
            const stored = localStorage.getItem(this.#storageKey);
            if (stored) {
                searches = JSON.parse(stored);
            }
        } catch (e) {
            console.error("Error loading recent searches", e);
        }

        // पुराने फॉर्मेट को ID आधारित फॉर्मेट में माइग्रेट करना (Backward Compatibility)
        return searches
            .map((item) => {
                if (item.fromId && item.toId) return item;
                const startObj = this.findStationByName(item.from);
                const endObj = this.findStationByName(item.to);
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

        let searches = this.getSearches();

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
        let searches = this.getSearches();
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