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

// Configure marked
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
    }
  },
  gfm: true,
  breaks: false,
});

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// State
let currentMode = 'rendered'; // 'rendered' or 'raw'
let rawContent = '';

// DOM elements
const emptyState = document.getElementById('empty-state');
const content = document.getElementById('content');
const renderedView = document.getElementById('rendered-view');
const rawView = document.getElementById('raw-view');
const rawCode = document.getElementById('raw-code');
const toggleBtn = document.getElementById('toggle-btn');
const toggleIcon = document.getElementById('toggle-icon');
const toggleLabel = document.getElementById('toggle-label');
const pdfBtn = document.getElementById('pdf-btn');
const titleText = document.getElementById('title-text');

function renderMarkdown(md) {
  rawContent = md;
  renderedView.innerHTML = marked.parse(md);
  rawCode.textContent = md;

  emptyState.style.display = 'none';
  content.classList.remove('hidden');

  updateView();
}

function updateView() {
  if (currentMode === 'rendered') {
    renderedView.classList.add('active');
    rawView.classList.remove('active');
    toggleIcon.textContent = '◉';
    toggleLabel.textContent = 'Rendered';
    toggleBtn.classList.remove('active');
  } else {
    renderedView.classList.remove('active');
    rawView.classList.add('active');
    toggleIcon.textContent = '◎';
    toggleLabel.textContent = 'Raw';
    toggleBtn.classList.add('active');
  }
}

function toggleView() {
  currentMode = currentMode === 'rendered' ? 'raw' : 'rendered';
  updateView();
}

// Event listeners
toggleBtn.addEventListener('click', toggleView);

pdfBtn.addEventListener('click', async () => {
  // Temporarily switch to rendered view for PDF
  const prevMode = currentMode;
  if (currentMode === 'raw') {
    currentMode = 'rendered';
    updateView();
  }
  await window.bettermd.printToPdf();
  // Restore previous mode
  if (prevMode !== currentMode) {
    currentMode = prevMode;
    updateView();
  }
});

// IPC handlers
window.bettermd.onFileLoaded(({ content: md, filePath }) => {
  renderMarkdown(md);
  titleText.textContent = filePath.split('/').pop();
  window.bettermd.watchFile(filePath);
});

window.bettermd.onFileUpdated(({ content: md }) => {
  const scrollPos = document.documentElement.scrollTop || document.body.scrollTop;
  renderMarkdown(md);
  window.scrollTo(0, scrollPos);
});

window.bettermd.onToggleView(() => {
  toggleView();
});

window.bettermd.onSaveAsPdf(async () => {
  const prevMode = currentMode;
  if (currentMode === 'raw') {
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
      // Electron provides the path
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

// Keyboard shortcut for opening (backup in case menu doesn't catch it)
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'r') {
    e.preventDefault();
    toggleView();
  }
});
