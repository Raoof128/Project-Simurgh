# Historical macOS display-affinity helper

**Unsupported by the current server.** The supported `/api/affinity` ingress, simulator and
read routes return HTTP 410. This directory preserves an earlier Swift research helper; it is
not a current installation path or the modern counts-only daemon.

For the maintained device research, see the [integration matrix](../../docs/INTEGRATIONS.md),
[macOS daemon](../simurgh-daemon-macos/) and [privacy policy](../../PRIVACY.md).

## Historical behavior

The helper compares CoreGraphics window metadata with ScreenCaptureKit shareable content.
It also obtains image buffers with `SCScreenshotManager.captureImage` and samples five alpha
locations as a capture-integrity heuristic. Detection depends on OS/API behavior; all-zero
samples or absence from a capture list do not establish malicious intent or complete visibility.
The earlier two-second detection statements concerned a controlled fixture, not a general SLO.

The payload includes raw process owner names and PIDs. Verbose output can include window and
process identifiers. Pixel values are not included in the HTTP payload, but local image-buffer
access still occurs. Do not describe this helper as metadata-only or as hashing every identifier.
See [`reportToServer` and the scanner](main.swift) and the
[documented historical exception](../../PRIVACY.md#retired-legacy-helper-path).

## Historical build and configuration

Building this preserved source on macOS requires the applicable Xcode command-line tools and SDK:

```sh
cd tools/simurgh-helper
make
```

The original flags include `--session`, `--server`, `--secret`, `--interval` and `--verbose`.
The original service expected a shared helper secret. Building the helper does not restore
server compatibility. Do not put real secrets into committed examples or shell history.

This implementation requests Screen Recording access for its capture probes. Permission state
and supported OS behavior must be tested on an owned interactive Mac; current native CI does
not validate this retired helper's capture workflow. Historical setup/demo claims can be read
at their original Git revisions, with their original limitations.

## Review boundaries

No hardware-rooted identity, kernel visibility, complete overlay detection, production support
or automatic misconduct judgment is established. The current server retirement prevents new
use through its supported routes; it does not erase old exports or change what this native
source can collect locally. Retain historical evidence and use a separately declared scope for
any future replacement.
