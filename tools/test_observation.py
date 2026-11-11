# SPDX-License-Identifier: Apache-2.0
"""Reject stale code or mismatched evidence behind the first chapter's observations."""

import hashlib
import json
import re
import unittest
from pathlib import Path


class ObservationEvidence(unittest.TestCase):
    def test_reader_examples_match_captured_results(self):
        root = Path(__file__).resolve().parents[1]
        chapter = (root / "chapters/第01章-一句请求发出去以后.md").read_text(encoding="utf-8")
        run = json.loads((root / "labs/observe-task/evidence/2026-11-11/run-evidence.json").read_text(encoding="utf-8"))
        shown_json = [json.loads(block) for block in re.findall(r"```json\n(.*?)```", chapter, re.S)]
        self.assertIn(json.loads(run["observedToolResult"]["content"][0]["text"]), shown_json)
        shown_text = [block.strip() for block in re.findall(r"```text\n(.*?)```", chapter, re.S)]
        self.assertIn(run["submittedTask"], shown_text)
        self.assertIn(run["terminalStdout"].strip(), shown_text)

    def test_observation_matches_current_code_and_recorded_run(self):
        root = Path(__file__).resolve().parents[1]
        lab = root / "labs/observe-task"
        folder = lab / "evidence/2026-11-11"
        record = json.loads((folder / "observation.json").read_text(encoding="utf-8"))
        digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
        self.assertEqual(record["observerSha256"], digest(lab / "run.mjs"))
        self.assertEqual(record["runEvidenceSha256"], digest(folder / "run-evidence.json"))
        self.assertEqual(record["observationSha256"], digest(folder / "observation.txt"))
        self.assertEqual(record["terminalStdoutSha256"], digest(folder / record["terminalStdout"]))
        run = json.loads((folder / "run-evidence.json").read_text(encoding="utf-8"))
        self.assertEqual(run["sourceCommit"], record["sourceCommit"])
        self.assertTrue(run["passed"])
        self.assertEqual(run["exitCode"], 0)
        self.assertEqual(run["terminalStdout"], (folder / record["terminalStdout"]).read_text(encoding="utf-8"))
        self.assertEqual(run["terminalStdout"], "Ticket lookup completed.\n")
        self.assertEqual(run["observedToolCall"]["input"], {"id": "TK-1042"})
        self.assertEqual(run["observedToolCall"]["id"], run["observedToolResult"]["tool_use_id"])
        self.assertTrue(all(run["cleanup"].values()))
        for name, expected in run["labFiles"].items():
            self.assertEqual(expected, digest(root / "labs/first-tool" / name))


if __name__ == "__main__":
    unittest.main()
