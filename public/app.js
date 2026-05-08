const API = '/api/notes';

const COLORS = ['#ffffff', '#fff9c4', '#c8e6c9', '#bbdefb', '#f8bbd9', '#ffe0b2'];

let notes = [];
let activeId = null;

const notesList   = document.getElementById('notesList');
const editor      = document.getElementById('editor');
const emptyState  = document.getElementById('emptyState');
const noteTitle   = document.getElementById('noteTitle');
const noteContent = document.getElementById('noteContent');
const saveStatus  = document.getElementById('saveStatus');
const btnNew      = document.getElementById('btnNew');
const btnSave     = document.getElementById('btnSave');
const btnDelete   = document.getElementById('btnDelete');
const btnPin      = document.getElementById('btnPin');
const searchInput = document.getElementById('searchInput');
const swatchesEl  = document.getElementById('swatches');

// ── Color swatches ──
COLORS.forEach(color => {
  const s = document.createElement('div');
  s.className = 'swatch';
  s.style.background = color;
  s.dataset.color = color;
  s.addEventListener('click', () => selectColor(color));
  swatchesEl.appendChild(s);
});

function selectColor(color) {
  swatchesEl.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.color === color);
  });
  editor.dataset.color = color;
}

// ── API helpers ──
async function api(method, id = '', body = null) {
  const res = await fetch(`${API}${id ? '/' + id : ''}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Render sidebar list ──
function renderList(filter = '') {
  notesList.innerHTML = '';
  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(filter) ||
    n.content.toLowerCase().includes(filter)
  );

  if (!filtered.length) {
    notesList.innerHTML = '<div style="color:#5a5048;font-size:0.8rem;padding:8px 4px">No notes found</div>';
    return;
  }

  filtered.forEach(note => {
    const item = document.createElement('div');
    item.className = 'note-item' + (note._id === activeId ? ' active' : '');
    item.innerHTML = `
      <div class="item-title">
        ${note.pinned ? '<span class="pin-icon">📌</span>' : ''}
        ${escHtml(note.title || 'Untitled')}
      </div>
      <div class="item-date">${formatDate(note.updatedAt)}</div>
    `;
    item.addEventListener('click', () => openNote(note._id));
    notesList.appendChild(item);
  });
}

// ── Open note in editor ──
function openNote(id) {
  activeId = id;
  const note = notes.find(n => n._id === id);
  if (!note) return;

  noteTitle.value = note.title;
  noteContent.value = note.content;
  selectColor(note.color || '#ffffff');
  editor.dataset.color = note.color || '#ffffff';
  btnPin.textContent = note.pinned ? '📌 Pinned' : '📌 Pin';

  emptyState.style.display = 'none';
  editor.style.display = 'flex';
  setStatus('');
  renderList(searchInput.value.toLowerCase());
}

// ── Load all notes ──
async function loadNotes() {
  notes = await api('GET');
  renderList();
}

// ── New note ──
btnNew.addEventListener('click', async () => {
  const note = await api('POST', '', { title: 'Untitled', content: '', color: '#ffffff', pinned: false });
  notes.unshift(note);
  openNote(note._id);
});

// ── Save note ──
btnSave.addEventListener('click', async () => {
  if (!activeId) return;
  const color = editor.dataset.color || '#ffffff';
  const updated = await api('PATCH', activeId, {
    title: noteTitle.value.trim() || 'Untitled',
    content: noteContent.value,
    color,
  });
  const idx = notes.findIndex(n => n._id === activeId);
  if (idx !== -1) notes[idx] = updated;
  renderList(searchInput.value.toLowerCase());
  setStatus('Saved ✓');
});

// ── Pin/unpin ──
btnPin.addEventListener('click', async () => {
  if (!activeId) return;
  const note = notes.find(n => n._id === activeId);
  const updated = await api('PATCH', activeId, { pinned: !note.pinned });
  const idx = notes.findIndex(n => n._id === activeId);
  if (idx !== -1) notes[idx] = updated;
  notes.sort((a, b) => b.pinned - a.pinned || new Date(b.updatedAt) - new Date(a.updatedAt));
  btnPin.textContent = updated.pinned ? '📌 Pinned' : '📌 Pin';
  renderList(searchInput.value.toLowerCase());
});

// ── Delete note ──
btnDelete.addEventListener('click', async () => {
  if (!activeId || !confirm('Delete this note?')) return;
  await api('DELETE', activeId);
  notes = notes.filter(n => n._id !== activeId);
  activeId = null;
  editor.style.display = 'none';
  emptyState.style.display = 'block';
  renderList();
});

// ── Search ──
searchInput.addEventListener('input', () => {
  renderList(searchInput.value.toLowerCase());
});

// ── Helpers ──
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function setStatus(msg) {
  saveStatus.textContent = msg;
  if (msg) setTimeout(() => { if (saveStatus.textContent === msg) saveStatus.textContent = ''; }, 2500);
}

// ── Init ──
loadNotes();
