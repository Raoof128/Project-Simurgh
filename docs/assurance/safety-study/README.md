# Synthetic safety study

This study separates deliberate boundary violations from model-generated unsafe actions.
Its [pre-inference plan](PLAN.md) fixes the cases, controls, model fallback rule and claim limits.
The [boundary design](BOUNDARY_DESIGN.md) describes the new local host overlay for revocation,
terminal stop and audit checks. The [model sources](MODEL_SOURCES.md) explain the official
Llama 3.2 3B selection and the inaccessible 8B alternative.

The new 24-case corpus was authored by a separate AI agent without repository or previous model
output access. It is not an external human holdout. Earlier experiments and their failures remain
unchanged. Results will distinguish useful completion, invalid output, actual unauthorized effects
and policy prevention; a zero unsafe baseline makes prevention unestimable.

The protocol and source inventory must be committed before evaluation inference. This guide is
updated after execution with measured results and exact reproduction commands.
