// /lang/hi.js

export default {
	meta: {
		title: "यात्रा-मार्ग ",
		ogTitle: "मानचित्र • मार्ग • किराया • यात्रा सहायता",
		ogDescription: "आसानी से सर्वश्रेष्ठ मेट्रो मार्ग, टिकट किराया, यात्रा समय और मध्यवर्ती स्टेशन खोजें।",
		twitterTitle: "मानचित्र • मार्ग • किराया • यात्रा सहायता",
		twitterDescription: "आसानी से सर्वश्रेष्ठ मेट्रो मार्ग, टिकट किराया, यात्रा समय और मध्यवर्ती स्टेशन खोजें।"
	},

	header: {
		appName: "यात्रा-मार्ग ",
		tagLine : "मानचित्र • मार्ग • किराया • यात्रा-सहायता",
		language: "भाषा:",
		
		themes: {
			label: "थीम:",
			light: "क्लासिक लाइट",
			dark: "स्लीक डार्क",
			cyberpunk: "नियॉन साइबरपंक",
			vintage: "विंटेज रेट्रो",
			mint: "फॉरेस्ट मिंट",
			ghibli: "जिब्ली नॉस्टैल्जिया"
		}
	},

	"nav-header": {
		networks: "🌐 नेटवर्क",
		home: "🏠 होम",
		stations: "🚉 स्टेशन",
		recharge: "💳 कार्ड रीचार्ज",
		others: "🗂️ अन्य",
		help: "❓ सहायता",
		about: "ℹ️ जानकारी"
	},

	"nav-sidebar": {
		recent: "हालिया",
		map: "मानचित्र",
		setting: "सेटिंग"
	},

	"nav-floating": {
		alarm: "अलार्म",
		ticket: "टिकट"
	},

	footer: {
		footerNavigation: "नेविगेशन",
		about: "जानकारी",
		bookTicket: "टिकट बुक करें",
		github: "गिटहब",
		appTitle: "मेट्रो मैप जनरेटर",
		qrDescription: "अपने मोबाइल डिवाइस पर इस एप्लिकेशन को जल्दी से खोलने के लिए क्यूआर कोड स्कैन करें।",
		features: "विशेषताएं",
		interactiveMetroMap: "इंटरैक्टिव मेट्रो मानचित्र",
		routeFinder: "मार्ग खोजक",
		fareCalculator: "किराया कैलकुलेटर",
		shortestRoutes: "सबसे छोटे और कम इंटरचेंज मार्ग",
		mobileFriendly: "मोबाइल अनुकूल डिज़ाइन",
		brandTitle: "मेट्रो मैप जनरेटर",
		brandDescription: "होशियार शहरी पारगमन नेविगेशन के लिए निर्मित।",
		disclaimer: "मार्ग, किराया और यात्रा की जानकारी केवल संदर्भ के लिए प्रदान की जाती है।",
		developedBy: "❤️ के साथ विकसित"
	},

	pages: {
		home: {
			sidebar: {
				recent: {
					recentSearches: "हालिया खोजें",
					clearAll: "सभी साफ़ करें",
					recent: "हालिया",
					mostUsed: "अक्सर उपयोग किए गए",
					az: "अ-ज्ञ (A-Z)",
					noRecentJourney: "कोई हालिया यात्रा नहीं मिली"
				},
				findroute: {
					routeFinder: "मार्ग खोजक",
					startStation: "से",
					endStation: "तक",
					startPlaceholder: "प्रारंभ स्टेशन दर्ज करें",
					endPlaceholder: "गंतव्य स्टेशन दर्ज करें",
					swapStations: "स्टेशन बदलें",
					findRoute: "मार्ग खोजें",
					resetForm: "रीसेट",
					priority: "प्राथमिकता",
					shortest: "सबसे छोटा मार्ग",
					lessInterchange: "कम इंटरचेंज",
					journeyDetails: "यात्रा विवरण",
					route: {
						stations: "{count} स्टेशन",
						station: "{count} स्टेशन",
						fare: "₹{fare}",
						travelTime: "{minutes} मिनट",
						distance: "{distance} किमी",
						interchange: "{count} इंटरचेंज",
						interchanges: "{count} इंटरचेंज",
						warning: "दिखाया गया समय केवल अनुमानित यात्रा समय है। यात्रियों को यात्रा के लिए अतिरिक्त समय रखने की सलाह दी जाती है।",
						showOnMap: "मानचित्र पर मार्ग दिखाएं",
						gate: "गेट",
						first: "प्रथम",
						last: "अंतिम",
						minutesLabel: "मिनट",
						lineChangeLabel: "लाइन परिवर्तन",
						stationsLabel: "स्टेशन",
						tokenFareLabel: "किराया",
						directionText: "दिशा: {terminal} की ओर (प्लेटफ़ॉर्म नंबर {platform})"
					}
				}
			},
			map: {
				label: "मानचित्र",
				clearRoute: "रूट साफ़ करें"
			}
		},
		networks: {
			searchPlaceholder: "शहर, स्टेशन, अस्पताल या पर्यटन स्थल खोजें (उदा: AIIMS, इंडिया गेट, DMRC)...",
			modeLabel: "मोड:",
			allModes: "सभी मोड",
			metro: "🚇 मेट्रो",
			rrts: "🚆 आरआरटीएस",
			monorail: "🚝 मोनोरेल",
			metrolite: "🚋 मेट्रोलाइट",
			metroneo: "⚡ मेट्रोनियो",
			statusLabel: "स्थिति:",
			allStatus: "सभी स्थितियाँ",
			operational: "🟢 संचालित",
			partial: "🟡 आंशिक संचालित",
			underConstruction: "🚧 निर्माणाधीन",
			sortByLabel: "क्रमबद्ध करें:",
			sortStatus: "🟢 स्थिति (डिफ़ॉल्ट)",
			sortCity: "🏙️ शहर (A → Z)",
			sortName: "🚇 नाम (A → Z)",
			sortMode: "🚆 मोड",
			showingCount: "{count} पारगमन नेटवर्क दिखाए जा रहे हैं",
			noNetworksFound: "कोई पारगमन नेटवर्क नहीं मिला",
			noNetworksQuery: "\"{query}\" से मेल खाता कोई नेटवर्क नहीं मिला।"
		},
		all_stations: {
			searchPlaceholder: "स्टेशन के नाम या कोड से खोजें (उदा: झिलमिल, राजीव चौक)...",
			allLines: "सभी लाइन्स",
			noStationsFound: "🔍 कोई स्टेशन नहीं मिला",
			noStationQueryMsg: "आपकी खोज \"{query}\" से मेल खाता कोई स्टेशन नहीं मिला।",
			stationCount: "{count} स्टेशन",
			singleStationCount: "1 स्टेशन"
		},
		station_info: {
			backBtn: "⬅️ सभी स्टेशनों पर वापस जाएं",
			connectedLines: "🚆 जुड़ी हुई मेट्रो लाइन्स",
			operatingHours: "⏰ स्टेशन का समय",
			first: "प्रथम",
			last: "अंतिम",
			helplines: "📞 हेल्पलाइन और सहायता",
			mobileHelpline: "स्टेशन मोबाइल हेल्पलाइन",
			landline: "स्टेशन लैंडलाइन",
			dmrcHelpline: "DMRC यूनिवर्सल हेल्पलाइन",
			gates: "🚪 स्टेशन गेट और निकास",
			facilities: "♿ स्टेशन सुविधाएं",
			parking: "🅿️ पार्किंग विवरण",
			transit: "🛗 लिफ्ट और एस्केलेटर",
			nearby: "📍 आसपास के प्रमुख स्थान",
			code: "कोड",
			location: "स्थान",
			placement: "प्लेसमेंट",
			divyangFriendly: "दिव्यांग अनुकूल",
			status: "स्थिति",
			yes: "✔️ हाँ",
			no: "❌ नहीं",
			active: "सक्रिय",
			maintenance: "रखरखाव",
			provider: "प्रदाता",
			car: "🚗 कार",
			bike: "🏍️ बाइक",
			cycle: "🚲 साइकिल",
			lifts: "🛗 लिफ्ट",
			escalators: "🪜 एस्केलेटर",
			divyangAccessible: "♿ दिव्यांग सुलभ",
			standardAccess: "🚶 मानक पहुंच"
		}
	}
};