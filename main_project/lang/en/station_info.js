// lang/pages/station_info.en.js
export default {
	meta: {
		title: "Station Details - {name} | YatraMarg",
		desc: "Comprehensive station information, gates, amenities, parking tariffs, platforms, and feeder connectivity for {name}."
	},
	nav: {
		backBtn: "⬅️ Back to All Stations",
		backBtnAria: "Return to stations directory"
	},
	hero: {
		stationCode: "Station Code",
		layout: "Layout",
		noDescription: "No detailed description available for this station.",
		openInMaps: "📍 View on Google Maps",
		openInMapsAria: "View station location on Google Maps",
		plusCode: "Plus Code",
		coordinates: "Coordinates",
		connectedLines: "🚆 Connected Lines",
		layouts: {
			elevated: "Elevated",
			underground: "Underground",
			"at-grade": "At-Grade"
		}
	},
	timings: {
		title: "Operating Timings",
		first: "First Train",
		last: "Last Train",
		sundayTitle: "Sunday Timings"
	},
	helplines: {
		title: "📞 Helplines & Support",
		mobile: "Station Mobile Helpline",
		landline: "Station Landline",
		universal: "Universal Helpline"
	},
	platforms: {
		title: "🚉 Platforms & Terminus Directions",
		platformNum: "Platform {num}",
		towards: "Towards",
		lounge: "✨ Premium Lounge Available",
		noPlatforms: "Platform direction details not registered for this station."
	},
	gates: {
		title: "🚪 Station Gates & Exits",
		gateNum: "Gate No. {num}",
		divyangAccessible: "♿ Divyang Accessible",
		standardAccess: "🚶 Standard Access",
		open: "Open",
		closed: "Closed",
		defaultArea: "Exit Gate Area",
		noGates: "No specific gate details available for this station."
	},
	facilities: {
		title: "♿ Station Facilities & Amenities",
		noFacilities: "No facility records found for this station.",
		categories: {
			"ATM": "ATM",
			"Toilet": "Toilet",
			"Food / Restaurant": "Food & Dining",
			"Medical": "First Aid & Medical",
			"Medical Needs": "Medical & First Aid",
			"Drinking Water": "Drinking Water",
			"Information": "Information Desk",
			"Facilities for Differently Abled": "Facilities for Differently Abled",
			"Ticket Facilities": "Ticketing & Smart Card Facilities",
			"Customer Services": "Customer Care & Assistance",
			"Basic Facilities": "Basic Commuter Amenities",
			"Women Facilities": "Women Safety & Facilities"
		},
		items: {
			"First Aid Assistance": "First Aid Assistance",
			"Reserved Spaces for wheelchair in train": "Reserved Spaces for Wheelchair in Train",
			"Extra Wide Automatic Flag Gates": "Extra Wide Automatic Flag Gates",
			"Separate Toilets": "Dedicated Accessible Toilets",
			"Differently Abled Friendly": "Differently Abled Friendly",
			"Group Ticketing": "Group Ticketing Counter",
			"Ticket vending & Card recharge": "Ticket Vending Machine (TVM) & Recharge",
			"Customer care": "Customer Care Centre",
			"Drinking water facility": "Drinking Water Facility",
			"Public Wifi Available": "Free Public Wi-Fi",
			"Female CISF Staff": "Female Security Staff (CISF)"
		},
		locations: {
			"Concourse": "Concourse",
			"Platform": "Platform",
			"Ground": "Ground Level"
		}
	},
	parking: {
		capacityTitle: "🅿️ Parking Capacity",
		tariffsTitle: "💰 Parking Tariffs & Rate Card",
		provider: "Provider",
		car: "🚗 Car",
		bike: "🏍️ Bike",
		cycle: "🚲 Cycle",
		location: "Location",
		notAvailable: "Not Available",
		nearExitGate: "Near Exit Gate",
		authorisedParking: "Authorised Parking",
		dayCharges: "Day Charges",
		nightCharges: "Night Surcharge",
		monthlyPass: "Monthly Pass",
		helmetDeposit: "Helmet Deposit",
		bicycleStand: "Bicycle Stand",
		noParking: "🚫 No authorised parking available at this station.",
		noTariff: "Standard transit parking rate card applies.",
		authorisedNoticeTitle: "🅿️ Authorised Multimodal Station Parking ({state})",
		authorisedNoticeDesc: "Available 24x7 with automated smart ticketing, CCTV surveillance, and designated Divyang slots. Check tariff card below.",
		passes: {
			dayOnly: "Day Pass",
			full247: "24/7 Pass",
			tariffA: "General Pass",
			tariffB: "Executive Pass"
		},
		duration: {
			upTo: "Up to {time}",
			range: "{from} to {to}",
			day: "{count} Day",
			days: "{count} Days",
			hrs: "{count} hrs",
			min: "{count} min"
		}
	},
	verticalTransit: {
		title: "🛗 Lifts & Escalators (Vertical Transit)",
		lifts: "🛗 Lifts",
		escalators: "🪜 Escalators",
		code: "Code",
		location: "Location",
		placement: "Placement",
		inside: "Inside Concourse",
		outside: "Outside Concourse",
		divyangFriendly: "Divyang Friendly",
		stretcherFriendly: "Stretcher Friendly",
		direction: "Direction",
		up: "Up (Ascending)",
		down: "Down (Descending)",
		bidirectional: "Bidirectional",
		status: "Status",
		yes: "✔️ Yes",
		no: "❌ No",
		active: "Active",
		maintenance: "Maintenance",
		noTransit: "No vertical transit (lift/escalator) records available.",
		locations: {
			"Concourse to Platform": "Concourse to Platform",
			"CONCOURSE TO PLATFORM": "Concourse to Platform",
			"Ground to unpaid concourse": "Ground to Concourse",
			"GROUND TO UNPAID CONCOURSE": "Ground to Concourse",
			"Ground to Platform": "Ground to Platform",
			"GROUND TO PLATFORM": "Ground to Platform"
		}
	},
	feederBus: {
		title: "🚌 Feeder Bus & Last-Mile Connectivity",
		route: "Route",
		frequency: "Every {min} mins",
		firstBus: "First Bus",
		lastBus: "Last Bus",
		noFeeder: "No dedicated feeder bus routes registered for this station."
	},
	stationLayout: {
		title: "🗺️ Station Multi-Level Schematics",
		viewFloorPlan: "View Schematic",
		downloadPdf: "Download PDF Layout",
		downloadPdfAria: "Download multi-level station schematic map PDF",
		noLayout: "Station structural schematics not uploaded."
	},
	nearby: {
		title: "📍 Nearby Places & Key Destinations",
		walking: "🚶 {min} min walk",
		transit: "🚌 {min} min transit",
		directFob: "Direct FOB Bridge",
		noNearby: "No nearby landmarks registered for this station.",
		categories: {
			"Hospital": "Hospital",
			"Health": "Health & Medical",
			"Police Station": "Police Station",
			"Fire Station": "Fire Station",
			"Bus Stand": "Bus Stand",
			"Transportation": "Transportation",
			"Mall": "Mall & Shopping",
			"School": "School / College",
			"Institutional": "Educational & Institutional",
			"Metro Station": "Metro Station",
			"Railway Station": "Railway Station",
			"Park": "Park",
			"Recreation": "Parks & Recreation",
			"Hotel": "Hotel",
			"Government Offices": "Government Offices",
			"Private Offices": "Corporate & Private Offices",
			"Industry": "Industries",
			"Religious": "Religious Places",
			"Tourist Place": "Tourist Places",
			"Residental": "Residential Area",
			"Others": "Other Places"
		}
	},
	search: {
		placeholder: "Search gates, ATMs, lifts, platforms, feeder buses, nearby places...",
		ariaLabel: "Filter station amenities and infrastructure",
		clearBtn: "Clear search",
		resultsCount: "{count} matching items",
		noResults: "No amenities, gates, or facilities match \"{query}\"",
		resetBtn: "Clear Filter",
		categories: {
			gates: "🚪 Gates",
			facilities: "♿ Facilities",
			transit: "🛗 Lifts & Escalators",
			platforms: "🚉 Platforms",
			nearby: "📍 Nearby Places",
			feederBus: "🚌 Feeder Buses",
			parking: "🅿️ Parking"
		}
	},
	notFound: {
		title: "⚠️ Station Not Found",
		message: "The requested station code/ID \"{stationId}\" was not found in our metro directory."
	}
};