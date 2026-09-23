export default {
    sidebar: {
        sync_all_btn: "Sync All Networks",
        networks_title: "Transit Networks",
        scope_total: "Audit Scope Total",
        legend_title: "Count Indicators",
        legend_new_staging: "New Staging Detected",
        legend_active_stations: "Active Stations",
        legend_missing_file: "File Pending Intake",
        stage_3_title: "Stage 3: Master Structured",
        stage_3_desc: "Supervised verified schema ({net}_master.json).",
        stage_2_title: "Stage 2: Basic Cleaned",
        stage_2_desc: "Scraped & deduplicated ({net}_cleaned.json).",
        stage_1_title: "Stage 1: Raw Intake",
        stage_1_desc: "Greedy scraped raw data ({net}_raw.json)."
    },
    controls: {
        official_site: "Official Site",
        viewing_stage: "Viewing Stage:",
        stage_raw: "1. Raw",
        stage_cleaned: "2. Cleaned",
        stage_master: "3. Master"
    },
    actions: {
        pipeline_label: "Pipeline Actions:",
        fetch_raw: "Fetch Raw",
        fetch_raw_media: "Fetch + Media",
		fetch_fare: "Fetch Fare",
        clean_process: "Process Clean",
        generate_master: "Generate Master",
        open_bridge: "Production Bridge ➔",
        logs_console: "Logs & Terminal"
    },
    metrics: {
        total_stations: "Total Stations (Active View)",
        new_staging: "New Staging",
        pipeline_stage: "Active Pipeline Stage",
        audit_status: "Audit Status"
    },
    sections: {
        staging_review_title: "Section 1: Newly Detected Stations (Staging Review)",
        active_dataset_title: "Section 2: Active Station Dataset"
    }
};