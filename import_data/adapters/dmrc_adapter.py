import random
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pipeline_core.base_adapter import BaseTransitAdapter
from pipeline_core.file_manager import UniversalFileSystemManager
from pipeline_core.logger import UniversalPipelineLogger


class DMRCEcosystemAdapter(BaseTransitAdapter):
    """
    Handles DMRC Ecosystem (Delhi Metro & Rapid Metro Gurugram) REST API.
    Zero hardcoded URLs or station filter lists. Config-driven via manifest.
    Polite Concurrency: 3 workers + human jitter + 429 backoff to prevent IP bans.
    """

    def extract(self, network_id: str, net_info: dict) -> dict:
        session = self.create_session(net_info.get("source_url", ""))

        data_sources = net_info.get("data_sources", {})
        stations_cfg = data_sources.get("stations", {})
        api_list_url = stations_cfg.get("url") if isinstance(stations_cfg, dict) else stations_cfg

        if not api_list_url:
            UniversalPipelineLogger.log("ERROR", f"Missing 'stations' URL in config for {network_id}")
            return {}

        UniversalPipelineLogger.log("CRAWL", f"Querying DMRC API station list: {api_list_url}")
        resp = session.get(api_list_url, verify=False, timeout=15)
        resp.raise_for_status()
        station_entries = resp.json()

        unique_stations = {}
        for st in station_entries:
            if isinstance(st, dict):
                code = st.get("station_code") or st.get("code") or st.get("id")
                if code and str(code).strip():
                    unique_stations[str(code).strip().upper()] = st

        UniversalPipelineLogger.log("CRAWL", f"Fetched {len(unique_stations)} total raw stations from DMRC endpoint.")

        filter_codes = net_info.get("filter_station_codes") or stations_cfg.get("filter_codes")
        if filter_codes:
            filter_set = {str(c).strip().upper() for c in filter_codes}
            target_stations = {code: st for code, st in unique_stations.items() if code in filter_set}
            UniversalPipelineLogger.log("FILTER", f"Filtered {len(target_stations)} corridor stations via manifest filter.")
        else:
            target_stations = unique_stations

        details_cfg = data_sources.get("station_details", {})
        detail_template = details_cfg.get("url") if isinstance(details_cfg, dict) else ""
        languages = details_cfg.get("languages", ["en", "hi"]) if isinstance(details_cfg, dict) else ["en", "hi"]

        def _fetch_station_details(code: str, st_meta: dict):
            # Human-like micro delay (Jitter) to prevent WAF burst detection
            time.sleep(random.uniform(0.08, 0.20))

            name = st_meta.get("station_name") or st_meta.get("name") or code
            slug = UniversalFileSystemManager.slugify(name)
            lang_payloads = {}

            if detail_template and "{code}" in detail_template:
                for lang in languages:
                    target_url = detail_template.format(lang=lang, code=code)
                    for attempt in range(2):
                        try:
                            r = session.get(target_url, verify=False, timeout=8)
                            if r.status_code == 200:
                                lang_payloads[lang] = r.json()
                                break
                            elif r.status_code in (429, 503):
                                # Polite Rate-Limit Backoff: Pause briefly if server signals pressure
                                time.sleep(2.0)
                        except Exception:
                            time.sleep(0.5)

            en_payload = lang_payloads.get("en", {})
            hi_payload = lang_payloads.get("hi", {})

            name_en = (en_payload.get("station_name") if isinstance(en_payload, dict) else "") or name
            name_hi = (hi_payload.get("station_name") if isinstance(hi_payload, dict) else "") or name_en

            return {
                "code": code,
                "slug": slug,
                "name_en": name_en,
                "name_hi": name_hi,
                "en_raw": en_payload if en_payload else st_meta,
                "hi_raw": hi_payload if hi_payload else st_meta
            }

        UniversalPipelineLogger.log("CRAWL", f"Starting Polite Concurrency for {len(target_stations)} stations (3 safe workers)...")
        results_map = {}
        completed_count = 0
        total_stations = len(target_stations)

        # 3 Workers = Stealth & Safe from Server IP Bans
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_to_code = {
                executor.submit(_fetch_station_details, code, meta): code 
                for code, meta in target_stations.items()
            }
            for future in as_completed(future_to_code):
                res = future.result()
                results_map[res["code"]] = res
                completed_count += 1
                if completed_count % 25 == 0 or completed_count == total_stations:
                    UniversalPipelineLogger.log("CRAWL", f"[{completed_count}/{total_stations}] Safe Intake: {res['name_en']} ({res['code']})")

        # Deterministic order preservation
        deep_dataset = {}
        for code in target_stations.keys():
            item = results_map.get(code)
            if not item:
                continue

            slug = item["slug"]
            orig_slug = slug
            counter = 1
            while slug in deep_dataset and deep_dataset[slug].get("station_code") != code:
                slug = f"{orig_slug}({counter})"
                counter += 1

            deep_dataset[slug] = {
                "id": slug,
                "station_code": item["code"],
                "station_name_en": item["name_en"],
                "station_name_hi": item["name_hi"],
                "en_raw": item["en_raw"],
                "hi_raw": item["hi_raw"]
            }

        return deep_dataset