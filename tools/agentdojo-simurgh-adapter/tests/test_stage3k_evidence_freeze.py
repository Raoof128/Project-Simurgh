# SPDX-License-Identifier: AGPL-3.0-or-later
from simurgh_agentdojo_adapter.evidence_writer import write_json_artifacts
from simurgh_agentdojo_adapter.stage3k_catalogue import build_catalogue_artifacts


def test_catalogue_artifacts_are_metadata_only(tmp_path):
    artifacts = build_catalogue_artifacts()
    assert set(artifacts) == {"mutation-operators.json", "action-open-categories.json"}
    assert len(artifacts["mutation-operators.json"]["operators"]) == 10
    assert len(artifacts["action-open-categories.json"]["categories"]) == 5
    # write_json_artifacts raises EvidenceLeakage if any forbidden key appears
    write_json_artifacts(tmp_path, artifacts)
    text = (tmp_path / "mutation-operators.json").read_text()
    assert "transcript" not in text
    assert "raw" not in text.lower()
