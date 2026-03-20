const { marked } = require('marked');
const hljs = require('highlight.js/lib/core');

// Register common languages
hljs.registerLanguage('javascript', require('highlight.js/lib/languages/javascript'));
hljs.registerLanguage('typescript', require('highlight.js/lib/languages/typescript'));
hljs.registerLanguage('python', require('highlight.js/lib/languages/python'));
hljs.registerLanguage('bash', require('highlight.js/lib/languages/bash'));
hljs.registerLanguage('shell', require('highlight.js/lib/languages/shell'));
hljs.registerLanguage('json', require('highlight.js/lib/languages/json'));
hljs.registerLanguage('yaml', require('highlight.js/lib/languages/yaml'));
hljs.registerLanguage('xml', require('highlight.js/lib/languages/xml'));
hljs.registerLanguage('html', require('highlight.js/lib/languages/xml'));
hljs.registerLanguage('css', require('highlight.js/lib/languages/css'));
hljs.registerLanguage('sql', require('highlight.js/lib/languages/sql'));
hljs.registerLanguage('go', require('highlight.js/lib/languages/go'));
hljs.registerLanguage('rust', require('highlight.js/lib/languages/rust'));
hljs.registerLanguage('java', require('highlight.js/lib/languages/java'));
hljs.registerLanguage('c', require('highlight.js/lib/languages/c'));
hljs.registerLanguage('cpp', require('highlight.js/lib/languages/cpp'));
hljs.registerLanguage('ruby', require('highlight.js/lib/languages/ruby'));
hljs.registerLanguage('swift', require('highlight.js/lib/languages/swift'));
hljs.registerLanguage('kotlin', require('highlight.js/lib/languages/kotlin'));
hljs.registerLanguage('markdown', require('highlight.js/lib/languages/markdown'));
hljs.registerLanguage('diff', require('highlight.js/lib/languages/diff'));
hljs.registerLanguage('dockerfile', require('highlight.js/lib/languages/dockerfile'));

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// State
let currentMode = 'rendered'; // 'rendered', 'raw', or 'edit'
let rawContent = '';
let currentDirPath = '';
let hasUnsavedChanges = false;

// DOM elements
const emptyState = document.getElementById('empty-state');
const content = document.getElementById('content');
const renderedView = document.getElementById('rendered-view');
const rawView = document.getElementById('raw-view');
const rawCode = document.getElementById('raw-code');
const editView = document.getElementById('edit-view');
const editor = document.getElementById('editor');
const toggleBtn = document.getElementById('toggle-btn');
const toggleIcon = document.getElementById('toggle-icon');
const toggleLabel = document.getElementById('toggle-label');
const editBtn = document.getElementById('edit-btn');
const editIcon = document.getElementById('edit-icon');
const editLabel = document.getElementById('edit-label');
const pdfBtn = document.getElementById('pdf-btn');
const titleText = document.getElementById('title-text');
const recentsContainer = document.getElementById('recents');
const recentsList = document.getElementById('recents-list');
const backBtn = document.getElementById('back-btn');

// Configure marked with image resolver
function configureMarked() {
  marked.use({
    renderer: {
      code({ text, lang }) {
        let highlighted;
        if (lang && hljs.getLanguage(lang)) {
          try {
            highlighted = hljs.highlight(text, { language: lang }).value;
          } catch {
            highlighted = escapeHtml(text);
          }
        } else {
          try {
            highlighted = hljs.highlightAuto(text).value;
          } catch {
            highlighted = escapeHtml(text);
          }
        }
        return `<pre><code class="hljs${lang ? ` language-${lang}` : ''}">${highlighted}</code></pre>`;
      },
      image({ href, title, text }) {
        const resolvedSrc = resolveImagePath(href);
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        return `<img src="${resolvedSrc}" alt="${escapeHtml(text || '')}"${titleAttr} loading="lazy">`;
      },
    },
    gfm: true,
    breaks: false,
  });
}

function resolveImagePath(src) {
  if (!src) return src;
  // Already absolute URL (http, https, data uri)
  if (/^https?:\/\//i.test(src) || /^data:/i.test(src)) {
    return src;
  }
  // Already a file:// or local-file:// URL
  if (/^(file|local-file):\/\//i.test(src)) {
    return src;
  }
  // Absolute path starting with /
  if (src.startsWith('/')) {
    return 'local-file://' + src;
  }
  // Resolve relative path against the markdown file's directory
  if (currentDirPath) {
    const cleanPath = src.replace(/^\.\//, '');
    return 'local-file://' + currentDirPath + '/' + cleanPath;
  }
  return src;
}

configureMarked();

function renderMarkdown(md) {
  rawContent = md;
  renderedView.innerHTML = marked.parse(md);
  rawCode.textContent = md;

  // Only update editor if not currently editing (avoid clobbering user's in-progress edits)
  if (currentMode !== 'edit') {
    editor.value = md;
  }

  emptyState.style.display = 'none';
  content.classList.remove('hidden');
  backBtn.classList.remove('hidden');

  updateView();
}

function goBack() {
  content.classList.add('hidden');
  backBtn.classList.add('hidden');
  emptyState.style.display = '';
  titleText.textContent = '';
  rawContent = '';
  currentMode = 'rendered';
  hasUnsavedChanges = false;
}

function updateView() {
  renderedView.classList.remove('active');
  rawView.classList.remove('active');
  editView.classList.remove('active');

  if (currentMode === 'rendered') {
    renderedView.classList.add('active');
    toggleIcon.textContent = '◉';
    toggleLabel.textContent = 'Rendered';
    toggleBtn.classList.remove('active');
    editBtn.classList.remove('active');
    editLabel.textContent = 'Edit';
  } else if (currentMode === 'raw') {
    rawView.classList.add('active');
    toggleIcon.textContent = '◎';
    toggleLabel.textContent = 'Raw';
    toggleBtn.classList.add('active');
    editBtn.classList.remove('active');
    editLabel.textContent = 'Edit';
  } else if (currentMode === 'edit') {
    editView.classList.add('active');
    editBtn.classList.add('active');
    editLabel.textContent = 'Editing';
    toggleBtn.classList.remove('active');
    toggleIcon.textContent = '◉';
    toggleLabel.textContent = 'Rendered';
    editor.focus();
  }
}

function toggleView() {
  if (currentMode === 'edit') return; // don't toggle while editing
  currentMode = currentMode === 'rendered' ? 'raw' : 'rendered';
  updateView();
}

function toggleEdit() {
  if (currentMode === 'edit') {
    // Exit edit mode — apply changes and go to rendered
    const newContent = editor.value;
    if (newContent !== rawContent) {
      rawContent = newContent;
      renderedView.innerHTML = marked.parse(newContent);
      rawCode.textContent = newContent;
      hasUnsavedChanges = true;
      updateTitleUnsaved(true);
    }
    currentMode = 'rendered';
  } else {
    // Enter edit mode
    editor.value = rawContent;
    currentMode = 'edit';
  }
  updateView();
}

function updateTitleUnsaved(unsaved) {
  const baseTitle = titleText.textContent.replace(/^● /, '');
  titleText.textContent = unsaved ? '● ' + baseTitle : baseTitle;
}

async function saveFile() {
  if (!hasUnsavedChanges && currentMode !== 'edit') return;

  const contentToSave = currentMode === 'edit' ? editor.value : rawContent;
  const result = await window.bettermd.saveToFile({ content: contentToSave });
  if (result.success) {
    rawContent = contentToSave;
    renderedView.innerHTML = marked.parse(contentToSave);
    rawCode.textContent = contentToSave;
    hasUnsavedChanges = false;
    updateTitleUnsaved(false);
  }
}

// Recents
function renderRecents(recents) {
  if (!recents || recents.length === 0) {
    recentsContainer.classList.add('hidden');
    return;
  }
  recentsList.innerHTML = '';
  for (const item of recents) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.bettermd.openRecent(item.path);
    });

    const nameSpan = document.createElement('span');
    nameSpan.className = 'recent-name';
    nameSpan.textContent = item.name;

    const dirSpan = document.createElement('span');
    dirSpan.className = 'recent-dir';
    // Show shortened path
    const home = item.dir.replace(/^\/Users\/[^/]+/, '~');
    dirSpan.textContent = home;

    a.appendChild(nameSpan);
    a.appendChild(dirSpan);
    li.appendChild(a);
    recentsList.appendChild(li);
  }
  recentsContainer.classList.remove('hidden');
}

window.bettermd.onRecentsUpdated((recents) => {
  renderRecents(recents);
});

// Event listeners
backBtn.addEventListener('click', goBack);
toggleBtn.addEventListener('click', toggleView);
editBtn.addEventListener('click', toggleEdit);

pdfBtn.addEventListener('click', async () => {
  const prevMode = currentMode;
  if (currentMode !== 'rendered') {
    if (currentMode === 'edit') {
      // Apply edits first
      rawContent = editor.value;
      renderedView.innerHTML = marked.parse(rawContent);
      rawCode.textContent = rawContent;
    }
    currentMode = 'rendered';
    updateView();
  }
  await window.bettermd.printToPdf();
  if (prevMode !== currentMode) {
    currentMode = prevMode;
    updateView();
  }
});

// IPC handlers
window.bettermd.onFileLoaded(({ content: md, filePath, dirPath }) => {
  currentDirPath = dirPath || '';
  hasUnsavedChanges = false;
  if (currentMode === 'edit') currentMode = 'rendered';
  renderMarkdown(md);
  titleText.textContent = filePath.split('/').pop();
  window.bettermd.watchFile(filePath);
});

window.bettermd.onFileUpdated(({ content: md, dirPath }) => {
  if (currentMode === 'edit') return; // don't overwrite while editing
  currentDirPath = dirPath || currentDirPath;
  const scrollPos = document.documentElement.scrollTop || document.body.scrollTop;
  renderMarkdown(md);
  window.scrollTo(0, scrollPos);
});

window.bettermd.onToggleView(() => {
  toggleView();
});

window.bettermd.onToggleEdit(() => {
  toggleEdit();
});

window.bettermd.onSaveFile(() => {
  saveFile();
});

window.bettermd.onSaveAsPdf(async () => {
  const prevMode = currentMode;
  if (currentMode !== 'rendered') {
    if (currentMode === 'edit') {
      rawContent = editor.value;
      renderedView.innerHTML = marked.parse(rawContent);
    }
    currentMode = 'rendered';
    updateView();
  }
  await window.bettermd.printToPdf();
  if (prevMode !== currentMode) {
    currentMode = prevMode;
    updateView();
  }
});

// Drag and drop
document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  document.body.classList.add('drag-over');
});

document.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.relatedTarget === null) {
    document.body.classList.remove('drag-over');
  }
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  document.body.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.path) {
      const reader = new FileReader();
      reader.onload = () => {
        renderMarkdown(reader.result);
        titleText.textContent = file.name;
      };
      reader.readAsText(file);
    }
  }
});

// Theme handling
window.bettermd.onThemeChanged((theme) => {
  document.documentElement.removeAttribute('data-theme');
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'r') {
    e.preventDefault();
    toggleView();
  }
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'e') {
    e.preventDefault();
    toggleEdit();
  }
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 's') {
    e.preventDefault();
    saveFile();
  }
});
