// /lang/hi.js

export default {
	meta: {
		title: "यात्रा-मार्ग ",
		ogTitle: "मानचित्र • मार्ग • किराया • यात्रा सहायता",
		ogDescription: "आसानी से सर्वश्रेष्ठ मेट्रो मार्ग, टिकट किराया, यात्रा समय और मध्यवर्ती स्टेशन खोजें।",
		twitterTitle: "मानचित्र • मार्ग • किराया • यात्रा सहायता",
		twitterDescription: "आसानी से सर्वश्रेष्ठ मेट्रो मार्ग, टिकट किराया, यात्रा समय और मध्यवर्ती स्टेशन खोजें।"
	},

	header: {
		appName: "यात्रा-मार्ग ",
		tagLine : "मानचित्र • मार्ग • किराया • यात्रा-सहायता",
		language: "भाषा:",
		
		themes: {
			label: "थीम:",
			light: "क्लासिक लाइट",
			dark: "स्लीक डार्क",
			cyberpunk: "नियॉन साइबरपंक",
			vintage: "विंटेज रेट्रो",
			mint: "फॉरेस्ट मिंट",
			ghibli: "जिब्ली नॉस्टैल्जिया"
		}
	},

	"nav-header": {
		networks: "🌐 नेटवर्क",
		home: "🏠 होम",
		stations: "🚉 स्टेशन",
		recharge: "💳 कार्ड रीचार्ज",
		others: "🗂️ अन्य",
		help: "❓ सहायता",
		about: "ℹ️ जानकारी"
	},

	"nav-sidebar": {
		"route": "मार्ग खोजें",
		recent: "हालिया",
		map: "मानचित्र",
		setting: "सेटिंग"
	},

	"nav-floating": {
		alarm: "अलार्म",
		ticket: "टिकट"
	},

	footer: {
		footerNavigation: "नेविगेशन",
		about: "जानकारी",
		bookTicket: "टिकट बुक करें",
		github: "गिटहब",
		appTitle: "मेट्रो मैप जनरेटर",
		qrDescription: "अपने मोबाइल डिवाइस पर इस एप्लिकेशन को जल्दी से खोलने के लिए क्यूआर कोड स्कैन करें।",
		features: "विशेषताएं",
		interactiveMetroMap: "इंटरैक्टिव मेट्रो मानचित्र",
		routeFinder: "मार्ग खोजक",
		fareCalculator: "किराया कैलकुलेटर",
		shortestRoutes: "सबसे छोटे और कम इंटरचेंज मार्ग",
		mobileFriendly: "मोबाइल अनुकूल डिज़ाइन",
		brandTitle: "मेट्रो मैप जनरेटर",
		brandDescription: "होशियार शहरी पारगमन नेविगेशन के लिए निर्मित।",
		disclaimer: "मार्ग, किराया और यात्रा की जानकारी केवल संदर्भ के लिए प्रदान की जाती है।",
		developedBy: "❤️ के साथ विकसित"
	},

	pages: {
		home: {
			sidebar: {
				recent: {
					recentSearches: "हालिया खोजें",
					clearAll: "सभी साफ़ करें",
					recent: "हालिया",
					mostUsed: "अक्सर उपयोग किए गए",
					az: "अ-ज्ञ (A-Z)",
					noRecentJourney: "कोई हालिया यात्रा नहीं मिली"
				},
				findroute: {
					routeFinder: "मार्ग खोजक",
					startStation: "से",
					endStation: "तक",
					startPlaceholder: "प्रारंभ स्टेशन दर्ज करें",
					endPlaceholder: "गंतव्य स्टेशन दर्ज करें",
					swapStations: "स्टेशन बदलें",
					findRoute: "मार्ग खोजें",
					resetForm: "रीसेट",
					priority: "प्राथमिकता",
					shortest: "सबसे छोटा मार्ग",
					lessInterchange: "कम इंटरचेंज",
					journeyDetails: "यात्रा विवरण",
					route: {
						stations: "{count} स्टेशन",
						station: "{count} स्टेशन",
						fare: "₹{fare}",
						travelTime: "{minutes} मिनट",
						distance: "{distance} किमी",
						interchange: "{count} इंटरचेंज",
						interchanges: "{count} इंटरचेंज",
						warning: "दिखाया गया समय केवल अनुमानित यात्रा समय है। यात्रियों को यात्रा के लिए अतिरिक्त समय रखने की सलाह दी जाती है।",
						showOnMap: "मानचित्र पर मार्ग दिखाएं",
						gate: "गेट",
						first: "प्रथम",
						last: "अंतिम",
						minutesLabel: "मिनट",
						lineChangeLabel: "लाइन परिवर्तन",
						stationsLabel: "स्टेशन",
						tokenFareLabel: "किराया",
						directionText: "दिशा: {terminal} की ओर (प्लेटफ़ॉर्म नंबर {platform})",
						distanceLabel: "दूरी",
						breakdownToggle: "{count} टिकट्स का अलग-अलग विवरण देखें",
						smartCardSavings: "स्मार्ट कार्ड इस्तेमाल करने पर ₹{amount} की सीधी बचत!",
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
					shareModal: {
						title: "मार्ग साझा करें",
						selectOption: "साझा करने का विकल्प चुनें:",
						whatsapp: "व्हाट्सएप",
						telegram: "टेलीग्राम",
						sms: "एसएमएस",
						copyLink: "लिंक कॉपी करें",
						copyDetails: "विवरण कॉपी करें"
					}
				},
				appSettings: {
					heding : "ऐप सेटिंग्स",
					tabs: {
						alarm: "अलार्म",
						map: "मानचित्र"
					},
					alarm:{
						title: "अलार्म एवं यात्रा सेटिंग्स",
						subtitle: "अलर्ट, थ्रेसहोल्ड दूरी और ऑडियो विकल्प सेट करें",
						sections: {
							triggers: "🎯 अलर्ट ट्रिगर व दूरी",
							audio: "🔊 ध्वनि व आवाज़",
							vibration: "📳 कंपन (वाइब्रेशन)",
							voice: "🗣️ ऑफ़लाइन वॉइस उद्घोषणा"
						},
						threshold: {
							label: "स्टेशन आगमन अलर्ट दूरी",
							desc: "स्टेशन से इतनी दूरी पहले अलार्म बजना शुरू होगा।",
							station1: "🚉 1 स्टेशन पहले (पहुँच अलर्ट)",
							m200: "200 मीटर (~1 मिनट)",
							m500: "500 मीटर (अनुशंसित)",
							m1000: "1.0 किलोमीटर (~2-3 मिनट)",
							m2000: "2.0 किलोमीटर (~4-5 मिनट)"
						},
						alerts: {
							destination: "गंतव्य स्टेशन अलार्म",
							destinationDesc: "अंतिम स्टेशन आने से पहले तेज अलार्म बजाएगा।",
							interchange: "इंटरचेंज लाइन चेंज अलार्म",
							interchangeDesc: "मेट्रो लाइन बदलने वाले स्टेशन पर उतरने के लिए पहले ही सचेत करेगा।"
						},
						sound: {
							toneLabel: "अलार्म टोन",
							chime: "मेट्रो चाइम (मधुर)",
							beep: "वॉर्निंग बीप (पल्स)",
							siren: "इमरजेंसी सायरन",
							custom: "कस्टम ऑडियो (MP3 फ़ाइल)",
							uploadMp3: "कस्टम MP3 फ़ाइल चुनें",
							volume: "अलार्म वॉल्यूम",
							testSound: "🔊 आवाज़ टेस्ट करें"
						},
						vibe: {
							patternLabel: "वाइब्रेशन पैटर्न",
							long: "लंबा अलर्ट पैटर्न",
							short: "छोटे पल्स",
							sos: "एसओएस (SOS) पैटर्न",
							continuous: "लगातार कंपन",
							testVibe: "📳 वाइब्रेशन टेस्ट करें",
							vibeSuccess: "📳 वाइब्रेशन ट्रिगर हुआ! (यदि महसूस न हो, तो फोन की Haptic सेटिंग्स चेक करें)",
							vibeBlocked: "⚠️ फोन द्वारा वाइब्रेशन ब्लॉक हुआ। कृपया चेक करें: फोन Silent/DND पर न हो और Haptics ऑन हो।",
							unsupported: "📳 वाइब्रेशन केवल मोबाइल फोन (Android/PWA) पर समर्थित है"
						},
						voice: {
							enable: "वॉइस अनाउंसमेंट (TTS)",
							enableDesc: "आने वाले स्टेशन का नाम और लाइन बदलने की जानकारी बोलकर बताएगा।",
							voiceSelect: "उद्घोषणा की आवाज़",
							testVoice: "🗣️ आवाज़ टेस्ट करें"
						},
						reset: "डिफ़ॉल्ट रीसेट करें"
					},
					map: {
						title: "मानचित्र एवं डिस्प्ले सेटिंग्स",
						sections: {
							display: "🗺️ मानचित्र दृश्य एवं डिस्प्ले"
						},
						autoCenter: {
							label: "रूट पर ऑटो-सेंटर करें",
							desc: "नया रूट खोजने पर मानचित्र को अपने आप ज़ूम और सेंटर में लाएं।"
						},
						walkways: {
							label: "इंटरचेंज पैदल रास्ते दिखाएं",
							desc: "लाइन बदलने वाले स्टेशनों के बीच कनेक्टिंग फुटपाथ लाइनें दिखाएं।"
						}
					}
				}
			},
			map: {
				label: "मानचित्र",
				clearRoute: "रूट साफ़ करें",
				showRoute: "रूट दिखाएं",
				clearFilter: "फ़िल्टर साफ़ करें",
				viewStationInfo: "स्टेशन विवरण देखें"
			},
			alarmBanner: {
				approaching: "स्टेशन आगमन सूचना",
				trackingActive: "🛰️ लाइव यात्रा ट्रैकिंग सक्रिय",
				interchangeAlert: "इंटरचेंज स्टेशन • कृपया यहाँ लाइन बदलें",
				destinationAlert: "गंतव्य स्टेशन • कुछ ही देर में आगमन",
				dismiss: "🔕 बंद करें",
				snooze: "⏱️ स्नूज़ (2 मिनट)",
				stopAlarm: "🛑 अलार्म रोकें",
				enabledToast: "लाइव यात्रा अलार्म चालू किया गया",
				stoppedToast: "लाइव अलार्म बंद किया गया",
				snoozeToast: "अलार्म 2 मिनट के लिए स्नूज़ किया गया",
				dismissToast: "अगला अलर्ट गंतव्य स्टेशन के लिए सक्रिय है",
				noRouteToast: "अलार्म शुरू करने के लिए पहले रूट खोजें"
			},
			gps: {
				permissionDenied: "📍 लोकेशन अनुमति अस्वीकृत। लाइव स्पीड और अलार्म अलर्ट के लिए GPS अनुमति दें।",
				unavailable: "📍 GPS सिग्नल नहीं मिल रहा। कृपया फ़ोन की लोकेशन चालू करें।",
				gpsFallbackWarning: "⚠️ GPS बंद या अनुपलब्ध है। अलार्म फ़ॉलबैक मोड (टाइमर और मोशन सेंसर) पर चल रहा है।",
			},
			speedometer: {
				title: "लाइव स्पीडोमीटर",
				topSpeed: "अधिकतम गति",
				gpsAccuracy: "GPS सटीकता",
				status: "स्थिति",
				statusHalted: "ट्रेन रुकी हुई है",
				statusDeparting: "गति पकड़ रही है",
				statusCruising: "पूरी रफ़्तार पर"
			},
			telemetry: {
				title: "सिग्नल टेलीमेट्री",
				gps: "GPS स्थिति",
				network: "नेटवर्क",
				accuracy: "सटीकता",
				guideTitle: "📡 टेलीमेट्री व GPS गाइड",
				guideActive: "🟢 80%-100%: मजबूत सैटेलाइट लॉक (सक्रिय GPS)",
				guideFair: "🟡 40%-79%: मध्यम सिग्नल (स्टेशन शेड/इमारतें)",
				guideTunnel: "🔴 टनल में: अंडरग्राउंड यात्रा (टाइमर फ़ॉलबैक सक्रिय)",
				guideDeviceOff: "📵 फोन का GPS बंद: कृपया डिवाइस लोकेशन चालू करें",
				guideBlocked: "🚫 ब्लॉक है: ब्राउज़र में लोकेशन अनुमति बंद है",
				gpsBlocked: "🚫 ब्लॉक है",
				gpsPrompt: "⚠️ अनुमति नहीं",
				gpsDeviceOff: "📵 GPS बंद",
				gpsTunnel: "🚇 टनल में (0%)",
				gpsActive: "🛰️ सक्रिय",
				netOnline: "ऑनलाइन",
				netOffline: "ऑफ़लाइन",
				gpsReady: "🛰️ तैयार है",
				gpsAcquiring: "🛰️ खोज रहा है...",
			}
		},
		networks: {
			// 1. Search Bar
			search: {
				placeholder: "शहर, स्टेशन, अस्पताल या पर्यटन स्थल खोजें (उदा: AIIMS, इंडिया गेट, DMRC)..."
			},
			// 2. Filter Bar (Mode, Status, Sort Chips)
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
			// 3. Stats & Empty States
			stats: {
				showingCount: "{count} पारगमन नेटवर्क दिखाए जा रहे हैं",
				noNetworksFound: "कोई पारगमन नेटवर्क नहीं मिला",
				noNetworksQuery: "\"{query}\" से मेल खाता कोई नेटवर्क नहीं मिला।"
			},
			// 4. Section Headings
			sections: {
				combined: "🏙️ शहर-व्यापी संयुक्त नेटवर्क",
				individual: "🚆 व्यक्तिगत ट्रांजिट लाइन्स"
			},
			// 5. Card UI Elements (Clean Hindi strings without emojis)
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

			// 6. Action Toasts
			toast: {
				underConstructionTitle: "🚧 निर्माणाधीन",
				underConstructionMsg: "\"{name}\" वर्तमान में निर्माणाधीन है। इसका रूट और स्टेशन डेटा अभी उपलब्ध नहीं है।",
				proposedTitle: "📋 प्रस्तावित / स्वीकृत",
				proposedMsg: "\"{name}\" अभी योजना/स्वीकृत चरण में है। सेवा शुरू होने पर डेटा जोड़ा जाएगा।",
				dataPendingTitle: "🛠️ डेटा संकलन जारी",
				dataPendingMsg: "\"{name}\" का पारगमन डेटा डेवलपर्स द्वारा जोड़ा जा रहा है। जल्द ही उपलब्ध होगा!"
			}
		},
		all_stations: {
			searchPlaceholder: "स्टेशन के नाम या कोड से खोजें (उदा: झिलमिल, राजीव चौक)...",
			allLines: "सभी लाइन्स",
			noStationsFound: "🔍 कोई स्टेशन नहीं मिला",
			noStationQueryMsg: "आपकी खोज \"{query}\" से मेल खाता कोई स्टेशन नहीं मिला।",
			stationCount: "{count} स्टेशन",
			singleStationCount: "1 स्टेशन"
		},
		station_info: {
			backBtn: "⬅️ सभी स्टेशनों पर वापस जाएं",
			connectedLines: "🚆 जुड़ी हुई मेट्रो लाइन्स",
			operatingHours: "⏰ स्टेशन का समय",
			first: "प्रथम",
			last: "अंतिम",
			helplines: "📞 हेल्पलाइन और सहायता",
			mobileHelpline: "स्टेशन मोबाइल हेल्पलाइन",
			landline: "स्टेशन लैंडलाइन",
			dmrcHelpline: "DMRC यूनिवर्सल हेल्पलाइन",
			gates: "🚪 स्टेशन गेट और निकास",
			facilities: "♿ स्टेशन सुविधाएं",
			parking: "🅿️ पार्किंग विवरण",
			transit: "🛗 लिफ्ट और एस्केलेटर",
			nearby: "📍 आसपास के प्रमुख स्थान",
			code: "कोड",
			location: "स्थान",
			placement: "प्लेसमेंट",
			divyangFriendly: "दिव्यांग अनुकूल",
			status: "स्थिति",
			yes: "✔️ हाँ",
			no: "❌ नहीं",
			active: "सक्रिय",
			maintenance: "रखरखाव",
			provider: "प्रदाता",
			car: "🚗 कार",
			bike: "🏍️ बाइक",
			cycle: "🚲 साइकिल",
			lifts: "🛗 लिफ्ट",
			escalators: "🪜 एस्केलेटर",
			divyangAccessible: "♿ दिव्यांग सुलभ",
			standardAccess: "🚶 मानक पहुंच"
		}
	}
};