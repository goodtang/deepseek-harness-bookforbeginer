# SPDX-License-Identifier: Apache-2.0
"""Reject stale code or mismatched evidence behind the first chapter's observations."""

import hashlib
import json
import unittest
from pathlib import Path


class ObservationEvidence(unittest.TestCase):
    def test_observation_matches_current_code_and_recorded_run(self):
        root = Path(__file__).resolve().parents[1]
        lab = root / "labs/observe-task"
        folder = lab / "evidence"
        record = json.loads((folder / "observation.json").read_text(encoding="utf-8"))
        digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
        self.assertEqual(record["observerSha256"], digest(lab / "run.mjs"))
        self.assertEqual(record["runEvidenceSha256"], digest(folder / "run-evidence.json"))
        self.assertEqual(record["observationSha256"], digest(folder / "observation.txt"))
        run = json.loads((folder / "run-evidence.json").read_text(encoding="utf-8"))
        self.assertEqual(run["sourceCommit"], record["sourceCommit"])
        self.assertTrue(run["passed"])
        self.assertEqual(run["exitCode"], 0)
        self.assertTrue(all(run["cleanup"].values()))
        for name, expected in run["labFiles"].items():
            self.assertEqual(expected, digest(root / "labs/first-tool" / name))


if __name__ == "__main__":
    unittest.main()
