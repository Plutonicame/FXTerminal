'use strict';

/**
 * fundamental.js
 * Onglet « Analyse fondamentale » : une zone PARTAGÉE par tous les
 * utilisateurs de l'appli, organisée en arbre d'onglets imbriqués.
 *
 *   Groupe (ex. « Analyse fondamentale »)
 *     └─ Onglet (ex. « 2026 »)
 *          └─ Onglet (ex. « Octobre »)
 *               └─ Onglet (ex. « Semaine 3 »)  + texte libre
 *
 * - Un groupe n'a qu'un nom et des onglets.
 * - Un onglet a un nom, un texte libre ET des sous-onglets (à l'infini).
 * - Tout est stocké dans la table Supabase "fundamental_nodes"
 *   (voir supabase-fundamental.sql) : une ligne par groupe/onglet,
 *   reliée à son parent par "parent_id" (null = groupe).
 * - Le contenu est partagé et se met à jour en direct chez tout le monde
 *   (Supabase Realtime). Les COULEURS, elles, restent personnelles :
 *   elles viennent du thème de chaque compte (Paramètres > Thème).
 * - Seul l'état « ouvert / fermé » des flèches est mémorisé, en local,
 *   sur chaque appareil (ce n'est pas du contenu partagé).
 */
(function () {
  const TABLE = 'fundamental_nodes';
  const OPEN_KEY = 'fx_fund_open';
  const SAVE_DELAY_MS = 800;
  const NAME_MAX = 80;

  let nodes = new Map(); // id -> { id, parent_id, name, content, created_at }
  let openIds = loadOpen();
  let userId = null;
  let channel = null;
  let loaded = false;
  let loading = false;

  const dirty = new Set();   // ids dont le texte n'est pas encore envoyé
  const timers = new Map();  // id -> timeout de sauvegarde différée
  const els = {};
  let dialogState = null;    // { resolve, withInput }

  /* =========================================================
     Utilitaires
     ========================================================= */
  function getClient() {
    return window.Auth && window.Auth.getClient ? window.Auth.getClient() : null;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function loadOpen() {
    try {
      const raw = localStorage.getItem(OPEN_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) {
      return new Set();
    }
  }

  function saveOpen() {
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(Array.from(openIds)));
    } catch (e) { /* stockage indisponible : sans conséquence */ }
  }

  function setStatus(message) {
    if (!els.status) return;
    els.status.textContent = message || '';
    els.status.hidden = !message;
  }

  function spinnerOn() {
    if (typeof showSaveSpinner === 'function') showSaveSpinner();
  }

  function spinnerOff() {
    if (typeof hideSaveSpinner === 'function') window.setTimeout(hideSaveSpinner, 400);
  }

  function friendlyError(error, action) {
    const msg = (error && error.message) || '';
    const code = (error && error.code) || '';
    if (code === '42P01' || code === 'PGRST205' || /does not exist|schema cache/i.test(msg)) {
      return 'La table "fundamental_nodes" n\'existe pas encore dans Supabase : ' +
        'exécute supabase-fundamental.sql dans le SQL Editor.';
    }
    return action + (msg ? ' (' + msg + ')' : '') + '.';
  }

  function normalize(row) {
    return {
      id: row.id,
      parent_id: row.parent_id || null,
      name: row.name,
      content: row.content || '',
      created_at: row.created_at || '',
    };
  }

  /* =========================================================
     Couleurs propres à chaque groupe (fond, bordure, texte)
     Stockées dans le THÈME du compte (ThemeColors), donc personnelles :
     seul le contenu est partagé, jamais les couleurs.
     ========================================================= */
  const GC_KEYS = ['bg', 'border', 'text'];
  const GC_DEFAULT_VAR = { bg: '--fund-group-bg', border: '--fund-group-border', text: '--fund-group-text' };

  function gcVar(id, key) {
    return '--fgc-' + id + '-' + key;
  }

  function getGroupColors(id) {
    const T = window.ThemeColors;
    const out = {};
    GC_KEYS.forEach((k) => { out[k] = T && T.getVar ? T.getVar(gcVar(id, k)) : null; });
    return out;
  }

  function sameColors(a, b) {
    return GC_KEYS.every((k) => (a[k] || null) === (b[k] || null));
  }

  function saveGroupColors(id, colors) {
    const T = window.ThemeColors;
    if (!T || !T.setVars) return;
    if (sameColors(getGroupColors(id), colors)) return;
    const map = {};
    GC_KEYS.forEach((k) => { map[gcVar(id, k)] = colors[k] || null; });
    T.setVars(map);
  }

  function applyGroupColors(wrap, id) {
    const c = getGroupColors(id);
    if (c.bg) {
      wrap.style.setProperty('--fund-g-bg', c.bg);
      wrap.style.setProperty('--fund-g-hover-bg', c.bg);
    }
    if (c.border) wrap.style.setProperty('--fund-g-border', c.border);
    if (c.text) wrap.style.setProperty('--fund-g-text', c.text);
  }

  /* =========================================================
     Arbre en mémoire
     ========================================================= */
  function childrenOf(parentId) {
    const list = [];
    nodes.forEach((n) => {
      if (n.parent_id === parentId) list.push(n);
    });
    list.sort((a, b) => {
      if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });
    return list;
  }

  function descendantIds(id) {
    const out = [];
    childrenOf(id).forEach((child) => {
      out.push(child.id);
      descendantIds(child.id).forEach((d) => out.push(d));
    });
    return out;
  }

  function removeLocal(id) {
    const all = descendantIds(id).concat(id);
    all.forEach((nodeId) => {
      nodes.delete(nodeId);
      openIds.delete(nodeId);
      dirty.delete(nodeId);
      if (timers.has(nodeId)) {
        window.clearTimeout(timers.get(nodeId));
        timers.delete(nodeId);
      }
    });
    saveOpen();
  }

  /* =========================================================
     Rendu
     ========================================================= */
  function autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.max(ta.scrollHeight + 2, 110) + 'px';
  }

  function textareaFor(id) {
    return els.tree ? els.tree.querySelector('.fund-text[data-id="' + id + '"]') : null;
  }

  function isEditing(id) {
    const a = document.activeElement;
    return !!(a && a.classList && a.classList.contains('fund-text') && a.dataset.id === id);
  }

  function captureFocus() {
    const a = document.activeElement;
    if (a && a.classList && a.classList.contains('fund-text') && els.tree.contains(a)) {
      return { id: a.dataset.id, start: a.selectionStart, end: a.selectionEnd, scroll: a.scrollTop };
    }
    return null;
  }

  function restoreFocus(state) {
    if (!state) return;
    const ta = textareaFor(state.id);
    if (!ta) return;
    ta.focus({ preventScroll: true });
    try { ta.setSelectionRange(state.start, state.end); } catch (e) { /* ignoré */ }
    ta.scrollTop = state.scroll;
  }

  // Règle : un onglet contient SOIT du texte, SOIT des sous-onglets.
  //  - vide                          -> zone de texte ET bouton « + » disponibles
  //  - dès qu'il y a du texte        -> le bouton « + » de la ligne disparaît
  //  - dès qu'il y a un sous-onglet  -> la zone de texte disparaît
  // Un groupe, lui, ne contient que des onglets (« + » toujours visible).
  function canAddChild(node) {
    if (node.parent_id === null) return true;
    return childrenOf(node.id).length > 0 || node.content.trim() === '';
  }

  function buildBody(node, isGroup, depth, addBtn) {
    const body = el('div', 'fund-body');
    const kids = childrenOf(node.id);
    const hasKids = kids.length > 0;

    if (!isGroup && !hasKids) {
      const ta = el('textarea', 'fund-text');
      ta.dataset.id = node.id;
      ta.value = node.content;
      ta.placeholder = 'Écrire du texte...';
      ta.setAttribute('aria-label', 'Texte de ' + node.name);
      ta.addEventListener('input', () => {
        autosize(ta);
        const n = nodes.get(node.id);
        if (!n) return;
        n.content = ta.value;
        addBtn.hidden = !canAddChild(n);
        scheduleSave(node.id);
      });
      ta.addEventListener('blur', () => flushSave(node.id));
      body.appendChild(ta);
    }

    if (hasKids) {
      const list = el('div', 'fund-children');
      kids.forEach((kid) => list.appendChild(buildNode(kid, depth + 1)));
      body.appendChild(list);
    } else if (isGroup) {
      body.appendChild(el('p', 'fund-empty', 'Aucun onglet pour le moment.'));
    }

    return body;
  }

  // Met à jour le bouton « + » de la ligne quand le texte change à distance.
  function syncAddButton(id) {
    const n = nodes.get(id);
    const btn = els.tree && els.tree.querySelector('.fund-node[data-id="' + id + '"] > .fund-row .fund-icon-btn--add');
    if (n && btn) btn.hidden = !canAddChild(n);
  }

  function buildNode(node, depth) {
    const isGroup = depth === 0;
    const isOpen = openIds.has(node.id);

    const wrap = el('div', 'fund-node ' + (isGroup ? 'fund-node--group' : 'fund-node--tab') + (isOpen ? ' is-open' : ''));
    wrap.dataset.id = node.id;

    const row = el('div', 'fund-row');

    const toggle = el('button', 'fund-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    const chevron = el('span', 'fund-chevron', '›');
    chevron.setAttribute('aria-hidden', 'true');
    toggle.appendChild(chevron);
    toggle.appendChild(el('span', 'fund-name', node.name));
    toggle.addEventListener('click', () => toggleNode(node.id));
    row.appendChild(toggle);

    const actions = el('div', 'fund-actions');
    const renameBtn = el('button', 'fund-icon-btn fund-icon-btn--rename', '✎\uFE0E');
    renameBtn.type = 'button';
    renameBtn.title = isGroup ? 'Renommer / personnaliser' : 'Renommer';
    renameBtn.setAttribute('aria-label', (isGroup ? 'Renommer ou personnaliser ' : 'Renommer ') + node.name);
    renameBtn.addEventListener('click', () => renameNode(node.id));
    const addBtn = el('button', 'fund-icon-btn fund-icon-btn--add', '+');
    addBtn.type = 'button';
    addBtn.title = 'Ajouter un onglet';
    addBtn.setAttribute('aria-label', 'Ajouter un onglet dans ' + node.name);
    addBtn.hidden = !canAddChild(node);
    addBtn.addEventListener('click', () => addNode(node.id));
    const deleteBtn = el('button', 'fund-icon-btn fund-icon-btn--delete', '✕');
    deleteBtn.type = 'button';
    deleteBtn.title = 'Supprimer';
    deleteBtn.setAttribute('aria-label', 'Supprimer ' + node.name);
    deleteBtn.addEventListener('click', () => deleteNode(node.id));
    actions.appendChild(renameBtn);
    actions.appendChild(addBtn);
    actions.appendChild(deleteBtn);
    row.appendChild(actions);

    wrap.appendChild(row);
    if (isGroup) applyGroupColors(wrap, node.id);
    if (isOpen) wrap.appendChild(buildBody(node, isGroup, depth, addBtn));
    return wrap;
  }

  function render() {
    if (!els.tree) return;
    const focus = captureFocus();
    const frag = document.createDocumentFragment();
    const groups = childrenOf(null);

    if (!loaded) {
      frag.appendChild(el('p', 'fund-empty', userId ? 'Chargement...' : 'Connecte-toi pour voir cette page.'));
    } else if (!groups.length) {
      frag.appendChild(el('p', 'fund-empty', 'Aucun groupe pour le moment. Crée le premier avec « + Groupe ».'));
    } else {
      groups.forEach((g) => frag.appendChild(buildNode(g, 0)));
    }

    els.tree.replaceChildren(frag);
    els.tree.querySelectorAll('.fund-text').forEach(autosize);
    restoreFocus(focus);
  }

  function toggleNode(id) {
    if (openIds.has(id)) {
      // En refermant un onglet, tout ce qui était ouvert à l'intérieur se referme
      // aussi : à la réouverture, il apparaît avec ses sous-onglets repliés.
      openIds.delete(id);
      descendantIds(id).forEach((d) => openIds.delete(d));
    } else {
      openIds.add(id);
    }
    saveOpen();
    render();
  }

  /* =========================================================
     Boîte de dialogue (nom / confirmation)
     ========================================================= */
  function openDialog(opts) {
    return new Promise((resolve) => {
      if (dialogState) finishDialog(null);
      dialogState = {
        resolve,
        withInput: !!opts.withInput,
        withColors: !!opts.withColors,
        colors: opts.withColors ? Object.assign({ bg: null, border: null, text: null }, opts.colors) : null,
      };

      els.dialogTitle.textContent = opts.title || '';
      els.dialogMessage.textContent = opts.message || '';
      els.dialogMessage.hidden = !opts.message;
      els.dialogInput.hidden = !opts.withInput;
      els.dialogInput.value = opts.initial || '';
      els.dialogError.hidden = true;
      els.dialogOk.textContent = opts.okLabel || 'Valider';
      els.dialogOk.classList.toggle('is-danger', !!opts.danger);
      els.customToggle.hidden = !opts.withColors;
      els.custom.hidden = true;
      els.customToggle.setAttribute('aria-expanded', 'false');
      if (opts.withColors) {
        refreshColorUI();
        // Déjà personnalisé : on montre directement les couleurs actuelles.
        if (GC_KEYS.some((k) => dialogState.colors[k])) setCustomOpen(true);
      }
      els.dialog.hidden = false;

      window.setTimeout(() => {
        if (opts.withInput) {
          els.dialogInput.focus();
          els.dialogInput.select();
        } else {
          els.dialogOk.focus();
        }
      }, 0);
    });
  }

  function finishDialog(result) {
    if (!dialogState) return;
    const { resolve } = dialogState;
    dialogState = null;
    els.dialog.hidden = true;
    resolve(result);
  }

  function submitDialog() {
    if (!dialogState) return;
    if (dialogState.withInput) {
      const value = els.dialogInput.value.trim();
      if (!value) {
        els.dialogError.textContent = 'Le nom ne peut pas être vide.';
        els.dialogError.hidden = false;
        els.dialogInput.focus();
        return;
      }
      finishDialog(dialogState.withColors ? { name: value, colors: Object.assign({}, dialogState.colors) } : value);
    } else {
      finishDialog(true);
    }
  }

  function setCustomOpen(open) {
    els.custom.hidden = !open;
    els.customToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) refreshColorUI();
  }

  function effectiveColor(key) {
    if (dialogState && dialogState.colors && dialogState.colors[key]) return dialogState.colors[key];
    const T = window.ThemeColors;
    return T && T.getColor ? T.getColor(GC_DEFAULT_VAR[key]) : '#444444';
  }

  // Met à jour les carrés de couleur et l'aperçu du groupe.
  function refreshColorUI() {
    if (!dialogState || !dialogState.withColors) return;
    els.swatches.forEach((btn) => { btn.style.background = effectiveColor(btn.dataset.key); });
    els.preview.style.background = effectiveColor('bg');
    els.preview.style.borderColor = effectiveColor('border');
    els.preview.style.color = effectiveColor('text');
    els.preview.textContent = els.dialogInput.value.trim() || 'Nom du groupe';
  }

  function pickGroupColor(key) {
    const T = window.ThemeColors;
    if (!dialogState || !T || !T.pickColor) return;
    const labels = { bg: 'Fond du groupe', border: 'Bordure du groupe', text: 'Texte du groupe' };
    T.pickColor(labels[key], effectiveColor(key), (hex) => {
      if (!dialogState || !dialogState.colors) return;
      dialogState.colors[key] = hex;
      refreshColorUI();
    });
  }

  function askName(opts) {
    return openDialog({ title: opts.title, initial: opts.initial, okLabel: opts.okLabel, withInput: true });
  }

  // Fenêtre « groupe » : nom + couleurs (Personnaliser). Renvoie { name, colors } ou null.
  function askGroup(opts) {
    return openDialog({
      title: opts.title, initial: opts.initial, okLabel: opts.okLabel,
      withInput: true, withColors: true, colors: opts.colors,
    });
  }

  function askConfirm(opts) {
    return openDialog({ title: opts.title, message: opts.message, okLabel: opts.okLabel, danger: true, withInput: false });
  }

  /* =========================================================
     Actions (écriture dans Supabase)
     ========================================================= */
  async function addNode(parentId) {
    const isGroup = parentId === null;
    let name;
    let colors = null;
    if (isGroup) {
      const res = await askGroup({ title: 'Nouveau groupe', okLabel: 'Créer' });
      if (!res) return;
      name = res.name;
      colors = res.colors;
    } else {
      name = await askName({ title: 'Nouvel onglet', okLabel: 'Créer' });
      if (!name) return;
    }

    const client = getClient();
    if (!client) return;

    spinnerOn();
    const { data, error } = await client
      .from(TABLE)
      .insert({ parent_id: parentId, name })
      .select('id,parent_id,name,content,created_at')
      .single();
    spinnerOff();

    if (error) {
      console.error('[FX-FUND] Erreur création :', error);
      setStatus(friendlyError(error, 'Impossible de créer l\'élément'));
      return;
    }

    nodes.set(data.id, normalize(data));
    if (isGroup && colors) saveGroupColors(data.id, colors);
    if (parentId) openIds.add(parentId);
    openIds.add(data.id);
    saveOpen();
    setStatus('');
    render();
  }

  async function renameNode(id) {
    const node = nodes.get(id);
    if (!node) return;
    const isGroup = node.parent_id === null;

    let name;
    let colors = null;
    if (isGroup) {
      const res = await askGroup({
        title: 'Modifier le groupe',
        initial: node.name,
        okLabel: 'Enregistrer',
        colors: getGroupColors(id),
      });
      if (!res) return;
      name = res.name;
      colors = res.colors;
    } else {
      name = await askName({ title: 'Renommer', initial: node.name, okLabel: 'Enregistrer' });
      if (!name) return;
    }

    if (colors) saveGroupColors(id, colors); // personnel : thème du compte, pas la table partagée

    if (name !== node.name) {
      const client = getClient();
      if (!client) return;

      spinnerOn();
      const { error } = await client.from(TABLE).update({ name }).eq('id', id);
      spinnerOff();

      if (error) {
        console.error('[FX-FUND] Erreur renommage :', error);
        setStatus(friendlyError(error, 'Impossible de renommer'));
        render();
        return;
      }
      node.name = name;
    }
    setStatus('');
    render();
  }

  async function deleteNode(id) {
    const node = nodes.get(id);
    if (!node) return;
    const count = descendantIds(id).length;
    const extra = count
      ? ' et les ' + count + ' onglet' + (count > 1 ? 's' : '') + ' qu\'il contient'
      : '';
    const ok = await askConfirm({
      title: 'Supprimer',
      message: '« ' + node.name + ' »' + extra + ' ser' + (count ? 'ont' : 'a') +
        ' supprimé' + (count ? 's' : '') + ' pour tous les utilisateurs. Cette action est définitive.',
      okLabel: 'Supprimer',
    });
    if (!ok) return;

    const client = getClient();
    if (!client) return;

    spinnerOn();
    const { error } = await client.from(TABLE).delete().eq('id', id);
    spinnerOff();

    if (error) {
      console.error('[FX-FUND] Erreur suppression :', error);
      setStatus(friendlyError(error, 'Impossible de supprimer'));
      return;
    }
    removeLocal(id);
    if (node.parent_id === null) saveGroupColors(id, { bg: null, border: null, text: null });
    setStatus('');
    render();
  }

  /* ---------- Sauvegarde du texte (différée) ---------- */
  function scheduleSave(id) {
    dirty.add(id);
    if (timers.has(id)) window.clearTimeout(timers.get(id));
    timers.set(id, window.setTimeout(() => flushSave(id), SAVE_DELAY_MS));
  }

  async function flushSave(id) {
    if (timers.has(id)) {
      window.clearTimeout(timers.get(id));
      timers.delete(id);
    }
    if (!dirty.has(id)) return;

    const node = nodes.get(id);
    const client = getClient();
    dirty.delete(id);
    if (!node || !client) return;

    spinnerOn();
    const { error } = await client.from(TABLE).update({ content: node.content }).eq('id', id);
    spinnerOff();

    if (error) {
      console.error('[FX-FUND] Erreur sauvegarde du texte :', error);
      dirty.add(id); // sera retenté à la prochaine frappe ou au prochain retrait du focus
      setStatus(friendlyError(error, 'Impossible d\'enregistrer le texte'));
    } else {
      setStatus('');
    }
  }

  function flushAll() {
    Array.from(dirty).forEach((id) => flushSave(id));
  }

  /* =========================================================
     Chargement et temps réel
     ========================================================= */
  async function load() {
    const client = getClient();
    if (!client || !userId || loading) return;
    loading = true;

    const { data, error } = await client
      .from(TABLE)
      .select('id,parent_id,name,content,created_at')
      .order('created_at', { ascending: true });
    loading = false;

    if (error) {
      console.error('[FX-FUND] Erreur chargement :', error);
      setStatus(friendlyError(error, 'Chargement impossible'));
      loaded = true;
      render();
      return;
    }

    const next = new Map();
    data.forEach((row) => {
      const n = normalize(row);
      const local = nodes.get(n.id);
      if (local && dirty.has(n.id)) n.content = local.content; // ne jamais écraser une frappe non envoyée
      next.set(n.id, n);
    });
    nodes = next;
    loaded = true;
    setStatus('');
    render();
  }

  function onRealtime(payload) {
    if (payload.eventType === 'DELETE') {
      const id = payload.old && payload.old.id;
      if (id && nodes.has(id)) {
        removeLocal(id);
        render();
      }
      return;
    }

    const row = payload.new;
    if (!row || !row.id) return;

    const existing = nodes.get(row.id);
    if (!existing) {
      nodes.set(row.id, normalize(row));
      render();
      return;
    }

    let needsRender = false;
    if (row.name !== undefined && existing.name !== row.name) {
      existing.name = row.name;
      needsRender = true;
    }
    if (row.parent_id !== undefined && existing.parent_id !== (row.parent_id || null)) {
      existing.parent_id = row.parent_id || null;
      needsRender = true;
    }

    // Le texte n'est mis à jour que si je ne suis pas en train de l'écrire.
    // (Supabase peut omettre "content" quand il n'a pas changé : on ignore alors.)
    const protect = dirty.has(row.id) || isEditing(row.id);
    if (!protect && row.content !== undefined && existing.content !== row.content) {
      existing.content = row.content;
      const ta = textareaFor(row.id);
      if (ta) {
        ta.value = row.content;
        autosize(ta);
        syncAddButton(row.id);
      }
    }

    if (needsRender) render();
  }

  function subscribe() {
    const client = getClient();
    if (!client) return;
    unsubscribe();
    channel = client
      .channel('fundamental_nodes_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, onRealtime)
      .subscribe();
  }

  function unsubscribe() {
    const client = getClient();
    if (channel && client) client.removeChannel(channel);
    channel = null;
  }

  function start(uid) {
    if (uid === userId) return;
    userId = uid;
    loaded = false;
    render();
    load().then(subscribe);
  }

  function stop() {
    if (!userId) return;
    userId = null;
    unsubscribe();
    nodes = new Map();
    dirty.clear();
    loaded = false;
    render();
  }

  function isTabActive() {
    const panel = document.getElementById('tab-5');
    return !!(panel && panel.classList.contains('is-active'));
  }

  /* =========================================================
     Init
     ========================================================= */
  function init() {
    els.tree = document.getElementById('fundTree');
    els.status = document.getElementById('fundStatus');
    els.addGroupBtn = document.getElementById('fundAddGroupBtn');
    els.dialog = document.getElementById('fundDialog');
    els.dialogTitle = document.getElementById('fundDialogTitle');
    els.dialogMessage = document.getElementById('fundDialogMessage');
    els.dialogInput = document.getElementById('fundDialogInput');
    els.dialogError = document.getElementById('fundDialogError');
    els.dialogOk = document.getElementById('fundDialogOk');
    els.dialogCancel = document.getElementById('fundDialogCancel');
    els.customToggle = document.getElementById('fundDialogCustomToggle');
    els.custom = document.getElementById('fundDialogCustom');
    els.preview = document.getElementById('fundDialogPreview');
    els.swatches = Array.from(document.querySelectorAll('.fund-dialog-swatch'));
    els.colorReset = document.getElementById('fundDialogColorReset');
    if (!els.tree || !els.dialog) return;

    els.addGroupBtn.addEventListener('click', () => addNode(null));

    els.dialogOk.addEventListener('click', submitDialog);
    els.dialogCancel.addEventListener('click', () => finishDialog(null));
    els.dialog.addEventListener('click', (event) => {
      if (event.target === els.dialog) finishDialog(null);
    });
    els.dialogInput.addEventListener('input', () => {
      els.dialogError.hidden = true;
      refreshColorUI();
    });
    els.customToggle.addEventListener('click', () => setCustomOpen(els.custom.hidden));
    els.swatches.forEach((btn) => btn.addEventListener('click', () => pickGroupColor(btn.dataset.key)));
    els.colorReset.addEventListener('click', () => {
      if (!dialogState || !dialogState.colors) return;
      dialogState.colors = { bg: null, border: null, text: null };
      refreshColorUI();
    });
    // Le thème peut changer ailleurs (autre appareil du même compte, réinitialisation).
    window.addEventListener('fx-theme-changed', () => render());
    document.addEventListener('keydown', (event) => {
      if (!dialogState) return;
      // Le sélecteur de couleur gère lui-même sa fermeture.
      const cp = document.getElementById('cpOverlay');
      if (cp && cp.classList.contains('is-open')) return;
      if (event.key === 'Escape') {
        finishDialog(null);
      } else if (event.key === 'Enter' && event.target === els.dialogInput) {
        event.preventDefault();
        submitDialog();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) flushAll();
      else if (userId && isTabActive()) load();
    });
    window.addEventListener('pagehide', flushAll);
    window.addEventListener('resize', () => {
      els.tree.querySelectorAll('.fund-text').forEach(autosize);
    });

    render();

    if (window.Auth && window.Auth.onAuthStateChange) {
      window.Auth.onAuthStateChange((session) => {
        const uid = session && session.user ? session.user.id : null;
        // setTimeout : on évite d'appeler Supabase directement depuis son propre callback.
        window.setTimeout(() => (uid ? start(uid) : stop()), 0);
      });
    }
    if (window.Auth && window.Auth.getSession) {
      window.Auth.getSession().then((session) => {
        if (session && session.user) start(session.user.id);
      });
    }
  }

  window.Fundamental = {
    // Appelé par app.js à chaque ouverture de l'onglet : données fraîches.
    refresh() {
      if (userId) load();
    },
  };

  document.addEventListener('DOMContentLoaded', init);
})();
