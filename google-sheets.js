// ============================================
// Google Sheets Connector - TELECOM MAP
// ============================================
// Remplacez WEBAPP_URL par l'URL de votre Google Apps Script déployé
// ============================================

const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxjQJZ7HjtwhnHlvcASHaTSoHjWCA2WV4DFsMROJRP7Zi0TSTXa48olI1tG9jrP5Zd1Ig/exec';

// ===== Current User =====
let currentUser = null;

function getCurrentUser() {
  if (!currentUser) {
    const saved = localStorage.getItem('telecom_user');
    if (saved) currentUser = JSON.parse(saved);
  }
  return currentUser;
}

function setCurrentUser(user) {
  currentUser = user;
  if (user) {
    localStorage.setItem('telecom_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('telecom_user');
  }
}

// ===== API Helper =====
async function gsAPI(action, data = {}) {
  if (!WEBAPP_URL) {
    console.warn('⚠️ Google Sheets non configuré. Utilisation du localStorage.');
    return null;
  }

  try {
    const url = `${WEBAPP_URL}?action=${action}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(data),
      mode: 'no-cors'
    });

    // no-cors returns opaque response, use JSONP approach instead
    return null;
  } catch (err) {
    console.error('Erreur Google Sheets:', err);
    return null;
  }
}

// ===== JSONP Approach for cross-origin =====
function gsRequest(action, data = {}) {
  return new Promise((resolve, reject) => {
    if (!WEBAPP_URL) {
      resolve(null);
      return;
    }

    // For GET requests (reading data)
    if (['getData', 'getUsers', 'getHistorique'].includes(action)) {
      const url = `${WEBAPP_URL}?action=${action}&callback=_gsCallback_${Date.now()}`;
      
      // Use fetch with redirect follow
      fetch(`${WEBAPP_URL}?action=${action}`, { redirect: 'follow' })
        .then(r => r.json())
        .then(resolve)
        .catch(() => resolve(null));
      return;
    }

    // For POST requests (writing data)
    fetch(WEBAPP_URL + '?action=' + action, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(data)
    })
      .then(r => r.json())
      .then(resolve)
      .catch(() => resolve(null));
  });
}

// ===== Login =====
async function gsLogin(code) {
  const result = await gsRequest('login', { code: String(code) });
  if (result && result.success) {
    setCurrentUser(result.user);
    return result.user;
  }
  return null;
}

function gsLogout() {
  setCurrentUser(null);
}

// ===== Sync Functions =====
async function gsSyncToCloud(state) {
  if (!WEBAPP_URL) return false;

  const user = getCurrentUser();
  const updatedBy = user ? user.code : 'unknown';

  // Save all equipements
  for (const m of state.msans) {
    await gsRequest('saveEquipement', { ...m, type: 'MSAN', _updatedBy: updatedBy });
  }
  for (const s of state.srs) {
    await gsRequest('saveEquipement', { ...s, type: 'SR', _updatedBy: updatedBy });
  }
  for (const p of state.pcs) {
    await gsRequest('saveEquipement', { ...p, type: 'PC', _updatedBy: updatedBy });
  }
  for (const a of state.abonnes) {
    await gsRequest('saveAbonne', { ...a, _updatedBy: updatedBy });
  }

  return true;
}

async function gsSyncFromCloud() {
  if (!WEBAPP_URL) return null;
  const data = await gsRequest('getData');
  return data;
}

// ===== Historique =====
async function gsLogAction(action, targetType, targetId, targetName, details = '') {
  const user = getCurrentUser();
  if (!user || !WEBAPP_URL) return;

  await gsRequest('addHistorique', {
    user_code: user.code,
    user_name: user.name,
    action,
    target_type: targetType,
    target_id: targetId,
    target_name: targetName,
    details
  });
}

async function gsGetHistorique() {
  return await gsRequest('getHistorique') || [];
}

// ===== User Management =====
async function gsGetUsers() {
  return await gsRequest('getUsers') || [];
}

async function gsAddUser(code, name, role = 'user') {
  return await gsRequest('addUser', { code: String(code), name, role });
}

async function gsDeleteUser(code) {
  return await gsRequest('deleteUser', { code: String(code) });
}

// ===== État Port Logging =====
async function gsLogEtatPort(equipId, equipType, portPath, oldStatus, newStatus) {
  const user = getCurrentUser();
  if (!WEBAPP_URL) return;

  await gsRequest('saveEtatPort', {
    equip_id: equipId,
    equip_type: equipType,
    port_path: portPath,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by: user ? user.code : 'unknown'
  });
}

// ===== Connection Status =====
function isGoogleSheetsConnected() {
  return !!WEBAPP_URL;
}

// ===== Init Check =====
async function gsInit() {
  if (!WEBAPP_URL) {
    console.log('📋 Mode hors-ligne: Google Sheets non configuré');
    return false;
  }

  try {
    const result = await gsRequest('init');
    if (result && result.success) {
      console.log('✅ Google Sheets connecté et initialisé');
      return true;
    }
  } catch (e) {
    console.error('❌ Erreur connexion Google Sheets:', e);
  }
  return false;
}
