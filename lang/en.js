// /lang/en.js

export default {
	meta: {
		title: "Metro Map Generator",
		ogTitle: "Metro Map & Route Finder",
		ogDescription: "Find the best metro routes, ticket fares, travel time, and intermediate stations easily.",
		twitterTitle: "Metro Map & Route Finder",
		twitterDescription: "Find the best metro routes, ticket fares, travel time, and intermediate stations easily."
	},
    "header":{
		appName: "Metro Map Generator",
        language: "Lang:",
		
		themes: {
			label:"Theme",
			light: "Classic Light",
			dark: "Sleek Dark",
			cyberpunk: "Neon Cyberpunk",
			vintage: "Vintage Retro",
			mint: "Forest Mint",
			ghibli: "Ghibli Nostalgia"
		},
    },

	"nav-header": {
		home: "🏠 Home",
		stations: "🚉 Stations",
		recharge: "💳 Recharge Card",
		others: "🗂️ Others",
		help: "❓ Help",
		about: "ℹ️ About"
	},

	"nav-sidebar": {
		recent: "Recent",
		map: "Map",
		setting: "Setting"
	},

	"nav-floating": {
		alarm: "Alarm",
		ticket: "Ticket"
	},

	"footer": {
		footerNavigation: "Footer Navigation",
		about: "About",
		bookTicket: "Book Ticket",
		github: "GitHub",
		appTitle: "Metro Map Generator",
		qrDescription: "Scan the QR code to quickly open this application on your mobile device.",
		features: "Features",
		interactiveMetroMap: "Interactive Metro Map",
		routeFinder: "Route Finder",
		fareCalculator: "Fare Calculator",
		shortestRoutes: "Shortest & Least Interchange Routes",
		mobileFriendly: "Mobile Friendly Design",
		brandTitle: "Metro Map Generator",
		brandDescription: "Built for smarter urban transit navigation.",
		disclaimer: "Route, fare and travel information are provided for reference only.",
		developedBy: "Developed with ❤️"
	},
	
	// Page-Scoped Namespaces (New Clean Structure)
	pages: {
		home: {
			sidebar:{
				findroute:{
					routeFinder: "Route Finder",
					startStation: "From",
					endStation: "To",
					startPlaceholder: "Enter start station",
					endPlaceholder: "Enter destination station",
					swapStations: "Swap stations",
					findRoute: "Find Route",
					resetForm: "Reset",
					priority: "Priority",
					shortest: "Shortest",
					lessInterchange: "Less Interchange",
					journeyDetails: "Journey Details",
					route: {
						stations: "{count} stations",
						station: "{count} station",
						fare: "₹{fare}",
						travelTime: "{minutes} min",
						distance: "{distance} km",
						interchange: "{count} interchange",
						interchanges: "{count} interchanges",
						warning: "Time shown is estimated travel time only. Passengers are advised to keep extra time to travel.",
						showOnMap: "Show route on map",
						gate: "Gate",
						first: "First",
						last: "Last",
						minutesLabel: "Minutes",
						lineChangeLabel: "Line Change",
						stationsLabel: "Stations",
						tokenFareLabel: "Token Fare",
						directionText: "Towards {terminal} (Platform No. {platform})",
						changeToText: "Change to <strong>{line}</strong> towards <strong>{terminal}</strong> from <strong>Platform No. {platform}</strong>"
					},
					shareModal: {
						title: "Share Route",
						selectOption: "Select Share Option:",
						whatsapp: "WhatsApp",
						telegram: "Telegram",
						sms: "SMS",
						copyLink: "Copy Link",
						copyDetails: "Copy Details"
					},
				},
				recent:{
					recentSearches: "Recent Searches",
					clearAll: "Clear All",
					recent: "Recent",
					mostUsed: "Most Used",
					az: "A-Z",
					noRecentJourney: "No recent journeys found",
				},
			},
			map:{
			label: "Map",
            clearRoute: "Clear Route",
			}
		},
		all_stations: {
			searchPlaceholder: "Search station by name or code (e.g. Jhilmil, Rajiv Chowk)...",
			allLines: "All Lines",
			noStationsFound: "🔍 No stations found",
			noStationQueryMsg: "No station matches your search query \"{query}\". Try searching for another name or code.",
			stationCount: "{count} Stations",
			singleStationCount: "1 Station"
		},
		station_info: {
			backBtn: "⬅️ Back to All Stations",
			connectedLines: "🚆 Connected Metro Lines",
			operatingHours: "⏰ Station Hours",
			first: "First",
			last: "Last",
			helplines: "📞 Helplines & Support",
			mobileHelpline: "Station Mobile Helpline",
			landline: "Station Landline",
			dmrcHelpline: "DMRC Universal Helpline",
			gates: "🚪 Station Gates & Exits",
			facilities: "♿ Station Facilities & Amenities",
			parking: "🅿️ Parking Breakdown",
			transit: "🛗 Lifts & Escalators (Vertical Transit)",
			nearby: "📍 Nearby Places & Key Destinations",
			code: "Code",
			location: "Location",
			placement: "Placement",
			divyangFriendly: "Divyang Friendly",
			status: "Status",
			yes: "✔️ Yes",
			no: "❌ No",
			active: "Active",
			maintenance: "Maintenance",
			provider: "Provider",
			car: "🚗 Car",
			bike: "🏍️ Bike",
			cycle: "🚲 Cycle",
			lifts: "🛗 Lifts",
			escalators: "🪜 Escalators",
			divyangAccessible: "♿ Divyang Accessible",
			standardAccess: "🚶 Standard Access"
		}
	},
};