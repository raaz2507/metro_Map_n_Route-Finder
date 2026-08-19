import { OpenLocationCode } from "./open_location_code.js";

const olc = new OpenLocationCode();

/**
 * 1. मुख्य मेथड: प्राथमिक लोकेशन एक्सट्रैक्टर (Decimal -> DMS -> Plus Code)
 */
export function getCoordinates(station, defaultPrefix = "7JWV") {
    const loc = station?.location;

    // Priority 1: Decimal (अगर यहाँ डेटा है, तो तुरंत रिटर्न)
    if (loc?.decimal?.lat != null && loc.decimal?.lon != null && loc.decimal?.lat !== "") {
        return {
            lat: Number(loc.decimal.lat),
            lon: Number(loc.decimal.lon)
        };
    }

    // Priority 2: DMS (केवल तब जब Decimal न मिले)
    else if (loc?.dms?.lat && loc?.dms?.lon) {
        return convertDMSToDecimal(loc.dms);
    }

    // Priority 3: Plus Code (केवल तब जब Decimal और DMS दोनों न मिलें)
    else if (loc?.plusCode) {
        return decodePlusCode(loc.plusCode, station?.other?.delhiCode || defaultPrefix);
    }

    // Else Block: जब तीनों में से कहीं भी डेटा न मिले
    else {
        const stName = getStationName(station, "en");
        console.warn(`⚠️ [Location Warning] स्टेशन के कोऑर्डिनेट्स नहीं मिले: "${stName || station?.id}"`);
        return null;
    }
}

/**
 * 2. समर्पित सब-मेथड: DMS को Decimal Coordinates में बदलना
 */
export function convertDMSToDecimal(dmsObj) {
    if (!dmsObj || !dmsObj.lat || !dmsObj.lon) return null;

    const parseDMS = (dmsStr) => {
        const parts = dmsStr.match(/(\d+)°\s*(\d+)'\s*([\d.]+)"\s*([NSEW])/i);
        if (!parts) return null;
        let deg = parseFloat(parts[1]);
        let min = parseFloat(parts[2]);
        let sec = parseFloat(parts[3]);
        let dir = parts[4].toUpperCase();
        let dec = deg + min / 60 + sec / 3600;
        if (dir === 'S' || dir === 'W') dec = -dec;
        return dec;
    };

    const lat = parseDMS(dmsObj.lat);
    const lon = parseDMS(dmsObj.lon);

    return (lat !== null && lon !== null) ? { lat, lon } : null;
}

/**
 * 3. समर्पित सब-मेथड: Plus Code को Latitude/Longitude में बदलना
 */
export function decodePlusCode(plusCodeStr, delhiCode = "7JWV") {
    if (!plusCodeStr) return null;
    try {
        const fullCode = (plusCodeStr.includes("+") && plusCodeStr.length < 10) 
            ? delhiCode + plusCodeStr 
            : plusCodeStr;
            
        const codeArea = olc.decode(fullCode);
        if (codeArea && codeArea.latitudeCenter != null) {
            return {
                lat: codeArea.latitudeCenter,
                lon: codeArea.longitudeCenter
            };
        }
    } catch (e) {
        console.warn(`Failed to decode Plus Code '${plusCodeStr}':`, e);
    }
    return null;
}

/**
 * 4. दो स्टेशनों के बीच की दूरी निकालता है (मीटर में)
 */
export function getDistance(stationA, stationB) {
    if (!stationA || !stationB) return 0;

    const directNeighbor = stationA.neighbors?.find(n => n.station === stationB.id);
    if (directNeighbor && directNeighbor.distance > 0) {
        return directNeighbor.distance;
    }

    const coordA = getCoordinates(stationA);
    const coordB = getCoordinates(stationB);

    if (!coordA || !coordB) return 0;

    const lat1 = coordA.lat;
    const lon1 = coordA.lon;
    const lat2 = coordB.lat;
    const lon2 = coordB.lon;

    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * 
              Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c * 1000);
}

/**
 * 5. पड़ोसियों की दूरी चेक करता है - केवल 0 होने पर ही री-कैलकुलेट करता है
 */
export function calculateNeighborDistance(rawMetroData) {
    if (!rawMetroData?.stationData) return rawMetroData;
    
    Object.values(rawMetroData.stationData).forEach((station) => {
        if (station.neighbors) {
            station.neighbors.forEach((neighbor) => {
                if (neighbor.distance && neighbor.distance > 0) return;

                const nextStation = rawMetroData.stationData[neighbor.station];
                if (nextStation) {
                    neighbor.distance = getDistance(station, nextStation);
                }
            });
        }
    });
    return rawMetroData;
}

/**
 * 6. लोड होते ही 1 बार चलकर location.decimal को 100% पूरा करता है
 */
export function normalizeStationCoordinates(rawMetroData) {
    if (!rawMetroData?.stationData) return rawMetroData;
    const defaultPrefix = rawMetroData.defaults?.defaultPlusCodePrefix || "7JWV";
    
    Object.values(rawMetroData.stationData).forEach((station) => {
        if (!station.location) {
            station.location = { decimal: { lat: "", lon: "" }, plusCode: "", dms: { lat: "", lon: "" } };
        }
        
        const dec = station.location.decimal;
        if (dec?.lat != null && dec?.lon != null && dec?.lat !== "") return;

        const resolvedCoords = getCoordinates(station, defaultPrefix);
        if (resolvedCoords) {
            station.location.decimal = resolvedCoords;
        }
    });

    return rawMetroData;
}

/**
 * 7. स्टेशन का प्रकार (station_type) सुरक्षित रूप से प्राप्त करने का हेल्पर
 */
export function getStationType(station, defaultType = "normal") {
    return station?.properties?.station_type || station?.station_type || defaultType;
}

/**
 * 8. स्टेशन का लेआउट (layout) सुरक्षित रूप से प्राप्त करने का हेल्पर
 */
export function getStationLayout(station, defaultLayout = "elevated") {
    return station?.properties?.layout || station?.layout || defaultLayout;
}

/**
 * 9. मेट्रो लाइन का विवरण प्राप्त करने का हेल्पर (Full Line ID द्वारा)
 */
export function getLineInfo(metroData, lineId) {
    if (!metroData?.lines || !lineId) return null;
    return metroData.lines[lineId] || null;
}

/**
 * 10. स्टेशन का भाषा के अनुसार नाम (English / Hindi) प्राप्त करने का हेल्पर
 */
export function getStationName(station, lang = "en") {
    if (!station) return "";
    if (typeof station.name === "object" && station.name !== null) {
        return station.name[lang] || station.name.en || "";
    }
    return station.name || station.id || "";
}

/**
 * 11. मेट्रो लाइन का भाषा के अनुसार नाम (English / Hindi) प्राप्त करने का हेल्पर
 */
export function getLineName(lineInfo, lang = "en") {
    if (!lineInfo) return "";
    return lineInfo.name?.[lang] || lineInfo.name?.en || lineInfo.label || "";
}