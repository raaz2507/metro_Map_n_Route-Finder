// /lang/en.js
import passengerSupportEn from "./pages/passenger_support.en.js";

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
		passengerSupport: "🛡️ Passenger Support", 
		help: "❓ Help",
		about: "ℹ️ About"
	},

	"nav-sidebar": {
		route: "Find Route",
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
						directionText: "Towards {terminal} (Platform No. {platform})",
						distanceLabel: "Distance",
						breakdownToggle: "View details of {count} Tickets",
						smartCardSavings: "Save ₹{amount} using Smart Card!",
						transferModes: {
							crossPlatform: "Cross-Platform",
							samePlatform: "Same Platform",
							levelChange: "Level {level} Change",
							escalator: "Escalator / Stairs",
							skywalk: "Skywalk ({distance}m)",
							corridor: "Corridor ({distance}m)",
							freeERickshaw: "Free E-Rickshaw",
							securityCheck: "Security Check",
							accessible: "Wheelchair Accessible"
						},
						alerts: {
							multimodalSecurity: "Multimodal Junction: Separate gate & fresh security check required",
							ncmcCard: "RuPay NCMC / Smart Card works directly at gates",
							walkwayNotice: "{distance}m walkway (~{minutes} min walk)",
							sharedTrackNotice: "Shared Track: Local & express trains available on same platform"
						}
					},
					shareModal: {
						title: "Share Route",
						selectOption: "Select Share Option:",
						whatsapp: "WhatsApp",
						telegram: "Telegram",
						sms: "SMS",
						copyLink: "Copy Link",
						copyDetails: "Copy Details"
					}
				},
				appSettings: {
					heding : "App Settings",
					 tabs: {
						alarm: "Alarm",
						map: "Map"
					},
					map: {
						title: "Map & Display Settings",
						sections: {
							display: "🗺️ Map Display & View"
						},
						autoCenter: {
							label: "Auto-Center on Route",
							desc: "Automatically zoom and center map when a new route is searched."
						},
						walkways: {
							label: "Show Interchange Walkways",
							desc: "Draw dashed connecting footpaths between interchange stations."
						}
					},
					alarm:{
						title: "Alarm & Journey Settings",
						subtitle: "Configure alerts, triggers, and audio options",
						sections: {
							triggers: "🎯 Trigger & Geofence",
							audio: "🔊 Sound & Volume",
							vibration: "📳 Haptics & Vibration",
							voice: "🗣️ Offline Voice Alerts"
						},
						threshold: {
							label: "Arrival Alert Distance",
							desc: "Alarm triggers when train reaches within this distance from station.",
							station1: "🚉 1 Station Before (Proximity)",
							m200: "200 Meters (~1 min)",
							m500: "500 Meters (Recommended)",
							m1000: "1.0 Kilometer (~2-3 min)",
							m2000: "2.0 Kilometers (~4-5 min)"
						},
						alerts: {
							destination: "Destination Station Alarm",
							destinationDesc: "Rings loudly before arriving at your destination.",
							interchange: "Line Interchange Alarm",
							interchangeDesc: "Alerts you before approaching transfer stations to switch lines."
						},
						sound: {
							toneLabel: "Alarm Sound Tone",
							chime: "Metro Chime (Melodic)",
							beep: "Warning Beep (Pulse)",
							siren: "Emergency Siren",
							custom: "Custom Audio (MP3)",
							uploadMp3: "Choose Custom MP3 File",
							volume: "Alarm Volume",
							testSound: "🔊 Test Sound"
						},
						vibe: {
							patternLabel: "Vibration Pattern",
							long: "Long Alert Pattern",
							short: "Short Pulses",
							sos: "SOS Pattern",
							continuous: "Continuous",
							testVibe: "📳 Test Vibration",
							vibeSuccess: "📳 Vibration triggered! (Check touch haptics if not felt)",
							vibeBlocked: "⚠️ Vibration blocked. Ensure phone is not on Silent/DND and Haptics is ON.",
							unsupported: "📳 Haptic vibration is only supported on mobile devices (Android/PWA)"
						},
						voice: {
							enable: "Voice Announcements (TTS)",
							enableDesc: "Announces upcoming station names and line change reminders aloud offline.",
							voiceSelect: "Announcement Voice",
							testVoice: "🗣️ Test Voice"
						},
						reset: "Reset to Default",
						
					}
				}
			},
			map: {
				label: "Map",
				clearRoute: "Clear Route",
				showRoute: "Show Route",
				clearFilter: "Clear Filter",
				viewStationInfo: "View Station Details"
			},
			alarmBanner: {
    			approaching: "Approaching Station",
				trackingActive: "🛰️ Live Tracking Active",
				interchangeAlert: "Interchange Station • Change Line Here",
				destinationAlert: "Destination Station • Arriving Soon",
				dismiss: "🔕 Dismiss",
				snooze: "⏱️ Snooze (2m)",
				stopAlarm: "🛑 Stop Alarm",
				enabledToast: "Live journey alarm enabled",
				stoppedToast: "Live alarm disabled",
				snoozeToast: "Alarm snoozed for 2 minutes",
				dismissToast: "Next alert active for destination",
				noRouteToast: "Please search a route first to enable alarm"
			},
			gps: {
				permissionDenied: "📍 Location permission denied. Please allow GPS to track live speed and arrival alerts.",
				unavailable: "📍 GPS signal unavailable. Please ensure Device Location is ON.",
				gpsFallbackWarning: "⚠️ GPS is off or unavailable. Alarm is running in Fallback Mode (Timer & Motion Sensors).",
			},
			speedometer: {
				title: "Live Speedometer",
				topSpeed: "Top Speed",
				gpsAccuracy: "GPS Accuracy",
				status: "Status",
				statusHalted: "Stationary",
				statusDeparting: "Accelerating",
				statusCruising: "Cruising"
			},
			telemetry: {
				title: "Signal Telemetry",
				gps: "GPS Status",
				network: "Network",
				accuracy: "Precision",
				guideTitle: "📡 Telemetry & GPS Guide",
				guideActive: "🟢 80%-100%: Strong Satellite Lock (Active GPS)",
				guideFair: "🟡 40%-79%: Fair / Moderate Signal (Station Sheds)",
				guideTunnel: "🔴 In Tunnel: Underground Transit (Timer Fallback Active)",
				guideDeviceOff: "📵 Device GPS Off: Turn on Device Location",
				guideBlocked: "🚫 Blocked: Location permission denied in browser",
				gpsBlocked: "🚫 Blocked",
				gpsPrompt: "⚠️ Not Allowed",
				gpsDeviceOff: "📵 GPS Off",
				gpsTunnel: "🚇 In Tunnel",
				gpsActive: "🛰️ Active",
				netOnline: "Online",
				netOffline: "Offline (Cache)",
				gpsReady: "🛰️ Ready",
				gpsAcquiring: "🛰️ Searching...",
			}
		},
		networks: {
			// 1. Search Bar
			search: {
				placeholder: "Search city, station, hospital, tourist place (e.g. AIIMS, India Gate, DMRC)..."
			},

			// 2. Filter Bar (Mode, Status, Sort Chips)
			filters: {
				modeLabel: "Mode:",
				allModes: "All Modes",
				metro: "Metro",
				rrts: "RRTS",
				monorail: "Monorail",
				metrolite: "MetroLite",
				metroneo: "MetroNeo",

				statusLabel: "Status:",
				allStatus: "All Status",
				operational: "Operational",
				partial: "Partial",
				underConstruction: "Under Construction",

				sortByLabel: "Sort By:",
				sortStatus: "Status (Default)",
				sortCity: "City (A → Z)",
				sortName: "Name (A → Z)",
				sortMode: "Mode"
			},

			// 3. Stats & Empty States
			stats: {
				showingCount: "Showing {count} transit networks",
				noNetworksFound: "No transit networks found",
				noNetworksQuery: "No networks match \"{query}\"."
			},

			// 4. Section Headings
			sections: {
				combined: "🏙️ City-wide Combined Networks",
				individual: "🚆 Individual Transit Lines"
			},

			// 5. Card UI Elements (Clean strings without emojis)
			card: {
				regionSuffix: " Region",
				singleLineLinked: "● 1 Line Linked",
				linesLinked: "● {count} Lines Linked",
				officialWebsite: "Official Website",
				allNetworksSuffix: "(All Networks)",
				combinedSubtitle: "Combined City Data",
				modes: {
					metro: "Metro",
					rrts: "RRTS",
					monorail: "Monorail",
					metrolite: "MetroLite",
					metroneo: "MetroNeo"
				},
				status: {
					operational: "Operational",
					partial: "Partial Service",
					underConstruction: "Under Construction",
					approved: "Approved",
					proposed: "Proposed"
				}
			},

			// 6. Action Toasts
			toast: {
				underConstructionTitle: "🚧 Under Construction",
				underConstructionMsg: "\"{name}\" is currently under construction. Route and station data are not yet operational.",
				proposedTitle: "📋 Proposed / Approved",
				proposedMsg: "\"{name}\" is in the planned/approved phase. Service has not yet begun.",
				dataPendingTitle: "🛠️ Data Integration Pending",
				dataPendingMsg: "Transit data for \"{name}\" is currently being compiled by developers. Coming soon!"
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
	},
	passengerSupport: passengerSupportEn
};