// /lang/en.js

export default {
	meta: {
		title: "YatraMarg",
		ogTitle: "Maps • Routes • Fares • Journey Assistance",
		ogDescription: "Find the best metro routes, ticket fares, travel time, and intermediate stations easily.",
		twitterTitle: "Maps • Routes • Fares • Journey Assistance",
		twitterDescription: "Find the best metro routes, ticket fares, travel time, and intermediate stations easily."
	},
    header: {
		appName: "YatraMarg",
		tagLine : "Maps • Routes • Fares • Journey Assistance",
        language: "Lang:",
		
		themes: {
			label: "Theme:",
			light: "Classic Light",
			dark: "Sleek Dark",
			cyberpunk: "Neon Cyberpunk",
			vintage: "Vintage Retro",
			mint: "Forest Mint",
			ghibli: "Ghibli Nostalgia"
		}
    },

	"nav-header": {
		networks: "🌐 Networks",
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

	footer: {
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
	
	// Page-Scoped Namespaces
	pages: {
		home: {
			sidebar: {
				recent: {
					recentSearches: "Recent Searches",
					clearAll: "Clear All",
					recent: "Recent",
					mostUsed: "Most Used",
					az: "A-Z",
					noRecentJourney: "No recent journeys found"
				},
				findroute: {
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
						directionText: "Towards {terminal} (Platform No. {platform})"
					}
				}
			},
			map: {
				label: "Map",
				clearRoute: "Clear Route"
			}
		},
		networks: {
			searchPlaceholder: "Search city, station, hospital, tourist place (e.g. AIIMS, India Gate, DMRC)...",
			modeLabel: "Mode:",
			allModes: "All Modes",
			metro: "🚇 Metro",
			rrts: "🚆 RRTS",
			monorail: "🚝 Monorail",
			metrolite: "🚋 MetroLite",
			metroneo: "⚡ MetroNeo",
			statusLabel: "Status:",
			allStatus: "All Status",
			operational: "🟢 Operational",
			partial: "🟡 Partial",
			underConstruction: "🚧 Under Construction",
			sortByLabel: "Sort By:",
			sortStatus: "🟢 Status (Default)",
			sortCity: "🏙️ City (A → Z)",
			sortName: "🚇 Name (A → Z)",
			sortMode: "🚆 Mode",
			showingCount: "Showing {count} transit networks",
			noNetworksFound: "No transit networks found",
			noNetworksQuery: "No networks match \"{query}\"."
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
			dmrcHelpline: "Universal Helpline",
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
	}
};