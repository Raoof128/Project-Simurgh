BIN := simurgh-helper
SRC := main.swift
ENTITLEMENTS := simurgh-helper.entitlements
SIGN_IDENTITY ?= -

# macOS 14+ ships SCScreenshotManager — the supported per-window pixel
# probe API that replaced the obsoleted CGWindowListCreateImage.
TARGET ?= arm64-apple-macosx14.0

all: $(BIN)

$(BIN): $(SRC)
	swiftc -O -parse-as-library -target $(TARGET) $(SRC) -o $(BIN) \
		-framework CoreGraphics \
		-framework AppKit \
		-framework Foundation \
		-framework ScreenCaptureKit

# Ad-hoc sign with the hardened runtime + entitlements that allow network
# egress and TCC prompting. Override SIGN_IDENTITY=<your Developer ID> to
# produce a notarisable build.
sign: $(BIN) $(ENTITLEMENTS)
	codesign --force --options runtime \
		--entitlements $(ENTITLEMENTS) \
		--sign "$(SIGN_IDENTITY)" $(BIN)

clean:
	rm -f $(BIN)
	rm -rf $(BIN).dSYM

.PHONY: all sign clean
