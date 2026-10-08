/**
 * 🚇 Pune Metro Golden Test Dataset
 * Official Sources: Maha Metro Pune
 * URL: https://www.punemetrorail.org
 */

export const puneTestCases = [
	{
		id: "PUN-01",
		desc: "Sant Tukaram Nagar to Nashik Phata Bhosari (Purple Line adjacent - 0.91 km)",
		from: "sant_tukaram_nagar",
		to: "nashik_phata_bhosari",
		sourceVerification: {
			officialUrl: "https://www.punemetrorail.org",
			notificationRef: "Maha Metro Pune Minimum Fare Slab (0-2 km)",
			notes: "Minimum token fare is ₹10 (0-2 km slab)."
		},
		expectedFare: 10,
		expectedInterchanges: 0
	},
	{
		id: "PUN-02",
		desc: "Vanaz to Garware College (Aqua Line)",
		from: "vanaz",
		to: "garware_college",
		sourceVerification: {
			officialUrl: "https://www.punemetrorail.org",
			notificationRef: "Maha Metro Pune 4-6 km Slab",
			notes: "Token fare is ₹20."
		},
		expectedFare: 20,
		expectedInterchanges: 0
	}
];
