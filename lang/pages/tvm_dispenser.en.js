// /lang/pages/tvm_dispenser.en.js
export default {
	meta: {
		title: 'Metro TVM • Ticket Dispenser | YatraMarg',
		desc: 'Simulate a metro Automatic Ticket Vending Machine. Fill passenger details and dispense a live SVG thermal ticket with golden shine effects.'
	},
	machine: {
		dispenserLabel: 'TICKET DISPENSER',
		trayLabel: 'COLLECT TICKET FROM TRAY'
	},
	panel: {
		title: 'TICKET ISSUANCE PANEL',
		soundLabel: 'Printer Sound',
		btnPrint: 'PRINT & DISPENSE TICKET',
		btnOpenSvg: 'Open Standalone SVG File',
		tipsTitle: 'TVM Simulation Feature:',
		tipsDesc: 'Press "Print & Dispense Ticket" — the ticket will roll out from the dispenser slot with thermal printer sound, and your form details will update live on the ticket!'
	},
	form: {
		labelPassenger: 'Passenger Name',
		labelFrom: 'Origin (From)',
		labelTo: 'Destination (To)',
		labelFare: 'Fare (Price)',
		labelTicketNum: 'Ticket Number / ID',
		labelStatus: 'Status Color',
		statusValid: 'VALID (Green Text)',
		statusExpired: 'EXPIRED (Red Text)',
		labelDuration: 'Validity Time',
		dur45: '45 Minutes',
		dur90: '90 Minutes',
		dur180: '3 Hours',
		dur1440: 'Full Day Pass'
	},
	studio: {
		title: 'GOLDEN SHINE & REFLECTION LAB',
		badge: 'SWEET SPOT FINDER',
		modeAmbient: '🌿 Natural Ambient Glow',
		modeBeam: '⚡ 35° Diagonal Gold Beam',
		presetsLabel: 'Presets:',
		preset8: 'Subtle 8%',
		preset18: 'Natural 18%',
		preset28: 'Vibrant 28%',
		preset42: 'Rich 42%',
		labelIntensity: 'Shine Peak Intensity (Opacity)',
		labelSpread: 'Glow Spread / Coverage Width',
		labelDuration: 'Sway Duration / Speed',
		colorCenter: 'Center Highlight',
		colorEdge: 'Warm Gold Edge',
		codeTitle: '📄 LIVE GENERATED SVG SHINE CODE',
		btnCopy: 'Copy Code',
		btnCopied: 'Copied!'
	}
};