# SPDX-License-Identifier: Apache-2.0
"""Keep chapter-two path and runtime claims tied to versioned evidence."""
import hashlib
import json
import unittest
from pathlib import Path


class RunBasicsEvidence(unittest.TestCase):
    def test_recorded_cases_match_scripts_and_real_query_reports(self):
        lab = Path(__file__).resolve().parents[1] / "labs/run-basics"
        folder = lab / "evidence/2026-11-11"
        record = json.loads((folder / "checks.json").read_text(encoding="utf-8"))
        self.assertTrue(record["passed"])
        self.assertEqual(len(record["cases"]), 6)
        for name, expected in record["files"].items():
            self.assertEqual(hashlib.sha256((lab / name).read_bytes()).hexdigest(), expected)
        failures = {row["name"] for row in record["cases"] if row["observedExitCode"] != 0}
        self.assertEqual(failures, {"relative-script-from-wrong-directory", "missing-source-directory"})
        reports = []
        for case in record["cases"]:
            self.assertEqual(case["expectedExitCode"], case["observedExitCode"])
            if "evidence" in case:
                raw = (folder / case["evidence"]).read_bytes()
                self.assertEqual(hashlib.sha256(raw).hexdigest(), case["sha256"])
                run = json.loads(raw)
                self.assertTrue(run["passed"])
                self.assertTrue(all(run["cleanup"].values()))
                self.assertEqual(len(run["requests"]), 2)
                self.assertEqual(run["terminalStdout"], "Ticket lookup completed.\n")
                reports.append(run["observedToolResult"])
        self.assertEqual(len(reports), 2)
        self.assertEqual(reports[0], reports[1])
