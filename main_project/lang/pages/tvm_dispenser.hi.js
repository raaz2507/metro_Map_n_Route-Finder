// /lang/pages/tvm_dispenser.hi.js
export default {
	meta: {
		title: 'मेट्रो TVM • टिकट डिस्पेंसर | यात्रामार्ग',
		desc: 'मेट्रो ऑटोमेटिक टिकट वेंडिंग मशीन सिम्युलेट करें। यात्री विवरण भरें और लाइव SVG थर्मल टिकट निकालें।'
	},
	machine: {
		dispenserLabel: 'टिकट डिस्पेंसर',
		trayLabel: 'ट्रे से टिकट लें'
	},
	panel: {
		title: 'टिकट जारी पैनल',
		soundLabel: 'प्रिंटर साउंड',
		btnPrint: 'प्रिंट करें और टिकट निकालें',
		btnOpenSvg: 'स्टैंडअलोन SVG फ़ाइल खोलें',
		tipsTitle: 'TVM सिमुलेशन फीचर:',
		tipsDesc: '"प्रिंट करें और टिकट निकालें" दबाएं — थर्मल प्रिंटर साउंड के साथ टिकट डिस्पेंसर स्लॉट से रोल आउट होगी, और आपकी फॉर्म डिटेल्स लाइव टिकट में अपडेट हो जाएंगी!'
	},
	form: {
		labelPassenger: 'यात्री का नाम',
		labelFrom: 'प्रस्थान स्टेशन (From)',
		labelTo: 'गंतव्य स्टेशन (To)',
		labelFare: 'किराया (Price)',
		labelTicketNum: 'टिकट नंबर / ID',
		labelStatus: 'स्टेटस रंग',
		statusValid: 'वैध (हरा टेक्स्ट)',
		statusExpired: 'एक्सपायर्ड (लाल टेक्स्ट)',
		labelDuration: 'वैधता समय',
		dur45: '45 मिनट',
		dur90: '90 मिनट',
		dur180: '3 घंटे',
		dur1440: 'फुल डे पास'
	},
	studio: {
		title: 'गोल्डन शाइन और रिफ्लेक्शन लैब',
		badge: 'स्वीट स्पॉट फाइंडर',
		modeAmbient: '🌿 नेचुरल एम्बियंट ग्लो',
		modeBeam: '⚡ 35° डायगोनल गोल्ड बीम',
		presetsLabel: 'प्रीसेट:',
		preset8: 'सटल 8%',
		preset18: 'नेचुरल 18%',
		preset28: 'वाइब्रेंट 28%',
		preset42: 'रिच 42%',
		labelIntensity: 'शाइन पीक इंटेंसिटी (ओपेसिटी)',
		labelSpread: 'ग्लो स्प्रेड / कवरेज चौड़ाई',
		labelDuration: 'स्वे ड्यूरेशन / स्पीड',
		colorCenter: 'सेंटर हाइलाइट',
		colorEdge: 'वार्म गोल्ड एज',
		codeTitle: '📄 लाइव जेनरेटेड SVG शाइन कोड',
		btnCopy: 'कोड कॉपी करें',
		btnCopied: 'कॉपी हो गया!'
	}
};