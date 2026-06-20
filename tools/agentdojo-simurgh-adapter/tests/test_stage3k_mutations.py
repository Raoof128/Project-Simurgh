# SPDX-License-Identifier: AGPL-3.0-or-later
import json

import pytest

from simurgh_agentdojo_adapter.stage3k_mutations import (
    OPERATORS,
    build_mutation_manifest,
    generate_mutation_set,
    generate_variant,
    operator_catalogue,
)


def test_operator_catalogue_has_ten_spec_operators():
    assert len(OPERATORS) == 10
    cat = operator_catalogue()
    assert cat[0]["operator_id"] == sorted(OPERATORS)[0]
    assert all(set(e) == {"operator_id", "purpose"} for e in cat)


def test_variant_is_metadata_only_and_deterministic():
    v1 = generate_variant(
        source_case_id="user_task_3::injection_task_1",
        operator_id="data_camouflage",
        operator_params={"position": "mid"},
    )
    v2 = generate_variant(
        source_case_id="user_task_3::injection_task_1",
        operator_id="data_camouflage",
        operator_params={"position": "mid"},
    )
    assert v1 == v2  # deterministic
    assert set(v1) == {"variant_hash", "source_case_hash", "operator_id", "operator_params_hash"}
    text = json.dumps(v1, sort_keys=True)
    assert "user_task_" not in text
    assert "injection_task_" not in text


def test_unknown_operator_rejected():
    with pytest.raises(ValueError):
        generate_variant(source_case_id="x", operator_id="nope", operator_params={})


def test_mutation_set_and_manifest_counts():
    variants = generate_mutation_set(
        source_case_ids=["user_task_0::injection_task_0", "user_task_1::injection_task_0"],
        operators=["data_camouflage", "format_shift"],
        params_by_operator={"data_camouflage": {"position": "mid"}, "format_shift": {"fmt": "json"}},
    )
    assert len(variants) == 4  # 2 sources x 2 operators
    m = build_mutation_manifest(variants, seed=1337)
    assert m["stage"] == "3K"
    assert m["seed"] == 1337
    assert m["mutation_variant_count"] == 4
    assert m["operator_coverage"] == ["data_camouflage", "format_shift"]
    assert len(m["entries"]) == 4
    assert all(
        set(e) == {"variant_hash", "source_case_hash", "operator_id", "operator_params_hash"}
        for e in m["entries"]
    )
    text = json.dumps(m, sort_keys=True)
    assert "user_task_" not in text
    assert "injection_task_" not in text


def test_manifest_rejects_malformed_entry():
    bad = {"variant_hash": "deadbeef", "source_case_hash": "x", "operator_id": "data_camouflage",
           "operator_params_hash": "y", "extra": 1}
    with pytest.raises(ValueError):
        build_mutation_manifest([bad], seed=1)


def test_manifest_rejects_non_sha256_hash():
    bad = {"variant_hash": "short", "source_case_hash": "a" * 64,
           "operator_id": "data_camouflage", "operator_params_hash": "b" * 64}
    with pytest.raises(ValueError):
        build_mutation_manifest([bad], seed=1)


def test_manifest_rejects_well_formed_entry_with_unknown_operator():
    bad = {"variant_hash": "a" * 64, "source_case_hash": "b" * 64,
           "operator_id": "not_a_real_operator", "operator_params_hash": "c" * 64}
    with pytest.raises(ValueError):
        build_mutation_manifest([bad], seed=1)
