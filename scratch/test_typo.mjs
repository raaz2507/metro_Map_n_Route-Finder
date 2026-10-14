import { StationSearchEngine } from "../main_project/js/services/search/StationSearchEngine.js";

const mockMetroData = {
	stationData: {
		"kashmere_gate": {
			id: "kashmere_gate",
			name: { en: "Kashmere Gate", hi: "कश्मीरी गेट" }
		},
		"rohini_east": {
			id: "rohini_east",
			name: { en: "Rohini East", hi: "रोहिणी पूर्व" }
		},
		"rohini_west": {
			id: "rohini_west",
			name: { en: "Rohini West", hi: "रोहिणी पश्चिम" }
		},
		"rohini_sector_18_19": {
			id: "rohini_sector_18_19",
			name: { en: "Rohini Sector 18-19", hi: "रोहिणी सेक्टर 18-19" }
		}
	}
};

const engine = new StationSearchEngine(mockMetroData);

console.log("1. Exact rohini:", engine.search("rohini").map(s => s.id));
console.log("2. Typo rohoni:", engine.search("rohoni").map(s => s.id));
console.log("3. Typo rohinie:", engine.search("rohinie").map(s => s.id));
console.log("4. Typo kashmiri gate:", engine.search("kashmiri gate").map(s => s.id));
