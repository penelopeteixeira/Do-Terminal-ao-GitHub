function initPixelRainBackground() {
  const canvas = document.getElementById("bg");
  if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  const BLUE = { r: 13, g: 34, b: 99 };

  const CONFIG = {
    speedMin: 45,
    speedMax: 180,
    pixelMin: 1,
    pixelMax: 4,
    columnGapMin: 6,
    columnGapMax: 22,
    trailAlpha: 0.12,
    dprCap: 2,
    hazeStrength: 0.08,
    burstMin: 2,
    burstMax: 7
  };

  let W = 0, H = 0, dpr = 1;
  let columns = [];
  let lastT = performance.now();
  let frameId;

  const rand = (min, max) => Math.random() * (max - min) + min;
  const irand = (min, max) => Math.floor(rand(min, max + 1));

  function isLightTheme() {
    return document.documentElement.getAttribute("data-theme") === "light";
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, CONFIG.dprCap);
    W = canvas.clientWidth;
    H = canvas.clientHeight;

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    buildColumns();
    clearInstant();
  }

  function buildColumns() {
    columns = [];
    let x = 0;

    while (x < W) {
      const gap = rand(CONFIG.columnGapMin, CONFIG.columnGapMax);

      columns.push({
        x,
        y: rand(-H, H),
        speed: rand(CONFIG.speedMin, CONFIG.speedMax),
        size: rand(CONFIG.pixelMin, CONFIG.pixelMax),
        burst: {
          count: irand(CONFIG.burstMin, CONFIG.burstMax),
          spread: rand(12, 80),
          jitter: rand(0.2, 1.2)
        }
      });

      x += gap;
    }
  }

  function clearInstant() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);

    if (isLightTheme()) {
      gradient.addColorStop(0, "rgb(245, 247, 255)");
      gradient.addColorStop(0.6, "rgb(236, 240, 252)");
      gradient.addColorStop(1, "rgb(225, 232, 248)");
    } else {
      gradient.addColorStop(0, "rgb(3, 5, 16)");
      gradient.addColorStop(0.6, "rgb(2, 4, 14)");
      gradient.addColorStop(1, "rgb(1, 2, 10)");
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }

  function fadeFrame() {
    const alpha = CONFIG.trailAlpha;
    ctx.fillStyle = isLightTheme() ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  function pixelColor(alpha, boost) {
    const r = Math.min(255, Math.floor(BLUE.r * boost));
    const g = Math.min(255, Math.floor(BLUE.g * boost));
    const b = Math.min(255, Math.floor(BLUE.b * boost));
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function drawPixel(x, y, size, alpha) {
    ctx.fillStyle = isLightTheme() ? pixelColor(alpha * 0.68, 1.10) : pixelColor(alpha, 1.75);
    ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
  }

  function step(time) {
    const dt = Math.min(0.033, (time - lastT) / 1000);
    lastT = time;
    fadeFrame();

    const haze = ctx.createRadialGradient(
      W * 0.5, H * 0.35, 80,
      W * 0.5, H * 0.35, Math.max(W, H) * 0.9
    );

    if (isLightTheme()) {
      haze.addColorStop(0, `rgba(13,34,99,${CONFIG.hazeStrength * 0.35})`);
      haze.addColorStop(1, "rgba(255,255,255,0)");
    } else {
      haze.addColorStop(0, `rgba(13,34,99,${CONFIG.hazeStrength})`);
      haze.addColorStop(1, "rgba(0,0,0,0)");
    }

    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, W, H);

    for (const column of columns) {
      column.y += column.speed * dt;

      const { count, spread, jitter } = column.burst;

      for (let i = 0; i < count; i++) {
        const y = column.y - i * rand(8, spread) + rand(-jitter, jitter);
        if (y < -30 || y > H + 30) continue;

        const alpha = isLightTheme() ? rand(0.05, 0.14) : rand(0.10, 0.35);
        drawPixel(column.x + rand(-0.6, 0.6), y, column.size, alpha);
      }

      if (column.y - 140 > H) {
        column.y = rand(-H * 0.45, -60);
        column.speed = rand(CONFIG.speedMin, CONFIG.speedMax);
        column.size = rand(CONFIG.pixelMin, CONFIG.pixelMax);
        column.burst.count = irand(CONFIG.burstMin, CONFIG.burstMax);
        column.burst.spread = rand(12, 90);
        column.burst.jitter = rand(0.2, 1.4);
      }
    }

    frameId = requestAnimationFrame(step);
  }

  const themeObserver = new MutationObserver(clearInstant);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });

  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(frameId);
    if (!document.hidden) {
      lastT = performance.now();
      frameId = requestAnimationFrame(step);
    }
  });

  window.addEventListener("resize", resize, { passive: true });
  resize();
  if (!document.hidden) frameId = requestAnimationFrame(step);
}

initPixelRainBackground();

function initRepoCommand() {
  const options = document.getElementById("options");
  const command = document.getElementById("create-command");
  const status = document.getElementById("command-status");

  function updateCommand() {
    const { visibility, remote } = options.elements;
    command.textContent = `gh repo create pixel-rain --${visibility.value} --source=. --remote=${remote.value} --push`;
    status.textContent = "";
  }

  options.addEventListener("change", updateCommand);

  options.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await navigator.clipboard.writeText(command.textContent);
      status.textContent = "Copiado!";
    } catch {
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(command);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      status.textContent = "Copie o comando com Ctrl+C.";
    }
  });

  updateCommand();
}

initRepoCommand();

