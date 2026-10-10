// /lang/hi.js
import common from "./india/hi/common.js";
import home from "./india/hi/home.js";
import networks from "./india/hi/networks.js";
import allStations from "./india/hi/all_stations.js";
import stationInfo from "./india/hi/station_info.js";
import metroQrTicket from "./india/hi/metro_QR_ticket.js";
import tvmDispenser from "./india/hi/tvm_dispenser.js";
import passengerSupport from "./india/hi/passenger_support.js";
import help from "./india/hi/help.js";
import about from "./india/hi/about.js";
import countrySelector from "./india/hi/country_selector.js";
import smartCardTicket from "./india/hi/smart_card_ticket.js";
import other from "./india/hi/other.js";

export default {
	...common,
	pages: {
		home,
		networks,
		countrySelector,
		all_stations: allStations,
		other
	},
	station_info: stationInfo,
	metroTicket: metroQrTicket,
	tvmDispenser: tvmDispenser,
	passengerSupport,
	help,
	about,
	smartCardTicket,
	other
};