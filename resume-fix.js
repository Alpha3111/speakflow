const ACTIVE_KEY = "speakflow_active_exercise";

function exerciseIsActive() {
  const stage = document.querySelector("#exerciseStage");
  const menu = document.querySelector("#practiceMenu");
  return !!(stage && menu && !stage.classList.contains("hidden") && stage.innerHTML.trim());
}

function rememberExerciseState() {
  if (exerciseIsActive()) {
    sessionStorage.setItem(ACTIVE_KEY, "1");
  } else {
    sessionStorage.removeItem(ACTIVE_KEY);
  }
}

function restoreExerciseView() {
  if (sessionStorage.getItem(ACTIVE_KEY) !== "1") return;

  const stage = document.querySelector("#exerciseStage");
  const menu = document.querySelector("#practiceMenu");
  const app = document.querySelector("#app");

  // If Android only put the browser to sleep, the current exercise DOM and
  // app.js in-memory lesson state are still here. Re-open Practice without
  // starting a new lesson, so idx/score are not reset to zero.
  if (!stage || !stage.innerHTML.trim() || !app || app.classList.contains("hidden")) return;

  const practiceNav = document.querySelector('.nav-btn[data-go="practice"]');
  if (practiceNav) practiceNav.click();
  if (menu) menu.classList.add("hidden");
  stage.classList.remove("hidden");
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    rememberExerciseState();
  } else {
    // Supabase may refresh the auth token after wake-up and briefly send the
    // app back to Home. Restore after that refresh settles.
    [80, 350, 900, 1800].forEach(ms => setTimeout(restoreExerciseView, ms));
  }
});

window.addEventListener("pagehide", rememberExerciseState);
window.addEventListener("focus", () => {
  [80, 350, 900].forEach(ms => setTimeout(restoreExerciseView, ms));
});

// Clear the resume marker when the user intentionally leaves the exercise.
document.addEventListener("click", event => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.id === "menu" || target.id === "logoutBtn") {
    sessionStorage.removeItem(ACTIVE_KEY);
  }
});
