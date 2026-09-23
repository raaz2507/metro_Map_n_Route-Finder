#!/usr/bin/env python3
"""
================================================================================
Universal Transit Audit & Live Diff Engine (Stage 3 Live Validator)
================================================================================
Location: import_data_new/pipeline_core/audit_engine.py
Role    : In-memory structural diff analyzer across all transit networks
Policy  : Zero disk clutter (no extra files saved), 100% live terminal streaming
================================================================================
"""

import json
from typing import Dict, Any, List, Optional, Tuple
from .logger import UniversalPipelineLogger


class UniversalAuditEngine:
	"""
	Universal in-memory diff engine.
	Detects additions, removals, and attribute mutations between
	baseline master datasets and newly structured candidates.
	"""

	@classmethod
	def extract_stations(cls, dataset: Any) -> Dict[str, Any]:
		"""Extracts stations dictionary regardless of root schema structure."""
		if not isinstance(dataset, dict):
			return {}

		stations = dataset.get("stations", dataset)
		if isinstance(stations, dict):
			return stations
		elif isinstance(stations, list):
			return {
				s.get("id", str(idx)): s
				for idx, s in enumerate(stations)
				if isinstance(s, dict)
			}
		return {}

	@classmethod
	def resolve_station_name(cls, slug: str, st_obj: Dict[str, Any]) -> str:
		"""Extracts human-readable station name generically."""
		if not isinstance(st_obj, dict):
			return slug

		name_field = st_obj.get("name")
		if isinstance(name_field, dict):
			return name_field.get("en") or name_field.get("hi") or slug
		elif isinstance(name_field, str) and name_field.strip():
			return name_field.strip()

		st_name = st_obj.get("station_name")
		if isinstance(st_name, str) and st_name.strip():
			return st_name.strip()

		return slug.replace("_", " ").title()

	@classmethod
	def find_modified_attributes(cls, old_st: Dict[str, Any], new_st: Dict[str, Any]) -> List[str]:
		"""Finds which specific attributes changed between two station objects."""
		changed = []
		all_keys = set(old_st.keys()) | set(new_st.keys())

		for k in sorted(all_keys):
			if k not in old_st:
				changed.append(f"+{k}")
			elif k not in new_st:
				changed.append(f"-{k}")
			elif old_st[k] != new_st[k]:
				changed.append(k)

		return changed

	@classmethod
	def audit_and_stream(
		cls,
		network_id: str,
		baseline_master: Optional[Dict[str, Any]],
		candidate_master: Dict[str, Any]
	) -> Dict[str, Any]:
		"""
		Performs deep in-memory diff and streams live human-readable summary
		directly to the execution console without writing any files to disk.
		"""
		old_stns = cls.extract_stations(baseline_master) if baseline_master else {}
		new_stns = cls.extract_stations(candidate_master)

		old_keys = set(old_stns.keys())
		new_keys = set(new_stns.keys())

		added_keys = sorted(list(new_keys - old_keys))
		removed_keys = sorted(list(old_keys - new_keys))
		common_keys = sorted(list(old_keys & new_keys))

		modified_list: List[Tuple[str, List[str]]] = []
		for k in common_keys:
			diff_fields = cls.find_modified_attributes(old_stns[k], new_stns[k])
			if diff_fields:
				modified_list.append((k, diff_fields))

		# Live Stream Logging to Terminal
		UniversalPipelineLogger.log("AUDIT", "==================================================================")
		UniversalPipelineLogger.log("AUDIT", f"Stage 3 Live Audit & Diff Analysis for: {network_id}")
		UniversalPipelineLogger.log("AUDIT", "------------------------------------------------------------------")
		UniversalPipelineLogger.log("AUDIT", f"Baseline Master Stations  : {len(old_keys)}")
		UniversalPipelineLogger.log("AUDIT", f"Candidate Master Stations : {len(new_keys)}")

		if added_keys:
			UniversalPipelineLogger.log("AUDIT", f"🟢 NEW STATIONS DETECTED ({len(added_keys)}):")
			for k in added_keys[:10]:
				s_name = cls.resolve_station_name(k, new_stns.get(k, {}))
				UniversalPipelineLogger.log("AUDIT", f"   + [{k}] {s_name}")
			if len(added_keys) > 10:
				UniversalPipelineLogger.log("AUDIT", f"   ... and {len(added_keys) - 10} more new stations")

		if removed_keys:
			UniversalPipelineLogger.log("AUDIT", f"🔴 MISSING / REMOVED STATIONS ({len(removed_keys)}):")
			for k in removed_keys[:10]:
				s_name = cls.resolve_station_name(k, old_stns.get(k, {}))
				UniversalPipelineLogger.log("AUDIT", f"   - [{k}] {s_name}")
			if len(removed_keys) > 10:
				UniversalPipelineLogger.log("AUDIT", f"   ... and {len(removed_keys) - 10} more removed stations")

		if modified_list:
			UniversalPipelineLogger.log("AUDIT", f"🟡 MODIFIED ATTRIBUTES ({len(modified_list)} stations):")
			for k, fields in modified_list[:10]:
				s_name = cls.resolve_station_name(k, new_stns.get(k, {}))
				UniversalPipelineLogger.log("AUDIT", f"   ~ [{k}] {s_name} -> changed: [{', '.join(fields[:4])}]")
			if len(modified_list) > 10:
				UniversalPipelineLogger.log("AUDIT", f"   ... and {len(modified_list) - 10} more modified stations")

		if not added_keys and not removed_keys and not modified_list:
			UniversalPipelineLogger.log("AUDIT", "✅ STATUS: 100% In-Sync (Zero Schema Drift Detected)")

		UniversalPipelineLogger.log("AUDIT", "==================================================================")

		return {
			"added_count": len(added_keys),
			"removed_count": len(removed_keys),
			"modified_count": len(modified_list),
			"added_keys": added_keys,
			"removed_keys": removed_keys,
			"is_synced": not (added_keys or removed_keys or modified_list),
		}