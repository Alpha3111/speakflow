import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const REDIRECT_URL = "https://alpha3111.github.io/speakflow/";
const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

function toast(message){const el=$("#toast");if(!el)return alert(message);el.textContent=message;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2600)}
function openModal(html){const modal=$("#modal"),sheet=$("#modalSheet");if(!modal||!sheet)return;sheet.innerHTML=html;modal.classList.remove("hidden");enhancePasswordFields(sheet)}
function closeModal(){$("#modal")?.classList.add("hidden");if($("#modalSheet"))$("#modalSheet").innerHTML=""}

function enhancePasswordField(input){
  if(!input||input.dataset.passwordEnhanced==="1")return;
  let wrap=input.closest(".password-field");
  if(!wrap){wrap=document.createElement("div");wrap.className="password-field";input.parentNode.insertBefore(wrap,input);wrap.appendChild(input)}
  let toggle=wrap.querySelector(".password-toggle");
  if(!toggle){toggle=document.createElement("button");toggle.type="button";toggle.className="password-toggle";toggle.textContent="Show";wrap.appendChild(toggle)}
  const sync=()=>{const visible=input.type==="text";toggle.textContent=visible?"Hide":"Show";toggle.setAttribute("aria-label",visible?"Hide password":"Show password");toggle.setAttribute("aria-pressed",String(visible))};
  toggle.onclick=()=>{input.type=input.type==="password"?"text":"password";sync();input.focus()};
  input.dataset.passwordEnhanced="1";sync();
}
function enhancePasswordFields(root=document){$$('input[type="password"],input[data-password-enhanced="1"]',root).forEach(enhancePasswordField)}

function injectAccountUI(){
  enhancePasswordFields();
  const loginForm=$("#loginForm");
  if(loginForm&&!$("#forgotPasswordBtn")){const b=document.createElement("button");b.id="forgotPasswordBtn";b.type="button";b.textContent="Forgot password?";loginForm.insertBefore(b,loginForm.querySelector('button[type="submit"]'));b.onclick=openForgotPassword}
  const forgot=$("#forgotPasswordBtn");if(forgot&&!forgot.dataset.bound){forgot.dataset.bound="1";forgot.onclick=openForgotPassword}
  const logout=$("#logoutBtn");
  if(logout&&!$("#changePasswordBtn")){const row=document.createElement("button");row.id="changePasswordBtn";row.className="settings-row glass";row.innerHTML='<span>🔐</span><div><b>Change password</b><small>Update your account password</small></div><em>›</em>';logout.parentNode.insertBefore(row,logout)}
  const change=$("#changePasswordBtn");if(change&&!change.dataset.bound){change.dataset.bound="1";change.onclick=openChangePassword}
}

function openForgotPassword(){
  openModal(`<span class="eyebrow">ACCOUNT RECOVERY</span><h2>Forgot password?</h2><p>Enter your email and we'll send you a secure reset link.</p><label>Email<input id="resetEmail" type="email" autocomplete="email" placeholder="you@email.com"></label><div class="modal-actions"><button class="primary" id="sendReset"><span>Send reset link</span><b>→</b></button><button class="secondary" id="cancelReset">Cancel</button></div>`);
  $("#resetEmail").value=$("#loginEmail")?.value||"";$("#cancelReset").onclick=closeModal;
  $("#sendReset").onclick=async()=>{const email=$("#resetEmail").value.trim();if(!email)return toast("Enter your email address.");$("#sendReset").disabled=true;const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:REDIRECT_URL});$("#sendReset").disabled=false;if(error)return toast(error.message);closeModal();toast("Reset email sent. Check your inbox ✉️")};
}
function openRecoveryPassword(){
  openModal(`<span class="eyebrow">RESET PASSWORD</span><h2>Choose a new password</h2><p>Enter the new password twice.</p><label>New password<input id="recoveryNew" type="password" autocomplete="new-password" minlength="6" placeholder="6+ characters"></label><label>Confirm new password<input id="recoveryConfirm" type="password" autocomplete="new-password" minlength="6" placeholder="Repeat password"></label><div class="modal-actions"><button class="primary" id="saveRecovery"><span>Save new password</span><b>✓</b></button></div>`);
  $("#saveRecovery").onclick=async()=>{const a=$("#recoveryNew").value,b=$("#recoveryConfirm").value;if(a.length<6)return toast("Use at least 6 characters.");if(a!==b)return toast("The passwords don't match.");$("#saveRecovery").disabled=true;const{error}=await sb.auth.updateUser({password:a});$("#saveRecovery").disabled=false;if(error)return toast(error.message);closeModal();history.replaceState({},document.title,location.pathname);toast("Password updated ✓")};
}
async function openChangePassword(){
  const{data}=await sb.auth.getSession();if(!data.session)return toast("Please log in first.");
  openModal(`<span class="eyebrow">SECURITY</span><h2>Change password</h2><p>Confirm your current password, then enter the new one twice.</p><label>Current password<input id="currentPassword" type="password" autocomplete="current-password"></label><label>New password<input id="newPassword" type="password" autocomplete="new-password" minlength="6" placeholder="6+ characters"></label><label>Confirm new password<input id="confirmPassword" type="password" autocomplete="new-password" minlength="6" placeholder="Repeat new password"></label><div class="modal-actions"><button class="primary" id="savePassword"><span>Change password</span><b>✓</b></button><button class="secondary" id="cancelPassword">Cancel</button></div>`);
  $("#cancelPassword").onclick=closeModal;$("#savePassword").onclick=async()=>{const current=$("#currentPassword").value,next=$("#newPassword").value,confirm=$("#confirmPassword").value;if(!current)return toast("Enter your current password.");if(next.length<6)return toast("Use at least 6 characters.");if(next!==confirm)return toast("The new passwords don't match.");if(current===next)return toast("Choose a different new password.");$("#savePassword").disabled=true;const s=(await sb.auth.getSession()).data.session;const{error:verifyError}=await sb.auth.signInWithPassword({email:s?.user?.email,password:current});if(verifyError){$("#savePassword").disabled=false;return toast("Current password is incorrect.")}const{error}=await sb.auth.updateUser({password:next});$("#savePassword").disabled=false;if(error)return toast(error.message);closeModal();toast("Password changed ✓")};
}

function updateSignupMatch(){const a=$("#signupPassword"),b=$("#signupConfirmPassword"),label=b?.closest("label");if(!a||!b||!label)return;let note=$("#signupPasswordMatch");if(!note){note=document.createElement("div");note.id="signupPasswordMatch";note.className="password-match-note";label.appendChild(note)}if(!b.value){note.textContent="";note.classList.remove("bad");return}const ok=a.value===b.value;note.textContent=ok?"Passwords match ✓":"Passwords do not match";note.classList.toggle("bad",!ok)}

document.addEventListener("input",e=>{if(e.target?.id==="signupPassword"||e.target?.id==="signupConfirmPassword")updateSignupMatch()});

document.addEventListener("submit",async event=>{
  const form=event.target;if(!(form instanceof HTMLFormElement)||form.id!=="signupForm")return;
  event.preventDefault();event.stopImmediatePropagation();const button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
  try{
    const username=$("#signupUsername")?.value.trim().toLowerCase(),displayName=$("#signupName")?.value.trim(),email=$("#signupEmail")?.value.trim(),password=$("#signupPassword")?.value||"",confirmPassword=$("#signupConfirmPassword")?.value||"";
    if(password.length<6)throw new Error("Use at least 6 characters for your password.");if(!confirmPassword)throw new Error("Please confirm your password.");if(password!==confirmPassword)throw new Error("The passwords don't match.");
    const selected=$(".avatar-choice.selected"),avatar=selected?.dataset.a||selected?.textContent?.trim()||"✨";
    const{data:available,error:checkError}=await sb.rpc("check_username_available",{p_username:username});if(checkError)throw checkError;if(!available)throw new Error("That username is already taken.");
    const{data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:REDIRECT_URL,data:{username,display_name:displayName,avatar}}});if(error)throw error;toast(data.session?"Welcome to SpeakFlow ✨":"Profile created. Check your email to confirm, then return to SpeakFlow.");
  }catch(error){toast(error?.message||"Could not create the profile.")}finally{if(button)button.disabled=false}
},true);

const observer=new MutationObserver(()=>injectAccountUI());
observer.observe(document.documentElement,{childList:true,subtree:true});
sb.auth.onAuthStateChange(event=>{if(event==="PASSWORD_RECOVERY")setTimeout(openRecoveryPassword,120);setTimeout(injectAccountUI,50)});
injectAccountUI();setTimeout(injectAccountUI,400);
