// lang/pages/station_info.hi.js
export default {
	meta: {
		title: "स्टेशन विवरण - {name} | यात्रा-मार्ग",
		desc: "स्टेशन की संपूर्ण जानकारी, गेट, सुविधाएं, पार्किंग दरें, प्लेटफ़ॉर्म दिशा और फीडर कनेक्टिविटी: {name}।"
	},
	nav: {
		backBtn: "⬅️ सभी स्टेशनों पर वापस जाएं",
		backBtnAria: "स्टेशन डायरेक्टरी पर वापस लौटें"
	},
	hero: {
		stationCode: "स्टेशन कोड",
		layout: "लेआउट",
		noDescription: "इस स्टेशन के लिए कोई विवरण उपलब्ध नहीं है।",
		openInMaps: "📍 गूगल मैप्स पर देखें",
		openInMapsAria: "गूगल मैप्स पर स्टेशन की लोकेशन देखें",
		plusCode: "प्लस कोड",
		coordinates: "निर्देशांक",
		connectedLines: "🚆 जुड़ी हुई मेट्रो लाइन्स",
		layouts: {
			elevated: "एलिवेटेड",
			underground: "अंडरग्राउंड",
			"at-grade": "ग्राउंड लेवल"
		}
	},
	timings: {
		title: "संचालन समय सारणी",
		first: "पहली ट्रेन",
		last: "आखिरी ट्रेन",
		sundayTitle: "रविवार का समय"
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
		gateNum: "गेट नं. {num}",
		divyangAccessible: "♿ दिव्यांग सुलभ",
		standardAccess: "🚶 मानक पहुंच",
		open: "खुला है",
		closed: "बंद है",
		defaultArea: "निकास द्वार क्षेत्र",
		noGates: "इस स्टेशन के लिए कोई विशिष्ट गेट विवरण उपलब्ध नहीं है।"
	},
	facilities: {
		title: "♿ स्टेशन सुविधाएं",
		noFacilities: "इस स्टेशन के लिए कोई सुविधा रिकॉर्ड नहीं मिला।",
		categories: {
			"ATM": "एटीएम (ATM)",
			"Toilet": "शौचालय (टॉयलेट)",
			"Food / Restaurant": "खान-पान व रेस्टोरेंट",
			"Medical": "मेडिकल / प्राथमिक उपचार",
			"Medical Needs": "मेडिकल व प्राथमिक चिकित्सा",
			"Drinking Water": "पीने का पानी",
			"Information": "पूछताछ केंद्र",
			"Facilities for Differently Abled": "दिव्यांगजन सुविधाएं (व्हीलचेयर)",
			"Ticket Facilities": "टिकट व स्मार्ट कार्ड सुविधाएं",
			"Customer Services": "ग्राहक सेवा केंद्र (Customer Care)",
			"Basic Facilities": "बुनियादी यात्री सुविधाएं",
			"Women Facilities": "महिला सुरक्षा व विशेष सुविधाएं"
		},
		items: {
			"First Aid Assistance": "प्राथमिक चिकित्सा सहायता (First Aid)",
			"Reserved Spaces for wheelchair in train": "ट्रेन में व्हीलचेयर हेतु आरक्षित जगह",
			"Extra Wide Automatic Flag Gates": "चौड़े ऑटोमैटिक फ्लैग गेट्स (व्हीलचेयर हेतु)",
			"Separate Toilets": "अलग शौचालय (दिव्यांगजनों हेतु)",
			"Differently Abled Friendly": "दिव्यांग अनुकूल वातावरण",
			"Group Ticketing": "ग्रुप टिकट काउंटर",
			"Ticket vending & Card recharge": "टिकट वेंडिंग मशीन (TVM) व कार्ड रिचार्ज",
			"Customer care": "कस्टमर केयर / सहायता केंद्र",
			"Drinking water facility": "पीने के पानी की सुविधा",
			"Public Wifi Available": "मुफ़्त वाई-फाई (Free Wi-Fi)",
			"Female CISF Staff": "महिला सुरक्षाकर्मी (CISF)"
		},
		locations: {
			"Concourse": "कॉनकोर्स",
			"Platform": "प्लेटफ़ॉर्म",
			"Ground": "ग्राउंड लेवल"
		}
	},
	parking: {
		capacityTitle: "🅿️ पार्किंग क्षमता",
		tariffsTitle: "💰 पार्किंग शुल्क",
		provider: "प्रदाता",
		car: "🚗 कार",
		bike: "🏍️ बाइक",
		cycle: "🚲 साइकिल",
		location: "स्थान",
		notAvailable: "उपलब्ध नहीं",
		nearExitGate: "निकास द्वार के पास",
		authorisedParking: "अधिकृत पार्किंग",
		dayCharges: "दिन का शुल्क",
		nightCharges: "नाइट चार्ज",
		monthlyPass: "मासिक पास",
		helmetDeposit: "हेलमेट जमा",
		bicycleStand: "साइकिल स्टैंड",
		noParking: "🚫 इस स्टेशन पर अधिकृत पार्किंग उपलब्ध नहीं है।",
		noTariff: "मानक मेट्रो पार्किंग दरें लागू हैं।",
		authorisedNoticeTitle: "🅿️ अधिकृत स्टेशन पार्किंग ({state})",
		authorisedNoticeDesc: "स्वचालित स्मार्ट टिकटिंग, सीसीटीवी और दिव्यांगों के लिए आरक्षित स्लॉट के साथ 24x7 उपलब्ध।",
		passes: {
			dayOnly: "डे पास",
			full247: "24/7 पास",
			tariffA: "सामान्य पास",
			tariffB: "एग्जीक्यूटिव पास"
		},
		duration: {
			upTo: "{time} तक",
			range: "{from} से {to}",
			day: "{count} दिन",
			days: "{count} दिन",
			hrs: "{count} घंटे",
			min: "{count} मिनट"
		}
	},
	verticalTransit: {
		title: "🛗 लिफ्ट व एस्केलेटर",
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
		bidirectional: "दोनों तरफ (Up/Down)",
		status: "स्थिति",
		yes: "✔️ हाँ",
		no: "❌ नहीं",
		active: "चालू है",
		maintenance: "रखरखाव जारी",
		noTransit: "कोई लिफ्ट या एस्केलेटर रिकॉर्ड उपलब्ध नहीं है।",
				locations: {
			"Concourse to Platform": "कॉनकोर्स से प्लेटफ़ॉर्म",
			"CONCOURSE TO PLATFORM": "कॉनकोर्स से प्लेटफ़ॉर्म",
			"Ground to unpaid concourse": "ग्राउंड से कॉनकोर्स",
			"GROUND TO UNPAID CONCOURSE": "ग्राउंड से कॉनकोर्स",
			"Ground to Platform": "ग्राउंड से प्लेटफ़ॉर्म",
			"GROUND TO PLATFORM": "ग्राउंड से प्लेटफ़ॉर्म"
		}
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
		downloadPdfAria: "स्टेशन लेआउट का बहु-स्तरीय PDF डाउनलोड करें",
		noLayout: "स्टेशन संरचनात्मक नक़्शा अपलोड नहीं है।"
	},
	nearby: {
		title: "📍 नजदीकी मुख्य स्थल",
		walking: "🚶 {min} मिनट पैदल",
		transit: "🚌 {min} मिनट वाहन से",
		directFob: "सीधा फुट-ओवर ब्रिज",
		noNearby: "इस स्टेशन के लिए कोई नजदीकी स्थल दर्ज नहीं है।",
		categories: {
			"Hospital": "अस्पताल (हॉस्पिटल)",
			"Health": "स्वास्थ्य व क्लिनिक",
			"Police Station": "पुलिस स्टेशन",
			"Fire Station": "फायर स्टेशन",
			"Bus Stand": "बस स्टैंड",
			"Transportation": "परिवहन व बंदरगाह",
			"Mall": "मॉल / शॉपिंग सेंटर",
			"School": "स्कूल / कॉलेज",
			"Institutional": "शैक्षणिक व संस्थान",
			"Metro Station": "मेट्रो स्टेशन",
			"Railway Station": "रेलवे स्टेशन",
			"Park": "पार्क व मैदान",
			"Recreation": "उद्यान व मनोरंजन",
			"Hotel": "होटल",
			"Government Offices": "सरकारी कार्यालय",
			"Private Offices": "कॉर्पोरेट व प्राइवेट ऑफिस",
			"Industry": "उद्योग व कंपनी",
			"Religious": "धार्मिक स्थल / मंदिर",
			"Tourist Place": "पर्यटन स्थल",
			"Residental": "आवासीय क्षेत्र (रेजिडेंशियल)",
			"Others": "अन्य स्थल"
		}
	},
	notFound: {
		title: "⚠️ स्टेशन नहीं मिला",
		message: "अनुरोधित स्टेशन कोड/आईडी \"{stationId}\" हमारे मेट्रो डायरेक्टरी में नहीं मिला।"
	},
	
};