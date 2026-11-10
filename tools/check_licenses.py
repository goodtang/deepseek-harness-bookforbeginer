# SPDX-License-Identifier: Apache-2.0
"""Check recorded license texts and asset records; not a legal clearance engine."""

import hashlib
import json
from pathlib import Path


ASSET_SUFFIXES = {".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf",
                  ".woff", ".woff2", ".ttf", ".otf", ".mp4", ".mp3", ".wav"}


def check_text_policy(policy, baseline):
    if policy.get("new_text_license") != "CC-BY-NC-SA-4.0":
        raise ValueError("Missing prospective text license")
    if policy.get("previous_grants_preserved") is not True:
        raise ValueError("Previous license grants must be preserved")
    if policy.get("effective_after_commit") != baseline.get("baseline_commit"):
        raise ValueError("Text license baseline mismatch")
    if not baseline.get("files") or not baseline.get("previous_license_scope_url"):
        raise ValueError("Missing prior publication record")


def check_assets(root, registry):
    sources = {row["id"] for row in registry["sources"]}
    materials = {}
    for row in registry["materials"]:
        path = (root / row["path"]).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            raise ValueError(f"Invalid material path: {row['path']}")
        if row["path"] in materials:
            raise ValueError(f"Duplicate material: {row['path']}")
        if row.get("source_id") not in sources or not row.get("basis") or row.get("status") != "cleared":
            raise ValueError(f"Uncleared material: {row['path']}")
        materials[row["path"]] = row
    for path in root.rglob("*"):
        if ".git" in path.relative_to(root).parts or not path.is_file():
            continue
        if path.suffix.lower() in ASSET_SUFFIXES and path.relative_to(root).as_posix() not in materials:
            raise ValueError(f"Unregistered asset: {path.relative_to(root)}")
    return len(materials)


def check(root):
    root = root.resolve()
    for name in ("LICENSE", "COPYRIGHT.md", "THIRD_PARTY_NOTICES.md", "EDITORIAL.md", "COMMERCIAL.md", "rights/README.md"):
        if not (root / name).is_file():
            raise ValueError(f"Missing rights document: {name}")
    registry = json.loads((root / "rights/sources.json").read_text(encoding="utf-8"))
    ids = [row["id"] for row in registry["sources"]]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate source ID")
    for row in registry["sources"]:
        if not all(row.get(key) for key in ("id", "title", "creator", "url", "license", "use")):
            raise ValueError(f"Incomplete source: {row.get('id')}")
    licenses = {row["id"] for row in registry["licenses"]}
    if not {"Apache-2.0", "CC-BY-4.0", "CC-BY-NC-SA-4.0", "MIT-DeepSeek"} <= licenses:
        raise ValueError("Required license text is missing")
    for row in registry["licenses"]:
        path = (root / row["path"]).resolve()
        if not path.is_relative_to(root) or hashlib.sha256(path.read_bytes()).hexdigest() != row["sha256"]:
            raise ValueError(f"License checksum mismatch: {row['id']}")
    prior = json.loads((root / "rights/prior-publication.json").read_text(encoding="utf-8"))
    check_text_policy(registry.get("text_policy", {}), prior)
    mit = (root / "LICENSES/MIT-DeepSeek.txt").read_text(encoding="utf-8")
    if "Copyright (c) 2026 DeepSeek" not in mit or "permission notice shall be included" not in mit:
        raise ValueError("DeepSeek copyright/permission notice is missing")
    for path in (root / "tools").glob("*.py"):
        if not path.read_text(encoding="utf-8").startswith("# SPDX-License-Identifier: Apache-2.0\n"):
            raise ValueError(f"Missing code license marker: {path.name}")
    return len(registry["sources"]), check_assets(root, registry)


if __name__ == "__main__":
    sources, materials = check(Path(__file__).resolve().parents[1])
    print(f"Verified license texts/notices, {sources} source records and {materials} registered assets.")
    print("Human review of third-party rights, quotation conditions and publication rules is still required.")
