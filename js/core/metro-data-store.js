/**
 * Metro Data Store - Singleton Data Repository
 * Loads and normalizes data.json once for the entire application.
 */
import data from "../../data/data.json" with { type: "json" };
import { normalizeStationCoordinates } from "./data-utils.js";

class MetroDataStore {
    #metroData;

    constructor() {
        this.#metroData = normalizeStationCoordinates(data);
    }

    get data() {
        return this.#metroData;
    }

    get stationData() {
        return this.#metroData?.stationData || {};
    }

    get lines() {
        return this.#metroData?.lines || {};
    }
}

export const metroDataStore = new MetroDataStore();