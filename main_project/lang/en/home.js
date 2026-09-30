// /lang/en/home.js
export default {
	// 1. Navigation Bars (Exclusive to Home)
	navSidebar: {
		route: "Find Route",
		recent: "Recent",
		map: "Map",
		setting: "Setting",
		ariaNav: "Sidebar Navigation",
		ariaPanel: "Sidebar Content Panel",
		closeAria: "Close sidebar panel"
	},
	navFloating: {
		alarm: "Alarm",
		ticket: "Ticket",
		wrapperAria: "Floating Navigation Wrapper",
		mobileNavAria: "Mobile Navigation"
	},

	// 2. Route Finder (Inputs, Priorities, Journey Details, Timeline)
	findRoute: {
		title: "Route Finder",
		from: "From",
		to: "To",
		fromPlaceholder: "Enter start station",
		toPlaceholder: "Enter destination station",
		swapBtn: "Swap stations",
		submitBtn: "Find Route",
		resetBtn: "Reset",
		priorityLabel: "Priority",
		priorityShortest: "Shortest",
		priorityInterchange: "Less Interchange",
		journeyDetails: "Journey Details",
		routeSummary: {
			stations: "{count} stations",
			station: "{count} station",
			fare: "₹{fare}",
			travelTime: "{minutes} min",
			distance: "{distance} km",
			interchange: "{count} interchange",
			interchanges: "{count} interchanges",
			disclaimer: "Time shown is estimated travel time only. Passengers are advised to keep extra time to travel."
		},
		timeline: {
			activeNow: "Active Now",
			showOnMap: "Show route on map",
			gate: "Gate",
			firstTrain: "First Train",
			lastTrain: "Last Train",
			directionText: "Towards {terminal} · Platform {platform}",
			splitFareTitle: "Split Fare & Ticket Breakdown",
			splitFareSubtitle: "Tap to view fares for {count} individual line segments",
			smartCardSavings: "Save ₹{amount} using Smart Card!"
		},
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

	// 3. Recent Searches
	recent: {
		title: "Recent Searches",
		clearAll: "Clear All",
		tabRecent: "Recent",
		tabMostUsed: "Most Used",
		tabAz: "A-Z",
		empty: "No recent journeys found",
		deleteAria: "Delete route"
	},

	// 4. App Settings Panel
	settings: {
		title: "App Settings",
		tabs: {
			alarm: "Alarm",
			map: "Map",
			backup: "Backup / Restore",
			packs: "Packs"
		},
		packs: {
			langHeading: "Language Packs",
			langDesc: "Download languages for offline use or remove packs to free up device storage.",
			themeHeading: "Theme Packs",
			themeDesc: "Custom styling and visual appearance extensions.",
			webNotice: "On the web, languages and themes load automatically on-demand. Offline pack management is available in the installed PWA and Android App.",
			coreBuiltin: "Core System (Default)",
			installed: "Installed",
			downloadBtn: "Download",
			uninstallBtn: "Uninstall",
			downloading: "Downloading...",
			uninstalling: "Removing...",
			confirmUninstallLang: "Are you sure you want to remove the {langName} pack? The app will switch back to English.",
			confirmUninstallTheme: "Are you sure you want to remove the {themeName} theme pack?",
			sizeApprox: "~{size} KB",
			themeComingSoon: "New themes coming soon"
		},
		alarm: {
			title: "Alarm & Journey Settings",
			subtitle: "Configure alerts, triggers, and audio options",
			triggersHeading: "🎯 Trigger & Geofence",
			thresholdLabel: "Arrival Alert Distance",
			thresholdDesc: "Alarm triggers when train reaches within this distance from station.",
			thresholdOptions: {
				station1: "🚉 1 Station Before (Proximity)",
				m200: "200 Meters (~1 min)",
				m500: "500 Meters (Recommended)",
				m1000: "1.0 Kilometer (~2-3 min)",
				m2000: "2.0 Kilometers (~4-5 min)"
			},
			destAlertLabel: "Destination Station Alarm",
			destAlertDesc: "Rings loudly before arriving at your destination.",
			interchangeAlertLabel: "Line Interchange Alarm",
			interchangeAlertDesc: "Alerts you before approaching transfer stations to switch lines.",
			audioHeading: "🔊 Sound & Volume",
			toneLabel: "Alarm Sound Tone",
			tones: {
				chime: "Metro Chime (Melodic)",
				beep: "Warning Beep (Pulse)",
				siren: "Emergency Siren",
				custom: "Custom Audio (MP3)"
			},
			volumeLabel: "Alarm Volume",
			testSoundBtn: "🔊 Test Sound",
			uploadMp3Label: "Choose Custom MP3 File",
			vibeHeading: "📳 Haptics & Vibration",
			vibeLabel: "Vibration Pattern",
			vibePatterns: {
				long: "Long Alert Pattern",
				short: "Short Pulses",
				sos: "SOS Pattern",
				continuous: "Continuous"
			},
			testVibeBtn: "📳 Test Vibration",
			voiceHeading: "🗣️ Offline Voice Alerts",
			voiceLabel: "Voice Announcements (TTS)",
			voiceDesc: "Announces upcoming station names and line change reminders aloud offline.",
			voiceSelectLabel: "Announcement Voice",
			testVoiceBtn: "🗣️ Test Voice",
			resetBtn: "Reset to Default"
		},
		map: {
			title: "Map & Display Settings",
			heading: "🗺️ Map Display & View",
			autoCenterLabel: "Auto-Center on Route",
			autoCenterDesc: "Automatically zoom and center map when a new route is searched.",
			walkwaysLabel: "Show Interchange Walkways",
			walkwaysDesc: "Draw dashed connecting footpaths between interchange stations.",
			underConstructionLabel: "Show Under Construction",
			underConstructionDesc: "Display upcoming and under-construction lines (dashed) and stations on the map.",
			approvedLabel: "Show Approved & Planned",
			approvedDesc: "Display approved and proposed future transit corridors (dotted) on the map."
		},
		backup: {
			title: "💾 Backup & Restore Data",
			desc: "Manage your saved routes, alarms, and preferences.",
			exportBtn: "Export Data",
			importBtn: "Import Data"
		}
	},

	// 5. Interactive SVG Map Controls
	map: {
		label: "Map",
		legend: "Legend",
		metroTrackLines: "Metro Track Lines",
		stationType: "Station Type",
		trackStatus: "Track & Station Status",
		clearRoute: "Clear Route",
		showRoute: "Show Route",
		clearFilter: "Clear Filter",
		viewStationInfo: "View Station Details",
		ariaMap: "Interactive Metro Map"
	},

	// 6. Alarm Banner (Live Sticky Notification Bar)
	alarmBanner: {
		approaching: "Approaching Station",
		trackingActive: "🛰️ Live Tracking Active",
		interchangeAlert: "Interchange Station • Change Line Here",
		destinationAlert: "Destination Station • Arriving Soon",
		dismissBtn: "🔕 Dismiss",
		snoozeBtn: "⏱️ Snooze (2m)",
		stopAlarmBtn: "🛑 Stop Alarm"
	},

	// 7. Telemetry & Live Sensors
	telemetry: {
		title: "Signal Telemetry",
		gpsLabel: "GPS Status",
		netLabel: "Network",
		accuracyLabel: "Precision",
		guideTitle: "📡 Telemetry & GPS Guide",
		guideItems: {
			active: "🟢 80%-100%: Strong Satellite Lock (Active GPS)",
			fair: "🟡 40%-79%: Fair / Moderate Signal (Station Sheds)",
			tunnel: "🔴 In Tunnel: Underground Transit (Timer Fallback Active)",
			deviceOff: "📵 Device GPS Off: Turn on Device Location",
			blocked: "🚫 Blocked: Location permission denied in browser"
		},
		status: {
			blocked: "🚫 Blocked",
			notAllowed: "⚠️ Not Allowed",
			off: "📵 GPS Off",
			tunnel: "🚇 In Tunnel",
			active: "🛰️ Active",
			online: "Online",
			offline: "Offline (Cache)",
			ready: "🛰️ Ready",
			searching: "🛰️ Searching..."
		}
	},

	// 8. Speedometer Widget
	speedometer: {
		title: "Live Speedometer",
		topSpeed: "Top Speed",
		gpsAccuracy: "GPS Accuracy",
		statusLabel: "Status",
		statusStates: {
			halted: "Stationary",
			departing: "Accelerating",
			cruising: "Cruising"
		}
	},

	// 9. Share Route Modal
	shareModal: {
		title: "Share Route",
		selectOption: "Select Share Option:",
		whatsapp: "WhatsApp",
		telegram: "Telegram",
		sms: "SMS",
		copyLink: "Copy Link",
		copyDetails: "Copy Details",
		closeAria: "Close share modal"
	},

	// 10. Global Toast Notifications Hub
	toast: {
		alarm: {
			enabled: "Live journey alarm enabled",
			stopped: "Live alarm disabled",
			snoozed: "Alarm snoozed for 2 minutes",
			dismissed: "Next alert active for destination",
			noRoute: "Please search a route first to enable alarm"
		},
		settings: {
			backupSuccess: "💾 Backup downloaded successfully!",
			backupFailed: "Failed to create backup.",
			restoreSuccess: "✅ Backup restored successfully! Reloading...",
			restoreInvalid: "⚠️ Invalid or corrupted backup file.",
			restoreSizeLimit: "⚠️ Backup must be under 1MB.",
			shareFailed: "⚠️ Failed to share backup.",
			saveFailed: "⚠️ Failed to save in Documents.",
			vibeSuccess: "📳 Vibration triggered! (Check touch haptics if not felt)",
			vibeBlocked: "⚠️ Vibration blocked. Ensure phone is not on Silent/DND and Haptics is ON.",
			vibeUnsupported: "📳 Haptic vibration is only supported on mobile devices (Android/PWA)",
			packDownloaded: "{name} downloaded successfully!",
			packRemoved: "{name} pack removed.",
			packDownloadError: "Failed to download pack. Please check connection."
		},
		share: {
			copiedLink: "Route link copied to clipboard!",
			copiedDetails: "Route details copied to clipboard!",
			shareFailed: "Failed to share route."
		},
		route: {
			noRoute: "No route found between these stations.",
			sameStation: "Start and destination stations cannot be the same."
		},
		gps: {
			permissionDenied: "📍 Location permission denied. Please allow GPS to track live speed and arrival alerts.",
			unavailable: "📍 GPS signal unavailable. Please ensure Device Location is ON.",
			fallbackWarning: "⚠️ GPS is off or unavailable. Alarm is running in Fallback Mode (Timer & Motion Sensors)."
		}
	}
};