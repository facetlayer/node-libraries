import { modalJs } from './components/modal.ts';
import { dropdownJs } from './components/dropdown.ts';
import { filterChipJs } from './components/filterChip.ts';
import { skillItemJs } from './components/skillItem.ts';

export function buildHtmlPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Claude Code Skills Editor</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = {
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: '#1a1a2e', light: '#16213e', lighter: '#1e2940', border: '#2a2a4a' },
        accent: { DEFAULT: '#a78bfa', hover: '#8b6fdf' },
      }
    }
  }
}
</script>
<style type="text/tailwindcss">
  @layer base {
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  }
</style>
</head>
<body class="bg-surface text-gray-200 h-screen flex flex-col">

<header class="bg-surface-light px-5 py-3 border-b border-surface-border flex items-center gap-3">
  <h1 class="text-sm font-semibold text-accent">Claude Code Skills Editor</h1>
</header>

<div class="flex flex-1 overflow-hidden">
  <!-- Sidebar -->
  <div class="w-[260px] min-w-[260px] bg-surface-light border-r border-surface-border flex flex-col">
    <div class="px-4 py-3 border-b border-surface-border">
      <input type="text" id="filter-search" placeholder="Search skills..."
        class="w-full bg-[#0f1629] border border-surface-border rounded px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-accent transition-colors mb-2">
      <div class="flex flex-wrap gap-1.5" id="filter-chips"></div>
    </div>
    <div class="flex-1 overflow-y-auto" id="sidebar">
      <div class="p-4 text-gray-500 text-[13px]">Loading skills...</div>
    </div>
  </div>

  <!-- Editor -->
  <div class="flex-1 overflow-y-auto flex flex-col" id="editor">
    <div class="flex-1 flex items-center justify-center text-gray-500">
      Select a skill from the sidebar to edit
    </div>
  </div>
</div>

<!-- Overlay roots -->
<div id="modal-root" class="hidden"></div>
<div id="dropdown-root" class="hidden"></div>

<script>
// --- Utility functions ---
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Components ---
${modalJs()}
${dropdownJs()}
${filterChipJs()}
${skillItemJs()}

// --- App state ---
let skills = [];
let selectedKey = null;
let filters = { search: '', discoverable: false, userInvocable: false };

// --- Init ---
async function loadSkills() {
  try {
    const res = await fetch('/skills');
    skills = await res.json();
    renderFilterChips();
    renderSidebar();
  } catch (err) {
    document.getElementById('sidebar').innerHTML =
      '<div class="p-4 text-red-400 text-[13px]">Failed to load skills</div>';
  }
}

// --- Filters ---
function renderFilterChips() {
  const container = document.getElementById('filter-chips');
  container.innerHTML = FilterChip.render('discoverable', 'Agent-discoverable', filters.discoverable)
    + FilterChip.render('user-invocable', 'User-invocable', filters.userInvocable);

  FilterChip.bind('discoverable', (checked) => {
    filters.discoverable = checked;
    renderFilterChips();
    renderSidebar();
  });
  FilterChip.bind('user-invocable', (checked) => {
    filters.userInvocable = checked;
    renderFilterChips();
    renderSidebar();
  });
}

document.getElementById('filter-search').addEventListener('input', (e) => {
  filters.search = e.target.value.toLowerCase();
  renderSidebar();
});

function filterSkills(list) {
  return list.filter(s => {
    if (filters.search) {
      const q = filters.search;
      const match = (s.name || '').toLowerCase().includes(q)
        || (s.dirName || '').toLowerCase().includes(q)
        || ((s.frontmatter && s.frontmatter.description) || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filters.discoverable) {
      if (s.frontmatter && s.frontmatter['disable-model-invocation']) return false;
    }
    if (filters.userInvocable) {
      if (s.frontmatter && s.frontmatter['user-invocable'] === false) return false;
    }
    return true;
  });
}

// --- Sidebar ---
function skillKey(s) {
  return s.location + '/' + s.dirName;
}

function renderSidebar() {
  const filtered = filterSkills(skills);
  const personal = filtered.filter(s => s.location === 'personal');
  const project = filtered.filter(s => s.location === 'project');
  let html = '';

  if (personal.length > 0) {
    html += '<div class="py-3">'
      + '<h3 class="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8888aa]">Personal Skills</h3>';
    for (const s of personal) {
      html += SkillItem.render(s, skillKey(s) === selectedKey);
    }
    html += '</div>';
  }

  if (project.length > 0) {
    html += '<div class="py-3' + (personal.length > 0 ? ' border-t border-surface-border' : '') + '">'
      + '<h3 class="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8888aa]">Project Skills</h3>';
    for (const s of project) {
      html += SkillItem.render(s, skillKey(s) === selectedKey);
    }
    html += '</div>';
  }

  if (filtered.length === 0) {
    html = '<div class="p-4 text-gray-500 text-[13px]">'
      + (skills.length === 0 ? 'No skills found' : 'No skills match filters') + '</div>';
  }

  document.getElementById('sidebar').innerHTML = html;

  // Bind skill item clicks
  document.querySelectorAll('[data-key]').forEach(el => {
    el.addEventListener('click', (e) => {
      // Don't select if clicking the menu button
      if (e.target.closest('.skill-menu-btn')) return;
      selectedKey = el.dataset.key;
      renderSidebar();
      renderEditor();
    });
  });

  // Bind menu buttons
  document.querySelectorAll('.skill-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.menuKey;
      const skill = skills.find(s => skillKey(s) === key);
      if (!skill) return;
      showSkillMenu(btn, skill);
    });
  });
}

// --- Skill context menu ---
function showSkillMenu(anchorEl, skill) {
  Dropdown.show(anchorEl, [
    {
      label: 'Rename',
      onClick: () => showRenameModal(skill),
    },
  ]);
}

function showRenameModal(skill) {
  const currentName = skill.frontmatter.name || skill.dirName;
  Modal.show({
    title: 'Rename Skill',
    body: '<label class="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Name</label>'
      + '<input type="text" id="rename-input" value="' + escAttr(currentName) + '" '
      + 'class="w-full bg-[#0f1629] border border-surface-border rounded px-2.5 py-1.5 text-sm text-gray-200 outline-none focus:border-accent transition-colors">',
    confirmLabel: 'Rename',
    onConfirm: async () => {
      const newName = document.getElementById('rename-input').value.trim();
      if (!newName || newName === currentName) {
        Modal.hide();
        return;
      }

      const fm = { ...skill.frontmatter, name: newName };
      try {
        const res = await fetch('/skills/' + skill.location + '/' + skill.dirName, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frontmatter: fm, content: skill.content }),
        });
        if (!res.ok) throw new Error('Save failed');

        skill.frontmatter = fm;
        skill.name = newName;
        Modal.hide();
        renderSidebar();
        renderEditor();
      } catch (err) {
        const input = document.getElementById('rename-input');
        if (input) input.style.borderColor = '#f87171';
      }
    },
  });

  // Enter key to confirm
  const input = document.getElementById('rename-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('modal-confirm').click();
      }
    });
    input.select();
  }
}

// --- Editor ---
function getSelected() {
  return skills.find(s => skillKey(s) === selectedKey);
}

function renderEditor() {
  const s = getSelected();
  const editorEl = document.getElementById('editor');

  if (!s) {
    editorEl.innerHTML = '<div class="flex-1 flex items-center justify-center text-gray-500">Select a skill from the sidebar to edit</div>';
    return;
  }

  const fm = s.frontmatter || {};
  const agentDiscoverable = !fm['disable-model-invocation'];
  const userInvocable = fm['user-invocable'] !== false;

  editorEl.innerHTML = ''
    + '<div class="p-6 flex flex-col flex-1">'
    // Name
    + '<div class="mb-4">'
    + '  <label class="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Name</label>'
    + '  <input type="text" id="field-name" value="' + escAttr(fm.name || s.dirName) + '"'
    + '    class="w-full bg-[#0f1629] border border-surface-border rounded-md px-3 py-2 text-sm text-gray-200 outline-none focus:border-accent transition-colors">'
    + '</div>'
    // Description
    + '<div class="mb-4">'
    + '  <label class="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Description</label>'
    + '  <textarea id="field-description" rows="2"'
    + '    class="w-full bg-[#0f1629] border border-surface-border rounded-md px-3 py-2 text-sm text-gray-200 outline-none focus:border-accent transition-colors resize-y">' + esc(fm.description || '') + '</textarea>'
    + '</div>'
    // Checkboxes
    + '<div class="flex gap-6 mb-4">'
    + '  <label class="flex items-center gap-2 cursor-pointer">'
    + '    <input type="checkbox" id="field-discoverable" class="w-4 h-4 accent-accent cursor-pointer"' + (agentDiscoverable ? ' checked' : '') + '>'
    + '    <span class="text-[13px] text-[#c0c0d0]">Agent-discoverable</span>'
    + '  </label>'
    + '  <label class="flex items-center gap-2 cursor-pointer">'
    + '    <input type="checkbox" id="field-user-invocable" class="w-4 h-4 accent-accent cursor-pointer"' + (userInvocable ? ' checked' : '') + '>'
    + '    <span class="text-[13px] text-[#c0c0d0]">User-invocable</span>'
    + '  </label>'
    + '</div>'
    // Content
    + '<div class="flex-1 flex flex-col mb-4">'
    + '  <label class="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Content</label>'
    + '  <textarea id="field-content"'
    + '    class="flex-1 min-h-[300px] w-full bg-[#0f1629] border border-surface-border rounded-md px-3 py-2 text-[13px] leading-relaxed text-gray-200 outline-none focus:border-accent transition-colors resize-y font-mono"'
    + '    style="tab-size:2">' + esc(s.content) + '</textarea>'
    + '</div>'
    // Actions
    + '<div class="flex items-center gap-3">'
    + '  <button id="btn-save" class="px-5 py-2 text-[13px] font-semibold text-white bg-accent hover:bg-accent-hover rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save</button>'
    + '  <span id="save-status" class="text-xs text-gray-500"></span>'
    + '</div>'
    + '</div>';

  document.getElementById('btn-save').addEventListener('click', saveSkill);

  // Tab key in content textarea
  document.getElementById('field-content').addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.target;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
      ta.selectionStart = ta.selectionEnd = start + 2;
    }
  });
}

// --- Save ---
async function saveSkill() {
  const s = getSelected();
  if (!s) return;

  const btn = document.getElementById('btn-save');
  const status = document.getElementById('save-status');
  btn.disabled = true;
  status.textContent = 'Saving...';
  status.className = 'text-xs text-gray-500';

  const fm = { ...s.frontmatter };
  fm.name = document.getElementById('field-name').value;
  fm.description = document.getElementById('field-description').value;

  if (document.getElementById('field-discoverable').checked) {
    delete fm['disable-model-invocation'];
  } else {
    fm['disable-model-invocation'] = true;
  }

  if (document.getElementById('field-user-invocable').checked) {
    delete fm['user-invocable'];
  } else {
    fm['user-invocable'] = false;
  }

  const content = document.getElementById('field-content').value;

  try {
    const res = await fetch('/skills/' + s.location + '/' + s.dirName, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frontmatter: fm, content }),
    });

    if (!res.ok) throw new Error('Save failed');

    s.frontmatter = fm;
    s.content = content;
    s.name = fm.name || s.dirName;

    status.textContent = 'Saved';
    status.className = 'text-xs text-emerald-400';
    renderSidebar();
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
    status.className = 'text-xs text-red-400';
  } finally {
    btn.disabled = false;
    setTimeout(() => { if (status) status.textContent = ''; }, 3000);
  }
}

// --- Boot ---
loadSkills();
</script>
</body>
</html>`;
}
