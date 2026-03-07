export function buildHtmlPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Claude Code Skills Editor</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background: #16213e;
  padding: 12px 20px;
  border-bottom: 1px solid #2a2a4a;
  display: flex;
  align-items: center;
  gap: 12px;
}

header h1 {
  font-size: 16px;
  font-weight: 600;
  color: #a78bfa;
}

.layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 260px;
  min-width: 260px;
  background: #16213e;
  border-right: 1px solid #2a2a4a;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.sidebar-group {
  padding: 12px 0;
}

.sidebar-group + .sidebar-group {
  border-top: 1px solid #2a2a4a;
}

.sidebar-group h3 {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8888aa;
  padding: 0 16px 8px;
}

.skill-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #c0c0d0;
  transition: background 0.1s;
}

.skill-item:hover {
  background: #1f2b47;
}

.skill-item.active {
  background: #2a3a5c;
  color: #fff;
  border-left: 3px solid #a78bfa;
  padding-left: 13px;
}

.skill-item .skill-name {
  font-weight: 500;
}

.skill-item .skill-dir {
  font-size: 11px;
  color: #6b7280;
  margin-top: 2px;
}

/* Editor */
.editor {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.editor.empty {
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.form-group input[type="text"],
.form-group textarea {
  width: 100%;
  background: #0f1629;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  padding: 8px 12px;
  color: #e0e0e0;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.form-group input[type="text"]:focus,
.form-group textarea:focus {
  border-color: #a78bfa;
}

.form-group textarea.description {
  height: 60px;
  resize: vertical;
}

.form-group textarea.content {
  flex: 1;
  min-height: 300px;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  tab-size: 2;
}

.checkbox-row {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #a78bfa;
  cursor: pointer;
}

.checkbox-item span {
  font-size: 13px;
  color: #c0c0d0;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.btn-save {
  background: #a78bfa;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-save:hover {
  background: #8b6fdf;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-status {
  font-size: 12px;
  color: #6b7280;
}

.save-status.success { color: #34d399; }
.save-status.error { color: #f87171; }

.content-group {
  display: flex;
  flex-direction: column;
  flex: 1;
}
</style>
</head>
<body>
<header>
  <h1>Claude Code Skills Editor</h1>
</header>
<div class="layout">
  <div class="sidebar" id="sidebar">
    <div style="padding: 16px; color: #6b7280; font-size: 13px;">Loading skills...</div>
  </div>
  <div class="editor empty" id="editor">
    <div>Select a skill from the sidebar to edit</div>
  </div>
</div>

<script>
let skills = [];
let selectedKey = null;

async function loadSkills() {
  try {
    const res = await fetch('/skills');
    skills = await res.json();
    renderSidebar();
  } catch (err) {
    document.getElementById('sidebar').innerHTML =
      '<div style="padding:16px;color:#f87171;font-size:13px;">Failed to load skills</div>';
  }
}

function skillKey(s) {
  return s.location + '/' + s.dirName;
}

function renderSidebar() {
  const personal = skills.filter(s => s.location === 'personal');
  const project = skills.filter(s => s.location === 'project');
  let html = '';

  if (personal.length > 0) {
    html += '<div class="sidebar-group"><h3>Personal Skills</h3>';
    for (const s of personal) {
      const key = skillKey(s);
      const active = key === selectedKey ? ' active' : '';
      html += '<div class="skill-item' + active + '" data-key="' + key + '">'
        + '<div class="skill-name">' + esc(s.name) + '</div>'
        + '<div class="skill-dir">' + esc(s.dirName) + '</div></div>';
    }
    html += '</div>';
  }

  if (project.length > 0) {
    html += '<div class="sidebar-group"><h3>Project Skills</h3>';
    for (const s of project) {
      const key = skillKey(s);
      const active = key === selectedKey ? ' active' : '';
      html += '<div class="skill-item' + active + '" data-key="' + key + '">'
        + '<div class="skill-name">' + esc(s.name) + '</div>'
        + '<div class="skill-dir">' + esc(s.dirName) + '</div></div>';
    }
    html += '</div>';
  }

  if (skills.length === 0) {
    html = '<div style="padding:16px;color:#6b7280;font-size:13px;">No skills found</div>';
  }

  document.getElementById('sidebar').innerHTML = html;

  // Attach click handlers
  document.querySelectorAll('.skill-item').forEach(el => {
    el.addEventListener('click', () => {
      selectedKey = el.dataset.key;
      renderSidebar();
      renderEditor();
    });
  });
}

function getSelected() {
  return skills.find(s => skillKey(s) === selectedKey);
}

function renderEditor() {
  const s = getSelected();
  if (!s) {
    document.getElementById('editor').className = 'editor empty';
    document.getElementById('editor').innerHTML = '<div>Select a skill from the sidebar to edit</div>';
    return;
  }

  const fm = s.frontmatter || {};
  const agentDiscoverable = !fm['disable-model-invocation'];
  const userInvocable = !!fm['user-invocable'];

  document.getElementById('editor').className = 'editor';
  document.getElementById('editor').innerHTML = ''
    + '<div class="form-group">'
    + '  <label>Name</label>'
    + '  <input type="text" id="field-name" value="' + escAttr(fm.name || s.dirName) + '">'
    + '</div>'
    + '<div class="form-group">'
    + '  <label>Description</label>'
    + '  <textarea class="description" id="field-description">' + esc(fm.description || '') + '</textarea>'
    + '</div>'
    + '<div class="checkbox-row">'
    + '  <label class="checkbox-item">'
    + '    <input type="checkbox" id="field-discoverable"' + (agentDiscoverable ? ' checked' : '') + '>'
    + '    <span>Agent-discoverable</span>'
    + '  </label>'
    + '  <label class="checkbox-item">'
    + '    <input type="checkbox" id="field-user-invocable"' + (userInvocable ? ' checked' : '') + '>'
    + '    <span>User-invocable</span>'
    + '  </label>'
    + '</div>'
    + '<div class="content-group">'
    + '  <div class="form-group" style="flex:1;display:flex;flex-direction:column;">'
    + '    <label>Content</label>'
    + '    <textarea class="content" id="field-content">' + esc(s.content) + '</textarea>'
    + '  </div>'
    + '</div>'
    + '<div class="actions">'
    + '  <button class="btn-save" id="btn-save">Save</button>'
    + '  <span class="save-status" id="save-status"></span>'
    + '</div>';

  document.getElementById('btn-save').addEventListener('click', saveSkill);

  // Handle tab key in content textarea
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

async function saveSkill() {
  const s = getSelected();
  if (!s) return;

  const btn = document.getElementById('btn-save');
  const status = document.getElementById('save-status');
  btn.disabled = true;
  status.textContent = 'Saving...';
  status.className = 'save-status';

  // Build frontmatter from current skill's frontmatter plus edits
  const fm = { ...s.frontmatter };
  fm.name = document.getElementById('field-name').value;
  fm.description = document.getElementById('field-description').value;

  const discoverable = document.getElementById('field-discoverable').checked;
  if (discoverable) {
    delete fm['disable-model-invocation'];
  } else {
    fm['disable-model-invocation'] = true;
  }

  const userInvocable = document.getElementById('field-user-invocable').checked;
  if (userInvocable) {
    fm['user-invocable'] = true;
  } else {
    delete fm['user-invocable'];
  }

  const content = document.getElementById('field-content').value;

  try {
    const res = await fetch('/skills/' + s.location + '/' + s.dirName, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frontmatter: fm, content }),
    });

    if (!res.ok) throw new Error('Save failed');

    // Update local state
    s.frontmatter = fm;
    s.content = content;
    s.name = fm.name || s.dirName;

    status.textContent = 'Saved';
    status.className = 'save-status success';
    renderSidebar();
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
    status.className = 'save-status error';
  } finally {
    btn.disabled = false;
    setTimeout(() => { status.textContent = ''; }, 3000);
  }
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

loadSkills();
</script>
</body>
</html>`;
}
