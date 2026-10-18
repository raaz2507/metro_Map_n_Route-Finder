// /lang/en/smart_card_ticket.js
export default {
	pageTitle: "Smart Card Quick Top-Up | YatraMarg",
	meta: {
		title: "Smart Card Quick Top-Up | YatraMarg",
		desc: "Quickly top up and recharge your metro smart card. Copy card ID and access official recharge portals directly."
	},
	section1Badge: "Quick Top-Up & Passes",
	section1Title: "Smart Card Top-Up & Digital Pass Portal",
	section1Subtitle: "Direct official top-up gateway and instant digital transit gate passes.",
	title: "Smart Card Quick Top-Up",
	smartcardSubtitle: "Instant Metro Recharge",
	subtitleUnavailable: "Station Counter / TVM Recharge",
	infoTip: "Card ID will be auto-copied & official portal opens in 1 click.",
	unavailableTip: "Online top-up portal is not available for this transit network. Please recharge your card at station ticket counters or TVMs.",
	infoBanner: "Direct Recharge Helper: Card ID will be copied and official top-up portal will open in 1 click.",
	cardIdLabel: "Smart Card ID (Engraved No.)",
	cardIdPlaceholder: "e.g. 12345678",
	amountLabel: "Recharge Amount (₹)",
	amountPlaceholder: "Amount (min ₹100)",
	submitBtn: "Copy Card ID & Open Portal",
	submitBtnCopy: "Copy Card ID",
	btnUnavailable: "Station Counter / TVM Only",
	counterGuide1Title: "Station Ticket Counters",
	counterGuide1Desc: "Instant cash, UPI or card recharge at any customer care counter.",
	counterGuide2Title: "Automated TVM Dispenser",
	counterGuide2Desc: "Tap smart card on reader and top up with UPI or cash 24x7.",
	toastInvalid: "Please enter a valid 8 to 11 digit Metro Card ID.",
	toastSuccess: "Card ID {cardId} copied! Opening official portal...",
	toastCopiedOnly: "Card ID {cardId} copied to clipboard!",
	toastNoPortal: "Online top-up portal is not available for this transit network.",
	qrCardTitle: "Digital Metro QR Ticket",
	qrCardSubtitle: "Instant Mobile Pass",
	btnWhatsApp: "WhatsApp",
	btnWeb: "Online",
	btnApp: "App",
	btnPass: "Pass",
	noQrTickets: "No online booking channels available for this city.",

	// Card 3: Metro Pass Wallet
	walletCardTitle: "Metro Pass Wallet",
	walletCardSubtitle: "Offline Gate Pass & Scanner",
	walletItem1Title: "Camera & WhatsApp",
	walletItem1Desc: "Snap paper ticket or 1-tap paste WhatsApp screenshot.",
	walletItem2Title: "100% Offline Ready",
	walletItem2Desc: "Works instantly at underground gates with zero signal.",
	walletItem3Title: "1-Tap Fast Gate Entry",
	walletItem3Desc: "High-contrast bright vector pass gates read in 1 second.",
	walletItem4Title: "Safe Digital Backup",
	walletItem4Desc: "No fear of paper tearing, getting wet or losing tickets.",
	btnGatePass: "Save & Scan Gate Pass",

	// Fare Chart & Matrix Section
	fareChartTitle: "Official Transit Fare Matrix & Slab Rules",
	fareChartSubtitle: "Real-time slab rules, multi-class pricing, and official concessions directly derived from transit network data.",
	activeCityBadge: "Active Network",
	noFareRules: "No fare rules found for the selected city or network.",



	// Table Columns
	colDistance: "Distance Slab",
	colStations: "Station Count",
	colToken: "Standard Token / QR",
	colSmartCard: "Smart Card (-{percent}%)",
	colHoliday: "Sunday & Holidays",
	colOrigin: "Origin Station",
	colDestination: "Destination Station",
	colStandardFare: "Standard Coach",
	colPremiumFare: "Premium Coach",

	// Slabs & Formats
	kmUnit: "km",
	stationsUnit: "Stations",
	stationSingle: "Station",
	abovePrefix: ">",
	flatFareLabel: "Flat Fare (All Stations)",
	flatFareDesc: "Unified single fare applies between any two stations on this network.",
	matrixOriginHeader: "Origin \\ Destination",
	matrixPanHint: "✋ Click & Drag anywhere to pan",

	// RRTS / Multi-class controls
	coachClassLabel: "Select Coach Class",
	standardCoach: "Standard Coach",
	premiumCoach: "Premium Coach (2x Luxury)",

	// Passes & Ticketing Hub
	passesSectionTitle: "Transit Passes, Cards & Ticketing Guidelines",
	passesSectionSubtitle: "Complete fare rules, minimum balances, refund policies, and official validity standards.",
	dailyCommutersTag: "Daily Commuters",
	touristPassTag: "Sightseeing & Tour Pass",
	digitalTag: "Paperless & Fast",
	interoperableTag: "National Mobility",

	// Cards Specifications
	smartCardTitle: "Metro Smart Card",
	smartCardBullet1: "{percent}% flat discount on all standard journeys",
	smartCardBullet2: "Additional {percent}% off during off-peak hours (before 08:00 AM, 12:00-17:00, after 21:00)",
	smartCardWeekendBullet: "Special {percent}% discount on weekends & national holidays",
	smartCardDepositBullet: "Refundable security deposit: {deposit}",
	smartCardBullet3: "Minimum {amount} balance required to tap at entry gates",
	smartCardBullet4: "Max stay: {minutes} mins inside network ({sameStation} mins for same station exit)",

	touristCard1DayTitle: "1-Day Tourist Card",
	touristCard3DayTitle: "3-Day Tourist Card",
	touristCardCost: "Cost: {cost} ({travelValue} travel value + {deposit} refundable deposit)",
	touristCardUnlimited: "Unlimited rides across all standard lines ({excluded} excluded)",
	touristCardUnlimitedAll: "Unlimited rides across all standard lines",
	touristCardUnlimitedExcluded: "Unlimited rides across all standard lines (except {excluded})",
	touristCardRefund: "{deposit} security deposit refunded upon returning card in good condition",

	tripPassTag: "Monthly Commuter Pass",
	tripPassTitle: "Monthly Trip Pass ({trips} Trips)",
	tripPassBullet1: "{trips} journeys with validity of {days} days (maximum commuter savings)",
	tripPassBullet2: "Valid between designated origin and destination stations only",

	concessionsTag: "Special Concession",
	concessionsTitle: "Concessions & Special Discounts",
	concessionsBullet1: "{percent}% discount on travel fare for {categories}",
	concessionsBullet2: "Valid ID / disability certificate required at station customer care counter",

	qrTicketTitle: "Digital QR & WhatsApp Ticketing",
	qrTicketBullet1: "Paperless instant barcode booking—bypass token counters",
	qrTicketBullet2: "Validity: {minutes} minutes from issuance to tap-in at AFC gates",
	qrTicketBullet3: "Official Booking Channels: {channels}",

	ncmcTitle: "National Common Mobility Card (NCMC)",
	ncmcBullet1: "One Nation One Card: Usable across all Indian metros, RRTS, and city buses",
	ncmcBullet2: "RuPay Contactless: Direct tap at AFC gates—no separate metro card needed",
	ncmcBullet3: "Eligible for {percent}% smart card discount on supported automated gates",

	categories: {
		student: "Students",
		senior_citizen: "Senior Citizens (65+)",
		divyangjan: "Divyangjan / Differently Abled"
	},

	// Product Names
	products: {
		token: "Standard Token / QR",
		smart_card: "Metro Smart Card",
		off_peak_smart_card: "Off-Peak Smart Card",
		tourist_card_1day: "1-Day Tourist Card",
		tourist_card_3day: "3-Day Tourist Card",
		trip_pass_45: "45-Trip Monthly Pass",
		trip_pass: "Monthly Trip Pass",
		concessions: "Concession Pass (Student/Senior/Divyangjan)",
		qr_ticket: "Digital QR Ticket",
		ncmc_card: "NCMC RuPay Card",
		standard: "Standard Coach",
		premium: "Premium Coach"
	}
};