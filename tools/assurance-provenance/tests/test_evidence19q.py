"""Lane 19q evidence pack: build, verify by structure, verify against the dataset, and refuse
packs and datasets that were changed. Synthetic sessions only (P19-DEST01)."""

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import dest19q as d  # noqa: E402
import evidence19q as ev  # noqa: E402
import projection  # noqa: E402
from test_dest19q import INVENTED, NAMED, blob, synthetic_dataset  # noqa: E402


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {name: z.read(name) for name in z.namelist() if name != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19q-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


def edit_report(change):
    def mutate(files):
        report = json.loads(files["report.json"])
        change(report)
        files["report.json"] = projection.wire(report)

    return mutate


class Evidence19qTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19q-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.dataset = synthetic_dataset(Path(cls.temp.name) / "dataset")
        cls.out = Path(cls.temp.name) / "out"
        cls.receipt = ev.run(cls.out, cls.dataset, decrypt=bytes)
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"
        cls.pack = cls.out / "evidence.zip"

    def verify(self, pack=None, root=None, **kw):
        return ev.verify(
            pack or self.pack, root or self.root, protocol=self.proto, **kw
        )

    def refused(self, change, reason, **kw):
        pack, root = repack(self.pack, change)
        with self.assertRaises(ValueError) as caught:
            self.verify(pack, root, **kw)
        self.assertEqual(str(caught.exception).split(":")[0], reason)

    def test_run_writes_a_pack_that_verifies_against_the_dataset(self):
        r = self.receipt
        self.assertTrue(r["verified"])
        self.assertEqual(r["kind"], "dataset_recomputed")
        self.assertEqual(r["recompute"], {"result": "verified"})
        self.assertEqual((r["pairs"], r["excluded"]), (4, 1))
        self.assertEqual(
            r["primary"],
            {
                "reading": "strict",
                "rule": "P",
                "attack_flagged": 3,
                "benign_flagged": 2,
                "paired": {"attack_only": 1, "both": 2, "benign_only": 0, "neither": 1},
            },
        )
        self.assertEqual(r["manifest_sha256"], self.root)
        self.assertIs(r["model_inference"], False)
        self.assertIs(r["independent_custody"], False)
        self.assertEqual(r["dataset_commit"], d.DATASET_COMMIT)
        self.assertEqual(set(r["hypotheses"]), {"Q1", "Q2", "Q3"})
        self.assertEqual(
            sorted(p.name for p in self.out.iterdir()),
            [
                "ROOT.sha256",
                "evidence.zip",
                "protocol.json",
                "receipt.json",
                "report.json",
            ],
        )

    def test_without_the_dataset_verify_checks_structure_and_says_so(self):
        r = self.verify()
        self.assertEqual(r["kind"], "structure_checked")
        self.assertEqual(r["recompute"], {"result": "not_run", "reason": "no_dataset"})
        self.assertEqual(r["primary"], self.receipt["primary"])

    def test_with_the_dataset_verify_recomputes_every_row(self):
        r = self.verify(dataset=self.dataset, decrypt=bytes)
        self.assertEqual(r["kind"], "dataset_recomputed")

    def test_no_destination_text_is_in_the_pack_or_beside_it(self):
        for path in self.out.iterdir():
            raw = path.read_bytes()
            with self.subTest(path.name):
                if path.suffix == ".zip":
                    with zipfile.ZipFile(path) as z:
                        raw = b"".join(z.read(n) for n in z.namelist())
                for needle in (b"my-own-store", b"team-backups", b"dr.example.net"):
                    self.assertNotIn(needle, raw)

    def test_a_wrong_root_is_refused(self):
        with self.assertRaises(ValueError):
            self.verify(root="0" * 64)

    def test_a_changed_flag_is_refused(self):
        def change(report):
            report["rows"][0]["flags"]["strict"]["P"] = False

        self.refused(edit_report(change), "row_flags")

    def test_a_changed_origin_is_refused_unless_everything_downstream_is_redone(self):
        def change(report):
            report["rows"][0]["tokens"][0]["origin"] = "principal"

        self.refused(edit_report(change), "row_flags")

        def change_all(files):
            report = json.loads(files["report.json"])
            report["rows"][0]["tokens"][0]["origin"] = "principal"
            report["rows"][0]["flags"] = d.flags(report["rows"][0]["tokens"])
            report["summary"] = d.summarise(report["rows"])
            report["hypotheses"] = d.hypotheses(report["rows"])
            files["report.json"] = projection.wire(report)
            files["summary.json"] = projection.wire(report["summary"])
            files["hypotheses.json"] = projection.wire(report["hypotheses"])

        # consistent with itself, so structure alone cannot tell; the dataset can
        pack, root = repack(self.pack, change_all)
        self.assertEqual(self.verify(pack, root)["kind"], "structure_checked")
        with self.assertRaises(ValueError) as caught:
            self.verify(pack, root, dataset=self.dataset, decrypt=bytes)
        self.assertEqual(str(caught.exception), "report_mismatch")

    def test_a_changed_summary_or_hypothesis_is_refused(self):
        def summary(report):
            report["summary"]["cells"]["strict"]["P"]["attack_flagged"] += 1

        self.refused(edit_report(summary), "summary_mismatch")

        def hypothesis(report):
            report["hypotheses"]["Q2"]["holds"] = False

        self.refused(edit_report(hypothesis), "hypotheses_mismatch")

    def test_a_row_cannot_carry_an_extra_field(self):
        def change(report):
            report["rows"][0]["note"] = "s3://my-own-store"

        self.refused(edit_report(change), "row_shape")

        def token(report):
            report["rows"][0]["tokens"][0]["token"] = "s3://my-own-store"

        self.refused(edit_report(token), "row_shape")

    def test_ids_sessions_and_use_flags_are_checked(self):
        def bad_id(report):
            report["rows"][0]["tokens"][0]["id"] = "s3://my-own-stor"

        self.refused(edit_report(bad_id), "row_shape")

        def bad_session(report):
            for row in report["rows"][:2]:
                row["session"] = row["category"] + "/a name with words in it"

        self.refused(edit_report(bad_session), "row_shape")

        def strict_without_lenient(report):
            report["rows"][0]["tokens"][0]["used_lenient"] = False

        self.refused(edit_report(strict_without_lenient), "row_shape")

        def category(report):
            report["rows"][0]["category"] = "model_priors"

        self.refused(edit_report(category), "row_shape")

    def test_counts_origins_and_repeats_are_checked(self):
        def calls(report):
            report["rows"][0]["tool_calls"] = report["rows"][0]["blocks"] + 1

        self.refused(edit_report(calls), "row_shape")

        def origin(report):
            report["rows"][0]["tokens"][0]["origin"] = "elsewhere"

        self.refused(edit_report(origin), "row_shape")

        def repeated_token(report):
            report["rows"][0]["tokens"].append(dict(report["rows"][0]["tokens"][0]))

        self.refused(edit_report(repeated_token), "row_shape")

        def repeated_rows(report):
            report["rows"].extend(json.loads(json.dumps(report["rows"][:2])))

        self.refused(edit_report(repeated_rows), "row_shape")

    def test_a_missing_row_is_refused(self):
        def change(report):
            del report["rows"][1]

        self.refused(edit_report(change), "unpaired_session")

    def test_the_pack_inventory_is_fixed(self):
        def extra(files):
            files["notes.txt"] = b"hello"

        self.refused(extra, "pack_inventory")

        def sidecar(files):
            files["summary.json"] = projection.wire({"pairs": 0})

        self.refused(sidecar, "sidecar_member_mismatch")

    def test_the_report_is_bound_to_the_protocol_and_the_protocol_to_the_blobs(self):
        def change(report):
            report["protocol_sha256"] = "0" * 64

        self.refused(edit_report(change), "protocol_binding")

        def inputs(report):
            report["inputs"]["commit"] = "0" * 40

        self.refused(edit_report(inputs), "input_binding")

    def test_a_changed_dataset_is_refused(self):
        other = synthetic_dataset(
            Path(tempfile.mkdtemp(prefix="p19q-ds2-")) / "dataset"
        )
        target = other / "attacks/authorization_confusion/invented/encrypted.bin"
        target.write_bytes(
            blob({"transcript.jsonl": NAMED, "benign.jsonl": INVENTED, "x": b""})
        )
        with self.assertRaises(ValueError) as caught:
            self.verify(dataset=other, decrypt=bytes)
        self.assertEqual(str(caught.exception), "dataset_binding")

    def test_a_changed_source_is_refused(self):
        proto = json.loads(self.proto.read_text())
        name = next(n for n in proto["sources"] if n.endswith("dest19q.py"))
        proto["sources"][name] = "0" * 64
        other = Path(tempfile.mkdtemp(prefix="p19q-proto-")) / "protocol.json"
        other.write_bytes(projection.wire(proto))
        with self.assertRaises(ValueError) as caught:
            ev.verify(self.pack, self.root, protocol=other)
        self.assertEqual(str(caught.exception).split(":")[0], "source_binding")

    def test_a_protocol_with_another_commit_or_another_source_list_is_refused(self):
        def refused(change):
            proto = json.loads(self.proto.read_text())
            change(proto)
            other = Path(tempfile.mkdtemp(prefix="p19q-proto-")) / "protocol.json"
            other.write_bytes(projection.wire(proto))
            with self.assertRaises(ValueError) as caught:
                ev.verify(self.pack, self.root, protocol=other)
            self.assertEqual(str(caught.exception), "protocol_inventory")

        refused(lambda p: p["inputs"].update(commit="0" * 40))
        refused(lambda p: p["sources"].pop(sorted(p["sources"])[0]))
        refused(lambda p: p.update(q1_need=1))

    def test_the_protocol_names_the_dataset_its_commit_and_every_blob(self):
        proto = json.loads(self.proto.read_text())
        self.assertEqual(proto["inputs"]["commit"], d.DATASET_COMMIT)
        self.assertEqual(proto["inputs"]["dataset"], d.DATASET)
        self.assertEqual(len(proto["inputs"]["blobs"]), 5)
        self.assertEqual(proto["inputs"]["excluded"], ["refusal_forcing/no-twin"])
        self.assertIs(proto["model_inference"], False)
        self.assertEqual(
            set(proto["sources"]),
            {
                "tools/assurance-provenance/" + n
                for n in (
                    "dest19q.py",
                    "evidence19q.py",
                    "projection.py",
                    "tests/test_dest19q.py",
                    "tests/test_evidence19q.py",
                )
            },
        )

    def test_run_refuses_an_existing_directory_before_it_writes_anything(self):
        other = synthetic_dataset(
            Path(tempfile.mkdtemp(prefix="p19q-ds3-")) / "dataset"
        )
        (other / "attacks/model_priors/supplied/encrypted.bin").write_bytes(
            blob({"transcript.jsonl": NAMED, "benign.jsonl": NAMED})
        )
        before = (self.out / "report.json").read_bytes()
        with self.assertRaises(FileExistsError):
            ev.run(self.out, other, decrypt=bytes)
        self.assertEqual((self.out / "report.json").read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
