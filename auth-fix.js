import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

function showToast(message) {
  const el = document.querySelector("#toast");
  if (!el) return alert(message);
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => el.classList.remove("show"), 2600);
}

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== "signupForm") return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;

  try {
    const username = document.querySelector("#signupUsername")?.value.trim().toLowerCase();
    const displayName = document.querySelector("#signupName")?.value.trim();
    const email = document.querySelector("#signupEmail")?.value.trim();
    const password = document.querySelector("#signupPassword")?.value || "";
    const selected = document.querySelector(".avatar-choice.selected");
    const avatar = selected?.dataset.avatar || selected?.dataset.a || selected?.textContent?.trim() || "✨";

    const { data: available, error: checkError } = await sb.rpc("check_username_available", { p_username: username });
    if (checkError) throw checkError;
    if (!available) throw new Error("That username is already taken.");

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "https://alpha3111.github.io/speakflow/",
        data: { username, display_name: displayName, avatar }
      }
    });

    if (error) throw error;

    showToast(data.session
      ? "Welcome to SpeakFlow ✨"
      : "Profile created. Check your email to confirm, then return to SpeakFlow.");
  } catch (error) {
    showToast(error?.message || "Could not create the profile.");
  } finally {
    if (button) button.disabled = false;
  }
}, true);
