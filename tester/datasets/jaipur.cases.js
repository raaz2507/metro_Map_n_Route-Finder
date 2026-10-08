/**
 * 🚇 Jaipur Metro Golden Test Dataset
 * Official Sources: Jaipur Metro Rail Corporation (JMRC)
 * URL: https://transport.rajasthan.gov.in/jmrc
 */

export const jaipurTestCases = [
	{
		id: "JPR-01",
		desc: "Mansarovar to Badi Chaupar (Full Pink Line Corridor - 10 hops)",
		from: "mansarovar",
		to: "badi_chaupar",
		sourceVerification: {
			officialUrl: "https://transport.rajasthan.gov.in/jmrc",
			notificationRef: "JMRC Official Fare Slab (9 to 10 Stations)",
			notes: "10 stations traveled = ₹30 maximum standard token fare."
		},
		expectedFare: 30,
		expectedInterchanges: 0,
		expectedPlatforms: [
			{ atStation: "mansarovar", line: "jmrc.pink" }
		]
	},
	{
		id: "JPR-02",
		desc: "Mansarovar to New Aatish Market (1 hop)",
		from: "mansarovar",
		to: "new_aatish_market",
		sourceVerification: {
			officialUrl: "https://transport.rajasthan.gov.in/jmrc",
			notificationRef: "JMRC Official Fare Slab (0 to 2 Stations)",
			notes: "1 station traveled = ₹10 minimum base fare."
		},
		expectedFare: 10,
		expectedInterchanges: 0
	},
	{
		id: "JPR-03",
		desc: "Mansarovar to Chandpole (8 hops)",
		from: "mansarovar",
		to: "chandpole",
		sourceVerification: {
			officialUrl: "https://transport.rajasthan.gov.in/jmrc",
			notificationRef: "JMRC Official Fare Slab (6 to 8 Stations)",
			notes: "8 stations traveled = ₹25 fare."
		},
		expectedFare: 25,
		expectedInterchanges: 0
	}
];
