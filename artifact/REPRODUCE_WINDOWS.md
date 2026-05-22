# Windows Validation Reproduction

Reproduces Section VIII-D (Real-Device Windows Validation) from the paper.

## Environment

- Windows 10 Pro build 19045 (or Windows 11)
- .NET 8 SDK
- Node.js 22

## Steps

```bash
# 1. Build the Windows .NET daemon
cd tools/simurgh-daemon-windows
dotnet build

# 2. Run .NET unit tests (11 tests)
dotnet test tests/SimurghDaemon.Windows.Tests/

# 3. Run the affinity fixture to validate WDA flag detection
# The SimurghAffinityFixture applies WDA_MONITOR and WDA_EXCLUDEFROMCAPTURE
# to test windows and confirms the daemon counts them correctly.
dotnet run --project tools/simurgh-daemon-windows/src/SimurghDaemon.Windows

# 4. In a second terminal, run the Node.js verifier
npm start

# 5. Confirm:
#    - WDA_MONITOR-flagged windows → monitor_only_window_count > 0
#    - WDA_EXCLUDEFROMCAPTURE windows → capture_excluded_window_count > 0
#    - Unflagged windows → neither counter incremented
#    - Tampered proof → rejected with invalid_signature
#    - Replayed proof → rejected with nonce_replayed
```

## Expected results (from paper Table II)

- 11/11 .NET tests pass
- WDA_EXCLUDEFROMCAPTURE detection confirmed
- WDA_MONITOR detection confirmed
- Signed proof accepted by Node.js verifier
- Tampered/replayed proofs rejected with correct reason codes
