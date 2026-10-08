/**
 * 🚇 Lucknow Metro Golden Test Dataset
 * Official Sources: Uttar Pradesh Metro Rail Corporation (UPMRC Lucknow)
 * URL: https://www.upmetrorail.com
 */

export const lucknowTestCases = [
	{
		id: "LKO-01",
		desc: "CCS Airport to Amausi (Adjacent Station)",
		from: "ccs_airport",
		to: "amausi",
		sourceVerification: {
			officialUrl: "https://www.upmetrorail.com",
			notificationRef: "UPMRC Lucknow 1 Station Slab",
			notes: "1 station traveled = ₹10 base fare."
		},
		expectedFare: 10,
		expectedInterchanges: 0
	},
	{
		id: "LKO-02",
		desc: "CCS Airport to Transport Nagar (2 stations)",
		from: "ccs_airport",
		to: "transport_nagar",
		sourceVerification: {
			officialUrl: "https://www.upmetrorail.com",
			notificationRef: "UPMRC Lucknow 2 Stations Slab",
			notes: "2 stations traveled = ₹15 fare."
		},
		expectedFare: 15,
		expectedInterchanges: 0
	},
	{
		id: "LKO-03",
		desc: "CCS Airport to Charbagh (8 stations)",
		from: "ccs_airport",
		to: "charbagh",
		sourceVerification: {
			officialUrl: "https://www.upmetrorail.com",
			notificationRef: "UPMRC Lucknow 7 to 9 Stations Slab",
			notes: "8 stations traveled = ₹30 fare."
		},
		expectedFare: 30,
		expectedInterchanges: 0
	}
];
