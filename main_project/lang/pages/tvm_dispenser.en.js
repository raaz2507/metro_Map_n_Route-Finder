// /lang/pages/tvm_dispenser.en.js
export default {
	meta: {
		title: 'Metro TVM • Ticket Dispenser | YatraMarg',
		desc: 'Simulate a metro Automatic Ticket Vending Machine. Fill passenger details and dispense a live SVG thermal ticket.'
	},
	headerTips: {
		title: 'TVM Simulation (Fun Mode):',
		desc: 'This 3D machine is for playful simulation and entertainment only—the printed ticket is not official! REAL USE CASE: If you generated a valid ticket in the Wallet, use the "Gate Mode (🔆)" button to scan your genuine QR at the metro turnstiles.'
	},
	kiosk: {
		btnGateMode: 'GATE MODE',
		btnPrint: 'PRINT',
		dispenserLabel: 'TICKET DISPENSER',
		trayLabel: 'COLLECT TICKET FROM TRAY'
	},
	settingsModal: {
		title: 'TICKET ISSUANCE PANEL',
		btnCancel: 'Cancel',
		btnSave: 'Save Settings',
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
		}
	},
	gateModal: {
		title: 'Turnstile Gate Scan',
		hint: 'Scan this QR directly at metro entry/exit gate',
		btnClose: 'Done / Close'
	}
};