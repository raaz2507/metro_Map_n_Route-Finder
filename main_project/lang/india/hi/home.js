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
		priorityShortest: "सबसे छोटा",
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
			disclaimer: "दिखाया गया समय केवल अनुमानित यात्रा समय है। यात्रियों को अतिरिक्त समय लेकर चलने की सलाह दी जाती है।"
		},
		timeline: {
			activeNow: "वर्तमान में सक्रिय",
			showOnMap: "नक्शे पर रूट देखें",
			gate: "गेट",
			firstTrain: "पहली ट्रेन",
			lastTrain: "अंतिम ट्रेन",
			directionText: "{terminal} की ओर · प्लेटफॉर्म {platform}",
			splitFareTitle: "किराया विवरण (Split Fare)",
			splitFareSubtitle: "{count} अलग-अलग लाइन सेगमेंट के किराए देखने के लिए टैप करें",
			smartCardSavings: "स्मार्ट कार्ड से ₹{amount} की बचत!"
		},
		transferModes: {
			crossPlatform: "क्रॉस-प्लेटफॉर्म",
			samePlatform: "समान प्लेटफॉर्म",
			levelChange: "तल {level} बदलाव",
			escalator: "एस्केलेटर / सीढ़ियां",
			skywalk: "स्काईवॉक ({distance} मी)",
			corridor: "कॉरिडोर ({distance} मी)",
			freeERickshaw: "मुफ़्त ई-रिक्शा",
			securityCheck: "सुरक्षा जांच",
			accessible: "व्हीलचेयर सुलभ"
		},
		alerts: {
			multimodalSecurity: "मल्टीमॉडल जंक्शन: अलग गेट एवं नई सुरक्षा जांच आवश्यक",
			ncmcCard: "RuPay NCMC / स्मार्ट कार्ड गेट्स पर सीधे काम करता है",
			sharedTrackNotice: "साझा ट्रैक: लोकल एवं एक्सप्रेस ट्रेनें एक ही प्लेटफॉर्म पर उपलब्ध",
			walkwayNotice: "{distance}मी पैदल मार्ग (~{minutes} मिनट की चाल)"
		}
	},

	// 3. Recent Searches
	recent: {
		title: "हालिया खोज",
		clearAll: "सभी हटाएं",
		tabRecent: "हालिया",
		tabMostUsed: "सबसे ज़्यादा",
		tabAz: "अ-ज्ञ (A-Z)",
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
			langDesc: "ऑफ़लाइन उपयोग के लिए भाषाएं डाउनलोड करें या स्टोरेज खाली करने के लिए हटाएं।",
			themeHeading: "थीम पैक्स",
			themeDesc: "कस्टम स्टाइलिंग और दृश्य उपस्थिति विस्तार।",
			webNotice: "वेब पर, भाषाएं और थीम मांग पर स्वचालित रूप से लोड होती हैं। ऑफ़लाइन पैक प्रबंधन इंस्टॉल किए गए PWA और एंड्रॉइड ऐप में उपलब्ध है।",
			coreBuiltin: "कोर सिस्टम (डिफ़ॉल्ट)",
			installed: "इंस्टॉल किया गया",
			downloadBtn: "डाउनलोड",
			uninstallBtn: "हटाएं",
			downloading: "डाउनलोड हो रहा है...",
			uninstalling: "हटाया जा रहा है...",
			confirmUninstallLang: "क्या आप वाकई {langName} पैक हटाना चाहते हैं? ऐप वापस अंग्रेज़ी में बदल जाएगा।",
			confirmUninstallTheme: "क्या आप वाकई {themeName} थीम पैक हटाना चाहते हैं?",
			sizeApprox: "~{size} KB",
			themeComingSoon: "नई थीम जल्द आ रही हैं"
		},
		alarm: {
			title: "अलार्म सेटिंग्स",
			subtitle: "दूरी एवं ध्वनि प्राथमिकताएं",
			triggersHeading: "🎯 ट्रिगर एवं जियोफेंस",
			thresholdLabel: "आगमन अलर्ट दूरी",
			thresholdDesc: "अलार्म तब बजेगा जब ट्रेन स्टेशन से इस दूरी के भीतर पहुँच जाएगी।",
			thresholdOptions: {
				station1: "🚉 1 स्टेशन पहले (समीप)",
				m200: "200 मीटर (~1 मिनट)",
				m500: "500 मीटर (अनुशंसित)",
				m1000: "1.0 किलोमीटर (~2-3 मिनट)",
				m2000: "2.0 किलोमीटर (~4-5 मिनट)"
			},
			destAlertLabel: "गंतव्य स्टेशन अलार्म",
			destAlertDesc: "अपने गंतव्य पर पहुँचने से पहले तेज़ आवाज़ में बजता है।",
			interchangeAlertLabel: "लाइन इंटरचेंज अलार्म",
			interchangeAlertDesc: "ट्रेन लाइन बदलने से पहले वाले स्टेशन पर आपको अलर्ट करता है।",
			audioHeading: "🔊 ध्वनि एवं वॉल्यूम",
			toneLabel: "अलार्म रिंगटोन",
			tones: {
				chime: "🔔 मेट्रो चाइम (मधुर)",
				beep: "⚠️ चेतावनी बीप (पल्स)",
				siren: "🚨 आपातकालीन सायरन",
				custom: "📁 कस्टम ऑडियो (MP3)"
			},
			uploadMp3Label: "कस्टम ऑडियो फ़ाइल चुनें",
			volumeLabel: "अलार्म वॉल्यूम",
			testSoundBtn: "ध्वनि परीक्षण",
			vibeHeading: "📳 हेप्टिक्स एवं कंपन",
			vibeLabel: "कंपन पैटर्न",
			vibePatterns: {
				long: "लंबा अलर्ट पैटर्न",
				short: "छोटे पल्स",
				sos: "एसओएस (SOS) पैटर्न",
				continuous: "निरंतर कंपन"
			},
			testVibeBtn: "कंपन परीक्षण",
			voiceHeading: "🗣️ ऑफ़लाइन वॉयस अलर्ट",
			voiceLabel: "वॉयस घोषणाएं (TTS)",
			voiceDesc: "आगामी स्टेशन के नाम और लाइन बदलने के रिमाइंडर बोलकर बताता है।",
			voiceSelectLabel: "घोषणा वॉयस",
			testVoiceBtn: "वॉयस परीक्षण",
			resetBtn: "डिफ़ॉल्ट पर रीसेट करें"
		},
		map: {
			heading: "🗺️ मानचित्र प्रदर्शन एवं दृश्य",
			underConstructionLabel: "निर्माणाधीन लाइनें दिखाएं",
			underConstructionDesc: "नक्शे पर निर्माणाधीन लाइनों (डैश) और स्टेशनों को प्रदर्शित करें।",
			approvedLabel: "स्वीकृत एवं प्रस्तावित दिखाएं",
			approvedDesc: "नक्शे पर स्वीकृत और प्रस्तावित भविष्य के कॉरिडोर (डॉटेड) प्रदर्शित करें।"
		},
		backup: {
			title: "💾 बैकअप एवं डेटा रीस्टोर",
			desc: "अपने सहेजे गए मार्ग, अलार्म और प्राथमिकताएं प्रबंधित करें।",
			exportBtn: "डाउनलोड",
			shareBtn: "शेयर",
			importBtn: "इंपोर्ट"
		}
	},

	// 5. Interactive SVG Map Controls
	map: {
		label: "मेट्रो नेटवर्क मैप",
		legend: "संकेत सूची (Legend)",
		clearRoute: "रूट हटाएं",
		showRoute: "रूट दिखाएं",
		clearFilter: "फ़िल्टर हटाएं",
		metroTrackLines: "मेट्रो ट्रैक लाइनें",
		stationType: "स्टेशन प्रकार",
		trackStatus: "ट्रैक एवं स्टेशन स्थिति",
		viewStationInfo: "स्टेशन विवरण देखें",
		ariaMap: "इंटरैक्टिव मेट्रो मैप",
		controls: {
			zoomInAria: "ज़ूम इन",
			zoomOutAria: "ज़ूम आउट",
			resetAria: "ज़ूम व सेंटर रीसेट करें",
			fitBoundsAria: "स्क्रीन में फ़िट करें",
			gpsTrackAria: "नक्शे पर लाइव लोकेशन ट्रैक करें"
		}
	},

	// 6. Sensor Telemetry Widget
	telemetry: {
		title: "लाइव यात्रा टेलीमेट्री",
		gpsBadge: "GPS लाइव",
		gpsLabel: "GPS स्थिति",
		netLabel: "नेटवर्क",
		accuracyLabel: "GPS सटीकता",
		guideTitle: "📡 टेलीमेट्री एवं GPS गाइड",
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
		topSpeed: "उच्चतम गति:",
		gpsAccuracy: "GPS सटीकता:",
		statusLabel: "स्थिति:",
		speedUnit: "किमी/घंटा",
		maxSpeed: "अधिकतम गति: {speed} किमी/घंटा",
		avgSpeed: "औसत गति: {speed} किमी/घंटा",
		motionStatus: "गति स्थिति",
		statusHalted: "स्थिर",
		statusDeparting: "स्टेशन से प्रस्थान",
		statusCruising: "सामान्य गति में",
		statusStates: {
			halted: "स्थिर",
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
		approaching: "स्टेशन समीप आ रहा है",
		interchangeAlert: "लाइन बदलने की तैयारी करें",
		destinationAlert: "गंतव्य स्टेशन आ रहा है! उतरने की तैयारी करें",
		trackingActive: "🛰️ लाइव ट्रैकिंग सक्रिय",
		snoozeBtn: "स्नूज़",
		dismissBtn: "बंद करें",
		stopAlarmBtn: "🛑 रोकें",
		dismissToast: "🔔 अगला अलर्ट: गंतव्य स्टेशन",
		snoozeToast: "⏱️ अलार्म 2 मिनट के लिए स्नूज़ किया गया",
		enabledToast: "🔔 लाइव यात्रा अलार्म सक्रिय हो गया!",
		stoppedToast: "🛑 लाइव अलार्म बंद कर दिया गया।",
		stationAlert: "STATION ALERT",
		noAlarmSet: "अलार्म सेट नहीं है",
		alarmTag: "अलार्म",
		statusRunning: "RUNNING",
		statusStandby: "STANDBY"
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