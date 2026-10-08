// lang/pages/help.en.js
export default {
	meta: {
		title: "Help & User Guide | YatraMarg",
		desc: "Comprehensive user guide, route finding tutorials, destination alarm setup, fare rules, and troubleshooting for YatraMarg transit app."
	},
	hero: {
		badge: "YatraMarg User Guide & Knowledge Base",
		title: "How can we help your journey?",
		desc: "Find quick answers, learn smart sensor features, understand fare calculation rules, and troubleshoot app issues.",
		searchPlaceholder: "Search guides, features or FAQs (e.g., alarm, fare, shortest route, offline)...",
		clearSearch: "Clear search",
		searchStats: "Showing {count} matching topics"
	},
	sidebar: {
		quickIndex: "Quick Index"
	},
	mobileBar: {
		index: "Index",
		search: "Search & Filter"
	},
	chips: {
		all: "All Topics",
		networks: "Networks & Cities",
		routes: "Route Planning",
		smart: "Smart Features & Sensors",
		fares: "Fares & Cards",
		troubleshoot: "Troubleshooting"
	},
	nav: {
		stepNetworks: "1. Select City & Network",
		topicCitySelect: "How to Select City",
		topicModeFilter: "Metro, RRTS & Filters",
		topicCombinedNet: "Combined (All Networks)",
		step1: "2. Route Planning",
		step2: "3. Smart Journey & Sensors",
		step3: "4. Fares & Smart Cards",
		step4: "5. Troubleshooting & Settings",
		topicDestAlarm: "Destination Alarm",
		topicSensorsGps: "Live GPS & Sensors",
		topicRecharge: "Smart Card Recharge"
	},
	sections: {
		networksTitle: "Select City & Transit Network",
		networksSubtitle: "Discover and switch between Metro, RRTS, Monorail and suburban systems across cities",
		routesTitle: "Route Planning & Navigation",
		routesSubtitle: "Finding optimal transit paths, stations, and interchange guides",
		smartTitle: "Smart Journey & Sensors",
		smartSubtitle: "Destination wake-up alarms, GPS tracking, and card recharge gateway",
		faresTitle: "Fares, Smart Cards & Station Rules",
		faresSubtitle: "Discounts, penalty rules, overstay limits, and holiday fare slabs",
		troubleshootTitle: "App Settings & Troubleshooting",
		troubleshootSubtitle: "Offline mode, location fix, theme personalization, and cache reset"
	},
	cards: {
		// Section: Networks & City Selection
		citySelect: {
			title: "How to Select Your City & Transit Network",
			subtitle: "Search, city cards, and loading interactive maps",
			desc: "YatraMarg supports operational networks across major cities in India:",
			fact1: "Search your city name or station code on the Networks page.",
			fact2: "Clicking a city card activates that transit system and loads its map immediately.",
			fact3: "Your chosen city stays saved locally on your device for future visits.",
			moreBtn: "Learn more...",
			lessBtn: "Show less",
			detailHeading: "Easy steps to choose your city:",
			step1: "Open Networks: Click the 'Networks' item in the top navigation bar.",
			step2: "Search or browse: Type your city (e.g. Delhi, Mumbai, Bengaluru) in the search bar.",
			step3: "Tap City Card: Click your desired city card to activate it.",
			step4: "Direct Station Search: You can also search landmarks like 'AIIMS' to jump straight to that station.",
			tipBadge: "Quick Shortcut:",
			tipText: "You can also switch cities anytime by clicking the 'City Pill' in the universal header on any page."
		},
		modeFilter: {
			title: "Using Metro, RRTS, and Monorail Filters",
			subtitle: "Filter networks by transit mode and construction status",
			desc: "Easily explore different types of urban transit systems:",
			fact1: "Mode filter: Filter between Metro, RRTS (Namo Bharat), and Monorail systems.",
			fact2: "Status filter: Toggle Operational corridors versus Under Construction projects.",
			fact3: "Sort By: Sort networks alphabetically or by operational priority.",
			moreBtn: "Learn more...",
			lessBtn: "Show less",
			detailHeading: "Filter and status rules:",
			step1: "Operational Systems: Clicking these instantly opens the full route map and schedules.",
			step2: "Under Construction: Displays a helpful status notice regarding ongoing project construction.",
			step3: "Sort preference: Tap 'City (A → Z)' to view alphabetically.",
			step4: "Reset filters: Tap 'All Modes' and 'All Status' to view everything.",
			tipBadge: "Saved Preference:",
			tipText: "Your sorting preference is stored locally so you won't need to reconfigure it."
		},
		combinedNet: {
			title: "What is the Combined (All Networks) Card?",
			subtitle: "Viewing multiple interconnected transit networks on one map",
			desc: "Cities with multiple transit systems offer a unified combined network:",
			fact1: "Delhi NCR includes DMRC Metro, Rapid Metro, and Namo Bharat RRTS simultaneously.",
			fact2: "Selecting the combined card shows all interchange points connected on one unified map canvas.",
			fact3: "You can still choose individual network cards below if you only need a single operator.",
			moreBtn: "Learn more...",
			lessBtn: "Show less",
			detailHeading: "Benefits of using the Combined Network:",
			step1: "Complete City Map: No need to switch between different apps or separate maps.",
			step2: "Multi-Modal Routes: Seamless transfer times between DMRC, RRTS, and Rapid Metro are calculated automatically.",
			step3: "One-Click Switch: Toggle between individual systems or all networks from the header anytime.",
			step4: "Accurate Interchanges: Clear walking transfer times and platform guidance between systems.",
			tipBadge: "Recommendation:",
			tipText: "We recommend using 'All Networks' for everyday daily commuting across large metropolitan regions."
		},
		// Section 1: Route Planning
		searchStations: {
			title: "How to Search Stations & Plan a Route",
			subtitle: "Fuzzy search, station codes, and recent search history",
			desc: "YatraMarg features an intelligent fuzzy search engine to make route selection seamless:",
			fact1: "Type station name, landmark, or 2-letter acronym (e.g. 'RC' for Rajiv Chowk).",
			fact2: "Recent searches are saved locally on your device for instant 1-tap reselection.",
			fact3: "Tap the swap icon (⇄) between Start and End stations to reverse your journey path immediately."
		},
		routeModes: {
			title: "Shortest Route vs. Minimum Interchange",
			subtitle: "Understanding route optimization preferences",
			desc: "You can toggle routing priority based on your travel preferences:",
			fact1: "Shortest Route: Finds the quickest path with lowest travel time, even if it requires an extra interchange.",
			fact2: "Minimum Interchange: Prioritizes single-line direct journeys or least train transfers for comfort.",
			fact3: "Interactive path highlighting displays intermediate stations and line switch colors on the map."
		},
		interchangeTips: {
			title: "How Interchanges & Platform Transfers Work",
			subtitle: "Walking time, transfer bridges, and signage",
			desc: "When changing lines at major interchange hubs:",
			fact1: "Our route timeline displays transfer walking time (typically 3 to 6 minutes) calculated in the total journey.",
			fact2: "Follow color-coded foot-trails on station platforms matching your next metro line.",
			fact3: "Stations like Rajiv Chowk, Kashmere Gate, and Hauz Khas have multi-level platform lifts and escalators."
		},

		// Section 2: Smart Journey & Sensors
		destAlarm: {
			title: "Destination Wake-Up Alarm (How it Works)",
			subtitle: "Geo-fenced sound & vibration alert before your stop",
			desc: "Never miss your destination station while reading, listening to music, or napping:",
			fact1: "Set an alert radius (e.g., 1 or 2 stations before arrival) from the floating alarm button.",
			fact2: "Uses low-power background Geolocation API and motion telemetry to track proximity.",
			fact3: "Sounds a prominent audio chime and activates device vibration upon approaching the target station.",
			moreBtn: "Learn more...",
			lessBtn: "Show less",
			detailHeading: "How to set up the alarm and how it operates:",
			step1: "Search Route: Enter your source and destination stations on the home screen to calculate your path.",
			step2: "Tap Alarm Button: Tap the floating bell icon located at the bottom of the journey details.",
			step3: "Choose Distance: Select whether you want the alert 1 station or 2 stations before your destination.",
			step4: "Grant Location: Allow location permissions when prompted to enable real-time tracking.",
			tipBadge: "Pro Tip:",
			tipText: "Vibration alerts work even if your phone is in silent mode, and an audible chime will play through connected earphones."
		},
		sensorsGps: {
			title: "Live GPS, Speedometer & Sensor Permissions",
			subtitle: "Why permissions are requested and battery optimization",
			desc: "YatraMarg utilizes device hardware strictly client-side with zero tracking server uploads:",
			fact1: "Location Permission (High Accuracy): Computes live train speed (km/h) and station arrival estimation.",
			fact2: "Accelerometer / Motion: Automatically pauses telemetry when stationary to save up to 80% battery.",
			fact3: "All telemetry data is strictly processed inside your browser sandbox and never sent to any server."
		},
		rechargeCard: {
			title: "Smart Card Recharge Gateway",
			subtitle: "Fast online top-up via official portals",
			desc: "Top up your metro smart card directly within the application:",
			fact1: "Click 'Recharge Card' in the top navigation bar to open the recharge dialog.",
			fact2: "Input your 8 to 11 digit Smart Card engraved number and choose your preferred recharge amount.",
			fact3: "Redirects securely to official transit recharge partners (DMRC / Paytm / Amazon Pay / Metro Web)."
		},

		// Section 3: Fares & Rules
		discounts: {
			title: "Smart Card Discounts & Peak vs Non-Peak Fares",
			subtitle: "Save 10% to 20% on every ride",
			desc: "Smart card holders receive standard tiered transit discounts:",
			fact1: "Flat 10% discount on all journeys paid using a valid Metro Smart Card.",
			fact2: "Additional 10% discount (Total 20%) during non-peak hours (e.g. before 08:00 AM, 12:00 PM to 05:00 PM, after 09:00 PM).",
			fact3: "Special discounted fare slabs apply on Sundays and National Holidays."
		},
		overstayLimit: {
			title: "Station Overstay & Maximum Time Limit Rules",
			subtitle: "Avoid automatic AFC gate penalty deduction",
			desc: "Metro systems impose maximum duration limits inside the paid area:",
			fact1: "Same Station Entry/Exit: Maximum 20 minutes allowed (nominal minimum fare applicable).",
			fact2: "Different Station (Under 10 km): Maximum 65 minutes inside transit system.",
			fact3: "Long Journeys (> 10 km): Maximum 180 minutes. Exceeding limits incurs a standard hourly fine at AFC exit gates."
		},
		luggageRules: {
			title: "Baggage Dimensions & Weight Allowance",
			subtitle: "Permissible personal luggage standards",
			desc: "Passenger baggage regulations for smooth CISF screening:",
			fact1: "Maximum weight: Up to 25 kg of personal luggage allowed per commuter.",
			fact2: "Maximum dimensions: 80 cm (length) × 100 cm (width) × 60 cm (height).",
			fact3: "Airport Express Line commuters are permitted up to 32 kg depending on airline check-in baggage policies."
		},

		// Section 4: App Settings & Troubleshooting
		offlineMode: {
			title: "Using YatraMarg in Offline Mode (No Internet)",
			subtitle: "Cached network schematics and offline route calculation",
			desc: "You can find routes and view maps even underground without internet connection:",
			fact1: "Once loaded, station network coordinates and route graphs are cached locally in your browser (CacheStorage).",
			fact2: "The vector SVG interactive map runs 100% client-side without pinging external tile servers.",
			fact3: "To refresh latest station additions, simply reload the app when an active internet connection is available."
		},
		gpsTroubleshoot: {
			title: "Fixing GPS Location Errors Underground",
			subtitle: "Overcoming cellular signal loss in underground metro tunnels",
			desc: "Satellite GPS signals naturally weaken when traveling in deep underground tunnels:",
			fact1: "Ensure 'Location Services' and 'High Accuracy Mode' are turned on in your device settings.",
			fact2: "Near above-ground elevated stations, GPS locks back in within 5 to 10 seconds.",
			fact3: "If GPS remains unavailable underground, use the 'Manual Station Check' feature in the journey tracker."
		},
		themesLanguage: {
			title: "Switching Themes & App Language",
			subtitle: "Personalize your visual experience & native language",
			desc: "Customize YatraMarg to suit your preference in bright sunlight or nighttime travel:",
			fact1: "Theme Selector in Header: Switch between Classic Light, Sleek Dark, Neon Cyberpunk, Vintage Retro, Forest Mint, and Ghibli.",
			fact2: "Language Selector: Switch instantly between English and हिन्दी. All route labels, fares, and guides translate on the fly.",
			fact3: "Your preferred theme and language are saved permanently in your browser localStorage."
		},
		cacheReset: {
			title: "How to Clear Cache & Reload Latest Data",
			subtitle: "Fixing stale maps or outdated station data",
			desc: "If you notice missing newly inaugurated stations or mismatched fares:",
			fact1: "Hard refresh your browser by pressing Ctrl + F5 (Windows) or Cmd + Shift + R (Mac).",
			fact2: "On mobile devices, open browser settings -> Site Settings -> Clear Data for this site.",
			fact3: "New data updates are checked automatically by the Service Worker on every initial app visit."
		}
	},
	emptyState: {
		title: "No matching help topics found",
		desc: "We couldn't find any guide matching \"{query}\". Try searching with different keywords like 'alarm', 'fare', 'offline', or 'route'.",
		resetBtn: "Clear Search & View All"
	}
};