/**
 * 🚇 Indore Metro Golden Test Dataset
 * Official Sources: Madhya Pradesh Metro Rail Corporation Limited (MPMRCL Indore)
 * URL: https://www.mpmetrorail.com
 */

export const indoreTestCases = [
	{
		id: "IDR-01",
		desc: "Gandhi Nagar to Super Corridor (Yellow Line adjacent)",
		from: "gandhi_nagar",
		to: "super_corridor",
		sourceVerification: {
			officialUrl: "https://www.mpmetrorail.com",
			notificationRef: "MPMRCL Minimum Fare Slab (0-2 km)",
			notes: "Minimum token fare is ₹10."
		},
		expectedFare: 10,
		expectedInterchanges: 0
	},
	{
		id: "IDR-02",
		desc: "Gandhi Nagar to Super Corridor(3) (Yellow Line 4 hops)",
		from: "gandhi_nagar",
		to: "super_corridor(3)",
		sourceVerification: {
			officialUrl: "https://www.mpmetrorail.com",
			notificationRef: "MPMRCL 2-5 km Slab",
			notes: "Token fare is ₹15."
		},
		expectedFare: 15,
		expectedInterchanges: 0
	}
];
