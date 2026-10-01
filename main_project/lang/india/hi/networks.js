// /lang/india/hi/networks.js
export default {
	meta: {
		title: "ट्रांजिट नेटवर्क व शहर चयनकर्ता | यात्रा-मार्ग",
		desc: "दिल्ली-एनसीआर, मुंबई, पुणे, कोलकाता आदि शहरों के मेट्रो व आरआरटीएस नेटवर्क चुनें और रूट मैप देखें।"
	},
	search: {
		placeholder: "शहर, स्टेशन, अस्पताल या पर्यटन स्थल खोजें (उदा: AIIMS, इंडिया गेट, DMRC)...",
		aria: "ट्रांजिट नेटवर्क खोजें",
		clearAria: "खोज साफ़ करें"
	},
	filters: {
		modeLabel: "मोड:",
		allModes: "सभी मोड",
		metro: "मेट्रो",
		rrts: "आरआरटीएस",
		monorail: "मोनोरेल",
		metrolite: "मेट्रोलाइट",
		metroneo: "मेट्रोनियो",
		statusLabel: "स्थिति:",
		allStatus: "सभी स्थितियाँ",
		operational: "संचालित",
		partial: "आंशिक संचालित",
		underConstruction: "निर्माणाधीन",
		sortByLabel: "क्रमबद्ध करें:",
		sortStatus: "स्थिति (डिफ़ॉल्ट)",
		sortCity: "शहर (A → Z)",
		sortName: "नाम (A → Z)",
		sortMode: "मोड"
	},
	aria: {
		filterControls: "ट्रांजिट नेटवर्क खोजें और फ़िल्टर करें",
		filterMode: "ट्रांजिट मोड अनुसार फ़िल्टर करें",
		filterStatus: "नेटवर्क स्थिति अनुसार फ़िल्टर करें",
		sortNetworks: "ट्रांजिट नेटवर्क क्रमबद्ध करें",
		networksList: "ट्रांजिट नेटवर्क सूची"
	},
	stats: {
		loading: "भारत ट्रांजिट डायरेक्टरी लोड हो रही है...",
		showingCount: "{count} पारगमन नेटवर्क दिखाए जा रहे हैं",
		noNetworksFound: "कोई पारगमन नेटवर्क नहीं मिला",
		noNetworksQuery: "\"{query}\" से मेल खाता कोई नेटवर्क नहीं मिला।"
	},
	sections: {
		combined: "शहर-व्यापी संयुक्त नेटवर्क",
		individual: "व्यक्तिगत ट्रांजिट लाइन्स"
	},
	card: {
		regionSuffix: " क्षेत्र",
		singleLineLinked: "● 1 लाइन जुड़ी है",
		linesLinked: "● {count} लाइन्स जुड़ी हैं",
		officialWebsite: "आधिकारिक वेबसाइट",
		allNetworksSuffix: "(सभी नेटवर्क)",
		combinedSubtitle: "संयुक्त शहर डेटा",
		modes: {
			metro: "मेट्रो",
			rrts: "आरआरटीएस",
			monorail: "मोनोरेल",
			metrolite: "मेट्रोलाइट",
			metroneo: "मेट्रोनियो"
		},
		status: {
			operational: "संचालित",
			partial: "आंशिक सेवा",
			underConstruction: "निर्माणाधीन",
			approved: "स्वीकृत",
			proposed: "प्रस्तावित"
		}
	},
	toast: {
		underConstructionTitle: "🚧 निर्माणाधीन",
		underConstructionMsg: "\"{name}\" वर्तमान में निर्माणाधीन है। इसका रूट और स्टेशन डेटा अभी उपलब्ध नहीं है।",
		proposedTitle: "📋 प्रस्तावित / स्वीकृत",
		proposedMsg: "\"{name}\" अभी योजना/स्वीकृत चरण में है। सेवा शुरू होने पर डेटा जोड़ा जाएगा।",
		dataPendingTitle: "🛠️ डेटा संकलन जारी",
		dataPendingMsg: "\"{name}\" का पारगमन डेटा डेवलपर्स द्वारा जोड़ा जा रहा है। जल्द ही उपलब्ध होगा!"
	}
};
