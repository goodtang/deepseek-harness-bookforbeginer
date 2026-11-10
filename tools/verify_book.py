# SPDX-License-Identifier: Apache-2.0
"""Check local book links and reviewed active-file fingerprints."""

import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def active_files(root):
    files = [root / name for name in ("README.md", "CONTRIBUTING.md", "LICENSE", "COPYRIGHT.md",
                                    "THIRD_PARTY_NOTICES.md", "EDITORIAL.md", "COMMERCIAL.md", ".gitignore", ".gitattributes")]
    for name in ("planning", "templates", "work", "chapters", "labs", "diagrams", "tools", "rights", "LICENSES"):
        files.extend(p for p in (root / name).rglob("*")
                     if p.is_file() and p.suffix in {".md", ".json", ".py", ".txt", ".mjs", ".ts", ".yml", ".yaml"}
                     and not {"__pycache__", ".lab-runtime"}.intersection(p.parts)
                     and p != root / "work/FILES.json")
    return sorted(p for p in files if p.is_file())


def check_markdown(root, path):
    text = path.read_bytes().decode("utf-8")
    if "\ufffd" in text or not text.endswith("\n") or text.endswith("\n\n"):
        raise ValueError(f"Encoding or final newline: {path.relative_to(root)}")
    for target in re.findall(r"\]\(([^)]+)\)", text):
        parsed = urlsplit(target)
        if parsed.scheme or parsed.netloc:
            continue
        destination = (path.parent / unquote(parsed.path)).resolve() if parsed.path else path
        if not destination.is_relative_to(root) or not destination.is_file():
            raise ValueError(f"Broken local link: {path.relative_to(root)} -> {target}")
        if parsed.fragment and destination.suffix == ".md":
            headings = {
                re.sub(r"[^\w\-\s]", "", line.lstrip("#").strip().lower()).replace(" ", "-")
                for line in destination.read_text(encoding="utf-8").splitlines()
                if line.startswith("#")
            }
            if unquote(parsed.fragment) not in headings:
                raise ValueError(f"Missing heading: {path.relative_to(root)} -> {target}")


def snapshot(root):
    return {"kind": "Reviewed active files; excludes frozen archive and this manifest",
            "files": [{"path": p.relative_to(root).as_posix(), "sha256": digest(p)}
                      for p in active_files(root)]}


def verify(root, refresh=False):
    root = root.resolve()
    for path in root.rglob("*.md"):
        if ".git" not in path.relative_to(root).parts:
            check_markdown(root, path)
    manifest = root / "work/FILES.json"
    current = snapshot(root)
    if refresh:
        manifest.write_bytes((json.dumps(current, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    recorded = json.loads(manifest.read_text(encoding="utf-8"))
    if current != recorded:
        raise ValueError("Active files changed. Review the diff before using --refresh.")
    return len(current["files"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="Save fingerprints after reviewing changes")
    args = parser.parse_args()
    active = verify(Path(__file__).resolve().parents[1], args.refresh)
    print(f"Verified local Markdown links, {active} active fingerprints.")
    print("External URLs, runtime behavior and reader acceptance are not verified by this script.")
