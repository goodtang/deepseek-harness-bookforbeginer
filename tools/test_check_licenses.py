# SPDX-License-Identifier: Apache-2.0
"""Verify that unregistered assets and pending permissions cannot silently pass."""

import tempfile
import unittest
from pathlib import Path

from check_licenses import check_assets


class AssetChecks(unittest.TestCase):
    def test_unregistered_asset_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            (root / "figure.svg").write_text("<svg/>", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Unregistered asset"):
                check_assets(root, {"sources": [], "materials": []})

    def test_pending_permission_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            (root / "figure.svg").write_text("<svg/>", encoding="utf-8")
            registry = {"sources": [{"id": "SOURCE"}], "materials": [
                {"path": "figure.svg", "source_id": "SOURCE", "basis": "awaiting confirmation", "status": "pending"}]}
            with self.assertRaisesRegex(ValueError, "Uncleared material"):
                check_assets(root, registry)
            registry["materials"][0].update(status="cleared", basis="independently drawn; source recorded")
            self.assertEqual(check_assets(root, registry), 1)


if __name__ == "__main__":
    unittest.main()
