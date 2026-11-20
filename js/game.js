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
  const ONE_WAY_MS = 980;

  const stage = document.getElementById("stage");
  const lane = document.getElementById("lane");
  const lanePrizes = document.getElementById("lanePrizes");
  const runner = document.getElementById("runner");
  const cta = document.getElementById("cta");
  const ctaImg = document.getElementById("ctaImg");
  const pay = document.getElementById("pay");
  const vfxLayer = document.getElementById("vfxLayer");

  const claimed = PRIZES.map(() => false);
  const prizeAssignment = PRIZES.map((_, i) => i);
  const slots = [];
  let centers = [];
  let state = "intro";
  let shuffleUsed = false;
  let litIndex = 0;
  let litPrizeEl = null;
  let currentX = 0;
  let motionStart = 0;
  let raf = 0;

  ["Assets/Payment.png", CTA_SRC, "Assets/Done.png", "Assets/begunok2.png", "Assets/Plate.png", "Assets/Cloch.png"].forEach(
    (src) => {
    const img = new Image();
    img.src = src;
    },
  );

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function buildPrizes() {
    PRIZES.forEach((src, index) => {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.index = String(index);

      const plate = document.createElement("img");
      plate.className = "slot-plate";
      plate.src = "Assets/Plate.png";
      plate.alt = "";

      const prize = document.createElement("img");
      prize.className = "slot-prize";
      prize.src = src;
      prize.alt = "";

      const done = document.createElement("img");
      done.className = "slot-done";
      done.src = "Assets/Done.png";
      done.alt = "";

      const cloche = document.createElement("img");
      cloche.className = "slot-cloche";
      cloche.src = "Assets/Cloch.png";
      cloche.alt = "";

      const stack = document.createElement("div");
      stack.className = "slot-stack";
      stack.append(plate, prize, cloche);
      slot.append(stack, done);
      lanePrizes.appendChild(slot);
      slots.push(slot);
    });
    bindSlots();
  }

  function bindSlots() {
    slots.length = 0;
    for (let i = 0; i < PRIZES.length; i++) {
      const el = lanePrizes.querySelector(`.slot[data-index="${i}"]`);
      if (el) slots.push(el);
    }
  }

  function applyPrizeAssignment(index) {
    const prize = slots[index]?.querySelector(".slot-prize");
    if (prize) prize.src = PRIZES[prizeAssignment[index]];
  }

  function settleSlotDomOrder() {
    for (let i = 0; i < PRIZES.length; i++) {
      const el = lanePrizes.querySelector(`.slot[data-index="${i}"]`);
      if (el) lanePrizes.appendChild(el);
    }
    lanePrizes.appendChild(runner);
    bindSlots();
  }

  function swapDomNodes(nodeA, nodeB) {
    if (nodeA === nodeB) return;
    const parent = nodeA.parentNode;
    const siblingA = nodeA.nextSibling;
    const siblingB = nodeB.nextSibling;
    if (siblingA === nodeB) {
      parent.insertBefore(nodeB, nodeA);
      parent.insertBefore(nodeA, siblingB);
    } else if (siblingB === nodeA) {
      parent.insertBefore(nodeA, nodeB);
      parent.insertBefore(nodeB, siblingA);
    } else {
      parent.insertBefore(nodeA, siblingB);
      parent.insertBefore(nodeB, siblingA);
    }
  }

  function runArcFly(el, dx, dy, arc, duration, delay = 0) {
    const midX = dx * 0.5;
    const midY = dy * 0.5 - arc;
    return el
      .animate(
        [
          { transform: `translate3d(${dx}px, ${dy}px, 0)` },
          { transform: `translate3d(${midX}px, ${midY}px, 0)` },
          { transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration,
          delay,
          easing: "cubic-bezier(0.45, 0.65, 0.38, 1)",
          fill: "forwards",
        },
      )
      .finished;
  }

  function clearSlotMotion(el) {
    if (!el) return;
    el.getAnimations().forEach((anim) => anim.cancel());
    el.style.transform = "";
    el.style.zIndex = "";
    el.classList.remove("slot--shuffle");
  }

  async function arcSwapSlots(i, j) {
    if (i === j) return;
    const a = slots[i];
    const b = slots[j];
    if (!a || !b) return;

    const aFirst = a.getBoundingClientRect();
    const bFirst = b.getBoundingClientRect();
    const span = Math.abs(i - j);

    [prizeAssignment[i], prizeAssignment[j]] = [prizeAssignment[j], prizeAssignment[i]];
    applyPrizeAssignment(i);
    applyPrizeAssignment(j);
    swapDomNodes(a, b);

    const aLast = a.getBoundingClientRect();
    const bLast = b.getBoundingClientRect();
    const aDx = aFirst.left - aLast.left;
    const aDy = aFirst.top - aLast.top;
    const bDx = bFirst.left - bLast.left;
    const bDy = bFirst.top - bLast.top;

    const isSlide = span === 1;
    const arcA = isSlide ? 24 : 38 + span * 14;
    const arcB = isSlide ? 30 : arcA + 22 + span * 5;
    const duration = isSlide ? 380 : 440 + span * 48;
    const stagger = isSlide ? 95 : 115;

    a.classList.add("slot--shuffle");
    b.classList.add("slot--shuffle");
    a.style.zIndex = String(8 + span);
    b.style.zIndex = String(9 + span + (isSlide ? 0 : 2));

    await Promise.all([
      runArcFly(a, aDx, aDy, arcA, duration, 0),
      runArcFly(b, bDx, bDy, arcB, duration, isSlide ? stagger : stagger),
    ]);

    clearSlotMotion(a);
    clearSlotMotion(b);
  }

  function buildShuffleMoves(open) {
    const moves = [];
    const total = Math.min(6, Math.max(4, open.length));

    for (let s = 0; s < total; s++) {
      const roll = Math.random();
      if (roll < 0.42) {
        const anchor = open[Math.floor(Math.random() * open.length)];
        const visual = slots
          .map((slot, idx) => ({ idx, order: slot.offsetLeft }))
          .filter((item) => open.includes(item.idx))
          .sort((a, b) => a.order - b.order);

        const pos = visual.findIndex((item) => item.idx === anchor);
        if (pos < 0) continue;
        const dir = Math.random() < 0.5 ? -1 : 1;
        const next = visual[pos + dir];
        if (next) {
          moves.push([anchor, next.idx]);
          continue;
        }
      }

      let i = open[Math.floor(Math.random() * open.length)];
      let j = open[Math.floor(Math.random() * open.length)];
      if (j === i) j = open[(open.indexOf(i) + 1) % open.length];
      if (Math.abs(i - j) < 2 && Math.random() < 0.35) {
        const far = open.filter((k) => Math.abs(k - i) >= 2);
        if (far.length) j = far[Math.floor(Math.random() * far.length)];
      }
      moves.push([i, j]);
    }

    return moves;
  }

  async function playShuffle() {
    const open = [];
    for (let i = 0; i < PRIZES.length; i++) {
      if (!claimed[i]) open.push(i);
    }
    if (open.length < 2) {
      measure();
      return;
    }

    const stateAfter = state === "intro" ? "intro" : "idle";
    state = "shuffling";
    lanePrizes.classList.add("is-shuffling");

    const moves = buildShuffleMoves(open);
    const busy = new Set();

    async function runWhenFree(i, j) {
      while (busy.has(i) || busy.has(j)) {
        await wait(20);
      }
      busy.add(i);
      busy.add(j);
      try {
        await arcSwapSlots(i, j);
      } finally {
        busy.delete(i);
        busy.delete(j);
      }
    }

    for (const [i, j] of moves) {
      await runWhenFree(i, j);
      await wait(Math.abs(i - j) <= 1 ? 50 : 70);
    }

    settleSlotDomOrder();
    lanePrizes.classList.remove("is-shuffling");
    state = stateAfter;
    measure();
  }

  async function playOpeningSequence() {
    state = "intro";
    await wait(1100);
    await playCoverForRound();
    state = "idle";
    measure();
  }

  function slotTrackEl(slot) {
    if (claimed[Number(slot.dataset.index)]) {
      return slot.querySelector(".slot-prize") || slot.querySelector(".slot-stack");
    }
    if (slot.classList.contains("is-covered")) {
      return slot.querySelector(".slot-cloche") || slot.querySelector(".slot-stack");
    }
    return slot.querySelector(".slot-prize") || slot.querySelector(".slot-stack");
  }

  function measure() {
    const base = lanePrizes.getBoundingClientRect();
    centers = slots.map((slot) => {
      const el = slotTrackEl(slot);
      const rect = (el || slot).getBoundingClientRect();
      return rect.left + rect.width / 2 - base.left;
    });
  }

  function hasOpenPrize() {
    return claimed.some((value) => !value);
  }

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function prizeAlongAt(now) {
    const period = ONE_WAY_MS * 2;
    const phase = ((((now - motionStart) % period) + period) % period) / period;
    if (phase < 0.5) return phase * 2;
    return (1 - phase) * 2;
  }

  function xAtAlong(along) {
    const n = centers.length;
    if (!n) return 0;
    if (n === 1) return centers[0];
    if (along <= 0) return centers[0];
    if (along >= 1) return centers[n - 1];
    const f = along * (n - 1);
    const i = Math.floor(f);
    if (i >= n - 1) return centers[n - 1];
    const t = smoothstep(f - i);
    return centers[i] + (centers[i + 1] - centers[i]) * t;
  }

  function clearLitPrize() {
    if (litPrizeEl) {
      litPrizeEl.classList.remove("is-lit");
      litPrizeEl = null;
    }
  }

  function setLitPrize(index) {
    if (index === litIndex && litPrizeEl) return;
    clearLitPrize();
    litIndex = index;
    if (index < 0 || claimed[index]) return;
    const slot = slots[index];
    if (!slot) return;
    const target = slot.classList.contains("is-covered")
      ? slot.querySelector(".slot-cloche")
      : slot.querySelector(".slot-prize");
    if (!target) return;
    target.classList.add("is-lit");
    litPrizeEl = target;
  }

  function placeAtAlong(along) {
    const n = centers.length;
    if (!n) return;

    const t = Math.min(1, Math.max(0, along));
    const index = Math.min(n - 1, Math.max(0, Math.round(t * (n - 1))));
    if (!slots[index]) return;

    const x = xAtAlong(t);
    currentX = x;
    runner.style.left = x + "px";
    setLitPrize(index);
  }

  function placeAtIndex(index) {
    const n = centers.length;
    if (index < 0 || n <= 1) return;
    placeAtAlong(index / (n - 1));
  }

  function frame(now) {
    if (state !== "catching") return;
    placeAtAlong(prizeAlongAt(now));
    raf = requestAnimationFrame(frame);
  }

  function setCreditButton() {
    ctaImg.src = CREDIT_SRC;
    ctaImg.alt = "Buy";
  }

  function hideRunner() {
    runner.classList.remove("is-on");
    runner.classList.add("is-leaving");
    clearLitPrize();
    litIndex = -1;
  }

  function animateProgress(from, to, ms, lockIndex) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      function step(now) {
        const u = Math.min(1, (now - t0) / ms);
        const eased = 1 - Math.pow(1 - u, 3);
        const x = from + (to - from) * eased;
        runner.style.left = x + "px";
        currentX = x;
        if (lockIndex != null) setLitPrize(lockIndex);
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
    state = "catching";
    ctaImg.src = CTA_SRC;
    ctaImg.alt = "Catch!";
    runner.classList.remove("is-leaving");
    runner.classList.add("is-on");
    runner.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        measure();
        placeAtAlong(0);
        motionStart = performance.now();
        raf = requestAnimationFrame(frame);
      });
    });
  }

  async function playCatch(index) {
    const slot = slots[index];
    const cloche = slot.querySelector(".slot-cloche");
    const plate = slot.querySelector(".slot-plate");
    const prize = slot.querySelector(".slot-prize");
    if (cloche) cloche.classList.remove("is-lit");

    slot.classList.add("is-catching-reveal");
    await wait(740);

    const point = stagePoint(plate || prize);
    playOpenMagic(point.x, point.y);
    slot.classList.remove("is-covered");
    slot.classList.add("is-prize-reveal");
    if (prize) prize.classList.add("is-reveal");
    await wait(560);

    claimed[index] = true;
    slot.classList.remove("is-catching-reveal", "is-prize-reveal");
    slot.classList.add("is-claimed");
    if (prize) prize.classList.remove("is-reveal");
    hideRunner();
    setCreditButton();
    await wait(460);
    runner.classList.remove("is-leaving");
    runner.setAttribute("aria-hidden", "true");
    measure();
  }

  async function resolveCatch() {
    state = "resolving";
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    const index = litIndex;
    if (index < 0) {
      hideRunner();
      setCreditButton();
      state = "idle";
      return;
    }
    await animateProgress(currentX, centers[index], 150, index);
    await playCatch(index);
    state = "idle";
  }

  async function playCoverForRound() {
    const open = slots.filter((_, i) => !claimed[i]);
    if (!open.length) return;
    const step = 55;
    let seq = 0;
    open.forEach((slot) => {
      if (slot.classList.contains("is-covered")) return;
      const delay = seq * step;
      seq += 1;
      window.setTimeout(() => slot.classList.add("is-covered"), delay);
    });
    await wait(Math.max(0, seq) * step + 520);
    measure();
  }

  async function onCta() {
    if (state === "intro" || state === "shuffling" || state === "paying" || state === "resolving") return;

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
    pay.classList.add("is-on");
    pay.setAttribute("aria-hidden", "false");
    await wait(1000);
    pay.classList.remove("is-on");
    pay.setAttribute("aria-hidden", "true");
    if (!shuffleUsed) {
      await playShuffle();
      shuffleUsed = true;
    }
    startCatching();
  }

  buildPrizes();
  playOpeningSequence();
  cta.addEventListener("click", onCta);
  window.addEventListener("resize", () => {
    measure();
    if (state === "catching") placeAtAlong(prizeAlongAt(performance.now()));
    else if (state === "resolving" && litIndex >= 0) placeAtIndex(litIndex);
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(measure);
  });
})();
