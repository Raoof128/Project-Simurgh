BIN := verity-helper
SRC := main.swift
ENTITLEMENTS := verity-helper.entitlements
SIGN_IDENTITY ?= -

all: $(BIN)

$(BIN): $(SRC)
	swiftc -O $(SRC) -o $(BIN) \
		-framework CoreGraphics \
		-framework AppKit \
		-framework Foundation

# Ad-hoc sign with the hardened runtime + Screen Recording-friendly entitlements.
# Override SIGN_IDENTITY=<your Developer ID> to produce a notarisable build.
sign: $(BIN) $(ENTITLEMENTS)
	codesign --force --options runtime \
		--entitlements $(ENTITLEMENTS) \
		--sign "$(SIGN_IDENTITY)" $(BIN)

clean:
	rm -f $(BIN)

.PHONY: all sign clean
