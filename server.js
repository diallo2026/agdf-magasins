/**
 * Ets. Abdoul Gadirou Diallo et Frères (AGDF)
 * Serveur centralisé — Node.js + Express
 * Toutes les données sont partagées entre tous les magasins
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');

const app  = express();
const PORT = 3000;
const DB_FILE    = path.join(__dirname, 'data', 'database.json');
const CODES_FILE = path.join(__dirname, 'data', 'codes.json');
const AUDIT_FILE = path.join(__dirname, 'data', 'audit.json');
const LIC_FILE   = path.join(__dirname, 'data', 'licence.json');

// ─── Middleware ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helpers fichiers ─────────────────────────────────────
function readJSON(file, defVal) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch(e) {}
  return defVal;
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}


// ─── LICENCE ──────────────────────────────────────────────────
function loadLicence() {
  return readJSON(LIC_FILE, {
    active: true,
    anneeValidite: new Date().getFullYear(),
    activePar: 'Système',
    activeLe: new Date().toISOString().split('T')[0],
    raisonBlocage: ''
  });
}
function checkLicence() {
  const lic = loadLicence();
  const now = new Date();
  if (lic.anneeValidite < now.getFullYear()) return false;
  if (now > new Date(lic.anneeValidite, 11, 31, 23, 59, 59)) return false;
  return lic.active === true;
}
// ─── Init base de données ─────────────────────────────────
const MAGASINS = ['tole','ciment','carraux','fer','tube'];
const DEFAULT_REP = { pctFondateur:0.60, pctGerant:0.15, pctDette:0.05, pctRecette:0.10, pctDon:0.05 };

function initDB() {
  const db = {};
  MAGASINS.forEach(m => {
    db[m] = {
      marchandises: [], operations: [], clients: [],
      dettes: [], factures: [], salaires: [],
      depenses_gerant: [], depenses_fondateur: [],
      repartition: { ...DEFAULT_REP }
    };
  });
  return db;
}

function loadDB() {
  const db = readJSON(DB_FILE, null);
  if (!db) return initDB();
  // Ensure all magasins have all fields
  MAGASINS.forEach(m => {
    if (!db[m]) db[m] = initDB()[m];
    const def = initDB()[m];
    Object.keys(def).forEach(k => { if (db[m][k] === undefined) db[m][k] = def[k]; });
  });
  return db;
}

function saveDB(db) {
  if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  }
  writeJSON(DB_FILE, db);
}

// ─── Codes d'accès ───────────────────────────────────────
const DEFAULT_CODES = {
  fondateur:        'FOND2026',
  employe_tole:     'EMP001',
  employe_ciment:   'EMP002',
  employe_carraux:  'EMP003',
  employe_fer:      'EMP004',
  employe_tube:     'EMP005',
  concepteur:       'DEV9999'
};

function loadCodes() {
  const saved = readJSON(CODES_FILE, {});
  return { ...DEFAULT_CODES, ...saved };
}

const USERS_META = {
  fondateur:        { magasin: 'all',    voitTout: true,  isFondateur: true,  isGerant: false, isDev: false, label: 'Fondateur' },
  employe_tole:     { magasin: 'tole',   voitTout: false, isFondateur: false, isGerant: true,  isDev: false, label: 'Gérant — Tôle' },
  employe_ciment:   { magasin: 'ciment', voitTout: false, isFondateur: false, isGerant: true,  isDev: false, label: 'Gérant — Ciment' },
  employe_carraux:  { magasin: 'carraux',voitTout: false, isFondateur: false, isGerant: true,  isDev: false, label: 'Gérant — Carreaux' },
  employe_fer:      { magasin: 'fer',    voitTout: false, isFondateur: false, isGerant: true,  isDev: false, label: 'Gérant — Fer' },
  employe_tube:     { magasin: 'tube',   voitTout: false, isFondateur: false, isGerant: true,  isDev: false, label: 'Gérant — Tubes' },
  concepteur:       { magasin: 'all',    voitTout: true,  isFondateur: false, isGerant: false, isDev: true,  label: 'Concepteur' }
};

// ─── Sessions ─────────────────────────────────────────────
const sessions = {};
function makeToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function getSession(req) {
  return sessions[req.headers['x-token']] || null;
}

// ─── Audit ────────────────────────────────────────────────
let auditLog = readJSON(AUDIT_FILE, []);
function addAudit(user, mag, action, detail) {
  auditLog.unshift({ ts: new Date().toLocaleString('fr-FR'), user, mag, action, detail });
  if (auditLog.length > 500) auditLog = auditLog.slice(0, 500);
  writeJSON(AUDIT_FILE, auditLog);
}

// ─── Middleware auth ──────────────────────────────────────
function auth(req, res, next) {
  if (!checkLicence()) return res.status(403).json({ ok: false, message: 'Licence expirée', licenceExpired: true });
  const s = getSession(req);
  if (!s) return res.status(401).json({ ok: false, message: 'Non authentifié — veuillez vous connecter' });
  req.session = s;
  next();
}
function authGerant(req, res, next) {
  const s = getSession(req);
  if (!s) return res.status(401).json({ ok: false, message: 'Non authentifié' });
  if (!s.isGerant && !s.isDev) return res.status(403).json({ ok: false, message: 'Action réservée aux gérants' });
  req.session = s;
  next();
}
function authFondateur(req, res, next) {
  const s = getSession(req);
  if (!s) return res.status(401).json({ ok: false, message: 'Non authentifié' });
  if (!s.isFondateur && !s.isDev) return res.status(403).json({ ok: false, message: 'Action réservée au Fondateur' });
  req.session = s;
  next();
}
function checkMag(session, magasin) {
  if (session.voitTout) return true;
  return session.magasin === magasin;
}

// ══════════════════════════════════════════════════════════
// ROUTES API
// ══════════════════════════════════════════════════════════

// ─── LOGIN ────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { identifiant, password } = req.body;
  const id = (identifiant || '').trim().toLowerCase();
  // Concepteur peut toujours se connecter même si licence expirée
  if (id !== 'concepteur' && !checkLicence()) {
    const lic = loadLicence();
    return res.json({ ok: false, message: 'Licence expirée au 31/12/' + lic.anneeValidite, licenceExpired: true });
  }
  const codes = loadCodes();
  const meta  = USERS_META[id];
  if (!meta || codes[id] !== (password || '').trim()) {
    return res.json({ ok: false, message: 'Identifiant ou mot de passe incorrect' });
  }
  const token = makeToken();
  sessions[token] = { ...meta, identifiant: id };
  addAudit(meta.label, meta.magasin, 'Connexion', 'Accès accordé');
  res.json({ ok: true, token, user: { ...meta, identifiant: id } });
});

app.post('/api/logout', auth, (req, res) => {
  addAudit(req.session.label, req.session.magasin, 'Déconnexion', 'Session terminée');
  delete sessions[req.headers['x-token']];
  res.json({ ok: true });
});

// ─── LIRE UN MAGASIN ──────────────────────────────────────
app.get('/api/magasin/:id', auth, (req, res) => {
  const { id } = req.params;
  if (!checkMag(req.session, id)) return res.status(403).json({ ok: false, message: 'Accès refusé à ce magasin' });
  const db = loadDB();
  res.json({ ok: true, data: db[id] || {} });
});

// ─── LIRE TOUS LES MAGASINS (fondateur/concepteur) ───────
app.get('/api/db', auth, (req, res) => {
  if (!req.session.voitTout) return res.status(403).json({ ok: false, message: 'Accès refusé' });
  res.json({ ok: true, data: loadDB() });
});

// ─── SAUVER UNE SECTION D'UN MAGASIN ─────────────────────
app.post('/api/magasin/:id/:section', authGerant, (req, res) => {
  const { id, section } = req.params;
  const allowed = ['marchandises','operations','clients','dettes','factures','salaires','depenses_gerant','depenses_fondateur'];
  if (!allowed.includes(section)) return res.status(400).json({ ok: false, message: 'Section invalide' });
  if (!checkMag(req.session, id)) return res.status(403).json({ ok: false, message: 'Accès refusé à ce magasin' });
  const db = loadDB();
  if (!db[id]) return res.status(404).json({ ok: false, message: 'Magasin introuvable' });
  db[id][section] = req.body.data;
  saveDB(db);
  addAudit(req.session.label, id, 'Modif. '+section, `${Array.isArray(req.body.data)?req.body.data.length+' enregistrements':'OK'}`);
  res.json({ ok: true });
});

// ─── RÉPARTITION (fondateur seulement) ───────────────────
app.post('/api/repartition/:id', authFondateur, (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  if (!db[id]) return res.status(404).json({ ok: false });
  db[id].repartition = req.body.data;
  saveDB(db);
  addAudit(req.session.label, id, 'Répartition modifiée', JSON.stringify(req.body.data));
  res.json({ ok: true });
});

// ─── CODES D'ACCÈS (fondateur seulement) ─────────────────
app.get('/api/codes', authFondateur, (req, res) => {
  res.json({ ok: true, data: loadCodes() });
});
app.post('/api/codes', authFondateur, (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword || newPassword.length < 4) {
    return res.json({ ok: false, message: 'Données invalides' });
  }
  const codes = loadCodes();
  if (!USERS_META[userId]) return res.json({ ok: false, message: 'Utilisateur inconnu' });
  codes[userId] = newPassword;
  writeJSON(CODES_FILE, codes);
  addAudit(req.session.label, 'admin', 'Code modifié', 'Utilisateur: ' + userId);
  res.json({ ok: true });
});

// ─── AUDIT ────────────────────────────────────────────────
app.post('/api/audit', auth, (req, res) => {
  const { action, detail } = req.body;
  addAudit(req.session.label, req.session.magasin, action, detail);
  res.json({ ok: true });
});
app.get('/api/audit', auth, (req, res) => {
  if (!req.session.voitTout) return res.status(403).json({ ok: false });
  res.json({ ok: true, data: auditLog });
});

// ─── BACKUP (concepteur) ──────────────────────────────────
app.get('/api/backup', auth, (req, res) => {
  if (!req.session.isDev && !req.session.isFondateur) return res.status(403).json({ ok: false });
  const db = loadDB();
  const filename = `AGDF_backup_${new Date().toISOString().split('T')[0]}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.json({ db, auditLog, codes: loadCodes(), exportedAt: new Date().toISOString() });
});

// ─── RESTAURER BACKUP (concepteur) ────────────────────────
app.post('/api/restore', auth, (req, res) => {
  if (!req.session.isDev) return res.status(403).json({ ok: false, message: 'Réservé au Concepteur' });
  const { db, auditLog: al, codes } = req.body;
  if (db) saveDB(db);
  if (al) { auditLog = al; writeJSON(AUDIT_FILE, al); }
  if (codes) writeJSON(CODES_FILE, codes);
  addAudit('Concepteur', 'système', 'Restauration', 'Backup restauré');
  res.json({ ok: true });
});

// ─── STATUS ───────────────────────────────────────────────

// ─── LICENCE ──────────────────────────────────────────────────
app.get('/api/licence', (req, res) => {
  const lic = loadLicence();
  res.json({ ok: true, data: lic, valid: checkLicence() });
});
app.post('/api/licence', (req, res) => {
  const { adminCode, action, anneeValidite, raison } = req.body;
  const codes = loadCodes();
  if (!adminCode || codes.concepteur !== adminCode) {
    return res.status(403).json({ ok: false, message: 'Code concepteur incorrect' });
  }
  const lic = loadLicence();
  if (action === 'activer') {
    const annee = parseInt(anneeValidite) || new Date().getFullYear();
    writeJSON(LIC_FILE, { active: true, anneeValidite: annee, activePar: 'Concepteur', activeLe: new Date().toISOString().split('T')[0], raisonBlocage: '' });
    addAudit('Concepteur', 'admin', 'Licence activée', 'AGDF — 31/12/' + annee);
    res.json({ ok: true, message: 'Licence activée jusqu\'au 31/12/' + annee });
  } else if (action === 'desactiver') {
    writeJSON(LIC_FILE, { ...lic, active: false, raisonBlocage: raison || 'Désactivation manuelle' });
    addAudit('Concepteur', 'admin', 'Licence désactivée', raison || 'Manuel');
    res.json({ ok: true, message: 'Système bloqué' });
  } else {
    res.json({ ok: false, message: 'Action invalide' });
  }
});

app.get('/api/status', (req, res) => {
  const db = loadDB();
  res.json({
    ok: true,
    version: '1.0.0',
    magasins: MAGASINS.map(m => ({
      id: m,
      operations: db[m].operations.length,
      clients: db[m].clients.length,
      dettes: db[m].dettes.filter(d => d.reste > 0).length
    })),
    sessions: Object.keys(sessions).length,
    uptime: Math.floor(process.uptime()) + 's'
  });
});

// ─── Démarrage ────────────────────────────────────────────
// S'assurer que le dossier data existe
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

app.listen(PORT, '0.0.0.0', () => {
  // Trouver l'adresse IP locale
  const nets = os.networkInterfaces();
  let localIP = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIP = net.address;
        break;
      }
    }
  }

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║     Ets. Abdoul Gadirou Diallo et Frères (AGDF)       ║');
  console.log('║                Serveur centralisé v1.0                ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  Accès local :   http://localhost:${PORT}                ║`);
  console.log(`║  Accès réseau :  http://${localIP}:${PORT}              `);
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log('║  Donnez l\'adresse réseau à vos gérants               ║');
  console.log('║  Tous les magasins se connectent sur le même lien     ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
});
