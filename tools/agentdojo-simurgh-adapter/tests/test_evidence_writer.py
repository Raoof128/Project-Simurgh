# SPDX-License-Identifier: AGPL-3.0-or-later
import json
import pytest
from simurgh_agentdojo_adapter.evidence_writer import write_evidence, EvidenceLeakage


def test_writes_metadata_only(tmp_path):
    write_evidence(str(tmp_path), {"stage": "3H", "over_defence_rate": "0/10"})
    data = json.loads((tmp_path / "metrics.json").read_text())
    assert data["stage"] == "3H"


def test_rejects_forbidden_key(tmp_path):
    with pytest.raises(EvidenceLeakage):
        write_evidence(str(tmp_path), {"stage": "3H", "api_key": "secret"})


def test_writes_named_layer2_artifacts(tmp_path):
    from simurgh_agentdojo_adapter.evidence_writer import write_json_artifacts

    write_json_artifacts(str(tmp_path), {"run-manifest.json": {"stage": "3H-L2"}})
    data = json.loads((tmp_path / "run-manifest.json").read_text())
    assert data["stage"] == "3H-L2"


def test_named_artifacts_reject_transcript_key(tmp_path):
    from simurgh_agentdojo_adapter.evidence_writer import write_json_artifacts

    with pytest.raises(EvidenceLeakage):
        write_json_artifacts(str(tmp_path), {"agentdojo-native-results.json": {"transcript": []}})
