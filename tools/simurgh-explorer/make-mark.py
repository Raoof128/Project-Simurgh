# SPDX-License-Identifier: AGPL-3.0-or-later
"""Cut the bird out of the project's logo for the explorer's header and browser tab.

Usage: python3 make-mark.py <repository root>      (needs Pillow; run by hand, not by the build)

The source is `docs/Project-Simurgh-Logo.png`, unchanged. The mark is a square crop around the
bird, scaled down, with the logo's own paper colour turned transparent so that it sits on the
page's paper. No shape or colour of the bird is redrawn.
"""

import sys
from pathlib import Path

from PIL import Image

BOX = (
    311,
    105,
    891,
    685,
)  # a square around the bird's bounding box (348, 122) to (854, 668)
SIZE = 256
NEAR, FAR = 6, 30  # distance from the paper colour at which a pixel is clear, and solid

root = Path(sys.argv[1]).resolve()
source = Image.open(root / "docs/Project-Simurgh-Logo.png").convert("RGB")
paper = source.getpixel((10, 10))
bird = source.crop(BOX).resize((SIZE, SIZE), Image.Resampling.LANCZOS)
out = Image.new("RGBA", bird.size)
pixels = []
for pixel in bird.getdata():
    distance = max(abs(a - b) for a, b in zip(pixel, paper))
    alpha = min(1.0, max(0.0, (distance - NEAR) / (FAR - NEAR)))
    if alpha == 0:
        pixels.append((0, 0, 0, 0))
        continue
    # Remove the paper that the edge pixel was blended with, so no pale fringe is left.
    colour = tuple(
        min(255, max(0, round((c - p * (1 - alpha)) / alpha)))
        for c, p in zip(pixel, paper)
    )
    pixels.append((*colour, round(alpha * 255)))
out.putdata(pixels)
target = Path(__file__).resolve().parent / "src" / "simurgh-mark.png"
out.save(target, optimize=True)
print(
    f"wrote {target} ({target.stat().st_size} bytes); paper colour #%02x%02x%02x"
    % paper
)
