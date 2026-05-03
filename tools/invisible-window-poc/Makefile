BIN := invisible-window-poc
SRC := main.swift

all: $(BIN)

$(BIN): $(SRC)
	swiftc -O $(SRC) -o $(BIN) -framework AppKit

clean:
	rm -f $(BIN)

.PHONY: all clean
