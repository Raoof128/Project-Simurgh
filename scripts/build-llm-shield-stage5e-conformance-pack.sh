#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Build the self-contained Stage 5E independent conformance ZIP from tracked inputs.
set -euo pipefail

cd "$(dirname "$0")/.."

command -v zip >/dev/null 2>&1 || { echo "ERROR: zip is required to build the pack." >&2; exit 2; }

output=${1:-simurgh-vda-conformance.zip}
case "$output" in
  *.zip) ;;
  *) echo "ERROR: output path must end in .zip" >&2; exit 2 ;;
esac

output_dir=$(dirname "$output")
mkdir -p "$output_dir"
output_dir=$(cd "$output_dir" && pwd -P)
output_path="$output_dir/$(basename "$output")"

stage_parent=$(mktemp -d "${TMPDIR:-/tmp}/simurgh-vda-pack.XXXXXX")
trap 'rm -rf "$stage_parent"' EXIT
pack_root="$stage_parent/simurgh-vda-conformance"
mkdir -p "$pack_root"

copy_path() {
  local source=$1
  if [[ ! -e "$source" ]]; then
    echo "ERROR: required pack input is missing: $source" >&2
    exit 2
  fi
  mkdir -p "$pack_root/$(dirname "$source")"
  cp -R "$source" "$pack_root/$source"
}

# Keep this manifest explicit: an exported test must never retain a hidden repository dependency.
pack_inputs=(
  tools/simurgh-attestation/stage4h/exitCodes.mjs
  tools/simurgh-attestation/stage4m/core/canonical.mjs
  tools/simurgh-attestation/stage5e/constants.mjs
  tools/simurgh-attestation/stage5e/core
  tools/simurgh-attestation/stage5e/python
  tools/simurgh-attestation/stage5e/node
  tools/simurgh-attestation/stage5e/laneb
  tools/simurgh-attestation/stage5e/lanec
  proofs/stage5e
  docs/research/llm-shield/evidence/stage-5e
  tests/fixtures/llmShield/stage5e/test-keys/INSECURE_FIXTURE_ONLY_stage-vda.pem
  tests/e2e/llmShield/stage5e/k7AllFunctions.test.js
  tests/unit/llmShield/stage5e/_validBundle.mjs
  tests/unit/llmShield/stage5e/byoAdapter.test.js
  tests/unit/llmShield/stage5e/claim.test.js
  tests/unit/llmShield/stage5e/constants.test.js
  tests/unit/llmShield/stage5e/corpus.test.js
  tests/unit/llmShield/stage5e/curve.test.js
  tests/unit/llmShield/stage5e/detector.test.js
  tests/unit/llmShield/stage5e/exitCodes.test.js
  tests/unit/llmShield/stage5e/greenBundle.test.js
  tests/unit/llmShield/stage5e/recipes.test.js
  tests/unit/llmShield/stage5e/slip.test.js
  tests/unit/llmShield/stage5e/vdaCore.test.js
  scripts/reproduce-llm-shield-stage5e.sh
)

for source in "${pack_inputs[@]}"; do
  copy_path "$source"
done

assets=tools/simurgh-attestation/stage5e/conformance-pack
cp "$assets/README.md" "$pack_root/README.md"
cp "$assets/DROPLET_SETUP.md" "$pack_root/DROPLET_SETUP.md"
cp "$assets/run.sh" "$pack_root/run.sh"
chmod 755 "$pack_root/run.sh" "$pack_root/scripts/reproduce-llm-shield-stage5e.sh"

rm -f "$output_path"
(
  cd "$stage_parent"
  COPYFILE_DISABLE=1 zip -X -q -r "$output_path" simurgh-vda-conformance
)

echo "Built: $output_path"

