/**
 * 🚇 Chennai Metro Golden Test Dataset
 * Official Sources: Chennai Metro Rail Limited (CMRL)
 * URL: https://chennaimetrorail.org
 */

export const chennaiTestCases = [
	{
		id: "MAA-01",
		desc: "Chennai Central to High Court (Blue Line adjacent)",
		from: "puratchi-thalaivar-dr-m-g-ramachandran-central-metro",
		to: "highcourt",
		sourceVerification: {
			officialUrl: "https://chennaimetrorail.org",
			notificationRef: "CMRL Minimum Fare Slab (0-2 km)",
			notes: "Minimum token fare is ₹10."
		},
		expectedFare: 10,
		expectedInterchanges: 0
	},
	{
		id: "MAA-02",
		desc: "Airport to Chennai Central (Direct Blue Line corridor)",
		from: "chennai-international-airport",
		to: "puratchi-thalaivar-dr-m-g-ramachandran-central-metro",
		sourceVerification: {
			officialUrl: "https://chennaimetrorail.org",
			notificationRef: "CMRL Distance Based Slab",
			notes: "End-to-end token fare is ₹40."
		},
		expectedFare: 40,
		expectedInterchanges: 0
	}
];
