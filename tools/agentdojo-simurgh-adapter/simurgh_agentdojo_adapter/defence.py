# SPDX-License-Identifier: AGPL-3.0-or-later
"""In-loop mediating defence. Forwards a step to the real gateway and enforces
the returned verdict. Makes no safety decision of its own."""
from .mapping import map_case_to_run, verdict_to_outcome


class SimurghDefence:
    def __init__(self, client):
        self._client = client

    def mediate(self, step):
        resp = self._client.run(**map_case_to_run(step))
        outcome = verdict_to_outcome(resp)
        return {"allow": not outcome["blocked"], "blocked_action": outcome["sentinel"]}

    # AgentDojo defence-hook alias
    def query(self, step):
        return self.mediate(step)
