/**
 * 🚇 Nagpur Metro Golden Test Dataset
 * Official Sources: Maha Metro Nagpur
 * URL: https://www.metrorailnagpur.com
 */

export const nagpurTestCases = [
	{
		id: "NAG-01",
		desc: "New Airport to South Airport (Orange Line adjacent - 1.64 km)",
		from: "new_airport",
		to: "south_airport",
		sourceVerification: {
			officialUrl: "https://www.metrorailnagpur.com",
			notificationRef: "Maha Metro Nagpur Minimum Fare Slab (0-2 km)",
			notes: "Minimum token fare is ₹10 (0-2 km slab)."
		},
		expectedFare: 10,
		expectedInterchanges: 0
	},
	{
		id: "NAG-02",
		desc: "Lokmanya Nagar to Bansi Nagar (Aqua Line adjacent - 1.40 km)",
		from: "lokmanya_nagar_open",
		to: "bansi_nagar",
		sourceVerification: {
			officialUrl: "https://www.metrorailnagpur.com",
			notificationRef: "Maha Metro Nagpur Minimum Fare Slab (0-2 km)",
			notes: "Token fare is ₹10."
		},
		expectedFare: 10,
		expectedInterchanges: 0
	}
];
