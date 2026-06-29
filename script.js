const supabaseUrl = "https://wydzpifchjqcdvrmwzjb.supabase.co";

const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZHpwaWZjaGpxY2R2cm13empiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MDE2MTgsImV4cCI6MjA5ODI3NzYxOH0.VoudU4Ykz_NOGg7SnKtjWBVy-ZDR567k-aLBhywMTX0";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

let signupLoading = false;
let loginLoading = false;
let currentUserRole = "user";
let slideIndex = 0;

/* BASIC MESSAGE HELPERS */
function showError(id, message) {
  const box = document.getElementById(id);
  if (!box) return;
  box.textContent = message;
  box.style.display = "block";
}

function hideError(id) {
  const box = document.getElementById(id);
  if (!box) return;
  box.textContent = "";
  box.style.display = "none";
}

function showPitchMessage(message, type = "error") {
  const box = document.getElementById("pitchFormMessage");
  if (!box) return;

  box.textContent = message;
  box.classList.toggle("success", type === "success");
  box.style.display = "block";
}

function hidePitchMessage() {
  const box = document.getElementById("pitchFormMessage");
  if (!box) return;

  box.textContent = "";
  box.classList.remove("success");
  box.style.display = "none";
}

function showAdminMessage(message, type = "error") {
  const box = document.getElementById("adminMessage");
  if (!box) return;

  box.textContent = message;
  box.classList.toggle("success", type === "success");
  box.style.display = "block";

  setTimeout(() => {
    box.style.display = "none";
  }, 3000);
}

function getValue(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el.value.trim();
  }
  return "";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resetPitchForm() {
  const pitchForm = document.querySelector(".pitch-form");
  if (pitchForm) pitchForm.reset();

  const successBox = document.getElementById("pitchSuccess");
  if (successBox) successBox.classList.remove("show");

  hidePitchMessage();
}

/* AUTH POPUP */
function openAuth() {
  document.getElementById("authOverlay").classList.add("show");
  showLogin();
}

function closeAuth() {
  document.getElementById("authOverlay").classList.remove("show");
}

function showRegister() {
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("registerBox").style.display = "block";
  hideError("loginError");
}

function showLogin() {
  document.getElementById("registerBox").style.display = "none";
  document.getElementById("loginBox").style.display = "block";
  hideError("signupError");
}

function closeAuthOnBg(event) {
  if (event.target.id === "authOverlay") closeAuth();
}

/* ACCOUNT DROPDOWN */
function toggleAccountDropdown() {
  const dropdown = document.getElementById("accountDropdown");
  if (dropdown) dropdown.classList.toggle("show");
}

async function updateAuthUI() {
  const { data } = await supabaseClient.auth.getUser();
  const user = data.user;

  const signinLink = document.getElementById("signinLink");
  const accountMenu = document.getElementById("accountMenu");
  const accountEmail = document.getElementById("accountEmail");
  const adminBtn = document.getElementById("adminBtn");

  if (user) {
    if (signinLink) signinLink.style.display = "none";
    if (accountMenu) accountMenu.style.display = "inline-block";
    if (accountEmail) accountEmail.textContent = user.email;

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    currentUserRole = profile?.role || "user";

    if (adminBtn) {
      adminBtn.style.display = currentUserRole === "admin" ? "block" : "none";
    }
  } else {
    currentUserRole = "user";
    if (signinLink) signinLink.style.display = "inline-block";
    if (accountMenu) accountMenu.style.display = "none";
    if (adminBtn) adminBtn.style.display = "none";
  }
}

/* TRACKING */
async function trackEvent(eventType) {
  const { data } = await supabaseClient.auth.getUser();
  const user = data.user;

  if (!user) return;

  await supabaseClient.from("visitor_logs").insert({
    user_id: user.id,
    email: user.email,
    event_type: eventType
  });
}

/* SIGNUP */
async function signup() {
  if (signupLoading) return;
  signupLoading = true;

  hideError("signupError");

  const email = getValue("signupEmail");
  const password = getValue("signupPassword");

  if (!email || !password) {
    showError("signupError", "Please enter both email and password.");
    signupLoading = false;
    return;
  }

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  signupLoading = false;

  if (error) {
    showError("signupError", error.message);
    return;
  }

  showError("signupError", "Signup successful. Now login.");
  setTimeout(showLogin, 900);
}

/* LOGIN */
async function login() {
  if (loginLoading) return;
  loginLoading = true;

  hideError("loginError");

  const email = getValue("loginEmail");
  const password = getValue("loginPassword");

  if (!email || !password) {
    showError("loginError", "Please enter both email and password.");
    loginLoading = false;
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  loginLoading = false;

  if (error) {
    showError("loginError", "Incorrect email or password.");
    return;
  }

  resetPitchForm();
  closeAuth();
  await updateAuthUI();
  await trackEvent("login");
  checkPitchStatus();
}

/* LOGOUT */
async function logout() {
  await supabaseClient.auth.signOut();

  resetPitchForm();
  lockInvestors();
  closeAdminDashboard();
  updateAuthUI();

  const dropdown = document.getElementById("accountDropdown");
  if (dropdown) dropdown.classList.remove("show");
}

/* SCROLL TO PITCH */
function goToPitch() {
  const pitchSection = document.getElementById("pitch");
  if (pitchSection) {
    pitchSection.scrollIntoView({ behavior: "smooth" });
  }
}

/* SUBMIT PITCH DECK */
async function submitPitchDeck() {
  hidePitchMessage();

  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData.user;

  if (!user) {
    showPitchMessage("Please login first before submitting your pitch deck.");
    openAuth();
    return;
  }

  const payload = {
    user_id: user.id,
    founder_name: getValue("founder-name", "founderName"),
    email: getValue("email", "pitch-email", "founder-email"),
    phone: getValue("phone", "pitch-phone"),
    city: getValue("city", "regional-club"),
    startup_name: getValue("startup-name", "startupName", "idea-name"),
    idea_summary: getValue("idea-summary", "ideaSummary", "summary"),
    problem: getValue("problem-statement", "problem"),
    solution: getValue("startup-solution", "solution"),
    startup_stage: getValue("stage", "startup-stage"),
    support_needed: getValue("support-needed", "supportNeeded", "support", "supportNeed", "support_needed"),
    pitch_link: getValue("pitch-link", "pitchLink", "deck-link")
  };

  if (
    !payload.founder_name ||
    !payload.email ||
    !payload.phone ||
    !payload.city ||
    !payload.startup_name ||
    !payload.idea_summary ||
    !payload.problem ||
    !payload.solution ||
    !payload.startup_stage ||
    !payload.support_needed ||
    !payload.pitch_link ||
    payload.city === "Select your city" ||
    payload.startup_stage === "Select stage" ||
    payload.support_needed === "Select support"
  ) {
    showPitchMessage("Please fill all required pitch details before submitting.");
    return;
  }

  const { error } = await supabaseClient.from("pitch_decks").insert(payload);

  if (error) {
    console.error("Pitch insert error:", error);
    showPitchMessage(error.message);
    return;
  }

  resetPitchForm();
  showPitchMessage("Pitch deck submitted successfully. Investors unlocked.", "success");
  await trackEvent("pitch_submit");
  await trackEvent("investor_unlock");
  unlockInvestors(true);
}

/* CHECK IF USER ALREADY SUBMITTED PITCH */
async function checkPitchStatus() {
  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData.user;

  if (!user) {
    lockInvestors();
    return;
  }

  const { data, error } = await supabaseClient
    .from("pitch_decks")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (error) {
    console.log(error.message);
    lockInvestors();
    return;
  }

  if (data && data.length > 0) {
    unlockInvestors(false);
  } else {
    lockInvestors();
  }
}

/* INVESTOR SECTION */
function unlockInvestors(showSuccessMessage = false) {
  const investorSection = document.getElementById("investors");
  const successBox = document.getElementById("pitchSuccess");

  if (investorSection) {
    investorSection.classList.add("unlocked");
  }

  if (successBox) {
    if (showSuccessMessage) {
      successBox.classList.add("show");
    } else {
      successBox.classList.remove("show");
    }
  }

  loadInvestors();
}

function lockInvestors() {
  const investorSection = document.getElementById("investors");
  const successBox = document.getElementById("pitchSuccess");

  if (investorSection) {
    investorSection.classList.remove("unlocked");
  }

  if (successBox) {
    successBox.classList.remove("show");
  }
}
/* LOAD INVESTORS AS CARDS */
async function loadInvestors() {
  const { data, error } = await supabaseClient
    .from("investors")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.log(error.message);
    return;
  }

  const investorList =
    document.getElementById("investorList") ||
    document.querySelector(".carousel-track") ||
    document.querySelector(".investor-grid");

  if (!investorList) return;

  if (!data || data.length === 0) {
    investorList.innerHTML = `
      <div class="investor-card">
        <div class="investor-card-content">
          <h2>No Investors Yet</h2>
          <h4>Admin has not added investors</h4>
          <p>Investors will appear here after admin adds them.</p>
        </div>
      </div>
    `;
    return;
  }

  investorList.innerHTML = data
    .map((investor) => {
      const name = escapeHtml(investor.name || "Investor");
      const company = escapeHtml(investor.company || "Startup Investor");
      const sector = escapeHtml(investor.sector || "Startup Funding");
      const email = escapeHtml(investor.email || "");

      return `
        <div class="investor-card">
          <div class="investor-card-content">
            <img
              src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop"
              alt="${name}"
            />
            <h2>${name}</h2>
            <h4>${company}</h4>
            <p>${sector}</p>

            <div class="investor-card-buttons">
              ${
                email
                  ? `<a href="mailto:${email}">Connect</a>`
                  : `<button type="button">Connect</button>`
              }
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

/* ADMIN DASHBOARD */
function openAdminDashboard() {
  const adminDashboard = document.getElementById("adminDashboard");

  if (currentUserRole !== "admin") {
    showPitchMessage("Only admin can access this dashboard.");
    return;
  }

  if (adminDashboard) {
    adminDashboard.style.display = "block";
    adminDashboard.scrollIntoView({ behavior: "smooth" });
  }

  loadAdminStats();
  showAdminTab("dashboard");
}

function closeAdminDashboard() {
  const adminDashboard = document.getElementById("adminDashboard");
  if (adminDashboard) adminDashboard.style.display = "none";
}

function showAdminTab(tabName) {
  const adminContent = document.getElementById("adminContent");
  if (!adminContent) return;

  if (tabName === "dashboard") {
    loadAdminStats();
    adminContent.innerHTML = `
      <div class="admin-welcome-card">
        <h3>Welcome Admin</h3>
        <p>Manage investors, hubs, collaborations, pitch decks, and analytics from here.</p>
      </div>
    `;
  }

  if (tabName === "pitchDecks") {
    loadAdminPitchDecks();
  }

  if (tabName === "investors") {
    renderInvestorAdmin();
  }

  if (tabName === "hubs") {
    renderHubAdmin();
  }

  if (tabName === "collaborations") {
    renderCollaborationAdmin();
  }

  if (tabName === "analytics") {
    loadAnalytics();
  }
}

/* ADMIN STATS */
async function getCount(tableName) {
  const { count, error } = await supabaseClient
    .from(tableName)
    .select("*", { count: "exact", head: true });

  if (error) {
    console.log(error.message);
    return 0;
  }

  return count || 0;
}

async function loadAdminStats() {
  const statsBox = document.getElementById("adminStats");
  if (!statsBox) return;

  const users = await getCount("profiles");
  const visitors = await getCount("visitor_logs");
  const investors = await getCount("investors");
  const pitchDecks = await getCount("pitch_decks");
  const hubs = await getCount("hubs");
  const collaborations = await getCount("collaborations");

  statsBox.innerHTML = `
    <div class="admin-stat-card">
      <h3>${users}</h3>
      <p>Total Users</p>
    </div>

    <div class="admin-stat-card">
      <h3>${visitors}</h3>
      <p>Total Visitors</p>
    </div>

    <div class="admin-stat-card">
      <h3>${investors}</h3>
      <p>Total Investors</p>
    </div>

    <div class="admin-stat-card">
      <h3>${pitchDecks}</h3>
      <p>Total Pitch Decks</p>
    </div>

    <div class="admin-stat-card">
      <h3>${hubs}</h3>
      <p>Total Hubs</p>
    </div>

    <div class="admin-stat-card">
      <h3>${collaborations}</h3>
      <p>Total Collaborations</p>
    </div>
  `;
}

/* ADMIN PITCH DECKS */
async function loadAdminPitchDecks() {
  const adminContent = document.getElementById("adminContent");
  if (!adminContent) return;

  adminContent.innerHTML = `<p class="admin-loading">Loading pitch decks...</p>`;

  const { data, error } = await supabaseClient
    .from("pitch_decks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    adminContent.innerHTML = `<p class="admin-error">${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    adminContent.innerHTML = `<p class="admin-empty">No pitch decks submitted yet.</p>`;
    return;
  }

  adminContent.innerHTML = `
    <div class="pitch-admin-grid">
      ${data.map((pitch, index) => {
        return `
          <div class="pitch-admin-card">
            <div class="pitch-admin-top">
              <div>
                <span class="pitch-number">Pitch #${index + 1}</span>
                <h3>${escapeHtml(pitch.startup_name || "Untitled Startup")}</h3>
              </div>
              <span class="pitch-status">Submitted</span>
            </div>

            <div class="pitch-admin-details">
              <p><b>Founder</b><span>${escapeHtml(pitch.founder_name || "Not provided")}</span></p>
              <p><b>Email</b><span>${escapeHtml(pitch.email || "Not provided")}</span></p>
              <p><b>Phone</b><span>${escapeHtml(pitch.phone || "Not provided")}</span></p>
              <p><b>City</b><span>${escapeHtml(pitch.city || "Not provided")}</span></p>
              <p><b>Stage</b><span>${escapeHtml(pitch.startup_stage || "Not provided")}</span></p>
              <p><b>Support</b><span>${escapeHtml(pitch.support_needed || "Not provided")}</span></p>
            </div>

            <div class="pitch-text-block">
              <h4>Idea Summary</h4>
              <p>${escapeHtml(pitch.idea_summary || "Not provided")}</p>
            </div>

            <div class="pitch-text-block">
              <h4>Problem</h4>
              <p>${escapeHtml(pitch.problem || "Not provided")}</p>
            </div>

            <div class="pitch-text-block">
              <h4>Solution</h4>
              <p>${escapeHtml(pitch.solution || "Not provided")}</p>
            </div>

            <div class="admin-card-actions">
              ${
                pitch.pitch_link
                  ? `<a href="${escapeHtml(pitch.pitch_link)}" target="_blank" class="admin-action-btn">Open Pitch Link</a>`
                  : ""
              }
              ${
                pitch.email
                  ? `<a href="mailto:${escapeHtml(pitch.email)}" class="admin-action-btn">Contact Founder</a>`
                  : ""
              }
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

/* ADMIN INVESTORS */
function renderInvestorAdmin() {
  const adminContent = document.getElementById("adminContent");
  if (!adminContent) return;

  adminContent.innerHTML = `
    <div class="admin-form-card">
      <h3>Add Investor</h3>

      <input id="adminInvestorName" placeholder="Investor Name">
      <input id="adminInvestorCompany" placeholder="Company">
      <input id="adminInvestorSector" placeholder="Sector">
      <input id="adminInvestorEmail" placeholder="Email">

      <button type="button" onclick="addInvestor()">+ Add Investor</button>
    </div>

    <div id="adminInvestorList"></div>
  `;

  loadAdminInvestors();
}

async function addInvestor() {
  const name = getValue("adminInvestorName");
  const company = getValue("adminInvestorCompany");
  const sector = getValue("adminInvestorSector");
  const email = getValue("adminInvestorEmail");

  if (!name || !company || !sector || !email) {
    showAdminMessage("Please fill all investor details.");
    return;
  }

  const { error } = await supabaseClient.from("investors").insert({
    name,
    company,
    sector,
    email
  });

  if (error) {
    showAdminMessage(error.message);
    return;
  }

  showAdminMessage("Investor added successfully.", "success");
  renderInvestorAdmin();
  loadInvestors();
  loadAdminStats();
}
/* LOAD ADMIN INVESTORS */

async function loadAdminInvestors() {

  const list = document.getElementById("adminInvestorList");
  if (!list) return;

  const { data, error } = await supabaseClient
    .from("investors")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  if (!data.length) {
    list.innerHTML = "<p>No investors added yet.</p>";
    return;
  }

  list.innerHTML = data.map(inv => `
      <div class="admin-data-card">

          <h3>${inv.name}</h3>

          <p><b>Company:</b> ${inv.company}</p>

          <p><b>Sector:</b> ${inv.sector}</p>

          <p><b>Email:</b> ${inv.email}</p>

          <div class="admin-card-actions">

              <button onclick="deleteInvestor('${inv.id}')">
                  Delete
              </button>

          </div>

      </div>
  `).join("");

}

async function deleteInvestor(id){

    if(!confirm("Delete this investor?")) return;

    const {error}=await supabaseClient
    .from("investors")
    .delete()
    .eq("id",id);

    if(error){
        showAdminMessage(error.message);
        return;
    }

    showAdminMessage("Investor deleted","success");

    loadAdminInvestors();

    loadInvestors();

    loadAdminStats();

}

/* ===========================
   HUBS
=========================== */

function renderHubAdmin(){

const adminContent=document.getElementById("adminContent");

adminContent.innerHTML=`

<div class="admin-form-card">

<h3>Add Startup Hub</h3>

<input id="hubTitle" placeholder="Hub Name">

<input id="hubCity" placeholder="City">

<textarea id="hubDescription"
placeholder="Description"></textarea>

<button onclick="addHub()">
Add Hub
</button>

</div>

<div id="hubList"></div>

`;

loadHubs();

}

async function addHub(){

const title=getValue("hubTitle");

const city=getValue("hubCity");

const description=getValue("hubDescription");

if(!title||!city){

showAdminMessage("Fill all fields");

return;

}

const {error}=await supabaseClient

.from("hubs")

.insert({

title,

city,

description

});

if(error){

showAdminMessage(error.message);

return;

}

showAdminMessage("Hub Added","success");

renderHubAdmin();

loadAdminStats();

loadHubsAsCards();

}
async function loadHubs(){

const list=document.getElementById("hubList");

const {data,error}=await supabaseClient

.from("hubs")

.select("*")

.order("created_at",{ascending:false});

if(error){

list.innerHTML=error.message;

return;

}

list.innerHTML=data.map(h=>`

<div class="admin-data-card">

<h3>${h.title}</h3>

<p>${h.city}</p>

<p>${h.description||""}</p>

<button onclick="deleteHub('${h.id}')">

Delete

</button>

</div>

`).join("");

}

async function deleteHub(id){

await supabaseClient

.from("hubs")

.delete()

.eq("id",id);

renderHubAdmin();

loadAdminStats();

}

/* ===========================
COLLABORATIONS
=========================== */

function renderCollaborationAdmin(){

const adminContent=document.getElementById("adminContent");

adminContent.innerHTML=`

<div class="admin-form-card">

<h3>Add Collaboration</h3>

<input id="collabName" placeholder="Name">

<input id="collabType" placeholder="Type">

<input id="collabWebsite" placeholder="Website">

<textarea id="collabDescription"
placeholder="Description"></textarea>

<button onclick="addCollaboration()">

Add Collaboration

</button>

</div>

<div id="collaborationList"></div>

`;

loadCollaborations();

}

async function addCollaboration(){

const name=getValue("collabName");

const type=getValue("collabType");

const website=getValue("collabWebsite");

const description=getValue("collabDescription");

const {error}=await supabaseClient

.from("collaborations")

.insert({

name,

type,

website,

description

});

if(error){

showAdminMessage(error.message);

return;

}

showAdminMessage("Added","success");

renderCollaborationAdmin();

loadAdminStats();

}

async function loadCollaborations(){

const list=document.getElementById("collaborationList");

const {data}=await supabaseClient

.from("collaborations")

.select("*")

.order("created_at",{ascending:false});

list.innerHTML=data.map(c=>`

<div class="admin-data-card">

<h3>${c.name}</h3>

<p>${c.type}</p>

<p>${c.website||""}</p>

<p>${c.description||""}</p>

<button onclick="deleteCollaboration('${c.id}')">

Delete

</button>

</div>

`).join("");

}

async function deleteCollaboration(id){

await supabaseClient

.from("collaborations")

.delete()

.eq("id",id);

renderCollaborationAdmin();

loadAdminStats();

}
/* ===========================
   ANALYTICS
=========================== */

async function loadAnalytics() {

  const adminContent = document.getElementById("adminContent");
  if (!adminContent) return;

  adminContent.innerHTML = `<h2>Loading Analytics...</h2>`;

  const { data, error } = await supabaseClient
    .from("visitor_logs")
    .select("*");

  if (error) {
    adminContent.innerHTML = `<p>${error.message}</p>`;
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  const visitorsToday = data.filter(
    x =>
      x.event_type === "page_visit" &&
      x.created_at.startsWith(today)
  ).length;

  const loginsToday = data.filter(
    x =>
      x.event_type === "login" &&
      x.created_at.startsWith(today)
  ).length;

  const pitchSubmits = data.filter(
    x => x.event_type === "pitch_submit"
  ).length;

  const investorUnlocks = data.filter(
    x => x.event_type === "investor_unlock"
  ).length;

  const activeUsers = new Set(
    data.map(x => x.user_id)
  ).size;

  adminContent.innerHTML = `

<div class="analytics-grid">

<div class="admin-stat-card">
<h3>${visitorsToday}</h3>
<p>Visitors Today</p>
</div>

<div class="admin-stat-card">
<h3>${loginsToday}</h3>
<p>Logins Today</p>
</div>

<div class="admin-stat-card">
<h3>${pitchSubmits}</h3>
<p>Pitch Submits</p>
</div>

<div class="admin-stat-card">
<h3>${investorUnlocks}</h3>
<p>Investor Unlocks</p>
</div>

<div class="admin-stat-card">
<h3>${activeUsers}</h3>
<p>Active Users</p>
</div>

</div>

`;

}

/* ===========================
   PAGE LOAD
=========================== */

document.addEventListener("DOMContentLoaded", async function () {

  const pitchForm = document.querySelector(".pitch-form");

  if (pitchForm) {

    pitchForm.addEventListener("submit", function (event) {

      event.preventDefault();

      submitPitchDeck();

    });

  }

  resetPitchForm();

  await updateAuthUI();

  await checkPitchStatus();

  await trackEvent("page_visit");

});

/* ===========================
   CLOSE ACCOUNT MENU
=========================== */

document.addEventListener("click", function (event) {

  const accountMenu = document.getElementById("accountMenu");

  const dropdown = document.getElementById("accountDropdown");

  if (!accountMenu || !dropdown) return;

  if (!accountMenu.contains(event.target)) {

    dropdown.classList.remove("show");

  }

});

/* ===========================
   ESC KEY
=========================== */

document.addEventListener("keydown", function (event) {

  if (event.key === "Escape") {

    closeAuth();

    closeAdminDashboard();

    const dropdown = document.getElementById("accountDropdown");

    if (dropdown) {

      dropdown.classList.remove("show");

    }

  }

});

/* ===========================
   AUTO LOAD INVESTORS
=========================== */

setTimeout(() => {

  loadInvestors();

}, 1000);
async function loadHubsAsCards() {
  const hubList =
    document.getElementById("hubListPublic") ||
    document.querySelector(".clubs-grid");

  if (!hubList) return;

  const { data, error } = await supabaseClient
    .from("hubs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Hub load error:", error.message);
    return;
  }

  if (!data || data.length === 0) return;

  hubList.innerHTML = data.map((hub) => {
    return `
      <div class="club-card">
        <img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=600&fit=crop" alt="${escapeHtml(hub.title)}">
        <div class="club-overlay"></div>

        <div class="club-content">
          <h3>${escapeHtml(hub.title)}</h3>
          <p>${escapeHtml(hub.description || "Startup hub for founders and innovators.")}</p>

          <div class="club-meta">
            <span>📍 ${escapeHtml(hub.city || "India")}</span>
            <span>🚀 Startup Hub</span>
          </div>
        </div>

        <button class="club-button">Explore</button>
      </div>
    `;
  }).join("");
}

document.addEventListener("DOMContentLoaded", function () {
  loadHubsAsCards();
});