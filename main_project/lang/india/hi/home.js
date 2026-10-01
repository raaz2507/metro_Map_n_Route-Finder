// /lang/india/hi/home.js
export default {
	// 1. Navigation Bars (Exclusive to Home)
	navSidebar: {
		route: "मार्ग खोजें",
		recent: "हालिया खोज",
		map: "नक्शा",
		setting: "सेटिंग",
		ariaNav: "साइडबार नेविगेशन",
		ariaPanel: "साइडबार सामग्री पैनल",
		closeAria: "साइडबार पैनल बंद करें"
	},
	navFloating: {
		alarm: "अलार्म",
		ticket: "टिकट",
		wrapperAria: "फ्लोटिंग नेविगेशन बार",
		mobileNavAria: "मोबाइल नेविगेशन"
	},

	// 2. Route Finder (Inputs, Priorities, Journey Details, Timeline)
	findRoute: {
		title: "मार्ग खोजक (Route Finder)",
		from: "प्रारंभिक स्टेशन",
		to: "गंतव्य स्टेशन",
		fromPlaceholder: "स्टार्ट स्टेशन दर्ज करें",
		toPlaceholder: "गंतव्य स्टेशन दर्ज करें",
		swapBtn: "स्टेशन आपस में बदलें",
		submitBtn: "रूट खोजें",
		resetBtn: "रीसेट",
		priorityLabel: "प्राथमिकता",
		priorityShortest: "सबसे छोटा मार्ग",
		priorityInterchange: "कम इंटरचेंज",
		journeyDetails: "यात्रा विवरण",
		routeSummary: {
			stations: "{count} स्टेशन",
			station: "{count} स्टेशन",
			fare: "₹{fare}",
			travelTime: "{minutes} मिनट",
			distance: "{distance} किमी",
			interchange: "{count} इंटरचेंज",
			interchanges: "{count} इंटरचेंज",
			disclaimer: "दिखाया गया समय अनुमानित यात्रा समय है। यात्रियों को अतिरिक्त समय लेकर चलने की सलाह दी जाती है।"
		},
		timeline: {
			activeNow: "सक्रिय ट्रेन",
			showOnMap: "नक्शे पर रूट देखें",
			gate: "गेट",
			firstTrain: "पहली ट्रेन",
			lastTrain: "आखिरी ट्रेन",
			directionText: "{terminal} की ओर · प्लेटफॉर्म {platform}",
			splitFareTitle: "टुकड़ों में किराया एवं टिकट विवरण",
			splitFareSubtitle: "{count} अलग-अलग लाइन खंडों का किराया देखने के लिए टैप करें",
			smartCardSavings: "स्मार्ट कार्ड से ₹{amount} बचाएं!"
		},
		transferModes: {
			crossPlatform: "क्रॉस-प्लेटफॉर्म",
			samePlatform: "समान प्लेटफॉर्म",
			levelChange: "लेवल {level} बदलें",
			escalator: "एस्केलेटर / सीढ़ियां",
			skywalk: "स्काईवॉक ({distance}m)",
			corridor: "कॉरिडोर ({distance}m)",
			freeERickshaw: "मुफ्त ई-रिक्शा",
			securityCheck: "सुरक्षा जांच",
			accessible: "व्हीलचेयर सुलभ"
		}
	},

	// 3. Recent Searches
	recent: {
		title: "हालिया यात्राएं",
		clearAll: "सभी हटाएं",
		tabRecent: "हालिया",
		tabMostUsed: "अक्सर प्रयुक्त",
		tabAz: "अ-क-ग (A-Z)",
		empty: "कोई हालिया यात्रा नहीं मिली",
		deleteAria: "रूट हटाएं"
	},

	// 4. App Settings Panel
	settings: {
		title: "ऐप सेटिंग्स",
		tabs: {
			alarm: "अलार्म",
			map: "नक्शा",
			backup: "बैकअप / रीस्टोर",
			packs: "पैक्स"
		},
		packs: {
			langHeading: "भाषा पैक्स",
			langDesc: "ऑफ़लाइन उपयोग के लिए भाषाएँ डाउनलोड करें या डिवाइस स्टोरेज खाली करने के लिए हटाएं।",
			themeHeading: "थीम पैक्स",
			themeDesc: "कस्टम स्टाइलिंग और विज़ुअल अपीयरेंस एक्सटेंशन।",
			webNotice: "वेब पर, भाषाएं और थीम मांग पर स्वचालित रूप से लोड होती हैं। ऑफ़लाइन पैक प्रबंधन इंस्टॉल किए गए PWA और एंड्रॉइड ऐप में उपलब्ध है।",
			coreBuiltin: "कोर सिस्टम (डिफ़ॉल्ट)",
			installed: "इंस्टॉल किया गया",
			downloadBtn: "डाउनलोड",
			uninstallBtn: "अनइंस्टॉल",
			downloading: "डाउनलोड हो रहा है...",
			uninstalling: "हटाया जा रहा है...",
			confirmUninstallLang: "क्या आप वाकई {langName} पैक हटाना चाहते हैं? ऐप वापस अंग्रेजी पर स्विच हो जाएगा।",
			confirmUninstallTheme: "क्या आप वाकई {themeName} थीम पैक हटाना चाहते हैं?",
			sizeApprox: "~{size} KB",
			themeComingSoon: "नई थीम्स जल्द आ रही हैं"
		},
		alarm: {
			title: "अलार्म सेटिंग्स",
			subtitle: "दूरी एवं ध्वनि प्राथमिकताएं",
			triggersHeading: "🎯 ट्रिगर एवं जियोफेंस",
			thresholdLabel: "आगमन चेतावनी दूरी",
			thresholdDesc: "जब ट्रेन स्टेशन से इस दूरी के भीतर पहुंचेगी तो अलार्म बजेगा।",
			thresholdOptions: {
				station1: "🚉 1 स्टेशन पहले (निकटता)",
				m200: "200 मीटर (~1 मिनट)",
				m500: "500 मीटर (अनुशंसित)",
				m1000: "1.0 किलोमीटर (~2-3 मिनट)",
				m2000: "2.0 किलोमीटर (~4-5 मिनट)"
			},
			destAlertLabel: "गंतव्य स्टेशन अलार्म",
			destAlertDesc: "गंतव्य पर पहुंचने से पहले जोर से रिंगटोन बजाता है।",
			interchangeAlertLabel: "लाइन इंटरचेंज अलार्म",
			interchangeAlertDesc: "ट्रेन लाइन बदलने से 1 स्टेशन पहले आपको सचेत करता है।",
			audioHeading: "🔊 ध्वनि एवं वॉल्यूम",
			toneLabel: "अलार्म रिंगटोन",
			toneOptions: {
				chime: "🔔 मेट्रो चाइम (मधुर)",
				loud: "🚨 लाउड सायरन (जागने हेतु)",
				subtle: "🎵 मारिम्बा धुन",
				ping: "📍 सिंगल पिंग ध्वनि"
			},
			testToneBtn: "ध्वनि सुनें",
			volumeLabel: "अलार्म वॉल्यूम",
			vibeHeading: "📳 हैप्टिक्स एवं कंपन",
			vibeLabel: "कंपन पैटर्न",
			vibePatterns: {
				long: "लंबा अलर्ट पैटर्न",
				short: "छोटी पल्स",
				sos: "एसओएस (SOS) पैटर्न",
				continuous: "लगातार कंपन"
			},
			testVibeBtn: "कंपन टेस्ट करें",
			voiceHeading: "🗣️ ऑफ़लाइन वॉयस अलर्ट",
			voiceLabel: "वॉयस घोषणाएं (TTS)",
			voiceDesc: "आने वाले स्टेशन का नाम और लाइन बदलने का रिमाइंडर ऑफ़लाइन बोलकर बताता है।",
			voiceSelectLabel: "घोषणा आवाज़ चुनें"
		},
		map: {
			title: "मानचित्र एवं प्रदर्शन",
			subtitle: "कैनवास एवं दृश्य स्टाइल",
			heading: "🗺️ कैनवास प्रदर्शन विकल्प",
			autoCenterLabel: "सर्च पर स्टेशन ऑटो-सेंटर करें",
			autoCenterDesc: "स्टार्ट/गंतव्य चुनने पर नक्शे को सहजता से केंद्र में लाता है।",
			stationLabelsLabel: "मध्यवर्ती स्टेशन नाम दिखाएं",
			stationLabelsDesc: "ट्रैक के साथ हमेशा स्टेशन लेबल्स प्रदर्शित रखता है।",
			walkwaysLabel: "इंटरचेंज पैदल रास्ते बनाएं",
			walkwaysDesc: "नक्शे पर इंटरचेंज कनेक्टर्स (डैश लाइन) रेंडर करता है।",
			resetMapBtn: "नक्शा दृश्य व ज़ूम रीसेट करें"
		},
		backup: {
			title: "बैकअप एवं रीस्टोर",
			subtitle: "डेटा संरक्षण",
			heading: "💾 स्थानीय ऐप डेटा",
			desc: "अपनी हालिया यात्राएं, पसंदीदा मार्ग और कस्टम सेटिंग्स ऑफ़लाइन फ़ाइल के रूप में सुरक्षित करें।",
			exportBtn: "डाउनलोड",
			importBtn: "इंपोर्ट",
			resetHeading: "⚠️ ऐप रीसेट करें",
			resetDesc: "सभी सहेजे गए मार्ग, प्राथमिकताएं हटाएं और ऐप को नई स्थिति में रीसेट करें।",
			resetBtn: "डेटा साफ़ करें"
		}
	},

	// 5. Interactive SVG Map Controls
	map: {
		label: "मेट्रो नेटवर्क मानचित्र",
		legend: "संकेत सूची (Legend)",
		clearRoute: "रूट हटाएं",
		showRoute: "रूट देखें",
		clearFilter: "फ़िल्टर हटाएं",
		metroTrackLines: "मेट्रो ट्रैक लाइन्स",
		stationType: "स्टेशन के प्रकार",
		trackStatus: "ट्रैक एवं स्टेशन स्थिति",
		viewStationInfo: "स्टेशन विवरण देखें",
		ariaMap: "इंटरएक्टिव मेट्रो नक्शा",
		controls: {
			zoomInAria: "ज़ूम इन करें",
			zoomOutAria: "ज़ूम आउट करें",
			resetAria: "ज़ूम और केंद्र रीसेट करें",
			fitBoundsAria: "नक्शे को स्क्रीन पर फिट करें",
			gpsTrackAria: "नक्शे पर लाइव लोकेशन ट्रैक करें"
		}
	},

	// 6. Sensor Telemetry Widget
	telemetry: {
		title: "लाइव यात्रा टेलीमेट्री",
		gpsBadge: "जीपीएस लाइव",
		gpsLabel: "जीपीएस स्थिति",
		netLabel: "नेटवर्क",
		accuracyLabel: "सटीकता",
		guideTitle: "📡 टेलीमेट्री और जीपीएस गाइड",
		status: {
			blocked: "अवरुद्ध (Blocked)",
			notAllowed: "अनुमति चाहिए",
			off: "जीपीएस बंद",
			tunnel: "सुरंग में",
			searching: "खोज रहा है...",
			ready: "तैयार",
			active: "सक्रिय",
			online: "ऑनलाइन",
			offline: "ऑफ़लाइन",
			inactive: "निष्क्रिय",
			calculating: "प्राप्त कर रहा है..."
		},
		guideItems: {
			active: "🟢 80%-100%: मजबूत सैटेलाइट सिग्नल",
			fair: "🟡 40%-79%: मध्यम सिग्नल",
			tunnel: "🔴 सुरंग में: टाइमर बैकअप सक्रिय",
			deviceOff: "📵 जीपीएस बंद: डिवाइस लोकेशन चालू करें",
			blocked: "🚫 अवरुद्ध: लोकेशन अनुमति अस्वीकृत"
		},
		speedLabel: "वर्तमान गति",
		speedUnit: "किमी/घंटा",
		nextStopLabel: "अगला स्टेशन",
		distRemainingLabel: "बची हुई दूरी"
	},

	// 7. Live Journey Speedometer
	speedometer: {
		title: "लाइव यात्रा स्पीडोमीटर",
		speedUnit: "किमी/घंटा",
		maxSpeed: "अधिकतम गति: {speed} किमी/घंटा",
		avgSpeed: "औसत गति: {speed} किमी/घंटा",
		motionStatus: "गति स्थिति",
		statusStates: {
			departing: "स्टेशन से प्रस्थान",
			cruising: "सामान्य गति में",
			decelerating: "धीमी हो रही है / रुकने वाली है",
			stationary: "स्थिर / प्लेटफॉर्म पर खड़ी है"
		}
	},

	// 8. Alarm Dynamic Banner Bar
	alarmBanner: {
		title: "यात्रा अलार्म सक्रिय है",
		approachingNotice: "~{dist}m में {station} आ रहा है",
		interchangeNotice: "{station} पर लाइन बदलें!",
		destinationNotice: "गंतव्य {station} अगला स्टेशन है! उतरने की तैयारी करें।",
		snoozeBtn: "2 मिनट स्नूज़",
		dismissBtn: "मैं पहुँच गया",
		enabledToast: "🔔 लाइव यात्रा अलार्म सक्रिय हो गया!",
		stoppedToast: "🛑 लाइव अलार्म बंद कर दिया गया।"
	},
	// 8.1 GPS & Location Status Messages
	gps: {
		permissionDenied: "📍 लोकेशन अनुमति अस्वीकृत (Denied) है। कृपया ब्राउज़र सेटिंग्स में लोकेशन ऑन करें।",
		unavailable: "⚠️ GPS सिग्नल उपलब्ध नहीं है। अलार्म अनुमानित समय पर चलेगा।",
		gpsFallbackWarning: "⚠️ GPS सिग्नल कमजोर है, टाइमर फ़ॉलबैक सक्रिय है।"
	},

	// 9. Share Route Modal
	shareModal: {
		title: "रूट साझा करें",
		selectOption: "साझा करने का विकल्प चुनें:",
		whatsapp: "व्हाट्सएप",
		telegram: "टेलीग्राम",
		sms: "एसएमएस",
		copyLink: "लिंक कॉपी करें",
		copyDetails: "विवरण कॉपी करें",
		closeAria: "शेयर मोडल बंद करें"
	},

	// 10. Global Toast Notifications Hub
	toast: {
		alarm: {
			enabled: "लाइव यात्रा अलार्म सक्रिय हो गया",
			stopped: "लाइव अलार्म बंद कर दिया गया",
			snoozed: "अलार्म 2 मिनट के लिए स्नूज़ किया गया",
			dismissed: "गंतव्य के लिए अगला अलर्ट सक्रिय",
			noRoute: "अलार्म सेट करने से पहले कृपया रूट खोजें"
		},
		settings: {
			backupSuccess: "💾 बैकअप सफलतापूर्वक डाउनलोड हो गया!",
			backupFailed: "बैकअप बनाने में विफल।",
			restoreSuccess: "✅ बैकअप सफलतापूर्वक रीस्टोर हो गया! पुनः लोड हो रहा है...",
			restoreInvalid: "⚠️ अमान्य या दूषित बैकअप फ़ाइल।",
			restoreSizeLimit: "⚠️ बैकअप फ़ाइल 1MB से कम होनी चाहिए।",
			shareFailed: "⚠️ बैकअप साझा करने में असमर्थ।",
			saveFailed: "⚠️ दस्तावेज़ों में सहेजने में विफल।",
			vibeSuccess: "📳 कंपन शुरू हुआ! (यदि महसूस न हो तो हैप्टिक्स जांचें)",
			vibeBlocked: "⚠️ कंपन अवरुद्ध। सुनिश्चित करें कि फ़ोन साइलेंट/DND पर नहीं है।",
			vibeUnsupported: "📳 कंपन केवल मोबाइल उपकरणों (Android/PWA) पर समर्थित है",
			packDownloaded: "{name} सफलतापूर्वक डाउनलोड हो गया!",
			packRemoved: "{name} पैक हटा दिया गया।",
			packDownloadError: "पैक डाउनलोड करने में विफल। कृपया इंटरनेट जांचें।"
		},
		share: {
			copiedLink: "रूट लिंक क्लिपबोर्ड पर कॉपी हो गया!",
			copiedDetails: "यात्रा विवरण क्लिपबोर्ड पर कॉपी हो गया!",
			shareFailed: "रूट साझा करने में असमर्थ।"
		},
		route: {
			noRoute: "इन स्टेशनों के बीच कोई सीधा रूट नहीं मिला।",
			sameStation: "प्रारंभिक और गंतव्य स्टेशन समान नहीं हो सकते।"
		}
	}
};