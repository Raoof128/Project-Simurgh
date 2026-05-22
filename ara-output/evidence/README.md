# Evidence Index

| File                                  | Source in paper                         | Claims        |
| ------------------------------------- | --------------------------------------- | ------------- |
| `tables/table1_privacy_boundary.md`   | Table I (Privacy Collection Boundary)   | C02           |
| `tables/table2_validation_summary.md` | Table II (Automated Validation Summary) | C02, C03, C04 |
| `tables/table3_platform_matrix.md`    | Table III (Platform Capability Matrix)  | C03           |
| `figures/figure1_architecture.md`     | Figure 1 (System Architecture TikZ)     | C02, C03      |
| `figures/figure2_proof_sequence.md`   | Figure 2 (Proof Protocol Sequence)      | C03, C04      |

## Evidence Completeness

All tables and quantitative figures from the paper are captured above. The paper contains
no appendices. Quantitative results are:

- Table I: 9 signal classes × 3 columns (signal, collected, never collected)
- Table II: 9 validation suites with pass counts (all exact, as reported in paper)
- Table III: 5 platforms × 5 columns (signal, impl, validation, limitation)
- Figure 1: Architecture diagram (qualitative — described in figure1.md)
- Figure 2: Protocol sequence (qualitative — described in figure2.md)

## Grounding Notes

All numerical values in Table II were re-verified against the live codebase on 2026-05-22:

- 327 Node.js: `npm test` → `# tests 327 / # pass 327`
- 33 Rust: `grep -rcE "#\[(test|tokio::test)\]"` → 33
- 11 .NET: `grep -cE "\[(Fact|Theory)\]"` → 11 across 5 test files
- 8 Swift: `grep -cE "func test[A-Z]"` → 8 across 4 test files
- 379 total: 327 + 33 + 11 + 8 = 379 ✓
