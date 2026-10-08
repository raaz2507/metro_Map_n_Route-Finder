/**
 * 🚇 Hyderabad Metro Golden Test Dataset
 * Official Sources: L&T Metro Rail Hyderabad (LTMRHL)
 * URL: https://www.ltmetro.com
 */

export const hyderabadTestCases = [
	{
		id: "HYD-01",
		desc: "Miyapur to JNTU College (Adjacent station on Red Line - 1.95 km)",
		from: "miyapur",
		to: "jntu-college",
		sourceVerification: {
			officialUrl: "https://www.ltmetro.com",
			notificationRef: "Hyderabad Metro Minimum Fare Slab (0-2 km)",
			notes: "Official minimum token fare slab (0-2 km) is ₹12 (revised tariff)."
		},
		expectedFare: 12,
		expectedInterchanges: 0
	},
	{
		id: "HYD-02",
		desc: "Ameerpet to Prakash Nagar (Blue Line - 2.78 km)",
		from: "ameerpet",
		to: "prakash-nagar",
		sourceVerification: {
			officialUrl: "https://www.ltmetro.com",
			notificationRef: "Hyderabad Metro 2-4 km Slab",
			notes: "Official fare slab (2-4 km) is ₹18."
		},
		expectedFare: 18,
		expectedInterchanges: 0
	}
];
