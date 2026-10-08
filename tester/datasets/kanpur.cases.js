/**
 * 🚇 Kanpur Metro Golden Test Dataset
 * Official Sources: Uttar Pradesh Metro Rail Corporation (UPMRC Kanpur)
 * URL: https://www.upmetrorail.com
 */

export const kanpurTestCases = [
	{
		id: "KNP-01",
		desc: "IIT Kanpur to Kalyanpur Metro (Adjacent station)",
		from: "iit_kanpur",
		to: "kalyanpur_metro",
		sourceVerification: {
			officialUrl: "https://www.upmetrorail.com",
			notificationRef: "UPMRC Kanpur Fare Notification - 1 Station Slab",
			notes: "1 station traveled = ₹10 base fare."
		},
		expectedFare: 10,
		expectedInterchanges: 0
	},
	{
		id: "KNP-02",
		desc: "IIT Kanpur to SPM Hospital (2 stations)",
		from: "iit_kanpur",
		to: "spm_hospital",
		sourceVerification: {
			officialUrl: "https://www.upmetrorail.com",
			notificationRef: "UPMRC Kanpur Fare Notification - 2 Stations Slab",
			notes: "2 stations traveled = ₹15 fare."
		},
		expectedFare: 15,
		expectedInterchanges: 0
	},
	{
		id: "KNP-03",
		desc: "IIT Kanpur to Motijheel Metro (8 stations)",
		from: "iit_kanpur",
		to: "motijheel_metro",
		sourceVerification: {
			officialUrl: "https://www.upmetrorail.com",
			notificationRef: "UPMRC Kanpur Fare Notification - 7 to 9 Stations Slab",
			notes: "8 stations traveled = ₹30 fare."
		},
		expectedFare: 30,
		expectedInterchanges: 0
	}
];
