const root = document.documentElement;
const motion = root.classList.contains("js"); // set in <head>, absent for reduced-motion visitors
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// ---- reveal: adds .is-in once an element scrolls into view -------------
const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.3 }
);

// ---- nav glass: light-on-photo over the hero, ink-on-limestone after ----
const nav = document.querySelector(".nav");
const hero = document.querySelector(".hero");
if (nav && hero) {
  new IntersectionObserver(
    ([entry]) => nav.classList.toggle("nav--on-light", !entry.isIntersecting),
    { rootMargin: `-${nav.offsetHeight}px 0px 0px 0px`, threshold: 0 }
  ).observe(hero);
}

// Split text into word spans (words rise from a mask / light up on scroll).
function splitWords(el, cls) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = "";
  return words.map((word, i) => {
    const w = document.createElement("span");
    if (cls === "w") {
      const inner = document.createElement("span");
      inner.textContent = word;
      w.className = "w";
      w.append(inner);
    } else {
      w.className = "sw";
      w.textContent = word;
    }
    w.style.setProperty("--i", i);
    el.append(w, " ");
    return w;
  });
}

function initMotion() {
  // 1. headings + giant wordmark: words rise one by one
  document.querySelectorAll("h2[data-reveal], [data-split]").forEach((el) => {
    splitWords(el, "w");
    el.classList.add("split");
  });

  // 2. ledes: words light up as they scroll through
  const scrubs = [...document.querySelectorAll("[data-scrub]")].map((el) => ({
    el,
    words: splitWords(el, "sw"),
  }));

  // 3. stagger indexes + self-drawing icons
  document.querySelectorAll("[data-stagger]").forEach((el) => {
    [...el.children].forEach((c, i) => c.style.setProperty("--i", i));
  });
  document.querySelectorAll(".fact-icon *, .amenity-row svg *").forEach((n) => n.setAttribute("pathLength", "1"));

  // 4. count-up numbers (500m, 16km, 20km ...)
  const counter = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        counter.unobserve(e.target);
        const el = e.target;
        const t0 = performance.now();
        (function step(now) {
          const p = clamp((now - t0) / 1500);
          el.textContent = Math.round(el._n * easeOut(p)) + el._s;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      }
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll(".around__list span, .arrival__facts dt").forEach((el) => {
    const m = el.textContent.match(/^(\d+)(.*)$/);
    if (!m) return;
    el._n = +m[1];
    el._s = m[2];
    el.textContent = "0" + m[2];
    counter.observe(el);
  });

  // 5. scroll progress bar
  const bar = document.createElement("div");
  bar.className = "progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.append(bar);

  // 6. one scroll loop drives parallax, hero fade, lede scrub, dusk
  const plx = [...document.querySelectorAll("[data-plx]")].map((el) => ({ el, s: parseFloat(el.dataset.plx) }));
  const heroContent = document.querySelector(".hero__content");
  const stay = document.querySelector(".stay");
  const dusk = document.querySelector(".stay__img--evening");
  let queued = false;

  function frame() {
    queued = false;
    const h = innerHeight;
    const sy = scrollY;
    const k = innerWidth < 700 ? 0.6 : 1; // calmer on phones

    bar.style.setProperty("--p", clamp(sy / (root.scrollHeight - h) || 0).toFixed(4));

    if (heroContent && sy < h * 1.2) {
      const p = clamp(sy / h);
      heroContent.style.translate = `0 ${(-p * 70).toFixed(1)}px`;
      heroContent.style.opacity = (1 - clamp(p * 1.5)).toFixed(3);
    }

    for (const { el, s } of plx) {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -250 || r.top > h + 250) continue;
      const off = r.top + r.height / 2 - h / 2;
      el.style.translate = `0 ${(-off * s * k).toFixed(1)}px`;
    }

    for (const { el, words } of scrubs) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > h) continue;
      const p = clamp((h * 0.9 - r.top) / (h * 0.5));
      words.forEach((w, i) => {
        w.style.opacity = (0.2 + 0.8 * clamp(p * (words.length + 3) - i)).toFixed(2);
      });
    }

    if (stay && dusk) {
      const r = stay.getBoundingClientRect();
      if (r.bottom > 0 && r.top < h) {
        const e = clamp((clamp((h * 0.85 - r.top) / (r.height * 0.8)) - 0.05) / 0.7);
        const s = e * e * (3 - 2 * e);
        dusk.style.opacity = s.toFixed(3);
        stay.style.setProperty("--dusk", s.toFixed(3));
      }
    }
  }

  const request = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(frame);
    }
  };
  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", request);
  frame();

  // 7. glass + buttons follow the pointer (mouse/trackpad only)
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".glass, .btn").forEach((el) => {
      const magnetic = el.matches(".btn, .nav__cta");
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        el.style.setProperty("--mx", x + "px");
        el.style.setProperty("--my", y + "px");
        if (magnetic) el.style.translate = `${((x / r.width - 0.5) * 10).toFixed(1)}px ${((y / r.height - 0.5) * 8).toFixed(1)}px`;
      });
      el.addEventListener("pointerleave", () => (el.style.translate = ""));
    });
  }
}

// Hero headline: once the two clauses have glided in, each line bobs gently against the
// other (anime.js line wave) and each word takes a random colour on hover.
function heroHeadline() {
  const h1 = document.querySelector(".hero h1");
  if (!h1) return;
  import("https://cdn.jsdelivr.net/npm/animejs@4.5.0/+esm")
    .then(({ animate, stagger, splitText, utils }) => {
      const palette = ["#ffb3d1", "#d4bcff", "#ffd9a0", "#b6f3df"];
      const colors = [];
      // wait for the side-glide entrance to finish so lines are measured un-rotated
      setTimeout(() => {
        splitText(".hero h1 .hline", { lines: true })
          .addEffect(({ lines }) =>
            animate(lines, {
              y: ["7%", "-7%"],
              loop: true,
              alternate: true,
              delay: stagger(450),
              duration: 2400,
              ease: "inOutQuad",
            })
          )
          .addEffect((split) => {
            split.words.forEach(($el, i) => {
              if (colors[i]) utils.set($el, { color: colors[i] });
              $el.addEventListener("pointerenter", () => {
                animate($el, { color: utils.randomPick(palette), duration: 250 });
              });
            });
            return () => split.words.forEach((w, i) => (colors[i] = utils.get(w, "color")));
          });
      }, 2500);
    })
    .catch(() => {});
}

// "Around Nilaveli": the distance tiles slowly reshuffle between four layouts
// (anime.js createLayout). Runs only while visible, pauses on hover.
function aroundLayout() {
  const list = document.querySelector(".around__list");
  if (!list || matchMedia("(max-width: 640px)").matches) return;

  import("https://cdn.jsdelivr.net/npm/animejs@4.5.0/+esm")
    .then(({ createLayout, stagger }) => {
      const layout = createLayout(list);
      let i = 0, visible = false, paused = false, busy = false, timer = 0; // paused stays false: it never waits on hover

      const next = () => {
        clearTimeout(timer);
        timer = 0;
        if (busy || !visible || paused || document.hidden) return;
        busy = true;
        layout.update(
          ({ root }) => {
            root.dataset.grid = (++i % 4) + 1;
          },
          {
            duration: 450,
            delay: stagger(40),
            onComplete: () => {
              busy = false;
              timer = setTimeout(next, 400);
            },
          }
        );
      };
      const resume = (ms) => {
        if (!busy && !timer) timer = setTimeout(next, ms);
      };

      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) resume(400);
      }, { threshold: 0.3 }).observe(list);
      document.addEventListener("visibilitychange", () => !document.hidden && resume(400));
    })
    .catch(() => {});
}

// Three more anime.js text effects, each placed where it suits the copy:
//  1. letter roll  -> every button / link label, on hover or keyboard focus
//  2. 3D cube roll -> the small caps eyebrows (hero + booking), a wave every few seconds
//  3. line wave + word recolour -> the giant "Thulasi Rooms" wordmark in the footer
function textEffects() {
  import("https://cdn.jsdelivr.net/npm/animejs@4.5.0/+esm")
    .then(({ animate, createTimeline, stagger, splitText, utils }) => {
      // 1. letter roll: each letter is clipped; a clone waiting below slides up in its place
      document.querySelectorAll(".btn, .nav__cta, .link-cta").forEach((el) => {
        const textNode = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
        if (!textNode) return;
        const label = document.createElement("span");
        label.className = "roll";
        label.textContent = textNode.textContent.trim();
        label.setAttribute("aria-label", label.textContent);
        textNode.replaceWith(label);
        const { chars } = splitText(label, { chars: { wrap: "clip", clone: "bottom" } });
        chars.forEach((c) => c.setAttribute("aria-hidden", "true"));
        let roll;
        const play = () => {
          if (roll) roll.pause();
          utils.set(chars, { y: 0 });
          roll = createTimeline().add(
            chars,
            { y: "-100%", duration: 550, ease: "inOut(2)", onComplete: () => utils.set(chars, { y: 0 }) },
            stagger(40, { from: "center" })
          );
        };
        el.addEventListener("pointerenter", play);
        el.addEventListener("focus", play);
      });

      // 2. 3D cube roll on the eyebrows
      document.querySelectorAll(".hero__eyebrow .eb-line, .stay__content .eyebrow").forEach((el) => {
        splitText(el, {
          chars: `<span class="char-3d"><em class="face face-top">{value}</em><em class="face-front">{value}</em><em class="face face-bottom">{value}</em></span>`,
        });
        // a short, quick wave, then a long rest with the words fully readable
        const each = stagger(45, { start: 0 });
        createTimeline({ defaults: { ease: "inOutQuad", loop: true, loopDelay: 6000, duration: 650 } })
          .add(el.querySelectorAll(".char-3d"), { rotateX: -90 }, each)
          .add(el.querySelectorAll(".face-front"), { opacity: [1, 0.3] }, each)
          .add(el.querySelectorAll(".face-top"), { opacity: [0.3, 1] }, each);
      });

      // 3. footer wordmark: its two lines bob gently, and each word takes a random colour on hover
      const giant = document.querySelector(".footer__giant");
      if (giant) {
        const palette = ["#ffb3d1", "#d4bcff", "#ffd9a0", "#b6f3df"];
        const colors = [];
        splitText(giant, { lines: true })
          .addEffect(({ lines }) =>
            animate(lines, {
              y: ["6%", "-6%"],
              loop: true,
              alternate: true,
              delay: stagger(500),
              duration: 2200,
              ease: "inOutQuad",
            })
          )
          .addEffect((split) => {
            split.words.forEach(($el, i) => {
              if (colors[i]) utils.set($el, { color: colors[i] });
              $el.addEventListener("pointerenter", () => {
                animate($el, { color: utils.randomPick(palette), duration: 250 });
              });
            });
            return () => split.words.forEach((w, i) => (colors[i] = utils.get(w, "color")));
          });
      }
    })
    .catch(() => {});
}

if (motion) initMotion();
if (motion) textEffects();
if (motion) heroHeadline();
if (motion) aroundLayout();

// observe last, so split headings exist before they are watched
document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
