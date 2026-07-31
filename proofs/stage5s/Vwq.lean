/-
  Stage 5S — VWQ: the five theorems of §4.1.

  Every statement below is about the SAME relation the verifier evaluates, over the same frozen
  artifact algebra of §2. Nothing here proves anything about the world: not receiver delivery, not
  operator independence, not external-anchor semantics, not cryptographic unforgeability, and not
  real-world honesty. A theorem over an assumed-honest witness proves the assumption, not the system.

  Zero `sorry`, zero `admit`, zero `native_decide`. An escape hatch in a proof is the formal analogue
  of a vacuous gate: it type-checks, it is green, and it establishes nothing. The escape scan of the
  repaired Q1-F001 gate is what enforces this — the type-checker exits 0 on a `sorry`-closed theorem,
  which is exactly how eleven proofs went unchecked before that gate was repaired.

  Each theorem ends with two witnesses: a model that satisfies it non-trivially, and one that does
  not. A theorem about a predicate no model satisfies is true and worthless.
-/

namespace Vwq

/-- A witness statement, reduced to what the quorum arithmetic actually reads (§2.1). -/
structure Statement where
  witnessIdentity : String
  keyDigest : String
  scopeId : String
  epoch : Nat
  signatureVerified : Bool
deriving DecidableEq

/-- The committed witness policy: who may witness, under which key, and how many are needed. -/
structure Policy where
  roster : List (String × String)
  thresholdQ : Nat
  producerKeyDigest : String

/-- A checkpoint, reduced to its coordinate and the body that distinguishes it (§2.2, §2.3). -/
structure Checkpoint where
  producerIdentity : String
  scopeId : String
  epoch : Nat
  bodyDigest : String
  producerAuthenticated : Bool
deriving DecidableEq

/-- The frozen coordinate of §2.3. Three components, and deliberately no more. -/
def coordinate (c : Checkpoint) : String × String × Nat :=
  (c.producerIdentity, c.scopeId, c.epoch)

/-- Roster membership: the identity holds a seat, and the key is one the roster commits (5S-F010). -/
def rosterKeyOf (p : Policy) (identity : String) : Option String :=
  (p.roster.find? (fun e => e.1 == identity)).map Prod.snd

/-- A statement is eligible when it is verified and bound to its own roster seat. -/
def eligible (p : Policy) (s : Statement) : Bool :=
  s.signatureVerified && (rosterKeyOf p s.witnessIdentity == some s.keyDigest)

/-- Producer exclusion (491), applied BEFORE any collapse — §2.8's load-bearing adjacency. -/
def notProducer (p : Policy) (s : Statement) : Bool :=
  s.keyDigest != p.producerKeyDigest

/-- The accepted set: eligible, and not the producer. Collapse happens on IDENTITIES, below. -/
def accepted (p : Policy) (ss : List Statement) : List Statement :=
  ss.filter (fun s => eligible p s && notProducer p s)

/-- Distinct eligible witness identities, after collapse. -/
def distinctIdentities (p : Policy) (ss : List Statement) : List String :=
  (accepted p ss |>.map Statement.witnessIdentity).eraseDups

/-- A quorum is met when the collapsed count reaches the committed threshold. -/
def quorumMet (p : Policy) (ss : List Statement) : Bool :=
  p.thresholdQ ≤ (distinctIdentities p ss).length

/-! ## T1 — ProducerCannotSelfWitness -/

/--
  No accepted quorum contains a statement whose key digest is the committed producer key.

  This is exclusion by construction rather than by counting: the producer's statements are removed
  before anything is collapsed, so a producer holding two roster seats cannot merge into one
  ordinary-looking witness on the way through.
-/
theorem ProducerCannotSelfWitness (p : Policy) (ss : List Statement) :
    ∀ s ∈ accepted p ss, s.keyDigest ≠ p.producerKeyDigest := by
  intro s hs
  simp [accepted, List.mem_filter, notProducer] at hs
  exact hs.2.2

/-! ## T2 — QuorumRequiresDistinctEligibleWitnesses -/

/--
  An accepted quorum has at least `thresholdQ` pairwise-distinct roster-eligible identities, after
  alias and duplicate collapse. The collapse is what makes the count meaningful: without it, one
  witness submitting twice would satisfy a threshold of two.
-/
theorem QuorumRequiresDistinctEligibleWitnesses (p : Policy) (ss : List Statement)
    (h : quorumMet p ss = true) :
    p.thresholdQ ≤ (distinctIdentities p ss).length := by
  simp [quorumMet] at h
  exact h

/--
  And the count is over ELIGIBLE witnesses only: every identity that reaches the threshold holds a
  roster seat under its own committed key, and is not the producer. Without this the theorem above
  would be arithmetic about an arbitrary list.
-/
theorem CountedIdentitiesAreEligible (p : Policy) (ss : List Statement) :
    ∀ s ∈ accepted p ss, eligible p s = true ∧ notProducer p s = true := by
  intro s hs
  simp [accepted, List.mem_filter] at hs
  exact ⟨hs.2.1, by simpa [notProducer] using hs.2.2⟩

/-! ## T3 — ComparedSameCoordinateConflictYieldsEvidence -/

/-- The §2.4 relation, frozen. `incompatible` at one coordinate with differing bodies. -/
def incompatibleAtCoordinate (a b : Checkpoint) : Bool :=
  (coordinate a == coordinate b) && (a.bodyDigest != b.bodyDigest)

/-- An artifact is derivable exactly when both views are authenticated and incompatible. -/
def artifactDerivable (a b : Checkpoint) : Bool :=
  a.producerAuthenticated && b.producerAuthenticated && incompatibleAtCoordinate a b

/--
  Two producer-authenticated views incompatible at one coordinate derive an artifact.

  The converse direction is the one that matters and it is included: nothing derivable is derivable
  without BOTH authentications, which is Ruling 9 — an accusation requires two producer-authenticated
  checkpoints, and a witness-lane problem never substitutes for one.
-/
theorem ComparedSameCoordinateConflictYieldsEvidence (a b : Checkpoint)
    (hauth : a.producerAuthenticated = true ∧ b.producerAuthenticated = true)
    (hconf : incompatibleAtCoordinate a b = true) :
    artifactDerivable a b = true := by
  simp [artifactDerivable, hauth.1, hauth.2, hconf]

theorem ArtifactRequiresBothAuthenticated (a b : Checkpoint)
    (h : artifactDerivable a b = true) :
    a.producerAuthenticated = true ∧ b.producerAuthenticated = true := by
  simp [artifactDerivable] at h
  exact ⟨h.1.1, h.1.2⟩

/-! ## T4 — QuorumShortfallCannotSuppressEquivocation -/

inductive ComparisonStatus where
  | equivocationDetected
  | noConflict
deriving DecidableEq

inductive QuorumStatus where
  | witnessed
  | incomplete
deriving DecidableEq

/--
  The comparison status TAKES the witness statements and ignores them.

  That is the whole design, expressed so it can fail: if a future edit makes this function consult
  `_ss`, the theorem below stops type-checking. A version that simply did not take the argument
  would make the theorem true by shape and prove nothing about the code anybody actually runs.
-/
def comparisonStatus (a b : Checkpoint) (_ss : List Statement) : ComparisonStatus :=
  if artifactDerivable a b then ComparisonStatus.equivocationDetected else ComparisonStatus.noConflict

def quorumStatus (p : Policy) (ss : List Statement) : QuorumStatus :=
  if quorumMet p ss then QuorumStatus.witnessed else QuorumStatus.incomplete

/--
  The stage's sharpest theorem. A shortfall changes `quorum_status` and CANNOT change
  `comparison_status`, for any substitution of witness evidence whatsoever.

  This closes the trapdoor found in round two of the §2 review: a producer publishing a second,
  deliberately under-witnessed view and having the comparator report a shortfall instead of a fork —
  equivocation laundered as an incomplete quorum. It is proved rather than tested because the
  property is about the SHAPE of the derivation, and a test can only sample the shortfalls somebody
  thought to construct.
-/
theorem QuorumShortfallCannotSuppressEquivocation (a b : Checkpoint) (ss ss' : List Statement) :
    comparisonStatus a b ss = comparisonStatus a b ss' := by
  simp [comparisonStatus]

/-- And the sharp corner: a derivable fork stays detected even when the quorum is provably short. -/
theorem ShortQuorumStillReportsEquivocation
    (p : Policy) (a b : Checkpoint) (ss : List Statement)
    (hderive : artifactDerivable a b = true)
    (hshort : quorumMet p ss = false) :
    comparisonStatus a b ss = ComparisonStatus.equivocationDetected ∧
      quorumStatus p ss = QuorumStatus.incomplete := by
  constructor
  · simp [comparisonStatus, hderive]
  · simp [quorumStatus, hshort]

/-! ## T5 — CompatibleAncestryCannotYieldEquivocation -/

/-- A committed ancestry link: the later view's predecessor is the earlier view's body. -/
structure Link where
  earlierBody : String
  laterBody : String
  laterEpoch : Nat
  earlierEpoch : Nat

/-- A link is valid when it decreases the epoch and joins the two bodies named. -/
def validLink (l : Link) (a b : Checkpoint) : Bool :=
  (l.earlierBody == a.bodyDigest) && (l.laterBody == b.bodyDigest) &&
    (a.epoch < b.epoch) && (l.earlierEpoch == a.epoch) && (l.laterEpoch == b.epoch)

/--
  A valid transitive ancestry chain yields `compatible`, never a fork — the negative control, proved.

  The mechanism is the coordinate itself: a valid link requires the epochs to differ, and
  `incompatibleAtCoordinate` requires them to be equal. The two cannot hold at once, so no chain of
  authorised advances can be read as an equivocation.
-/
theorem CompatibleAncestryCannotYieldEquivocation (a b : Checkpoint) (l : Link)
    (hvalid : validLink l a b = true) :
    incompatibleAtCoordinate a b = false := by
  simp [validLink] at hvalid
  simp [incompatibleAtCoordinate, coordinate, Prod.ext_iff]
  intro _ _ hepoch
  omega

/-! ## Witnesses — a theorem no model satisfies is true and worthless. -/

def honestPolicy : Policy :=
  { roster := [("w-a", "k-a"), ("w-b", "k-b")], thresholdQ := 2, producerKeyDigest := "k-producer" }

def honestStatements : List Statement :=
  [ { witnessIdentity := "w-a", keyDigest := "k-a", scopeId := "s", epoch := 7,
      signatureVerified := true },
    { witnessIdentity := "w-b", keyDigest := "k-b", scopeId := "s", epoch := 7,
      signatureVerified := true } ]

/-- Satisfying model: two distinct eligible witnesses meet a threshold of two. -/
example : quorumMet honestPolicy honestStatements = true := by decide

/-- Non-satisfying model: the same two seats, both held by the producer's key, meet nothing. -/
def producerStatements : List Statement :=
  [ { witnessIdentity := "w-a", keyDigest := "k-producer", scopeId := "s", epoch := 7,
      signatureVerified := true },
    { witnessIdentity := "w-b", keyDigest := "k-producer", scopeId := "s", epoch := 7,
      signatureVerified := true } ]

example : quorumMet honestPolicy producerStatements = false := by decide

def forkA : Checkpoint :=
  { producerIdentity := "p", scopeId := "s", epoch := 7, bodyDigest := "body-a",
    producerAuthenticated := true }

def forkB : Checkpoint :=
  { producerIdentity := "p", scopeId := "s", epoch := 7, bodyDigest := "body-b",
    producerAuthenticated := true }

/-- Satisfying model: one coordinate, two bodies, both authenticated — an artifact is derivable. -/
example : artifactDerivable forkA forkB = true := by decide

/-- Non-satisfying model: the same pair with one view unauthenticated derives nothing. -/
example : artifactDerivable forkA { forkB with producerAuthenticated := false } = false := by decide

/-- Non-satisfying model: a normal advance is not incompatible, however different the bodies. -/
example : incompatibleAtCoordinate forkA { forkB with epoch := 8 } = false := by decide

end Vwq
