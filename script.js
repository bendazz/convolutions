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
  }

  // Helpers
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

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

  // (Controls removed) Heatmaps are always enabled.

  // Init
  populateProblemSelect();
  setProblem(0);

  // Reposition the overlay on resize in case sizes change
  window.addEventListener('resize', () => positionKernelOverlay(curR, curC));
  window.addEventListener('resize', () => positionKernelOverlay2(curR2, curC2));

  // Wire buttons
  if (stepBtn) stepBtn.addEventListener('click', stepOnce);
  if (showAllBtn) showAllBtn.addEventListener('click', showAll);
  if (copyNumpyBtn) copyNumpyBtn.addEventListener('click', copyNumpyCode);
  if (step2Btn) step2Btn.addEventListener('click', stepOnce2);
  if (showAll2Btn) showAll2Btn.addEventListener('click', showAll2);
  if (copyNumpy2Btn) copyNumpy2Btn.addEventListener('click', copyNumpyCodePadded);
  if (showAllBtn) showAllBtn.addEventListener('click', showAll);

  // Initial overlay position
  positionKernelOverlay(0, 0);
  positionKernelOverlay2(0, 0);
})();
