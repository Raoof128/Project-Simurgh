import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import lanes19c  # noqa: E402


class Lanes19cTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="p19c-lanes-")
        cls.addClassCleanup(cls.tmp.cleanup)
        cls.r = lanes19c.run_all(Path(cls.tmp.name) / "a")

    def test_credential_lane(self):
        c = self.r["credential"]
        by = {row["case"]: row for row in c["rows"]}
        self.assertEqual(by["positive_control"]["fork"], "observed")
        self.assertEqual(by["planted_token_other_run"]["fork"], "run")
        self.assertEqual(by["planted_token_other_run"]["frozen"], "observed")
        self.assertEqual(by["other_principal"]["fork"], "scope")
        self.assertEqual(by["other_principal"]["frozen"], "scope")
        self.assertEqual(by["bearer_replay_without_proof"]["fork"], "wrong_binding")
        self.assertEqual(by["bearer_replay_without_proof"]["frozen"], "observed")
        self.assertEqual(by["second_holder"]["fork"], "wrong_binding")
        self.assertEqual(by["write_under_comment_only_grant"]["fork"], "grant_scope")
        self.assertEqual(by["write_under_comment_only_grant"]["frozen"], "request")
        self.assertEqual(c["revoked_retries"]["attempts"], 3)
        self.assertEqual(c["revoked_retries"]["fork_denials"], 3)
        self.assertEqual(c["revoked_retries"]["frozen_denials"], 3)

    def test_manifest_lane(self):
        m = self.r["manifest"]
        by = {row["case"]: row for row in m["rows"]}
        self.assertEqual(by["listed_input"]["fork"], "loaded")
        self.assertEqual(by["regenerated_spec"]["fork"], "substituted_input")
        self.assertEqual(by["edited_config"]["fork"], "substituted_input")
        self.assertEqual(by["vectors_npz_from_run_cache"]["fork"], "substituted_input")
        self.assertEqual(m["frozen"], "no_load_route")

    def test_route_corpus(self):
        rc = self.r["route_corpus"]
        self.assertEqual(rc["denied_canonical"], "/etc/passwd")
        self.assertGreaterEqual(len(rc["variants"]), 6)
        self.assertTrue(all(v["fork"] == "effect_denied" for v in rc["variants"]))
        # case is significant for paths (P19-REPAIR03): the case-fold variant is its own canonical
        for v in rc["variants"]:
            expected = v["resource"] if v["variant"] == "case_fold" else "/etc/passwd"
            self.assertEqual(v["canonical"], expected, v["variant"])
        self.assertTrue(rc["strawman_admits_at_least_one"])
        # P19-REPAIR03: canonicalisation is exercised by aliases of the GRANTED resource
        by = {a["alias"]: a for a in rc["granted_aliases"]}
        self.assertTrue(all(a["holds"] for a in rc["granted_aliases"]), by)
        self.assertEqual(by["case_variant"]["fork"], "effect_denied")
        self.assertEqual(by["parent_traversal"]["fork"], "observed")
        self.assertTrue(
            rc["effects_record_the_canonical_resource"], rc["stored_effect_resources"]
        )
        ab = rc["identity_canonical_ablation"]
        self.assertTrue(ab["canonicalisation_is_load_bearing"], ab)
        self.assertIn("parent_traversal", ab["admitted_aliases_refused_under_identity"])
        self.assertTrue(
            any(v["naive_string_filter_demo"] == "admitted" for v in rc["variants"])
        )
        self.assertEqual(rc["positive_control"]["fork"], "observed")
        self.assertIs(rc["pays_G22"], False)

    def test_cumulative_lane(self):
        cu = self.r["cumulative"]
        self.assertEqual(
            [row["fork"] for row in cu["rows"]],
            ["observed", "observed", "cumulative_limit_exceeded"],
        )
        self.assertEqual(
            [row["frozen"] for row in cu["rows"]], ["observed", "observed", "observed"]
        )

    def test_admin_revoked_lane(self):
        a = self.r["admin_revoked"]
        self.assertEqual(a["before"]["fork"], "observed")
        self.assertEqual(a["after"]["fork"], "admin_revoked")
        self.assertEqual(a["after"]["frozen"], "observed")

    def test_determinism(self):
        again = lanes19c.run_all(Path(self.tmp.name) / "b")
        self.assertEqual(lanes19c.wire(again), lanes19c.wire(self.r))


if __name__ == "__main__":
    unittest.main()
