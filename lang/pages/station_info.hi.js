// lang/pages/station_info.hi.js
export default {
	meta: {
		title: "स्टेशन विवरण - {name} | यात्रा-मार्ग",
		desc: "स्टेशन की संपूर्ण जानकारी, गेट, सुविधाएं, पार्किंग दरें, प्लेटफ़ॉर्म दिशा और फीडर कनेक्टिविटी: {name}।"
	},
	nav: {
		backBtn: "⬅️ सभी स्टेशनों पर वापस जाएं"
	},
	hero: {
		stationCode: "स्टेशन कोड",
		layout: "लेआउट",
		noDescription: "इस स्टेशन के लिए कोई विस्तृत विवरण उपलब्ध नहीं है।",
		openInMaps: "📍 गूगल मैप्स पर देखें",
		plusCode: "प्लस कोड",
		coordinates: "निर्देशांक",
		connectedLines: "🚆 जुड़ी हुई मेट्रो लाइन्स"
	},
	timings: {
		title: "⏰ स्टेशन परिचालन समय",
		first: "प्रथम ट्रेन",
		last: "अंतिम ट्रेन",
		sundayFirst: "रविवार प्रथम",
		sundayLast: "रविवार अंतिम",
		sundayTitle: "रविवार व अवकाश समय"
	},
	helplines: {
		title: "📞 हेल्पलाइन व सहायता",
		mobile: "स्टेशन मोबाइल हेल्पलाइन",
		landline: "स्टेशन लैंडलाइन",
		universal: "यूनिवर्सल हेल्पलाइन"
	},
	platforms: {
		title: "🚉 प्लेटफ़ॉर्म व गंतव्य दिशा",
		platformNum: "प्लेटफ़ॉर्म {num}",
		towards: "की ओर",
		lounge: "✨ प्रीमियम लाउंज उपलब्ध",
		noPlatforms: "इस स्टेशन के लिए प्लेटफ़ॉर्म दिशा विवरण दर्ज नहीं है।"
	},
	gates: {
		title: "🚪 स्टेशन प्रवेश व निकास द्वार",
		divyangAccessible: "♿ दिव्यांग सुलभ",
		standardAccess: "🚶 मानक पहुंच",
		open: "खुला है",
		closed: "बंद है",
		noGates: "इस स्टेशन के लिए कोई विशिष्ट गेट विवरण उपलब्ध नहीं है।"
	},
	facilities: {
		title: "♿ स्टेशन सुविधाएं व सुविधाएं",
		noFacilities: "इस स्टेशन के लिए कोई सुविधा रिकॉर्ड नहीं मिला।"
	},
	parking: {
		capacityTitle: "🅿️ पार्किंग क्षमता",
		tariffsTitle: "💰 पार्किंग शुल्क व दर कार्ड",
		provider: "प्रदाता",
		car: "🚗 कार",
		bike: "🏍️ बाइक",
		cycle: "🚲 साइकिल",
		location: "स्थान",
		dayCharges: "दिन का शुल्क",
		nightCharges: "नाइट सरचार्ज",
		monthlyPass: "मासिक पास",
		helmetDeposit: "हेलमेट डिपॉज़िट",
		bicycleStand: "साइकिल स्टैंड",
		noParking: "🚫 इस स्टेशन पर कोई अधिकृत पार्किंग उपलब्ध नहीं है।",
		noTariff: "मानक मेट्रो पार्किंग दरें लागू हैं।"
	},
	verticalTransit: {
		title: "🛗 लिफ्ट व स्वचालित सीढ़ियां (वर्टिकल ट्रांजिट)",
		lifts: "🛗 लिफ्ट",
		escalators: "🪜 एस्केलेटर",
		code: "कोड",
		location: "स्थान",
		placement: "प्लेसमेंट",
		inside: "कॉनकोर्स के अंदर",
		outside: "कॉनकोर्स के बाहर",
		divyangFriendly: "दिव्यांग अनुकूल",
		stretcherFriendly: "स्ट्रेचर अनुकूल",
		direction: "दिशा",
		up: "ऊपर (Up)",
		down: "नीचे (Down)",
		bidirectional: "द्वि-दिशात्मक",
		status: "स्थिति",
		yes: "✔️ हाँ",
		no: "❌ नहीं",
		active: "सक्रिय",
		maintenance: "रखरखाव",
		noTransit: "कोई वर्टिकल ट्रांजिट (लिफ्ट/एस्केलेटर) रिकॉर्ड उपलब्ध नहीं है।"
	},
	feederBus: {
		title: "🚌 फीडर बस सेवा व लास्ट-मील कनेक्टिविटी",
		route: "रूट",
		frequency: "प्रत्येक {min} मिनट",
		firstBus: "पहली बस",
		lastBus: "अंतिम बस",
		noFeeder: "इस स्टेशन से कोई समर्पित फीडर बस सेवा दर्ज नहीं है।"
	},
	stationLayout: {
		title: "🗺️ स्टेशन बहु-स्तरीय नक़्शा व लेआउट",
		viewFloorPlan: "नक़्शा देखें",
		downloadPdf: "PDF लेआउट डाउनलोड करें",
		noLayout: "स्टेशन संरचनात्मक नक़्शा अपलोड नहीं है।"
	},
	nearby: {
		title: "📍 नजदीकी स्थान व प्रमुख स्थल",
		walking: "🚶 {min} मिनट पैदल",
		transit: "🚌 {min} मिनट वाहन से",
		directFob: "सीधा फुट-ओवर ब्रिज जुड़ाव",
		noNearby: "इस स्टेशन के लिए कोई नजदीकी स्थल दर्ज नहीं है।"
	}
};