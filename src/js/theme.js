// ── theme.js — Theme switching & background image ─────────────

const THEMES = [
  { id: 'dark',          label: 'Dark',                 color: '#0d0d0d' },
  { id: 'one-dark',      label: 'One Dark Pro',         color: '#282c34' },
  { id: 'dracula',       label: 'Dracula',              color: '#282a36' },
  { id: 'monokai',       label: 'Monokai',              color: '#272822' },
  { id: 'nord',          label: 'Nord',                 color: '#2e3440' },
  { id: 'light',         label: 'Light',                color: '#f5f5f0' },
  { id: 'andromeda',     label: 'Andromeda',            color: '#23262e' },
  { id: 'tokyo-night',   label: 'Tokyo Night',          color: '#1a1b26' },
  { id: 'catppuccin',    label: 'Catppuccin Mocha',     color: '#1e1e2e' },
  { id: 'gruvbox',       label: 'Gruvbox Dark',         color: '#282828' },
  { id: 'solarized',     label: 'Solarized Dark',       color: '#002b36' },
  { id: 'ayu',           label: 'Ayu Dark',             color: '#0d1017' },
  { id: 'palenight',     label: 'Material Pale Night',  color: '#292d3e' },
  { id: 'cobalt2',       label: 'Cobalt2',              color: '#193549' },
  { id: 'github-dark',   label: 'GitHub Dark',          color: '#0d1117' },
  { id: 'github-light',  label: 'GitHub Light',         color: '#ffffff' },
  { id: 'solarized-light', label: 'Solarized Light',    color: '#fdf6e3' },
  { id: 'vaporwave',     label: 'Vaporwave',            color: '#181326', colors: ['#181326', '#ff71ce', '#01cdfe', '#f9f871'] },
  { id: 'aurora',        label: 'Aurora',               color: '#071b2c', colors: ['#071b2c', '#2dd4bf', '#a3e635', '#f472b6'] },
  { id: 'coral-reef',    label: 'Coral Reef',           color: '#10252c', colors: ['#10252c', '#ff7a59', '#26c6da', '#ffd166'] },
  { id: 'neon-noir',     label: 'Neon Noir',            color: '#080911', colors: ['#080911', '#00f5d4', '#fee440', '#f15bb5'] },
  { id: 'emerald-sky',   label: 'Emerald Sky',          color: '#0b1f26', colors: ['#0b1f26', '#34d399', '#38bdf8', '#fbbf24'] },
  { id: 'ruby-steel',    label: 'Ruby Steel',           color: '#171923', colors: ['#171923', '#fb7185', '#94a3b8', '#facc15'] },
  { id: 'lagoon-pop',    label: 'Lagoon Pop',           color: '#092c36', colors: ['#092c36', '#06b6d4', '#84cc16', '#fb7185'] },
  { id: 'mango-ink',     label: 'Mango Ink',            color: '#15151d', colors: ['#15151d', '#f97316', '#facc15', '#22c55e'] },
  { id: 'prism',         label: 'Prism',                color: '#111827', colors: ['#111827', '#ef4444', '#3b82f6', '#22c55e'] },
  { id: 'sakura-night',  label: 'Sakura Night',         color: '#1f1723', colors: ['#1f1723', '#fb7185', '#c084fc', '#fbbf24'] },
  { id: 'mint-berry',    label: 'Mint Berry',           color: '#10201c', colors: ['#10201c', '#6ee7b7', '#f472b6', '#60a5fa'] },
  { id: 'electric-sunset', label: 'Electric Sunset',    color: '#211420', colors: ['#211420', '#ff6b35', '#ffd166', '#118ab2'] },
  { id: 'plasma',        label: 'Plasma',               color: '#170f2f', colors: ['#170f2f', '#a855f7', '#06b6d4', '#f97316'] },
  { id: 'rainforest',    label: 'Rainforest',           color: '#0f1f18', colors: ['#0f1f18', '#22c55e', '#14b8a6', '#eab308'] },
  { id: 'candy-light',   label: 'Candy Light',          color: '#fff7fb', colors: ['#fff7fb', '#ec4899', '#06b6d4', '#84cc16'] },
  { id: 'paper-sunset',  label: 'Paper Sunset',         color: '#fff8ed', colors: ['#fff8ed', '#f97316', '#db2777', '#0891b2'] },
  { id: 'image',         label: 'Image Theme',          color: '#888888' }
];


var currentTheme = localStorage.getItem('theme') || 'dark';
var bgImageUrl   = localStorage.getItem('bgImage') || null;

function applyTheme(themeId) {
  currentTheme = themeId;
  localStorage.setItem('theme', themeId);

  if (themeId === 'image' && bgImageUrl) {
    document.documentElement.setAttribute('data-theme', 'image');
    document.documentElement.style.setProperty('--bg-image', `url(${bgImageUrl})`);

    // Delay showing the preview until the CSS variable is applied, to avoid flash of unstyled background
    setTimeout(() => {
      const preview = document.getElementById('bgPreview');
      if (preview) {
        preview.src = bgImageUrl;
        preview.classList.add('show');
      }
    }, 50);
  } else {
    // document.documentElement.setAttribute('data-theme', themeId === 'dark' ? '' : themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    document.documentElement.style.removeProperty('--bg-image');
  }

  // Update active state in panel
  document.querySelectorAll('.theme-item').forEach(el => {
    el.classList.toggle('active', el.dataset.themeId === themeId);
  });
}

function toggleThemePanel() {
  document.getElementById('themePanel').classList.toggle('open');
}

// Close panel when clicking outside
document.addEventListener('click', e => {
  const panel = document.getElementById('themePanel');
  const btn   = document.getElementById('themeBtnHeader');
  if (!panel.contains(e.target) && !btn.contains(e.target))
    panel.classList.remove('open');
});

async function pickBgImage() {
  let url = null;

  // Check if running in Tauri environment
  const hasTauri = !!(window.__TAURI__ && window.__TAURI__.core);

  if (hasTauri) {
    // In Tauri: get file path then convert to asset URL
    const filePath = await pickImageDialog();
    if (!filePath) return;
    // Tauri v2: convert file path to an asset URL the webview can load
    url = window.__TAURI__.core.convertFileSrc(filePath);
    console.log("Path after conversion:", url);
  } else {
    // In browser: use file input fallback
    url = await pickImageFallback();
  }

  if (!url) return;

  bgImageUrl = url;
  localStorage.setItem('bgImage', url);

  // Show preview
  const preview = document.getElementById('bgPreview');
  if (preview) {
    preview.src = url;
    preview.classList.add('show');
  }
  
  const imageTheme = document.querySelector('[data-theme-id="image"]');
  if (imageTheme) imageTheme.classList.add('has-image');

  applyTheme('image');
}

function pickImageFallback() {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

function buildThemePanel() {
  const list = document.getElementById('themeList');
  list.innerHTML = '';

  THEMES.forEach(t => {
    const item = document.createElement('div');
    item.className = 'theme-item';
    item.dataset.themeId = t.id;
    const swatch = t.colors ? `linear-gradient(135deg, ${t.colors.join(',')})` : t.color;
    item.innerHTML = `
      <div class="theme-dot" style="background:${swatch};border:1px solid rgba(255,255,255,.15)"></div>
      ${t.label}`;
    item.onclick = () => {
      if (t.id === 'image' && !bgImageUrl) {
        pickBgImage();
        return;
      }
      applyTheme(t.id);
    };
    list.appendChild(item);
  });

  // Show preview if bg image saved
  if (bgImageUrl) {
    const preview = document.getElementById('bgPreview');
    preview.src = bgImageUrl;
    preview.classList.add('show');
    const imageTheme = document.querySelector('[data-theme-id="image"]');
    if (imageTheme) imageTheme.classList.add('has-image');
  }
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  buildThemePanel();

  // restore saved theme (except image theme, which requires async loading)
  const savedBg = localStorage.getItem('bgImage');
  if (savedBg) {
    bgImageUrl = savedBg;
    const preview = document.getElementById('bgPreview');
    if (preview) {
      preview.src = savedBg;
      preview.classList.add('show');
    }
  }

  applyTheme(currentTheme);
});
