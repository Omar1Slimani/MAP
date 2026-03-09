// ===== Viewer Mode =====
let viewerMode = true; // Default: viewer mode (read-only)

// ===== Storage =====
const STORAGE_KEY = '1W3Xo9dbv21jbXcYy1DhmYKKWoJOHf-4fO1_Qlyh8ZWo';

function getState() {
  try { const d = localStorage.getItem(STORAGE_KEY); if (d) return JSON.parse(d); } catch {}
  return { msans: [], srs: [], pcs: [], abonnes: [] };
}
function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

function getMSANs() { return getState().msans; }
function getSRs() { return getState().srs; }
function getPCs() { return getState().pcs; }
function getAbonnes() { return getState().abonnes; }

function addMSAN(m) { const s = getState(); s.msans.push(m); saveState(s); }
function addSR(r) { const s = getState(); s.srs.push(r); saveState(s); }
function addPC(p) { const s = getState(); s.pcs.push(p); saveState(s); }
function addAbonne(a) { const s = getState(); s.abonnes.push(a); saveState(s); }
function updateMSAN(m) { const s = getState(); const i = s.msans.findIndex(x => x.id === m.id); if (i >= 0) s.msans[i] = m; saveState(s); }
function updateSR(r) { const s = getState(); const i = s.srs.findIndex(x => x.id === r.id); if (i >= 0) s.srs[i] = r; saveState(s); }
function updatePC(p) { const s = getState(); const i = s.pcs.findIndex(x => x.id === p.id); if (i >= 0) s.pcs[i] = p; saveState(s); }

function deleteMSAN(id) { const s = getState(); s.msans = s.msans.filter(x => x.id !== id); s.abonnes = s.abonnes.filter(a => a.msanId !== id); saveState(s); }
function deleteSR(id) { const s = getState(); s.srs = s.srs.filter(x => x.id !== id); s.abonnes = s.abonnes.filter(a => a.srId !== id); saveState(s); }
function deletePC(id) { const s = getState(); s.pcs = s.pcs.filter(x => x.id !== id); s.abonnes = s.abonnes.filter(a => a.pcId !== id); saveState(s); }

// ===== Data factories =====
function createPorts(count, start = 0) {
  return Array.from({ length: count }, (_, i) => ({ number: start + i, status: 'empty' }));
}
function createDispos(count) {
  return Array.from({ length: count }, (_, i) => ({ number: i + 1, paires: createPorts(28, 1) }));
}
function createTite(num) { return { number: num, dispos: createDispos(4) }; }
function createDistributionTite(num) { return { number: num, dispos: createDispos(4) }; }
function createCarte(num) { return { number: num, ports: createPorts(64, 0) }; }
function uuid() { return crypto.randomUUID(); }

// ===== Map =====
let map, markersLayer;
let pickingCoords = false, coordsCallback = null;

function initMap() {
  map = L.map('map').setView([35.006, -5.908], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  map.on('click', function (e) {
    if (pickingCoords && coordsCallback) {
      coordsCallback(e.latlng.lat, e.latlng.lng);
      coordsCallback = null;
      pickingCoords = false;
      document.getElementById('pickBanner').classList.add('hidden');
    }
  });

  refreshMarkers();
}

function makeDeviceIcon(name, bgColor) {
  return L.divIcon({
    html: `<div style="background:${bgColor};color:#fff;font-weight:bold;font-size:11px;padding:3px 8px;border-radius:5px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.5);text-shadow:0 1px 2px rgba(0,0,0,0.5);">${name}</div>`,
    className: '',
    iconSize: null,
    iconAnchor: [30, 14],
  });
}

function refreshMarkers() {
  markersLayer.clearLayers();
  const hoverInfo = document.getElementById('hover-info');

  getMSANs().forEach(m => {
    const icon = makeDeviceIcon(m.name, 'hsl(0,85%,45%)');
    const marker = L.marker([m.lat, m.lng], { icon });
    marker.on('mouseover', () => { hoverInfo.textContent = m.name; });
    marker.on('mouseout', () => { hoverInfo.textContent = ''; });
    marker.bindPopup(`<div style="background:#111;color:#fff;padding:10px;border-radius:6px;"><strong style="color:hsl(0,85%,55%);">📡 MSAN: ${m.name}</strong><br/><span style="color:#ccc;">Type: ${m.type === 'indoor' ? 'Indoor' : 'Outdoor'}</span><br/><span style="color:#ccc;">Cartes: ${m.cartes.length} | Fermes: ${m.fermes.length}</span><br/><button onclick="openDetail('msan','${m.id}')" style="margin-top:6px;padding:4px 12px;background:hsl(0,85%,45%);color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Ouvrir détails</button></div>`, {className:'dark-popup'});
    markersLayer.addLayer(marker);
  });
  getSRs().forEach(s => {
    const icon = makeDeviceIcon(s.name, 'hsl(35,90%,45%)');
    const marker = L.marker([s.lat, s.lng], { icon });
    marker.on('mouseover', () => { hoverInfo.textContent = s.name; });
    marker.on('mouseout', () => { hoverInfo.textContent = ''; });
    marker.bindPopup(`<div style="background:#111;color:#fff;padding:10px;border-radius:6px;"><strong style="color:hsl(35,90%,55%);">🔌 SR: ${s.name}</strong><br/><span style="color:#ccc;">Transport: ${s.transportFermes ? s.transportFermes.length : 0} fermes</span><br/><span style="color:#ccc;">Distribution: ${s.distributionTites.length} tites</span><br/><button onclick="openDetail('sr','${s.id}')" style="margin-top:6px;padding:4px 12px;background:hsl(35,90%,45%);color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Ouvrir détails</button></div>`, {className:'dark-popup'});
    markersLayer.addLayer(marker);
  });
  getPCs().forEach(p => {
    const icon = makeDeviceIcon('PC ' + p.number, 'hsl(145,65%,42%)');
    const marker = L.marker([p.lat, p.lng], { icon });
    marker.on('mouseover', () => { hoverInfo.textContent = 'PC ' + p.number; });
    marker.on('mouseout', () => { hoverInfo.textContent = ''; });
    marker.bindPopup(`<div style="background:#111;color:#fff;padding:10px;border-radius:6px;"><strong style="color:hsl(145,65%,50%);">📦 PC: ${p.number}</strong><br/><button onclick="openDetail('pc','${p.id}')" style="margin-top:6px;padding:4px 12px;background:hsl(145,65%,42%);color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Ouvrir détails</button></div>`, {className:'dark-popup'});
    markersLayer.addLayer(marker);
  });
}

// ===== Modal helpers =====
function showModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modal').classList.remove('hidden');
}
function hideModal() { document.getElementById('modal').classList.add('hidden'); }

// ===== Port choice modal (with movie option) =====
function showPortChoice(callback) {
  const html = `
    <div class="noc-header"><span>État du port</span><span style="cursor:pointer" onclick="hidePortChoice()">✕</span></div>
    <div class="noc-body space-y">
      <div class="device-card" onclick="portChoiceResult('empty')"><span class="text-muted font-bold">○ Port vide</span><p class="text-xs text-muted">Par défaut - non utilisé</p></div>
      <div class="device-card" onclick="portChoiceResult('ok')"><span class="text-success font-bold">✓ Port bon</span><p class="text-xs text-muted">Fonctionne correctement</p></div>
      <div class="device-card" onclick="portChoiceResult('bad')"><span class="text-destructive font-bold">✗ Port cassé</span><p class="text-xs text-muted">En panne / défectueux</p></div>
      <div class="device-card" onclick="portChoiceResult('movie')"><span class="text-warning font-bold">⚠ Port movie</span><p class="text-xs text-muted">En cours de modification</p></div>
    </div>
  `;
  document.getElementById('portChoiceContent').innerHTML = html;
  document.getElementById('portChoiceModal').classList.remove('hidden');
  window._portChoiceCallback = callback;
}
function hidePortChoice() { document.getElementById('portChoiceModal').classList.add('hidden'); }
function portChoiceResult(status) {
  hidePortChoice();
  if (window._portChoiceCallback) window._portChoiceCallback(status);
}

// ===== Picking coords =====
function startPickCoords(cb) {
  coordsCallback = cb;
  pickingCoords = true;
  document.getElementById('pickBanner').classList.remove('hidden');
  hideModal();
}

// ===== Toolbar =====
function toggleToolbar() {
  document.getElementById('toolbar').classList.toggle('hidden');
}

function openToolbarMenu(type) {
  // Ask for user code first
  showModal(`
    <div class="noc-header"><span>🔐 Authentification</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div>
    <div class="noc-body space-y">
      <p class="text-muted text-sm">Entrez votre code utilisateur</p>
      <input id="pwInput" type="password" class="form-input" placeholder="Code utilisateur" />
      <div id="pwError" class="text-destructive text-sm"></div>
      <button class="btn-primary" onclick="checkToolbarPassword('${type}')">Entrer</button>
      <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;">
        <button class="btn-secondary" style="width:100%;font-size:12px;" onclick="showUserManagement()">👥 Gestion des utilisateurs</button>
      </div>
      <div style="margin-top:8px;">
        <button class="btn-secondary" style="width:100%;font-size:12px;" onclick="showHistoriquePanel()">📜 Historique des modifications</button>
      </div>
    </div>
  `);
  setTimeout(() => { const el = document.getElementById('pwInput'); if (el) el.focus(); }, 100);
}

async function checkToolbarPassword(type) {
  const code = document.getElementById('pwInput').value;
  if (!code) {
    document.getElementById('pwError').textContent = 'Veuillez entrer votre code';
    return;
  }

  // Try Google Sheets login first
  if (isGoogleSheetsConnected()) {
    const user = await gsLogin(code);
    if (!user) {
      document.getElementById('pwError').textContent = 'Code incorrect';
      return;
    }
  } else {
    // Fallback: accept code 1212 or any code stored locally
    const localUsers = JSON.parse(localStorage.getItem('telecom_users') || '[{"code":"1212","name":"Admin","role":"admin"}]');
    const found = localUsers.find(u => String(u.code) === String(code));
    if (!found) {
      document.getElementById('pwError').textContent = 'Code incorrect';
      return;
    }
    setCurrentUser(found);
  }

  viewerMode = false;
  if (type === 'creation') showCreationMenu();
  else if (type === 'modification') showModificationMenu();
  else if (type === 'suppression') showSuppressionMenu();
}

// ===== User Management =====
function showUserManagement() {
  showModal(`
    <div class="noc-header"><span>🔐 Accès Admin</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div>
    <div class="noc-body space-y">
      <p class="text-muted text-sm">Entrez le code admin pour gérer les utilisateurs</p>
      <input id="adminCodeInput" type="password" class="form-input" placeholder="Code admin" />
      <div id="adminError" class="text-destructive text-sm"></div>
      <button class="btn-primary" onclick="verifyAdminAndShowUsers()">Accéder</button>
    </div>
  `);
  setTimeout(() => { const el = document.getElementById('adminCodeInput'); if (el) el.focus(); }, 100);
}

async function verifyAdminAndShowUsers() {
  const code = document.getElementById('adminCodeInput').value;
  if (code !== '1212') {
    document.getElementById('adminError').textContent = 'Code admin incorrect';
    return;
  }
  await renderUserManagement();
}

async function renderUserManagement() {
  let users = [];
  if (isGoogleSheetsConnected()) {
    users = await gsGetUsers();
  } else {
    users = JSON.parse(localStorage.getItem('telecom_users') || '[{"code":"1212","name":"Admin","role":"admin"}]');
  }

  let html = `
    <div class="noc-header"><span>👥 Gestion des Utilisateurs</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div>
    <div class="noc-body space-y">
      <div style="max-height:300px;overflow-y:auto;">
        <table class="styled-table" style="width:100%">
          <thead><tr><th>Code</th><th>Nom</th><th>Rôle</th><th>Action</th></tr></thead>
          <tbody>`;

  users.forEach(u => {
    html += `<tr>
      <td>${u.code}</td>
      <td>${u.name}</td>
      <td>${u.role || 'user'}</td>
      <td>${u.code !== '1212' ? `<button class="btn-sm btn-destructive" onclick="removeUser('${u.code}')">🗑️</button>` : '<span style="color:var(--muted-foreground)">Admin</span>'}</td>
    </tr>`;
  });

  html += `</tbody></table></div>
      <hr style="border-color:var(--border);margin:12px 0"/>
      <h4 style="color:var(--foreground)">Ajouter un utilisateur</h4>
      <input id="newUserCode" class="form-input" placeholder="Code (ex: 5678)" />
      <input id="newUserName" class="form-input" placeholder="Nom" />
      <button class="btn-primary" onclick="addNewUser()">Ajouter</button>
      <div id="addUserMsg" class="text-sm" style="margin-top:4px;"></div>
    </div>`;

  showModal(html);
}

async function addNewUser() {
  const code = document.getElementById('newUserCode').value.trim();
  const name = document.getElementById('newUserName').value.trim();
  const msgEl = document.getElementById('addUserMsg');

  if (!code || !name) {
    msgEl.textContent = '⚠️ Veuillez remplir tous les champs';
    msgEl.style.color = 'var(--destructive)';
    return;
  }

  if (isGoogleSheetsConnected()) {
    const result = await gsAddUser(code, name);
    if (result && result.error) {
      msgEl.textContent = '❌' + result.error;
      msgEl.style.color = 'var(--destructive)';
      return;
    }
  } else {
    const users = JSON.parse(localStorage.getItem('telecom_users') || '[{"code":"1212","name":"Admin","role":"admin"}]');
    if (users.find(u => String(u.code) === String(code))) {
      msgEl.textContent = 'Ce code existe déjà';
      msgEl.style.color = 'var(--destructive)';
      return;
    }
    users.push({ code, name, role: 'user', created_at: new Date().toISOString() });
    localStorage.setItem('telecom_users', JSON.stringify(users));
  }

  msgEl.textContent = 'Utilisateur ajouté';
  msgEl.style.color = 'var(--success)';
  setTimeout(() => renderUserManagement(), 800);
}

async function removeUser(code) {
  if (!confirm('Supprimer cet utilisateur ?')) return;

  if (isGoogleSheetsConnected()) {
    await gsDeleteUser(code);
  } else {
    let users = JSON.parse(localStorage.getItem('telecom_users') || '[]');
    users = users.filter(u => String(u.code) !== String(code));
    localStorage.setItem('telecom_users', JSON.stringify(users));
  }
  await renderUserManagement();
}

// ===== Historique Panel =====
async function showHistoriquePanel() {
  showModal(`
    <div class="noc-header"><span>📜 Historique</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div>
    <div class="noc-body"><p class="text-muted">Chargement...</p></div>
  `);

  let history = [];
  if (isGoogleSheetsConnected()) {
    history = await gsGetHistorique();
  } else {
    history = JSON.parse(localStorage.getItem('telecom_historique') || '[]');
  }

  let html = `
    <div class="noc-header"><span>📜 Historique des Modifications</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div>
    <div class="noc-body">`;

  if (history.length === 0) {
    html += '<p class="text-muted">Aucune modification enregistrée</p>';
  } else {
    html += '<div style="max-height:400px;overflow-y:auto;"><table class="styled-table" style="width:100%"><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Cible</th></tr></thead><tbody>';
    history.forEach(h => {
      const date = h.timestamp ? new Date(h.timestamp).toLocaleString('fr-FR') : '';
      html += `<tr><td style="font-size:11px">${date}</td><td>${h.user_name || h.user_code}</td><td>${h.action}</td><td>${h.target_name || ''}</td></tr>`;
    });
    html += '</tbody></table></div>';
  }

  html += '</div>';
  showModal(html);
}

// ===== Log modification locally =====
function logModification(action, targetType, targetId, targetName, details = '') {
  const user = getCurrentUser ? getCurrentUser() : null;
  const entry = {
    user_code: user ? user.code : 'unknown',
    user_name: user ? user.name : 'Inconnu',
    action,
    target_type: targetType,
    target_id: targetId,
    target_name: targetName,
    details,
    timestamp: new Date().toISOString()
  };

  // Save locally
  const hist = JSON.parse(localStorage.getItem('telecom_historique') || '[]');
  hist.unshift(entry);
  if (hist.length > 500) hist.length = 500;
  localStorage.setItem('telecom_historique', JSON.stringify(hist));

  // Save to Google Sheets if connected
  if (isGoogleSheetsConnected()) {
    gsLogAction(action, targetType, targetId, targetName, details);
  }
}

// ===== CREATION MENU =====
function showCreationMenu() {
  showModal(`
    <div class="noc-header"><span>Création</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div>
    <div class="noc-body space-y">
      <div class="device-card" onclick="startCreationNA()"><span class="text-primary font-bold">Création NA</span><p class="text-xs text-muted">Créer un nouvel abonné (MSAN → SR → PC)</p></div>
      <div class="device-card" onclick="startChangementCarte()"><span class="text-accent font-bold">Changement Port de Carte</span><p class="text-xs text-muted">Changer le port carte d'un abonné</p></div>
      <div class="device-card" onclick="startChangementTransport()"><span class="text-accent font-bold">Changement Port de Transport</span><p class="text-xs text-muted">Changer le port transport (MSAN + SR auto)</p></div>
      <div class="device-card" onclick="startChangementDistribution()"><span class="text-accent font-bold">Changement Port de Distribution</span><p class="text-xs text-muted">Changer le port distribution + PC</p></div>
      <div class="device-card" onclick="startChangementEtatPort()"><span class="text-warning font-bold">Changement État de Port</span><p class="text-xs text-muted">Changer l'état d'un port sur n'importe quel équipement</p></div>
      <hr style="border-color:var(--border);margin:8px 0"/>
      <div class="device-card" onclick="showChooseType()"><span class="text-success font-bold">Créer Équipement</span><p class="text-xs text-muted">Créer un nouveau MSAN, SR ou PC</p></div>
    </div>
  `);
}

// ===== EQUIPMENT CREATION (MSAN/SR/PC) =====
function showChooseType() {
  showModal(`
    <div class="noc-header"><span>Nouvel équipement</span><span style="cursor:pointer" onclick="showCreationMenu()">← Retour</span></div>
    <div class="noc-body space-y">
      <div class="device-card" onclick="showMSANType()"><span class="text-primary font-bold">MSAN</span><p class="text-xs text-muted mt-2">Créer un nouveau MSAN (Indoor ou Outdoor)</p></div>
      <div class="device-card" onclick="showSRForm()"><span class="text-accent font-bold">SR</span><p class="text-xs text-muted mt-2">Créer un sous-répartiteur</p></div>
      <div class="device-card" onclick="showPCForm()"><span class="text-success font-bold">PC</span><p class="text-xs text-muted mt-2">Créer un point de concentration</p></div>
    </div>
  `);
}

// ===== MSAN Creation =====
let msanFormData = { type: 'indoor', name: '', lat: '', lng: '', cartes: 8, fermes: [{ number: 1, tites: [{ number: 1 }] }] };

function showMSANType() {
  showModal(`
    <div class="noc-header"><span>Type MSAN</span><span style="cursor:pointer" onclick="showChooseType()">← Retour</span></div>
    <div class="noc-body space-y">
      <div class="device-card" onclick="msanFormData.type='indoor';showMSANForm()"><span class="text-primary font-bold">🏢 Indoor</span></div>
      <div class="device-card" onclick="msanFormData.type='outdoor';showMSANForm()"><span class="text-primary font-bold">🌍 Outdoor</span></div>
    </div>
  `);
}

function saveMSANFormInputs() {
  const n = document.getElementById('msanName');
  const la = document.getElementById('msanLat');
  const ln = document.getElementById('msanLng');
  const c = document.getElementById('msanCartes');
  if (n) msanFormData.name = n.value;
  if (la) msanFormData.lat = la.value;
  if (ln) msanFormData.lng = ln.value;
  if (c) msanFormData.cartes = parseInt(c.value) || 8;
}

function showMSANForm() {
  saveMSANFormInputs();
  let fermesHTML = msanFormData.fermes.map((f, fi) => {
    let titesHTML = f.tites.map((t, ti) => `
      <div class="flex-row">
        <span class="text-xs text-muted">Tite:</span>
        <input type="number" class="form-input" style="width:60px" value="${t.number}" onchange="saveMSANFormInputs();msanFormData.fermes[${fi}].tites[${ti}].number=parseInt(this.value)||0" />
        <button class="btn-danger" onclick="saveMSANFormInputs();msanFormData.fermes[${fi}].tites.splice(${ti},1);showMSANForm()">✕</button>
      </div>
    `).join('');
    return `
      <div style="background:var(--muted);border-radius:var(--radius);padding:8px;" class="space-y-sm">
        <div class="flex-row">
          <span class="text-xs text-muted">Ferme n°:</span>
          <input type="number" class="form-input" style="width:60px" value="${f.number}" onchange="saveMSANFormInputs();msanFormData.fermes[${fi}].number=parseInt(this.value)||0" />
          <button class="btn-danger" onclick="saveMSANFormInputs();msanFormData.fermes.splice(${fi},1);showMSANForm()">Suppr</button>
        </div>
        <div style="padding-left:16px;" class="space-y-sm">
          <div class="flex-row" style="justify-content:space-between"><span class="text-xs text-muted">Tites:</span><button class="text-primary text-xs" style="background:none;border:none;cursor:pointer;color:var(--primary)" onclick="saveMSANFormInputs();msanFormData.fermes[${fi}].tites.push({number:msanFormData.fermes[${fi}].tites.length+1});showMSANForm()">+ Tite</button></div>
          ${titesHTML}
        </div>
      </div>
    `;
  }).join('');

  showModal(`
    <div class="noc-header"><span>Créer MSAN (${msanFormData.type === 'indoor' ? 'Indoor' : 'Outdoor'})</span><span style="cursor:pointer" onclick="showChooseType()">← Retour</span></div>
    <div class="noc-body space-y">
      <div id="msanError" class="text-destructive text-sm"></div>
      <input id="msanName" class="form-input" placeholder="Nom du MSAN" value="${msanFormData.name}" />
      <div class="flex-row flex-wrap">
        <input id="msanLat" class="form-input" style="flex:1;min-width:80px" placeholder="Latitude" value="${msanFormData.lat}" />
        <input id="msanLng" class="form-input" style="flex:1;min-width:80px" placeholder="Longitude" value="${msanFormData.lng}" />
        <button class="btn-secondary" onclick="saveMSANFormInputs();startPickCoords(function(lat,lng){msanFormData.lat=lat.toFixed(6);msanFormData.lng=lng.toFixed(6);showMSANForm();})">📍</button>
      </div>
      <input id="msanCartes" type="number" class="form-input" placeholder="Nombre de cartes" value="${msanFormData.cartes}" min="1" max="20" />
      <div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px;" class="space-y-sm">
        <div class="flex-row" style="justify-content:space-between">
          <span class="text-sm font-bold text-primary">Fermes</span>
          <button style="background:none;border:none;cursor:pointer;color:var(--primary);font-size:0.75rem" onclick="saveMSANFormInputs();msanFormData.fermes.push({number:msanFormData.fermes.length+1,tites:[{number:1}]});showMSANForm()">+ Ajouter Ferme</button>
        </div>
        ${fermesHTML}
      </div>
      <div class="flex-row">
        <button class="btn-secondary" onclick="showChooseType()">Retour</button>
        <button class="btn-primary" onclick="submitMSAN()">Créer MSAN</button>
      </div>
    </div>
  `);
}

function submitMSAN() {
  saveMSANFormInputs();
  const name = msanFormData.name.trim();
  const lat = parseFloat(msanFormData.lat);
  const lng = parseFloat(msanFormData.lng);
  const cartes = msanFormData.cartes || 8;
  if (!name || isNaN(lat) || isNaN(lng)) { document.getElementById('msanError').textContent = 'Veuillez remplir tous les champs'; return; }
  
  const msan = {
    id: uuid(), name, type: msanFormData.type, lat, lng,
    cartes: Array.from({ length: cartes }, (_, i) => createCarte(i + 1)),
    fermes: msanFormData.fermes.map(f => ({ number: f.number, tites: f.tites.map(t => createTite(t.number)) }))
  };
  addMSAN(msan);
  msanFormData = { type: 'indoor', name: '', lat: '', lng: '', cartes: 8, fermes: [{ number: 1, tites: [{ number: 1 }] }] };
  hideModal();
  refreshMarkers();
}

// ===== SR Creation =====
let srFormData = { name: '', lat: '', lng: '', transportFermes: [{ number: 1, tites: [{ number: 1 }] }], distTites: [{ number: 1 }] };

function saveSRFormInputs() {
  const n = document.getElementById('srName');
  const la = document.getElementById('srLat');
  const ln = document.getElementById('srLng');
  if (n) srFormData.name = n.value;
  if (la) srFormData.lat = la.value;
  if (ln) srFormData.lng = ln.value;
}

function showSRForm() {
  saveSRFormInputs();
  let trFermesHTML = srFormData.transportFermes.map((f, fi) => {
    let titesHTML = f.tites.map((t, ti) => `
      <div class="flex-row">
        <span class="text-xs text-muted">Tite:</span>
        <input type="number" class="form-input" style="width:60px" value="${t.number}" onchange="saveSRFormInputs();srFormData.transportFermes[${fi}].tites[${ti}].number=parseInt(this.value)||0" />
        <button class="btn-danger" onclick="saveSRFormInputs();srFormData.transportFermes[${fi}].tites.splice(${ti},1);showSRForm()">✕</button>
      </div>
    `).join('');
    return `
      <div style="background:var(--muted);border-radius:var(--radius);padding:8px;" class="space-y-sm">
        <div class="flex-row">
          <span class="text-xs text-muted">Ferme n°:</span>
          <input type="number" class="form-input" style="width:60px" value="${f.number}" onchange="saveSRFormInputs();srFormData.transportFermes[${fi}].number=parseInt(this.value)||0" />
          <button class="btn-danger" onclick="saveSRFormInputs();srFormData.transportFermes.splice(${fi},1);showSRForm()">Suppr</button>
        </div>
        <div style="padding-left:16px;" class="space-y-sm">
          <div class="flex-row" style="justify-content:space-between"><span class="text-xs text-muted">Tites:</span><button class="text-primary text-xs" style="background:none;border:none;cursor:pointer;color:var(--accent)" onclick="saveSRFormInputs();srFormData.transportFermes[${fi}].tites.push({number:srFormData.transportFermes[${fi}].tites.length+1});showSRForm()">+ Tite</button></div>
          ${titesHTML}
        </div>
      </div>
    `;
  }).join('');

  let dtHTML = srFormData.distTites.map((t, i) => `
    <div class="flex-row"><span class="text-xs text-muted">Tite:</span><input type="number" class="form-input" style="width:60px" value="${t.number}" onchange="saveSRFormInputs();srFormData.distTites[${i}].number=parseInt(this.value)||0" /><button class="btn-danger" onclick="saveSRFormInputs();srFormData.distTites.splice(${i},1);showSRForm()">✕</button></div>
  `).join('');

  showModal(`
    <div class="noc-header"><span>🔌 Créer SR</span><span style="cursor:pointer" onclick="showChooseType()">← Retour</span></div>
    <div class="noc-body space-y">
      <div id="srError" class="text-destructive text-sm"></div>
      <input id="srName" class="form-input" placeholder="Nom du SR" value="${srFormData.name}" />
      <div class="flex-row flex-wrap">
        <input id="srLat" class="form-input" style="flex:1;min-width:80px" placeholder="Latitude" value="${srFormData.lat}" />
        <input id="srLng" class="form-input" style="flex:1;min-width:80px" placeholder="Longitude" value="${srFormData.lng}" />
        <button class="btn-secondary" onclick="saveSRFormInputs();startPickCoords(function(lat,lng){srFormData.lat=lat.toFixed(6);srFormData.lng=lng.toFixed(6);showSRForm();})">📍</button>
      </div>
      <div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px;" class="space-y-sm">
        <div class="flex-row" style="justify-content:space-between">
          <span class="text-sm font-bold text-accent">Fermes Transport</span>
          <button style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:0.75rem" onclick="saveSRFormInputs();srFormData.transportFermes.push({number:srFormData.transportFermes.length+1,tites:[{number:1}]});showSRForm()">+ Ajouter Ferme</button>
        </div>
        ${trFermesHTML}
      </div>
      <div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px;" class="space-y-sm">
        <div class="flex-row" style="justify-content:space-between"><span class="text-sm font-bold text-accent">Distribution Tites</span><button style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:0.75rem" onclick="saveSRFormInputs();srFormData.distTites.push({number:srFormData.distTites.length+1});showSRForm()">+ Ajouter</button></div>
        ${dtHTML}
      </div>
      <div class="flex-row">
        <button class="btn-secondary" onclick="showChooseType()">Retour</button>
        <button class="btn-primary" onclick="submitSR()">Créer SR</button>
      </div>
    </div>
  `);
}

function submitSR() {
  saveSRFormInputs();
  const name = srFormData.name.trim();
  const lat = parseFloat(srFormData.lat);
  const lng = parseFloat(srFormData.lng);
  if (!name || isNaN(lat) || isNaN(lng)) { document.getElementById('srError').textContent = 'Veuillez remplir tous les champs'; return; }
  
  const sr = {
    id: uuid(), name, lat, lng,
    transportFermes: srFormData.transportFermes.map(f => ({
      number: f.number,
      tites: f.tites.map(t => createTite(t.number))
    })),
    distributionTites: srFormData.distTites.map(t => createDistributionTite(t.number))
  };
  addSR(sr);
  srFormData = { name: '', lat: '', lng: '', transportFermes: [{ number: 1, tites: [{ number: 1 }] }], distTites: [{ number: 1 }] };
  hideModal();
  refreshMarkers();
}

// ===== PC Creation =====
function showPCForm() {
  showModal(`
    <div class="noc-header"><span>Créer PC</span><span style="cursor:pointer" onclick="showChooseType()">← Retour</span></div>
    <div class="noc-body space-y">
      <div id="pcError" class="text-destructive text-sm"></div>
      <input id="pcNum" class="form-input" placeholder="Numéro PC (ex: 221/1)" />
      <div class="flex-row flex-wrap">
        <input id="pcLat" class="form-input" style="flex:1;min-width:80px" placeholder="Latitude" />
        <input id="pcLng" class="form-input" style="flex:1;min-width:80px" placeholder="Longitude" />
        <button class="btn-secondary" onclick="startPickCoords(function(lat,lng){document.getElementById('pcLat').value=lat.toFixed(6);document.getElementById('pcLng').value=lng.toFixed(6);showPCForm();})">📍</button>
      </div>
      <p class="text-xs text-muted">Le PC contient automatiquement 7 paires</p>
      <div class="flex-row">
        <button class="btn-secondary" onclick="showChooseType()">Retour</button>
        <button class="btn-primary" onclick="submitPC()">Créer PC</button>
      </div>
    </div>
  `);
}

function submitPC() {
  const num = document.getElementById('pcNum').value.trim();
  const lat = parseFloat(document.getElementById('pcLat').value);
  const lng = parseFloat(document.getElementById('pcLng').value);
  if (!num || isNaN(lat) || isNaN(lng)) { document.getElementById('pcError').textContent = 'Veuillez remplir tous les champs'; return; }
  
  const pc = { id: uuid(), number: num, lat, lng, paires: createPorts(7, 1) };
  addPC(pc);
  hideModal();
  refreshMarkers();
}

// ===== SUPPRESSION MENU =====
function showSuppressionMenu() {
  showModal(`
    <div class="noc-header"><span>Supprimer</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div>
    <div class="noc-body space-y">
      <div class="device-card" onclick="showDeleteList('msan')"><span class="text-primary font-bold">📡 Supprimer un MSAN</span></div>
      <div class="device-card" onclick="showDeleteList('sr')"><span class="text-accent font-bold">🔌 Supprimer un SR</span></div>
      <div class="device-card" onclick="showDeleteList('pc')"><span class="text-success font-bold">📦 Supprimer un PC</span></div>
    </div>
  `);
}

function showDeleteList(type) {
  let items = [];
  if (type === 'msan') items = getMSANs().map(m => ({ id: m.id, label: m.name }));
  else if (type === 'sr') items = getSRs().map(s => ({ id: s.id, label: s.name }));
  else items = getPCs().map(p => ({ id: p.id, label: p.number }));

  let html = `<div class="noc-header"><span>Choisir à supprimer</span><span style="cursor:pointer" onclick="showSuppressionMenu()">← Retour</span></div><div class="noc-body space-y">`;
  if (!items.length) html += '<p class="text-muted text-sm">Aucun élément</p>';
  items.forEach(it => {
    html += `<div class="device-card" onclick="askDeletePassword('${type}','${it.id}','${it.label}')"><span class="text-destructive font-bold">${it.label}</span></div>`;
  });
  html += '</div>';
  showModal(html);
}

function askDeletePassword(type, id, name) {
  const html = `
    <div class="noc-header"><span>Supprimer ${name}</span><span style="cursor:pointer" onclick="hideDeleteModal()">✕</span></div>
    <div class="noc-body space-y">
      <p class="text-destructive text-sm">Êtes-vous sûr de vouloir supprimer <strong>${name}</strong> ?</p>
      <input id="delPw" type="password" class="form-input" placeholder="Mot de passe administrateur" />
      <div id="delError" class="text-destructive text-sm"></div>
      <div class="flex-row">
        <button class="btn-secondary" onclick="hideDeleteModal()">Annuler</button>
        <button class="btn-delete" onclick="confirmDelete('${type}','${id}')">Supprimer</button>
      </div>
    </div>
  `;
  document.getElementById('portChoiceContent').innerHTML = html;
  document.getElementById('portChoiceModal').classList.remove('hidden');
  setTimeout(() => { const el = document.getElementById('delPw'); if (el) el.focus(); }, 100);
}

function hideDeleteModal() { document.getElementById('portChoiceModal').classList.add('hidden'); }

function confirmDelete(type, id) {
  if (document.getElementById('delPw').value !== '1212') {
    document.getElementById('delError').textContent = 'Mot de passe incorrect';
    return;
  }
  if (type === 'msan') deleteMSAN(id);
  else if (type === 'sr') deleteSR(id);
  else if (type === 'pc') deletePC(id);
  hideDeleteModal();
  hideModal();
  closeDetail();
  refreshMarkers();
}

// ===== MODIFICATION MENU =====
function showModificationMenu() {
  showModal(`
    <div class="noc-header"><span>Modification</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div>
    <div class="noc-body space-y">
      <div class="device-card" onclick="showModifyList('msan')"><span class="text-primary font-bold">Modifier un MSAN</span><p class="text-xs text-muted">Ajouter/supprimer/renommer cartes, fermes, tites</p></div>
      <div class="device-card" onclick="showModifyList('sr')"><span class="text-accent font-bold">Modifier un SR</span><p class="text-xs text-muted">Ajouter/supprimer/renommer fermes transport, tites distribution</p></div>
      <div class="device-card" onclick="showModifyList('pc')"><span class="text-success font-bold">Modifier un PC</span><p class="text-xs text-muted">Modifier le numéro ou les coordonnées</p></div>
    </div>
  `);
}

function showModifyList(type) {
  let items = [];
  if (type === 'msan') items = getMSANs().map(m => ({ id: m.id, label: m.name }));
  else if (type === 'sr') items = getSRs().map(s => ({ id: s.id, label: s.name }));
  else items = getPCs().map(p => ({ id: p.id, label: p.number }));

  let html = `<div class="noc-header"><span>Choisir à modifier</span><span style="cursor:pointer" onclick="showModificationMenu()">← Retour</span></div><div class="noc-body space-y">`;
  if (!items.length) html += '<p class="text-muted text-sm">Aucun élément</p>';
  items.forEach(it => {
    html += `<div class="device-card" onclick="openModifyDevice('${type}','${it.id}')"><span class="text-accent font-bold">${it.label}</span></div>`;
  });
  html += '</div>';
  showModal(html);
}

function openModifyDevice(type, id) {
  if (type === 'msan') showModifyMSAN(id);
  else if (type === 'sr') showModifySR(id);
  else showModifyPC(id);
}

function showModifyMSAN(id) {
  const msan = getMSANs().find(m => m.id === id);
  if (!msan) return;

  let fermesHTML = msan.fermes.map((f, fi) => {
    let titesHTML = f.tites.map((t, ti) => `
      <div class="flex-row">
        <span class="text-xs text-muted">Tite ${t.number}</span>
        <input type="number" class="form-input" style="width:60px" value="${t.number}" onchange="modifyMSANTiteNum('${id}',${fi},${ti},parseInt(this.value)||0)" />
        <button class="btn-danger" onclick="removeMSANTite('${id}',${fi},${ti})">✕</button>
      </div>
    `).join('');
    return `
      <div style="background:var(--muted);border-radius:var(--radius);padding:8px;" class="space-y-sm">
        <div class="flex-row">
          <span class="text-xs text-muted">Ferme:</span>
          <input type="number" class="form-input" style="width:60px" value="${f.number}" onchange="modifyMSANFermeNum('${id}',${fi},parseInt(this.value)||0)" />
          <button class="btn-danger" onclick="removeMSANFerme('${id}',${fi})">Suppr</button>
        </div>
        <div style="padding-left:16px" class="space-y-sm">
          ${titesHTML}
          <button class="text-primary text-xs" style="background:none;border:none;cursor:pointer;color:var(--primary)" onclick="addMSANTite('${id}',${fi})">+ Tite</button>
        </div>
      </div>
    `;
  }).join('');

  let cartesInfo = `<p class="text-xs text-muted">Cartes actuelles: ${msan.cartes.length}</p>`;
  
  showModal(`
    <div class="noc-header"><span>Modifier MSAN: ${msan.name}</span><span style="cursor:pointer" onclick="showModifyList('msan')">← Retour</span></div>
    <div class="noc-body space-y">
      <div>
        <label class="text-xs text-muted">Nom:</label>
        <input class="form-input" value="${msan.name}" onchange="modifyMSANName('${id}',this.value)" />
      </div>
      <div>
        <label class="text-xs text-muted">Coordonnées:</label>
        <div class="flex-row">
          <input class="form-input" style="flex:1" value="${msan.lat}" onchange="modifyMSANCoord('${id}','lat',parseFloat(this.value))" placeholder="Lat" />
          <input class="form-input" style="flex:1" value="${msan.lng}" onchange="modifyMSANCoord('${id}','lng',parseFloat(this.value))" placeholder="Lng" />
        </div>
      </div>
      <div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px" class="space-y-sm">
        <div class="flex-row" style="justify-content:space-between">
          <span class="text-sm font-bold text-primary">Cartes (${msan.cartes.length})</span>
          <div class="flex-row">
            <button class="btn-primary" style="padding:4px 8px;font-size:0.7rem" onclick="addMSANCarte('${id}')">+ Carte</button>
            <button class="btn-danger" style="font-size:0.7rem" onclick="removeMSANLastCarte('${id}')">- Carte</button>
          </div>
        </div>
        ${cartesInfo}
      </div>
      <div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px" class="space-y-sm">
        <div class="flex-row" style="justify-content:space-between">
          <span class="text-sm font-bold text-primary">Fermes</span>
          <button style="background:none;border:none;cursor:pointer;color:var(--primary);font-size:0.75rem" onclick="addMSANFerme('${id}')">+ Ferme</button>
        </div>
        ${fermesHTML}
      </div>
    </div>
  `);
}

function rebuildConstitution(ab, msanName, msanType, srName, pcNumber) {
  const mName = msanName || ab.msanName || '';
  const mType = msanType || ab.msanType || 'indoor';
  const sName = srName || ab.srName || '';
  const pNum = pcNumber || ab.pcNumber || '';
  const typeCode = mType === 'indoor' ? 'IN' : 'OUT';
  return `MH${typeCode}-TA-${mName}:1-0-${ab.carteNum}-${ab.portNum}, TR:${ab.fermeNum}/${ab.titeNum}-${ab.dispoNum} p${ab.paireNum}, TR-${sName}:${ab.fermeNum}/${ab.titeNum}-${ab.dispoNum} p${ab.paireNum}, D:${ab.distTiteNum}${ab.distDispoNum}/${ab.distHalf} p${ab.distPaire}, PC ${pNum} p${ab.pcPaire}`;
}

function updateAbonnesConstitution() {
  const s = getState();
  s.abonnes.forEach(ab => {
    const msan = s.msans.find(m => m.id === ab.msanId);
    const sr = s.srs.find(x => x.id === ab.srId);
    const pc = s.pcs.find(x => x.id === ab.pcId);
    ab.msanName = msan ? msan.name : ab.msanName;
    ab.msanType = msan ? msan.type : ab.msanType;
    ab.srName = sr ? sr.name : ab.srName;
    ab.pcNumber = pc ? pc.number : ab.pcNumber;
    ab.constitution = rebuildConstitution(ab);
  });
  saveState(s);
}

function modifyMSANName(id, name) { const m = getMSANs().find(x => x.id === id); if (m) { m.name = name; updateMSAN(m); updateAbonnesConstitution(); refreshMarkers(); } }
function modifyMSANCoord(id, key, val) { const m = getMSANs().find(x => x.id === id); if (m) { m[key] = val; updateMSAN(m); refreshMarkers(); } }
function modifyMSANFermeNum(id, fi, num) { const m = getMSANs().find(x => x.id === id); if (m) { m.fermes[fi].number = num; updateMSAN(m); } }
function modifyMSANTiteNum(id, fi, ti, num) { const m = getMSANs().find(x => x.id === id); if (m) { m.fermes[fi].tites[ti].number = num; updateMSAN(m); } }
function addMSANFerme(id) { const m = getMSANs().find(x => x.id === id); if (m) { m.fermes.push({ number: m.fermes.length + 1, tites: [createTite(1)] }); updateMSAN(m); showModifyMSAN(id); } }
function removeMSANFerme(id, fi) { const m = getMSANs().find(x => x.id === id); if (m) { m.fermes.splice(fi, 1); updateMSAN(m); showModifyMSAN(id); } }
function addMSANTite(id, fi) { const m = getMSANs().find(x => x.id === id); if (m) { m.fermes[fi].tites.push(createTite(m.fermes[fi].tites.length + 1)); updateMSAN(m); showModifyMSAN(id); } }
function removeMSANTite(id, fi, ti) { const m = getMSANs().find(x => x.id === id); if (m) { m.fermes[fi].tites.splice(ti, 1); updateMSAN(m); showModifyMSAN(id); } }
function addMSANCarte(id) { const m = getMSANs().find(x => x.id === id); if (m) { m.cartes.push(createCarte(m.cartes.length + 1)); updateMSAN(m); showModifyMSAN(id); } }
function removeMSANLastCarte(id) { const m = getMSANs().find(x => x.id === id); if (m && m.cartes.length > 1) { m.cartes.pop(); updateMSAN(m); showModifyMSAN(id); } }

function showModifySR(id) {
  const sr = getSRs().find(s => s.id === id);
  if (!sr) return;

  let trFermesHTML = (sr.transportFermes || []).map((f, fi) => {
    let titesHTML = f.tites.map((t, ti) => `
      <div class="flex-row">
        <span class="text-xs text-muted">Tite ${t.number}</span>
        <input type="number" class="form-input" style="width:60px" value="${t.number}" onchange="modifySRTransTiteNum('${id}',${fi},${ti},parseInt(this.value)||0)" />
        <button class="btn-danger" onclick="removeSRTransTite('${id}',${fi},${ti})">✕</button>
      </div>
    `).join('');
    return `
      <div style="background:var(--muted);border-radius:var(--radius);padding:8px;" class="space-y-sm">
        <div class="flex-row">
          <span class="text-xs text-muted">Ferme:</span>
          <input type="number" class="form-input" style="width:60px" value="${f.number}" onchange="modifySRTransFermeNum('${id}',${fi},parseInt(this.value)||0)" />
          <button class="btn-danger" onclick="removeSRTransFerme('${id}',${fi})">Suppr</button>
        </div>
        <div style="padding-left:16px" class="space-y-sm">
          ${titesHTML}
          <button class="text-primary text-xs" style="background:none;border:none;cursor:pointer;color:var(--accent)" onclick="addSRTransTite('${id}',${fi})">+ Tite</button>
        </div>
      </div>
    `;
  }).join('');

  let distHTML = sr.distributionTites.map((t, i) => `
    <div class="flex-row">
      <span class="text-xs text-muted">Tite ${t.number}</span>
      <input type="number" class="form-input" style="width:60px" value="${t.number}" onchange="modifySRDistTiteNum('${id}',${i},parseInt(this.value)||0)" />
      <button class="btn-danger" onclick="removeSRDistTite('${id}',${i})">✕</button>
    </div>
  `).join('');

  showModal(`
    <div class="noc-header"><span>Modifier SR: ${sr.name}</span><span style="cursor:pointer" onclick="showModifyList('sr')">← Retour</span></div>
    <div class="noc-body space-y">
      <div>
        <label class="text-xs text-muted">Nom:</label>
        <input class="form-input" value="${sr.name}" onchange="modifySRName('${id}',this.value)" />
      </div>
      <div>
        <label class="text-xs text-muted">Coordonnées:</label>
        <div class="flex-row">
          <input class="form-input" style="flex:1" value="${sr.lat}" onchange="modifySRCoord('${id}','lat',parseFloat(this.value))" placeholder="Lat" />
          <input class="form-input" style="flex:1" value="${sr.lng}" onchange="modifySRCoord('${id}','lng',parseFloat(this.value))" placeholder="Lng" />
        </div>
      </div>
      <div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px" class="space-y-sm">
        <div class="flex-row" style="justify-content:space-between">
          <span class="text-sm font-bold text-accent">Fermes Transport</span>
          <button style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:0.75rem" onclick="addSRTransFerme('${id}')">+ Ferme</button>
        </div>
        ${trFermesHTML}
      </div>
      <div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px" class="space-y-sm">
        <div class="flex-row" style="justify-content:space-between">
          <span class="text-sm font-bold text-accent">Distribution Tites</span>
          <button style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:0.75rem" onclick="addSRDistTite('${id}')">+ Tite</button>
        </div>
        ${distHTML}
      </div>
    </div>
  `);
}

function modifySRName(id, name) { const s = getSRs().find(x => x.id === id); if (s) { s.name = name; updateSR(s); updateAbonnesConstitution(); refreshMarkers(); } }
function modifySRCoord(id, key, val) { const s = getSRs().find(x => x.id === id); if (s) { s[key] = val; updateSR(s); refreshMarkers(); } }
function modifySRTransFermeNum(id, fi, num) { const s = getSRs().find(x => x.id === id); if (s) { s.transportFermes[fi].number = num; updateSR(s); } }
function modifySRTransTiteNum(id, fi, ti, num) { const s = getSRs().find(x => x.id === id); if (s) { s.transportFermes[fi].tites[ti].number = num; updateSR(s); } }
function addSRTransFerme(id) { const s = getSRs().find(x => x.id === id); if (s) { if (!s.transportFermes) s.transportFermes = []; s.transportFermes.push({ number: s.transportFermes.length + 1, tites: [createTite(1)] }); updateSR(s); showModifySR(id); } }
function removeSRTransFerme(id, fi) { const s = getSRs().find(x => x.id === id); if (s) { s.transportFermes.splice(fi, 1); updateSR(s); showModifySR(id); } }
function addSRTransTite(id, fi) { const s = getSRs().find(x => x.id === id); if (s) { s.transportFermes[fi].tites.push(createTite(s.transportFermes[fi].tites.length + 1)); updateSR(s); showModifySR(id); } }
function removeSRTransTite(id, fi, ti) { const s = getSRs().find(x => x.id === id); if (s) { s.transportFermes[fi].tites.splice(ti, 1); updateSR(s); showModifySR(id); } }
function modifySRDistTiteNum(id, i, num) { const s = getSRs().find(x => x.id === id); if (s) { s.distributionTites[i].number = num; updateSR(s); } }
function addSRDistTite(id) { const s = getSRs().find(x => x.id === id); if (s) { s.distributionTites.push(createDistributionTite(s.distributionTites.length + 1)); updateSR(s); showModifySR(id); } }
function removeSRDistTite(id, i) { const s = getSRs().find(x => x.id === id); if (s) { s.distributionTites.splice(i, 1); updateSR(s); showModifySR(id); } }

function showModifyPC(id) {
  const pc = getPCs().find(p => p.id === id);
  if (!pc) return;
  showModal(`
    <div class="noc-header"><span>✏️ Modifier PC: ${pc.number}</span><span style="cursor:pointer" onclick="showModifyList('pc')">← Retour</span></div>
    <div class="noc-body space-y">
      <div>
        <label class="text-xs text-muted">Numéro:</label>
        <input class="form-input" value="${pc.number}" onchange="modifyPCNumber('${id}',this.value)" />
      </div>
      <div>
        <label class="text-xs text-muted">Coordonnées:</label>
        <div class="flex-row">
          <input class="form-input" style="flex:1" value="${pc.lat}" onchange="modifyPCCoord('${id}','lat',parseFloat(this.value))" placeholder="Lat" />
          <input class="form-input" style="flex:1" value="${pc.lng}" onchange="modifyPCCoord('${id}','lng',parseFloat(this.value))" placeholder="Lng" />
        </div>
      </div>
    </div>
  `);
}

function modifyPCNumber(id, num) { const p = getPCs().find(x => x.id === id); if (p) { p.number = num; updatePC(p); updateAbonnesConstitution(); refreshMarkers(); } }
function modifyPCCoord(id, key, val) { const p = getPCs().find(x => x.id === id); if (p) { p[key] = val; updatePC(p); refreshMarkers(); } }

// ===== Detail View =====
let currentDetail = null;
let naData = {};
let naStep = 'idle';

function openDetail(type, id) {
  map.closePopup();
  let device;
  if (type === 'msan') device = getMSANs().find(m => m.id === id);
  else if (type === 'sr') device = getSRs().find(s => s.id === id);
  else device = getPCs().find(p => p.id === id);
  if (!device) return;
  
  currentDetail = { type, device };
  naData = {};
  naStep = 'idle';
  showDetailOverview();
}

function showDetailOverview() {
  const { type, device } = currentDetail;
  let title = '', bodyHTML = '';

  if (type === 'msan') {
    title = `MSAN: ${device.name} (${device.type === 'indoor' ? 'Indoor' : 'Outdoor'})`;
    bodyHTML = `
      <div class="grid-2">
        <div class="device-card" onclick="showCartes()"><span class="text-primary font-bold">Cartes</span><p class="text-muted text-sm">${device.cartes.length} cartes × 64 ports</p></div>
        <div class="device-card" onclick="showFermes()"><span class="text-primary font-bold">Transport (Fermes)</span><p class="text-muted text-sm">${device.fermes.length} fermes</p></div>
      </div>
    `;
  } else if (type === 'sr') {
    title = `SR: ${device.name}`;
    const fermesCount = device.transportFermes ? device.transportFermes.length : 0;
    bodyHTML = `
      <div class="grid-2">
        <div class="device-card" onclick="showSRTransport()"><span class="text-accent font-bold">Transport (Fermes)</span><p class="text-muted text-sm">${fermesCount} fermes</p></div>
        <div class="device-card" onclick="showSRDistribution()"><span class="text-accent font-bold">Distribution</span><p class="text-muted text-sm">${device.distributionTites.length} tites</p></div>
      </div>
    `;
  } else {
    title = `PC: ${device.number}`;
    bodyHTML = `<h3 class="text-success font-bold mb-3">PC ${device.number} - 7 Paires</h3>` + renderPortGrid(device.paires, 7, 'handlePCPortClick');
  }

  showDetailPanel(title, bodyHTML);
}

function showDetailPanel(title, bodyHTML) {
  let existing = document.getElementById('detailOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'detailOverlay';
  overlay.innerHTML = `
    <div id="detailHeader"><span>${title}</span><button onclick="closeDetail()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:1.1rem">← Retour</button></div>
    <div id="detailBody">${bodyHTML}</div>
  `;
  document.body.appendChild(overlay);
}

function closeDetail() {
  if (etatPortMode) {
    // Return to equipment list instead of closing
    currentDetail = null;
    naStep = 'idle';
    naData = {};
    showEtatPortPanel();
    return;
  }
  const el = document.getElementById('detailOverlay');
  if (el) el.remove();
  currentDetail = null;
  naStep = 'idle';
  naData = {};
  viewerMode = true; // Reset to viewer mode
  refreshMarkers();
}

function renderPortGrid(ports, cols = 8, onClickFn) {
  return `<div class="port-grid" style="grid-template-columns:repeat(${cols},1fr)">${ports.map((p, i) => {
    const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
    const click = onClickFn ? ` onclick="${onClickFn}(${i})"` : '';
    return `<div class="port-cell ${cls}" title="Port ${p.number} - ${p.status}"${click}>${p.number}</div>`;
  }).join('')}</div>`;
}

// ===== Port Constitution Lookup =====
function findConstitutionForPort(type, deviceId, portInfo) {
  const abonnes = getAbonnes();
  // portInfo: { section, carteIdx, portIdx, fermeIdx, titeIdx, dispoIdx, paireIdx, pcPaireIdx, distTiteIdx, distDispoIdx, distPaireIdx }
  return abonnes.filter(a => {
    if (type === 'msan' && a.msanId === deviceId) {
      if (portInfo.section === 'carte' && a.carteIdx === portInfo.carteIdx && a.portIdx === portInfo.portIdx) return true;
      if (portInfo.section === 'transport' && a.fermeIdx === portInfo.fermeIdx && a.titeIdx === portInfo.titeIdx && a.dispoIdx === portInfo.dispoIdx && a.paireIdx === portInfo.paireIdx) return true;
    }
    if (type === 'sr' && a.srId === deviceId) {
      if (portInfo.section === 'transport' && a.srTransportFermeIdx === portInfo.fermeIdx && a.srTransportTiteIdx === portInfo.titeIdx && a.srTransportDispoIdx === portInfo.dispoIdx && a.srTransportPaireIdx === portInfo.paireIdx) return true;
      if (portInfo.section === 'distribution' && a.distTiteIdx === portInfo.titeIdx && a.distDispoIdx === portInfo.dispoIdx && a.distPaireIdx === portInfo.paireIdx) return true;
    }
    if (type === 'pc' && a.pcId === deviceId && a.pcPaireIdx === portInfo.paireIdx) return true;
    return false;
  });
}

function showPortConstitution(constitutions) {
  let html = `<div class="noc-header"><span>Constitution</span><span style="cursor:pointer" onclick="hidePortChoice()">✕</span></div><div class="noc-body space-y">`;
  if (!constitutions.length) {
    html += '<p class="text-muted text-sm">Aucun abonné sur ce port</p>';
  } else {
    constitutions.forEach(a => {
      html += `<div class="device-card"><p class="text-primary text-xs break-all" style="font-family:monospace">${a.constitution}</p></div>`;
    });
  }
  html += '</div>';
  document.getElementById('portChoiceContent').innerHTML = html;
  document.getElementById('portChoiceModal').classList.remove('hidden');
}

// ===== Port Click Handlers =====
function handlePCPortClick(idx) {
  const pc = getPCs().find(p => p.id === currentDetail.device.id);
  if (!pc) return;
  if (viewerMode) {
    showPortConstitution(findConstitutionForPort('pc', pc.id, { paireIdx: idx }));
    return;
  }
  showPortChoice(function(status) {
    pc.paires[idx].status = status;
    updatePC(pc);
    currentDetail.device = pc;
    showDetailOverview();
  });
}

function handleCartePortClick(idx) {
  const dev = getMSANs().find(x => x.id === currentDetail.device.id);
  if (!dev) return;
  if (viewerMode) {
    showPortConstitution(findConstitutionForPort('msan', dev.id, { section: 'carte', carteIdx: currentDetail.selectedCarteIdx, portIdx: idx }));
    return;
  }
  showPortChoice(function(status) {
    dev.cartes[currentDetail.selectedCarteIdx].ports[idx].status = status;
    updateMSAN(dev);
    currentDetail.device = dev;
    showCarteDetail(currentDetail.selectedCarteIdx);
  });
}

function handleFermePortClick(fermeIdx, titeIdx, dispoIdx, paireIdx) {
  const dev = getMSANs().find(x => x.id === currentDetail.device.id);
  if (!dev) return;
  if (viewerMode) {
    showPortConstitution(findConstitutionForPort('msan', dev.id, { section: 'transport', fermeIdx, titeIdx, dispoIdx, paireIdx }));
    return;
  }
  showPortChoice(function(status) {
    dev.fermes[fermeIdx].tites[titeIdx].dispos[dispoIdx].paires[paireIdx].status = status;
    updateMSAN(dev);
    currentDetail.device = dev;
    showFermeDetail(fermeIdx);
  });
}

function handleSRTransportPortClick(fermeIdx, titeIdx, dispoIdx, paireIdx) {
  const dev = getSRs().find(x => x.id === currentDetail.device.id);
  if (!dev) return;
  if (viewerMode) {
    showPortConstitution(findConstitutionForPort('sr', dev.id, { section: 'transport', fermeIdx, titeIdx, dispoIdx, paireIdx }));
    return;
  }
  showPortChoice(function(status) {
    dev.transportFermes[fermeIdx].tites[titeIdx].dispos[dispoIdx].paires[paireIdx].status = status;
    updateSR(dev);
    currentDetail.device = dev;
    showSRTransport();
  });
}

function handleSRDistPortClick(titeIdx, dispoIdx, paireIdx) {
  const dev = getSRs().find(x => x.id === currentDetail.device.id);
  if (!dev) return;
  if (viewerMode) {
    showPortConstitution(findConstitutionForPort('sr', dev.id, { section: 'distribution', titeIdx, dispoIdx, paireIdx }));
    return;
  }
  showPortChoice(function(status) {
    dev.distributionTites[titeIdx].dispos[dispoIdx].paires[paireIdx].status = status;
    updateSR(dev);
    currentDetail.device = dev;
    showSRDistribution();
  });
}

// ===== MSAN Detail =====
function showCartes() {
  const m = currentDetail.device;
  currentDetail.device = getMSANs().find(x => x.id === m.id) || m;
  const dev = currentDetail.device;
  let html = `<button class="text-primary text-sm mb-3" style="background:none;border:none;cursor:pointer;color:#fff" onclick="showDetailOverview()">← Retour</button>`;
  html += `<h3 class="text-primary font-bold mb-3">Cartes (${dev.cartes.length})</h3><div class="grid-4">`;
  dev.cartes.forEach((c, i) => {
    const ok = c.ports.filter(p => p.status === 'ok').length;
    const bad = c.ports.filter(p => p.status === 'bad').length;
    const movie = c.ports.filter(p => p.status === 'movie').length;
    html += `<div class="device-card" onclick="showCarteDetail(${i})"><span class="text-primary font-bold">Carte ${c.number}</span><div class="flex-row mt-2 text-xs"><span class="text-success">${ok}✓</span><span class="text-destructive">${bad}✗</span><span class="text-warning">${movie}⚠</span><span class="text-muted">${64 - ok - bad - movie}○</span></div></div>`;
  });
  html += '</div>';
  showDetailPanel(`MSAN: ${dev.name}`, html);
}

function showCarteDetail(idx) {
  const dev = getMSANs().find(x => x.id === currentDetail.device.id) || currentDetail.device;
  currentDetail.device = dev;
  currentDetail.selectedCarteIdx = idx;
  const carte = dev.cartes[idx];
  let html = `<button class="text-primary text-sm mb-3" style="background:none;border:none;cursor:pointer;color:#fff" onclick="showCartes()">← Retour aux cartes</button>`;
  html += `<h3 class="text-primary font-bold mb-2">Carte ${carte.number} - 64 Ports</h3>`;
  html += `<p class="text-xs text-muted mb-3">Cliquez sur un port pour changer son état</p>`;
  html += renderPortGrid(carte.ports, 8, 'handleCartePortClick');
  showDetailPanel(`MSAN: ${dev.name}`, html);
}

// ===== MSAN Fermes =====
function showFermes() {
  const dev = getMSANs().find(x => x.id === currentDetail.device.id) || currentDetail.device;
  currentDetail.device = dev;
  let html = `<button class="text-primary text-sm mb-3" style="background:none;border:none;cursor:pointer;color:#fff" onclick="showDetailOverview()">← Retour</button>`;
  html += `<h3 class="text-primary font-bold mb-3">Fermes (${dev.fermes.length})</h3><div class="grid-4">`;
  dev.fermes.forEach((f, i) => {
    html += `<div class="device-card" onclick="showFermeDetail(${i})"><span class="text-primary font-bold">Ferme ${f.number}</span><p class="text-xs text-muted">${f.tites.length} tites</p></div>`;
  });
  html += '</div>';
  showDetailPanel(`MSAN: ${dev.name}`, html);
}

function showFermeDetail(fi) {
  const dev = getMSANs().find(x => x.id === currentDetail.device.id) || currentDetail.device;
  currentDetail.device = dev;
  const ferme = dev.fermes[fi];
  let html = `<button class="text-primary text-sm mb-3" style="background:none;border:none;cursor:pointer;color:#fff" onclick="showFermes()">← Retour aux fermes</button>`;
  html += `<h3 class="text-primary font-bold mb-3">Ferme ${ferme.number}</h3>`;
  ferme.tites.forEach((t, ti) => {
    html += `<div style="margin-bottom:16px;background:var(--card);border:1px solid var(--border);border-radius:#fff">`;
    html += `<div class="noc-header">Tite ${t.number}</div><div class="noc-body space-y">`;
    t.dispos.forEach((d, di) => {
      html += `<p class="text-xs text-muted mb-2">Dispo ${d.number} (28 paires)</p>`;
      html += `<div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
      d.paires.forEach((p, pi) => {
        const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
        html += `<div class="port-cell ${cls}" title="Port ${p.number} - ${p.status}" onclick="handleFermePortClick(${fi},${ti},${di},${pi})">${p.number}</div>`;
      });
      html += '</div>';
    });
    html += '</div></div>';
  });
  showDetailPanel(`MSAN: ${dev.name}`, html);
}

// ===== SR Detail =====
function showSRTransport() {
  const dev = getSRs().find(x => x.id === currentDetail.device.id) || currentDetail.device;
  currentDetail.device = dev;
  let html = `<button class="text-accent text-sm mb-3" style="background:none;border:none;cursor:pointer;color:#fff" onclick="showDetailOverview()">← Retour</button>`;
  html += `<h3 class="text-accent font-bold mb-3">Transport (Fermes)</h3>`;
  (dev.transportFermes || []).forEach((f, fi) => {
    html += `<div style="margin-bottom:16px;background:var(--muted);border-radius:var(--radius);padding:10px;">`;
    html += `<h4 class="text-accent font-bold mb-2">Ferme ${f.number}</h4>`;
    f.tites.forEach((t, ti) => {
      html += `<div style="margin-bottom:12px;background:var(--card);border:1px solid var(--border);border-radius:#fff">`;
      html += `<div class="noc-header">Tite ${t.number}</div><div class="noc-body space-y">`;
      t.dispos.forEach((d, di) => {
        html += `<p class="text-xs text-muted mb-2">Dispo ${d.number}</p>`;
        html += `<div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
        d.paires.forEach((p, pi) => {
          const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
          html += `<div class="port-cell ${cls}" title="Port ${p.number} - ${p.status}" onclick="handleSRTransportPortClick(${fi},${ti},${di},${pi})">${p.number}</div>`;
        });
        html += '</div>';
      });
      html += '</div></div>';
    });
    html += '</div>';
  });
  showDetailPanel(`SR: ${dev.name}`, html);
}

function showSRDistribution() {
  const dev = getSRs().find(x => x.id === currentDetail.device.id) || currentDetail.device;
  currentDetail.device = dev;
  let html = `<button class="text-accent text-sm mb-3" style="background:none;border:none;cursor:pointer;color:#fff" onclick="showDetailOverview()">← Retour</button>`;
  html += `<h3 class="text-accent font-bold mb-3">Distribution Tites</h3>`;
  dev.distributionTites.forEach((dt, dti) => {
    html += `<div style="margin-bottom:16px;background:var(--card);border:1px solid var(--border);border-radius:#fff">`;
    html += `<div class="noc-header">Tite ${dt.number}</div><div class="noc-body space-y">`;
    dt.dispos.forEach((d, di) => {
      html += `<div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px" class="space-y-sm">`;
      html += `<p class="text-sm font-bold text-accent mb-2">Dispo ${d.number}</p><div class="grid-2">`;
      // 14 premières
      html += `<div><p class="text-xs text-muted mb-2">14 premières</p><div class="space-y-sm">`;
      html += `<div><p class="text-xs text-muted">7 premières</p><div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
      d.paires.slice(0, 7).forEach((p, pi) => {
        const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
        html += `<div class="port-cell ${cls}" onclick="handleSRDistPortClick(${dti},${di},${pi})">${p.number}</div>`;
      });
      html += `</div></div><div><p class="text-xs text-muted">7 suivantes</p><div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
      d.paires.slice(7, 14).forEach((p, pi) => {
        const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
        html += `<div class="port-cell ${cls}" onclick="handleSRDistPortClick(${dti},${di},${pi + 7})">${p.number}</div>`;
      });
      html += `</div></div></div></div>`;
      // 14 suivantes
      html += `<div><p class="text-xs text-muted mb-2">14 suivantes</p><div class="space-y-sm">`;
      html += `<div><p class="text-xs text-muted">7 premières</p><div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
      d.paires.slice(14, 21).forEach((p, pi) => {
        const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
        html += `<div class="port-cell ${cls}" onclick="handleSRDistPortClick(${dti},${di},${pi + 14})">${p.number}</div>`;
      });
      html += `</div></div><div><p class="text-xs text-muted">7 suivantes</p><div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
      d.paires.slice(21, 28).forEach((p, pi) => {
        const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
        html += `<div class="port-cell ${cls}" onclick="handleSRDistPortClick(${dti},${di},${pi + 21})">${p.number}</div>`;
      });
      html += `</div></div></div></div>`;
      html += '</div></div>';
    });
    html += '</div></div>';
  });
  showDetailPanel(`SR: ${dev.name}`, html);
}

// ===== CREATION NA FLOW (from toolbar) =====
function startCreationNA() {
  hideModal();
  naData = {};
  naStep = 'na-choose-msan';
  const msans = getMSANs();
  let html = `<div class="noc-header"><span>Création NA - Choisir MSAN</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div><div class="noc-body space-y">`;
  if (!msans.length) { html += '<p class="text-muted text-sm">Aucun MSAN disponible</p>'; }
  msans.forEach(m => {
    html += `<div class="device-card" onclick="naChooseMSAN('${m.id}')"><span class="text-primary font-bold">${m.name}</span><p class="text-xs text-muted">${m.cartes.length} cartes, ${m.fermes.length} fermes</p></div>`;
  });
  html += '</div>';
  showModal(html);
}

function naChooseMSAN(id) {
  const msan = getMSANs().find(m => m.id === id);
  naData.msanId = id;
  naData.msanName = msan.name;
  naData.msanType = msan.type;
  // Choose carte
  let html = `<div class="noc-header"><span>Choisir Carte</span><span style="cursor:pointer" onclick="startCreationNA()">← Retour</span></div><div class="noc-body"><div class="grid-4">`;
  msan.cartes.forEach((c, i) => {
    html += `<div class="device-card text-center" onclick="naChooseCarte(${i},${c.number})"><span class="text-primary font-bold">C${c.number}</span></div>`;
  });
  html += '</div></div>';
  showModal(html);
}

function naChooseCarte(idx, num) {
  naData.carteIdx = idx;
  naData.carteNum = num;
  const msan = getMSANs().find(m => m.id === naData.msanId);
  const carte = msan.cartes[idx];
  // Choose port in carte
  let html = `<div class="noc-header"><span>Carte ${num} - Choisir Port</span><span style="cursor:pointer" onclick="naChooseMSAN('${naData.msanId}')">← Retour</span></div><div class="noc-body">`;
  html += `<div class="port-grid" style="grid-template-columns:repeat(8,1fr)">`;
  carte.ports.forEach((p, i) => {
    const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
    html += `<div class="port-cell ${cls}" onclick="naChooseCartePort(${i},${p.number})">${p.number}</div>`;
  });
  html += '</div></div>';
  showModal(html);
}

function naChooseCartePort(idx, num) {
  naData.portIdx = idx;
  naData.portNum = num;
  // Choose ferme
  const msan = getMSANs().find(m => m.id === naData.msanId);
  let html = `<div class="noc-header"><span>Choisir Ferme Transport</span><span style="cursor:pointer" onclick="naChooseCarte(${naData.carteIdx},${naData.carteNum})">← Retour</span></div><div class="noc-body"><div class="grid-4">`;
  msan.fermes.forEach((f, i) => {
    html += `<div class="device-card text-center" onclick="naChooseFerme(${i},${f.number})"><span class="text-primary font-bold">F${f.number}</span><p class="text-xs text-muted">${f.tites.length} tites</p></div>`;
  });
  html += '</div></div>';
  showModal(html);
}

function naChooseFerme(idx, num) {
  naData.fermeIdx = idx;
  naData.fermeNum = num;
  const msan = getMSANs().find(m => m.id === naData.msanId);
  const ferme = msan.fermes[idx];
  let html = `<div class="noc-header"><span>Choisir Tite dans Ferme ${num}</span><span style="cursor:pointer" onclick="naChooseCartePort(${naData.portIdx},${naData.portNum})">← Retour</span></div><div class="noc-body"><div class="grid-4">`;
  ferme.tites.forEach((t, i) => {
    html += `<div class="device-card text-center" onclick="naChooseTite(${i},${t.number})"><span class="text-primary font-bold">T${t.number}</span></div>`;
  });
  html += '</div></div>';
  showModal(html);
}

function naChooseTite(idx, num) {
  naData.titeIdx = idx;
  naData.titeNum = num;
  // Show transport ports
  const msan = getMSANs().find(m => m.id === naData.msanId);
  const tite = msan.fermes[naData.fermeIdx].tites[idx];
  let html = `<div class="noc-header"><span>Transport Tite ${num} - Choisir Paire</span><span style="cursor:pointer" onclick="naChooseFerme(${naData.fermeIdx},${naData.fermeNum})">← Retour</span></div><div class="noc-body space-y">`;
  tite.dispos.forEach((d, di) => {
    html += `<p class="text-xs text-muted mb-2">Dispo ${d.number}</p>`;
    html += `<div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
    d.paires.forEach((p, pi) => {
      const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
      html += `<div class="port-cell ${cls}" onclick="naChooseTransportPaire(${di},${pi},${d.number},${p.number})">${p.number}</div>`;
    });
    html += '</div>';
  });
  html += '</div>';
  showModal(html);
}

function naChooseTransportPaire(dispoIdx, paireIdx, dispoNum, paireNum) {
  naData.transportDispoIdx = dispoIdx;
  naData.transportPaireIdx = paireIdx;
  naData.dispoNum = dispoNum;
  naData.paireNum = paireNum;
  // Choose SR - only show SRs that have matching ferme number AND tite number
  const srs = getSRs();
  const matchingSRs = srs.filter(s => {
    return (s.transportFermes || []).some(f => 
      f.number === naData.fermeNum && f.tites.some(t => t.number === naData.titeNum)
    );
  });
  let html = `<div class="noc-header"><span>Choisir SR</span><span style="cursor:pointer" onclick="naChooseTite(${naData.titeIdx},${naData.titeNum})">← Retour</span></div><div class="noc-body space-y">`;
  if (!matchingSRs.length) html += `<p class="text-muted text-sm">Aucun SR avec Ferme ${naData.fermeNum} / Tite ${naData.titeNum}</p>`;
  matchingSRs.forEach(s => {
    html += `<div class="device-card" onclick="naChooseSR('${s.id}','${s.name}')"><span class="text-accent font-bold">🔌 ${s.name}</span><p class="text-xs text-muted">Ferme ${naData.fermeNum} / Tite ${naData.titeNum} ✓</p></div>`;
  });
  html += '</div>';
  showModal(html);
}

function naChooseSR(id, name) {
  const sr = getSRs().find(s => s.id === id);
  naData.srId = id;
  naData.srName = name;

  // Auto-match SR transport: find same tite number
  let foundFermeIdx = -1, foundTiteIdx = -1;
  (sr.transportFermes || []).forEach((f, fi) => {
    f.tites.forEach((t, ti) => {
      if (t.number === naData.titeNum && foundFermeIdx === -1) {
        foundFermeIdx = fi;
        foundTiteIdx = ti;
      }
    });
  });

  if (foundFermeIdx === -1) {
    alert(`SR ${name} ne contient pas de Transport Tite ${naData.titeNum}`);
    return;
  }

  naData.srTransportFermeIdx = foundFermeIdx;
  naData.srTransportTiteIdx = foundTiteIdx;
  naData.srTransportDispoIdx = naData.transportDispoIdx;
  naData.srTransportPaireIdx = naData.transportPaireIdx;

  // Go directly to distribution tite selection
  naShowDistTite();
}

function naShowDistTite() {
  const sr = getSRs().find(s => s.id === naData.srId);
  let html = `<div class="noc-header"><span>Distribution SR ${sr.name} - Choisir Tite</span><span style="cursor:pointer" onclick="naChooseTransportPaire(${naData.transportDispoIdx},${naData.transportPaireIdx},${naData.dispoNum},${naData.paireNum})">← Retour</span></div><div class="noc-body"><div class="grid-4">`;
  sr.distributionTites.forEach((t, i) => {
    html += `<div class="device-card text-center" onclick="naChooseDistTite(${i},${t.number})"><span class="text-accent font-bold">DT${t.number}</span></div>`;
  });
  html += '</div></div>';
  showModal(html);
}

function naChooseDistTite(idx, num) {
  naData.distTiteIdx = idx;
  naData.distTiteNum = num;
  naShowDistLayout();
}

function naShowDistLayout() {
  const sr = getSRs().find(s => s.id === naData.srId);
  const dt = sr.distributionTites[naData.distTiteIdx];
  let html = `<div class="noc-header"><span>Distribution Tite ${dt.number} - Choisir Paire</span><span style="cursor:pointer" onclick="naShowDistTite()">← Retour</span></div><div class="noc-body space-y">`;
  dt.dispos.forEach((d, di) => {
    html += `<div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px" class="space-y-sm">`;
    html += `<p class="text-sm font-bold text-accent mb-2">Dispo ${d.number}</p><div class="grid-2">`;
    html += `<div><p class="text-xs text-muted mb-2">14 premières</p><div class="space-y-sm">`;
    html += `<div><p class="text-xs text-muted">7 premières</p><div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
    d.paires.slice(0, 7).forEach((p, pi) => {
      const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
      html += `<div class="port-cell ${cls}" onclick="naSelectDistPaire(${di},${pi},1,1,${d.number},${dt.number})">${p.number}</div>`;
    });
    html += `</div></div><div><p class="text-xs text-muted">7 suivantes</p><div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
    d.paires.slice(7, 14).forEach((p, pi) => {
      const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
      html += `<div class="port-cell ${cls}" onclick="naSelectDistPaire(${di},${pi + 7},1,2,${d.number},${dt.number})">${p.number}</div>`;
    });
    html += `</div></div></div></div>`;
    html += `<div><p class="text-xs text-muted mb-2">14 suivantes</p><div class="space-y-sm">`;
    html += `<div><p class="text-xs text-muted">7 premières</p><div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
    d.paires.slice(14, 21).forEach((p, pi) => {
      const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
      html += `<div class="port-cell ${cls}" onclick="naSelectDistPaire(${di},${pi + 14},2,1,${d.number},${dt.number})">${p.number}</div>`;
    });
    html += `</div></div><div><p class="text-xs text-muted">7 suivantes</p><div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
    d.paires.slice(21, 28).forEach((p, pi) => {
      const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
      html += `<div class="port-cell ${cls}" onclick="naSelectDistPaire(${di},${pi + 21},2,2,${d.number},${dt.number})">${p.number}</div>`;
    });
    html += `</div></div></div></div>`;
    html += '</div></div>';
  });
  html += '</div>';
  showModal(html);
}

function naSelectDistPaire(dispoIdx, paireIdx, half, seven, dispoNum, titeNum) {
  naData.distDispoIdx = dispoIdx;
  naData.distPaireIdx = paireIdx;
  naData.distDispoNum = dispoNum;
  naData.distHalf = half;
  naData.distSeven = seven;
  const sr = getSRs().find(s => s.id === naData.srId);
  naData.distPaire = sr.distributionTites[naData.distTiteIdx].dispos[dispoIdx].paires[paireIdx].number;
  // Choose PC
  naShowPCSelect();
}

function naShowPCSelect() {
  const pcs = getPCs();
  let html = `<div class="noc-header"><span>Choisir PC</span><span style="cursor:pointer" onclick="naShowDistLayout()">← Retour</span></div><div class="noc-body space-y">`;
  if (!pcs.length) html += '<p class="text-muted text-sm">Aucun PC disponible</p>';
  pcs.forEach(p => {
    html += `<div class="device-card" onclick="naChoosePC('${p.id}','${p.number}')"><span class="text-success font-bold">PC ${p.number}</span></div>`;
  });
  html += '</div>';
  showModal(html);
}

function naChoosePC(id, number) {
  naData.pcId = id;
  naData.pcNumber = number;
  const pc = getPCs().find(p => p.id === id);
  let html = `<div class="noc-header"><span>PC ${number} - Choisir Paire</span><span style="cursor:pointer" onclick="naShowPCSelect()">← Retour</span></div><div class="noc-body">`;
  html += `<div class="port-grid" style="grid-template-columns:repeat(7,1fr);gap:6px">`;
  pc.paires.forEach((p, i) => {
    const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
    html += `<div class="port-cell ${cls}" style="height:48px" onclick="naFinalizeNA(${i})">${p.number}</div>`;
  });
  html += '</div></div>';
  showModal(html);
}

function naFinalizeNA(pcPaireIdx) {
  const pc = getPCs().find(p => p.id === naData.pcId);
  const dev = getMSANs().find(m => m.id === naData.msanId);
  const sr = getSRs().find(s => s.id === naData.srId);
  const typeCode = dev.type === 'indoor' ? 'IN' : 'OUT';
  const constitution = `MH${typeCode}-TA-${dev.name}:1-0-${naData.carteNum}-${naData.portNum}, TR:${naData.fermeNum}/${naData.titeNum}-${naData.dispoNum} p${naData.paireNum}, TR-${naData.srName}:${naData.fermeNum}/${naData.titeNum}-${naData.dispoNum} p${naData.paireNum}, D:${naData.distTiteNum}${naData.distDispoNum}/${naData.distHalf} p${naData.distPaire}, PC ${naData.pcNumber} p${pc.paires[pcPaireIdx].number}`;

  // Update all ports to ok
  dev.cartes[naData.carteIdx].ports[naData.portIdx].status = 'ok';
  dev.fermes[naData.fermeIdx].tites[naData.titeIdx].dispos[naData.transportDispoIdx].paires[naData.transportPaireIdx].status = 'ok';
  updateMSAN(dev);

  sr.transportFermes[naData.srTransportFermeIdx].tites[naData.srTransportTiteIdx].dispos[naData.srTransportDispoIdx].paires[naData.srTransportPaireIdx].status = 'ok';
  sr.distributionTites[naData.distTiteIdx].dispos[naData.distDispoIdx].paires[naData.distPaireIdx].status = 'ok';
  updateSR(sr);

  pc.paires[pcPaireIdx].status = 'ok';
  updatePC(pc);

  addAbonne({
    id: uuid(), msanId: naData.msanId, msanName: naData.msanName, msanType: naData.msanType,
    carteIdx: naData.carteIdx, carteNum: naData.carteNum, portIdx: naData.portIdx, portNum: naData.portNum,
    fermeIdx: naData.fermeIdx, fermeNum: naData.fermeNum, titeIdx: naData.titeIdx, titeNum: naData.titeNum, 
    dispoIdx: naData.transportDispoIdx, dispoNum: naData.dispoNum, paireIdx: naData.transportPaireIdx, paireNum: naData.paireNum,
    srId: naData.srId, srName: naData.srName, srTransportFermeIdx: naData.srTransportFermeIdx, srTransportTiteIdx: naData.srTransportTiteIdx,
    srTransportDispoIdx: naData.srTransportDispoIdx, srTransportPaireIdx: naData.srTransportPaireIdx,
    distTiteIdx: naData.distTiteIdx, distTiteNum: naData.distTiteNum, distDispoIdx: naData.distDispoIdx, distDispoNum: naData.distDispoNum,
    distHalf: naData.distHalf, distSeven: naData.distSeven, distPaire: naData.distPaire, distPaireIdx: naData.distPaireIdx,
    pcId: naData.pcId, pcNumber: naData.pcNumber, pcPaireIdx: pcPaireIdx, pcPaire: pc.paires[pcPaireIdx].number, constitution
  });

  showModal(`
    <div class="noc-header"><span>Abonné créé</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div>
    <div class="noc-body">
      <p class="text-success font-bold text-sm break-all" style="font-family:monospace">${constitution}</p>
      <button class="btn-primary mt-3" onclick="hideModal()">Fermer</button>
    </div>
  `);
  refreshMarkers();
}

// ===== CHANGEMENT PORT DE CARTE =====
function startChangementCarte() {
  hideModal();
  const abonnes = getAbonnes();
  if (!abonnes.length) { showModal(`<div class="noc-header"><span>Aucun abonné</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div><div class="noc-body"><p class="text-muted text-sm">Aucun abonné à modifier</p></div>`); return; }
  
  let html = `<div class="noc-header"><span>Changement Port Carte</span><span style="cursor:pointer" onclick="showCreationMenu()">← Retour</span></div><div class="noc-body space-y">`;
  html += `<p class="text-xs text-muted">Choisir l'abonné à modifier</p>`;
  abonnes.forEach((a, i) => {
    html += `<div class="device-card" onclick="doChangementCarte(${i})"><p class="text-primary text-xs break-all" style="font-family:monospace">${a.constitution}</p></div>`;
  });
  html += '</div>';
  showModal(html);
}

function doChangementCarte(abIdx) {
  const abonnes = getAbonnes();
  const ab = abonnes[abIdx];
  const msan = getMSANs().find(m => m.id === ab.msanId);
  if (!msan) return;

  let html = `<div class="noc-header"><span>Nouveau Port Carte</span><span style="cursor:pointer" onclick="startChangementCarte()">← Retour</span></div><div class="noc-body space-y">`;
  html += `<p class="text-xs text-muted mb-2">Ancien: Carte ${ab.carteNum} Port ${ab.portNum}</p>`;
  html += `<p class="text-xs text-muted mb-2">Choisir nouvelle carte:</p><div class="grid-4">`;
  msan.cartes.forEach((c, ci) => {
    html += `<div class="device-card text-center" onclick="doChangementCarteSelect(${abIdx},${ci},${c.number})"><span class="text-primary font-bold">C${c.number}</span></div>`;
  });
  html += '</div></div>';
  showModal(html);
}

function doChangementCarteSelect(abIdx, carteIdx, carteNum) {
  const abonnes = getAbonnes();
  const ab = abonnes[abIdx];
  const msan = getMSANs().find(m => m.id === ab.msanId);
  const carte = msan.cartes[carteIdx];

  let html = `<div class="noc-header"><span>Carte ${carteNum} - Choisir Port</span><span style="cursor:pointer" onclick="doChangementCarte(${abIdx})">← Retour</span></div><div class="noc-body">`;
  html += `<div class="port-grid" style="grid-template-columns:repeat(8,1fr)">`;
  carte.ports.forEach((p, pi) => {
    const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
    html += `<div class="port-cell ${cls}" onclick="doChangementCarteFinalize(${abIdx},${carteIdx},${carteNum},${pi},${p.number})">${p.number}</div>`;
  });
  html += '</div></div>';
  showModal(html);
}

function doChangementCarteFinalize(abIdx, newCarteIdx, newCarteNum, newPortIdx, newPortNum) {
  // Ask what status to set old port
  showPortChoice(function(oldStatus) {
    const s = getState();
    const ab = s.abonnes[abIdx];
    const msan = s.msans.find(m => m.id === ab.msanId);

    // Set old port status
    msan.cartes[ab.carteIdx].ports[ab.portIdx].status = oldStatus;
    // Set new port to ok
    msan.cartes[newCarteIdx].ports[newPortIdx].status = 'ok';

    // Update abonné
    ab.carteIdx = newCarteIdx;
    ab.carteNum = newCarteNum;
    ab.portIdx = newPortIdx;
    ab.portNum = newPortNum;
    
    // Rebuild constitution
    ab.constitution = rebuildConstitution(ab, msan.name, msan.type);

    saveState(s);
    showModal(`<div class="noc-header"><span>Port carte changé</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div><div class="noc-body"><p class="text-success text-sm">Carte ${newCarteNum} Port ${newPortNum}</p><button class="btn-primary mt-3" onclick="hideModal()">Fermer</button></div>`);
    refreshMarkers();
  });
}

// ===== CHANGEMENT PORT DE TRANSPORT =====
function startChangementTransport() {
  hideModal();
  const abonnes = getAbonnes();
  if (!abonnes.length) { showModal(`<div class="noc-header"><span>Aucun abonné</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div><div class="noc-body"><p class="text-muted text-sm">Aucun abonné à modifier</p></div>`); return; }
  
  let html = `<div class="noc-header"><span>Changement Port Transport</span><span style="cursor:pointer" onclick="showCreationMenu()">← Retour</span></div><div class="noc-body space-y">`;
  html += `<p class="text-xs text-muted">Choisir l'abonné à modifier</p>`;
  abonnes.forEach((a, i) => {
    html += `<div class="device-card" onclick="doChangementTransport(${i})"><p class="text-primary text-xs break-all" style="font-family:monospace">${a.constitution}</p></div>`;
  });
  html += '</div>';
  showModal(html);
}

function doChangementTransport(abIdx) {
  const abonnes = getAbonnes();
  const ab = abonnes[abIdx];
  const msan = getMSANs().find(m => m.id === ab.msanId);
  if (!msan) return;

  // Choose ferme
  let html = `<div class="noc-header"><span>Nouvelle Ferme Transport MSAN</span><span style="cursor:pointer" onclick="startChangementTransport()">← Retour</span></div><div class="noc-body"><div class="grid-4">`;
  msan.fermes.forEach((f, fi) => {
    html += `<div class="device-card text-center" onclick="doChgTransFerme(${abIdx},${fi},${f.number})"><span class="text-primary font-bold">F${f.number}</span></div>`;
  });
  html += '</div></div>';
  showModal(html);
}

function doChgTransFerme(abIdx, fi, fnum) {
  window._chgTrans = { abIdx, fermeIdx: fi, fermeNum: fnum };
  const abonnes = getAbonnes();
  const ab = abonnes[abIdx];
  const msan = getMSANs().find(m => m.id === ab.msanId);
  const ferme = msan.fermes[fi];

  let html = `<div class="noc-header"><span>Choisir Tite dans Ferme ${fnum}</span><span style="cursor:pointer" onclick="doChangementTransport(${abIdx})">← Retour</span></div><div class="noc-body"><div class="grid-4">`;
  ferme.tites.forEach((t, ti) => {
    html += `<div class="device-card text-center" onclick="doChgTransTite(${ti},${t.number})"><span class="text-primary font-bold">T${t.number}</span></div>`;
  });
  html += '</div></div>';
  showModal(html);
}

function doChgTransTite(ti, tnum) {
  window._chgTrans.titeIdx = ti;
  window._chgTrans.titeNum = tnum;
  const abonnes = getAbonnes();
  const ab = abonnes[window._chgTrans.abIdx];
  const msan = getMSANs().find(m => m.id === ab.msanId);
  const tite = msan.fermes[window._chgTrans.fermeIdx].tites[ti];

  let html = `<div class="noc-header"><span>Choisir Paire Transport</span><span style="cursor:pointer" onclick="doChgTransFerme(${window._chgTrans.abIdx},${window._chgTrans.fermeIdx},${window._chgTrans.fermeNum})">← Retour</span></div><div class="noc-body space-y">`;
  tite.dispos.forEach((d, di) => {
    html += `<p class="text-xs text-muted mb-2">Dispo ${d.number}</p>`;
    html += `<div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
    d.paires.forEach((p, pi) => {
      const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
      html += `<div class="port-cell ${cls}" onclick="doChgTransFinalize(${di},${pi},${d.number},${p.number})">${p.number}</div>`;
    });
    html += '</div>';
  });
  html += '</div>';
  showModal(html);
}

function doChgTransFinalize(dispoIdx, paireIdx, dispoNum, paireNum) {
  // Ask what status to set old port
  showPortChoice(function(oldStatus) {
    const ct = window._chgTrans;
    const s = getState();
    const ab = s.abonnes[ct.abIdx];
    const msan = s.msans.find(m => m.id === ab.msanId);
    const sr = s.srs.find(x => x.id === ab.srId);

    // Set old MSAN transport port status
    if (msan && ab.fermeIdx !== undefined) {
      msan.fermes[ab.fermeIdx].tites[ab.titeIdx].dispos[ab.dispoIdx].paires[ab.paireIdx].status = oldStatus;
    }
    // Set old SR transport port status
    if (sr && ab.srTransportFermeIdx !== undefined) {
      sr.transportFermes[ab.srTransportFermeIdx].tites[ab.srTransportTiteIdx].dispos[ab.srTransportDispoIdx].paires[ab.srTransportPaireIdx].status = oldStatus;
    }

    // Set new MSAN transport port to ok
    msan.fermes[ct.fermeIdx].tites[ct.titeIdx].dispos[dispoIdx].paires[paireIdx].status = 'ok';

    // Auto-sync SR transport: find matching tite
    if (sr) {
      let newSRFermeIdx = -1, newSRTiteIdx = -1;
      (sr.transportFermes || []).forEach((f, fi) => {
        f.tites.forEach((t, ti) => {
          if (t.number === ct.titeNum && newSRFermeIdx === -1) {
            newSRFermeIdx = fi;
            newSRTiteIdx = ti;
          }
        });
      });
      if (newSRFermeIdx >= 0) {
        sr.transportFermes[newSRFermeIdx].tites[newSRTiteIdx].dispos[dispoIdx].paires[paireIdx].status = 'ok';
        ab.srTransportFermeIdx = newSRFermeIdx;
        ab.srTransportTiteIdx = newSRTiteIdx;
        ab.srTransportDispoIdx = dispoIdx;
        ab.srTransportPaireIdx = paireIdx;
      }
    }

    // Update abonné
    ab.fermeIdx = ct.fermeIdx;
    ab.fermeNum = ct.fermeNum;
    ab.titeIdx = ct.titeIdx;
    ab.titeNum = ct.titeNum;
    ab.dispoIdx = dispoIdx;
    ab.dispoNum = dispoNum;
    ab.paireIdx = paireIdx;
    ab.paireNum = paireNum;

    ab.constitution = rebuildConstitution(ab);
    saveState(s);
    showModal(`<div class="noc-header"><span>Transport changé</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div><div class="noc-body"><p class="text-success text-sm">F${ct.fermeNum}/T${ct.titeNum} D${dispoNum} P${paireNum}</p><p class="text-xs text-muted mt-2">SR transport mis à jour automatiquement</p><button class="btn-primary mt-3" onclick="hideModal()">Fermer</button></div>`);
    refreshMarkers();
  });
}

// ===== CHANGEMENT PORT DE DISTRIBUTION =====
function startChangementDistribution() {
  hideModal();
  const abonnes = getAbonnes();
  if (!abonnes.length) { showModal(`<div class="noc-header"><span>Aucun abonné</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div><div class="noc-body"><p class="text-muted text-sm">Aucun abonné à modifier</p></div>`); return; }
  
  let html = `<div class="noc-header"><span>Changement Port Distribution</span><span style="cursor:pointer" onclick="showCreationMenu()">← Retour</span></div><div class="noc-body space-y">`;
  abonnes.forEach((a, i) => {
    html += `<div class="device-card" onclick="doChangementDist(${i})"><p class="text-primary text-xs break-all" style="font-family:monospace">${a.constitution}</p></div>`;
  });
  html += '</div>';
  showModal(html);
}

function doChangementDist(abIdx) {
  window._chgDist = { abIdx };
  const abonnes = getAbonnes();
  const ab = abonnes[abIdx];
  const sr = getSRs().find(s => s.id === ab.srId);
  if (!sr) return;

  // Choose distribution tite
  let html = `<div class="noc-header"><span>Nouvelle Distribution Tite</span><span style="cursor:pointer" onclick="startChangementDistribution()">← Retour</span></div><div class="noc-body"><div class="grid-4">`;
  sr.distributionTites.forEach((t, i) => {
    html += `<div class="device-card text-center" onclick="doChgDistTite(${i},${t.number})"><span class="text-accent font-bold">DT${t.number}</span></div>`;
  });
  html += '</div></div>';
  showModal(html);
}

function doChgDistTite(titeIdx, titeNum) {
  window._chgDist.distTiteIdx = titeIdx;
  window._chgDist.distTiteNum = titeNum;
  const abonnes = getAbonnes();
  const ab = abonnes[window._chgDist.abIdx];
  const sr = getSRs().find(s => s.id === ab.srId);
  const dt = sr.distributionTites[titeIdx];

  let html = `<div class="noc-header"><span>Distribution Tite ${titeNum} - Choisir Paire</span><span style="cursor:pointer" onclick="doChangementDist(${window._chgDist.abIdx})">← Retour</span></div><div class="noc-body space-y">`;
  dt.dispos.forEach((d, di) => {
    html += `<p class="text-xs text-muted mb-2">Dispo ${d.number}</p>`;
    html += `<div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
    d.paires.forEach((p, pi) => {
      const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
      html += `<div class="port-cell ${cls}" onclick="doChgDistPaire(${di},${pi},${d.number},${p.number})">${p.number}</div>`;
    });
    html += '</div>';
  });
  html += '</div>';
  showModal(html);
}

function doChgDistPaire(dispoIdx, paireIdx, dispoNum, paireNum) {
  window._chgDist.newDistDispoIdx = dispoIdx;
  window._chgDist.newDistPaireIdx = paireIdx;
  window._chgDist.newDistDispoNum = dispoNum;
  window._chgDist.newDistPaire = paireNum;
  // Now choose PC
  const pcs = getPCs();
  let html = `<div class="noc-header"><span>Choisir PC</span><span style="cursor:pointer" onclick="doChgDistTite(${window._chgDist.distTiteIdx},${window._chgDist.distTiteNum})">← Retour</span></div><div class="noc-body space-y">`;
  pcs.forEach(p => {
    html += `<div class="device-card" onclick="doChgDistPC('${p.id}','${p.number}')"><span class="text-success font-bold">📦 PC ${p.number}</span></div>`;
  });
  html += '</div>';
  showModal(html);
}

function doChgDistPC(pcId, pcNumber) {
  window._chgDist.newPcId = pcId;
  window._chgDist.newPcNumber = pcNumber;
  const pc = getPCs().find(p => p.id === pcId);
  let html = `<div class="noc-header"><span>PC ${pcNumber} - Choisir Paire</span><span style="cursor:pointer" onclick="doChgDistPaire(${window._chgDist.newDistDispoIdx},${window._chgDist.newDistPaireIdx},${window._chgDist.newDistDispoNum},${window._chgDist.newDistPaire})">← Retour</span></div><div class="noc-body">`;
  html += `<div class="port-grid" style="grid-template-columns:repeat(7,1fr);gap:6px">`;
  pc.paires.forEach((p, i) => {
    const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : p.status === 'movie' ? 'port-movie' : 'port-empty';
    html += `<div class="port-cell ${cls}" style="height:48px" onclick="doChgDistFinalize(${i})">${p.number}</div>`;
  });
  html += '</div></div>';
  showModal(html);
}

function doChgDistFinalize(newPcPaireIdx) {
  // Ask what status for old ports
  showPortChoice(function(oldStatus) {
    const cd = window._chgDist;
    const s = getState();
    const ab = s.abonnes[cd.abIdx];
    const sr = s.srs.find(x => x.id === ab.srId);
    const oldPc = s.pcs.find(x => x.id === ab.pcId);
    const newPc = s.pcs.find(x => x.id === cd.newPcId);

    // Set old distribution port status
    if (sr && ab.distTiteIdx !== undefined) {
      sr.distributionTites[ab.distTiteIdx].dispos[ab.distDispoIdx].paires[ab.distPaireIdx].status = oldStatus;
    }
    // Set old PC port status
    if (oldPc && ab.pcPaireIdx !== undefined) {
      oldPc.paires[ab.pcPaireIdx].status = oldStatus;
    }

    // Set new distribution port to ok
    sr.distributionTites[cd.distTiteIdx].dispos[cd.newDistDispoIdx].paires[cd.newDistPaireIdx].status = 'ok';
    // Set new PC port to ok
    newPc.paires[newPcPaireIdx].status = 'ok';

    // Update abonné
    ab.distTiteIdx = cd.distTiteIdx;
    ab.distTiteNum = cd.distTiteNum;
    ab.distDispoIdx = cd.newDistDispoIdx;
    ab.distDispoNum = cd.newDistDispoNum;
    ab.distPaire = cd.newDistPaire;
    ab.distPaireIdx = cd.newDistPaireIdx;
    ab.pcId = cd.newPcId;
    ab.pcNumber = cd.newPcNumber;
    ab.pcPaireIdx = newPcPaireIdx;
    ab.pcPaire = newPc.paires[newPcPaireIdx].number;

    ab.constitution = rebuildConstitution(ab);
    saveState(s);
    showModal(`<div class="noc-header"><span>✅ Distribution changée</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div><div class="noc-body"><p class="text-success text-sm">Distribution et PC mis à jour</p><button class="btn-primary mt-3" onclick="hideModal()">Fermer</button></div>`);
    refreshMarkers();
  });
}

// ===== CHANGEMENT ÉTAT DE PORT =====
let etatPortMode = false;

function startChangementEtatPort() {
  hideModal();
  etatPortMode = true;
  viewerMode = false;
  showEtatPortPanel();
}

function showEtatPortPanel() {
  const msans = getMSANs();
  const srs = getSRs();
  const pcs = getPCs();

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#fff;color:#000;font-weight:bold;">
    <span>🔧 Changement État de Port</span>
    <button onclick="exitEtatPortMode()" style="background:#000;color:#fff;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;font-weight:bold;">✓ Terminer</button>
  </div>`;
  html += `<div style="padding:16px;overflow-y:auto;max-height:calc(100vh - 60px);">`;
  
  if (msans.length) {
    html += `<p class="text-sm font-bold mb-2" style="color:#fff;">MSAN</p>`;
    msans.forEach(m => {
      html += `<div class="device-card mb-2" onclick="etatPortOpenDevice('msan','${m.id}')"><span style="color:#fff;font-weight:bold;">${m.name}</span><p class="text-xs text-muted">${m.cartes.length} cartes, ${m.fermes.length} fermes</p></div>`;
    });
  }
  if (srs.length) {
    html += `<p class="text-sm font-bold mb-2 mt-3" style="color:#fff;">SR</p>`;
    srs.forEach(s => {
      html += `<div class="device-card mb-2" onclick="etatPortOpenDevice('sr','${s.id}')"><span style="color:#fff;font-weight:bold;">${s.name}</span><p class="text-xs text-muted">Transport: ${s.transportFermes ? s.transportFermes.length : 0} fermes</p></div>`;
    });
  }
  if (pcs.length) {
    html += `<p class="text-sm font-bold mb-2 mt-3" style="color:#fff;">PC</p>`;
    pcs.forEach(p => {
      html += `<div class="device-card mb-2" onclick="etatPortOpenDevice('pc','${p.id}')"><span style="color:#fff;font-weight:bold;">PC ${p.number}</span></div>`;
    });
  }
  html += '</div>';

  let existing = document.getElementById('detailOverlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'detailOverlay';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

function etatPortOpenDevice(type, id) {
  // Open device detail but override closeDetail to return to equipment list
  let device;
  if (type === 'msan') device = getMSANs().find(m => m.id === id);
  else if (type === 'sr') device = getSRs().find(s => s.id === id);
  else device = getPCs().find(p => p.id === id);
  if (!device) return;

  currentDetail = { type, device };
  naData = {};
  naStep = 'idle';
  showDetailOverview();

  // Override the back button to return to equipment list instead of closing
  const header = document.getElementById('detailHeader');
  if (header) {
    const backBtn = header.querySelector('button');
    if (backBtn) {
      backBtn.onclick = function() { showEtatPortPanel(); };
      backBtn.textContent = '← Liste équipements';
    }
  }
}

function exitEtatPortMode() {
  etatPortMode = false;
  viewerMode = true;
  const el = document.getElementById('detailOverlay');
  if (el) el.remove();
  currentDetail = null;
  naStep = 'idle';
  naData = {};
  refreshMarkers();
}

// ===== Search =====
function handleSearch() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  if (!query) return;
  const abonnes = getAbonnes();
  const msans = getMSANs();
  const results = abonnes.filter(a => {
    const m = msans.find(x => x.id === a.msanId);
    if (!m) return false;
    return m.name.toLowerCase().includes(query) || (a.constitution && a.constitution.toLowerCase().includes(query));
  });

  let html = `<div class="noc-header"><span>🔍 Résultats (${results.length})</span><span style="cursor:pointer" onclick="document.getElementById('searchModal').classList.add('hidden')">✕</span></div><div class="noc-body space-y">`;
  if (!results.length) {
    html += '<p class="text-muted text-sm">Aucun résultat trouvé</p>';
  } else {
    results.forEach(a => {
      html += `<div class="device-card"><p class="text-primary text-sm break-all" style="font-family:monospace">${a.constitution}</p></div>`;
    });
  }
  html += '</div>';
  document.getElementById('searchContent').innerHTML = html;
  document.getElementById('searchModal').classList.remove('hidden');
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  document.getElementById('toolbarToggle').addEventListener('click', toggleToolbar);
  document.getElementById('searchBtn').addEventListener('click', handleSearch);
  document.getElementById('searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleSearch(); });
});
