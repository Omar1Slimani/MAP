// ===== Storage =====
const STORAGE_KEY = 'telecom_data';

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

// ===== Data factories =====
function createPorts(count, start = 0) {
  return Array.from({ length: count }, (_, i) => ({ number: start + i, status: 'empty' }));
}
function createDispos(count) {
  return Array.from({ length: count }, (_, i) => ({ number: i + 1, paires: createPorts(28, 1) }));
}
function createTite(num) { return { number: num, dispos: createDispos(4) }; }
function createDistributionTite(num) { return { number: num, dispos: createDispos(4) }; }
function createCarte(num) { return { number: num, ports: createPorts(64) }; }
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

function makeIcon(label, bg, border) {
  return L.divIcon({
    html: `<div style="background:${bg};color:#000;font-weight:bold;font-size:10px;padding:2px 6px;border-radius:4px;white-space:nowrap;border:2px solid ${border};">${label}</div>`,
    className: '',
    iconSize: [50, 24],
    iconAnchor: [25, 12],
  });
}

const msanIcon = makeIcon('MSAN', 'hsl(185,70%,45%)', 'hsl(185,70%,35%)');
const srIcon = makeIcon('SR', 'hsl(35,90%,55%)', 'hsl(35,90%,40%)');
const pcIcon = makeIcon('PC', 'hsl(145,65%,42%)', 'hsl(145,65%,32%)');

function refreshMarkers() {
  markersLayer.clearLayers();
  getMSANs().forEach(m => {
    const marker = L.marker([m.lat, m.lng], { icon: msanIcon });
    marker.bindPopup(`<div style="color:#000"><strong>MSAN: ${m.name}</strong><br/>النوع: ${m.type === 'indoor' ? 'داخلي' : 'خارجي'}<br/>الكروت: ${m.cartes.length} | الفيرمات: ${m.fermes.length}<br/><button onclick="openDetail('msan','${m.id}')" style="margin-top:4px;padding:2px 8px;background:hsl(185,70%,45%);color:#000;border:none;border-radius:4px;cursor:pointer;">فتح التفاصيل</button></div>`);
    markersLayer.addLayer(marker);
  });
  getSRs().forEach(s => {
    const marker = L.marker([s.lat, s.lng], { icon: srIcon });
    marker.bindPopup(`<div style="color:#000"><strong>SR: ${s.name}</strong><br/>Transport: ${s.transportTites.length} | Distribution: ${s.distributionTites.length}<br/><button onclick="openDetail('sr','${s.id}')" style="margin-top:4px;padding:2px 8px;background:hsl(35,90%,55%);color:#000;border:none;border-radius:4px;cursor:pointer;">فتح التفاصيل</button></div>`);
    markersLayer.addLayer(marker);
  });
  getPCs().forEach(p => {
    const marker = L.marker([p.lat, p.lng], { icon: pcIcon });
    marker.bindPopup(`<div style="color:#000"><strong>PC: ${p.number}</strong><br/><button onclick="openDetail('pc','${p.id}')" style="margin-top:4px;padding:2px 8px;background:hsl(145,65%,42%);color:#000;border:none;border-radius:4px;cursor:pointer;">فتح التفاصيل</button></div>`);
    markersLayer.addLayer(marker);
  });
}

// ===== Modal helpers =====
function showModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modal').classList.remove('hidden');
}
function hideModal() { document.getElementById('modal').classList.add('hidden'); }

// ===== Picking coords =====
function startPickCoords(cb) {
  coordsCallback = cb;
  pickingCoords = true;
  document.getElementById('pickBanner').classList.remove('hidden');
  hideModal();
}

// ===== Creation wizard =====
function openCreation() {
  showModal(`
    <div class="noc-header"><span>⚡ إنشاء جديد</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div>
    <div class="noc-body space-y">
      <p class="text-muted text-sm">أدخل كلمة مرور المسؤول للمتابعة</p>
      <input id="pwInput" type="password" class="form-input" placeholder="كلمة المرور" />
      <div id="pwError" class="text-destructive text-sm"></div>
      <button class="btn-primary" onclick="checkPassword()">دخول</button>
    </div>
  `);
  setTimeout(() => { const el = document.getElementById('pwInput'); if (el) el.focus(); }, 100);
}

function checkPassword() {
  if (document.getElementById('pwInput').value === '1212') {
    showChooseType();
  } else {
    document.getElementById('pwError').textContent = 'كلمة المرور غير صحيحة';
  }
}

function showChooseType() {
  showModal(`
    <div class="noc-header"><span>⚡ إنشاء جديد</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div>
    <div class="noc-body space-y">
      <p class="text-muted text-sm">اختر نوع العنصر الذي تريد إنشاءه</p>
      <div class="device-card" onclick="showMSANType()"><span class="text-primary font-bold">📡 MSAN</span><p class="text-xs text-muted mt-2">إنشاء MSAN جديد (داخلي أو خارجي)</p></div>
      <div class="device-card" onclick="showSRForm()"><span class="text-accent font-bold">🔌 SR</span><p class="text-xs text-muted mt-2">إنشاء تحت الموزع</p></div>
      <div class="device-card" onclick="showPCForm()"><span class="text-success font-bold">📦 PC</span><p class="text-xs text-muted mt-2">إنشاء نقطة تركيز</p></div>
    </div>
  `);
}

// ===== MSAN Creation =====
let msanFormData = { type: 'indoor', fermes: [{ number: 1, tites: [{ number: 1 }] }] };

function showMSANType() {
  showModal(`
    <div class="noc-header"><span>📡 نوع MSAN</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div>
    <div class="noc-body space-y">
      <div class="device-card" onclick="msanFormData.type='indoor';showMSANForm()"><span class="text-primary font-bold">🏢 Indoor</span><p class="text-xs text-muted mt-2">MSAN داخل المبنى</p></div>
      <div class="device-card" onclick="msanFormData.type='outdoor';showMSANForm()"><span class="text-primary font-bold">🌍 Outdoor</span><p class="text-xs text-muted mt-2">MSAN في الخارج</p></div>
    </div>
  `);
}

function showMSANForm() {
  let fermesHTML = msanFormData.fermes.map((f, fi) => {
    let titesHTML = f.tites.map((t, ti) => `
      <div class="flex-row">
        <span class="text-xs text-muted">Tite:</span>
        <input type="number" class="form-input" style="width:60px" value="${t.number}" onchange="msanFormData.fermes[${fi}].tites[${ti}].number=parseInt(this.value)||0" />
        <button class="btn-danger" onclick="msanFormData.fermes[${fi}].tites.splice(${ti},1);showMSANForm()">✕</button>
      </div>
    `).join('');
    return `
      <div style="background:var(--muted);border-radius:var(--radius);padding:8px;" class="space-y-sm">
        <div class="flex-row">
          <span class="text-xs text-muted">Ferme رقم:</span>
          <input type="number" class="form-input" style="width:60px" value="${f.number}" onchange="msanFormData.fermes[${fi}].number=parseInt(this.value)||0" />
          <button class="btn-danger" onclick="msanFormData.fermes.splice(${fi},1);showMSANForm()">حذف</button>
        </div>
        <div style="padding-right:16px;" class="space-y-sm">
          <div class="flex-row" style="justify-content:space-between"><span class="text-xs text-muted">Tites:</span><button class="text-primary text-xs" style="background:none;border:none;cursor:pointer;color:var(--primary)" onclick="msanFormData.fermes[${fi}].tites.push({number:msanFormData.fermes[${fi}].tites.length+1});showMSANForm()">+ Tite</button></div>
          ${titesHTML}
        </div>
      </div>
    `;
  }).join('');

  showModal(`
    <div class="noc-header"><span>📡 إنشاء MSAN (${msanFormData.type === 'indoor' ? 'داخلي' : 'خارجي'})</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div>
    <div class="noc-body space-y">
      <div id="msanError" class="text-destructive text-sm"></div>
      <input id="msanName" class="form-input" placeholder="اسم MSAN (مثال: KSARKEBIR4-1)" />
      <div class="flex-row flex-wrap">
        <input id="msanLat" class="form-input" style="flex:1;min-width:80px" placeholder="خط العرض" />
        <input id="msanLng" class="form-input" style="flex:1;min-width:80px" placeholder="خط الطول" />
        <button class="btn-secondary" onclick="startPickCoords(function(lat,lng){document.getElementById('msanLat').value=lat.toFixed(6);document.getElementById('msanLng').value=lng.toFixed(6);showMSANForm();})">📍</button>
      </div>
      <input id="msanCartes" type="number" class="form-input" placeholder="عدد الكروت" value="8" min="1" max="20" />
      <div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px;" class="space-y-sm">
        <div class="flex-row" style="justify-content:space-between">
          <span class="text-sm font-bold text-primary">Fermes</span>
          <button style="background:none;border:none;cursor:pointer;color:var(--primary);font-size:0.75rem" onclick="msanFormData.fermes.push({number:msanFormData.fermes.length+1,tites:[{number:1}]});showMSANForm()">+ إضافة Ferme</button>
        </div>
        ${fermesHTML}
      </div>
      <div class="flex-row">
        <button class="btn-secondary" onclick="showChooseType()">رجوع</button>
        <button class="btn-primary" onclick="submitMSAN()">إنشاء MSAN</button>
      </div>
    </div>
  `);
}

function submitMSAN() {
  const name = document.getElementById('msanName').value.trim();
  const lat = parseFloat(document.getElementById('msanLat').value);
  const lng = parseFloat(document.getElementById('msanLng').value);
  const cartes = parseInt(document.getElementById('msanCartes').value) || 8;
  if (!name || isNaN(lat) || isNaN(lng)) { document.getElementById('msanError').textContent = 'يرجى ملء جميع الحقول'; return; }
  
  const msan = {
    id: uuid(), name, type: msanFormData.type, lat, lng,
    cartes: Array.from({ length: cartes }, (_, i) => createCarte(i)),
    fermes: msanFormData.fermes.map(f => ({ number: f.number, tites: f.tites.map(t => createTite(t.number)) }))
  };
  addMSAN(msan);
  msanFormData = { type: 'indoor', fermes: [{ number: 1, tites: [{ number: 1 }] }] };
  hideModal();
  refreshMarkers();
}

// ===== SR Creation =====
let srFormData = { transportTites: [{ number: 1 }], distTites: [{ number: 1 }] };

function showSRForm() {
  let trHTML = srFormData.transportTites.map((t, i) => `
    <div class="flex-row"><span class="text-xs text-muted">Tite:</span><input type="number" class="form-input" style="width:60px" value="${t.number}" onchange="srFormData.transportTites[${i}].number=parseInt(this.value)||0" /><button class="btn-danger" onclick="srFormData.transportTites.splice(${i},1);showSRForm()">✕</button></div>
  `).join('');
  let dtHTML = srFormData.distTites.map((t, i) => `
    <div class="flex-row"><span class="text-xs text-muted">Tite:</span><input type="number" class="form-input" style="width:60px" value="${t.number}" onchange="srFormData.distTites[${i}].number=parseInt(this.value)||0" /><button class="btn-danger" onclick="srFormData.distTites.splice(${i},1);showSRForm()">✕</button></div>
  `).join('');

  showModal(`
    <div class="noc-header"><span>🔌 إنشاء SR</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div>
    <div class="noc-body space-y">
      <div id="srError" class="text-destructive text-sm"></div>
      <input id="srName" class="form-input" placeholder="اسم SR (مثال: Moulay Mehdi)" />
      <div class="flex-row flex-wrap">
        <input id="srLat" class="form-input" style="flex:1;min-width:80px" placeholder="خط العرض" />
        <input id="srLng" class="form-input" style="flex:1;min-width:80px" placeholder="خط الطول" />
        <button class="btn-secondary" onclick="startPickCoords(function(lat,lng){document.getElementById('srLat').value=lat.toFixed(6);document.getElementById('srLng').value=lng.toFixed(6);showSRForm();})">📍</button>
      </div>
      <div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px;" class="space-y-sm">
        <div class="flex-row" style="justify-content:space-between"><span class="text-sm font-bold text-accent">Transport Tites</span><button style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:0.75rem" onclick="srFormData.transportTites.push({number:srFormData.transportTites.length+1});showSRForm()">+ إضافة</button></div>
        ${trHTML}
      </div>
      <div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px;" class="space-y-sm">
        <div class="flex-row" style="justify-content:space-between"><span class="text-sm font-bold text-accent">Distribution Tites</span><button style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:0.75rem" onclick="srFormData.distTites.push({number:srFormData.distTites.length+1});showSRForm()">+ إضافة</button></div>
        ${dtHTML}
      </div>
      <div class="flex-row">
        <button class="btn-secondary" onclick="showChooseType()">رجوع</button>
        <button class="btn-primary" onclick="submitSR()">إنشاء SR</button>
      </div>
    </div>
  `);
}

function submitSR() {
  const name = document.getElementById('srName').value.trim();
  const lat = parseFloat(document.getElementById('srLat').value);
  const lng = parseFloat(document.getElementById('srLng').value);
  if (!name || isNaN(lat) || isNaN(lng)) { document.getElementById('srError').textContent = 'يرجى ملء جميع الحقول'; return; }
  
  const sr = {
    id: uuid(), name, lat, lng,
    transportTites: srFormData.transportTites.map(t => createTite(t.number)),
    distributionTites: srFormData.distTites.map(t => createDistributionTite(t.number))
  };
  addSR(sr);
  srFormData = { transportTites: [{ number: 1 }], distTites: [{ number: 1 }] };
  hideModal();
  refreshMarkers();
}

// ===== PC Creation =====
function showPCForm() {
  showModal(`
    <div class="noc-header"><span>📦 إنشاء PC</span><span style="cursor:pointer" onclick="hideModal()">✕</span></div>
    <div class="noc-body space-y">
      <div id="pcError" class="text-destructive text-sm"></div>
      <input id="pcNum" class="form-input" placeholder="رقم PC (مثال: 221/1)" />
      <div class="flex-row flex-wrap">
        <input id="pcLat" class="form-input" style="flex:1;min-width:80px" placeholder="خط العرض" />
        <input id="pcLng" class="form-input" style="flex:1;min-width:80px" placeholder="خط الطول" />
        <button class="btn-secondary" onclick="startPickCoords(function(lat,lng){document.getElementById('pcLat').value=lat.toFixed(6);document.getElementById('pcLng').value=lng.toFixed(6);showPCForm();})">📍</button>
      </div>
      <p class="text-xs text-muted">PC يحتوي تلقائيًا على 7 paires</p>
      <div class="flex-row">
        <button class="btn-secondary" onclick="showChooseType()">رجوع</button>
        <button class="btn-primary" onclick="submitPC()">إنشاء PC</button>
      </div>
    </div>
  `);
}

function submitPC() {
  const num = document.getElementById('pcNum').value.trim();
  const lat = parseFloat(document.getElementById('pcLat').value);
  const lng = parseFloat(document.getElementById('pcLng').value);
  if (!num || isNaN(lat) || isNaN(lng)) { document.getElementById('pcError').textContent = 'يرجى ملء جميع الحقول'; return; }
  
  const pc = { id: uuid(), number: num, lat, lng, paires: createPorts(7, 1) };
  addPC(pc);
  hideModal();
  refreshMarkers();
}

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
    title = `📡 MSAN: ${device.name} (${device.type === 'indoor' ? 'داخلي' : 'خارجي'})`;
    bodyHTML = `
      <div class="grid-2">
        <div class="device-card" onclick="showCartes()"><span class="text-primary font-bold">🃏 الكروت</span><p class="text-muted text-sm">${device.cartes.length} كروت × 64 بورت</p></div>
        <div class="device-card" onclick="showFermes()"><span class="text-primary font-bold">🔧 Transport (Fermes)</span><p class="text-muted text-sm">${device.fermes.length} fermes</p></div>
      </div>
    `;
  } else if (type === 'sr') {
    title = `🔌 SR: ${device.name}`;
    bodyHTML = `
      <div class="grid-2">
        <div class="device-card" onclick="showSRTransport()"><span class="text-accent font-bold">🔄 Transport</span><p class="text-muted text-sm">${device.transportTites.length} tites</p></div>
        <div class="device-card" onclick="showSRDistribution()"><span class="text-accent font-bold">📤 Distribution</span><p class="text-muted text-sm">${device.distributionTites.length} tites</p></div>
      </div>
    `;
  } else {
    title = `📦 PC: ${device.number}`;
    bodyHTML = `<h3 class="text-success font-bold mb-3">PC ${device.number} - 7 Paires</h3>` + renderPortGrid(device.paires, 7);
  }

  showDetailPanel(title, bodyHTML);
}

function showDetailPanel(title, bodyHTML) {
  // Remove existing overlay
  let existing = document.getElementById('detailOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'detailOverlay';
  overlay.innerHTML = `
    <div id="detailHeader"><span>${title}</span><button onclick="closeDetail()" style="background:none;border:none;color:var(--muted-fg);cursor:pointer;font-size:1.1rem">← رجوع</button></div>
    <div id="detailBody">${bodyHTML}</div>
  `;
  document.body.appendChild(overlay);
}

function closeDetail() {
  const el = document.getElementById('detailOverlay');
  if (el) el.remove();
  currentDetail = null;
  naStep = 'idle';
  naData = {};
  refreshMarkers();
}

function renderPortGrid(ports, cols = 8, onClickFn) {
  return `<div class="port-grid" style="grid-template-columns:repeat(${cols},1fr)">${ports.map((p, i) => {
    const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : 'port-empty';
    const click = onClickFn ? ` onclick="${onClickFn}(${i})"` : '';
    return `<div class="port-cell ${cls}" title="Port ${p.number} - ${p.status}"${click}>${p.number}</div>`;
  }).join('')}</div>`;
}

// ===== MSAN Detail =====
function showCartes() {
  const m = currentDetail.device;
  // Refresh device from storage
  currentDetail.device = getMSANs().find(x => x.id === m.id) || m;
  const dev = currentDetail.device;
  let html = `<button class="text-primary text-sm mb-3" style="background:none;border:none;cursor:pointer;color:var(--primary)" onclick="showDetailOverview()">← رجوع</button>`;
  html += `<h3 class="text-primary font-bold mb-3">الكروت (${dev.cartes.length})</h3><div class="grid-4">`;
  dev.cartes.forEach((c, i) => {
    const ok = c.ports.filter(p => p.status === 'ok').length;
    const bad = c.ports.filter(p => p.status === 'bad').length;
    html += `<div class="device-card" onclick="showCarteDetail(${i})"><span class="text-primary font-bold">Carte ${c.number}</span><div class="flex-row mt-2 text-xs"><span class="text-success">${ok} ✓</span><span class="text-destructive">${bad} ✗</span><span class="text-muted">${64 - ok - bad} ○</span></div></div>`;
  });
  html += '</div>';
  showDetailPanel(`📡 MSAN: ${dev.name}`, html);
}

function showCarteDetail(idx) {
  const dev = getMSANs().find(x => x.id === currentDetail.device.id) || currentDetail.device;
  currentDetail.device = dev;
  currentDetail.selectedCarteIdx = idx;
  const carte = dev.cartes[idx];
  let html = `<button class="text-primary text-sm mb-3" style="background:none;border:none;cursor:pointer;color:var(--primary)" onclick="showCartes()">← رجوع للكروت</button>`;
  html += `<h3 class="text-primary font-bold mb-2">Carte ${carte.number} - 64 Port</h3>`;
  html += `<p class="text-xs text-muted mb-3">انقر على بورت فارغ لتحديد حالته وبدء إنشاء مشترك جديد</p>`;
  html += renderPortGrid(carte.ports, 8, 'handlePortClick');
  html += '<div id="naFlowArea"></div>';
  showDetailPanel(`📡 MSAN: ${dev.name}`, html);
}

function handlePortClick(portIdx) {
  const dev = getMSANs().find(x => x.id === currentDetail.device.id);
  if (!dev) return;
  const carte = dev.cartes[currentDetail.selectedCarteIdx];
  const port = carte.ports[portIdx];
  if (port.status !== 'empty') return;

  const choice = confirm('هل هذا البورت يعمل؟ (OK = نعم, Cancel = لا يعمل)');
  const status = choice ? 'ok' : 'bad';
  dev.cartes[currentDetail.selectedCarteIdx].ports[portIdx].status = status;
  updateMSAN(dev);
  currentDetail.device = dev;

  if (choice) {
    naData = { msanId: dev.id, carteNum: currentDetail.selectedCarteIdx, portNum: portIdx };
    naStep = 'msan-ferme';
    showNAFerme();
  } else {
    showCarteDetail(currentDetail.selectedCarteIdx);
  }
}

// ===== NA Flow =====
function showNAFerme() {
  const dev = getMSANs().find(x => x.id === naData.msanId);
  let html = `<div style="margin-top:16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius)">`;
  html += `<div class="noc-header">اختر Ferme - إنشاء مشترك جديد</div><div class="noc-body"><div class="grid-4">`;
  dev.fermes.forEach((f, i) => {
    html += `<div class="device-card text-center" onclick="selectNAFerme(${i},${f.number})"><span class="text-primary font-bold">F${f.number}</span><p class="text-xs text-muted">${f.tites.length} tites</p></div>`;
  });
  html += '</div></div></div>';
  document.getElementById('naFlowArea').innerHTML = html;
}

function selectNAFerme(idx, num) {
  naData.fermeIdx = idx;
  naData.fermeNum = num;
  naStep = 'msan-tite';
  showNATite();
}

function showNATite() {
  const dev = getMSANs().find(x => x.id === naData.msanId);
  const ferme = dev.fermes[naData.fermeIdx];
  let html = `<div style="margin-top:16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius)">`;
  html += `<div class="noc-header">اختر Tite في Ferme ${ferme.number}</div><div class="noc-body"><div class="grid-4">`;
  ferme.tites.forEach((t, i) => {
    html += `<div class="device-card text-center" onclick="selectNATite(${i},${t.number})"><span class="text-primary font-bold">T${t.number}</span><p class="text-xs text-muted">4 dispos</p></div>`;
  });
  html += '</div></div></div>';
  document.getElementById('naFlowArea').innerHTML = html;
}

function selectNATite(idx, num) {
  naData.titeIdx = idx;
  naData.titeNum = num;
  naStep = 'msan-transport-port';
  showNATransportPort();
}

function showNATransportPort() {
  const dev = getMSANs().find(x => x.id === naData.msanId);
  const tite = dev.fermes[naData.fermeIdx].tites[naData.titeIdx];
  let html = `<div style="margin-top:16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius)">`;
  html += `<div class="noc-header">اختر Port في Tite ${tite.number} (Transport)</div><div class="noc-body space-y">`;
  tite.dispos.forEach((d, di) => {
    html += `<p class="text-xs text-muted mb-2">Dispo ${d.number} (28 paires)</p>`;
    html += `<div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
    d.paires.forEach((p, pi) => {
      const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : 'port-empty';
      html += `<div class="port-cell ${cls}" onclick="selectNATransportPaire(${di},${pi},${d.number},${p.number})">${p.number}</div>`;
    });
    html += '</div>';
  });
  html += '</div></div>';
  document.getElementById('naFlowArea').innerHTML = html;
}

function selectNATransportPaire(dispoIdx, paireIdx, dispoNum, paireNum) {
  const dev = getMSANs().find(x => x.id === naData.msanId);
  const paire = dev.fermes[naData.fermeIdx].tites[naData.titeIdx].dispos[dispoIdx].paires[paireIdx];
  if (paire.status !== 'empty') return;
  const ok = confirm('هل هذا البورت يعمل؟');
  if (!ok) return;
  naData.dispoNum = dispoNum;
  naData.paireNum = paireNum;
  naStep = 'sr-select';
  showNASRSelect();
}

function showNASRSelect() {
  const srs = getSRs();
  let html = `<div style="margin-top:16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius)">`;
  html += `<div class="noc-header">اختر SR للربط</div><div class="noc-body space-y">`;
  srs.forEach(s => {
    html += `<div class="device-card" onclick="selectNASR('${s.id}','${s.name}')"><span class="text-accent font-bold">🔌 ${s.name}</span><p class="text-xs text-muted">Transport: ${s.transportTites.map(t => 'T' + t.number).join(', ')}</p></div>`;
  });
  if (!srs.length) html += '<p class="text-muted text-sm">لا يوجد SR - أنشئ واحدًا أولاً</p>';
  html += '</div></div>';
  document.getElementById('naFlowArea').innerHTML = html;
}

function selectNASR(id, name) {
  const sr = getSRs().find(s => s.id === id);
  const match = sr.transportTites.find(t => t.number === naData.titeNum);
  if (!match) { alert(`SR ${name} لا يحتوي على Transport Tite ${naData.titeNum}`); return; }
  naData.srId = id;
  naData.srName = name;
  naStep = 'sr-dist-tite';
  showNADistTite();
}

function showNADistTite() {
  const sr = getSRs().find(s => s.id === naData.srId);
  let html = `<div style="margin-top:16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius)">`;
  html += `<div class="noc-header">اختر Tite Distribution في SR ${sr.name}</div><div class="noc-body"><div class="grid-4">`;
  sr.distributionTites.forEach((t, i) => {
    html += `<div class="device-card text-center" onclick="selectNADistTite(${i},${t.number})"><span class="text-accent font-bold">DT${t.number}</span></div>`;
  });
  html += '</div></div></div>';
  document.getElementById('naFlowArea').innerHTML = html;
}

function selectNADistTite(idx, num) {
  naData.distTiteIdx = idx;
  naData.distTiteNum = num;
  naStep = 'sr-dist-layout';
  showNADistLayout();
}

function showNADistLayout() {
  const sr = getSRs().find(s => s.id === naData.srId);
  const dt = sr.distributionTites[naData.distTiteIdx];
  let html = `<div style="margin-top:16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius)">`;
  html += `<div class="noc-header">Distribution Tite ${dt.number} - اختر Paire</div><div class="noc-body space-y">`;
  dt.dispos.forEach((d, di) => {
    html += `<div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px" class="space-y-sm">`;
    html += `<p class="text-sm font-bold text-accent mb-2">Dispo ${d.number}</p>`;
    html += `<div class="grid-2">`;
    // 14 الأولى
    html += `<div><p class="text-xs text-muted mb-2">14 الأولى</p><div class="space-y-sm">`;
    html += `<div><p class="text-xs text-muted">7 الأولى</p><div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
    d.paires.slice(0, 7).forEach((p, pi) => {
      const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : 'port-empty';
      html += `<div class="port-cell ${cls}" onclick="selectDistPaire(${di},${pi},1,1,${d.number},${dt.number})">${p.number}</div>`;
    });
    html += `</div></div><div><p class="text-xs text-muted">7 الثانية</p><div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
    d.paires.slice(7, 14).forEach((p, pi) => {
      const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : 'port-empty';
      html += `<div class="port-cell ${cls}" onclick="selectDistPaire(${di},${pi + 7},1,2,${d.number},${dt.number})">${p.number}</div>`;
    });
    html += `</div></div></div></div>`;
    // 14 الثانية
    html += `<div><p class="text-xs text-muted mb-2">14 الثانية</p><div class="space-y-sm">`;
    html += `<div><p class="text-xs text-muted">7 الأولى</p><div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
    d.paires.slice(14, 21).forEach((p, pi) => {
      const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : 'port-empty';
      html += `<div class="port-cell ${cls}" onclick="selectDistPaire(${di},${pi + 14},2,1,${d.number},${dt.number})">${p.number}</div>`;
    });
    html += `</div></div><div><p class="text-xs text-muted">7 الثانية</p><div class="port-grid" style="grid-template-columns:repeat(7,1fr)">`;
    d.paires.slice(21, 28).forEach((p, pi) => {
      const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : 'port-empty';
      html += `<div class="port-cell ${cls}" onclick="selectDistPaire(${di},${pi + 21},2,2,${d.number},${dt.number})">${p.number}</div>`;
    });
    html += `</div></div></div></div>`;
    html += `</div></div>`;
  });
  html += '</div></div>';
  document.getElementById('naFlowArea').innerHTML = html;
}

function selectDistPaire(dispoIdx, paireIdx, half, seven, dispoNum, titeNum) {
  const sr = getSRs().find(s => s.id === naData.srId);
  const paire = sr.distributionTites[naData.distTiteIdx].dispos[dispoIdx].paires[paireIdx];
  if (paire.status !== 'empty') return;
  naData.distDispoNum = dispoNum;
  naData.distHalf = half;
  naData.distSeven = seven;
  naData.distPaire = paire.number;
  naData.distPaireIdx = paireIdx;
  naData.distDispoIdx = dispoIdx;
  naStep = 'pc-select';
  showNAPCSelect();
}

function showNAPCSelect() {
  const pcs = getPCs();
  const pcNum = `${naData.distTiteNum}${naData.distDispoNum}/${naData.distHalf}`;
  const matching = pcs.filter(p => p.number === pcNum);
  let html = `<div style="margin-top:16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius)">`;
  html += `<div class="noc-header">اختر PC ${pcNum}</div><div class="noc-body space-y">`;
  if (matching.length > 0) {
    matching.forEach(p => {
      html += `<div class="device-card" onclick="selectNAPC('${p.id}','${p.number}')"><span class="text-success font-bold">📦 PC ${p.number}</span></div>`;
    });
  } else {
    html += `<p class="text-muted text-sm">لا يوجد PC برقم ${pcNum}</p><p class="text-xs text-muted">اختر أي PC متاح:</p>`;
    pcs.forEach(p => {
      html += `<div class="device-card mt-2" onclick="selectNAPC('${p.id}','${p.number}')"><span class="text-success font-bold">📦 PC ${p.number}</span></div>`;
    });
  }
  html += '</div></div>';
  document.getElementById('naFlowArea').innerHTML = html;
}

function selectNAPC(id, number) {
  naData.pcId = id;
  naData.pcNumber = number;
  naStep = 'pc-port';
  showNAPCPort();
}

function showNAPCPort() {
  const pc = getPCs().find(p => p.id === naData.pcId);
  let html = `<div style="margin-top:16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius)">`;
  html += `<div class="noc-header">اختر Paire في PC ${pc.number}</div><div class="noc-body">`;
  html += `<div class="port-grid" style="grid-template-columns:repeat(7,1fr);gap:6px">`;
  pc.paires.forEach((p, i) => {
    const cls = p.status === 'ok' ? 'port-ok' : p.status === 'bad' ? 'port-bad' : 'port-empty';
    html += `<div class="port-cell ${cls}" style="height:48px" onclick="finalizeNA(${i})">${p.number}</div>`;
  });
  html += '</div></div></div>';
  document.getElementById('naFlowArea').innerHTML = html;
}

function finalizeNA(pcPaireIdx) {
  const pc = getPCs().find(p => p.id === naData.pcId);
  if (pc.paires[pcPaireIdx].status !== 'empty') return;
  const dev = getMSANs().find(m => m.id === naData.msanId);
  const typeCode = dev.type === 'indoor' ? 'IN' : 'OUT';
  const portNum = dev.cartes[naData.carteNum].ports[naData.portNum].number;
  const constitution = `MH${typeCode}-TA-${dev.name}:1-0-${naData.carteNum}-${portNum}, TR:${naData.fermeNum}/${naData.titeNum}-${naData.dispoNum} p${naData.paireNum}, TR-${naData.srName}:${naData.fermeNum}/${naData.titeNum}-${naData.dispoNum} p${naData.paireNum}, D:${naData.distTiteNum}${naData.distDispoNum}/${naData.distHalf} p${naData.distPaire}, PC ${naData.pcNumber} p${pc.paires[pcPaireIdx].number}`;

  // Update statuses
  dev.cartes[naData.carteNum].ports[naData.portNum].status = 'ok';
  updateMSAN(dev);

  const sr = getSRs().find(s => s.id === naData.srId);
  if (sr) {
    sr.distributionTites[naData.distTiteIdx].dispos[naData.distDispoIdx].paires[naData.distPaireIdx].status = 'ok';
    updateSR(sr);
  }

  pc.paires[pcPaireIdx].status = 'ok';
  updatePC(pc);

  addAbonne({
    id: uuid(), msanId: naData.msanId, carteNum: naData.carteNum, portNum: naData.portNum,
    fermeNum: naData.fermeNum, titeNum: naData.titeNum, dispoNum: naData.dispoNum, paireNum: naData.paireNum,
    srId: naData.srId, distTiteNum: naData.distTiteNum, distDispoNum: naData.distDispoNum,
    distHalf: naData.distHalf, distSeven: naData.distSeven, distPaire: naData.distPaire,
    pcId: pc.id, pcPaire: pc.paires[pcPaireIdx].number, constitution
  });

  let html = `<div style="margin-top:16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius)">`;
  html += `<div class="noc-header">✅ تم إنشاء المشترك بنجاح</div><div class="noc-body">`;
  html += `<p class="text-success font-bold text-sm break-all" style="font-family:monospace">${constitution}</p>`;
  html += `<button class="btn-primary mt-3" onclick="closeDetail()">إغلاق</button>`;
  html += '</div></div>';
  document.getElementById('naFlowArea').innerHTML = html;
  refreshMarkers();
}

// ===== MSAN Fermes =====
function showFermes() {
  const dev = getMSANs().find(x => x.id === currentDetail.device.id) || currentDetail.device;
  currentDetail.device = dev;
  let html = `<button class="text-primary text-sm mb-3" style="background:none;border:none;cursor:pointer;color:var(--primary)" onclick="showDetailOverview()">← رجوع</button>`;
  html += `<h3 class="text-primary font-bold mb-3">Fermes (${dev.fermes.length})</h3><div class="grid-4">`;
  dev.fermes.forEach((f, i) => {
    html += `<div class="device-card" onclick="showFermeDetail(${i})"><span class="text-primary font-bold">Ferme ${f.number}</span><p class="text-xs text-muted">${f.tites.length} tites</p></div>`;
  });
  html += '</div>';
  showDetailPanel(`📡 MSAN: ${dev.name}`, html);
}

function showFermeDetail(fi) {
  const dev = getMSANs().find(x => x.id === currentDetail.device.id) || currentDetail.device;
  currentDetail.device = dev;
  const ferme = dev.fermes[fi];
  let html = `<button class="text-primary text-sm mb-3" style="background:none;border:none;cursor:pointer;color:var(--primary)" onclick="showFermes()">← رجوع للفيرمات</button>`;
  html += `<h3 class="text-primary font-bold mb-3">Ferme ${ferme.number}</h3>`;
  ferme.tites.forEach(t => {
    html += `<div style="margin-bottom:16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius)">`;
    html += `<div class="noc-header">Tite ${t.number}</div><div class="noc-body space-y">`;
    t.dispos.forEach(d => {
      html += `<p class="text-xs text-muted mb-2">Dispo ${d.number} (28 paires)</p>`;
      html += renderPortGrid(d.paires, 7);
    });
    html += '</div></div>';
  });
  showDetailPanel(`📡 MSAN: ${dev.name}`, html);
}

// ===== SR Detail =====
function showSRTransport() {
  const dev = getSRs().find(x => x.id === currentDetail.device.id) || currentDetail.device;
  currentDetail.device = dev;
  let html = `<button class="text-accent text-sm mb-3" style="background:none;border:none;cursor:pointer;color:var(--accent)" onclick="showDetailOverview()">← رجوع</button>`;
  html += `<h3 class="text-accent font-bold mb-3">Transport Tites</h3>`;
  dev.transportTites.forEach(t => {
    html += `<div style="margin-bottom:16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius)">`;
    html += `<div class="noc-header">Tite ${t.number}</div><div class="noc-body space-y">`;
    t.dispos.forEach(d => {
      html += `<p class="text-xs text-muted mb-2">Dispo ${d.number}</p>`;
      html += renderPortGrid(d.paires, 7);
    });
    html += '</div></div>';
  });
  showDetailPanel(`🔌 SR: ${dev.name}`, html);
}

function showSRDistribution() {
  const dev = getSRs().find(x => x.id === currentDetail.device.id) || currentDetail.device;
  currentDetail.device = dev;
  let html = `<button class="text-accent text-sm mb-3" style="background:none;border:none;cursor:pointer;color:var(--accent)" onclick="showDetailOverview()">← رجوع</button>`;
  html += `<h3 class="text-accent font-bold mb-3">Distribution Tites</h3>`;
  dev.distributionTites.forEach(dt => {
    html += `<div style="margin-bottom:16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius)">`;
    html += `<div class="noc-header">Tite ${dt.number}</div><div class="noc-body space-y">`;
    dt.dispos.forEach(d => {
      html += `<div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px" class="space-y-sm">`;
      html += `<p class="text-sm font-bold text-accent mb-2">Dispo ${d.number}</p><div class="grid-2">`;
      html += `<div><p class="text-xs text-muted mb-2">14 الأولى</p><div class="space-y-sm"><div><p class="text-xs text-muted">7 الأولى</p>${renderPortGrid(d.paires.slice(0, 7), 7)}</div><div><p class="text-xs text-muted">7 الثانية</p>${renderPortGrid(d.paires.slice(7, 14), 7)}</div></div></div>`;
      html += `<div><p class="text-xs text-muted mb-2">14 الثانية</p><div class="space-y-sm"><div><p class="text-xs text-muted">7 الأولى</p>${renderPortGrid(d.paires.slice(14, 21), 7)}</div><div><p class="text-xs text-muted">7 الثانية</p>${renderPortGrid(d.paires.slice(21, 28), 7)}</div></div></div>`;
      html += '</div></div>';
    });
    html += '</div></div>';
  });
  showDetailPanel(`🔌 SR: ${dev.name}`, html);
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
    return m.name.toLowerCase().includes(query) || a.constitution.toLowerCase().includes(query);
  });

  let html = `<div class="noc-header"><span>🔍 نتائج البحث (${results.length})</span><span style="cursor:pointer" onclick="document.getElementById('searchModal').classList.add('hidden')">✕</span></div><div class="noc-body space-y">`;
  if (!results.length) {
    html += '<p class="text-muted text-sm">لم يتم العثور على نتائج</p>';
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
  document.getElementById('createBtn').addEventListener('click', openCreation);
  document.getElementById('searchBtn').addEventListener('click', handleSearch);
  document.getElementById('searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleSearch(); });
});
