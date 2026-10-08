/**
 * 🚇 Kochi Metro Golden Test Dataset
 * Official Sources: Kochi Metro Rail Limited (KMRL)
 * URL: https://kochimetro.org
 */

export const kochiTestCases = [
	{
		id: "COK-01",
		desc: "Aluva to Pulinchodu (Line 1 adjacent)",
		from: "aluva",
		to: "pulinchodu",
		sourceVerification: {
			officialUrl: "https://kochimetro.org",
			notificationRef: "KMRL Minimum Fare Slab (0-2 km)",
			notes: "Minimum token fare is ₹10."
		},
		expectedFare: 10,
		expectedInterchanges: 0
	},
	{
		id: "COK-02",
		desc: "Aluva to Companypady (Line 1 2 hops)",
		from: "aluva",
		to: "companypady",
		sourceVerification: {
			officialUrl: "https://kochimetro.org",
			notificationRef: "KMRL 2-5 km Slab",
			notes: "Token fare is ₹20."
		},
		expectedFare: 20,
		expectedInterchanges: 0
	}
];
