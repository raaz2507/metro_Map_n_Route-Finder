// /lang/en.js
import common from "./en/common.js";
import home from "./en/home.js";
import networks from "./en/networks.js";
import allStations from "./en/all_stations.js";
import stationInfo from "./en/station_info.js";
import metroQrTicket from "./en/metro_QR_ticket.js";
import tvmDispenser from "./en/tvm_dispenser.js";
import passengerSupport from "./en/passenger_support.js";
import help from "./en/help.js";
import about from "./en/about.js";
import countrySelector from "./en/country_selector.js";

export default {
	...common,
	pages: {
		home,
		networks,
		countrySelector,
		all_stations: allStations
	},
	station_info: stationInfo,
	metroTicket: metroQrTicket,
	tvmDispenser: tvmDispenser,
	passengerSupport,
	help,
	about
};