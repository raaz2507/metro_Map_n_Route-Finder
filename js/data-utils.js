import { OpenLocationCode } from "./open_location_code.js";

/**
 * मेट्रो डेटा को प्री-प्रोसेस करता है (Plus Codes डिकोड करना और दूरियां मापना)
 * @param {Object} rawMetroData - raw JSON data
 * @returns {Object} processed metro data
 */


// 1. Plus Codes को Latitude/Longitude में बदलें
export function plusCode2Coordinates(rawMetroData) {
	const olc = new OpenLocationCode();
	const delhiCode = "";//rawMetroData.other?.delhiCode || "";
	
	Object.values(rawMetroData.stationData).forEach((station) => {	
		station.coordinates = olc.decode(delhiCode + station.plusCode);
	});
	return rawMetroData;
}

// 2. दो कोऑर्डिनेट्स के बीच की दूरी (km में) निकालने के लिए हेल्पर
function getDistance(stationA, stationB) {
	if (!stationA.coordinates || !stationB.coordinates) {
		console.log(`codinate not found ${stationA.coordinates || !stationB.coordinates}`);
		return 0;
	}

	const lat1 = stationA.coordinates.latitudeCenter;
	const lon1 = stationA.coordinates.longitudeCenter;

	const lat2 = stationB.coordinates.latitudeCenter;
	const lon2 = stationB.coordinates.longitudeCenter;

	const R = 6371; // Earth radius in km
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;

	// prettier-ignoure
	const a =Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return Number((R * c).toFixed(2));
}

// 3. सभी स्टेशन के पड़ोसियों (neighbors) के बीच की दूरी निकालें
export function calculateNeighborDistance(rawMetroData) {
	Object.values(rawMetroData.stationData).forEach((station) => {
		station.neighbors.forEach((neighbor) => {
			const nextStation = rawMetroData.stationData[neighbor.station];
			if (nextStation) {
				neighbor.distance = getDistance(station, nextStation);
			}
		});
	});
	return rawMetroData;
}
