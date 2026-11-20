(function () {
  const PRIZES = [
    "Assets/SKU.png",
    "Assets/SKU-1.png",
    "Assets/SKU-2.png",
    "Assets/SKU-3.png",
    "Assets/SKU-4.png",
    "Assets/SKU-5.png",
    "Assets/SKU-6.png",
    "Assets/SKU-7.png",
  ];
  const CREDIT_SRC = "Assets/Credit_btn.png";
  const CTA_SRC = "Assets/CTA.png";
  const ONE_WAY_MS = 920;

  const stage = document.getElementById("stage");
  const lane = document.getElementById("lane");
  const lanePrizes = document.getElementById("lanePrizes");
  const highlight = document.getElementById("highlight");
  const runner = document.getElementById("runner");
  const cta = document.getElementById("cta");
  const ctaImg = document.getElementById("ctaImg");
  const hand = document.getElementById("hand");
  const pay = document.getElementById("pay");
  const vfxLayer = document.getElementById("vfxLayer");

  const claimed = PRIZES.map(() => false);
  const slots = [];
  let centers = [];
  let state = "idle";
  let litIndex = 0;
  let currentX = 0;
  let motionStart = 0;
  let raf = 0;

  ["Assets/Payment.png", CTA_SRC, "Assets/Done.png", "Assets/begunok.png"].forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function buildPrizes() {
    PRIZES.forEach((src, index) => {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.index = String(index);

      const prize = document.createElement("img");
      prize.className = "slot-prize";
      prize.src = src;
      prize.alt = "";

      const done = document.createElement("img");
      done.className = "slot-done";
      done.src = "Assets/Done.png";
      done.alt = "";

      slot.append(prize, done);
      lanePrizes.appendChild(slot);
      slots.push(slot);
    });
  }

  function measure() {
    const laneRect = lane.getBoundingClientRect();
    centers = slots.map((slot) => {
      const rect = slot.getBoundingClientRect();
      return rect.left + rect.width / 2 - laneRect.left;
    });
  }

  function hasOpenPrize() {
    return claimed.some((value) => !value);
  }

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function prizeFloatAt(now) {
    const n = centers.length;
    if (n <= 1) return 0;

    const period = ONE_WAY_MS * 2;
    const phase = ((((now - motionStart) % period) + period) % period) / period;
    const along = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
    return along * (n - 1);
  }

  function xAtFloat(f) {
    const n = centers.length;
    if (n <= 1) return centers[0] || 0;
    const clamped = Math.min(n - 1, Math.max(0, f));
    const i = Math.floor(clamped);
    const t = smoothstep(clamped - i);
    if (i >= n - 1) return centers[n - 1];
    return centers[i] + (centers[i + 1] - centers[i]) * t;
  }

  function placeAtFloat(f) {
    const n = centers.length;
    if (!n) return;

    const index = Math.min(n - 1, Math.max(0, Math.round(f)));
    if (!slots[index]) return;

    const x = xAtFloat(f);
    litIndex = index;
    currentX = x;
    runner.style.left = x + "px";

    const laneRect = lane.getBoundingClientRect();
    const rect = slots[index].getBoundingClientRect();
    const size = Math.max(52, Math.min(rect.width * 0.92, laneRect.height * 0.72));
    highlight.style.width = size + "px";
    highlight.style.height = size + "px";
    highlight.style.left = x + "px";
  }

  function placeAtIndex(index) {
    if (index < 0) return;
    placeAtFloat(index);
  }

  function frame(now) {
    if (state !== "catching") return;
    placeAtFloat(prizeFloatAt(now));
    raf = requestAnimationFrame(frame);
  }

  function showHand(on) {
    hand.classList.toggle("is-on", on && hasOpenPrize());
  }

  function setCreditButton() {
    ctaImg.src = CREDIT_SRC;
    ctaImg.alt = "Buy";
  }

  function hideRunner() {
    runner.classList.remove("is-on");
    runner.classList.add("is-leaving");
    highlight.classList.remove("is-on");
    highlight.classList.add("is-leaving");
  }

  function animateProgress(from, to, ms, lockIndex) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      function step(now) {
        const u = Math.min(1, (now - t0) / ms);
        const eased = 1 - Math.pow(1 - u, 3);
        const x = from + (to - from) * eased;
        runner.style.left = x + "px";
        highlight.style.left = x + "px";
        currentX = x;
        if (lockIndex != null) litIndex = lockIndex;
        if (u < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  function stagePoint(el) {
    const stageRect = stage.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - stageRect.left,
      y: rect.top + rect.height / 2 - stageRect.top,
    };
  }

  function spawnSparkles(x, y, count, spread, duration) {
    const colors = ["#ffffff", "#fffef8", "#fff6d0", "#ffe9a0"];
    for (let i = 0; i < count; i++) {
      const spark = document.createElement("div");
      spark.className = "vfx-spark";
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const dist = spread * (0.55 + Math.random() * 0.75);
      spark.style.left = x + "px";
      spark.style.top = y + "px";
      spark.style.setProperty("--tx", Math.cos(angle) * dist + "px");
      spark.style.setProperty("--ty", Math.sin(angle) * dist + "px");
      spark.style.setProperty("--dur", duration + "ms");
      spark.style.setProperty("--sz", 7 + Math.random() * 12 + "px");
      spark.style.background = `radial-gradient(circle at 35% 35%, #fff 0%, ${colors[i % colors.length]} 70%)`;
      vfxLayer.appendChild(spark);
      setTimeout(() => spark.remove(), duration + 40);
    }
  }

  function playOpenMagic(x, y) {
    const burst = document.createElement("div");
    burst.className = "vfx-burst";
    burst.style.left = x + "px";
    burst.style.top = y + "px";

    const flash = document.createElement("div");
    flash.className = "vfx-flash";

    const raysWrap = document.createElement("div");
    raysWrap.className = "vfx-rays-wrap";
    ["vfx-rays vfx-rays-primary", "vfx-rays vfx-rays-secondary", "vfx-rays-core"].forEach((name) => {
      const node = document.createElement("div");
      node.className = name;
      raysWrap.appendChild(node);
    });

    burst.append(flash, raysWrap);
    vfxLayer.appendChild(burst);

    spawnSparkles(x, y, 42, 78, 720);
    spawnSparkles(x, y, 28, 52, 580);
    setTimeout(() => spawnSparkles(x, y, 20, 64, 640), 90);
    setTimeout(() => burst.remove(), 1100);
  }

  function startCatching() {
    measure();
    motionStart = performance.now();
    state = "catching";
    ctaImg.src = CTA_SRC;
    ctaImg.alt = "Catch!";
    runner.classList.remove("is-leaving");
    highlight.classList.remove("is-leaving");
    runner.classList.add("is-on");
    highlight.classList.add("is-on");
    runner.setAttribute("aria-hidden", "false");
    showHand(true);
    raf = requestAnimationFrame(frame);
  }

  async function playCatch(index) {
    const slot = slots[index];
    const point = stagePoint(slot.querySelector(".slot-prize"));
    playOpenMagic(point.x, point.y);
    slot.querySelector(".slot-prize").classList.add("is-pop");
    await wait(280);
    claimed[index] = true;
    slot.classList.add("is-claimed");
    hideRunner();
    setCreditButton();
    await wait(460);
    runner.classList.remove("is-leaving");
    highlight.classList.remove("is-leaving");
    runner.setAttribute("aria-hidden", "true");
  }

  async function resolveCatch() {
    state = "resolving";
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    showHand(false);
    const index = litIndex;
    if (index < 0) {
      hideRunner();
      setCreditButton();
      state = "idle";
      showHand(true);
      return;
    }
    await animateProgress(currentX, centers[index], 150, index);
    await playCatch(index);
    state = "idle";
    showHand(true);
  }

  async function onCta() {
    if (state === "paying" || state === "resolving") return;

    if (state === "catching") {
      await resolveCatch();
      return;
    }

    if (!hasOpenPrize()) {
      cta.classList.remove("is-shake");
      void cta.offsetWidth;
      cta.classList.add("is-shake");
      return;
    }

    state = "paying";
    showHand(false);
    pay.classList.add("is-on");
    pay.setAttribute("aria-hidden", "false");
    await wait(1000);
    startCatching();
    pay.classList.remove("is-on");
    pay.setAttribute("aria-hidden", "true");
  }

  buildPrizes();
  cta.addEventListener("click", onCta);
  window.addEventListener("resize", () => {
    measure();
    if (state === "catching") placeAtFloat(prizeFloatAt(performance.now()));
    else if (state === "resolving" && litIndex >= 0) placeAtIndex(litIndex);
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(measure);
  });
})();
