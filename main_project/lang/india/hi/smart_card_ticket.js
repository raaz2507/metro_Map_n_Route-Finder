// /lang/india/hi/smart_card_ticket.js
export default {
	pageTitle: "स्मार्ट कार्ड त्वरित टॉप-अप | YatraMarg",
	meta: {
		title: "स्मार्ट कार्ड त्वरित टॉप-अप | YatraMarg",
		desc: "अपने मेट्रो स्मार्ट कार्ड को तुरंत टॉप-अप और रिचार्ज करें। कार्ड आईडी कॉपी करें और आधिकारिक पोर्टल तक पहुंचें।"
	},
	title: "स्मार्ट कार्ड त्वरित टॉप-अप",
	infoBanner: "डायरेक्ट रिचार्ज सहायक: कार्ड आईडी कॉपी करें और आधिकारिक पोर्टल 1-क्लिक में खोलें।",
	cardIdLabel: "स्मार्ट कार्ड आईडी (अंकित संख्या)",
	cardIdPlaceholder: "उदा. 12345678",
	amountLabel: "रिचार्ज राशि (₹)",
	amountPlaceholder: "राशि (न्यूनतम ₹100)",
	submitBtn: "कार्ड आईडी कॉपी करें और पोर्टल खोलें",
	submitBtnCopy: "कार्ड आईडी कॉपी करें",
	toastInvalid: "कृपया 8 से 11 अंकों की मान्य मेट्रो कार्ड आईडी दर्ज करें।",
	toastSuccess: "कार्ड आईडी {cardId} कॉपी हो गई! आधिकारिक पोर्टल खुल रहा है...",
	toastCopiedOnly: "कार्ड आईडी {cardId} क्लिपबोर्ड पर कॉपी हो गई!",
	qrCardTitle: "डिजिटल मेट्रो क्यूआर टिकट",
	qrInfoBanner: "डिजिटल ट्रांजिट पास: व्हाट्सएप द्वारा त्वरित टिकट बुक करें अथवा गेट पास सेव और स्कैन करें।",
	qrFeature1Title: "आधिकारिक व्हाट्सएप बुकिंग",
	qrFeature1Desc: "आधिकारिक टिकट तुरंत बुक करें",
	qrFeature2Title: "गेट पास सेव और स्कैन करें",
	qrFeature2Desc: "स्क्रीनशॉट या फोटो टिकट अपलोड करें",
	qrFeature3Title: "फास्ट गेट एंट्री",
	qrFeature3Desc: "त्वरित ब्राइटनेस के साथ एन्क्रिप्टेड पास",
	qrTicketBtn: "टिकट",

	// Fare Chart & Matrix Section
	fareChartTitle: "मेट्रो किराया चार्ट एवं स्लैब नियम",
	fareChartSubtitle: "दूरी के अनुसार टोकन किराया, स्मार्ट कार्ड छूट और कोच नियम की पूरी जानकारी।",
	activeCityBadge: "सक्रिय नेटवर्क",
	noFareRules: "चुने गए शहर अथवा नेटवर्क के लिए कोई किराया नियम उपलब्ध नहीं हैं।",



	// Table Columns
	colDistance: "दूरी स्लैब",
	colStations: "स्टेशन संख्या",
	colToken: "टोकन / क्यूआर टिकट",
	colSmartCard: "स्मार्ट कार्ड (-{percent}%)",
	colHoliday: "रविवार व अवकाश",
	colOrigin: "कहाँ से (Origin)",
	colDestination: "कहाँ तक (Destination)",
	colStandardFare: "स्टैंडर्ड कोच",
	colPremiumFare: "प्रीमियम कोच",

	// Slabs & Formats
	kmUnit: "किमी",
	stationsUnit: "स्टेशन",
	stationSingle: "स्टेशन",
	abovePrefix: ">",
	flatFareLabel: "फ्लैट किराया (सभी स्टेशन)",
	flatFareDesc: "इस लाइन के किसी भी स्टेशन के बीच एक ही फ्लैट किराया लागू है।",
	matrixOriginHeader: "कहाँ से \\ कहाँ तक",
	matrixPanHint: "✋ कहीं भी क्लिक करके ड्रैग करें",

	// RRTS / Multi-class controls
	coachClassLabel: "कोच श्रेणी चुनें",
	standardCoach: "स्टैंडर्ड कोच",
	premiumCoach: "प्रीमियम कोच (2x लग्ज़री)",

	// Passes & Ticketing Hub
	passesSectionTitle: "मेट्रो टिकट, कार्ड व पास की जानकारी",
	passesSectionSubtitle: "रिचार्ज नियम, न्यूनतम बैलेंस, वैधता और रिफंड से जुड़े सभी जरूरी दिशानिर्देश।",
	dailyCommutersTag: "दैनिक यात्री",
	touristPassTag: "पर्यटक पास",
	digitalTag: "पेपरलेस व आसान",
	interoperableTag: "नेशनल मोबिलिटी",

	// Cards Specifications
	smartCardTitle: "मेट्रो स्मार्ट कार्ड",
	smartCardBullet1: "सभी सामान्य यात्राओं पर {percent}% सीधी छूट",
	smartCardBullet2: "नॉन-पीक घंटों (सुबह 08:00 से पहले, दोपहर 12:00-17:00, रात 21:00 के बाद) में {percent}% अतिरिक्त छूट",
	smartCardWeekendBullet: "सप्ताहांत (शनिवार-रविवार) एवं राष्ट्रीय अवकाशों पर {percent}% तक विशेष छूट",
	smartCardDepositBullet: "रिफंडेबल सुरक्षा राशि: {deposit}",
	smartCardBullet3: "एंट्री गेट पर टैप करने के लिए न्यूनतम {amount} बैलेंस होना अनिवार्य",
	smartCardBullet4: "नेटवर्क में रुकने की अधिकतम सीमा: {minutes} मिनट (उसी स्टेशन से निकलने पर {sameStation} मिनट)",

	touristCard1DayTitle: "1-दिवसीय टूरिस्ट कार्ड",
	touristCard3DayTitle: "3-दिवसीय टूरिस्ट कार्ड",
	touristCardCost: "लागत: {cost} ({travelValue} यात्रा मूल्य + {deposit} रिफंडेबल सुरक्षा राशि)",
	touristCardUnlimited: "सभी सामान्य लाइनों पर असीमित यात्राएं ({excluded} छोड़कर)",
	touristCardUnlimitedAll: "नेटवर्क की सभी सामान्य लाइनों पर असीमित यात्राएं",
	touristCardUnlimitedExcluded: "सभी सामान्य लाइनों पर असीमित यात्राएं ({excluded} को छोड़कर)",
	touristCardRefund: "कार्ड सुरक्षित वापस करने पर {deposit} सुरक्षा राशि पूरी वापस",

	tripPassTag: "मासिक कम्यूटर पास",
	tripPassTitle: "मासिक ट्रिप पास ({trips} यात्राएं)",
	tripPassBullet1: "{days} दिनों की वैधता के साथ {trips} यात्राएं (नियमित यात्रियों के लिए विशेष बचत)",
	tripPassBullet2: "केवल निर्दिष्ट ओरिजिन और डेस्टिनेशन स्टेशनों के बीच वैध",

	concessionsTag: "विशेष रियायत",
	concessionsTitle: "रियायती पास व विशेष छूट",
	concessionsBullet1: "{categories} के लिए यात्रा किराए पर {percent}% की विशेष छूट",
	concessionsBullet2: "स्टेशन कस्टमर केयर काउंटर पर वैध सरकारी / संस्थान पहचान पत्र प्रस्तुत करना अनिवार्य",

	qrTicketTitle: "डिजिटल क्यूआर व व्हाट्सएप टिकट",
	qrTicketBullet1: "पेपरलेस तत्काल बारकोड बुकिंग—टोकन काउंटर लाइन से मुक्ति",
	qrTicketBullet2: "वैधता: गेट पर प्रवेश के लिए टिकट जारी होने से {minutes} मिनट तक मान्य",
	qrTicketBullet3: "आधिकारिक बुकिंग चैनल्स: {channels}",

	ncmcTitle: "नेशनल कॉमन मोबिलिटी कार्ड (NCMC)",
	ncmcBullet1: "एक राष्ट्र एक कार्ड: पूरे भारत की मेट्रो, आरआरटीएस और नगर बसों में मान्य",
	ncmcBullet2: "RuPay कॉन्टैक्टलेस: सीधे गेट पर टैप करें—अलग से मेट्रो कार्ड की ज़रूरत नहीं",
	ncmcBullet3: "सपोर्टेड ऑटोमेटेड गेट्स पर {percent}% स्मार्ट कार्ड छूट के लिए पात्र",

	categories: {
		student: "छात्र (Student)",
		senior_citizen: "वरिष्ठ नागरिक (65+)",
		divyangjan: "दिव्यांगजन"
	},

	// Product Names
	products: {
		token: "स्टैंडर्ड टोकन / क्यूआर",
		smart_card: "मेट्रो स्मार्ट कार्ड",
		off_peak_smart_card: "ऑफ-पीक स्मार्ट कार्ड",
		tourist_card_1day: "1-दिवसीय टूरिस्ट कार्ड",
		tourist_card_3day: "3-दिवसीय टूरिस्ट कार्ड",
		trip_pass_45: "45-ट्रिप मासिक पास",
		trip_pass: "मासिक ट्रिप पास",
		concessions: "रियायती पास (छात्र/वरिष्ठ/दिव्यांग)",
		qr_ticket: "डिजिटल क्यूआर टिकट",
		ncmc_card: "NCMC रूपे कार्ड",
		standard: "स्टैंडर्ड कोच",
		premium: "प्रीमियम कोच"
	}
};