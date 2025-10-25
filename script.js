/*
  Convolution Explorer — minimal, framework-free UI to display:
  - a 7x7 image matrix (integers 0..9)
  - a 3x3 kernel (integers -3..3)
  Includes: randomize/reset controls and optional heatmap coloring.
*/

(() => {
  // DOM
  const imageGrid = document.getElementById('image-grid');
  const kernelGrid = document.getElementById('kernel-grid');
  const resultGrid = document.getElementById('result-grid');
  const stepBtn = document.getElementById('step-once');
  const showAllBtn = document.getElementById('show-all');
  const copyNumpyBtn = document.getElementById('copy-numpy');
  const problemSelect = document.getElementById('problem-select');
  // Same-padding section DOM
  const imageGrid2 = document.getElementById('image2-grid');
  const kernelGrid2 = document.getElementById('kernel2-grid');
  const resultGrid2 = document.getElementById('result2-grid');
  const step2Btn = document.getElementById('step2-once');
  const showAll2Btn = document.getElementById('show2-all');
  const copyNumpy2Btn = document.getElementById('copy2-numpy');
  // RGB first-row section DOM
  const imageRGrid = document.getElementById('imageR-grid');
  const imageGGrid = document.getElementById('imageG-grid');
  const imageBGrid = document.getElementById('imageB-grid');
  const kernelRGrid = document.getElementById('kernelR-grid');
  const kernelGGrid = document.getElementById('kernelG-grid');
  const kernelBGrid = document.getElementById('kernelB-grid');
  const resultGridRGB = document.getElementById('result-grid-rgb');
  const stepBtnRGB = document.getElementById('step-once-rgb');
  const showAllBtnRGB = document.getElementById('show-all-rgb');
  const copyNumpyBtnRGB = document.getElementById('copy-numpy-rgb');
  // MNIST-like practice DOM
  const kernelGrid3 = document.getElementById('kernel3-grid');
  const mnistPaste = document.getElementById('mnist-paste');
  const mnistRenderBtn = document.getElementById('mnist-render');
  const mnistError = document.getElementById('mnist-error');
  const mnistCanvas = document.getElementById('mnist-canvas');
  const mnistOriginalCanvas = document.getElementById('mnist-original-canvas');
  const mnistCopyBtn = document.getElementById('mnist-copy');
  const mnistNewBtn = document.getElementById('mnist-new');
  const kernel3Desc = document.getElementById('kernel3-desc');
  // Upload & Convolve section DOM
  const uploadInput = document.getElementById('upload-image');
  const uploadKernelSelect = document.getElementById('upload-kernel-select');
  const uploadOriginalCanvas = document.getElementById('upload-original-canvas');
  const uploadConvCanvas = document.getElementById('upload-conv-canvas');

  // Problem state (set per problem)
  let IMG_ROWS = 0, IMG_COLS = 0;
  let KER_ROWS = 0, KER_COLS = 0;
  let RESULT_ROWS = 0, RESULT_COLS = 0;
  let imageMatrix = [];
  let kernelMatrix = [];
  let imageMin = 0, imageMax = 9; // for heatmap scaling
  let kernelMaxAbs = 1; // for diverging heatmap scaling

  // Current kernel top-left position (row, col) over the image grid
  let curR = 0;
  let curC = 0;
  let resumeFreshStepping = false; // after Show All, restart stepping from (0,0)
  let curR2 = 0;
  let curC2 = 0;
  let resumeFreshStepping2 = false;
  // MNIST-like demo sizes
  let IMG3_ROWS = 0, IMG3_COLS = 0;
  let KER3_ROWS = 0, KER3_COLS = 0;
  let RES3_ROWS = 0, RES3_COLS = 0;
  let imageMatrix3 = [];
  let kernelMatrix3 = [];
  // Upload image state
  let uploadImageMatrix = [];
  // RGB state
  let IMG_RGB_ROWS = 0, IMG_RGB_COLS = 0;
  let KER_RGB_ROWS = 0, KER_RGB_COLS = 0;
  let RES_RGB_ROWS = 0, RES_RGB_COLS = 0;
  let imageMatrixR = [], imageMatrixG = [], imageMatrixB = [];
  let kernelMatrixR = [], kernelMatrixG = [], kernelMatrixB = [];
  let imageRMin = 0, imageRMax = 255;
  let imageGMin = 0, imageGMax = 255;
  let imageBMin = 0, imageBMax = 255;

  function setGridTemplates() {
    imageGrid.style.gridTemplateColumns = `repeat(${IMG_COLS}, var(--cell-size))`;
    kernelGrid.style.gridTemplateColumns = `repeat(${KER_COLS}, var(--cell-size))`;
    if (resultGrid) {
      resultGrid.style.gridTemplateColumns = `repeat(${RESULT_COLS}, var(--cell-size))`;
    }
    // Same-padding: image2 grid shows explicit zero padding
    const padR = Math.floor(KER_ROWS / 2);
    const padC = Math.floor(KER_COLS / 2);
    const PAD_COLS = IMG_COLS + 2 * padC;
    if (imageGrid2) imageGrid2.style.gridTemplateColumns = `repeat(${PAD_COLS}, var(--cell-size))`;
    if (kernelGrid2) kernelGrid2.style.gridTemplateColumns = `repeat(${KER_COLS}, var(--cell-size))`;
    if (resultGrid2) resultGrid2.style.gridTemplateColumns = `repeat(${IMG_COLS}, var(--cell-size))`;
    if (kernelGrid3) kernelGrid3.style.gridTemplateColumns = `repeat(${KER3_COLS}, var(--cell-size))`;
    // no numeric result grid for MNIST practice; only canvas
    // RGB templates
    if (imageRGrid) imageRGrid.style.gridTemplateColumns = `repeat(${IMG_RGB_COLS || IMG_COLS}, var(--cell-size))`;
    if (imageGGrid) imageGGrid.style.gridTemplateColumns = `repeat(${IMG_RGB_COLS || IMG_COLS}, var(--cell-size))`;
    if (imageBGrid) imageBGrid.style.gridTemplateColumns = `repeat(${IMG_RGB_COLS || IMG_COLS}, var(--cell-size))`;
  if (kernelRGrid) kernelRGrid.style.gridTemplateColumns = `repeat(${KER_RGB_COLS || KER_COLS}, var(--cell-size))`;
  if (kernelGGrid) kernelGGrid.style.gridTemplateColumns = `repeat(${KER_RGB_COLS || KER_COLS}, var(--cell-size))`;
  if (kernelBGrid) kernelBGrid.style.gridTemplateColumns = `repeat(${KER_RGB_COLS || KER_COLS}, var(--cell-size))`;
    if (resultGridRGB) resultGridRGB.style.gridTemplateColumns = `repeat(${RES_RGB_COLS || RESULT_COLS}, var(--cell-size))`;
  }

  // Helpers
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function populateUploadKernels() {
    if (!uploadKernelSelect) return;
    uploadKernelSelect.innerHTML = '';
    (MNIST_KERNELS || []).forEach((k, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = k.name;
      uploadKernelSelect.appendChild(opt);
    });
  }

  function createNumberCell({ min, max, step = 1, value = 0, readOnly = true, onChange }) {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'cell';
    input.inputMode = 'numeric';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.readOnly = !!readOnly;

    input.addEventListener('input', () => {
      let v = input.value === '' ? '' : Number(input.value);
      if (v !== '') {
        if (Number.isNaN(v)) v = 0;
        v = clamp(v, min, max);
      }
      input.value = v;
      onChange?.(input);
    });
    input.addEventListener('blur', () => {
      // Coerce empty to 0 within range
      if (input.value === '') input.value = String(clamp(0, min, max));
      onChange?.(input);
    });

    return input;
  }

  // Color mapping utilities
  function setImageCellColor(el, enabled) {
    if (!enabled) {
      el.style.background = '';
      return;
    }
    const v = Number(el.value);
    const denom = (imageMax - imageMin) || 1;
    const t = (v - imageMin) / denom; // 0..1
    // Blue-ish ramp via HSL. Lightness from 22%..62%, saturation 70%..90%
    const hue = 215;
    const sat = 70 + 20 * t;
    const light = 22 + 40 * t;
    el.style.background = `hsl(${hue} ${sat}% ${light}%)`;
  }

  // Channel-tinted heatmaps for RGB
  function setImageCellColorChannel(el, enabled, channel, mn, mx) {
    if (!enabled) {
      el.style.background = '';
      return;
    }
    const v = Number(el.value);
    const denom = (mx - mn) || 1;
    const t = (v - mn) / denom; // 0..1
    const baseLight = 22 + 40 * t;
    const sat = 70 + 20 * t;
    let hue;
    if (channel === 'R') hue = 0;
    else if (channel === 'G') hue = 120;
    else hue = 215; // B
    el.style.background = `hsl(${hue} ${sat}% ${baseLight}%)`;
  }

  function setKernelCellColor(el, enabled) {
    if (!enabled) {
      el.style.background = '';
      return;
    }
    const v = Number(el.value);
    const a = Math.min(1, Math.abs(v) / (kernelMaxAbs || 1));
    // Diverging: negative -> red (0deg), positive -> blue (215deg), zero -> base
    if (v > 0) {
      const hue = 215;
      const sat = 65 + 20 * a; // 65..85
      const light = 25 + 30 * a; // 25..55
      el.style.background = `hsl(${hue} ${sat}% ${light}%)`;
    } else if (v < 0) {
      const hue = 0;
      const sat = 70 + 20 * a;
      const light = 28 + 26 * a;
      el.style.background = `hsl(${hue} ${sat}% ${light}%)`;
    } else {
      el.style.background = '#0b1221';
    }
  }

  function refreshImageHeatmap() {
    const cells = imageGrid.querySelectorAll('input.cell');
    cells.forEach((el) => setImageCellColor(el, true));
  }

  function refreshKernelHeatmap() {
    const cells = kernelGrid.querySelectorAll('input.cell');
    cells.forEach((el) => setKernelCellColor(el, true));
  }

  function buildImageGrid() {
    imageGrid.innerHTML = '';
    for (let r = 0; r < IMG_ROWS; r++) {
      for (let c = 0; c < IMG_COLS; c++) {
        const cell = createNumberCell({
          min: -999,
          max: 999,
          step: 1,
          value: imageMatrix[r][c],
          readOnly: true,
          onChange: () => setImageCellColor(cell, true),
        });
        imageGrid.appendChild(cell);
      }
    }
    positionKernelOverlay();
  }

  function buildKernelGrid() {
    kernelGrid.innerHTML = '';
    for (let r = 0; r < KER_ROWS; r++) {
      for (let c = 0; c < KER_COLS; c++) {
        const cell = createNumberCell({
          min: -999,
          max: 999,
          step: 1,
          value: kernelMatrix[r][c],
          readOnly: true,
          onChange: () => setKernelCellColor(cell, true),
        });
        kernelGrid.appendChild(cell);
      }
    }
  }

  function buildImageGrid2() {
    if (!imageGrid2) return;
    imageGrid2.innerHTML = '';
    const padR = Math.floor(KER_ROWS / 2);
    const padC = Math.floor(KER_COLS / 2);
    const PAD_ROWS = IMG_ROWS + 2 * padR;
    const PAD_COLS = IMG_COLS + 2 * padC;
    for (let r = 0; r < PAD_ROWS; r++) {
      for (let c = 0; c < PAD_COLS; c++) {
        const inImg = r >= padR && r < padR + IMG_ROWS && c >= padC && c < padC + IMG_COLS;
        const val = inImg ? imageMatrix[r - padR][c - padC] : 0;
        const cell = createNumberCell({
          min: -999,
          max: 999,
          step: 1,
          value: val,
          readOnly: true,
          onChange: () => setImageCellColor(cell, true),
        });
        if (!inImg) cell.classList.add('pad');
        imageGrid2.appendChild(cell);
      }
    }
    positionKernelOverlay2();
  }

  function buildKernelGrid2() {
    if (!kernelGrid2) return;
    kernelGrid2.innerHTML = '';
    for (let r = 0; r < KER_ROWS; r++) {
      for (let c = 0; c < KER_COLS; c++) {
        const cell = createNumberCell({
          min: -999,
          max: 999,
          step: 1,
          value: kernelMatrix[r][c],
          readOnly: true,
          onChange: () => setKernelCellColor(cell, true),
        });
        kernelGrid2.appendChild(cell);
      }
    }
  }

  function buildRgbImageGrids() {
    if (!imageRGrid || !imageGGrid || !imageBGrid) return;
    imageRGrid.innerHTML = '';
    imageGGrid.innerHTML = '';
    imageBGrid.innerHTML = '';
    for (let r = 0; r < IMG_RGB_ROWS; r++) {
      for (let c = 0; c < IMG_RGB_COLS; c++) {
        const cellR = createNumberCell({ min: -999, max: 999, step: 1, value: imageMatrixR[r][c], readOnly: true, onChange: () => setImageCellColorChannel(cellR, true, 'R', imageRMin, imageRMax) });
        const cellG = createNumberCell({ min: -999, max: 999, step: 1, value: imageMatrixG[r][c], readOnly: true, onChange: () => setImageCellColorChannel(cellG, true, 'G', imageGMin, imageGMax) });
        const cellB = createNumberCell({ min: -999, max: 999, step: 1, value: imageMatrixB[r][c], readOnly: true, onChange: () => setImageCellColorChannel(cellB, true, 'B', imageBMin, imageBMax) });
        imageRGrid.appendChild(cellR);
        imageGGrid.appendChild(cellG);
        imageBGrid.appendChild(cellB);
      }
    }
    positionKernelOverlayRGB();
    refreshRgbHeatmaps();
  }

  function refreshRgbHeatmaps() {
    if (imageRGrid) imageRGrid.querySelectorAll('input.cell').forEach(el => setImageCellColorChannel(el, true, 'R', imageRMin, imageRMax));
    if (imageGGrid) imageGGrid.querySelectorAll('input.cell').forEach(el => setImageCellColorChannel(el, true, 'G', imageGMin, imageGMax));
    if (imageBGrid) imageBGrid.querySelectorAll('input.cell').forEach(el => setImageCellColorChannel(el, true, 'B', imageBMin, imageBMax));
  }

  function buildKernelGridsRGB() {
    if (!kernelRGrid || !kernelGGrid || !kernelBGrid) return;
    kernelRGrid.innerHTML = '';
    kernelGGrid.innerHTML = '';
    kernelBGrid.innerHTML = '';
    // Use same diverging scale per-channel for clarity
    const prev = kernelMaxAbs;
    // R
    kernelMaxAbs = computeMaxAbs(kernelMatrixR);
    for (let r = 0; r < KER_RGB_ROWS; r++) for (let c = 0; c < KER_RGB_COLS; c++) {
      const cell = createNumberCell({ min: -999, max: 999, step: 1, value: kernelMatrixR[r][c], readOnly: true, onChange: () => setKernelCellColor(cell, true) });
      kernelRGrid.appendChild(cell);
    }
    // G
    kernelMaxAbs = computeMaxAbs(kernelMatrixG);
    for (let r = 0; r < KER_RGB_ROWS; r++) for (let c = 0; c < KER_RGB_COLS; c++) {
      const cell = createNumberCell({ min: -999, max: 999, step: 1, value: kernelMatrixG[r][c], readOnly: true, onChange: () => setKernelCellColor(cell, true) });
      kernelGGrid.appendChild(cell);
    }
    // B
    kernelMaxAbs = computeMaxAbs(kernelMatrixB);
    for (let r = 0; r < KER_RGB_ROWS; r++) for (let c = 0; c < KER_RGB_COLS; c++) {
      const cell = createNumberCell({ min: -999, max: 999, step: 1, value: kernelMatrixB[r][c], readOnly: true, onChange: () => setKernelCellColor(cell, true) });
      kernelBGrid.appendChild(cell);
    }
    kernelMaxAbs = prev;
  }

  function buildResultGridRGB() {
    if (!resultGridRGB) return;
    resultGridRGB.innerHTML = '';
    const MIN = -999, MAX = 999;
    for (let r = 0; r < RES_RGB_ROWS; r++) {
      for (let c = 0; c < RES_RGB_COLS; c++) {
        const cell = createNumberCell({ min: MIN, max: MAX, step: 1, value: '', readOnly: true });
        resultGridRGB.appendChild(cell);
      }
    }
  }

  function buildResultGrid2() {
    if (!resultGrid2) return;
    resultGrid2.innerHTML = '';
    const MIN = -999, MAX = 999;
    for (let r = 0; r < IMG_ROWS; r++) {
      for (let c = 0; c < IMG_COLS; c++) {
        const cell = createNumberCell({
          min: MIN,
          max: MAX,
          step: 1,
          value: '',
          readOnly: true,
        });
        resultGrid2.appendChild(cell);
      }
    }
  }

  function buildKernelGrid3() {
    if (!kernelGrid3) return;
    kernelGrid3.innerHTML = '';
    for (let r = 0; r < KER3_ROWS; r++) {
      for (let c = 0; c < KER3_COLS; c++) {
        const cell = createNumberCell({
          min: -999,
          max: 999,
          step: 1,
          value: kernelMatrix3[r][c],
          readOnly: true,
          onChange: () => setKernelCellColor(cell, true),
        });
        kernelGrid3.appendChild(cell);
      }
    }
  }

  // ---- MNIST random problem helpers ----
  function clearCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function genRing(H = 28, W = 28) {
    const cx = (W - 1) / 2, cy = (H - 1) / 2;
    const R1 = 8 + randInt(0, 3); // 8..11
    const R2 = R1 - (2 + randInt(0, 2)); // inner 2..4 thinner
    return Array.from({ length: H }, (_, r) => (
      Array.from({ length: W }, (_, c) => {
        const dx = c - cx, dy = r - cy;
        const d = Math.sqrt(dx*dx + dy*dy);
        const t = Math.max(0, Math.min(1, 1 - Math.abs(d - (R1+R2)/2) / ((R1-R2)/2 + 1e-6)));
        return Math.round(t * 255);
      })
    ));
  }

  function genVerticalBar(H = 28, W = 28) {
    const center = randInt(8, 20);
    const halfw = randInt(1, 3);
    return Array.from({ length: H }, (_, r) => (
      Array.from({ length: W }, (_, c) => (Math.abs(c - center) <= halfw ? 255 : 0))
    ));
  }

  function genDiagonal(H = 28, W = 28) {
    const slash = Math.random() < 0.5; // / or \
    const thickness = randInt(1, 2);
    return Array.from({ length: H }, (_, r) => (
      Array.from({ length: W }, (_, c) => {
        const d = slash ? Math.abs(r + c - (H - 1)) : Math.abs(r - c);
        return d <= thickness ? 255 : 0;
      })
    ));
  }

  function genPlus(H = 28, W = 28) {
    const rc = randInt(10, 18);
    const cc = randInt(10, 18);
    const half = randInt(6, 10);
    const thick = randInt(1, 2);
    return Array.from({ length: H }, (_, r) => (
      Array.from({ length: W }, (_, c) => {
        const vBar = Math.abs(c - cc) <= thick && Math.abs(r - rc) <= half;
        const hBar = Math.abs(r - rc) <= thick && Math.abs(c - cc) <= half;
        return (vBar || hBar) ? 255 : 0;
      })
    ));
  }

  const MNIST_KERNELS = [
    { name: 'Sobel X (horizontal edge detector)', mat: [[-1,0,1],[-2,0,2],[-1,0,1]] },
    { name: 'Sobel Y (vertical edge detector)', mat: [[-1,-2,-1],[0,0,0],[1,2,1]] },
    { name: 'Sharpen', mat: [[0,-1,0],[-1,5,-1],[0,-1,0]] },
    { name: 'Emboss', mat: [[-2,-1,0],[-1,1,1],[0,1,2]] },
    { name: 'Laplacian', mat: [[0,1,0],[1,-4,1],[0,1,0]] },
    { name: 'Box blur', mat: [[1,1,1],[1,1,1],[1,1,1]] },
  ];

  function setMnistProblemRandom() {
    // Pick a random image generator
    const gens = [genRing, genVerticalBar, genDiagonal, genPlus];
    const makeImg = gens[randInt(0, gens.length - 1)];
    imageMatrix3 = makeImg(28, 28);

    // Pick a random kernel
    const k = MNIST_KERNELS[randInt(0, MNIST_KERNELS.length - 1)];
    kernelMatrix3 = k.mat.map(row => row.slice());

    // Update sizes and UI
    IMG3_ROWS = imageMatrix3.length; IMG3_COLS = imageMatrix3[0].length;
    KER3_ROWS = kernelMatrix3.length; KER3_COLS = kernelMatrix3[0].length;
    RES3_ROWS = Math.max(0, IMG3_ROWS - KER3_ROWS + 1);
    RES3_COLS = Math.max(0, IMG3_COLS - KER3_COLS + 1);
    setGridTemplates();

    // Color scaling for this kernel grid only
    const prevMaxAbs = kernelMaxAbs;
    kernelMaxAbs = computeMaxAbs(kernelMatrix3);
    buildKernelGrid3();
    kernelMaxAbs = prevMaxAbs;

    if (kernel3Desc) kernel3Desc.textContent = k.name;
    drawMatrixOnCanvas(imageMatrix3, mnistOriginalCanvas);

    // Clear pasted answer and output canvas
    if (mnistPaste) mnistPaste.value = '';
    if (mnistError) mnistError.textContent = '';
    clearCanvas(mnistCanvas);
  }

  // removed numeric result grid for MNIST practice

  function parseMatrixText(text) {
    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) return { ok: false, error: 'No content detected.' };
    const rows = [];
    let width = -1;
    for (const line of lines) {
      const stripped = line.replace(/^\[/, '').replace(/\]$/, '');
      const parts = stripped.split(/[,\s]+/).filter(Boolean);
      if (parts.length === 0) continue;
      const nums = parts.map(Number);
      if (nums.some(n => Number.isNaN(n))) {
        return { ok: false, error: 'Non-numeric value found.' };
      }
      if (width === -1) width = nums.length;
      if (nums.length !== width) {
        return { ok: false, error: 'Row lengths are inconsistent.' };
      }
      rows.push(nums);
    }
    if (rows.length === 0) return { ok: false, error: 'No numeric rows found.' };
    return { ok: true, rows };
  }

  function drawMatrixOnCanvas(mat, canvas) {
    if (!canvas) return;
    const rows = mat.length, cols = mat[0].length;
    const [mn, mx] = (function(){
      let a = Infinity, b = -Infinity;
      for (const r of mat) for (const v of r) { if (v < a) a = v; if (v > b) b = v; }
      if (!isFinite(a)) a = 0; if (!isFinite(b)) b = 1; if (a === b) { a -= 1; b += 1; }
      return [a,b];
    })();
    const ctx = canvas.getContext('2d');
    // Pick a scale to keep output around ~320px on larger dimension
    const target = 320;
    const scale = Math.max(4, Math.floor(target / Math.max(rows, cols)));
    canvas.width = cols * scale;
    canvas.height = rows * scale;
    const imgData = ctx.createImageData(cols, rows);
    let k = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = (mat[r][c] - mn) / (mx - mn);
        const g = Math.max(0, Math.min(255, Math.round(t * 255)));
        imgData.data[k++] = g;
        imgData.data[k++] = g;
        imgData.data[k++] = g;
        imgData.data[k++] = 255;
      }
    }
    // Scale up the pixel grid
    const tmp = document.createElement('canvas');
    tmp.width = cols; tmp.height = rows;
    tmp.getContext('2d').putImageData(imgData, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, 0, 0, canvas.width, canvas.height);
  }

  function onMnistRender() {
    if (!mnistPaste) return;
    mnistError.textContent = '';
    const parsed = parseMatrixText(mnistPaste.value);
    if (!parsed.ok) {
      mnistError.textContent = parsed.error;
      return;
    }
    const rows = parsed.rows.length;
    const cols = parsed.rows[0].length;
    if (rows !== RES3_ROWS || cols !== RES3_COLS) {
      mnistError.textContent = `Expected ${RES3_ROWS}×${RES3_COLS} values, got ${rows}×${cols}.`;
      return;
    }
    drawMatrixOnCanvas(parsed.rows, mnistCanvas);
  }

  function imageElementToGrayscaleMatrix(imgEl, maxSize = 160) {
    const iw = imgEl.naturalWidth || imgEl.width;
    const ih = imgEl.naturalHeight || imgEl.height;
    const scale = Math.min(1, maxSize / Math.max(iw, ih));
    const W = Math.max(1, Math.floor(iw * scale));
    const H = Math.max(1, Math.floor(ih * scale));
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const ictx = off.getContext('2d');
    ictx.imageSmoothingEnabled = true;
    ictx.drawImage(imgEl, 0, 0, W, H);
    const data = ictx.getImageData(0, 0, W, H).data;
    const mat = Array.from({ length: H }, () => Array(W).fill(0));
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const idx = (r * W + c) * 4;
        const R = data[idx], G = data[idx + 1], B = data[idx + 2];
        const Y = Math.round(0.299 * R + 0.587 * G + 0.114 * B);
        mat[r][c] = Y;
      }
    }
    return mat;
  }

  function loadUploadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          uploadImageMatrix = imageElementToGrayscaleMatrix(img, 160);
          drawMatrixOnCanvas(uploadImageMatrix, uploadOriginalCanvas);
          URL.revokeObjectURL(url);
          resolve();
        } catch (e) { reject(e); }
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  }

  function convolveValid(mat, ker) {
    const H = mat.length, W = mat[0].length;
    const KH = ker.length, KW = ker[0].length;
    const OH = Math.max(0, H - KH + 1);
    const OW = Math.max(0, W - KW + 1);
    const out = Array.from({ length: OH }, () => Array(OW).fill(0));
    for (let r = 0; r < OH; r++) {
      for (let c = 0; c < OW; c++) {
        let s = 0;
        for (let i = 0; i < KH; i++) {
          for (let j = 0; j < KW; j++) {
            s += mat[r + i][c + j] * ker[i][j];
          }
        }
        out[r][c] = s;
      }
    }
    return out;
  }

  function onUploadConvolve() {
    if (!uploadImageMatrix || uploadImageMatrix.length === 0) return;
    const idx = uploadKernelSelect ? Number(uploadKernelSelect.value) : 0;
    const k = (MNIST_KERNELS && MNIST_KERNELS[idx]) ? MNIST_KERNELS[idx].mat : [[-1,0,1],[-2,0,2],[-1,0,1]];
    const out = convolveValid(uploadImageMatrix, k);
    drawMatrixOnCanvas(out, uploadConvCanvas);
  }

  function buildResultGrid() {
    if (!resultGrid) return;
    resultGrid.innerHTML = '';
    // Keep range wide for future computations; values remain empty strings for now
    const MIN = -999, MAX = 999;
    for (let r = 0; r < RESULT_ROWS; r++) {
      for (let c = 0; c < RESULT_COLS; c++) {
        const cell = createNumberCell({
          min: MIN,
          max: MAX,
          step: 1,
          value: '',
          readOnly: true,
        });
        resultGrid.appendChild(cell);
      }
    }
  }

  // Create or position a 3x3 overlay at the top-left of the image grid
  function positionKernelOverlay(r = 0, c = 0) {
    if (!imageGrid) return;
    const cells = imageGrid.querySelectorAll('input.cell');
    if (cells.length < IMG_COLS * IMG_ROWS) return;

    // Clamp within valid positions
    r = Math.max(0, Math.min(RESULT_ROWS - 1, r));
    c = Math.max(0, Math.min(RESULT_COLS - 1, c));

    // top-left cell (r,c) and bottom-right cell (r+2, c+2)
    const firstIdx = r * IMG_COLS + c;
    const lastIdx = (r + (KER_ROWS - 1)) * IMG_COLS + (c + (KER_COLS - 1));
    const first = cells[firstIdx];
    const last = cells[lastIdx];
    if (!first || !last) return;

    const gridRect = imageGrid.getBoundingClientRect();
    const firstRect = first.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();

    let overlay = imageGrid.querySelector('.window-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'window-overlay';
      imageGrid.appendChild(overlay);
    }

    overlay.style.left = `${firstRect.left - gridRect.left}px`;
    overlay.style.top = `${firstRect.top - gridRect.top}px`;
    overlay.style.width = `${lastRect.right - firstRect.left}px`;
    overlay.style.height = `${lastRect.bottom - firstRect.top}px`;
  }

  function positionKernelOverlay2(r = 0, c = 0) {
    if (!imageGrid2) return;
    const cells = imageGrid2.querySelectorAll('input.cell');
    const padR = Math.floor(KER_ROWS / 2);
    const padC = Math.floor(KER_COLS / 2);
    const PAD_ROWS = IMG_ROWS + 2 * padR;
    const PAD_COLS = IMG_COLS + 2 * padC;
    if (cells.length < PAD_COLS * PAD_ROWS) return;
    // Clamp to valid top-lefts across the padded grid for same-padding
    r = Math.max(0, Math.min(IMG_ROWS - 1, r));
    c = Math.max(0, Math.min(IMG_COLS - 1, c));
    const firstIdx = r * PAD_COLS + c;
    const lastIdx = (r + (KER_ROWS - 1)) * PAD_COLS + (c + (KER_COLS - 1));
    const first = cells[firstIdx];
    const last = cells[lastIdx];
    if (!first || !last) return;

    const gridRect = imageGrid2.getBoundingClientRect();
    const firstRect = first.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();

    let overlay = imageGrid2.querySelector('.window-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'window-overlay';
      imageGrid2.appendChild(overlay);
    }
    overlay.style.left = `${firstRect.left - gridRect.left}px`;
    overlay.style.top = `${firstRect.top - gridRect.top}px`;
    overlay.style.width = `${lastRect.right - firstRect.left}px`;
    overlay.style.height = `${lastRect.bottom - firstRect.top}px`;
  }

  function positionKernelOverlayGeneric(gridEl, totalRows, totalCols, kerRows, kerCols, r, c) {
    if (!gridEl) return;
    const cells = gridEl.querySelectorAll('input.cell');
    if (cells.length < totalRows * totalCols) return;
    r = Math.max(0, Math.min(totalRows - kerRows, r));
    c = Math.max(0, Math.min(totalCols - kerCols, c));
    const firstIdx = r * totalCols + c;
    const lastIdx = (r + (kerRows - 1)) * totalCols + (c + (kerCols - 1));
    const first = cells[firstIdx];
    const last = cells[lastIdx];
    if (!first || !last) return;
    const gridRect = gridEl.getBoundingClientRect();
    const firstRect = first.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();
    let overlay = gridEl.querySelector('.window-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'window-overlay';
      gridEl.appendChild(overlay);
    }
    overlay.style.left = `${firstRect.left - gridRect.left}px`;
    overlay.style.top = `${firstRect.top - gridRect.top}px`;
    overlay.style.width = `${lastRect.right - firstRect.left}px`;
    overlay.style.height = `${lastRect.bottom - firstRect.top}px`;
  }

  function positionKernelOverlayRGB(r = 0, c = 0) {
    if (!imageRGrid || !imageGGrid || !imageBGrid) return;
    positionKernelOverlayGeneric(imageRGrid, IMG_RGB_ROWS, IMG_RGB_COLS, KER_RGB_ROWS, KER_RGB_COLS, r, c);
    positionKernelOverlayGeneric(imageGGrid, IMG_RGB_ROWS, IMG_RGB_COLS, KER_RGB_ROWS, KER_RGB_COLS, r, c);
    positionKernelOverlayGeneric(imageBGrid, IMG_RGB_ROWS, IMG_RGB_COLS, KER_RGB_ROWS, KER_RGB_COLS, r, c);
  }

  function flatIndex(r, c, cols) {
    return r * cols + c;
  }

  function readGridCellValue(gridEl, r, c, cols) {
    const cells = gridEl.querySelectorAll('input.cell');
    const idx = flatIndex(r, c, cols);
    const el = cells[idx];
    return el ? Number(el.value) : 0;
  }

  function clearResultGrid() {
    if (!resultGrid) return;
    const cells = resultGrid.querySelectorAll('input.cell');
    cells.forEach((cell) => (cell.value = ''));
  }

  function writeResultCellValue(r, c, value) {
    if (!resultGrid) return;
    const cells = resultGrid.querySelectorAll('input.cell');
    const idx = flatIndex(r, c, RESULT_COLS);
    if (cells[idx]) cells[idx].value = String(value);
  }

  function clearResultGrid2() {
    if (!resultGrid2) return;
    const cells = resultGrid2.querySelectorAll('input.cell');
    cells.forEach((cell) => (cell.value = ''));
  }

  function writeResult2CellValue(r, c, value) {
    if (!resultGrid2) return;
    const cells = resultGrid2.querySelectorAll('input.cell');
    const idx = flatIndex(r, c, IMG_COLS);
    if (cells[idx]) cells[idx].value = String(value);
  }

  function computeCrossCorrelationAt(r, c) {
    // Sum over kxk: image[r+i, c+j] * kernel[i, j]
    let sum = 0;
    for (let i = 0; i < KER_ROWS; i++) {
      for (let j = 0; j < KER_COLS; j++) {
        const imgVal = readGridCellValue(imageGrid, r + i, c + j, IMG_COLS);
        const kerVal = readGridCellValue(kernelGrid, i, j, KER_COLS);
        sum += imgVal * kerVal;
      }
    }
    return sum;
  }

  function computeCrossCorrelationAtSameTopLeft(r, c) {
    // Same padding: read from the padded grid (imageGrid2); r,c are top-left in padded grid
    const padR = Math.floor(KER_ROWS / 2);
    const padC = Math.floor(KER_COLS / 2);
    const PAD_COLS = IMG_COLS + 2 * padC;
    let sum = 0;
    for (let i = 0; i < KER_ROWS; i++) {
      for (let j = 0; j < KER_COLS; j++) {
        const imgVal = readGridCellValue(imageGrid2, r + i, c + j, PAD_COLS);
        const kerVal = readGridCellValue(kernelGrid2, i, j, KER_COLS);
        sum += imgVal * kerVal;
      }
    }
    return sum;
  }

  function computeCrossCorrelationAtRGB(r, c) {
    let sum = 0;
    for (let i = 0; i < KER_RGB_ROWS; i++) {
      for (let j = 0; j < KER_RGB_COLS; j++) {
        const kR = readGridCellValue(kernelRGrid, i, j, KER_RGB_COLS);
        const kG = readGridCellValue(kernelGGrid, i, j, KER_RGB_COLS);
        const kB = readGridCellValue(kernelBGrid, i, j, KER_RGB_COLS);
        const rVal = readGridCellValue(imageRGrid, r + i, c + j, IMG_RGB_COLS);
        const gVal = readGridCellValue(imageGGrid, r + i, c + j, IMG_RGB_COLS);
        const bVal = readGridCellValue(imageBGrid, r + i, c + j, IMG_RGB_COLS);
        sum += kR * rVal + kG * gVal + kB * bVal;
      }
    }
    return sum;
  }

  function stepOnce() {
    if (resumeFreshStepping) {
      resumeFreshStepping = false;
      curR = 0;
      curC = 0;
    }
    clearResultGrid();
    // Compute and display result at (curR, curC)
    const y = computeCrossCorrelationAt(curR, curC);
    writeResultCellValue(curR, curC, y);
    positionKernelOverlay(curR, curC);

    // Advance to next position row-major; wrap to (0,0) after last
    curC += 1;
    if (curC >= RESULT_COLS) {
      curC = 0;
      curR += 1;
      if (curR >= RESULT_ROWS) {
        curR = 0;
        // Optional: clear overlay stays at (0,0) next click
      }
    }
  }

  let curR_rgb = 0, curC_rgb = 0; let resumeFreshSteppingRgb = false;
  function clearResultGridRGB() {
    if (!resultGridRGB) return;
    resultGridRGB.querySelectorAll('input.cell').forEach(cell => cell.value = '');
  }
  function writeResultCellValueRGB(r, c, value) {
    if (!resultGridRGB) return;
    const cells = resultGridRGB.querySelectorAll('input.cell');
    const idx = r * RES_RGB_COLS + c;
    if (cells[idx]) cells[idx].value = String(value);
  }
  function stepOnceRGB() {
    if (resumeFreshSteppingRgb) { resumeFreshSteppingRgb = false; curR_rgb = 0; curC_rgb = 0; }
    clearResultGridRGB();
    const y = computeCrossCorrelationAtRGB(curR_rgb, curC_rgb);
    writeResultCellValueRGB(curR_rgb, curC_rgb, y);
    positionKernelOverlayRGB(curR_rgb, curC_rgb);
    curC_rgb += 1;
    if (curC_rgb >= RES_RGB_COLS) { curC_rgb = 0; curR_rgb += 1; if (curR_rgb >= RES_RGB_ROWS) { curR_rgb = 0; } }
  }
  function showAllRGB() {
    clearResultGridRGB();
    for (let r = 0; r < RES_RGB_ROWS; r++) {
      for (let c = 0; c < RES_RGB_COLS; c++) {
        const y = computeCrossCorrelationAtRGB(r, c);
        writeResultCellValueRGB(r, c, y);
      }
    }
    curR_rgb = 0; curC_rgb = 0; positionKernelOverlayRGB(0,0); resumeFreshSteppingRgb = true;
  }

  function stepOnce2() {
    if (resumeFreshStepping2) {
      resumeFreshStepping2 = false;
      curR2 = 0; curC2 = 0;
    }
    clearResultGrid2();
    const y = computeCrossCorrelationAtSameTopLeft(curR2, curC2);
    writeResult2CellValue(curR2, curC2, y);
    positionKernelOverlay2(curR2, curC2);
    // Advance row-major across IMG_ROWS × IMG_COLS
    curC2 += 1;
    if (curC2 >= IMG_COLS) {
      curC2 = 0; curR2 += 1;
      if (curR2 >= IMG_ROWS) { curR2 = 0; }
    }
  }

  function showAll() {
    clearResultGrid();
    for (let r = 0; r < RESULT_ROWS; r++) {
      for (let c = 0; c < RESULT_COLS; c++) {
        const y = computeCrossCorrelationAt(r, c);
        writeResultCellValue(r, c, y);
      }
    }
    // Reset stepping to start from top-left on next Step
    curR = 0;
    curC = 0;
    positionKernelOverlay(0, 0);
    resumeFreshStepping = true;
  }

  function showAll2() {
    clearResultGrid2();
    for (let r = 0; r < IMG_ROWS; r++) {
      for (let c = 0; c < IMG_COLS; c++) {
        const y = computeCrossCorrelationAtSameTopLeft(r, c);
        writeResult2CellValue(r, c, y);
      }
    }
    curR2 = 0; curC2 = 0;
    positionKernelOverlay2(0, 0);
    resumeFreshStepping2 = true;
  }

  // Problems dataset
  const problems = [
    {
      id: 'p1',
      name: 'P1: 7×7 image, 3×3 Sobel X',
      image: [
        [0,1,2,3,2,1,0],
        [1,2,3,4,3,2,1],
        [2,3,4,5,4,3,2],
        [3,4,5,6,5,4,3],
        [2,3,4,5,4,3,2],
        [1,2,3,4,3,2,1],
        [0,1,2,3,2,1,0],
      ],
      kernel: [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1],
      ],
    },
    {
      id: 'p2',
      name: 'P2: 6×6 image, 2×2 box',
      image: [
        [0,0,1,1,0,0],
        [0,2,3,3,2,0],
        [1,3,5,5,3,1],
        [1,3,5,5,3,1],
        [0,2,3,3,2,0],
        [0,0,1,1,0,0],
      ],
      kernel: [
        [1,1],
        [1,1],
      ],
    },
    {
      id: 'p3',
      name: 'P3: 5×7 image, 3×3 Sobel Y',
      image: [
        [1,1,1,1,1,1,1],
        [1,2,2,2,2,2,1],
        [1,2,3,3,3,2,1],
        [1,2,2,2,2,2,1],
        [1,1,1,1,1,1,1],
      ],
      kernel: [
        [-1,-2,-1],
        [ 0, 0, 0],
        [ 1, 2, 1],
      ],
    }
  ];

  function computeMinMax(mat) {
    let mn = Infinity, mx = -Infinity;
    for (const row of mat) for (const v of row) { if (v < mn) mn = v; if (v > mx) mx = v; }
    if (!isFinite(mn)) mn = 0; if (!isFinite(mx)) mx = 1;
    return [mn, mx];
  }

  function computeMaxAbs(mat) {
    let m = 0;
    for (const row of mat) for (const v of row) { const a = Math.abs(v); if (a > m) m = a; }
    return m || 1;
  }

  function setProblem(idx) {
    const p = problems[idx];
    if (!p) return;
    imageMatrix = p.image.map(row => row.slice());
    kernelMatrix = p.kernel.map(row => row.slice());
    IMG_ROWS = imageMatrix.length; IMG_COLS = imageMatrix[0].length;
    KER_ROWS = kernelMatrix.length; KER_COLS = kernelMatrix[0].length;
    RESULT_ROWS = Math.max(0, IMG_ROWS - KER_ROWS + 1);
    RESULT_COLS = Math.max(0, IMG_COLS - KER_COLS + 1);
    [imageMin, imageMax] = computeMinMax(imageMatrix);
    kernelMaxAbs = computeMaxAbs(kernelMatrix);
    curR = 0; curC = 0; resumeFreshStepping = false;
    setGridTemplates();
    buildImageGrid();
    buildKernelGrid();
    buildResultGrid();
    refreshImageHeatmap();
    refreshKernelHeatmap();
    positionKernelOverlay(0, 0);
    // Same-padding section
    buildImageGrid2();
    buildKernelGrid2();
    buildResultGrid2();
    positionKernelOverlay2(0, 0);
  // MNIST-like: default synthetic 28x28 and Sobel X
    imageMatrix3 = genRing(28, 28);
    kernelMatrix3 = [[-1,0,1],[-2,0,2],[-1,0,1]];
    IMG3_ROWS = imageMatrix3.length; IMG3_COLS = imageMatrix3[0].length;
    KER3_ROWS = kernelMatrix3.length; KER3_COLS = kernelMatrix3[0].length;
    // Expect valid convolution output size (e.g., 28x28 with 3x3 => 26x26)
    RES3_ROWS = Math.max(0, IMG3_ROWS - KER3_ROWS + 1);
    RES3_COLS = Math.max(0, IMG3_COLS - KER3_COLS + 1);
    setGridTemplates();
    // Color scaling for this kernel grid only
    {
      const prevMaxAbs = kernelMaxAbs;
      kernelMaxAbs = computeMaxAbs(kernelMatrix3);
      buildKernelGrid3();
      kernelMaxAbs = prevMaxAbs;
    }
    drawMatrixOnCanvas(imageMatrix3, mnistOriginalCanvas);
    if (kernel3Desc) kernel3Desc.textContent = 'Sobel X (horizontal edge detector)';
    if (mnistPaste) mnistPaste.value = '';
    if (mnistError) mnistError.textContent = '';
    clearCanvas(mnistCanvas);

    // RGB row: initialize using current problem's image and kernel
    imageMatrixR = imageMatrix.map(row => row.slice());
    imageMatrixG = imageMatrix.map(row => row.slice());
    imageMatrixB = imageMatrix.map(row => row.slice());
  kernelMatrixR = kernelMatrix.map(row => row.slice());
  kernelMatrixG = kernelMatrix.map(row => row.slice());
  kernelMatrixB = kernelMatrix.map(row => row.slice());
    IMG_RGB_ROWS = IMG_ROWS; IMG_RGB_COLS = IMG_COLS;
    KER_RGB_ROWS = KER_ROWS; KER_RGB_COLS = KER_COLS;
    RES_RGB_ROWS = RESULT_ROWS; RES_RGB_COLS = RESULT_COLS;
    [imageRMin, imageRMax] = computeMinMax(imageMatrixR);
    [imageGMin, imageGMax] = computeMinMax(imageMatrixG);
    [imageBMin, imageBMax] = computeMinMax(imageMatrixB);
    setGridTemplates();
    buildRgbImageGrids();
    // build three kernel grids with per-channel scaling
    buildKernelGridsRGB();
    buildResultGridRGB();
    positionKernelOverlayRGB(0, 0);
  }

  function populateProblemSelect() {
    if (!problemSelect) return;
    problemSelect.innerHTML = '';
    problems.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = p.name;
      problemSelect.appendChild(opt);
    });
    problemSelect.addEventListener('change', (e) => {
      const i = Number(problemSelect.value);
      setProblem(i);
    });
  }

  function toNumpyArray(mat) {
    const rows = mat.map(r => `  [${r.join(', ')}]`).join(',\n');
    return `np.array([\n${rows}\n], dtype=np.int32)`;
  }

  function copyTextToClipboard(code, btnEl) {
    const tryClipboard = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(code);
          return true;
        }
      } catch {}
      return false;
    };
    tryClipboard().then((ok) => {
      if (!ok) {
        const ta = document.createElement('textarea');
        ta.value = code; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch {}
        document.body.removeChild(ta);
      }
      if (btnEl) {
        const orig = btnEl.textContent;
        btnEl.textContent = 'Copied!';
        setTimeout(() => btnEl.textContent = orig, 1200);
      }
    });
  }

  function copyNumpyCode() {
    const code = `import numpy as np\n\nimage = ${toNumpyArray(imageMatrix)}\n\nkernel = ${toNumpyArray(kernelMatrix)}\n`;
    copyTextToClipboard(code, copyNumpyBtn);
  }

  function copyNumpyCodePadded() {
    const padR = Math.floor(KER_ROWS / 2);
    const padC = Math.floor(KER_COLS / 2);
    const PAD_ROWS = IMG_ROWS + 2 * padR;
    const PAD_COLS = IMG_COLS + 2 * padC;
    const padded = Array.from({ length: PAD_ROWS }, (_, r) => (
      Array.from({ length: PAD_COLS }, (_, c) => {
        const inImg = r >= padR && r < padR + IMG_ROWS && c >= padC && c < padC + IMG_COLS;
        return inImg ? imageMatrix[r - padR][c - padC] : 0;
      })
    ));
    const code = `import numpy as np\n\n# Padded image (zeros)\nimage = ${toNumpyArray(padded)}\n\nkernel = ${toNumpyArray(kernelMatrix)}\n`;
    copyTextToClipboard(code, copyNumpy2Btn);
  }

  function copyNumpyCodeMnist() {
    const code = `import numpy as np\n\nimage = ${toNumpyArray(imageMatrix3)}\n\nkernel = ${toNumpyArray(kernelMatrix3)}\n`;
    copyTextToClipboard(code, mnistCopyBtn);
  }

  // (Controls removed) Heatmaps are always enabled.

  // Init
  populateProblemSelect();
  setProblem(0);
  populateUploadKernels();

  // Reposition the overlay on resize in case sizes change
  window.addEventListener('resize', () => positionKernelOverlay(curR, curC));
  window.addEventListener('resize', () => positionKernelOverlay2(curR2, curC2));
  window.addEventListener('resize', () => positionKernelOverlayRGB(curR_rgb, curC_rgb));

  // Wire buttons
  if (stepBtn) stepBtn.addEventListener('click', stepOnce);
  if (showAllBtn) showAllBtn.addEventListener('click', showAll);
  if (copyNumpyBtn) copyNumpyBtn.addEventListener('click', copyNumpyCode);
  if (step2Btn) step2Btn.addEventListener('click', stepOnce2);
  if (showAll2Btn) showAll2Btn.addEventListener('click', showAll2);
  if (copyNumpy2Btn) copyNumpy2Btn.addEventListener('click', copyNumpyCodePadded);
  if (mnistRenderBtn) mnistRenderBtn.addEventListener('click', onMnistRender);
  if (mnistCopyBtn) mnistCopyBtn.addEventListener('click', copyNumpyCodeMnist);
  if (mnistNewBtn) mnistNewBtn.addEventListener('click', setMnistProblemRandom);
  if (showAllBtn) showAllBtn.addEventListener('click', showAll);
  if (stepBtnRGB) stepBtnRGB.addEventListener('click', stepOnceRGB);
  if (showAllBtnRGB) showAllBtnRGB.addEventListener('click', showAllRGB);
  if (copyNumpyBtnRGB) copyNumpyBtnRGB.addEventListener('click', () => {
    const toNp = (mat) => {
      const rows = mat.map(r => `  [${r.join(', ')}]`).join(',\n');
      return `np.array([\n${rows}\n], dtype=np.int32)`;
    };
    const code = `import numpy as np\n\nimage_r = ${toNp(imageMatrixR)}\n\nimage_g = ${toNp(imageMatrixG)}\n\nimage_b = ${toNp(imageMatrixB)}\n\n# Optional combined tensor (C,H,W)\nimage = np.stack([image_r, image_g, image_b], axis=0)\n\n# Three 3x3 kernels (one per channel)\nkernel_r = ${toNp(kernelMatrixR)}\n\nkernel_g = ${toNp(kernelMatrixG)}\n\nkernel_b = ${toNp(kernelMatrixB)}\n\n# Optional combined kernel tensor (C,H,W)\nkernel = np.stack([kernel_r, kernel_g, kernel_b], axis=0)\n`;
    copyTextToClipboard(code, copyNumpyBtnRGB);
  });
  if (uploadInput) uploadInput.addEventListener('change', async (e) => {
    const f = uploadInput.files && uploadInput.files[0];
    if (f) {
      try { await loadUploadImage(f); } catch {}
      // Auto-run if a kernel is already selected
      if (uploadKernelSelect && uploadKernelSelect.value !== '') onUploadConvolve();
    }
  });
  if (uploadKernelSelect) uploadKernelSelect.addEventListener('change', () => {
    if (uploadImageMatrix && uploadImageMatrix.length) onUploadConvolve();
  });
  // No manual button; auto-run on upload or kernel change

  // Initial overlay position
  positionKernelOverlay(0, 0);
  positionKernelOverlay2(0, 0);
  positionKernelOverlayRGB(0, 0);
})();
