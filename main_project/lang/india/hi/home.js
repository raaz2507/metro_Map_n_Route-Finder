// /lang/hi/home.js
export default {
	// 1. Navigation Bars (Exclusive to Home)
	navSidebar: {
		route: "मार्ग खोजें",
		recent: "हालिया",
		map: "मानचित्र",
		setting: "सेटिंग",
		ariaNav: "साइडबार नेविगेशन",
		ariaPanel: "साइडबार सामग्री पैनल",
		closeAria: "साइडबार पैनल बंद करें"
	},
	navFloating: {
		alarm: "अलार्म",
		ticket: "टिकट",
		wrapperAria: "फ्लोटिंग नेविगेशन कंटेनर",
		mobileNavAria: "मोबाइल नेविगेशन"
	},

	// 2. Route Finder (Inputs, Priorities, Journey Details, Timeline)
	findRoute: {
		title: "मार्ग खोजक",
		from: "से",
		to: "तक",
		fromPlaceholder: "प्रारंभ स्टेशन दर्ज करें",
		toPlaceholder: "गंतव्य स्टेशन दर्ज करें",
		swapBtn: "स्टेशन बदलें",
		submitBtn: "मार्ग खोजें",
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
			disclaimer: "दिखाया गया समय केवल अनुमानित यात्रा समय है। यात्रियों को यात्रा के लिए अतिरिक्त समय रखने की सलाह दी जाती है।"
		},
		timeline: {
			activeNow: "अभी लागू",
			showOnMap: "मानचित्र पर मार्ग दिखाएं",
			gate: "गेट",
			firstTrain: "प्रथम ट्रेन",
			lastTrain: "अंतिम ट्रेन",
			directionText: "दिशा: {terminal} की ओर · प्लेटफ़ॉर्म {platform}",
			splitFareTitle: "किराया विभाजन एवं टिकट विवरण",
			splitFareSubtitle: "{count} अलग-अलग लाइन सेगमेंट के किराए देखने हेतु टैप करें",
			smartCardSavings: "स्मार्ट कार्ड इस्तेमाल करने पर ₹{amount} की सीधी बचत!"
		},
		transferModes: {
			crossPlatform: "क्रॉस-प्लेटफ़ॉर्म",
			samePlatform: "उसी प्लेटफ़ॉर्म पर",
			levelChange: "लेवल {level} बदलाव",
			escalator: "एस्केलेटर / सीढ़ियाँ",
			skywalk: "स्काईवॉक ({distance}m)",
			corridor: "कॉरिडोर ({distance}m)",
			freeERickshaw: "मुफ्त ई-रिक्शा",
			securityCheck: "सुरक्षा जांच",
			accessible: "व्हीलचेयर सुलभ"
		},
		alerts: {
			multimodalSecurity: "मल्टीमॉडल जंक्शन: अलग गेट और दोबारा सुरक्षा जांच (Security Check)",
			ncmcCard: "RuPay NCMC / स्मार्ट कार्ड सीधे गेट पर चलेगा",
			walkwayNotice: "{distance}m वॉकवे (~{minutes} मिनट पैदल रास्ता)",
			sharedTrackNotice: "साझा ट्रैक: उसी प्लेटफॉर्म से लोकल व एक्सप्रेस ट्रेन उपलब्ध"
		}
	},

	// 3. Recent Searches
	recent: {
		title: "हालिया खोजें",
		clearAll: "सभी साफ़ करें",
		tabRecent: "हालिया",
		tabMostUsed: "अक्सर उपयोग किए गए",
		tabAz: "अ-ज्ञ (A-Z)",
		empty: "कोई हालिया यात्रा नहीं मिली",
		deleteAria: "मार्ग हटाएं"
	},

	// 4. App Settings Panel
	settings: {
		title: "ऐप सेटिंग्स",
		tabs: {
			alarm: "अलार्म",
			map: "नक़्शा",
			backup: "बैकअप / रीस्टोर",
			packs: "पैक (Packs)"
		},
		packs: {
			langHeading: "भाषा पैक (Language Packs)",
			langDesc: "ऑफ़लाइन उपयोग के लिए भाषाएं डाउनलोड करें या डिवाइस स्टोरेज खाली करने हेतु हटाएं।",
			themeHeading: "थीम पैक (Theme Packs)",
			themeDesc: "कस्टम स्टाइल और विजुअल डिज़ाइन एक्सटेंशन।",
			webNotice: "वेबसाइट पर भाषाएं और थीम्स ज़रूरत पड़ने पर अपने-आप लोड होती हैं। ऑफ़लाइन पैक प्रबंधन केवल PWA और Android ऐप में उपलब्ध है।",
			coreBuiltin: "सिस्टम कोर (डिफ़ॉल्ट)",
			installed: "इंस्टॉल है",
			downloadBtn: "डाउनलोड करें",
			uninstallBtn: "हटाएं",
			downloading: "डाउनलोड हो रहा है...",
			uninstalling: "हटाया जा रहा है...",
			confirmUninstallLang: "क्या आप वाकई {langName} भाषा पैक हटाना चाहते हैं? ऐप वापस अंग्रेज़ी पर स्विच हो जाएगी।",
			confirmUninstallTheme: "क्या आप वाकई {themeName} थीम पैक हटाना चाहते हैं?",
			sizeApprox: "~{size} KB",
			themeComingSoon: "नई थीम्स जल्द उपलब्ध होंगी"
		},
		alarm: {
			title: "अलार्म एवं यात्रा सेटिंग्स",
			subtitle: "अलर्ट, थ्रेसहोल्ड दूरी और ऑडियो विकल्प सेट करें",
			triggersHeading: "🎯 अलर्ट ट्रिगर व दूरी",
			thresholdLabel: "स्टेशन आगमन अलर्ट दूरी",
			thresholdDesc: "स्टेशन से इतनी दूरी पहले अलार्म बजना शुरू होगा।",
			thresholdOptions: {
				station1: "🚉 1 स्टेशन पहले (पहुँच अलर्ट)",
				m200: "200 मीटर (~1 मिनट)",
				m500: "500 मीटर (अनुशंसित)",
				m1000: "1.0 किलोमीटर (~2-3 मिनट)",
				m2000: "2.0 किलोमीटर (~4-5 मिनट)"
			},
			destAlertLabel: "गंतव्य स्टेशन अलार्म",
			destAlertDesc: "अंतिम स्टेशन आने से पहले तेज अलार्म बजाएगा।",
			interchangeAlertLabel: "इंटरचेंज लाइन चेंज अलार्म",
			interchangeAlertDesc: "मेट्रो लाइन बदलने वाले स्टेशन पर उतरने के लिए पहले ही सचेत करेगा।",
			audioHeading: "🔊 ध्वनि व आवाज़",
			toneLabel: "अलार्म टोन",
			tones: {
				chime: "मेट्रो चाइम (मधुर)",
				beep: "वॉर्निंग बीप (पल्स)",
				siren: "इमरजेंसी सायरन",
				custom: "कस्टम ऑडियो (MP3 फ़ाइल)"
			},
			volumeLabel: "अलार्म वॉल्यूम",
			testSoundBtn: "🔊 आवाज़ टेस्ट करें",
			uploadMp3Label: "कस्टम MP3 फ़ाइल चुनें",
			vibeHeading: "📳 कंपन (वाइब्रेशन)",
			vibeLabel: "वाइब्रेशन पैटर्न",
			vibePatterns: {
				long: "लंबा अलर्ट पैटर्न",
				short: "छोटे पल्स",
				sos: "एसओएस (SOS) पैटर्न",
				continuous: "लगातार कंपन"
			},
			testVibeBtn: "📳 वाइब्रेशन टेस्ट करें",
			voiceHeading: "🗣️ ऑफ़लाइन वॉइस उद्घोषणा",
			voiceLabel: "वॉइस अनाउंसमेंट (TTS)",
			voiceDesc: "आने वाले स्टेशन का नाम और लाइन बदलने की जानकारी बोलकर बताएगा।",
			voiceSelectLabel: "उद्घोषणा की आवाज़",
			testVoiceBtn: "🗣️ आवाज़ टेस्ट करें",
			resetBtn: "डिफ़ॉल्ट रीसेट करें"
		},
		map: {
			title: "मानचित्र एवं डिस्प्ले सेटिंग्स",
			heading: "🗺️ मानचित्र दृश्य एवं डिस्प्ले",
			autoCenterLabel: "रूट पर ऑटो-सेंटर करें",
			autoCenterDesc: "नया रूट खोजने पर मानचित्र को अपने आप ज़ूम और सेंटर में लाएं।",
			walkwaysLabel: "इंटरचेंज पैदल रास्ते दिखाएं",
			walkwaysDesc: "लाइन बदलने वाले स्टेशनों के बीच कनेक्टिंग फुटपाथ लाइनें दिखाएं।",
			underConstructionLabel: "निर्माणाधीन लाइनें व स्टेशन",
			underConstructionDesc: "मैप पर निर्माणाधीन लाइनों (डैश लाइन) और स्टेशनों को दिखाएं।",
			approvedLabel: "प्रस्तावित / स्वीकृत कॉरिडोर",
			approvedDesc: "मैप पर स्वीकृत और प्रस्तावित भविष्य के मेट्रो ट्रैक (डॉटेड लाइन) दिखाएं।"
		},
		backup: {
			title: "💾 डेटा बैकअप एवं रीस्टोर",
			desc: "अपने सेव किए गए रूट्स, अलार्म और ऐप प्राथमिकताओं को सुरक्षित रखें।",
			exportBtn: "डेटा एक्सपोर्ट करें",
			importBtn: "डेटा इम्पोर्ट करें"
		}
	},

	// 5. Interactive SVG Map Controls
	map: {
		label: "नक़्शा",
		legend: "संकेत सूची (Legend)",
		metroTrackLines: "मेट्रो ट्रैक लाइन्स",
		stationType: "स्टेशन प्रकार",
		trackStatus: "ट्रैक व स्टेशन स्थिति",
		clearRoute: "रूट हटाएं",
		showRoute: "रूट दिखाएं",
		clearFilter: "फ़िल्टर हटाएं",
		viewStationInfo: "स्टेशन विवरण देखें",
		ariaMap: "इंटरैक्टिव मेट्रो नक़्शा"
	},

	// 6. Alarm Banner (Live Sticky Notification Bar)
	alarmBanner: {
		approaching: "स्टेशन आगमन सूचना",
		trackingActive: "🛰️ लाइव यात्रा ट्रैकिंग सक्रिय",
		interchangeAlert: "इंटरचेंज स्टेशन • कृपया यहाँ लाइन बदलें",
		destinationAlert: "गंतव्य स्टेशन • कुछ ही देर में आगमन",
		dismissBtn: "🔕 बंद करें",
		snoozeBtn: "⏱️ स्नूज़ (2 मिनट)",
		stopAlarmBtn: "🛑 अलार्म रोकें"
	},

	// 7. Telemetry & Live Sensors
	telemetry: {
		title: "सिग्नल टेलीमेट्री",
		gpsLabel: "GPS स्थिति",
		netLabel: "नेटवर्क",
		accuracyLabel: "सटीकता",
		guideTitle: "📡 टेलीमेट्री व GPS गाइड",
		guideItems: {
			active: "🟢 80%-100%: मजबूत सैटेलाइट लॉक (सक्रिय GPS)",
			fair: "🟡 40%-79%: मध्यम सिग्नल (स्टेशन शेड/इमारतें)",
			tunnel: "🔴 टनल में: अंडरग्राउंड यात्रा (टाइमर फ़ॉलबैक सक्रिय)",
			deviceOff: "📵 फोन का GPS बंद: कृपया डिवाइस लोकेशन चालू करें",
			blocked: "🚫 ब्लॉक है: ब्राउज़र में लोकेशन अनुमति बंद है"
		},
		status: {
			blocked: "🚫 ब्लॉक है",
			notAllowed: "⚠️ अनुमति नहीं",
			off: "📵 GPS बंद",
			tunnel: "🚇 टनल में (0%)",
			active: "🛰️ सक्रिय",
			online: "ऑनलाइन",
			offline: "ऑफ़लाइन",
			ready: "🛰️ तैयार है",
			searching: "🛰️ खोज रहा है..."
		}
	},

	// 8. Speedometer Widget
	speedometer: {
		title: "लाइव स्पीडोमीटर",
		topSpeed: "अधिकतम गति",
		gpsAccuracy: "GPS सटीकता",
		statusLabel: "स्थिति",
		statusStates: {
			halted: "ट्रेन रुकी हुई है",
			departing: "गति पकड़ रही है",
			cruising: "पूरी रफ़्तार पर"
		}
	},

	// 9. Share Route Modal
	shareModal: {
		title: "मार्ग साझा करें",
		selectOption: "साझा करने का विकल्प चुनें:",
		whatsapp: "व्हाट्सएप",
		telegram: "टेलीग्राम",
		sms: "एसएमएस",
		copyLink: "लिंक कॉपी करें",
		copyDetails: "विवरण कॉपी करें",
		closeAria: "शेयर विंडो बंद करें"
	},

	// 10. Global Toast Notifications Hub
	toast: {
		alarm: {
			enabled: "लाइव यात्रा अलार्म चालू किया गया",
			stopped: "लाइव अलार्म बंद किया गया",
			snoozed: "अलार्म 2 मिनट के लिए स्नूज़ किया गया",
			dismissed: "अगला अलर्ट गंतव्य स्टेशन के लिए सक्रिय है",
			noRoute: "अलार्म शुरू करने के लिए पहले रूट खोजें"
		},
		settings: {
			backupSuccess: "💾 बैकअप सफलतापूर्वक डाउनलोड हो गया!",
			backupFailed: "बैकअप बनाने में विफल।",
			restoreSuccess: "✅ बैकअप सफलतापूर्वक रीस्टोर हुआ! रीलोड हो रहा है...",
			restoreInvalid: "⚠️ अमान्य या दूषित बैकअप फ़ाइल।",
			restoreSizeLimit: "⚠️ बैकअप फ़ाइल 1MB से कम होनी चाहिए।",
			shareFailed: "⚠️ बैकअप साझा करने में विफल।",
			saveFailed: "⚠️ दस्तावेज़ों में सहेजने में विफल।",
			vibeSuccess: "📳 वाइब्रेशन ट्रिगर हुआ! (यदि महसूस न हो, तो फोन की Haptic सेटिंग्स चेक करें)",
			vibeBlocked: "⚠️ फोन द्वारा वाइब्रेशन ब्लॉक हुआ। कृपया चेक करें: फोन Silent/DND पर न हो और Haptics ऑन हो।",
			vibeUnsupported: "📳 वाइब्रेशन केवल मोबाइल फोन (Android/PWA) पर समर्थित है",
			packDownloaded: "{name} सफलतापूर्वक डाउनलोड हो गया!",
			packRemoved: "{name} पैक हटा दिया गया।",
			packDownloadError: "पैक डाउनलोड करने में विफल। कृपया इंटरनेट कनेक्शन जांचें।"
		},
		share: {
			copiedLink: "रूट लिंक क्लिपबोर्ड पर कॉपी हो गया!",
			copiedDetails: "रूट विवरण क्लिपबोर्ड पर कॉपी हो गया!",
			shareFailed: "रूट साझा करने में विफल।"
		},
		route: {
			noRoute: "इन दोनों स्टेशनों के बीच कोई मार्ग नहीं मिला।",
			sameStation: "प्रारंभ और गंतव्य स्टेशन एक जैसे नहीं हो सकते।"
		},
		gps: {
			permissionDenied: "📍 लोकेशन अनुमति अस्वीकृत। लाइव स्पीड और अलार्म अलर्ट के लिए GPS अनुमति दें।",
			unavailable: "📍 GPS सिग्नल नहीं मिल रहा। कृपया फ़ोन की लोकेशन चालू करें।",
			fallbackWarning: "⚠️ GPS बंद या अनुपलब्ध है। अलार्म फ़ॉलबैक मोड (टाइमर और मोशन सेंसर) पर चल रहा है।"
		}
	}
};