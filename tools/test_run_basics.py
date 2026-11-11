# SPDX-License-Identifier: Apache-2.0
"""Keep chapter-two path and runtime claims tied to versioned evidence."""
import hashlib
import json
import re
import unittest
from pathlib import Path


class RunBasicsEvidence(unittest.TestCase):
    def test_reader_paths_do_not_require_author_directory_layout(self):
        root = Path(__file__).resolve().parents[1]
        for name in ["chapters/第02章-第一次自己运行.md", "labs/run-basics/SETUP.md"]:
            text = (root / name).read_text(encoding="utf-8")
            self.assertNotIn("D:/projects", text)
            self.assertIn("$BookRoot", text)
            self.assertIn("$HarnessRoot", text)
        lab = root / "labs/run-basics"
        run = json.loads((lab / "evidence/2026-11-11-revision/reader-paths.json").read_text(encoding="utf-8"))
        self.assertTrue(run["passed"])
        self.assertEqual(run["exitCode"], 0)
        self.assertTrue(run["junctionsRemoved"])
        self.assertTrue(run["distinctPathRoots"])
        self.assertEqual(run["scriptSha256"], hashlib.sha256((lab / "reader-paths.mjs").read_bytes()).hexdigest())

    def test_revised_reader_examples_have_actual_captures(self):
        root = Path(__file__).resolve().parents[1]
        folder = root / "labs/run-basics/evidence/2026-11-11-revision"
        chapter = (root / "chapters/第02章-第一次自己运行.md").read_text(encoding="utf-8")
        blocks = re.findall(r"```text\n(.*?)```", chapter, re.S)
        preflight = (folder / "preflight-stdout.txt").read_text(encoding="utf-8")
        self.assertTrue(any(block.startswith("Node：") and block in preflight for block in blocks))
        self.assertIn("MODULE_NOT_FOUND", (folder / "wrong-workdir-stderr.txt").read_text(encoding="utf-8"))
        failure = (folder / "wrong-source-stderr.txt").read_text(encoding="utf-8")
        self.assertIn(failure.strip(), [block.strip() for block in blocks])
        paths = json.loads((folder / "path-checks.json").read_text(encoding="utf-8-sig"))
        self.assertTrue(paths["bookRelativePathExists"])
        self.assertFalse(paths["sourceRelativePathExists"])
        record = json.loads((folder / "checks.json").read_text(encoding="utf-8"))
        self.assertTrue(record["passed"])
        for name, expected in record["files"].items():
            self.assertEqual(hashlib.sha256((root / "labs/run-basics" / name).read_bytes()).hexdigest(), expected)
        for case in record["cases"]:
            self.assertEqual(case["observedExitCode"], case["expectedExitCode"])
            if "evidence" in case:
                raw = (folder / case["evidence"]).read_bytes()
                self.assertEqual(hashlib.sha256(raw).hexdigest(), case["sha256"])
                run = json.loads(raw)
                self.assertTrue(run["passed"])
                self.assertTrue(all(run["cleanup"].values()))
                self.assertTrue(any(run["terminalStdout"].strip() in block for block in blocks))

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
