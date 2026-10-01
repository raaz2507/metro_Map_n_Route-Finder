// /lang/india/hi/tvm_dispenser.js
export default {
	meta: {
		title: "मेट्रो TVM • स्वचालित टिकट वेंडिंग मशीन | यात्रा मार्ग",
		desc: "स्वचालित मेट्रो टिकट वेंडिंग मशीन का सिमुलेशन। यात्री विवरण भरें और लाइव थर्मल टिकट प्रिंट करें।"
	},
	headerTips: {
		title: "TVM सिमुलेशन (मनोरंजन मोड):",
		desc: "यह 3D मशीन केवल सिमुलेशन और मनोरंजन के लिए है—प्रिंट किया गया टिकट आधिकारिक नहीं है! वास्तविक उपयोग: यदि आपने वॉलेट में असली टिकट बनाया है, तो मेट्रो गेट पर स्कैन करने के लिए 'गेट मोड (🔆)' का उपयोग करें।"
	},
	kiosk: {
		deviceId: "TVM टर्मिनल #204",
		statusLed: "मशीन स्थिति: पावर एवं गतिविधि",
		powerReady: "पावर / तैयार",
		printActivity: "प्रिंट गतिविधि",
		btnGateMode: "गेट मोड",
		btnPrint: "प्रिंट करें",
		dispenserLabel: "टिकट डिस्पेंसर",
		trayLabel: "ट्रे से टिकट प्राप्त करें",
		chassisSerial: "DMRC-TVM-डिस्पेंसर • स्टेज-04"
	},
	settingsModal: {
		title: "टिकट जारी पैनल",
		btnCancel: "रद्द करें",
		btnSave: "सेटिंग्स सहेजें",
		form: {
			labelPassenger: "यात्री का नाम",
			labelFrom: "प्रारंभिक स्टेशन (From)",
			labelTo: "गंतव्य स्टेशन (To)",
			labelFare: "किराया (मूल्य)",
			labelTicketNum: "टिकट क्रमांक / ID",
			labelStatus: "स्थिति का रंग",
			statusValid: "मान्य (हरा टेक्स्ट)",
			statusExpired: "समाप्त (लाल टेक्स्ट)",
			labelDuration: "मान्यता अवधि",
			dur45: "45 मिनट",
			dur90: "90 मिनट",
			dur180: "3 घंटे",
			dur1440: "पूरे दिन का पास"
		}
	},
	gateModal: {
		title: "टर्नस्टाइल गेट स्कैन",
		hint: "मेट्रो प्रवेश/निकास गेट पर इस क्यूआर को सीधे स्कैन करें",
		btnClose: "पूर्ण / बंद करें"
	},
	ticket: {
		headerTitle: "वर्चुअल मेट्रो पास",
		footerLeft: "भारतीय मेट्रो",
		footerClass: "इकोनॉमी क्लास",
		qrInstruction: "प्रवेश और निकास के लिए AFC गेट पर स्कैन करें",
		qrValidity: "• केवल एकल यात्रा के लिए मान्य •"
	},
	placeholders: {
		passenger: "उदा. विपिन कुमार",
		from: "उदा. नोएडा सेक 15",
		to: "उदा. राजीव चौक",
		price: "उदा. ₹50.00",
		ticketNum: "डिफ़ॉल्ट के लिए खाली छोड़ें"
	},
	aria: {
		soundToggle: "प्रिंटर ध्वनि चालू/बंद करें",
		settings: "मशीन सेटिंग्स",
		close: "बंद करें"
	}
};