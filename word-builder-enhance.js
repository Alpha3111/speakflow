const EXTRA_POOL = [
  "actually","really","just","still","already","usually","maybe","because",
  "always","never","then","so","too","yet","much","very","only","also",
  "would","could","should","did","have","was","were","been","about"
];

const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
const norm = (s) => (s || "").toLowerCase().replace(/[.,!?;:]/g, "").trim();

function makeDropEvent(word) {
  const ev = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "dataTransfer", {
    value: { getData: () => word },
    configurable: true
  });
  return ev;
}

function enhanceBuilder(card) {
  const bank = card.querySelector("#wordBank");
  const zone = card.querySelector("#answerZone");
  if (!bank || !zone || bank.dataset.enhanced === "1") return;

  bank.dataset.enhanced = "1";

  const realTokens = [...bank.querySelectorAll(".word-chip")].map(b => b.dataset.word || b.textContent.trim());
  if (!realTokens.length) return;

  const used = new Set(realTokens.map(norm));
  const extraCount = realTokens.length >= 8 ? 2 : 1;
  const extras = shuffle(EXTRA_POOL.filter(w => !used.has(norm(w)))).slice(0, extraCount);
  const allTokens = [...realTokens, ...extras];

  const note = document.createElement("div");
  note.className = "word-builder-help";
  note.textContent = "Tap to add • tap a placed word to undo • drag placed words to reorder • 1–2 extra words";
  note.style.cssText = "margin-top:10px;color:#9f98b3;font-size:9px;line-height:1.45;text-align:center";
  bank.insertAdjacentElement("afterend", note);

  let rebuilding = false;
  let suppressClickUntil = 0;
  let dragState = null;

  function selectedWords() {
    return [...zone.querySelectorAll("[data-back]")].map(b => b.textContent.trim());
  }

  function remainingTokens() {
    const selected = selectedWords();
    const consumed = new Array(selected.length).fill(false);
    return allTokens.filter(token => {
      const i = selected.findIndex((w, idx) => !consumed[idx] && norm(w) === norm(token));
      if (i >= 0) {
        consumed[i] = true;
        return false;
      }
      return true;
    });
  }

  function renderBank() {
    const remaining = shuffle(remainingTokens());
    bank.innerHTML = remaining.map((word, i) =>
      `<button class="choice word-chip" type="button" data-enhanced-word="1" data-word="${word.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}" data-i="${i}">${word}</button>`
    ).join("");
  }

  function sendWordToAnswer(word) {
    zone.dispatchEvent(makeDropEvent(word));
    setTimeout(renderBank, 0);
  }

  function rebuildSelected(order) {
    rebuilding = true;
    let guard = 0;
    while (zone.querySelector("[data-back]") && guard++ < 80) {
      const buttons = [...zone.querySelectorAll("[data-back]")];
      buttons[buttons.length - 1].click();
    }
    order.forEach(sendWordToAnswer);
    rebuilding = false;
    setTimeout(() => {
      renderBank();
      decorateAnswerTokens();
    }, 0);
  }

  function decorateAnswerTokens() {
    [...zone.querySelectorAll("[data-back]")].forEach(btn => {
      btn.style.touchAction = "none";
      btn.style.cursor = "grab";
      btn.title = "Tap to undo, drag to move";
    });
  }

  bank.addEventListener("click", e => {
    const btn = e.target.closest("[data-enhanced-word='1']");
    if (!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    sendWordToAnswer(btn.dataset.word || btn.textContent.trim());
  }, true);

  zone.addEventListener("click", e => {
    const btn = e.target.closest("[data-back]");
    if (!btn) return;
    if (Date.now() < suppressClickUntil) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (rebuilding) return;
    // Let SpeakFlow's original handler remove the word from the selected array,
    // then put it back into the bank instead of making it disappear.
    setTimeout(() => {
      renderBank();
      decorateAnswerTokens();
    }, 0);
  }, true);

  zone.addEventListener("pointerdown", e => {
    const btn = e.target.closest("[data-back]");
    if (!btn) return;
    dragState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      from: Number(btn.dataset.back),
      target: Number(btn.dataset.back),
      moved: false,
      button: btn
    };
    try { btn.setPointerCapture(e.pointerId); } catch (_) {}
  });

  zone.addEventListener("pointermove", e => {
    if (!dragState || dragState.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(dx, dy) > 10) dragState.moved = true;
    if (!dragState.moved) return;
    e.preventDefault();
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-back]");
    zone.querySelectorAll("[data-back]").forEach(x => x.style.outline = "");
    if (over && zone.contains(over)) {
      dragState.target = Number(over.dataset.back);
      over.style.outline = "2px solid #c4b5fd";
    }
  });

  zone.addEventListener("pointerup", e => {
    if (!dragState || dragState.pointerId !== e.pointerId) return;
    zone.querySelectorAll("[data-back]").forEach(x => x.style.outline = "");
    if (dragState.moved) {
      const words = selectedWords();
      const from = Math.max(0, Math.min(words.length - 1, dragState.from));
      const to = Math.max(0, Math.min(words.length - 1, dragState.target));
      if (from !== to) {
        const [moved] = words.splice(from, 1);
        words.splice(to, 0, moved);
        suppressClickUntil = Date.now() + 450;
        rebuildSelected(words);
      } else {
        suppressClickUntil = Date.now() + 350;
      }
    }
    dragState = null;
  });

  const answerObserver = new MutationObserver(() => {
    if (!rebuilding) {
      renderBank();
      decorateAnswerTokens();
    }
  });
  answerObserver.observe(zone, { childList: true, subtree: false });

  renderBank();
  decorateAnswerTokens();
}

function scan() {
  document.querySelectorAll(".exercise-card").forEach(enhanceBuilder);
}

const observer = new MutationObserver(scan);
observer.observe(document.documentElement, { childList: true, subtree: true });
scan();
