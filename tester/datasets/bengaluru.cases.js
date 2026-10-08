/**
 * 🚇 Bengaluru (Namma Metro) Golden Test Dataset
 * Official Sources: BMRCL Official Notification & Commuter Fare Calculator
 * URL: https://english.bmrc.co.in/
 */

export const bengaluruTestCases = [
	{
		id: "BLR-01",
		desc: "Magadi Road to Srirampura (Purple ➔ Green interchange at Majestic)",
		from: "magadi_road",
		to: "srirampura",
		sourceVerification: {
			officialUrl: "https://english.bmrc.co.in/",
			notificationRef: "BMRCL Fare Notification - 4 Stations Traveled Slab",
			notes: "4 stations traveled (excluding origin) = ₹21 standard token fare."
		},
		expectedFare: 21,
		expectedInterchanges: 1
	},
	{
		id: "BLR-02",
		desc: "Nadaprabhu Kempegowda Majestic to Mantri Square Sampige Road (Direct Green Line)",
		from: "nadaprabhu_kempegowda_station_majestic",
		to: "mantri_square_sampige_road",
		sourceVerification: {
			officialUrl: "https://english.bmrc.co.in/",
			notificationRef: "BMRCL Fare Notification - 1 Station Slab",
			notes: "1 station traveled = ₹11 minimum fare."
		},
		expectedFare: 11,
		expectedInterchanges: 0
	},
	{
		id: "BLR-03",
		desc: "Whitefield Kadugodi to Challaghatta (Full Purple Line Corridor)",
		from: "whitefield_kadugodi",
		to: "challaghatta",
		sourceVerification: {
			officialUrl: "https://english.bmrc.co.in/",
			notificationRef: "BMRCL Maximum Tariff Cap (27+ Stations Slab)",
			notes: "36 stations traveled end-to-end = ₹95 maximum fare."
		},
		expectedFare: 95,
		expectedInterchanges: 0,
		expectedPlatforms: [
			{ atStation: "whitefield_kadugodi", line: "bmrcl.purple" }
		]
	}
];
