const EXTRA_POOL = [
  "actually","really","just","still","already","usually","maybe","because",
  "always","never","then","so","too","yet","much","very","only","also",
  "would","could","should","did","have","was","were","been","about"
];

const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
const norm = (s) => (s || "").toLowerCase().replace(/[.,!?;:]/g, "").replace(/\s+/g, " ").trim();
const wordTokens = (s) => norm(s).split(" ").filter(Boolean);

function makeDropEvent(word) {
  const ev = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "dataTransfer", {
    value: { getData: () => word },
    configurable: true
  });
  return ev;
}

function resolveTargetTokens(card) {
  const french = norm(card.querySelector(".translation-box")?.textContent || "");
  if (!french) return null;

  const cards = [...document.querySelectorAll("#phraseList .phrase-card")];
  const match = cards.find(item => norm(item.querySelector(".fr")?.textContent || "") === french);
  const english = match?.querySelector(".en")?.textContent?.trim();
  return english ? wordTokens(english) : null;
}

function multisetDifference(source, subtract) {
  const pool = subtract.map(norm);
  const result = [];
  source.forEach(word => {
    const key = norm(word);
    const i = pool.indexOf(key);
    if (i >= 0) pool.splice(i, 1);
    else result.push(word);
  });
  return result;
}

function enhanceBuilder(card) {
  const bank = card.querySelector("#wordBank");
  const zone = card.querySelector("#answerZone");
  const check = card.querySelector("#checkOrder");
  if (!bank || !zone || bank.dataset.enhanced === "1") return;

  bank.dataset.enhanced = "1";

  const originalTokens = [...bank.querySelectorAll(".word-chip")].map(b => b.dataset.word || b.textContent.trim());
  if (!originalTokens.length) return;

  // Resolve the real sentence from the phrase library. The original word bank itself is shuffled.
  const targetTokens = resolveTargetTokens(card) || originalTokens;
  const targetSet = new Set(targetTokens.map(norm));
  const extraCount = targetTokens.length >= 8 ? 2 : 1;
  const extras = shuffle(EXTRA_POOL.filter(w => !targetSet.has(norm(w)))).slice(0, extraCount);
  const allTokens = [...originalTokens, ...extras];

  const note = document.createElement("div");
  note.className = "word-builder-help";
  note.textContent = "Tap to add • tap a placed word to undo • drag to reorder • 1–2 extra words";
  note.style.cssText = "margin-top:10px;color:#9f98b3;font-size:9px;line-height:1.45;text-align:center";
  bank.insertAdjacentElement("afterend", note);

  const feedback = document.createElement("div");
  feedback.className = "word-builder-feedback";
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  feedback.style.cssText = "display:none;margin:12px 0 0;padding:11px 12px;border-radius:14px;background:rgba(139,92,246,.12);border:1px solid rgba(196,181,253,.22);color:#ddd6fe;font-size:11px;line-height:1.45;font-weight:750";
  note.insertAdjacentElement("afterend", feedback);

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

  function clearFeedback() {
    feedback.style.display = "none";
    feedback.textContent = "";
  }

  function showFeedback(message, icon = "🧩") {
    feedback.textContent = `${icon} ${message}`;
    feedback.style.display = "block";
    feedback.animate?.([
      { transform: "translateY(3px)", opacity: .65 },
      { transform: "translateY(0)", opacity: 1 }
    ], { duration: 180, easing: "ease-out" });
  }

  function analyzeAnswer() {
    const chosen = selectedWords().map(norm);
    const target = targetTokens.map(norm);

    const extrasChosen = multisetDifference(chosen, target);
    const missing = multisetDifference(target, chosen);

    if (extrasChosen.length) {
      return extrasChosen.length === 1
        ? "There is 1 extra word in your sentence. Find it and remove it."
        : `There are ${extrasChosen.length} extra words in your sentence. Find and remove them.`;
    }

    if (missing.length) {
      return missing.length === 1
        ? "1 word is still missing. Look at the words below."
        : `${missing.length} words are still missing. Look at the words below.`;
    }

    const misplaced = chosen.reduce((n, word, i) => n + (word !== target[i] ? 1 : 0), 0);
    if (misplaced) {
      return misplaced === 1
        ? "Almost there — 1 word is in the wrong position."
        : `Almost there — ${misplaced} words are in the wrong position.`;
    }

    return null;
  }

  function sendWordToAnswer(word) {
    clearFeedback();
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
    clearFeedback();
    // SpeakFlow's original handler removes the word; we redraw the bank afterwards
    // so the word returns instead of disappearing.
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
      moved: false
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
        clearFeedback();
        rebuildSelected(words);
      } else {
        suppressClickUntil = Date.now() + 350;
      }
    }
    dragState = null;
  });

  if (check) {
    check.addEventListener("click", e => {
      const message = analyzeAnswer();
      if (!message) {
        clearFeedback();
        return; // correct: let SpeakFlow's original handler complete the exercise
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      showFeedback(message);
    }, true);
  }

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
