// /lang/pages/tvm_dispenser.hi.js
export default {
	meta: {
		title: 'Metro TVM • टिकट मशीन | YatraMarg',
		desc: 'मेट्रो टिकट मशीन का 3D सिमुलेशन। यात्री की जानकारी भरें और लाइव SVG टिकट जनरेट करें।'
	},
	headerTips: {
		title: 'TVM सिमुलेशन (Fun Mode):',
		desc: 'यह 3D मशीन सिर्फ सिमुलेशन और मनोरंजन के लिए है—यहाँ से निकला टिकट असली नहीं है! असली इस्तेमाल: अगर आपने टिकट वॉलेट में असली टिकट जनरेट किया है, तो मेट्रो गेट पर असली QR स्कैन करने के लिए "Gate Mode (🔆)" बटन का उपयोग करें।'
	},
	kiosk: {
		btnGateMode: 'गेट मोड',
		btnPrint: 'प्रिंट करें',
		dispenserLabel: 'टिकट मशीन',
		trayLabel: 'यहाँ से टिकट प्राप्त करें'
	},
	settingsModal: {
		title: 'टिकट सेटिंग्स पैनल',
		btnCancel: 'कैंसिल',
		btnSave: 'सेटिंग्स सेव करें',
		form: {
			labelPassenger: 'यात्री का नाम',
			labelFrom: 'कहाँ से (Origin)',
			labelTo: 'कहाँ तक (Destination)',
			labelFare: 'किराया (Price)',
			labelTicketNum: 'टिकट नंबर / ID',
			labelStatus: 'स्टेटस कलर',
			statusValid: 'वैलिड (हरा टेक्स्ट)',
			statusExpired: 'एक्सपायर (लाल टेक्स्ट)',
			labelDuration: 'वैलिडिटी का समय',
			dur45: '45 मिनट',
			dur90: '90 मिनट',
			dur180: '3 घंटे',
			dur1440: 'पूरे दिन का पास'
		}
	},
	gateModal: {
		title: 'टर्नस्टाइल गेट स्कैन',
		hint: 'इस QR कोड को सीधा मेट्रो गेट पर स्कैन करें',
		btnClose: 'बंद करें'
	}
};