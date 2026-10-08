/**
 * 🚇 Kolkata Metro Golden Test Dataset
 * Official Sources: Metro Railway Kolkata (Indian Railways)
 * URL: https://mtp.indianrailways.gov.in
 */

export const kolkataTestCases = [
	{
		id: "CCU-01",
		desc: "Dakshineswar to Baranagar (Adjacent station on Blue Line)",
		from: "dakshineswar",
		to: "baranagar",
		sourceVerification: {
			officialUrl: "https://mtp.indianrailways.gov.in",
			notificationRef: "Kolkata Metro Minimum Fare Slab (0-2 km)",
			notes: "Minimum fare slab is ₹5."
		},
		expectedFare: 5,
		expectedInterchanges: 0
	},
	{
		id: "CCU-02",
		desc: "Dakshineswar to Dum Dum (Blue Line - 6.29 km)",
		from: "dakshineswar",
		to: "dum_dum",
		sourceVerification: {
			officialUrl: "https://mtp.indianrailways.gov.in",
			notificationRef: "Kolkata Metro 5-10 km Slab",
			notes: "Distance is 6.29 km falling in the 5-10 km slab which is ₹15."
		},
		expectedFare: 15,
		expectedInterchanges: 0
	}
];
