/**
 * 🇮🇳 Hindi & Hinglish NLU Grammar & Intent Pattern Pack
 * Defines stopwords, transit markers, and regex classifiers for Hindi / Hinglish.
 */

export default {
	stopwords: [
		"metro", "train", "station", "line", "interchange", "route", "rasta", "path",
		"fare", "kiraya", "ticket", "cost", "price", "kitna", "kitni", "kitne",
		"kaise", "jaye", "jayen", "jayein", "jaayen", "jaayein", "jana", "jaana", "jaun", "jau", "jaunga", "jaungi", "jayenge", "pahunche", "pahuchna", "chalke", "chalna",
		"samay", "time", "distance", "door", "dur", "kab", "kya", "hai", "h", "hi", "tha", "thi",
		"disha", "दिशा", "ye", "yeh", "bato", "batao", "bataiye", "batana", "bata", "bataoo", "bolo", "btao", "dikhao", "dikhaye", "chahiye",
		"help", "hello", "hi", "namaste", "please", "plz", "kripya", "and", "or",
		"ka", "ki", "ke", "ko", "par", "pe", "me", "mein", "se", "tak", "wali", "wala", "first", "last",
		"mujhe", "mujhko", "hum", "hume", "humko", "hamara", "hamari", "hamare",
		"mai", "main", "mera", "meri", "mere", "apna", "apne", "apni",
		"bhai", "bhaiya", "bro", "yaar", "sir", "chahta", "chahti", "chahte",
		"hoon", "hu", "timing", "timings", "gate", "platform", "entry", "exit", "number", "no", "near",
		"kaun", "konsi", "kaunsi", "si", "badalni", "badalna", "hogi", "hoga", "badle",
		// Devanagari Hindi Stopwords
		"मेट्रो", "ट्रेन", "स्टेशन", "लाइन", "रूट", "रास्ता", "किराया", "टिकट",
		"कितना", "कितनी", "कितने", "कैसे", "जाएं", "जाना", "जाऊं", "पहुंचे", "पहुंचना",
		"समय", "दूरी", "दूर", "कब", "क्या", "है", "हूँ", "बताओ", "बताइए", "दिखाओ",
		"चाहिए", "नमस्ते", "कृपया", "से", "तक", "को", "का", "की", "के", "में", "पर",
		"गेट", "प्लेटफॉर्म", "नंबर", "टाइमिंग", "सुविधा", "कौन", "कौनसी", "बदलना", "बदलनी", "होगी", "होगा"
	],

	fillerPatterns: [
		/\b(batao|bataiye|dikhao|bata|btao|please|plz|kripya|chahiye|dikhaye)\b/gi,
		/\b(kaise (jaye|jayen|jayein|jaayen|jaayein|jaun|jau|pauche|pahunche|jana hai|jaana hai)|jana hai|jaana hai|jaana h|jana h|jaana hi|jana hi|reach|how to go|how to reach|pahochna hai|jaun|jau|jayen|jayein|jaayen|jaayein)\b/gi,
		/(बताओ|बताइए|दिखाइए|दिखाओ|कृपया|चाहिए|कैसे जाएं|कैसे जाऊं|कैसे पहुंचे|जाना है|पहुंचना है|जाऊं|जाएं)/gu
	],

	routeMarkers: {
		sourcePrefixes: ["se", "start from", "start at", "se start", "se shuru"],
		destPrefixes: ["tak", "ko", "ke liye", "jana hai", "pahochna", "jaana"],
		sourcePre: ["from", "start"],
		sourcePost: ["se", "से"],
		destPre: ["to", "towards"],
		destPost: ["tak", "तक", "ko", "को", "jana", "जाना", "जाएं", "jaye", "jayen", "jayein", "jaayen", "jaayein", "reach", "jaun", "जाऊं", "jau"],
		betweenPairs: [
			{ from: "se", to: "tak" },
			{ from: "se", to: "ko" },
			{ from: "se", to: "ke liye" },
			{ from: "from", to: "to" }
		],
		connectors: ["se", "tak", "to", "->", "-->", "➔", "-", "से", "तक", "को"]
	},

	intentPatterns: {
		RETURN_ROUTE: /(\b(return|wapsi|vapasi|wapas|ulta|ulta route|return journey|and return|return route)\b)|(वापसी|वापस|उलटा|लौटना)/i,
		FARE_ENQUIRY: /(\b(fare|kiraya|ticket|price|cost|charges|kitne rupay|smart card|card discount|token|paisa|paise)\b)|(किराया|टिकट|पैसे|स्मार्ट कार्ड|कितना लगेगा)/i,
		TIME_DISTANCE: /(\b(time|duration|minutes|hours|samay|kitna time|kitni der|kitna der|der lagegi|distance|door|dur|kitni door|km|kilometer)\b)|(समय|कितना समय|कितनी देर|दूरी|कितनी दूर|किलोमीटर)/i,
		LINE_INFO: /(\b(line|colour|color|interchange|badalna|change train|kaun si line|konsi line|which line|junction)\b)|(लाइन|रंग|इंटरचेंज|बदलना|कौन सी लाइन)/i,
		STATION_INFO: /(\b(gate|platform|entry|exit|parking|lift|escalator|facilities|facility|station info|first train|last train)\b)|(गेट|प्लेटफॉर्म|पार्किंग|लिफ्ट|सुविधा|पहली ट्रेन|आखिरी ट्रेन)/i,
		NEARBY_STATION: /(\b(nearby|nearest|closest|paas ka|kareeb|paas me|aas paas|near me|location)\b)|(नजदीकी|पास का|करीब|आस पास)/i,
		GREETING: /^(\b(hi|hello|hey|namaste|pranam|namaskar|good morning|good evening|ola)\b)|^(नमस्ते|प्रणाम|नमस्कार|हेलो|हाय)/i,
		HELP: /(\b(help|guide|features|options|kya kar sakte ho|madad|instructions|what can you do|commands)\b)|(मदद|सहायता|क्या कर सकते हो)/i,
		ROUTE_SEARCH: /(\b(route|rasta|path|kaise jaye|kaise jaun|kaise jau|kaise pauche|jana hai|jaana hai|jaana h|pahochna|travel to|go to|from .+ to)\b)|(रास्ता|रूट|कैसे जाएं|कैसे जाऊं|जाना है|पहुंचना है)/i
	}
};
