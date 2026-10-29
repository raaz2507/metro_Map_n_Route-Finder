/**
 * 🇬🇧 English NLU Grammar & Intent Pattern Pack
 * Defines stopwords, transit markers, and regex classifiers for English.
 */

export default {
	stopwords: [
		"metro", "train", "station", "line", "interchange", "route", "path",
		"fare", "ticket", "cost", "price", "how", "much", "many",
		"reach", "travel", "go", "going", "walk",
		"time", "duration", "distance", "far", "when", "what", "is", "are",
		"tell", "show", "give", "need", "want", "disha", "ye", "yeh", "bato", "batao", "mujhe", "mujhko", "jana", "jaana", "ki", "kaise", "jaye", "jayen", "jayein", "jaun", "jau",
		"help", "hello", "hi", "hey", "please", "plz", "and", "or",
		"from", "to", "towards", "first", "last", "se", "tak",
		"timing", "timings", "gate", "platform", "entry", "exit", "number", "no", "near",
		"for", "of", "in", "at", "on", "by", "with", "the", "a", "an",
		"i", "me", "my", "we", "our", "you", "your", "sir", "can"
	],

	fillerPatterns: [
		/\b(please|plz|tell me|show me|find|search|give me|can you|batao|dikhao)\b/gi,
		/\b(how to go|how to reach|want to go|reach|travel to|going to|kaise jaye|kaise jayen|kaise jaun|kaise jau|jana hai|jaana hai|jaana hi)\b/gi
	],

	routeMarkers: {
		sourcePrefixes: ["from", "start from", "start at", "starting from", "begin at"],
		destPrefixes: ["to", "towards", "destination", "reach", "going to"],
		sourcePre: ["from", "start"],
		sourcePost: ["se"],
		destPre: ["to", "towards", "destination"],
		destPost: ["reach", "bound"],
		betweenPairs: [
			{ from: "from", to: "to" },
			{ from: "between", to: "and" },
			{ from: "start", to: "end" },
			{ from: "se", to: "tak" }
		],
		connectors: ["to", "towards", "->", "-->", "➔", "-", "and", "se"]
	},

	intentPatterns: {
		RETURN_ROUTE: /\b(return|reverse|round trip|and return|return route|return journey|go back|back to)\b/i,
		FARE_ENQUIRY: /\b(fare|ticket|price|cost|charges|smart card|card discount|token|rate|fee|how much)\b/i,
		TIME_DISTANCE: /\b(time|duration|minutes|hours|how long|distance|how far|km|kilometer|miles)\b/i,
		LINE_INFO: /\b(line|colour|color|interchange|change train|which line|junction)\b/i,
		STATION_INFO: /\b(gate|gates|platform|platforms|entry|exit|parking|lift|escalator|facilities|facility|station info|first train|last train)\b/i,
		NEARBY_STATION: /\b(nearby|nearest|closest|near me|close to me|location|around here)\b/i,
		GREETING: /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)\b/i,
		HELP: /\b(help|guide|features|options|instructions|what can you do|commands)\b/i,
		ROUTE_SEARCH: /\b(route|path|how to go|how to reach|travel to|go to|from .+ to|directions)\b/i
	}
};
