export default {
    help: {
        index_title: "Table of Contents",
        nav_1: "1. 4-Stage Pipeline Model",
        nav_2: "2. Stage 1: Raw Intake",
        nav_3: "3. Stage 2: Cleaning & Filter",
        nav_4: "4. Delta Review (Clean vs Master)",
        nav_5: "5. [ +New | Total ] Pill Indicators",
        nav_6: "6. Stage 3: Master Supervision",
        nav_7: "7. Universal Scraper CLI",
        nav_8: "8. Terminal & SSE Logs",

        sec1_title: "4-Stage Greedy Data Pipeline Architecture",
        sec1_sub: "Zero Data Loss & Guaranteed Schema Integrity",
        sec1_p1: "Our system follows a strict 4-tier greedy pipeline to ensure no data from official transit sources (DMRC, NMRC, NCRTC, etc.) is lost.",

        sec2_title: "Stage 1: Raw Intake (Greedy Scraping)",
        sec2_sub: "Complete authentic raw data harvesting from official sources",
        sec2_p1: "In this phase, universal_scraper.py captures 100% of payloads via HTML tables or REST APIs without deleting any field.",

        sec3_title: "Stage 2: Cleaning & Hygiene Only",
        sec3_sub: "Strict 0% Structural Mutation Contract",
        sec3_p1: "universal_cleaner.py trims strings, uppercases station codes, and deduplicates without inventing synthetic fields.",

        sec4_title: "Delta Staging Review Mechanism (Cleaned vs Master)",
        sec4_sub: "Automatic detection of newly commissioned stations",
        sec4_formula: "Delta Difference (New Staging) = Cleaned Keys − Master Keys",
        sec4_p1: "Dashboard Section 1 calculates this difference at runtime. Newly detected stations appear as Cyan cards for audit review.",

        sec5_title: "Sidebar [ +New | Total ] Pill Indicators",
        sec5_sub: "Live Audit Scope and Real-Time Counts",
        sec5_item1: "+N (Cyan): Newly detected stations awaiting master entry.",
        sec5_item2: "Total: Total active operational stations count.",
        sec5_item3: "Missing (Rose): Transit raw data pending intake.",

        sec6_title: "Stage 3: Master Supervision (Supervised Schema)",
        sec6_sub: "Final canonical schema verified by developer",
        sec6_p1: "Once station amenities, gates, parking, and interchanges are verified, they are committed into *_master.json.",

        sec7_title: "Universal Scraper CLI Commands",
        sec7_sub: "Direct command-line execution and data extraction",

        sec8_title: "Live Terminal & Server-Sent Events (SSE)",
        sec8_sub: "Real-time execution log streaming in browser",
        sec8_p1: "server.py streams subprocess logs directly to browser consoles without WebSocket overhead."
    }
};