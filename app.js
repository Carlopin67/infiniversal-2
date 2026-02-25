/**
 * ════════════════════════════════════════════
 * INFINIVERSAL · app.js
 * PWA offline para poetas y compositores
 * Módulos: Storage, Notes, Editor, Syllables,
 *          Tutorial, Install, Settings, Share
 * ════════════════════════════════════════════
 */

'use strict';

/* ══════════════════════════════════════════
   MÓDULO: STORAGE
   Gestión de datos con localStorage
══════════════════════════════════════════ */
const Storage = (() => {
  const NOTES_KEY    = 'infiniversal_notes';
  const SETTINGS_KEY = 'infiniversal_settings';
  const FIRST_KEY    = 'infiniversal_first_run';

  const defaults = {
    theme:      'dark',
    zoom:       1,
    richText:   false,
    metric:     false,
    firstRun:   true
  };

  function getAllNotes() {
    try {
      return JSON.parse(localStorage.getItem(NOTES_KEY)) || [];
    } catch { return []; }
  }

  function saveNotes(notes) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }

  function getSettings() {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
    } catch { return { ...defaults }; }
  }

  function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  function isFirstRun() {
    return localStorage.getItem(FIRST_KEY) !== 'done';
  }

  function markFirstRun() {
    localStorage.setItem(FIRST_KEY, 'done');
  }

  return { getAllNotes, saveNotes, getSettings, saveSettings, isFirstRun, markFirstRun };
})();


/* ══════════════════════════════════════════
   MÓDULO: SYLLABLES
   Contador de sílabas en español
   (algoritmo basado en reglas fonológicas)
══════════════════════════════════════════ */
const Syllables = (() => {
  const VOWELS = 'aeiouáéíóúüAEIOUÁÉÍÓÚÜ';
  const DIPHTHONGS = ['ai','au','ei','eu','oi','ou','ia','ie','io','iu','ua','ue','ui','uo',
                      'ái','áu','éi','éu','ói','íu','úi','iá','ié','ió','iú','uá','ué','uó'];

  function isVowel(c) { return VOWELS.includes(c); }

  function countWord(word) {
    if (!word) return 0;
    word = word.toLowerCase().normalize('NFC');
    let count = 0;
    let i = 0;
    while (i < word.length) {
      if (isVowel(word[i])) {
        count++;
        // Diptongo
        if (i + 1 < word.length && isVowel(word[i+1])) {
          const pair = word[i] + word[i+1];
          if (DIPHTHONGS.includes(pair)) {
            i++; // contar el diptongo como una sílaba
          }
        }
      }
      i++;
    }
    return Math.max(1, count);
  }

  function countText(text) {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).reduce((sum, w) => {
      // limpiar puntuación
      const clean = w.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/g, '');
      return sum + (clean ? countWord(clean) : 0);
    }, 0);
  }

  function countLine(line) {
    return countText(line);
  }

  /** Retorna nombre del verso según sílabas */
  function verseName(n) {
    const names = {
      1:'Monosílabo', 2:'Bisílabo', 3:'Trisílabo', 4:'Tetrasílabo',
      5:'Pentasílabo', 6:'Hexasílabo', 7:'Heptasílabo', 8:'Octosílabo',
      9:'Eneasílabo', 10:'Decasílabo', 11:'Endecasílabo', 12:'Dodecasílabo',
      13:'Tridecasílabo', 14:'Alejandrino'
    };
    return names[n] || `${n} sílabas`;
  }

  function countWords(text) {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  return { countText, countLine, countWord, verseName, countWords };
})();


/* ══════════════════════════════════════════
   MÓDULO: HISTORY (Deshacer/Rehacer)
   Para el editor de texto plano
══════════════════════════════════════════ */
const EditorHistory = (() => {
  let stack  = [];
  let index  = -1;
  let timer  = null;

  function save(text) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      // Eliminar estados futuros
      stack = stack.slice(0, index + 1);
      stack.push(text);
      if (stack.length > 100) stack.shift();
      index = stack.length - 1;
    }, 300);
  }

  function undo() {
    if (index > 0) { index--; return stack[index]; }
    return null;
  }

  function redo() {
    if (index < stack.length - 1) { index++; return stack[index]; }
    return null;
  }

  function reset(text) {
    stack = [text];
    index = 0;
    clearTimeout(timer);
  }

  return { save, undo, redo, reset };
})();


/* ══════════════════════════════════════════
   MÓDULO: POEM STRUCTURES
   Guías de estructura poética
══════════════════════════════════════════ */
const PoemStructures = {
  soneto: {
    name: 'Soneto',
    stanzas: [
      { label: '1.er Cuarteto', verses: 4, hint: 'ABBA · versos endecasílabos (11 síl.)' },
      { label: '2.º Cuarteto',  verses: 4, hint: 'ABBA · versos endecasílabos (11 síl.)' },
      { label: '1.er Terceto',  verses: 3, hint: 'CDC · libre rimado' },
      { label: '2.º Terceto',   verses: 3, hint: 'DCD · libre rimado' }
    ]
  },
  cuarteto: {
    name: 'Cuarteto',
    stanzas: [
      { label: 'Cuarteto', verses: 4, hint: 'ABBA · 4 versos endecasílabos' }
    ]
  },
  lira: {
    name: 'Lira',
    stanzas: [
      { label: 'Lira', verses: 5, hint: 'Versos: 7-11-7-7-11 sílabas · rima aBabB' }
    ]
  },
  haiku: {
    name: 'Haiku',
    stanzas: [
      { label: 'Haiku', verses: 3, hint: 'Verso 1: 5 síl. · Verso 2: 7 síl. · Verso 3: 5 síl.' }
    ]
  },
  silva: {
    name: 'Silva',
    stanzas: [
      { label: 'Silva', verses: 0, hint: 'Mezcla libre de heptasílabos y endecasílabos' }
    ]
  },
  libre: {
    name: 'Verso libre',
    stanzas: [
      { label: '', verses: 0, hint: 'Sin estructura fija · tu ritmo, tus reglas.' }
    ]
  }
};


/* ══════════════════════════════════════════
   MÓDULO: TUTORIAL
══════════════════════════════════════════ */
const Tutorial = (() => {
  let step = 1;
  const totalSteps = 4;

  const overlay = document.getElementById('tutorial-overlay');
  const btnNext  = document.getElementById('tutorial-next');
  const btnPrev  = document.getElementById('tutorial-prev');
  const btnSkip  = document.getElementById('tutorial-skip');

  function show() {
    overlay.classList.remove('hidden');
    updateUI();
  }

  function hide() {
    overlay.classList.add('hidden');
    Storage.markFirstRun();
    // Mostrar prompt de instalación tras tutorial
    setTimeout(() => Install.maybeShow(), 800);
  }

  function updateUI() {
    // Pasos
    document.querySelectorAll('.tutorial-step').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.step) === step);
    });
    // Dots
    document.querySelectorAll('.dot').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.dot) === step);
    });
    // Botones
    btnPrev.classList.toggle('hidden', step === 1);
    btnNext.textContent = step === totalSteps ? 'Comenzar' : 'Siguiente';
  }

  btnNext.addEventListener('click', () => {
    if (step < totalSteps) { step++; updateUI(); }
    else { hide(); }
  });

  btnPrev.addEventListener('click', () => {
    if (step > 1) { step--; updateUI(); }
  });

  btnSkip.addEventListener('click', hide);

  // Dots clickeables
  document.querySelectorAll('.dot').forEach(el => {
    el.addEventListener('click', () => {
      step = parseInt(el.dataset.dot);
      updateUI();
    });
  });

  return { show };
})();


/* ══════════════════════════════════════════
   MÓDULO: INSTALL (PWA)

   Estrategia robusta de instalación:
   - beforeinstallprompt se captura globalmente
     tan pronto como el navegador lo dispara.
   - El prompt se puede lanzar desde el modal
     flotante O desde el botón en Ajustes.
   - Se detecta iOS, ya-instalado, sin soporte.
   - El estado en Ajustes siempre muestra la
     opción correcta según el contexto.
══════════════════════════════════════════ */
const Install = (() => {
  // El prompt se guarda aquí en cuanto llega
  let deferredPrompt = null;

  // Elementos del modal flotante (aparece tras tutorial)
  const overlay    = document.getElementById('install-prompt');
  const btnAccept  = document.getElementById('install-accept');
  const btnDismiss = document.getElementById('install-dismiss');
  const btnClose   = document.getElementById('install-close');
  const iosHint    = document.getElementById('ios-hint');

  // Elementos del panel de Ajustes
  const stateNative      = document.getElementById('install-state-native');
  const stateIos         = document.getElementById('install-state-ios');
  const stateDone        = document.getElementById('install-state-done');
  const stateUnsupported = document.getElementById('install-state-unsupported');
  const btnInstallSettings = document.getElementById('btn-install-settings');

  // ── Detección de contexto ──────────────────
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  function isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
  }

  // ── Captura del evento nativo ──────────────
  // Se registra en cuanto carga el módulo.
  // Chrome/Edge puede tardarlo unos segundos,
  // por eso lo guardamos para usarlo más tarde.
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    // Actualizar el estado en Ajustes si ya está abierto
    updateSettingsState();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    updateSettingsState();
    hideModal();
  });

  // ── Lanzar el prompt del navegador ────────
  async function triggerPrompt(callerBtn) {
    if (!deferredPrompt) return false;

    const original = callerBtn ? callerBtn.textContent : '';
    if (callerBtn) {
      callerBtn.textContent = 'Abriendo...';
      callerBtn.disabled = true;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;

      if (outcome === 'dismissed') {
        localStorage.setItem('infiniversal_install_dismissed', '1');
      }
      return outcome === 'accepted';
    } catch (err) {
      console.warn('[Install] prompt() falló:', err);
      return false;
    } finally {
      if (callerBtn) {
        callerBtn.textContent = original;
        callerBtn.disabled = false;
      }
      updateSettingsState();
    }
  }

  // ── Modal flotante ─────────────────────────
  function maybeShow() {
    if (isInstalled()) return;
    if (localStorage.getItem('infiniversal_install_dismissed') === '1') return;

    if (deferredPrompt) {
      // Ocultar hint de iOS, mostrar botón normal
      if (iosHint) iosHint.classList.add('hidden');
      if (btnAccept) btnAccept.style.display = '';
      overlay.classList.remove('hidden');
    } else if (isIOS) {
      // Mostrar instrucciones manuales para Safari iOS
      if (iosHint) iosHint.classList.remove('hidden');
      if (btnAccept) btnAccept.style.display = 'none';
      overlay.classList.remove('hidden');
    }
    // Otros navegadores sin soporte: no molestar con el modal
  }

  function hideModal() { overlay.classList.add('hidden'); }

  btnAccept.addEventListener('click', async () => {
    const ok = await triggerPrompt(btnAccept);
    if (ok) hideModal();
  });

  btnDismiss.addEventListener('click', () => {
    hideModal();
    localStorage.setItem('infiniversal_install_dismissed', '1');
  });

  btnClose.addEventListener('click', () => {
    hideModal();
    localStorage.setItem('infiniversal_install_dismissed', '1');
  });

  // ── Estado en panel de Ajustes ─────────────
  function updateSettingsState() {
    // Ocultar todos los estados primero
    [stateNative, stateIos, stateDone, stateUnsupported].forEach(el => {
      if (el) el.classList.add('hidden');
    });

    if (isInstalled()) {
      if (stateDone) stateDone.classList.remove('hidden');
    } else if (deferredPrompt) {
      if (stateNative) stateNative.classList.remove('hidden');
    } else if (isIOS) {
      if (stateIos) stateIos.classList.remove('hidden');
    } else {
      if (stateUnsupported) stateUnsupported.classList.remove('hidden');
    }
  }

  // Botón instalar dentro de Ajustes
  if (btnInstallSettings) {
    btnInstallSettings.addEventListener('click', async () => {
      const ok = await triggerPrompt(btnInstallSettings);
      if (ok) {
        // Cerrar modal de ajustes también
        document.getElementById('settings-modal').classList.add('hidden');
      }
    });
  }

  // Llamar al init del estado en Ajustes cada vez que se abra
  function initSettingsState() { updateSettingsState(); }

  return { maybeShow, initSettingsState };
})();


/* ══════════════════════════════════════════
   MÓDULO: SETTINGS
══════════════════════════════════════════ */
const Settings = (() => {
  let s = Storage.getSettings();

  const overlay     = document.getElementById('settings-modal');
  const btnOpen     = document.getElementById('btn-settings');
  const btnClose    = document.getElementById('settings-close');
  const zoomInBtn   = document.getElementById('zoom-in');
  const zoomOutBtn  = document.getElementById('zoom-out');
  const zoomLabel   = document.getElementById('zoom-label');
  const toggleRich  = document.getElementById('toggle-rich');
  const toggleMetric= document.getElementById('toggle-metric');

  function open() {
    // Sync UI con settings actuales
    document.querySelectorAll('.theme-opt').forEach(el => {
      el.classList.toggle('active', el.dataset.theme === s.theme);
    });
    toggleRich.checked    = s.richText;
    toggleMetric.checked  = s.metric;
    zoomLabel.textContent = Math.round(s.zoom * 100) + '%';
    overlay.classList.remove('hidden');
    // Actualizar estado del panel de instalación
    if (typeof Install !== 'undefined') Install.initSettingsState();
  }

  function close() { overlay.classList.add('hidden'); }

  function applyTheme() {
    document.body.classList.toggle('theme-dark',  s.theme === 'dark');
    document.body.classList.toggle('theme-light', s.theme === 'light');
  }

  function applyZoom() {
    document.documentElement.style.setProperty('--text-zoom', s.zoom);
    zoomLabel.textContent = Math.round(s.zoom * 100) + '%';
  }

  function applyRichText() {
    const toolbar = document.getElementById('rich-toolbar');
    const undoBar = document.getElementById('plain-undo-bar');
    toolbar.classList.toggle('hidden', !s.richText);
    undoBar.classList.toggle('hidden', s.richText);
    const editor = document.getElementById('note-editor');
    editor.contentEditable = 'true';
  }

  function applyMetric() {
    document.getElementById('metric-toolbar').classList.toggle('hidden', !s.metric);
  }

  btnOpen.addEventListener('click', open);
  btnClose.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  // Tema
  document.querySelectorAll('.theme-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      s.theme = btn.dataset.theme;
      Storage.saveSettings(s);
      applyTheme();
      document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === s.theme));
    });
  });

  // Zoom
  zoomInBtn.addEventListener('click', () => {
    if (s.zoom < 2) { s.zoom = Math.round((s.zoom + 0.1) * 10) / 10; Storage.saveSettings(s); applyZoom(); }
  });
  zoomOutBtn.addEventListener('click', () => {
    if (s.zoom > 0.6) { s.zoom = Math.round((s.zoom - 0.1) * 10) / 10; Storage.saveSettings(s); applyZoom(); }
  });

  // Rich text toggle
  toggleRich.addEventListener('change', () => {
    s.richText = toggleRich.checked;
    Storage.saveSettings(s);
    applyRichText();
  });

  // Metric toggle
  toggleMetric.addEventListener('change', () => {
    s.metric = toggleMetric.checked;
    Storage.saveSettings(s);
    applyMetric();
  });

  function init() {
    applyTheme();
    applyZoom();
    applyRichText();
    applyMetric();
  }

  function get() { return s; }

  return { init, get, open, close };
})();


/* ══════════════════════════════════════════
   MÓDULO: NOTES MANAGER
   CRUD de notas
══════════════════════════════════════════ */
const NotesManager = (() => {
  function create(type, structure) {
    return {
      id:        Date.now().toString(36) + Math.random().toString(36).slice(2),
      type,       // 'poem' | 'song'
      structure:  structure || null,
      title:      '',
      content:    '',
      tags:       [],
      favorite:   false,
      createdAt:  Date.now(),
      updatedAt:  Date.now()
    };
  }

  function save(note) {
    const notes = Storage.getAllNotes();
    const idx   = notes.findIndex(n => n.id === note.id);
    note.updatedAt = Date.now();
    if (idx >= 0) notes[idx] = note;
    else notes.unshift(note);
    Storage.saveNotes(notes);
  }

  function remove(id) {
    const notes = Storage.getAllNotes().filter(n => n.id !== id);
    Storage.saveNotes(notes);
  }

  function getAll() {
    return Storage.getAllNotes().sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function getById(id) {
    return Storage.getAllNotes().find(n => n.id === id) || null;
  }

  function getAllTags() {
    const all = getAll().flatMap(n => n.tags || []);
    return [...new Set(all)];
  }

  return { create, save, remove, getAll, getById, getAllTags };
})();


/* ══════════════════════════════════════════
   MÓDULO: LIST VIEW
   Renderizado de lista de notas
══════════════════════════════════════════ */
const ListView = (() => {
  const listEl      = document.getElementById('notes-list');
  const emptyEl     = document.getElementById('empty-state');
  const filterBtns  = document.querySelectorAll('.filter-btn:not(#filter-tags-btn)');
  const filterTagBtn= document.getElementById('filter-tags-btn');
  const activeTagsBar = document.getElementById('active-tags-bar');

  let currentFilter   = 'all';
  let activeTags      = [];

  function formatDate(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60)   return 'Ahora';
    if (diff < 3600) return `${Math.floor(diff/60)}m`;
    if (diff < 86400)return `${Math.floor(diff/3600)}h`;
    if (diff < 604800)return `${Math.floor(diff/86400)}d`;
    return d.toLocaleDateString('es-ES', { day:'numeric', month:'short' });
  }

  function applyFilters(notes) {
    let result = notes;
    if (currentFilter === 'poem')  result = result.filter(n => n.type === 'poem');
    if (currentFilter === 'song')  result = result.filter(n => n.type === 'song');
    if (currentFilter === 'fav')   result = result.filter(n => n.favorite);
    if (activeTags.length > 0) {
      result = result.filter(n => activeTags.every(t => (n.tags || []).includes(t)));
    }
    return result;
  }

  function render() {
    const notes    = NotesManager.getAll();
    const filtered = applyFilters(notes);

    // Limpiar lista (excepto empty state)
    listEl.querySelectorAll('.note-card').forEach(el => el.remove());

    if (filtered.length === 0) {
      emptyEl.style.display = 'flex';
      return;
    }
    emptyEl.style.display = 'none';

    filtered.forEach(note => {
      const card = createCard(note);
      listEl.appendChild(card);
    });
  }

  function createCard(note) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.id = note.id;

    const preview = note.content.replace(/<[^>]+>/g, '').replace(/\[.*?\]/g, '').trim().slice(0, 120);
    const typeLabel = note.type === 'poem' ? 'Poesía' : 'Canción';
    const tags = (note.tags || []).slice(0, 3).map(t =>
      `<span class="tag-chip" data-tag="${t}">${t}</span>`
    ).join('');

    card.innerHTML = `
      <div class="note-card-header">
        <div class="note-card-title">${note.title || 'Sin título'}</div>
        <div class="note-card-actions">
          <button class="note-card-fav ${note.favorite ? 'active' : ''}" data-id="${note.id}" aria-label="Favorito">
            ${note.favorite ? '★' : '☆'}
          </button>
        </div>
      </div>
      ${preview ? `<div class="note-card-preview">${preview}</div>` : ''}
      <div class="note-card-footer">
        <div class="note-card-meta">
          <span class="type-badge-card ${note.type}">${typeLabel}</span>
          ${note.structure ? ` · ${note.structure}` : ''}
          &nbsp;·&nbsp; ${formatDate(note.updatedAt)}
        </div>
        <div class="note-card-tags">${tags}</div>
      </div>`;

    // Click en card → abrir editor
    card.addEventListener('click', e => {
      if (e.target.classList.contains('note-card-fav')) return;
      if (e.target.classList.contains('tag-chip')) {
        toggleActiveTag(e.target.dataset.tag);
        return;
      }
      EditorView.open(note.id);
    });

    // Favorito
    card.querySelector('.note-card-fav').addEventListener('click', e => {
      e.stopPropagation();
      const n = NotesManager.getById(note.id);
      if (n) {
        n.favorite = !n.favorite;
        NotesManager.save(n);
        render();
      }
    });

    return card;
  }

  function toggleActiveTag(tag) {
    if (activeTags.includes(tag)) {
      activeTags = activeTags.filter(t => t !== tag);
    } else {
      activeTags.push(tag);
    }
    renderActiveTagsBar();
    render();
  }

  function renderActiveTagsBar() {
    if (activeTags.length === 0) {
      activeTagsBar.classList.add('hidden');
      activeTagsBar.innerHTML = '';
      return;
    }
    activeTagsBar.classList.remove('hidden');
    activeTagsBar.innerHTML = activeTags.map(t =>
      `<span class="tag-chip removable" data-tag="${t}">${t}</span>`
    ).join('');
    activeTagsBar.querySelectorAll('.tag-chip').forEach(el => {
      el.addEventListener('click', () => toggleActiveTag(el.dataset.tag));
    });
  }

  // Filtros
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      activeTags = [];
      renderActiveTagsBar();
      render();
    });
  });

  // Filtro por tags
  filterTagBtn.addEventListener('click', () => {
    const allTags = NotesManager.getAllTags();
    if (allTags.length === 0) return;
    // Toggle primer tag para demo; en uso real abrir modal de tags
    // Simplemente mostrar el filtro de tags disponibles
    activeTagsBar.classList.remove('hidden');
    activeTagsBar.innerHTML = '<span style="color:var(--text-muted);font-size:0.78rem">Tags: </span>' +
      allTags.map(t => `<span class="tag-chip" data-tag="${t}">${t}</span>`).join('');
    activeTagsBar.querySelectorAll('.tag-chip').forEach(el => {
      el.addEventListener('click', () => toggleActiveTag(el.dataset.tag));
    });
  });

  return { render };
})();


/* ══════════════════════════════════════════
   MÓDULO: EDITOR VIEW
══════════════════════════════════════════ */
const EditorView = (() => {
  let currentNote = null;
  let saveTimer   = null;

  // Elementos
  const viewList   = document.getElementById('view-list');
  const viewEditor = document.getElementById('view-editor');
  const btnBack    = document.getElementById('btn-back');
  const btnFav     = document.getElementById('btn-fav');
  const btnTags    = document.getElementById('btn-tags');
  const btnShare   = document.getElementById('btn-share');
  const titleInput = document.getElementById('note-title');
  const editor     = document.getElementById('note-editor');
  const songToolbar= document.getElementById('song-toolbar');
  const poemGuide  = document.getElementById('poem-guide');
  const typeBadge  = document.getElementById('editor-type-badge');
  const noteTagsBar= document.getElementById('note-tags-bar');

  // Stats
  const statWords  = document.getElementById('stat-words');
  const statSyl    = document.getElementById('stat-syllables');
  const statChars  = document.getElementById('stat-chars');

  // Métrica
  const metricSyl  = document.getElementById('metric-syllables');
  const metricType = document.getElementById('metric-type');

  function open(noteId) {
    if (noteId) {
      currentNote = NotesManager.getById(noteId);
    }
    if (!currentNote) return;

    // Animar entrada
    viewList.classList.add('hidden');
    viewEditor.classList.remove('hidden');
    viewEditor.classList.add('entering');
    setTimeout(() => viewEditor.classList.remove('entering'), 300);

    // Poblar editor
    titleInput.value    = currentNote.title;
    editor.innerHTML    = currentNote.content;
    updateFavBtn();
    updateTypeBadge();
    renderNoteTagsBar();
    updateStats();

    // Mostrar/ocultar toolbars según tipo
    if (currentNote.type === 'song') {
      songToolbar.classList.remove('hidden');
      poemGuide.classList.add('hidden');
    } else {
      songToolbar.classList.add('hidden');
      renderPoemGuide();
    }

    EditorHistory.reset(editor.innerHTML);
    editor.focus();
  }

  function openNew(note) {
    currentNote = note;
    open(null);
  }

  function close() {
    saveNow();
    viewEditor.classList.add('hidden');
    viewList.classList.remove('hidden');
    ListView.render();
  }

  function saveNow() {
    if (!currentNote) return;
    currentNote.title   = titleInput.value.trim();
    currentNote.content = editor.innerHTML;
    NotesManager.save(currentNote);
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 800);
  }

  function updateFavBtn() {
    btnFav.textContent = currentNote.favorite ? '★' : '☆';
    btnFav.classList.toggle('active', currentNote.favorite);
  }

  function updateTypeBadge() {
    typeBadge.textContent = currentNote.type === 'poem' ? 'Poesía' : 'Canción';
    typeBadge.className   = `type-badge ${currentNote.type}`;
  }

  function renderNoteTagsBar() {
    noteTagsBar.innerHTML = '';
    (currentNote.tags || []).forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip removable';
      chip.textContent = tag;
      chip.addEventListener('click', () => {
        currentNote.tags = currentNote.tags.filter(t => t !== tag);
        NotesManager.save(currentNote);
        renderNoteTagsBar();
      });
      noteTagsBar.appendChild(chip);
    });
  }

  function renderPoemGuide() {
    const struct = PoemStructures[currentNote.structure] || null;
    if (!struct || struct.stanzas[0].verses === 0) {
      poemGuide.classList.add('hidden');
      if (struct && struct.stanzas[0].hint) {
        poemGuide.innerHTML = `<div class="poem-verse-hint">${struct.name}: ${struct.stanzas[0].hint}</div>`;
        poemGuide.classList.remove('hidden');
      }
      return;
    }
    poemGuide.classList.remove('hidden');
    poemGuide.innerHTML = struct.stanzas.map(st => `
      <div class="poem-stanza">
        <div class="poem-stanza-label">${st.label} (${st.verses} versos)</div>
        <div class="poem-verse-hint">${st.hint}</div>
      </div>`).join('');
  }

  function updateStats() {
    const text = editor.innerText || '';
    const words = Syllables.countWords(text);
    const syls  = Syllables.countText(text);
    const chars = text.length;
    statWords.textContent = `${words} palabra${words !== 1 ? 's' : ''}`;
    statSyl.textContent   = `${syls} síl.`;
    statChars.textContent = `${chars} car.`;
  }

  function updateMetric() {
    // Obtener la línea actual del cursor
    const sel  = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node  = range.startContainer;
    const lineText = (node.textContent || '').split('\n')[0];
    const syls = Syllables.countLine(lineText.trim());
    metricSyl.textContent  = `${syls} síl.`;
    metricType.textContent = syls > 0 ? Syllables.verseName(syls) : '—';
  }

  // ── Eventos del editor ──
  titleInput.addEventListener('input', scheduleSave);

  editor.addEventListener('input', () => {
    updateStats();
    updateMetric();
    EditorHistory.save(editor.innerHTML);
    scheduleSave();
  });

  editor.addEventListener('keyup', updateMetric);
  editor.addEventListener('click', updateMetric);

  // Selección de texto → métrica
  document.addEventListener('selectionchange', () => {
    if (!viewEditor.classList.contains('hidden')) {
      const sel = window.getSelection();
      if (sel && sel.toString().trim()) {
        const syls = Syllables.countText(sel.toString());
        metricSyl.textContent  = `${syls} síl.`;
        metricType.textContent = syls > 0 ? Syllables.verseName(syls) : '—';
      }
    }
  });

  // Botón volver
  btnBack.addEventListener('click', close);

  // Favorito
  btnFav.addEventListener('click', () => {
    if (!currentNote) return;
    currentNote.favorite = !currentNote.favorite;
    updateFavBtn();
    NotesManager.save(currentNote);
  });

  // Tags
  btnTags.addEventListener('click', () => TagsModal.open(currentNote, () => {
    renderNoteTagsBar();
    NotesManager.save(currentNote);
  }));

  // Compartir
  btnShare.addEventListener('click', () => {
    saveNow();
    ShareModal.open(currentNote);
  });

  // Song section buttons
  songToolbar.querySelectorAll('.section-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      insertSectionMarker(section);
    });
  });

  function insertSectionMarker(section) {
    editor.focus();
    const marker = `<div><span class="song-section-marker">[ ${section} ]</span></div><div><br></div>`;
    document.execCommand('insertHTML', false, marker);
    updateStats();
    scheduleSave();
  }

  // Rich text buttons
  document.getElementById('rich-toolbar').querySelectorAll('.fmt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      if (cmd === 'undo') { const t = EditorHistory.undo(); if (t !== null) { editor.innerHTML = t; updateStats(); scheduleSave(); } }
      else if (cmd === 'redo') { const t = EditorHistory.redo(); if (t !== null) { editor.innerHTML = t; updateStats(); scheduleSave(); } }
      else { document.execCommand(cmd, false, null); editor.focus(); }
    });
  });

  // Plain undo/redo
  document.getElementById('btn-undo').addEventListener('click', () => {
    const t = EditorHistory.undo();
    if (t !== null) { editor.innerHTML = t; updateStats(); scheduleSave(); }
  });
  document.getElementById('btn-redo').addEventListener('click', () => {
    const t = EditorHistory.redo();
    if (t !== null) { editor.innerHTML = t; updateStats(); scheduleSave(); }
  });

  return { open, openNew, close, getCurrentNote: () => currentNote };
})();


/* ══════════════════════════════════════════
   MÓDULO: TAGS MODAL
══════════════════════════════════════════ */
const TagsModal = (() => {
  const overlay  = document.getElementById('tag-modal');
  const btnClose = document.getElementById('tag-close');
  const tagInput = document.getElementById('tag-input');
  const btnAdd   = document.getElementById('tag-add');
  const tagList  = document.getElementById('tag-list');

  let note     = null;
  let onUpdate = null;

  function open(n, cb) {
    note     = n;
    onUpdate = cb;
    render();
    overlay.classList.remove('hidden');
    tagInput.value = '';
  }

  function close() { overlay.classList.add('hidden'); }

  function render() {
    tagList.innerHTML = '';
    const allTags = NotesManager.getAllTags();
    if (allTags.length === 0) {
      tagList.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem">Aún no hay tags. ¡Crea el primero!</span>';
      return;
    }
    allTags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip' + (note && note.tags.includes(tag) ? ' active' : '');
      chip.textContent = tag;
      chip.style.cursor = 'pointer';
      if (note && note.tags.includes(tag)) chip.style.outline = '2px solid var(--accent)';
      chip.addEventListener('click', () => {
        if (!note) return;
        if (note.tags.includes(tag)) note.tags = note.tags.filter(t => t !== tag);
        else note.tags.push(tag);
        if (onUpdate) onUpdate();
        render();
      });
      tagList.appendChild(chip);
    });
  }

  btnAdd.addEventListener('click', () => {
    const val = tagInput.value.trim().toLowerCase().replace(/\s+/g,'-');
    if (!val || !note) return;
    if (!note.tags.includes(val)) note.tags.push(val);
    tagInput.value = '';
    if (onUpdate) onUpdate();
    render();
  });

  tagInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnAdd.click(); });
  btnClose.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  return { open };
})();


/* ══════════════════════════════════════════
   MÓDULO: SHARE MODAL
══════════════════════════════════════════ */
const ShareModal = (() => {
  const overlay     = document.getElementById('share-modal');
  const btnClose    = document.getElementById('share-close');
  const btnClip     = document.getElementById('share-clipboard');
  const btnTxt      = document.getElementById('share-txt');
  const btnPdf      = document.getElementById('share-pdf');
  const toast       = document.getElementById('share-toast');

  let currentNote = null;

  function getPlainText(note) {
    const title = note.title || 'Sin título';
    const content = (note.content || '').replace(/<[^>]+>/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    return `${title}\n${'─'.repeat(title.length)}\n\n${content}`;
  }

  function open(note) {
    currentNote = note;
    overlay.classList.remove('hidden');
    toast.classList.add('hidden');
  }

  function close() { overlay.classList.add('hidden'); }

  btnClose.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  btnClip.addEventListener('click', async () => {
    if (!currentNote) return;
    try {
      await navigator.clipboard.writeText(getPlainText(currentNote));
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = getPlainText(currentNote);
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 2500);
    }
  });

  btnTxt.addEventListener('click', () => {
    if (!currentNote) return;
    const blob = new Blob([getPlainText(currentNote)], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${currentNote.title || 'nota'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    close();
  });

  btnPdf.addEventListener('click', () => {
    if (!currentNote) return;
    close();
    // Usar el diálogo de impresión del navegador → Guardar como PDF
    const w = window.open('', '_blank');
    w.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>${currentNote.title || 'Nota'}</title>
      <style>
        body { font-family: Georgia,serif; max-width:600px; margin:40px auto; line-height:1.8; color:#111; }
        h1 { font-size:1.5rem; border-bottom:1px solid #ccc; padding-bottom:8px; margin-bottom:24px; }
        .content { white-space: pre-wrap; }
      </style></head><body>
      <h1>${currentNote.title || 'Sin título'}</h1>
      <div class="content">${currentNote.content || ''}</div>
      </body></html>`);
    w.document.close();
    w.print();
  });

  return { open };
})();


/* ══════════════════════════════════════════
   MÓDULO: NUEVA NOTA (flujo de creación)
══════════════════════════════════════════ */
const NewNoteFlow = (() => {
  const typeModal    = document.getElementById('type-modal');
  const structModal  = document.getElementById('poem-structure-modal');
  const typeCancel   = document.getElementById('type-cancel');
  const structBack   = document.getElementById('poem-structure-back');
  const btnNew       = document.getElementById('btn-new');

  let chosenType = null;

  function start() {
    chosenType = null;
    typeModal.classList.remove('hidden');
  }

  function closeType() { typeModal.classList.add('hidden'); }
  function closeStruct(){ structModal.classList.add('hidden'); }

  // Elegir tipo
  typeModal.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chosenType = btn.dataset.type;
      closeType();
      if (chosenType === 'song') {
        // Crear nota de canción directamente
        const note = NotesManager.create('song', null);
        NotesManager.save(note);
        EditorView.openNew(note);
      } else {
        // Mostrar modal de estructura poética
        structModal.classList.remove('hidden');
      }
    });
  });

  // Elegir estructura poética
  structModal.querySelectorAll('.structure-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const structure = btn.dataset.structure;
      closeStruct();
      const note = NotesManager.create('poem', structure);
      NotesManager.save(note);
      EditorView.openNew(note);
    });
  });

  typeCancel.addEventListener('click', closeType);
  structBack.addEventListener('click', () => { closeStruct(); start(); });
  typeModal.addEventListener('click', e => { if (e.target === typeModal) closeType(); });
  structModal.addEventListener('click', e => { if (e.target === structModal) closeStruct(); });

  btnNew.addEventListener('click', start);

  return { start };
})();


/* ══════════════════════════════════════════
   MÓDULO: AYUDA
══════════════════════════════════════════ */
const Help = (() => {
  const overlay  = document.getElementById('help-modal');
  const btnOpen  = document.getElementById('btn-help');
  const btnClose = document.getElementById('help-close');

  btnOpen.addEventListener('click', () => overlay.classList.remove('hidden'));
  btnClose.addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
})();


/* ══════════════════════════════════════════
   INIT · Arranque de la aplicación
══════════════════════════════════════════ */
(function init() {
  // Aplicar settings guardados
  Settings.init();

  // Renderizar lista inicial
  ListView.render();

  // Tutorial en primera ejecución
  if (Storage.isFirstRun()) {
    Tutorial.show();
  } else {
    // Mostrar prompt de instalación si aplica
    setTimeout(() => Install.maybeShow(), 1500);
  }
})();


/* ══════════════════════════════════════════
   SERVICE WORKER REGISTRATION
══════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW registrado:', reg.scope))
      .catch(err => console.warn('SW error:', err));
  });
}
