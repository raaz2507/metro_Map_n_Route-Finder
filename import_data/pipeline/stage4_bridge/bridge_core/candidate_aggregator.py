"""
Multi-Agency Candidate Aggregator for Production Bridge (Stage 4).
Location: import_data/bridge_core/candidate_aggregator.py
Role: Aggregates Stage 3 master files for all networks of a city, reconciling station slugs.
"""
import json
from typing import Dict, Any, List
from pipeline.core.logger import UniversalPipelineLogger
from pipeline.core.slug_reconciler import UniversalSlugReconciler
from pipeline.core.constants import normalize_transit_status

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
					stn_copy = cand_stn.copy()

					# Reconcile platform destinations (e.g. phase_3 -> dlf_phase_3)
					if "platforms" in stn_copy and isinstance(stn_copy["platforms"], dict):
						norm_platforms = {}
						for p_key, p_val in stn_copy["platforms"].items():
							if isinstance(p_val, dict) and "destination" in p_val:
								p_copy = p_val.copy()
								p_copy["destination"] = reconciler.resolve(p_val["destination"])
								norm_platforms[p_key] = p_copy
							else:
								norm_platforms[p_key] = p_val
						stn_copy["platforms"] = norm_platforms

					if canonical_slug not in combined:
						combined[canonical_slug] = stn_copy
					else:
						# Deep-merge multi-agency attributes (Gates, Platforms, Facilities)
						existing = combined[canonical_slug]
						if "gates" in stn_copy and isinstance(stn_copy["gates"], dict):
							existing.setdefault("gates", {}).update(stn_copy["gates"])
						if "platforms" in stn_copy and isinstance(stn_copy["platforms"], dict):
							existing.setdefault("platforms", {}).update(stn_copy["platforms"])
						if "facilities" in stn_copy and isinstance(stn_copy["facilities"], dict):
							for fac_cat, fac_list in stn_copy["facilities"].items():
								if isinstance(fac_list, list):
									existing.setdefault("facilities", {}).setdefault(fac_cat, []).extend(fac_list)

					loaded_count += 1

				UniversalPipelineLogger.log("LOAD", f"Loaded & Reconciled {loaded_count} master stations from [{net_key}]")

			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Failed loading master for [{net_key}]: {ex}")

		return combined
