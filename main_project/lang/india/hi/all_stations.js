// /lang/hi/all_stations.js
export default {
	meta: {
		title: "सभी स्टेशन निर्देशिका | यात्रा-मार्ग",
		desc: "सभी मेट्रो स्टेशन, लाइन्स, प्रथम व अंतिम ट्रेन का समय और पारगमन सुविधाएं देखें।"
	},
	controls: {
		searchPlaceholder: "स्टेशन, स्थल या कोड खोजें (उदा: राजीव चौक, AIIMS)...",
		searchAria: "स्टेशन या स्थल खोजें",
		clearSearchAria: "खोज साफ़ करें",
		filterGroupAria: "लाइन अनुसार फ़िल्टर करें",
		allLines: "सभी लाइन्स",
		loading: "स्टेशन निर्देशिका लोड हो रही है..."
	},
	results: {
		stationCount: "{count} स्टेशन",
		singleStationCount: "1 स्टेशन",
		noStationsFound: "🔍 कोई स्टेशन नहीं मिला",
		noStationQueryMsg: "आपकी खोज \"{query}\" से मेल खाता कोई स्टेशन नहीं मिला।"
	},
	badges: {
		underground: "भूमिगत",
		elevated: "एलिवेटेड",
		atGrade: "समतल",
		interchange: "इंटरचेंज",
		coachAria: "{name} स्टेशन विवरण"
	}
};