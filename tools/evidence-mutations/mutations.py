"""Deliberate mutations of the retained evidence, each with the reason the verifier must give.

Ports the ten checks recorded in `docs/research/transfer-phase-17/validation-logs.zip`
(`mutation_checks.py`, `mutations.log`) into a tool that runs from any checkout. Those ten pass
`replay=False`: they exercise the structural validators, not the fresh replay. The re-signed role
archive below covers what they could not: a report value flipped with its manifest entry and
root recomputed passes every hash check by construction, so only the replay can reject it. The
replay needs the worker's Linux x86_64 seccomp filter; see `tools/replay-preflight`.

Nothing here edits a pinned source or an archive on disk. Mutations are applied to in-memory
copies, and the re-signed archive is written to a caller-supplied directory.
"""

import copy
import hashlib
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-transfer"))
sys.path.insert(0, str(ROOT / "tools/assurance-provider-role"))
from transfer_study import read_pack, verify_comparison, verify_files  # noqa: E402
from transfer_deps import loads, wire, write_pack  # noqa: E402
from corrected_roles import verify as role_verify  # noqa: E402

TRANSFER = ROOT / "docs/research/transfer-phase-17"
ROLES = ROOT / "docs/research/provider-role-phase-17b"


def expected_root(directory):
    return (directory / "ROOT.sha256").read_text().strip()


def load_transfer():
    files = read_pack(TRANSFER / "evidence.zip", expected_root(TRANSFER))
    cap = loads(files["llama.json"])
    raw = {n[len("llama/") :]: v for n, v in files.items() if n.startswith("llama/")}
    return files, cap, raw


def load_roles():
    return read_pack(ROLES / "evidence.zip", expected_root(ROLES))


def duplicate_generation(c):
    c["generations"][1] = copy.deepcopy(c["generations"][0])


def changed_report(r):
    r["models"]["llama"]["controls"]["composed"]["active_completions"] = 24


def erased_budget_reservation(f):
    ledger = [loads(x) for x in f["budget.jsonl"].splitlines()]
    ledger[0]["reserved_usd"] = "0"
    f["budget.jsonl"] = b"".join(wire(x) for x in ledger)


def changed_original_ledger(f):
    f["original-budget.jsonl"] += b"\n"


def downgraded_host_role(f):
    c = loads(f["capture.json"])
    c["rows"][0]["first"]["request"]["input"][1]["role"] = "user"
    f["capture.json"] = wire(c)


def duplicate_corrected_workflow(f):
    c = loads(f["capture.json"])
    c["rows"][1] = copy.deepcopy(c["rows"][0])
    f["capture.json"] = wire(c)


# (name, target, mutate, expected reason). Targets: a deep copy of the llama capture, verified
# with verify_comparison(cap, raw, replay=False); the transfer file dict, verified with
# verify_files(files, replay=False); or the role file dict, verified with corrected_roles.verify.
# Names and reasons are exactly those in the logged mutations.log.
STRUCTURAL = (
    (
        "empty generations",
        "capture",
        lambda c: c.update(generations=[]),
        "generation_inventory",
    ),
    ("duplicate generation", "capture", duplicate_generation, "generation_inventory"),
    (
        "changed proposal",
        "capture",
        lambda c: c["generations"][0].update(proposal={"status": "invalid"}),
        "proposal_mismatch",
    ),
    (
        "cross-control relabel",
        "capture",
        lambda c: c["rows"][0].update(control="composed"),
        "branch_linkage",
    ),
    (
        "invented receiver effects",
        "capture",
        lambda c: c["rows"][0].update(new_effects=[]),
        "raw_snapshot_mismatch",
    ),
    ("changed report", "transfer-report", changed_report, "report_mismatch"),
    (
        "erased budget reservation",
        "transfer",
        erased_budget_reservation,
        "budget_ledger",
    ),
    (
        "changed original ledger",
        "roles",
        changed_original_ledger,
        "original_evidence_binding",
    ),
    ("downgraded host role", "roles", downgraded_host_role, "api_request_binding"),
    (
        "duplicate corrected workflow",
        "roles",
        duplicate_corrected_workflow,
        "workflow_inventory",
    ),
)


def rejection(check):
    """The verifier's reason for refusing, or None when it accepted the mutation."""
    try:
        check()
    except ValueError as exc:
        return str(exc)
    return None


def structural_check(name, target, mutate, transfer=None, roles=None):
    """Build the mutated input for one logged mutation and return the verifier call."""
    if target == "capture":
        _, cap, raw = transfer
        c = copy.deepcopy(cap)
        mutate(c)
        return lambda: verify_comparison(c, raw, replay=False)
    if target == "transfer-report":
        files = dict(transfer[0])
        report = loads(files["report.json"])
        mutate(report)
        files["report.json"] = wire(report)
        return lambda: verify_files(files, replay=False)
    if target == "transfer":
        files = dict(transfer[0])
        mutate(files)
        return lambda: verify_files(files, replay=False)
    if target == "roles":
        files = dict(roles)
        mutate(files)
        return lambda: role_verify(files)
    raise ValueError(f"unknown mutation target {target!r} for {name!r}")


# Archive-layer mutations (31 October 2026 audit, C-11). The ten structural checks above never
# touch `read_pack`, so removing its root, member-hash and inventory checks left 10/10 green. Each
# of these rewrites the role archive in a caller-supplied directory and expects `read_pack` itself
# to refuse it; they are counted separately from the ten logged mutations.
def _rewrite_role_archive(directory, mutate_members, root=None):
    with zipfile.ZipFile(ROLES / "evidence.zip") as z:
        members = {n: z.read(n) for n in z.namelist()}
    manifest = members.pop("manifest.json")
    mutate_members(members)
    path = Path(directory) / "mutated.zip"
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as out:
        out.writestr("manifest.json", manifest)
        for name, body in members.items():
            out.writestr(name, body)
    return path, (hashlib.sha256(manifest).hexdigest() if root is None else root)


def member_byte_flip(members):
    body = bytearray(members["report.json"])
    body[-2] ^= 0x01
    members["report.json"] = bytes(body)


def dropped_member(members):
    del members["report.json"]


def added_member(members):
    members["extra.json"] = b"{}"


ARCHIVE = (
    ("member byte flip under an unchanged manifest", member_byte_flip, None, "member_hash"),
    ("member missing from the archive", dropped_member, None, "archive_inventory"),
    ("member absent from the manifest", added_member, None, "archive_inventory"),
    ("wrong expected root", lambda m: None, "0" * 64, "manifest_root"),
)


def archive_check(directory, mutate, root):
    Path(directory).mkdir(parents=True, exist_ok=True)
    path, expected = _rewrite_role_archive(directory, mutate, root)
    return lambda: read_pack(path, expected)


def resigned_role_archive(directory, case_index=1):
    """A role archive whose flipped report, manifest entry and root all agree.

    Returns (archive path, recomputed root). `read_pack` accepts this archive; the flipped
    `new_effects` can only be caught when the fresh replay disagrees with the saved report.
    """
    with zipfile.ZipFile(ROLES / "evidence.zip") as z:
        files = {n: z.read(n) for n in z.namelist() if n != "manifest.json"}
    report = loads(files["report.json"])
    row = report["rows"][case_index]
    row["new_effects"] = 0 if row["new_effects"] else 1
    files["report.json"] = wire(report)
    path = Path(directory) / "resigned.zip"
    root = write_pack(path, files)
    with zipfile.ZipFile(path) as z:
        assert hashlib.sha256(z.read("manifest.json")).hexdigest() == root
    return path, root


def main():
    transfer, roles = load_transfer(), load_roles()
    accepted = []
    for name, target, mutate, expected in STRUCTURAL:
        reason = rejection(structural_check(name, target, mutate, transfer, roles))
        status = "REJECTED" if reason is not None and expected in reason else "ACCEPTED"
        print(
            name, status, reason if reason is not None else "(no refusal)", flush=True
        )
        if status != "REJECTED":
            accepted.append(name)
    print(
        f"mutation checks passed: {len(STRUCTURAL) - len(accepted)}/{len(STRUCTURAL)}"
    )
    import tempfile

    archive_accepted = []
    with tempfile.TemporaryDirectory() as td:
        for name, mutate, root, expected in ARCHIVE:
            reason = rejection(archive_check(Path(td) / name.replace(" ", "_"), mutate, root))
            status = "REJECTED" if reason is not None and expected in reason else "ACCEPTED"
            print("archive:", name, status, reason if reason is not None else "(no refusal)")
            if status != "REJECTED":
                archive_accepted.append(name)
    print(f"archive checks passed: {len(ARCHIVE) - len(archive_accepted)}/{len(ARCHIVE)}")
    return 1 if accepted or archive_accepted else 0


if __name__ == "__main__":
    sys.exit(main())
