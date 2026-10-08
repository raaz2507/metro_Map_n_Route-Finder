/**
 * 🚇 Agra Metro Golden Test Dataset
 * Official Sources: Uttar Pradesh Metro Rail Corporation (UPMRC)
 * URL: https://www.upmetrorail.com
 */

export const agraTestCases = [
	{
		id: "AGR-01",
		desc: "Taj East Gate to Mankameshwar Mandir (Full Priority Corridor - 5 hops)",
		from: "taj_east_gate",
		to: "mankameshwar_mandir",
		sourceVerification: {
			officialUrl: "https://www.upmetrorail.com",
			notificationRef: "UPMRC Agra Fare Notification - 3 to 6 Stations Slab",
			notes: "5 stations traveled = ₹20 standard token fare."
		},
		expectedFare: 20,
		expectedInterchanges: 0,
		expectedPlatforms: [
			{ atStation: "taj_east_gate", line: "upmrc_agra.yellow" }
		]
	},
	{
		id: "AGR-02",
		desc: "Taj East Gate to Shaheed Captain Shubham Gupta (Adjacent Station)",
		from: "taj_east_gate",
		to: "shaheed_captain_shubham_gupta",
		sourceVerification: {
			officialUrl: "https://www.upmetrorail.com",
			notificationRef: "UPMRC Agra Minimum Fare Slab (1 Station)",
			notes: "1 station traveled = ₹10 minimum base fare."
		},
		expectedFare: 10,
		expectedInterchanges: 0
	},
	{
		id: "AGR-03",
		desc: "Fatehabad Road to Agra Fort (2 hops)",
		from: "fatehabad_road",
		to: "agra_fort",
		sourceVerification: {
			officialUrl: "https://www.upmetrorail.com",
			notificationRef: "UPMRC Agra Fare Notification - 2 Stations Slab",
			notes: "2 stations traveled = ₹15 fare."
		},
		expectedFare: 15,
		expectedInterchanges: 0
	}
];
