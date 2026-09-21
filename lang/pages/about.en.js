// lang/pages/about.en.js
export default {
	meta: {
		title: "About YatraMarg | Independent Urban Transit Platform",
		desc: "Learn about YatraMarg: an independent, privacy-first, offline-ready transit navigation and route finding initiative for Indian metro networks."
	},
	hero: {
		badge: "Citizen-First Urban Mobility Initiative",
		title: "Navigating Cities with Speed, Privacy & Precision",
		desc: "YatraMarg was built to solve a widespread urban transit challenge: navigating fragmented, multi-operator metro networks through a single unified, zero-tracking, and lightning-fast platform.",
		metrics: {
			m1Value: "450+",
			m1Label: "Mapped Stations",
			m2Value: "100%",
			m2Label: "Client-Side Privacy",
			m3Value: "0 ms",
			m3Label: "Server Tracking Latency",
			m4Value: "6+",
			m4Label: "Integrated Networks"
		}
	},
	bento: {
		privacy: {
			tag: "Core Architecture",
			title: "100% Client-Side Privacy & Zero Tracking",
			desc: "Unlike standard commercial apps that log your daily travel habits, location traces, and commute routes to remote ad-servers, YatraMarg executes all graph algorithms, shortest-path computations, and sensor telemetry directly in your browser sandbox.",
			bullet1: "No user accounts, no login required, zero tracking cookies.",
			bullet2: "Geolocation & motion sensors operate 100% in-device without server pings."
		},
		offline: {
			tag: "High Reliability",
			title: "Offline-First Engine",
			desc: "Deep underground tunnels often have zero cellular signal. YatraMarg caches network topologies, station coordinates, and route graphs locally so your route finder and vector SVG maps remain fully operational anywhere.",
			bullet1: "Browser CacheStorage & client-side graph execution.",
			bullet2: "Vector SVG schematics scale losslessly at any device zoom."
		},
		multiCity: {
			tag: "Federated Transit",
			title: "Unified Multi-City Hub",
			desc: "Seamlessly switch between Delhi NCR (DMRC, NMRC, Rapid Metro, RRTS), Mumbai Metro, and expanding regional transit corridors under one cohesive, uniform interface.",
			bullet1: "Instant network switching without reloading separate apps.",
			bullet2: "Harmonized interchange transfer times and line codes."
		},
		sensors: {
			tag: "Hardware Telemetry",
			title: "Smart Travel Telemetry",
			desc: "Features like the Destination Wake-Up Alarm and live train speedometer leverage device hardware gracefully, automatically pausing when stationary to conserve battery.",
			bullet1: "Proximity alerts before your destination stop.",
			bullet2: "Battery-friendly sensor lifecycle management."
		}
	},
	techStack: {
		title: "Engineering Philosophy: Zero Bloat, Pure Standards",
		desc: "Built with high-performance web standards for maximum longevity, accessibility, and speed.",
		t1Title: "Modern ES2022 OOP",
		t1Desc: "Private class encapsulation (#) and clean modular services.",
		t2Title: "CSS Cascade Layers",
		t2Desc: "Modular @layer tokens, components & layout with 6 themes.",
		t3Title: "Zero Bulky Frameworks",
		t3Desc: "No React/Angular bloat — sub-second initial load times.",
		t4Title: "Full i18n Localization",
		t4Desc: "Instant bilingual transition between English and Hindi."
	},
	disclaimer: {
		title: "Statutory Transparency & Data Ethics",
		p1: "YatraMarg is an independent public digital initiative developed for commuters. It is not owned by, affiliated with, or an official entity of DMRC, NMRC, NCRTC, MMRDA, or any state transit corporation.",
		p2: "All transit routes, station names, and fare estimations are synchronized with official public schedules for informative assistance. For official ticket booking, smart card issuance, or legal transit matters, commuters are guided to the respective official transit authority portals via our Passenger Support directory."
	},
	developer: {
		sectionBadge: "The Builders",
		sectionTitle: "About the Developers",
		sectionDesc: "The engineering minds designing and maintaining YatraMarg's offline-first transit platform.",
		dev1Tag: "Creator & Lead Architect",
		dev1Status: "Active Maintainer",
		dev1Name: "Raaz",
		dev1Role: "Core Engine & System Architecture",
		dev1Quote: "YatraMarg was built to give commuters what transit apps always should have been: fast, lightweight, and completely private — with zero ads and offline functionality.",
		dev1Spec1: "Delhi-NCR, India",
		dev1Spec2: "Core Engine & Routing",
		dev1Btn: "GitHub Profile (@raaz2507)",
		dev2Tag: "Co-Developer & Contributor",
		dev2Status: "Active Contributor",
		dev2Name: "Co-Developer",
		dev2Role: "Transit Systems & Feature Engineering",
		dev2Quote: "Dedicated to making urban commuting hassle-free with reliable schedules, intuitive interfaces, and smooth transit navigation for everyone.",
		dev2Spec1: "India",
		dev2Spec2: "Transit Data & UI",
		dev2Btn: "GitHub Profile"
	},
	feedback: {
		badge: "Community Voice",
		title: "Feedback & Suggestions",
		desc: "Notice a route discrepancy, outdated fare, or have an idea to make YatraMarg better? Your feedback directly shapes our future updates.",
		t1Title: "Report a Route / Fare Issue",
		t1Desc: "Found a missing station, incorrect interchange walk time, or fare slab change? Report it for a quick fix.",
		t1Btn: "Submit Issue Report",
		t2Title: "Suggest New Features & Lines",
		t2Desc: "Share feature ideas, request upcoming transit networks, or propose UI enhancements with the developer.",
		t2Btn: "Share Ideas & Discuss"
	},
	feedbackModal: {
		badge: "Community Voice",
		title: "Send Feedback & Suggestions",
		desc: "Notice a route discrepancy, outdated fare, or have an idea to make YatraMarg better? Your feedback directly shapes future updates.",
		typeLabel: "Feedback Category",
		optRoute: "Route / Navigation Discrepancy",
		optFare: "Fare / Slab Discrepancy",
		optStation: "Missing Station / Platform Info",
		optFeature: "Suggest New Feature or Transit Line",
		optOther: "General Suggestion & Feedback",
		cityLabel: "Transit Network / City (Optional)",
		cityPlaceholder: "e.g. Delhi-NCR, Mumbai Metro, Namma Metro...",
		detailsLabel: "Issue Details / Suggestion Description *",
		detailsPlaceholder: "Describe the station, route error, or feature idea in detail...",
		emailLabel: "Your Contact / Email (Optional)",
		emailPlaceholder: "Optional, in case follow-up is needed",
		copyBtn: "Copy Report",
		sendBtn: "Send via Email",
		copiedToast: "Report copied to clipboard!",
		sendingToast: "Opening your email client...",
		requireDetails: "Please provide description details first."
	},
	community: {
		title: "Open Development & Community",
		desc: "We believe urban navigation infrastructure should be transparent, accessible, and community-friendly.",
		repoBtn: "Explore on GitHub",
		supportBtn: "Passenger Support Directory",
		versionLabel: "Version 2.4.0 • Built with Pride for Indian Transit"
	}
};