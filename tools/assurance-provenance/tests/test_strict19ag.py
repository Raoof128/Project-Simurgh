"""The stricter check beside lane 19ag's pinned verifier (P19-GUARD02).

Both tools are run as commands, the way an operator runs them. Two of the lane's seat files
nest bodies about 1,486 levels deep, which the JSON reader of Python 3.12.0 to 3.12.2 can
read from the command line and not always from inside a test runner.
"""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

DOCS = HERE.parents[1] / "docs/research/provenance-phase-19ag"

# Run in a fresh interpreter: repack the committed pack with one change to its report, the
# sidecars recomputed so that the pinned verifier's own checks still pass, and print the new
# root.
REPACK = """
import json, sys
sys.path.insert(0, sys.argv[1])
import evidence19ag as ev
from projection import loads, read_pack, wire, write_pack
pack, root, out, change = sys.argv[2:6]
files = dict(read_pack(pack, root))
report = loads(files["report.json"])
if change == "non_claims":
    report["non_claims"] = []
elif change == "arm":
    report["arm"] = "something_else"
    report["model_inference"] = True
elif change == "flag":
    report["model_inference"] = True
elif change == "extra":
    report["added_later"] = "a field the lane never declared"
raw = wire(report)
if change == "twice":
    # the same value, with its first key written twice: a reader keeps the last
    text = raw.decode()
    assert text.startswith('{"arm":"' + ev.ARM + '",')
    raw = ('{"arm":"something_else",' + text[1:]).encode()
    assert json.loads(raw) == report
elif change == "spaced":
    raw = json.dumps(report, indent=2).encode()
files["report.json"] = raw
for name, project in ev.SIDECARS.items():
    files[name] = wire(project(report))
if change == "sidecar":
    # a sidecar with its first key written twice, the first time with another value
    name = "hypotheses.json"
    text = files[name].decode()
    first = text[1 : text.index(":")]
    files[name] = ("{" + first + ':"something_else",' + text[1:]).encode()
    assert json.loads(files[name]) == loads(wire(ev.SIDECARS[name](report)))
print(write_pack(out, files))
"""


def run(tool, pack, root):
    return subprocess.run(
        [
            sys.executable,
            "-B",
            str(HERE / tool),
            *(["verify"] if tool == "evidence19ag.py" else []),
            str(pack),
            "--expected-root",
            root,
        ],
        capture_output=True,
        text=True,
        cwd=HERE,
    )


class StrictTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = (DOCS / "ROOT.sha256").read_text().strip()
        cls.pack = DOCS / "evidence.zip"
        cls.tmp = Path(tempfile.mkdtemp(prefix="p19ag-strict-"))

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def repacked(self, change):
        out = self.tmp / f"{change}.zip"
        done = subprocess.run(
            [
                sys.executable,
                "-B",
                "-c",
                REPACK,
                str(HERE),
                str(self.pack),
                self.root,
                str(out),
                change,
            ],
            capture_output=True,
            text=True,
            cwd=HERE,
        )
        self.assertEqual(done.returncode, 0, done.stderr[-400:])
        return out, done.stdout.strip()

    def test_the_committed_pack_passes_and_the_receipt_is_the_verifiers(self):
        strict = run("strict19ag.py", self.pack, self.root)
        self.assertEqual(strict.returncode, 0, strict.stderr[-400:])
        plain = run("evidence19ag.py", self.pack, self.root)
        self.assertEqual(plain.returncode, 0, plain.stderr[-400:])
        got, base = json.loads(strict.stdout), json.loads(plain.stdout)
        self.assertEqual(got.pop("report_fields"), "compared")
        self.assertEqual(got, base)
        self.assertEqual(base["kind"], "structure_checked")

    def test_a_copy_with_a_changed_field_passes_the_verifier_and_not_this(self):
        for change, reason in (
            ("non_claims", "report_field:non_claims"),
            ("arm", "report_field:arm"),
            # the flag alone (P19-GUARD02, amendment 1): the copy above changes it with the arm
            ("flag", "report_field:model_inference"),
            ("extra", "report_fields"),
            # the same report in bytes that are not the lane's canonical form
            ("twice", "report_bytes"),
            ("spaced", "report_bytes"),
            # and a sidecar in such bytes (amendment 2)
            ("sidecar", "sidecar_bytes:hypotheses.json"),
        ):
            pack, root = self.repacked(change)
            self.assertNotEqual(root, self.root, change)
            # the gap, shown: under its own root the pinned verifier accepts the copy
            plain = run("evidence19ag.py", pack, root)
            self.assertEqual(plain.returncode, 0, (change, plain.stderr[-300:]))
            self.assertEqual(
                json.loads(plain.stdout)["kind"], "structure_checked", change
            )
            strict = run("strict19ag.py", pack, root)
            self.assertNotEqual(strict.returncode, 0, change)
            self.assertIn(reason, strict.stderr, change)
            self.assertNotIn("Traceback", strict.stderr, change)
            # and the committed root refuses the copy in both
            self.assertNotEqual(
                run("evidence19ag.py", pack, self.root).returncode, 0, change
            )
            self.assertNotEqual(
                run("strict19ag.py", pack, self.root).returncode, 0, change
            )

    def test_what_the_verifier_refuses_this_refuses_too(self):
        bad = self.tmp / "not-a-pack.zip"
        bad.write_bytes(b"not a zip")
        strict = run("strict19ag.py", bad, self.root)
        self.assertNotEqual(strict.returncode, 0)
        self.assertNotIn("Traceback", strict.stderr)


if __name__ == "__main__":
    unittest.main()
