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
