// /lang/pages/metro_QR_ticket.en.js
export default {
	meta: {
		title: "Metro Pass Wallet | YatraMarg",
		desc: "Offline digital metro QR pass wallet. Scan paper tickets or paste WhatsApp screenshots to generate high-contrast gate passes."
	},
	cards: {
		whatsapp: {
			title: "1. Get Real DMRC Ticket",
			desc: "Book official QR ticket via DMRC WhatsApp Bot",
			btn: "Open DMRC WhatsApp Bot"
		},
		ingestion: {
			title: "2. Save Gate Ticket",
			desc: "Drop paper ticket photo or WhatsApp screenshot here",
			dropTitle: "Drop Paper Ticket or Screenshot",
			dropHint: "Multi-Engine Fallback: BarcodeDetector -> jsQR -> ZXing",
			btnCamera: "Take Photo with Camera (Paper Ticket)",
			btnBrowse: "Browse File from Device / Gallery",
			btnPaste: "Tap to Paste Screenshot from Clipboard"
		},
		pass: {
			statusReady: "GATE READY PASS",
			turnstileTitle: "Metro Turnstile Pass",
			turnstileSubtitle: "Pure Mathematical Vector QR (100% Crisp)",
			btnGateMode: "Gate Mode",
			btnOriginalPic: "Original Pic",
			btnArchive: "Move to History",
			btnTvm: 'Open TVM Dispenser',
		},
		history: {
			title: "Ticket History",
			btnClearAll: "Clear All",
			empty: "No tickets in history yet. Saved tickets will appear here.",
			btnRestore: "Restore",
			statusActive: "ACTIVE",
			statusArchived: "SAVED",
			statusExpired: "EXPIRED"
		}
	},
	guide: {
		title: "How to Add Tickets",
		step1Title: "1. Direct Camera Photo",
		step1Desc: "Tap 'Take Photo with Camera' and snap the paper ticket from counter/machine — instantly turned into digital pass.",
		step2Title: "2. WhatsApp Screenshot (1-Tap Paste)",
		step2Desc: "Take screenshot when WhatsApp ticket arrives, then tap 'Tap to Paste'. Loads in 1 second.",
		step3Title: "3. Gallery Pick or Drag-and-Drop",
		step3Desc: "Select any saved ticket image from your device gallery in 1 tap.",
		banner: "Our multi-engine pipeline (BarcodeDetector + jsQR + ZXing) reads token data from your screenshot or photo and paints a 100% new Pure Vector QR code, while preserving the original image safely."
	},
	benefits: {
		title: "Why Use Metro Pass Wallet?",
		b1Title: "No fear of paper tearing, getting wet or lost",
		b1Desc: "Paper tickets in pockets crumple, get wet in rain, or get misplaced. Storing digital backup keeps ticket secure.",
		b2Title: "Works 100% offline at underground stations",
		b2Desc: "No internet or WhatsApp hanging at underground stations. This pass is offline-ready and opens instantly.",
		b3Title: "Instant gate entry in 1-tap (Gate Mode)",
		b3Desc: "No searching through WhatsApp chats in crowds. Tap Gate Mode for high-contrast bright QR that gates read effortlessly.",
		b4Title: "Up to 13 tickets history & easy restore",
		b4Desc: "Keep return journey or friends' tickets in history and restore them anytime with 1 tap."
	},
	modals: {
		gate: {
			title: "Turnstile Gate Scan",
			hint: "Scan this QR directly at metro entry/exit gate",
			btnDone: "Done / Close"
		},
		original: {
			title: "Original Ticket Image",
			sub: "Original Backup",
			btnClose: "Close Preview"
		},
		camera: {
			title: "Live Camera Ticket Scanner",
			hint: "Align paper ticket QR inside frame to scan",
			switchCamera: "Switch Camera",
			btnClose: "Cancel / Close"
		},
		confirm: {
			title: "Warning",
			cancel: "Cancel",
			confirm: "Confirm",
			clearAllDesc: "Are you sure you want to permanently delete all tickets from history?",
			replaceActiveDesc: "There is already an active gate pass. Moving current pass to history and activating new ticket."
		}
	},
	toast: {
		selectImage: "Please select image file or press Ctrl+V",
		noClipboard: "No image in clipboard. Please copy screenshot first.",
		selectingFile: "Selecting file instead...",
		scanning: "Scanning with Multi-Engine Fallback Pipeline...",
		errorLoading: "Error loading image. Please try again.",
		qrGenerated: "100% Pure Vector QR Generated via {engine}",
		qrNotDetected: "QR Not Detected. Tap 'Original Pic' to view ticket.",
		noOriginalImage: "No original image found.",
		movedToHistory: "Active ticket moved to History.",
		restoredToGatePass: "Ticket restored to Gate Pass!",
		deletedFromHistory: "Ticket deleted from History.",
		allCleared: "All ticket history cleared.",
		cameraPermissionDenied: "Camera permission denied or camera not available.",
		cameraError: "Unable to start camera. Please upload ticket image instead."
	}
};