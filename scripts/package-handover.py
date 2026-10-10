#!/usr/bin/env python3
"""Package source, offline UI and agent handover without runtime data or secrets.

Python 3 standard library only. Does not install dependencies or run app tests.
Run from any cwd: python scripts/package-handover.py
Verify later: python scripts/package-handover.py --verify path/to/archive.zip
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import sys
import zipfile


ROOT = Path(__file__).resolve().parents[1]
PREFIX = "f5-ai-studio"
ARCHIVE_NAME = "f5-ai-studio-claude-handover.zip"
SOURCE_ITEMS = [
    ".env.example", ".gitignore", ".dockerignore", "Dockerfile",
    "CLAUDE.md", "HANDOVER.md", "README.md", "OPEN-WEBSITE.md",
    "index.html", "package.json", "package-lock.json", "tsconfig.json",
    "vite.config.ts", "src", "server", "scripts", "tests", "public",
    "dist", "website-preview.html", "handover",
]
REQUIRED_DOCS = [
    "handover/AGENT-PROMPT.md", "handover/PRODUCT.md", "handover/DESKTOP.md",
    "handover/TECHNICAL.md", "handover/VALIDATION.md", "handover/EXECUTION.md",
    "handover/CLOUD-ENVIRONMENT.md",
]
GENERATED = {"handover/MANIFEST.json", "handover/SHA256SUMS.txt"}
EVIDENCE = [
    "desktop.png", "tablet.png", "mobile.png", "mobile-small.png",
    "mobile-resource.png", "admin-desktop.png", "admin-mobile.png",
    "portable-desktop-fold.png", "portable-mobile-fold.png",
    "free-download-roadmap.html", "offline-free-download.html",
]
FORBIDDEN_PARTS = {".git", ".data", "node_modules", "__pycache__", ".npm-cache"}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def payload_files() -> list[Path]:
    files = set()
    for item in SOURCE_ITEMS:
        location = ROOT / item
        if not location.exists():
            raise ValueError(f"Required source item missing: {item}")
        candidates = location.rglob("*") if location.is_dir() else [location]
        for path in candidates:
            if path.is_symlink():
                raise ValueError(f"Refusing symlink: {path.relative_to(ROOT)}")
            relative = path.relative_to(ROOT)
            if FORBIDDEN_PARTS.intersection(relative.parts):
                continue
            if path.name == ".env" or path.name.startswith(".env.") and path.name != ".env.example":
                continue
            if path.suffix in {".zip", ".pyc", ".log"} or path.name == "tsconfig.tsbuildinfo":
                # Downloadable resource ZIPs inside server/assets are valid source assets.
                if not (path.suffix == ".zip" and relative.parts[:2] == ("server", "assets")):
                    continue
            if path.is_file() and relative.as_posix() not in GENERATED:
                files.add(path)
    return sorted(files, key=lambda path: path.relative_to(ROOT).as_posix())


def copy_evidence() -> None:
    target = ROOT / "handover/evidence"
    target.mkdir(parents=True, exist_ok=True)
    for name in EVIDENCE:
        source = ROOT / ".playwright" / name
        if source.is_file() and not source.is_symlink():
            shutil.copy2(source, target / name)


def verify(archive: Path) -> None:
    with zipfile.ZipFile(archive) as bundle:
        names = bundle.namelist()
        if len(names) != len(set(names)):
            raise ValueError("Duplicate archive entries")
        for name in names:
            pieces = PurePosixPath(name).parts
            if not pieces or pieces[0] != PREFIX or ".." in pieces or "\\" in name:
                raise ValueError(f"Invalid archive path: {name}")
            if FORBIDDEN_PARTS.intersection(pieces):
                raise ValueError(f"Excluded directory in archive: {name}")
            if pieces[-1] == ".env" or pieces[-1].startswith(".env.") and pieces[-1] != ".env.example":
                raise ValueError(f"Secret env file in archive: {name}")
        if bundle.testzip() is not None:
            raise ValueError("ZIP CRC validation failed")
        manifest = json.loads(bundle.read(f"{PREFIX}/handover/MANIFEST.json"))
        expected_payload = set()
        for entry in manifest["files"]:
            name = f'{PREFIX}/{entry["path"]}'
            expected_payload.add(name)
            data = bundle.read(name)
            if len(data) != entry["bytes"] or digest(data) != entry["sha256"]:
                raise ValueError(f"Manifest mismatch: {name}")
        metadata = {f"{PREFIX}/{item}" for item in GENERATED}
        if set(names) != expected_payload | metadata:
            raise ValueError("Unlisted or missing archive files")
        lines = bundle.read(f"{PREFIX}/handover/SHA256SUMS.txt").decode("utf-8").splitlines()
        checksum_paths = set()
        for line in lines:
            checksum, relative = line.split("  ", 1)
            checksum_paths.add(f"{PREFIX}/{relative}")
            if digest(bundle.read(f"{PREFIX}/{relative}")) != checksum:
                raise ValueError(f"SHA256SUMS mismatch: {relative}")
        expected_sums = expected_payload | {f"{PREFIX}/handover/MANIFEST.json"}
        if checksum_paths != expected_sums:
            raise ValueError("Checksum list incomplete")
    print(f"Verified {len(names)} archive files, manifest, SHA-256 checksums and ZIP CRC.")


def package(output: Path) -> None:
    for relative in REQUIRED_DOCS:
        if not (ROOT / relative).is_file():
            raise ValueError(f"Required handover document missing: {relative}")
    copy_evidence()
    files = payload_files()
    entries = [{
        "path": path.relative_to(ROOT).as_posix(),
        "bytes": path.stat().st_size,
        "sha256": digest(path.read_bytes()),
    } for path in files]
    content = json.loads((ROOT / "server/content.json").read_text(encoding="utf-8"))
    resources = content if isinstance(content, list) else content["resources"]
    package_info = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    manifest = {
        "formatVersion": 1,
        "project": "F5 AI Studio",
        "sourceRepository": "github.com/F5AI/WebProCode",
        "gitStateAtHandover": "unborn branch work; source not committed or pushed",
        "createdAtUTC": datetime.now(timezone.utc).isoformat(),
        "archiveRoot": PREFIX,
        "runtimeRequired": package_info["engines"],
        "validationReport": "handover/VALIDATION.md",
        "packagerRunsApplicationTests": False,
        "publicWebsiteDeployed": False,
        "instructorVideosIncluded": False,
        "gpuRenderVerified": False,
        "portablePreview": "website-preview.html",
        "content": {
            "seedResources": len(resources),
            "uniqueFreeFiles": len(list((ROOT / "server/assets/free").glob("*"))),
            "uniquePremiumFiles": len(list((ROOT / "server/assets/premium").glob("*"))),
        },
        "excluded": [
            ".git and proxy credentials", ".env and secret values", ".data and runtime accounts/uploads",
            "node_modules and dependency caches", "old archives and process state",
        ],
        "integrity": {
            "algorithm": "sha256",
            "filesFieldExcludes": sorted(GENERATED),
            "checksumFile": "handover/SHA256SUMS.txt",
            "checksumFileIncludesManifest": True,
            "checksumFileExcludesItself": True,
        },
        "files": entries,
    }
    manifest_path = ROOT / "handover/MANIFEST.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sum_files = files + [manifest_path]
    sums = [f'{digest(path.read_bytes())}  {path.relative_to(ROOT).as_posix()}' for path in sum_files]
    sums_path = ROOT / "handover/SHA256SUMS.txt"
    sums_path.write_text("\n".join(sums) + "\n", encoding="utf-8")
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as bundle:
        for path in files + [manifest_path, sums_path]:
            bundle.write(path, f'{PREFIX}/{path.relative_to(ROOT).as_posix()}')
    output.chmod(0o644)
    verify(output)
    checksum = digest(output.read_bytes())
    output.with_suffix(output.suffix + ".sha256").write_text(f"{checksum}  {output.name}\n", encoding="utf-8")
    print(f"Created {output} ({output.stat().st_size:,} bytes).")
    print(f"Archive SHA-256: {checksum}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / ARCHIVE_NAME)
    parser.add_argument("--verify", type=Path, help="Verify an existing archive instead of packaging")
    args = parser.parse_args()
    try:
        if args.verify:
            verify(args.verify.resolve())
        else:
            package(args.output.resolve())
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        print(f"Handover packaging failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
