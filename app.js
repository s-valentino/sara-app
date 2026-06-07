// ═══════════════════════════════════════════════
//  SARA VALENTINO — APP JS
//  Supabase: qnhnsjqzheyiacfmmmbe (stesso progetto Gilda)
//  Tabelle: sara_user_answers, sara_user_products, sara_unlock_codes
// ═══════════════════════════════════════════════

const SUPABASE_URL = 'https://qnhnsjqzheyiacfmmmbe.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuaG5zanF6aGV5aWFjZm1tbWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODEyMjMsImV4cCI6MjA5NDk1NzIyM30.Y0XwmMed7pRlBPmMpCpmgfdppTEUI0-FIKXOWbaRuYk';

// ── Supabase client minimale ──────────────────────
const sb = {
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`
  },

  async signUp(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST', headers: this.headers,
      body: JSON.stringify({ email, password })
    });
    return r.json();
  },

  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: this.headers,
      body: JSON.stringify({ email, password })
    });
    return r.json();
  },

  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { ...this.headers, 'Authorization': `Bearer ${token}` }
    });
  },

  async getUser(token) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { ...this.headers, 'Authorization': `Bearer ${token}` }
    });
    return r.json();
  },

  async query(table, params = {}, token = null) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const headers = { ...this.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = await fetch(url, { headers });
    return r.json();
  },

  async upsert(table, data, token) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(data)
    });
    if (!r.ok) { const t = await r.text(); throw new Error(t); }
    return r;
  },

  async insert(table, data, token) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...this.headers, 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    return r.json();
  },

  async update(table, filter, data, token) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    Object.entries(filter).forEach(([k, v]) => url.searchParams.set(k, `eq.${v}`));
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { ...this.headers, 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    return r;
  }
};

// ── STATO APP ─────────────────────────────────────
let state = {
  user: null,
  token: null,
  unlockedProducts: new Set(),
  answers: {},       // { productId_sectionIdx_questionIdx: text }
  currentProduct: null,
  currentSection: null
};

// ── PRODOTTI ──────────────────────────────────────
const PRODUCTS = [
  {
    id: 'workbook-bambina',
    title: 'La tua bambina interiore',
    titleItalic: 'bambina',
    eyebrow: 'Workbook',
    description: 'Un percorso in quattro sezioni per incontrare, ascoltare e prenderti cura della tua bambina interiore.',
    free: true,
    sections: [
      {
        title: 'Riconoscerla',
        intro: 'Prima di tutto, respira. Quello che stai per fare non è un esame e non c\'è nessuno che valuta le risposte. Nessuna risposta giusta, nessuna risposta sbagliata, nessun voto finale. C\'è solo tu, un foglio, e una parte di te che forse non hai mai ascoltato davvero.',
        questions: [
          { text: 'Quando pensi alla bambina che eri, qual è la prima immagine che arriva? Descrivila senza filtri.', hint: 'Es: la vedo in cucina, seria, che cerca di non disturbare...' },
          { text: 'C\'era qualcosa che da bambina non ti era permesso sentire o esprimere? Rabbia, tristezza, bisogno di attenzione?', hint: 'Es: la rabbia era "brutta", il piangere era "fare i capricci"...' },
          { text: 'Come ti comportavi per essere amata o accettata quando eri piccola?', hint: 'Es: essere brava a scuola, non fare domande, prendersi cura degli altri...' },
          { text: 'C\'era una frase che sentivi spesso, esplicita o implicita, su chi eri o su come dovresti essere?', hint: 'Es: "sei troppo sensibile", "non fare la difficile", "sii forte"...' },
          { text: 'Ricordi un momento in cui ti sei sentita completamente vista e accettata da bambina? Come era?', hint: 'Anche un momento piccolo, anche breve — se c\'è stato.' },
          { text: 'Ricordi invece un momento in cui ti sei sentita sola, anche se eri circondata da persone?', hint: 'Scrivi senza giudicarti — è un ricordo, non una colpa.' },
          { text: 'Se la tua bambina interiore potesse parlarti adesso, cosa pensi che ti direbbe per prima cosa?', hint: 'Lascia che la risposta arrivi da sola, senza censure.' }
        ]
      },
      {
        title: 'Come si manifesta oggi',
        intro: 'Eccoci alla parte scomoda. Quella in cui smettiamo di parlare del passato e cominciamo a guardare il presente — molto meno romantico, ma molto più utile.',
        questions: [
          { text: 'In quali situazioni noti che la tua reazione è più intensa di quanto la situazione sembra giustificare?', hint: 'Es: quando qualcuno ti critica, quando qualcuno non risponde subito...' },
          { text: 'C\'è qualcosa che fai automaticamente nelle relazioni per sentirti al sicuro o per evitare il conflitto?', hint: 'Es: cerchi sempre di accontentare, sparisci, fai la prima mossa per rassicurarti...' },
          { text: 'Come ti parli quando sbagli qualcosa? Useresti le stesse parole con una persona che ami?', hint: 'Scrivi esattamente le parole che usi — anche se sono dure.' },
          { text: 'In quale area della tua vita fai più fatica a chiedere quello di cui hai bisogno?', hint: 'Es: nel lavoro, in amore, con la famiglia, con le amiche...' },
          { text: 'C\'è un pattern che si ripete nelle tue relazioni, lo stesso tipo di dinamica, lo stesso ruolo che occupi?', hint: 'Es: finisci sempre per prenderti cura tu dell\'altro, o per sentirti sempre meno importante...' },
          { text: 'Quando qualcuno ti critica o si allontana, qual è la prima cosa che pensi di te stessa?', hint: 'Es: "ho sbagliato qualcosa", "non sono abbastanza", "sapevo che succedeva"...' },
          { text: 'C\'è qualcosa che rimandi costantemente perché l\'idea di farlo e non riuscirci ti spaventa più dell\'idea di non farlo?', hint: 'Stretta al petto, nodo in gola, voglia di sparire... descrivi la sensazione fisica.' }
        ]
      },
      {
        title: 'Incontrarla',
        intro: 'Questa è la sezione più delicata. Falla in un momento in cui hai un po\' di spazio — non tra una riunione e l\'altra, non sul treno mentre qualcuno ti guarda lo schermo. Qui non si ragiona. Si sente.',
        questions: [
          { text: 'Chiudi gli occhi e immagina la tua bambina interiore davanti a te. Quanti anni ha? Com\'è la sua espressione?', hint: 'Descrivila come se la stessi guardando davvero.' },
          { text: 'Cosa sta aspettando da te quella bambina? Cosa ha bisogno di sentirsi dire?', hint: 'Lascia che la risposta arrivi prima di pensarla.' },
          { text: 'C\'è qualcosa per cui vorresti chiederle scusa?', hint: 'Non devi avere un motivo "abbastanza grande". Ascolta cosa sale.' },
          { text: 'C\'è qualcosa che lei ha vissuto che non era colpa sua e che non le è mai stato detto abbastanza chiaramente?', hint: 'Dillo adesso. Per iscritto. A lei.' },
          { text: 'Cosa le diresti se potessi stare con lei per un\'ora, senza dover fare niente, solo essere presente?', hint: 'Non un discorso — parole vere, anche poche.' },
          { text: 'Quale parte di te assomiglia ancora a quella bambina — nei tuoi gusti, nelle tue paure, nel modo in cui ti muovi nel mondo?', hint: 'Anche le cose belle. Anche quello che non hai perso.' },
          { text: 'Scrivi una frase che avresti voluto sentire da bambina e che non hai sentito abbastanza.', hint: 'Una sola frase. Quella vera.' }
        ]
      },
      {
        title: 'Tornare a te stessa',
        intro: 'Siamo all\'ultima sezione. Se sei arrivata fin qui hai già fatto qualcosa di importante: ti sei fermata. In un mondo che ti chiede di correre sempre, fermarsi e guardarsi dentro è già un atto di coraggio.',
        questions: [
          { text: 'Cosa significa per te "tornare a te stessa"? Non la risposta che sembra giusta — quella vera.', hint: 'Anche se è vaga, anche se non la sai ancora bene.' },
          { text: 'C\'è qualcosa che facevi da bambina, prima che il mondo ti insegnasse come dovresti essere, che hai smesso di fare?', hint: 'Es: disegnare, cantare, fare domande, stare nel silenzio...' },
          { text: 'Quale parte di te hai imparato a nascondere per essere accettata, e che vorresti poter mostrare di più?', hint: 'La risposta che sale subito è quasi sempre quella giusta.' },
          { text: 'Cosa cambierebbe nella tua vita se trattassi te stessa con la stessa gentilezza che usi con le persone che ami?', hint: 'Sii concreta — cosa cambierebbe davvero, nel quotidiano.' },
          { text: 'Qual è un piccolo gesto concreto che puoi fare oggi per prenderti cura della tua bambina interiore?', hint: 'Piccolo davvero. Qualcosa che puoi fare nelle prossime 24 ore.' },
          { text: 'C\'è una relazione nella tua vita in cui vorresti comportarti diversamente, partendo da quello che hai scoperto su te stessa?', hint: 'Non devi avere il piano — basta riconoscere la relazione.' },
          { text: 'Scrivi un impegno con te stessa per i prossimi 30 giorni. Non una promessa ambiziosa — una cosa sola, concreta e gentile.', hint: 'Firmalo con il tuo nome, se vuoi. Vale di più.' }
        ]
      }
    ]
  }
  // ── Aggiungi prodotti futuri qui ──────────────
];

// ── UTILITIES ─────────────────────────────────────
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function toast(msg, duration = 2800) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  const el = $(`#screen-${id}`);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

function answerKey(productId, sectionIdx, questionIdx) {
  return `${productId}__${sectionIdx}__${questionIdx}`;
}

function calcProgress(productId, totalQuestions) {
  const answered = Object.keys(state.answers)
    .filter(k => k.startsWith(productId + '__') && state.answers[k]?.trim())
    .length;
  return totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 0;
}

function sectionProgress(productId, sectionIdx, questions) {
  const answered = questions.filter((_, qi) => {
    const k = answerKey(productId, sectionIdx, qi);
    return state.answers[k]?.trim();
  }).length;
  return questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0;
}

// ── SESSION ───────────────────────────────────────
function saveSession(token, user) {
  localStorage.setItem('sara_token', token);
  localStorage.setItem('sara_user', JSON.stringify(user));
}

function loadSession() {
  const token = localStorage.getItem('sara_token');
  const user  = localStorage.getItem('sara_user');
  if (token && user) {
    state.token = token;
    state.user  = JSON.parse(user);
    return true;
  }
  return false;
}

function clearSession() {
  localStorage.removeItem('sara_token');
  localStorage.removeItem('sara_user');
  state.user = null; state.token = null;
  state.unlockedProducts = new Set();
  state.answers = {};
}

// ── AUTH ──────────────────────────────────────────
async function handleLogin(email, password) {
  const data = await sb.signIn(email, password);
  if (data.error) throw new Error(data.error_description || data.error);
  state.token = data.access_token;
  state.user  = data.user;
  saveSession(data.access_token, data.user);
  return data;
}

async function handleSignup(email, password) {
  const data = await sb.signUp(email, password);
  if (data.error) throw new Error(data.error_description || data.error);
  // Auto-login after signup
  return handleLogin(email, password);
}

async function handleLogout() {
  if (state.token) await sb.signOut(state.token);
  clearSession();
  renderAuth();
  showScreen('auth');
}

// ── LOAD USER DATA ────────────────────────────────
async function loadUserData() {
  if (!state.token || !state.user) return;

  // Load unlocked products
  const products = await sb.query(
    'sara_user_products',
    { user_id: `eq.${state.user.id}`, select: 'product_id' },
    state.token
  );
  if (Array.isArray(products)) {
    products.forEach(p => state.unlockedProducts.add(p.product_id));
  }

  // Free products auto-unlocked
  PRODUCTS.filter(p => p.free).forEach(p => state.unlockedProducts.add(p.id));

  // Load answers
  const answers = await sb.query(
    'sara_user_answers',
    { user_id: `eq.${state.user.id}`, select: 'answer_key,answer_text' },
    state.token
  );
  if (Array.isArray(answers)) {
    answers.forEach(a => { state.answers[a.answer_key] = a.answer_text; });
  }
}

// ── SAVE ANSWER ───────────────────────────────────
let saveTimers = {};
async function saveAnswer(key, text) {
  if (!state.token || !state.user) return;
  clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(async () => {
    try {
      await sb.upsert('sara_user_answers', {
        user_id:    state.user.id,
        answer_key: key,
        answer_text: text,
        updated_at: new Date().toISOString()
      }, state.token);
    } catch(e) { console.error('Save error:', e); }
  }, 800);
}

// ── UNLOCK CODE ───────────────────────────────────
async function tryUnlock(productId, code) {
  if (!state.token || !state.user) return false;

  const trimmed = code.trim().toUpperCase();

  // Check code exists and not used
  const codes = await sb.query(
    'sara_unlock_codes',
    { code: `eq.${trimmed}`, product_id: `eq.${productId}`, used: 'eq.false', select: 'id,code' },
    state.token
  );
  if (!Array.isArray(codes) || codes.length === 0) return false;

  const codeRow = codes[0];

  // Mark as used
  await sb.update('sara_unlock_codes', { id: codeRow.id }, {
    used: true,
    used_by: state.user.id,
    used_at: new Date().toISOString()
  }, state.token);

  // Add to user products
  await sb.insert('sara_user_products', {
    user_id: state.user.id,
    product_id: productId,
    unlocked_at: new Date().toISOString()
  }, state.token);

  state.unlockedProducts.add(productId);
  return true;
}

// ── EXPORT ────────────────────────────────────────
function exportProduct(product) {
  let lines = [`${product.title.toUpperCase()}\nSara Valentino\n${'─'.repeat(40)}\n`];
  product.sections.forEach((sec, si) => {
    lines.push(`\nSEZIONE ${si + 1}: ${sec.title.toUpperCase()}\n${'─'.repeat(30)}`);
    sec.questions.forEach((q, qi) => {
      const key = answerKey(product.id, si, qi);
      const ans = state.answers[key] || '(nessuna risposta)';
      lines.push(`\nDomanda ${qi + 1}: ${q.text}\n${ans}`);
    });
  });
  lines.push(`\n\n${'─'.repeat(40)}\nEsportato il ${new Date().toLocaleDateString('it-IT')}`);

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `sara-valentino-${product.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════
//  RENDER FUNCTIONS
// ══════════════════════════════════════════════════

function renderAuth() {
  $('#topbar-user').style.display = 'none';
  $('#screen-auth').innerHTML = `
    <div class="auth-screen">
      <div class="auth-hero">
        <div class="auth-hero-eyebrow">Sara Valentino</div>
        <h1>La tua <em>bambina</em><br>interiore</h1>
        <div class="auth-line"></div>
        <p>Il tuo spazio personale di consapevolezza. Le tue risposte, al sicuro nel cloud.</p>
      </div>
      <div class="auth-card">
        <div class="auth-tabs">
          <button class="auth-tab active" id="tab-login" onclick="switchTab('login')">Accedi</button>
          <button class="auth-tab" id="tab-signup" onclick="switchTab('signup')">Registrati</button>
        </div>
        <div id="auth-form-wrap">
          <div class="auth-form" id="login-form">
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="auth-email" placeholder="la.tua@email.it" autocomplete="email">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" id="auth-password" placeholder="••••••••" autocomplete="current-password">
            </div>
            <div class="auth-error" id="auth-error"></div>
            <button class="btn-primary" id="auth-submit" onclick="submitAuth()">Entra</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Enter key support
  setTimeout(() => {
    $$('#auth-email, #auth-password').forEach(el => {
      el.addEventListener('keydown', e => { if (e.key === 'Enter') submitAuth(); });
    });
  }, 100);
}

let authMode = 'login';
function switchTab(mode) {
  authMode = mode;
  $('#tab-login').classList.toggle('active', mode === 'login');
  $('#tab-signup').classList.toggle('active', mode === 'signup');
  $('#auth-submit').textContent = mode === 'login' ? 'Entra' : 'Crea account';
  $('#auth-error').textContent = '';
}

async function submitAuth() {
  const email    = $('#auth-email').value.trim();
  const password = $('#auth-password').value;
  const btn      = $('#auth-submit');
  const errEl    = $('#auth-error');

  if (!email || !password) { errEl.textContent = 'Inserisci email e password.'; return; }

  btn.disabled = true;
  btn.textContent = '...';
  errEl.textContent = '';

  try {
    if (authMode === 'login') {
      await handleLogin(email, password);
    } else {
      await handleSignup(email, password);
    }
    await loadUserData();
    renderLibrary();
    showScreen('library');
  } catch(e) {
    errEl.textContent = translateError(e.message);
    btn.disabled = false;
    btn.textContent = authMode === 'login' ? 'Entra' : 'Crea account';
  }
}

function translateError(msg) {
  if (msg.includes('Invalid login')) return 'Email o password non corretti.';
  if (msg.includes('Email not confirmed')) return 'Controlla la tua email per confermare l\'account.';
  if (msg.includes('already registered')) return 'Email già registrata. Accedi.';
  if (msg.includes('Password should be')) return 'La password deve essere di almeno 6 caratteri.';
  return 'Si è verificato un errore. Riprova.';
}

// ── LIBRARY ───────────────────────────────────────
function renderLibrary() {
  $('#topbar-user').style.display = 'flex';

  const totalQ = p => p.sections.reduce((sum, s) => sum + s.questions.length, 0);

  const cards = PRODUCTS.map(p => {
    const unlocked = state.unlockedProducts.has(p.id);
    const total    = totalQ(p);
    const pct      = unlocked ? calcProgress(p.id, total) : 0;

    const titleHtml = p.title.replace(
      p.titleItalic,
      `<em>${p.titleItalic}</em>`
    );

    const lockedOverlay = unlocked ? '' : `
      <div class="locked-overlay">
        <div class="lock-icon">🔒</div>
        <p>Prodotto bloccato</p>
        <button class="btn-unlock" onclick="openUnlockModal('${p.id}', event)">Inserisci codice</button>
      </div>`;

    return `
      <div class="product-card ${unlocked ? '' : 'locked'}"
           ${unlocked ? `onclick="openProduct('${p.id}')"` : ''}>
        <div class="product-card-inner">
          <div class="product-card-eyebrow">
            ${p.eyebrow}
            ${p.free ? '<span class="badge-free">Gratuito</span>' : ''}
          </div>
          <h3>${titleHtml}</h3>
          <p class="product-card-desc">${p.description}</p>
          ${unlocked ? `
          <div class="progress-wrap">
            <div class="progress-label">
              <span>Progresso</span>
              <span>${pct}%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>` : ''}
        </div>
        ${lockedOverlay}
      </div>`;
  }).join('');

  $('#screen-library').innerHTML = `
    <div class="library-header">
      <div class="library-eyebrow">La tua libreria</div>
      <h2>Ciao${state.user?.email ? ', ' + state.user.email.split('@')[0] : ''}.</h2>
      <p>I tuoi strumenti di consapevolezza, sempre con te.</p>
    </div>
    <div class="products-grid">${cards}</div>
  `;
}

// ── UNLOCK MODAL ──────────────────────────────────
function openUnlockModal(productId, e) {
  if (e) e.stopPropagation();
  const p = PRODUCTS.find(x => x.id === productId);
  $('#modal-overlay').innerHTML = `
    <div class="modal">
      <h3>Sblocca <em>${p?.title || productId}</em></h3>
      <p>Inserisci il codice ricevuto via email dopo l'acquisto.</p>
      <div class="form-group">
        <label>Codice di sblocco</label>
        <input type="text" id="unlock-input" placeholder="SARA-XXX-000"
               style="text-transform:uppercase; letter-spacing:2px;">
      </div>
      <div class="auth-error" id="unlock-error"></div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="closeModal()">Annulla</button>
        <button class="btn-primary" style="flex:1" onclick="submitUnlock('${productId}')">Sblocca</button>
      </div>
    </div>`;
  $('#modal-overlay').classList.add('open');
  setTimeout(() => $('#unlock-input')?.focus(), 200);
}

function closeModal() {
  $('#modal-overlay').classList.remove('open');
}

async function submitUnlock(productId) {
  const code  = $('#unlock-input').value;
  const errEl = $('#unlock-error');
  if (!code.trim()) { errEl.textContent = 'Inserisci il codice.'; return; }

  errEl.textContent = '';
  const ok = await tryUnlock(productId, code);
  if (ok) {
    closeModal();
    toast('Prodotto sbloccato!');
    renderLibrary();
  } else {
    errEl.textContent = 'Codice non valido o già utilizzato.';
  }
}

// ── PRODUCT ───────────────────────────────────────
function openProduct(productId) {
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return;
  state.currentProduct = productId;

  const totalQ = p.sections.reduce((sum, s) => sum + s.questions.length, 0);
  const pct    = calcProgress(productId, totalQ);

  const titleHtml = p.title.replace(p.titleItalic, `<em>${p.titleItalic}</em>`);

  const sections = p.sections.map((sec, si) => {
    const sPct = sectionProgress(productId, si, sec.questions);
    return `
      <div class="section-item" onclick="openSection(${si})">
        <div class="section-item-left">
          <div class="section-number">Sezione 0${si + 1}</div>
          <h3>${sec.title}</h3>
        </div>
        <div class="section-item-progress">
          <div class="section-item-pct">${sPct}%</div>
          <div class="section-item-arrow">→</div>
        </div>
      </div>`;
  }).join('');

  $('#screen-product').innerHTML = `
    <div class="product-header">
      <button class="btn-back" onclick="goLibrary()">Libreria</button>
      <div class="product-header-eyebrow">${p.eyebrow}</div>
      <h2>${titleHtml}</h2>
      <p class="product-header-desc">${p.description}</p>
      <div class="progress-wrap" style="margin-bottom:20px">
        <div class="progress-label"><span>Completamento totale</span><span>${pct}%</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="product-actions">
        <button class="btn-export" onclick="exportProduct(PRODUCTS.find(x=>x.id==='${productId}'))">
          Esporta risposte ↓
        </button>
      </div>
    </div>
    <div class="sections-list">${sections}</div>
  `;

  showScreen('product');
}

function goLibrary() {
  renderLibrary();
  showScreen('library');
}

// ── SECTION ───────────────────────────────────────
function openSection(sectionIdx) {
  const p = PRODUCTS.find(x => x.id === state.currentProduct);
  if (!p) return;
  state.currentSection = sectionIdx;
  const sec = p.sections[sectionIdx];

  const questions = sec.questions.map((q, qi) => {
    const key = answerKey(p.id, sectionIdx, qi);
    const val = (state.answers[key] || '').replace(/"/g, '&quot;');
    return `
      <div class="question-item">
        <div class="question-label">Domanda 0${qi + 1}</div>
        <div class="question-text">${q.text}</div>
        ${q.hint ? `<div class="question-hint">${q.hint}</div>` : ''}
        <textarea
          class="question-textarea"
          data-key="${key}"
          placeholder="Scrivi qui..."
          rows="4"
        >${val}</textarea>
        <div class="save-indicator" id="si-${key}"></div>
      </div>`;
  }).join('');

  const hasPrev = sectionIdx > 0;
  const hasNext = sectionIdx < p.sections.length - 1;

  $('#screen-section').innerHTML = `
    <div class="section-header">
      <button class="btn-back" onclick="openProduct('${p.id}')">Sezioni</button>
      <div class="section-number">Sezione 0${sectionIdx + 1} di ${p.sections.length}</div>
      <h2>${sec.title}</h2>
      <p class="section-intro">${sec.intro}</p>
    </div>
    <div class="questions-list">${questions}</div>
    <div class="section-footer">
      ${hasPrev
        ? `<button class="section-nav-btn" onclick="openSection(${sectionIdx - 1})">← Precedente</button>`
        : '<span></span>'}
      ${hasNext
        ? `<button class="section-nav-btn primary-nav" onclick="openSection(${sectionIdx + 1})">Prossima →</button>`
        : `<button class="section-nav-btn primary-nav" onclick="openProduct('${p.id}')">Fine sezione ✓</button>`}
    </div>
  `;

  showScreen('section');
  attachTextareaListeners();
}

function attachTextareaListeners() {
  $$('.question-textarea').forEach(ta => {
    ta.addEventListener('input', () => {
      const key = ta.dataset.key;
      state.answers[key] = ta.value;
      const si = $(`#si-${key}`);
      if (si) { si.textContent = 'Salvataggio...'; si.classList.remove('saved'); }
      saveAnswer(key, ta.value).then(() => {
        if (si) { si.textContent = 'Salvato'; si.classList.add('saved');
          setTimeout(() => { si.textContent = ''; si.classList.remove('saved'); }, 2000);
        }
      });
    });
  });
}

// ══════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════
async function init() {
  showScreen('loading');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }

  if (loadSession()) {
    try {
      await loadUserData();
      renderLibrary();
      showScreen('library');
    } catch(e) {
      clearSession();
      renderAuth();
      showScreen('auth');
    }
  } else {
    renderAuth();
    showScreen('auth');
  }
}

document.addEventListener('DOMContentLoaded', init);

// Expose to HTML onclick handlers
window.switchTab      = switchTab;
window.submitAuth     = submitAuth;
window.openProduct    = openProduct;
window.openSection    = openSection;
window.openUnlockModal = openUnlockModal;
window.closeModal     = closeModal;
window.submitUnlock   = submitUnlock;
window.goLibrary      = goLibrary;
window.exportProduct  = exportProduct;
window.handleLogout   = handleLogout;
window.PRODUCTS       = PRODUCTS;
