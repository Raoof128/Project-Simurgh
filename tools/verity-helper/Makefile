BIN := verity-helper
SRC := main.swift

all: $(BIN)

$(BIN): $(SRC)
	swiftc -O $(SRC) -o $(BIN) \
		-framework CoreGraphics \
		-framework AppKit \
		-framework Foundation

clean:
	rm -f $(BIN)

.PHONY: all clean
