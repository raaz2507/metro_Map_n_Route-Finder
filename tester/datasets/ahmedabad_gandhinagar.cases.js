/**
 * 🚇 Ahmedabad-Gandhinagar Metro Golden Test Dataset
 * Official Sources: Gujarat Metro Rail Corporation (GMRC)
 * URL: https://www.gujaratmetrorail.com
 */

export const ahmedabadTestCases = [
	{
		id: "AMD-01",
		desc: "Thaltej Gam to Thaltej (Blue Line adjacent)",
		from: "thaltej_gam",
		to: "thaltej",
		sourceVerification: {
			officialUrl: "https://www.gujaratmetrorail.com",
			notificationRef: "GMRC Minimum Fare Slab (0-2.5 km)",
			notes: "Minimum token fare is ₹5."
		},
		expectedFare: 5,
		expectedInterchanges: 0
	},
	{
		id: "AMD-02",
		desc: "Old High Court to SP Stadium (Red Line adjacent)",
		from: "old_high_court",
		to: "sp_stadium",
		sourceVerification: {
			officialUrl: "https://www.gujaratmetrorail.com",
			notificationRef: "GMRC Minimum Fare Slab (0-2.5 km)",
			notes: "Fare is ₹5."
		},
		expectedFare: 5,
		expectedInterchanges: 0
	}
];
