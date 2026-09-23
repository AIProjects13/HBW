"use strict";
/* ==========================================================================
   HBW Live Call Assistant — App logic
   Standalone, no server, no database. State lives in memory + localStorage
   (current call + previous call only) so a screen refresh never loses a
   live call in progress.
   ========================================================================== */

/* ---------------------------- Storage helpers ---------------------------- */
const STORE_KEYS = { draft: "hbw_draft_v1", current: "hbw_current_v1", previous: "hbw_previous_v1" };
const memoryStore = {};

function storageGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return memoryStore[key] || null;
  }
}
function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    memoryStore[key] = value;
  }
}
function storageRemove(key) {
  try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  delete memoryStore[key];
}

/* ---------------------------- Utilities ---------------------------- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function makeId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function truncateLabel(label) {
  return label.length > 62 ? label.slice(0, 59) + "…" : label;
}

/* ---------------------------- App state ---------------------------- */
const state = {
  screen: "start",
  callType: null,      // 'home' | 'auto'
  startedAt: null,
  answers: {},
  vehicles: [],
  otherDrivers: [],
  contact: {}
};

function schemaFor(type) { return type === "auto" ? AUTO_SCHEMA : HOME_SCHEMA; }

/* ---------------------------- Answer helpers ---------------------------- */
function isAnswered(block) {
  const v = state.answers[block.id];
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "object") {
    return Object.values(v).some(x => (typeof x === "boolean" ? x : (x != null && String(x).trim() !== "")));
  }
  return false;
}

function onAnswerChanged() {
  updateVisibility();
  updateProgress();
  saveDraftDebounced();
}

/* ---------------------------- Generic field builders ---------------------------- */
function mkField(label, value, onChange, opts) {
  opts = opts || {};
  const fw = document.createElement("div");
  fw.className = "compound-field" + (opts.span2 ? " span-2" : "");
  const lbl = document.createElement("label");
  lbl.textContent = label;
  fw.appendChild(lbl);
  const inp = document.createElement("input");
  inp.className = "field";
  inp.type = opts.inputType || "text";
  inp.placeholder = opts.placeholder || "";
  inp.value = value || "";
  inp.addEventListener("input", () => onChange(inp.value));
  fw.appendChild(inp);
  return fw;
}
function mkSelectField(label, value, options, onChange) {
  const fw = document.createElement("div");
  fw.className = "compound-field";
  const lbl = document.createElement("label");
  lbl.textContent = label;
  fw.appendChild(lbl);
  const sel = document.createElement("select");
  sel.className = "field";
  sel.innerHTML = "<option value=\"\">Select…</option>" + options.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
  sel.value = value || "";
  sel.addEventListener("change", () => onChange(sel.value));
  fw.appendChild(sel);
  return fw;
}

/* ---------------------------- Form render engine ---------------------------- */
const formEl = document.getElementById("callForm");

function renderForm() {
  formEl.innerHTML = "";
  const schema = schemaFor(state.callType);
  schema.forEach(block => {
    const node = renderBlock(block);
    if (node) formEl.appendChild(node);
  });
  updateVisibility();
  updateProgress();
}

function renderBlock(block) {
  switch (block.type) {
    case "script": return renderScript(block);
    case "section": return renderSection(block);
    case "question": return renderQuestion(block);
    case "vehicles": return renderVehiclesBlock();
    case "drivers": return renderDriversBlock();
    case "contact": return renderContactBlock();
    default: return null;
  }
}

function renderScript(block) {
  const div = document.createElement("div");
  div.className = "script-block";
  div.textContent = block.text;
  return div;
}

function renderSection(block) {
  const div = document.createElement("div");
  div.className = "section-block";
  div.innerHTML = `<h3>${escapeHtml(block.title)}</h3>` + (block.subtitle ? `<p>${escapeHtml(block.subtitle)}</p>` : "");
  return div;
}

function renderQuestion(block) {
  const card = document.createElement("div");
  card.className = "q-card" + (block.indent ? " is-indent" : "");
  card.dataset.blockId = block.id;

  const head = document.createElement("div");
  head.className = "q-card__head";
  head.innerHTML = `<span class="q-num">${escapeHtml(block.num || "•")}</span><span class="q-script">${escapeHtml(block.script)}</span>`;
  card.appendChild(head);

  if (block.note) {
    const note = document.createElement("p");
    note.className = "q-note" + (block.dqHint ? " is-dq" : "");
    note.textContent = block.note;
    card.appendChild(note);
  }

  const wrap = document.createElement("div");
  wrap.className = "q-input-wrap";
  wrap.appendChild(renderInput(block));
  card.appendChild(wrap);

  return card;
}

function renderInput(block) {
  const input = block.input;
  const id = block.id;

  if (input.kind === "select") {
    const sel = document.createElement("select");
    sel.className = "field";
    sel.innerHTML = "<option value=\"\">Select…</option>" + input.options.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
    sel.value = state.answers[id] || "";
    sel.addEventListener("change", () => { state.answers[id] = sel.value; onAnswerChanged(); });
    return sel;
  }

  if (input.kind === "textarea") {
    const ta = document.createElement("textarea");
    ta.className = "field";
    ta.rows = 2;
    ta.placeholder = input.placeholder || "";
    ta.value = state.answers[id] || "";
    ta.addEventListener("input", () => { state.answers[id] = ta.value; onAnswerChanged(); });
    return ta;
  }

  if (input.kind === "text") {
    const inp = document.createElement("input");
    inp.className = "field";
    inp.type = input.inputType || "text";
    inp.placeholder = input.placeholder || "";
    inp.value = state.answers[id] || "";
    inp.addEventListener("input", () => { state.answers[id] = inp.value; onAnswerChanged(); });
    return inp;
  }

  if (input.kind === "checks") {
    const wrap = document.createElement("div");
    wrap.className = "checks-grid";
    const current = state.answers[id] || {};
    input.options.forEach(opt => {
      const label = document.createElement("label");
      label.className = "check-pill";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!current[opt.key];
      cb.addEventListener("change", () => {
        const val = Object.assign({}, state.answers[id] || {});
        val[opt.key] = cb.checked;
        state.answers[id] = val;
        onAnswerChanged();
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(opt.label));
      wrap.appendChild(label);
    });
    return wrap;
  }

  if (input.kind === "compound") {
    const wrap = document.createElement("div");
    wrap.className = "compound-grid";
    const current = Object.assign({}, state.answers[id] || {});
    input.fields.forEach(f => {
      if (f.kind === "select") {
        wrap.appendChild(mkSelectField(f.label, current[f.key], f.options, val => {
          const v = Object.assign({}, state.answers[id] || {});
          v[f.key] = val;
          state.answers[id] = v;
          onAnswerChanged();
        }));
      } else if (f.kind === "check") {
        const fw = document.createElement("div");
        fw.className = "compound-field";
        const lbl = document.createElement("label");
        lbl.textContent = f.label;
        fw.appendChild(lbl);
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.style.width = "18px"; cb.style.height = "18px";
        cb.checked = !!current[f.key];
        cb.addEventListener("change", () => {
          const v = Object.assign({}, state.answers[id] || {});
          v[f.key] = cb.checked;
          state.answers[id] = v;
          onAnswerChanged();
        });
        fw.appendChild(cb);
        wrap.appendChild(fw);
      } else {
        wrap.appendChild(mkField(f.label, current[f.key], val => {
          const v = Object.assign({}, state.answers[id] || {});
          v[f.key] = val;
          state.answers[id] = v;
          onAnswerChanged();
        }, { inputType: f.inputType, placeholder: f.placeholder }));
      }
    });
    return wrap;
  }

  return document.createElement("div");
}

/* ---------------------------- Vehicles repeater (Auto) ---------------------------- */
function createVehicle() {
  return { id: makeId("v"), year: "", make: "", model: "", use: "", miles: "", fullCoverage: false, driver: "" };
}

function renderVehiclesBlock() {
  const wrap = document.createElement("div");
  wrap.className = "repeater";

  const cardsWrap = document.createElement("div");
  cardsWrap.className = "repeater-cards";
  cardsWrap.id = "vehicleCards";
  wrap.appendChild(cardsWrap);

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "repeater-add";
  addBtn.innerHTML = "<svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\"><path fill=\"currentColor\" d=\"M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z\"/></svg> Add Another Vehicle";
  addBtn.addEventListener("click", () => {
    state.vehicles.push(createVehicle());
    renderVehicleCards(cardsWrap);
    updateProgress();
    saveDraftDebounced();
  });
  wrap.appendChild(addBtn);

  if (state.vehicles.length === 0) state.vehicles.push(createVehicle());
  renderVehicleCards(cardsWrap);
  return wrap;
}

function renderVehicleCards(container) {
  container.innerHTML = "";
  state.vehicles.forEach((v, idx) => container.appendChild(renderVehicleCard(v, idx, container)));
}

function renderVehicleCard(v, idx, container) {
  const card = document.createElement("div");
  card.className = "repeater-card";

  const head = document.createElement("div");
  head.className = "repeater-card__head";
  const h4 = document.createElement("h4");
  h4.textContent = "Vehicle " + (idx + 1);
  head.appendChild(h4);
  if (state.vehicles.length > 1) {
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "repeater-remove";
    rm.textContent = "Remove";
    rm.addEventListener("click", () => {
      state.vehicles = state.vehicles.filter(x => x.id !== v.id);
      renderVehicleCards(container);
      updateProgress();
      saveDraftDebounced();
    });
    head.appendChild(rm);
  }
  card.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "compound-grid";
  grid.appendChild(mkField("Year", v.year, val => { v.year = val; saveDraftDebounced(); }, { inputType: "number", placeholder: "e.g. 2021" }));
  grid.appendChild(mkField("Make", v.make, val => { v.make = val; saveDraftDebounced(); }, { placeholder: "e.g. Toyota" }));
  grid.appendChild(mkField("Model", v.model, val => { v.model = val; saveDraftDebounced(); }, { placeholder: "e.g. Camry" }));
  grid.appendChild(mkSelectField("Vehicle Use", v.use, ["Commute", "Pleasure", "Business", "Farm"], val => { v.use = val; saveDraftDebounced(); }));
  grid.appendChild(mkField("Daily Miles", v.miles, val => { v.miles = val; saveDraftDebounced(); }, { inputType: "number", placeholder: "e.g. 20" }));
  grid.appendChild(mkSelectField("Driver", v.driver, ["Primary", "Spouse/Partner", "Other"], val => { v.driver = val; saveDraftDebounced(); }));
  card.appendChild(grid);

  const covWrap = document.createElement("label");
  covWrap.className = "check-pill";
  covWrap.style.marginTop = "10px";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = !!v.fullCoverage;
  cb.addEventListener("change", () => { v.fullCoverage = cb.checked; saveDraftDebounced(); });
  covWrap.appendChild(cb);
  covWrap.appendChild(document.createTextNode("Has Full Coverage"));
  card.appendChild(covWrap);

  return card;
}

/* ---------------------------- Other drivers repeater (Auto) ---------------------------- */
function createDriver() { return { id: makeId("d"), name: "", dob: "" }; }

function renderDriversBlock() {
  const wrap = document.createElement("div");
  wrap.className = "repeater";
  wrap.id = "driversRepeaterWrap";

  const label = document.createElement("div");
  label.className = "field-label";
  label.style.marginLeft = "0";
  label.textContent = "Other Driver Details";
  wrap.appendChild(label);

  const cardsWrap = document.createElement("div");
  cardsWrap.className = "repeater-cards";
  cardsWrap.id = "driverCards";
  wrap.appendChild(cardsWrap);

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "repeater-add";
  addBtn.innerHTML = "<svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\"><path fill=\"currentColor\" d=\"M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z\"/></svg> Add Another Driver";
  addBtn.addEventListener("click", () => {
    state.otherDrivers.push(createDriver());
    renderDriverCards(cardsWrap);
    saveDraftDebounced();
  });
  wrap.appendChild(addBtn);

  renderDriverCards(cardsWrap);
  return wrap;
}

function renderDriverCards(container) {
  container.innerHTML = "";
  state.otherDrivers.forEach((d, idx) => container.appendChild(renderDriverCard(d, idx, container)));
}

function renderDriverCard(d, idx, container) {
  const card = document.createElement("div");
  card.className = "repeater-card";
  const head = document.createElement("div");
  head.className = "repeater-card__head";
  const h4 = document.createElement("h4");
  h4.textContent = "Driver " + (idx + 1);
  head.appendChild(h4);
  const rm = document.createElement("button");
  rm.type = "button";
  rm.className = "repeater-remove";
  rm.textContent = "Remove";
  rm.addEventListener("click", () => {
    state.otherDrivers = state.otherDrivers.filter(x => x.id !== d.id);
    renderDriverCards(container);
    saveDraftDebounced();
  });
  head.appendChild(rm);
  card.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "compound-grid";
  grid.appendChild(mkField("Name", d.name, val => { d.name = val; saveDraftDebounced(); }, { placeholder: "Full name" }));
  grid.appendChild(mkField("DOB or Age", d.dob, val => { d.dob = val; saveDraftDebounced(); }, { placeholder: "MM/DD/YYYY or age" }));
  card.appendChild(grid);
  return card;
}

/* ---------------------------- Contact block ---------------------------- */
function renderContactBlock() {
  const card = document.createElement("div");
  card.className = "q-card";
  const head = document.createElement("div");
  head.className = "q-card__head";
  head.innerHTML = "<span class=\"q-num\">📌</span><span class=\"q-script\">Address &amp; Contact</span>";
  card.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "contact-grid";
  const c = state.contact;

  grid.appendChild(mkField("Street Address", c.street, val => { c.street = val; saveDraftDebounced(); }, { placeholder: "1234 Main St" }));
  grid.appendChild(mkField("Apt / Unit", c.apt, val => { c.apt = val; saveDraftDebounced(); }, { placeholder: "Apt 12" }));
  grid.appendChild(mkField("City", c.city, val => { c.city = val; saveDraftDebounced(); }, { placeholder: "City" }));
  grid.appendChild(mkField("State", c.stateAbbr, val => { c.stateAbbr = val; saveDraftDebounced(); }, { placeholder: "OR" }));
  grid.appendChild(mkField("Zip Code", c.zip, val => { c.zip = val; saveDraftDebounced(); }, { placeholder: "97475" }));
  grid.appendChild(mkField("Secondary Phone", c.secondaryPhone, val => { c.secondaryPhone = val; saveDraftDebounced(); }, { placeholder: "(555) 555-5555" }));
  grid.appendChild(mkSelectField("Language", c.language, ["English", "Spanish", "Other"], val => { c.language = val; saveDraftDebounced(); }));
  grid.appendChild(mkField("Remarks", c.remarks, val => { c.remarks = val; saveDraftDebounced(); }, { placeholder: "Anything else worth noting…", span2: true }));

  const wrap = document.createElement("div");
  wrap.className = "q-input-wrap";
  wrap.appendChild(grid);
  card.appendChild(wrap);
  return card;
}

/* ---------------------------- Visibility / progress ---------------------------- */
function updateVisibility() {
  const schema = schemaFor(state.callType);
  schema.forEach(block => {
    if (block.type !== "question") return;
    const card = formEl.querySelector('[data-block-id="' + block.id + '"]');
    if (!card) return;
    const visible = block.conditional ? !!block.conditional(state.answers) : true;
    if (visible && card.hidden) {
      card.hidden = false;
      card.classList.add("q-enter");
    } else if (!visible) {
      card.hidden = true;
    }
    card.classList.toggle("is-answered", isAnswered(block));
  });

  const driversWrap = document.getElementById("driversRepeaterWrap");
  if (driversWrap) {
    const show = state.answers.a_q15 === "Yes";
    driversWrap.hidden = !show;
    if (show && state.otherDrivers.length === 0) {
      state.otherDrivers.push(createDriver());
      renderDriverCards(document.getElementById("driverCards"));
    }
  }
}

function updateProgress() {
  const schema = schemaFor(state.callType);
  let total = 0, answered = 0;
  schema.forEach(block => {
    if (block.type !== "question") return;
    const visible = block.conditional ? !!block.conditional(state.answers) : true;
    if (!visible) return;
    total++;
    if (isAnswered(block)) answered++;
  });
  const pct = total ? Math.round((answered / total) * 100) : 0;
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressLabel").textContent = answered + " / " + total + " answered";
}

/* ---------------------------- Draft persistence ---------------------------- */
let draftTimer = null;
function saveDraftDebounced() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraftNow, 350);
}
function saveDraftNow() {
  if (!state.callType) return;
  storageSet(STORE_KEYS.draft, {
    callType: state.callType,
    startedAt: state.startedAt,
    answers: state.answers,
    vehicles: state.vehicles,
    otherDrivers: state.otherDrivers,
    contact: state.contact
  });
}

/* ---------------------------- Screen navigation ---------------------------- */
function showScreen(name) {
  state.screen = name;
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + name).classList.add("active");
  document.getElementById("timerWrap").hidden = name !== "call";
  document.getElementById("callBadge").textContent = name === "call"
    ? (state.callType === "auto" ? "Auto Call in progress" : "Home Call in progress")
    : "No active call";
  if (name === "start") refreshResumeBanner();
  if (name === "summary") renderSummaryScreen();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------------------------- Timer ---------------------------- */
let timerInterval = null;
function startTimer() {
  stopTimer();
  updateTimerText();
  timerInterval = setInterval(updateTimerText, 1000);
}
function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}
function updateTimerText() {
  if (!state.startedAt) return;
  const s = Math.floor((Date.now() - state.startedAt) / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  document.getElementById("timerText").textContent = mm + ":" + ss;
}

/* ---------------------------- Call lifecycle ---------------------------- */
function updateCallTypeChip() {
  const chip = document.getElementById("callTypeChip");
  chip.textContent = state.callType === "auto" ? "Auto Call" : "Home Call";
  chip.classList.toggle("is-auto", state.callType === "auto");
}

function startNewCall(type) {
  state.callType = type;
  state.startedAt = Date.now();
  state.answers = {};
  state.vehicles = [];
  state.otherDrivers = [];
  state.contact = {};
  storageRemove(STORE_KEYS.draft);
  renderForm();
  updateCallTypeChip();
  startTimer();
  showScreen("call");
  saveDraftNow();
}

async function onCampaignCardClick(type) {
  const draft = storageGet(STORE_KEYS.draft);
  if (draft) {
    const ok = await showConfirm("Start a new call?", "You have a saved in-progress call. Starting a new one will discard it.");
    if (!ok) return;
  }
  startNewCall(type);
}

function resumeDraftCall() {
  const draft = storageGet(STORE_KEYS.draft);
  if (!draft) return;
  state.callType = draft.callType;
  state.startedAt = draft.startedAt;
  state.answers = draft.answers || {};
  state.vehicles = draft.vehicles || [];
  state.otherDrivers = draft.otherDrivers || [];
  state.contact = draft.contact || {};
  renderForm();
  updateCallTypeChip();
  startTimer();
  showScreen("call");
}

async function handleCancelCall() {
  const ok = await showConfirm("Discard this call?", "All answers entered so far will be lost. This cannot be undone.");
  if (!ok) return;
  storageRemove(STORE_KEYS.draft);
  stopTimer();
  state.callType = null;
  showScreen("start");
}

async function handleFinishCall() {
  const ok = await showConfirm("Finish this call?", "This saves the summary as your current call. The previous “current” call moves to Previous, and anything older is discarded.");
  if (!ok) return;
  const summary = buildSummary();
  const existingCurrent = storageGet(STORE_KEYS.current);
  if (existingCurrent) storageSet(STORE_KEYS.previous, existingCurrent);
  storageSet(STORE_KEYS.current, summary);
  storageRemove(STORE_KEYS.draft);
  stopTimer();
  state.callType = null;
  showToast("Call saved to summary");
  showScreen("summary");
}

function buildSummary() {
  return {
    callType: state.callType,
    startedAt: state.startedAt,
    finishedAt: Date.now(),
    answers: state.answers,
    vehicles: state.vehicles,
    otherDrivers: state.otherDrivers,
    contact: state.contact
  };
}

/* ---------------------------- Resume banner ---------------------------- */
function refreshResumeBanner() {
  const banner = document.getElementById("resumeBanner");
  const draft = storageGet(STORE_KEYS.draft);
  if (!draft) { banner.hidden = true; return; }
  banner.hidden = false;
  const typeName = draft.callType === "auto" ? "Auto Call" : "Home Call";
  document.getElementById("resumeTitle").textContent = "Resume " + typeName + " in progress";

  const schema = schemaFor(draft.callType);
  let total = 0, answered = 0;
  const draftAnswers = draft.answers || {};
  schema.forEach(b => {
    if (b.type !== "question") return;
    const visible = b.conditional ? !!b.conditional(draftAnswers) : true;
    if (!visible) return;
    total++;
    const v = draftAnswers[b.id];
    if (v == null) return;
    if (typeof v === "string" && v.trim() !== "") answered++;
    else if (typeof v === "object" && Object.values(v).some(x => (typeof x === "boolean" ? x : (x != null && String(x).trim() !== "")))) answered++;
  });

  const started = draft.startedAt ? new Date(draft.startedAt) : null;
  document.getElementById("resumeSub").textContent =
    (started ? "Started " + started.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " — " : "") +
    answered + " / " + total + " answered";
}

/* ---------------------------- Confirm modal ---------------------------- */
function showConfirm(title, body) {
  return new Promise(resolve => {
    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmBody").textContent = body;
    const overlay = document.getElementById("modalConfirm");
    overlay.hidden = false;
    const okBtn = document.getElementById("confirmOk");
    const cancelBtn = document.getElementById("confirmCancel");
    function cleanup(result) {
      overlay.hidden = true;
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      resolve(result);
    }
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }
    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
  });
}

/* ---------------------------- Toast ---------------------------- */
let toastTimer = null;
function showToast(text) {
  const t = document.getElementById("toast");
  document.getElementById("toastText").textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

/* ---------------------------- Rebuttals / Dispositions modals ---------------------------- */
function openModal(id) { document.getElementById(id).hidden = false; }
function closeModal(id) { document.getElementById(id).hidden = true; }

function openRebuttals() {
  document.getElementById("rebuttalsSearch").value = "";
  renderRebuttals("");
  openModal("modalRebuttals");
}
function openDispositions() {
  document.getElementById("dispositionsSearch").value = "";
  renderDispositions("");
  openModal("modalDispositions");
}

function renderRebuttals(filter) {
  const list = document.getElementById("rebuttalsList");
  list.innerHTML = "";
  const f = filter.trim().toLowerCase();
  const matches = REBUTTALS.filter(r =>
    !f || r.objection.toLowerCase().includes(f) || r.answers.some(a => a.toLowerCase().includes(f))
  );
  matches.forEach(r => {
    const item = document.createElement("div");
    item.className = "rebuttal-item";
    item.innerHTML = `<h4>“${escapeHtml(r.objection)}”</h4><ul>${r.answers.map(a => `<li>${escapeHtml(a)}</li>`).join("")}</ul>`;
    list.appendChild(item);
  });
  if (!matches.length) list.innerHTML = '<p style="color:var(--text-faint);font-size:13px;">No matches.</p>';
}

function renderDispositions(filter) {
  const list = document.getElementById("dispositionsList");
  list.innerHTML = "";
  const f = filter.trim().toLowerCase();
  const matches = DISPOSITIONS.filter(d =>
    !f || d.code.toLowerCase().includes(f) || d.name.toLowerCase().includes(f) || d.desc.toLowerCase().includes(f)
  );
  matches.forEach(d => {
    const item = document.createElement("div");
    item.className = "disposition-item" + (d.excluded ? " is-excluded" : "");
    item.innerHTML = `
      <span class="disposition-code">${escapeHtml(d.code)}</span>
      <div class="disposition-text">
        <h4>${escapeHtml(d.name)}${d.excluded ? '<span class="disposition-badge">Not used</span>' : ""}</h4>
        <p>${escapeHtml(d.desc)}</p>
      </div>`;
    list.appendChild(item);
  });
  if (!matches.length) list.innerHTML = '<p style="color:var(--text-faint);font-size:13px;">No matches.</p>';
}

/* ---------------------------- Summary screen ---------------------------- */
function formatAnswerValue(block, value) {
  const input = block.input;
  if (value == null) return "";
  if (input.kind === "checks") {
    return input.options.filter(o => value[o.key]).map(o => o.label).join(", ");
  }
  if (input.kind === "compound") {
    return input.fields
      .map(f => {
        const v = value[f.key];
        if (f.kind === "check") return v ? f.label : null;
        return v && String(v).trim() !== "" ? (f.label + ": " + v) : null;
      })
      .filter(Boolean)
      .join(" • ");
  }
  return String(value).trim();
}

function buildSummaryRows(summary) {
  const schema = schemaFor(summary.callType);
  const rows = [];

  schema.forEach(block => {
    if (block.type !== "question") return;
    const answers = summary.answers || {};
    const visible = block.conditional ? !!block.conditional(answers) : true;
    if (!visible) return;
    const value = answers[block.id];
    const text = formatAnswerValue(block, value);
    if (!text) return;
    const rawLabel = (block.num ? block.num + ". " : "") + block.script.split("(")[0].trim().replace(/[:?]\s*$/, "");
    rows.push({ label: truncateLabel(rawLabel), value: text });
  });

  if (summary.vehicles && summary.vehicles.length) {
    const real = summary.vehicles.filter(v => v.year || v.make || v.model);
    if (real.length) {
      rows.push({ subhead: "Vehicles" });
      real.forEach((v, i) => {
        const bits = [v.year, v.make, v.model].filter(Boolean).join(" ");
        const extras = [];
        if (v.use) extras.push(v.use);
        if (v.miles) extras.push(v.miles + " mi/day");
        if (v.driver) extras.push(v.driver);
        if (v.fullCoverage) extras.push("Full Coverage");
        rows.push({ label: "Vehicle " + (i + 1), value: (bits || "—") + (extras.length ? " (" + extras.join(", ") + ")" : "") });
      });
    }
  }

  if (summary.otherDrivers && summary.otherDrivers.length) {
    const real = summary.otherDrivers.filter(d => d.name || d.dob);
    if (real.length) {
      rows.push({ subhead: "Other Drivers" });
      real.forEach((d, i) => {
        rows.push({ label: "Driver " + (i + 1), value: [d.name, d.dob].filter(Boolean).join(" — ") });
      });
    }
  }

  const c = summary.contact || {};
  const addressParts = [c.street, c.apt, c.city, c.stateAbbr, c.zip].filter(Boolean);
  if (addressParts.length || c.secondaryPhone || c.language || c.remarks) {
    rows.push({ subhead: "Contact" });
    if (addressParts.length) rows.push({ label: "Address", value: addressParts.join(", ") });
    if (c.secondaryPhone) rows.push({ label: "Secondary Phone", value: c.secondaryPhone });
    if (c.language) rows.push({ label: "Language", value: c.language });
    if (c.remarks) rows.push({ label: "Remarks", value: c.remarks });
  }

  return rows;
}

function renderSummaryScreen() {
  const grid = document.getElementById("summaryGrid");
  grid.innerHTML = "";
  grid.appendChild(renderSummaryCard(storageGet(STORE_KEYS.current), "current"));
  grid.appendChild(renderSummaryCard(storageGet(STORE_KEYS.previous), "previous"));
}

function renderSummaryCard(summary, kind) {
  const card = document.createElement("div");
  card.className = "summary-card";

  if (!summary) {
    card.classList.add("summary-card--empty");
    const p = document.createElement("p");
    p.textContent = kind === "current" ? "No call saved yet. Finish a call to see it here." : "No previous call yet.";
    card.appendChild(p);
    return card;
  }

  const typeName = summary.callType === "auto" ? "Auto Call" : "Home Call";
  const finished = summary.finishedAt ? new Date(summary.finishedAt) : null;
  const durationSec = summary.finishedAt && summary.startedAt ? Math.max(0, Math.round((summary.finishedAt - summary.startedAt) / 1000)) : null;
  const durationText = durationSec != null ? (Math.floor(durationSec / 60) + "m " + (durationSec % 60) + "s") : "";

  const head = document.createElement("div");
  head.className = "summary-card__head";
  head.innerHTML = `
    <div class="summary-card__head-left">
      <span class="summary-tag ${kind === "current" ? "summary-tag--current" : "summary-tag--previous"}">${kind === "current" ? "Current" : "Previous"}</span>
      <h3>${escapeHtml(typeName)}</h3>
    </div>
    <span class="summary-meta">${finished ? escapeHtml(finished.toLocaleString([], { dateStyle: "short", timeStyle: "short" })) : ""}${durationText ? " · " + escapeHtml(durationText) : ""}</span>
  `;
  card.appendChild(head);

  const rows = buildSummaryRows(summary);
  if (!rows.length) {
    const p = document.createElement("p");
    p.style.color = "var(--text-faint)";
    p.style.fontSize = "13px";
    p.textContent = "No details were captured on this call.";
    card.appendChild(p);
    return card;
  }

  rows.forEach(r => {
    if (r.subhead) {
      const sh = document.createElement("div");
      sh.className = "summary-subhead";
      sh.textContent = r.subhead;
      card.appendChild(sh);
      return;
    }
    const row = document.createElement("div");
    row.className = "summary-row";
    row.innerHTML = `<span class="summary-row__label">${escapeHtml(r.label)}</span><span class="summary-row__value">${escapeHtml(r.value)}</span>`;
    card.appendChild(row);
  });

  return card;
}

/* ---------------------------- Event wiring ---------------------------- */
function wireEvents() {
  document.getElementById("brandHome").addEventListener("click", () => showScreen("start"));
  document.getElementById("btnBackToStart").addEventListener("click", () => showScreen("start"));
  document.getElementById("btnSummaryNav").addEventListener("click", () => showScreen("summary"));

  document.getElementById("cardHome").addEventListener("click", () => onCampaignCardClick("home"));
  document.getElementById("cardAuto").addEventListener("click", () => onCampaignCardClick("auto"));

  document.getElementById("btnResumeDraft").addEventListener("click", resumeDraftCall);
  document.getElementById("btnDiscardDraft").addEventListener("click", async () => {
    const ok = await showConfirm("Discard saved call?", "This in-progress call will be permanently removed.");
    if (!ok) return;
    storageRemove(STORE_KEYS.draft);
    refreshResumeBanner();
  });

  document.getElementById("btnCancelCall").addEventListener("click", handleCancelCall);
  document.getElementById("btnCancelCall2").addEventListener("click", handleCancelCall);
  document.getElementById("btnFinishCall").addEventListener("click", handleFinishCall);
  document.getElementById("btnFinishCall2").addEventListener("click", handleFinishCall);

  document.getElementById("btnRebuttals").addEventListener("click", openRebuttals);
  document.getElementById("btnRebuttalsInline").addEventListener("click", openRebuttals);
  document.getElementById("btnDispositions").addEventListener("click", openDispositions);
  document.getElementById("btnDispositionsInline").addEventListener("click", openDispositions);

  document.getElementById("rebuttalsSearch").addEventListener("input", e => renderRebuttals(e.target.value));
  document.getElementById("dispositionsSearch").addEventListener("input", e => renderDispositions(e.target.value));
  document.getElementById("rebuttalsNote").textContent = REBUTTALS_NOTE;

  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", e => closeModal(e.target.closest(".modal-overlay").id));
  });
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(overlay.id); });
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay").forEach(o => { if (!o.hidden) o.hidden = true; });
    }
  });
}

/* ---------------------------- Init ---------------------------- */
function init() {
  wireEvents();
  showScreen("start");
}
init();
