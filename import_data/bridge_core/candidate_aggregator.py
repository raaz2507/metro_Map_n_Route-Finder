"""
Multi-Agency Candidate Aggregator for Production Bridge (Stage 4).
Location: import_data/bridge_core/candidate_aggregator.py
Role: Aggregates Stage 3 master files for all networks of a city, reconciling station slugs.
"""
import json
from typing import Dict, Any, List
from pipeline_core.logger import UniversalPipelineLogger
from pipeline_core.slug_reconciler import UniversalSlugReconciler


class MultiAgencyCandidateAggregator:
	"""
	Aggregates multi-agency candidate datasets into a unified,
	reconciled station dictionary with deep attribute merging.
	100% City-Agnostic, Zero Hardcoding, Modular.
	"""

	@staticmethod
	def aggregate(networks: List[Dict[str, Any]], reconciler: UniversalSlugReconciler) -> Dict[str, Any]:
		"""Deep merges multi-agency datasets into canonical station records."""
		combined: Dict[str, Any] = {}

		for net in networks:
			m_file = net.get("master_file")
			net_key = net.get("network_key", "unknown")

			if not m_file or not m_file.exists():
				UniversalPipelineLogger.log("INFO", f"Network [{net_key}] has no Stage 3 master yet (Skipped).")
				continue

			try:
				with open(m_file, "r", encoding="utf-8") as f:
					net_data = json.load(f)

				stns = net_data.get("stations", net_data)
				if not isinstance(stns, dict):
					continue

				loaded_count = 0
				for raw_slug, cand_stn in stns.items():
					if not isinstance(cand_stn, dict):
						continue

					canonical_slug = reconciler.resolve(raw_slug)

					if canonical_slug not in combined:
						combined[canonical_slug] = cand_stn.copy()
					else:
						# Deep-merge multi-agency attributes (Gates, Platforms, Facilities)
						existing = combined[canonical_slug]
						if "gates" in cand_stn and isinstance(cand_stn["gates"], dict):
							existing.setdefault("gates", {}).update(cand_stn["gates"])
						if "platforms" in cand_stn and isinstance(cand_stn["platforms"], dict):
							existing.setdefault("platforms", {}).update(cand_stn["platforms"])
						if "facilities" in cand_stn and isinstance(cand_stn["facilities"], dict):
							for fac_cat, fac_list in cand_stn["facilities"].items():
								if isinstance(fac_list, list):
									existing.setdefault("facilities", {}).setdefault(fac_cat, []).extend(fac_list)

					loaded_count += 1

				UniversalPipelineLogger.log("LOAD", f"Loaded & Reconciled {loaded_count} master stations from [{net_key}]")

			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Failed loading master for [{net_key}]: {ex}")

		return combined
