# SPDX-License-Identifier: Apache-2.0
"""Focused regression checks for broken links and unreviewed file changes."""

import tempfile
import unittest
from pathlib import Path

from verify_book import active_files, check_markdown, verify


class BookChecks(unittest.TestCase):
    def test_lab_code_is_fingerprinted_but_local_runs_are_excluded(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            lab = root / "labs" / "first-tool"
            runtime = lab / ".lab-runtime"
            runtime.mkdir(parents=True)
            code = lab / "plugin.mjs"
            code.write_text("export const name = 'example';\n", encoding="utf-8")
            evidence = runtime / "evidence.json"
            evidence.write_text("{}\n", encoding="utf-8")
            self.assertIn(code, active_files(root))
            self.assertNotIn(evidence, active_files(root))

    def test_local_heading_and_missing_target(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            page = root / "README.md"
            page.write_text("# 开始\n\n[入口](#开始)\n", encoding="utf-8")
            check_markdown(root, page)
            page.write_text("# 开始\n\n[入口](missing.md)\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Broken local link"):
                check_markdown(root, page)

    def test_reviewed_fingerprint_rejects_mutation(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            (root / "work").mkdir()
            page = root / "README.md"
            page.write_text("# 初版\n", encoding="utf-8")
            verify(root, refresh=True)
            verify(root)
            page.write_text("# 改动\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Active files changed"):
                verify(root)


if __name__ == "__main__":
    unittest.main()
