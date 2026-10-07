#!/usr/bin/env python3
"""
================================================================================
Universal Compact JSON Serializer
================================================================================
Location: import_data_new/pipeline_core/compact_serializer.py
Role    : Formats transit master datasets with compact inline leaf objects/arrays
Contract: 100% Valid JSON, Zero Data Loss, Network-Agnostic, Pure Python Standard Lib
================================================================================
"""

import json
from typing import Any


class UniversalCompactJSONSerializer:
	"""
	Universal serializer that collapses small leaf objects and lists onto single lines
	(e.g., coordinates, multilingual names, timings, gates, platforms, neighbors)
	while maintaining multi-line hierarchical indentation for higher-level containers.
	"""

	@classmethod
	def serialize(
		cls,
		obj: Any,
		level: int = 0,
		indent_str: str = "\t",
		max_inline_length: int = 130
	) -> str:
		"""
		Recursively serializes a Python structure into clean compact JSON string.
		"""
		if isinstance(obj, (int, float, str, bool)) or obj is None:
			return json.dumps(obj, ensure_ascii=False)

		minified = json.dumps(obj, ensure_ascii=False)

		if isinstance(obj, dict):
			if not obj:
				return "{}"

			# If small and does not contain long complex nested child objects, inline it
			has_complex_children = any(
				isinstance(v, (dict, list)) and len(json.dumps(v, ensure_ascii=False)) > 60
				for v in obj.values()
			)
			if not has_complex_children and len(minified) <= max_inline_length:
				return minified

			tabs = indent_str * level
			child_tabs = indent_str * (level + 1)
			items = []
			for k, v in obj.items():
				key_str = json.dumps(k, ensure_ascii=False)
				val_str = cls.serialize(v, level + 1, indent_str, max_inline_length)
				items.append(f"{child_tabs}{key_str}: {val_str}")
			return "{\n" + ",\n".join(items) + "\n" + tabs + "}"

		elif isinstance(obj, list):
			if not obj:
				return "[]"

			has_complex_children = any(
				isinstance(v, (dict, list)) and len(json.dumps(v, ensure_ascii=False)) > 80
				for v in obj
			)
			if not has_complex_children and len(minified) <= max_inline_length:
				return minified

			tabs = indent_str * level
			child_tabs = indent_str * (level + 1)
			items = [
				f"{child_tabs}{cls.serialize(v, level + 1, indent_str, max_inline_length)}"
				for v in obj
			]
			return "[\n" + ",\n".join(items) + "\n" + tabs + "]"

		return json.dumps(obj, ensure_ascii=False)