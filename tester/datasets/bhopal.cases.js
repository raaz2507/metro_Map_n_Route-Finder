/**
 * 🚇 Bhopal Metro Golden Test Dataset
 * Official Sources: Madhya Pradesh Metro Rail Corporation Limited (MPMRCL)
 * URL: https://www.mpmetrorail.com
 */

export const bhopalTestCases = [
	{
		id: "BPL-01",
		desc: "AIIMS to Alkapuri (Orange Line adjacent)",
		from: "aiims",
		to: "alkapuri",
		sourceVerification: {
			officialUrl: "https://www.mpmetrorail.com",
			notificationRef: "MPMRCL Minimum Fare Slab (0-2 km)",
			notes: "Minimum token fare is ₹10."
		},
		expectedFare: 10,
		expectedInterchanges: 0
	},
	{
		id: "BPL-02",
		desc: "AIIMS to Rani Kamlapati Railway Station (Orange Line - 4 stations)",
		from: "aiims",
		to: "rani_kamlapati_railway_station",
		sourceVerification: {
			officialUrl: "https://www.mpmetrorail.com",
			notificationRef: "MPMRCL 2-5 km Slab",
			notes: "Token fare is ₹15."
		},
		expectedFare: 15,
		expectedInterchanges: 0
	}
];
