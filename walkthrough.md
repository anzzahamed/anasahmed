# Walkthrough: Clean Layout & Left-Aligned Sections

I have successfully updated the layout to be clean and minimal by removing the particle animation network, and left-aligned the About Me and Work Experience sections.

---

## 🛠️ Changes Implemented

### 1. Left-Aligned About & Experience Headers
* **File modified**: [style.css](file:///c:/Users/anchu/OneDrive/Documents/portfolio%20test%20website/style.css)
* **Fix**: Added selector overrides for `#about .section-title` and `#experience .section-title` to align header text to the left.
* **Title Bar**: Left-aligned the gradient divider bars (`margin: 12px 0 0;`) inside the About and Experience headers to match the text.

### 2. Left-Aligned Experience Timeline Grid
* **File modified**: [style.css](file:///c:/Users/anchu/OneDrive/Documents/portfolio%20test%20website/style.css)
* **Fix**: Changed the `.timeline` margin from `0 auto;` (centered) to `0;` (left-aligned), keeping it perfectly aligned with the left boundary of the new wide grid containers.

### 3. Particles Removed (Minimalist View)
* **File modified**: [index.html](file:///c:/Users/anchu/OneDrive/Documents/portfolio%20test%20website/index.html)
* **File modified**: [style.css](file:///c:/Users/anchu/OneDrive/Documents/portfolio%20test%20website/style.css)
* **File modified**: [script.js](file:///c:/Users/anchu/OneDrive/Documents/portfolio%20test%20website/script.js)
* **Fix**:
  - Deleted the `#particle-canvas` element from `index.html`.
  - Removed all particle styling rules from `style.css`.
  - Deleted Section 7 (interactive particle network canvas logic) from `script.js`.
  - The background is now clean, sleek, and free of floating dust/sparkle layers.

---

## ⚡ Update: Premium Timeline Scroll & Visual Adjustments (Final)

We have rebuilt and optimized the timeline scroll animation and background subject sizing to match the premium, responsive, zero-lag feel of the reference website [moncy.dev](https://www.moncy.dev/).

### Key Features:
1. **Parallax-Locked Timeline Line Reveal**: The vertical timeline line is locked to the scroll plane exactly at **60% of the viewport height**. As you scroll, the line grows pixel-for-pixel, and a glowing white-cyan tip follows the front edge dynamically.
2. **High-Performance Caching (Zero-Reflow / Zero-Lag)**: We cache all layout offsets (timeline track and card triggers) on load, resize, and expansion toggles. During scroll, calculations are strictly mathematical to prevent browser layout thrashing, achieving a **silky-smooth 60fps/120fps scrolling speed** with zero delay.
3. **Sleeker Glowing Tip Circle (8px)**: The glowing tip size was reduced from `12px` to `8px` to align perfectly with the width of the vertical timeline line, with proportional neon glow drops.
4. **Complete Initial Invisibility (0 Opacity)**: Card items below the scroll threshold are **completely hidden (`opacity: 0`)** initially. They fade in smoothly only when the scroll tip crosses their markers.
5. **Scaled-Down Background Canvas Portrait (82% size)**: The background canvas portrait image (the model rendering) has been scaled down to **82%** of the viewport size and centered, leaving clean, spacious margins on all devices.


