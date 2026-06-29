import argparse
import json
from pathlib import Path

from stage4g.library import build_library_manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture-root", default="stage4e/fixtures")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    manifest = build_library_manifest(Path(args.fixture_root))
    Path(args.out).write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")


if __name__ == "__main__":
    main()
