# Convolution Explorer (No-Framework Demo)

A tiny, framework-free frontend to help teach 2D convolutions. It renders:

- A 7×7 image matrix (editable numeric cells)
- A 3×3 convolution kernel (editable numeric cells)

Extras:
- Randomize and reset buttons
- Optional heatmap coloring for quick visual intuition (blue ramp for the image, red/blue diverging map for the kernel)

## Files

- `index.html` — entry point with the UI
- `style.css` — styling for panels, grids, and heatmaps
- `script.js` — logic to generate grids and wire controls

## Run

You can open `index.html` directly in a browser, or serve the folder locally for a smoother experience.

### Option A: Open directly
Double-click `index.html` (or drag it into a browser). No build step required.

### Option B: Serve locally (recommended)
From this folder:

```bash
python3 -m http.server 8080
```

Then open:

```
http://localhost:8080/
```

## Next steps (nice to have)

- Add a “Step Convolution” button to slide the 3×3 kernel over the image and compute the output matrix
- Visualize padding/stride and the output feature map
- Preset kernels (blur, edge, sharpen) and an “apply” action