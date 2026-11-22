"""Phase 19y: the repair of what lane 19t's attackers found, in new classes (P19-REDTEAM02).

Lane 19t found two faults in the gate and one in its fixture:

- a token whose ``approver_id`` is a list or an object, signed with the operator's key, reached
  a database lookup and made ``verify`` raise, although it promises a reason and never an
  exception;
- a note of at most 12,000 characters could pass the frozen gate's limit of 16,384 bytes on
  the encoded summary, so any writer of a channel could put ``summary_schema`` into the audit;
- a text holding half of a surrogate pair made the fixture's own file write raise.

Nothing here edits ``gate19.py``, ``rig.py`` or a frozen module: packs bind those files. The
classes below subclass them. ``Repaired`` is mixed in before a pipeline class of 19b, so the
same repair applies to the clean gate and to each reader mutant.
"""

import sqlite3

import gate19
import rig as rigmod
from core import encode

SUMMARY_CAP = 16384  # the frozen context gate's limit on an encoded summary
NOTE_CUT = "summary_note_cut"
APPROVAL_REASONS = (*gate19.APPROVAL_REASONS, "approval_store")
ENCODE_ERRORS = (ValueError, TypeError, RecursionError)


class ApprovalStore(gate19.ApprovalStore):
    """19b's approval store with the two gaps closed. ``verify`` returns one reason string for
    every token and every state of the store's database."""

    def verify(self, action, token, *, now, key, actor=None):
        try:
            return super().verify(action, token, now=now, key=key, actor=actor)
        except sqlite3.Error:
            return "approval_store"

    def _verify(self, action, token, *, now, key, actor):
        if (
            type(token) is dict
            and type(token.get("payload")) is dict
            and type(token["payload"].get("approver_id", "")) is not str
        ):
            return "approval_schema"
        return super()._verify(action, token, now=now, key=key, actor=actor)


def _size(summary):
    return len(encode(summary).encode())


def fit_note(summary, cap=SUMMARY_CAP):
    """The summary with its note cut to the longest prefix that keeps the encoded summary
    within ``cap`` bytes, and whether anything was cut. The test is the frozen gate's own:
    the length in bytes of ``encode(summary)``. Only the note is ever changed. A summary that
    is not a dictionary with a string note, one that cannot be encoded, and one that is over
    the cap without its note are returned as they are, for the frozen gate to judge."""
    if type(summary) is not dict or type(summary.get("note")) is not str:
        return summary, False
    try:
        if _size(summary) <= cap or _size(dict(summary, note="")) > cap:
            return summary, False
        note = summary["note"][:cap]  # a character is at least one byte when encoded
        low, high = (
            0,
            len(note) + 1,
        )  # the prefix of length low fits; of length high does not
        while high - low > 1:
            middle = (low + high) // 2
            if _size(dict(summary, note=note[:middle])) <= cap:
                low = middle
            else:
                high = middle
    except ENCODE_ERRORS:
        return summary, False
    return dict(summary, note=note[:low]), True


class Repaired:
    """Mixed in before ``gate19.ProvenancePipeline`` or a subclass of it."""

    def __init__(self, path, **kwargs):
        super().__init__(path, **kwargs)
        self.approvals = ApprovalStore(self.directory)

    def resume(self, actor, checkpoint=None, summary=None):
        summary, cut = fit_note(summary)
        if cut:
            with self.locked():
                self.record(NOTE_CUT)
        return super().resume(actor, checkpoint, summary)


class Pipeline(Repaired, gate19.ProvenancePipeline):
    """The repaired gate."""


def repaired(cls):
    """A pipeline class of 19b, a reader mutant for one, with the repair mixed in. It keeps the
    class's name."""
    return type(cls.__name__, (Repaired, cls), {})


class Rig(rigmod.ProvenanceRig):
    """19b's fixture with file channels held as bytes. A text that UTF-8 cannot carry is
    stored as ``surrogatepass`` gives it and read back with replacement, so writing a channel
    and reading it never raise."""

    def __init__(self, directory, *, gate_cls=None, clock=rigmod.CLOCK):
        super().__init__(directory, gate_cls=gate_cls or Pipeline, clock=clock)

    def write(self, channel, text):
        if channel in rigmod.FILE_CHANNELS:
            path = self.directory / rigmod.FILE_CHANNELS[channel]
            path.write_bytes(text.encode("utf-8", "surrogatepass"))
        else:
            super().write(channel, text)

    def read(self, channel):
        if channel in rigmod.FILE_CHANNELS:
            path = self.directory / rigmod.FILE_CHANNELS[channel]
            return path.read_bytes().decode("utf-8", "replace")
        return super().read(channel)
