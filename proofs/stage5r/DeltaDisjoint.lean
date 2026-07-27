/-
  Stage 5R — L3: a delta disjoint from the inherited discharged set AND drawn from inside the
  inherited universe bounds cumulative coverage at one, and moves only on new work.

  §6.2's third guarantee. The subset clause is not decoration: disjointness ALONE does not bound
  cumulative coverage, because a delta free to name identifiers from outside the universe can grow
  the numerator without limit while the denominator is fixed. An earlier draft of this obligation
  omitted it and would have proved a bound that does not hold.

  No mathlib. Lean's core has neither the nodup-subset counting lemma nor `nodup_append`, so both are
  proved here. A proof that imports its own hardest step is a proof about the import.
-/

namespace Vpf.DeltaDisjoint

/-- An obligation identifier. -/
abbrev Id := Nat

/-- Every member of `l` lies in `u`. -/
def Sub (l u : List Id) : Prop := ∀ x ∈ l, x ∈ u

/-- No identifier lies in both. -/
def Disj (a b : List Id) : Prop := ∀ x ∈ a, x ∉ b

/-- A nodup list drawn from `u` is no longer than `u`. -/
theorem length_le_of_nodup_sub :
    ∀ (l u : List Id), l.Nodup → Sub l u → l.length ≤ u.length := by
  intro l
  induction l with
  | nil => intro u _ _; simp
  | cons a t ih =>
    intro u hnd hsub
    have haU : a ∈ u := hsub a (by simp)
    have hat : a ∉ t := by
      cases hnd with
      | cons h _ => intro hmem; exact absurd rfl (h a hmem)
    have htnd : t.Nodup := by cases hnd with | cons _ h => exact h
    have hsub' : Sub t (u.erase a) := by
      intro x hx
      have hxu : x ∈ u := hsub x (by simp [hx])
      have hxa : x ≠ a := by intro h; exact hat (h ▸ hx)
      exact (List.mem_erase_of_ne hxa).mpr hxu
    have hle := ih (u.erase a) htnd hsub'
    have herase : (u.erase a).length = u.length - 1 := List.length_erase_of_mem haU
    have hpos : 0 < u.length := List.length_pos_of_mem haU
    simp [List.length_cons]
    omega

/-- Two nodup lists with nothing in common concatenate to a nodup list. -/
theorem nodupAppend :
    ∀ (a b : List Id), a.Nodup → b.Nodup → Disj a b → (a ++ b).Nodup := by
  intro a
  induction a with
  | nil => intro b _ hb _; simpa using hb
  | cons x t ih =>
    intro b hnd hb hdisj
    have hxt : ∀ y ∈ t, x ≠ y := by
      cases hnd with
      | cons h _ => exact h
    have htnd : t.Nodup := by cases hnd with | cons _ h => exact h
    have hxb : x ∉ b := hdisj x (by simp)
    have hdisj' : Disj t b := by
      intro y hy
      exact hdisj y (by simp [hy])
    have hall : ∀ y ∈ t ++ b, x ≠ y := by
      intro y hy
      rcases List.mem_append.mp hy with h | h
      · exact hxt y h
      · intro hEq; exact hxb (hEq ▸ h)
    exact List.Pairwise.cons hall (ih b htnd hb hdisj')

/-- L3. Cumulative discharged cells never exceed the inherited universe. -/
theorem cumulativeBounded
    (univ q0 delta : List Id)
    (hq0nd : q0.Nodup) (hdnd : delta.Nodup)
    (hq0 : Sub q0 univ) (hd : Sub delta univ)
    (hdisj : Disj delta q0) :
    q0.length + delta.length ≤ univ.length := by
  have hnd : (delta ++ q0).Nodup := nodupAppend delta q0 hdnd hq0nd hdisj
  have hsub : Sub (delta ++ q0) univ := by
    intro x hx
    rcases List.mem_append.mp hx with h | h
    · exact hd x h
    · exact hq0 x h
  have hle := length_le_of_nodup_sub (delta ++ q0) univ hnd hsub
  simp [List.length_append] at hle
  omega

/-- Cumulative moves only on NEW work: an empty delta leaves the inherited figure exactly. -/
theorem monotoneInNewWorkOnly (q0 : List Id) :
    q0.length + ([] : List Id).length = q0.length := by simp

/-- Non-vacuity, one: a delta that genuinely adds, inside the bound. -/
theorem witnessAdds :
    ([1, 2] : List Id).length + ([3] : List Id).length ≤ ([1, 2, 3, 4] : List Id).length := by
  decide

/-- Non-vacuity, two: without the SUBSET clause the bound is false, which is why it is there. -/
theorem witnessSubClauseIsLoadBearing :
    ¬(([1, 2] : List Id).length + ([9, 8, 7] : List Id).length ≤ ([1, 2, 3] : List Id).length) := by
  decide

end Vpf.DeltaDisjoint
