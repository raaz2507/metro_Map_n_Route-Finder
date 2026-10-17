/**
 * 📝 DishaResponseFormatter - Multilingual Structured Payload Builder
 * Formats factual transit outputs for DishaAiView without DOM coupling.
 * 100% Dynamic, Network-Agnostic, and Language-Agnostic.
 */

import { centerClass } from "../../../core/CenterClass.js";
import { TransitNetworkHelper } from "../TransitNetworkHelper.js";

export class DishaResponseFormatter {
	/**
	 * Format Route Search Result
	 */
	static formatRouteResult(routeData, lang = "en") {
		const sourceName = centerClass.getStationName(routeData.source.id, lang);
		const destName = centerClass.getStationName(routeData.destination.id, lang);
		const durationMin = Math.round((routeData.totalTravelTimeSeconds || 0) / 60);
		const distKm = ((routeData.totalDistanceMeters || 0) / 1000).toFixed(1);
		const fareRs = routeData.fare?.totalFare || 0;
		const interchangesCount = Array.isArray(routeData.interchanges) ? routeData.interchanges.length : 0;

		// Extract primary line safely as string
		let lineName = centerClass.t("ai.directRoute");
		if (Array.isArray(routeData.steps) && routeData.steps.length > 0) {
			const firstStep = routeData.steps[0];
			const rawLine = firstStep.lineName || firstStep.line || "Direct";
			if (typeof rawLine === "object" && rawLine !== null) {
				lineName = (lang === "hi" ? rawLine.hi : rawLine.en) || rawLine.en || rawLine.hi || centerClass.t("ai.directRoute");
			} else if (rawLine) {
				lineName = String(rawLine);
			}
		}

		// Textual Summary
		const text = interchangesCount > 0
			? centerClass.t("ai.routeSummaryInterchange", { source: sourceName, dest: destName, duration: durationMin, dist: distKm, interchanges: interchangesCount })
			: centerClass.t("ai.routeSummaryDirect", { source: sourceName, dest: destName, duration: durationMin, dist: distKm });

		// Card summary payload
		const cardData = {
			fromName: sourceName,
			toName: destName,
			lineName: lineName,
			durationMin: durationMin,
			distanceKm: distKm,
			fareRs: fareRs
		};

		return {
			text,
			cardData,
			actions: [
				{
					label: centerClass.t("ai.actionReturnRoute"),
					action: "return_route",
					payload: { sourceId: routeData.destination.id, destId: routeData.source.id }
				}
			],
			suggestions: [
				centerClass.t("ai.sugWhatIsFare"),
				centerClass.t("ai.sugWhereIsInterchange"),
				centerClass.t("ai.sugTrainTimings")
			]
		};
	}

	/**
	 * Format Fare Result
	 */
	static formatFareResult(routeData, lang = "en") {
		const sourceName = centerClass.getStationName(routeData.source.id, lang);
		const destName = centerClass.getStationName(routeData.destination.id, lang);
		const fare = routeData.fare?.totalFare || 0;
		const smartCardFare = fare > 10 ? Math.round(fare * 0.9) : fare; // 10% smart card discount

		const text = centerClass.t("ai.fareSummary", { source: sourceName, dest: destName, fare, smartCardFare });

		return {
			text,
			actions: [
				{
					label: centerClass.t("ai.actionViewRoute"),
					action: "view_route",
					payload: { sourceId: routeData.source.id, destId: routeData.destination.id }
				}
			],
			suggestions: [
				centerClass.t("ai.sugHowLongTake"),
				centerClass.t("ai.sugReturnFare"),
				centerClass.t("ai.sugShowOnMap")
			]
		};
	}

	/**
	 * Format Travel Time and Distance Result
	 */
	static formatTimeDistanceResult(routeData, lang = "en") {
		const sourceName = centerClass.getStationName(routeData.source.id, lang);
		const destName = centerClass.getStationName(routeData.destination.id, lang);
		const durationMin = Math.round((routeData.totalTravelTimeSeconds || 0) / 60);
		const distKm = ((routeData.totalDistanceMeters || 0) / 1000).toFixed(1);
		const stationCount = routeData.path ? routeData.path.length : 0;

		const text = centerClass.t("ai.timeDistanceSummary", { source: sourceName, dest: destName, dist: distKm, duration: durationMin, stations: stationCount });

		return {
			text,
			actions: [
				{
					label: centerClass.t("ai.actionCheckFare"),
					action: "check_fare",
					payload: { sourceId: routeData.source.id, destId: routeData.destination.id }
				}
			],
			suggestions: [
				centerClass.t("ai.sugWhatIsFare"),
				centerClass.t("ai.sugReturnRoute")
			]
		};
	}

	/**
	 * Format Station Information (Gates, Platforms, Interchange, Facilities)
	 */
	static formatStationInfo(station, lang = "en") {
		const stationName = centerClass.getStationName(station.id, lang);
		const details = centerClass.getStationDetails(station.id) || station;

		const gates = details.gates || details.gate_info || null;
		const lines = details.lines || [details.line].filter(Boolean);
		const isInterchange = Boolean(details.is_interchange || (lines && lines.length > 1));

		let gatesInfo = "";
		if (gates) {
			const count = typeof gates === "object" ? Object.keys(gates).length : gates;
			gatesInfo = centerClass.t("ai.gatesAvailable", { count });
		}

		const linesText = lines.join(", ") || "Main Line";
		const templateKey = isInterchange ? "ai.stationInfoInterchange" : "ai.stationInfoSingle";
		const text = centerClass.t(templateKey, { station: stationName, lines: linesText, gatesInfo });

		const topHub = TransitNetworkHelper.getTopNetworkHubs(1)[0];

		return {
			text,
			actions: [
				{
					label: centerClass.t("ai.actionStartHere"),
					action: "set_source",
					payload: { stationId: station.id }
				},
				{
					label: centerClass.t("ai.actionGoHere"),
					action: "set_dest",
					payload: { stationId: station.id }
				}
			],
			suggestions: [
				centerClass.t("ai.sugTrainTimings"),
				topHub && topHub.id !== station.id ? centerClass.getStationName(topHub.id, lang) : null,
				centerClass.t("ai.sugNearbyStations")
			].filter(Boolean)
		};
	}

	/**
	 * Format Line Information
	 */
	static formatLineInfo(station, lang = "en") {
		const stationName = centerClass.getStationName(station.id, lang);
		const details = centerClass.getStationDetails(station.id) || station;
		const lines = details.lines || [details.line].filter(Boolean);
		const interchangeNote = details.is_interchange ? centerClass.t("ai.lineInterchangeNote") : "";
		const text = centerClass.t("ai.lineInfo", { station: stationName, lines: lines.join(" & "), interchangeNote });

		return {
			text,
			actions: [],
			suggestions: [
				centerClass.t("ai.sugStationDetails"),
				centerClass.t("ai.sugWhatIsFare")
			]
		};
	}

	/**
	 * Format Greeting
	 */
	static formatGreeting(lang = "en") {
		const text = centerClass.t("ai.greeting");
		const sampleRoute = TransitNetworkHelper.getStarterRouteSuggestions(lang)[0] || null;

		return {
			text,
			actions: [],
			suggestions: [
				sampleRoute,
				centerClass.t("ai.sugWhatIsFare"),
				centerClass.t("ai.sugNearbyStations")
			].filter(Boolean)
		};
	}

	/**
	 * Format Help
	 */
	static formatHelp(lang = "en") {
		const text = centerClass.t("ai.help");
		const sampleRoute = TransitNetworkHelper.getStarterRouteSuggestions(lang)[0] || null;

		return {
			text,
			actions: [],
			suggestions: [
				sampleRoute,
				centerClass.t("ai.sugNearbyStations"),
				centerClass.t("ai.sugWhatIsFare")
			].filter(Boolean)
		};
	}

	/**
	 * Format Fallback response
	 */
	static formatFallback(query, lang = "en") {
		const text = centerClass.t("ai.fallback");
		const sampleRoute = TransitNetworkHelper.getStarterRouteSuggestions(lang)[0] || null;

		return {
			text,
			actions: [],
			suggestions: [
				sampleRoute,
				centerClass.t("ai.sugWhatIsFare"),
				centerClass.t("ai.sugHelpMe")
			].filter(Boolean)
		};
	}
}
