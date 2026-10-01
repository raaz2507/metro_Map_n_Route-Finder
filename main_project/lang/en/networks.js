// /lang/en/networks.js
export default {
	meta: {
		title: "Transit Network & City Selector | YatraMarg",
		desc: "Select transit networks across Delhi NCR, Mumbai, Pune, Kolkata, Bengaluru and explore route maps, lines, and fares."
	},
	search: {
		placeholder: "Search city, station, hospital, tourist place (e.g. AIIMS, India Gate, DMRC)...",
		aria: "Search transit networks",
		clearAria: "Clear search"
	},
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
	aria: {
		filterControls: "Search and Filter Transit Networks",
		filterMode: "Filter by Transit Mode",
		filterStatus: "Filter by Network Status",
		sortNetworks: "Sort Transit Networks",
		networksList: "Transit Networks List"
	},
	stats: {
		loading: "Loading India Transit Registry...",
		showingCount: "Showing {count} transit networks",
		noNetworksFound: "No transit networks found",
		noNetworksQuery: "No networks match \"{query}\"."
	},
	sections: {
		combined: "City-wide Combined Networks",
		individual: "Individual Transit Lines"
	},
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
	toast: {
		underConstructionTitle: "🚧 Under Construction",
		underConstructionMsg: "\"{name}\" is currently under construction. Route and station data are not yet operational.",
		proposedTitle: "📋 Proposed / Approved",
		proposedMsg: "\"{name}\" is in the planned/approved phase. Service has not yet begun.",
		dataPendingTitle: "🛠️ Data Integration Pending",
		dataPendingMsg: "Transit data for \"{name}\" is currently being compiled by developers. Coming soon!"
	}
};
