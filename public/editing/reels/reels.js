// STATE
const state = {
  video: null,
  videoUrl: null,
  music: null,
  musicUrl: null,
  clips: [], // Array of video clips after splitting
  texts: [],
  stickers: [],
  currentTime: 0,
  duration: 0,
  playing: false,
  speed: 1,
  selectedClipIndex: null,
  filter: 'none',
  filterIntensity: 100, // Filter intensity percentage (0-100)
  adjust: {
    brightness: 0, contrast: 0, saturation: 0, warmth: 0,
    shadows: 0, highlights: 0, whites: 0, blacks: 0,
    clarity: 0, fade: 0, grain: 0, sharpen: 0,
    hue: 0, hslSat: 0, luminance: 0, vignette: 0
  },
  frameMode: 'fit', // fit, fill, stretch
  musicVolume: 0.8,
  videoVolume: 1,
  fadeIn: 0,
  fadeOut: 0
};

// ELEMENTS
const $ = id => document.getElementById(id);
const video = $('previewVideo');
const canvas = $('overlayCanvas');
const ctx = canvas.getContext('2d');
const overlayElements = $('overlayElements');
const emptyState = $('emptyState');
const playBtn = $('playBtn');
const playIcon = $('playIcon');
const pauseIcon = $('pauseIcon');
const timeDisplay = $('timeDisplay');
const playhead = $('playhead');

// UTILS
const formatTime = sec => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// BOTTOM NAVIGATION & TOOL PANELS
const toolPanel = $('toolPanel');
const toolTitle = $('toolTitle');
const toolContent = $('toolContent');
const toolClose = $('toolClose');
let currentTool = null;

document.querySelectorAll('.nav-item').forEach(item => {
  item.onclick = () => {
    const tool = item.dataset.tool;
    
    if (currentTool === tool) {
      // Close if clicking same tool
      closeToolPanel();
    } else {
      openToolPanel(tool);
    }
  };
});

toolClose.onclick = () => {
  closeToolPanel();
};

function openToolPanel(tool) {
  currentTool = tool;
  
  // Update active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tool === tool);
  });
  
  // Set title and content
  const titles = {
    media: 'Media',
    music: 'Music',
    text: 'Text',
    stickers: 'Stickers',
    filters: 'Filters',
    adjust: 'Adjust'
  };
  
  toolTitle.textContent = titles[tool] || 'Tool';
  toolContent.innerHTML = getToolContent(tool);
  toolPanel.classList.remove('hidden');
  
  // Re-attach event listeners
  attachToolListeners(tool);
}

function closeToolPanel() {
  currentTool = null;
  toolPanel.classList.add('hidden');
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
}

function getToolContent(tool) {
  switch(tool) {
    case 'media':
      return `
        <label class="upload-box" onclick="document.getElementById('videoUpload').click()">
          <div class="upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
          </div>
          <div>Import Video</div>
        </label>
        <label class="upload-box" onclick="document.getElementById('photoUpload').click()">
          <div class="upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <div>Import Photo</div>
        </label>
        <div class="media-list" id="mediaList"></div>
      `;
    
    case 'music':
      return `
        <label class="upload-box" onclick="document.getElementById('musicUpload').click()">
          <div class="upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
          </div>
          <div>Import Music</div>
        </label>
        <div class="control-group">
          <label>Music Volume</label>
          <input type="range" id="musicVolume" min="0" max="100" value="80"/>
          <span id="musicVolumeVal">80%</span>
        </div>
        <div class="control-group">
          <label>Original Audio</label>
          <input type="range" id="videoVolume" min="0" max="100" value="100"/>
          <span id="videoVolumeVal">100%</span>
        </div>
        <div class="control-group">
          <label>Fade In (seconds)</label>
          <input type="range" id="fadeIn" min="0" max="3" step="0.5" value="0"/>
          <span id="fadeInVal">0s</span>
        </div>
        <div class="control-group">
          <label>Fade Out (seconds)</label>
          <input type="range" id="fadeOut" min="0" max="3" step="0.5" value="0"/>
          <span id="fadeOutVal">0s</span>
        </div>
      `;
    
    case 'text':
      return `
        <input type="text" id="textInput" placeholder="Enter text..." class="text-input"/>
        
        <!-- Color Combinations -->
        <div class="color-combinations">
          <label style="font-size: 11px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; margin-bottom: 8px; display: block;">Color Combinations</label>
          <div class="color-combo-grid">
            <button class="color-combo" data-text="#ffffff" data-bg="#000000">
              <div class="combo-preview">
                <span style="color: #ffffff; background: #000000;">Aa</span>
              </div>
            </button>
            <button class="color-combo" data-text="#000000" data-bg="#ffffff">
              <div class="combo-preview">
                <span style="color: #000000; background: #ffffff;">Aa</span>
              </div>
            </button>
            <button class="color-combo" data-text="#ffffff" data-bg="#ff0000">
              <div class="combo-preview">
                <span style="color: #ffffff; background: #ff0000;">Aa</span>
              </div>
            </button>
            <button class="color-combo" data-text="#ffffff" data-bg="#0066ff">
              <div class="combo-preview">
                <span style="color: #ffffff; background: #0066ff;">Aa</span>
              </div>
            </button>
            <button class="color-combo" data-text="#000000" data-bg="#ffff00">
              <div class="combo-preview">
                <span style="color: #000000; background: #ffff00;">Aa</span>
              </div>
            </button>
            <button class="color-combo" data-text="#ffffff" data-bg="#ff00ff">
              <div class="combo-preview">
                <span style="color: #ffffff; background: #ff00ff;">Aa</span>
              </div>
            </button>
            <button class="color-combo" data-text="#ffffff" data-bg="#00d4ff">
              <div class="combo-preview">
                <span style="color: #ffffff; background: #00d4ff;">Aa</span>
              </div>
            </button>
            <button class="color-combo" data-text="#ffffff" data-bg="#ff6b00">
              <div class="combo-preview">
                <span style="color: #ffffff; background: #ff6b00;">Aa</span>
              </div>
            </button>
            <button class="color-combo" data-text="#ffffff" data-bg="#9b59b6">
              <div class="combo-preview">
                <span style="color: #ffffff; background: #9b59b6;">Aa</span>
              </div>
            </button>
            <button class="color-combo" data-text="#000000" data-bg="#1abc9c">
              <div class="combo-preview">
                <span style="color: #000000; background: #1abc9c;">Aa</span>
              </div>
            </button>
          </div>
        </div>
        
        <div class="control-group">
          <label>Font Family</label>
          <select id="textFont" class="select">
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Georgia">Georgia</option>
            <option value="Courier New">Courier New</option>
            <option value="Verdana">Verdana</option>
            <option value="Impact">Impact</option>
            <option value="Comic Sans MS">Comic Sans MS</option>
            <option value="Trebuchet MS">Trebuchet MS</option>
            <option value="Arial Black">Arial Black</option>
            <option value="Palatino">Palatino</option>
            <option value="Garamond">Garamond</option>
            <option value="Bookman">Bookman</option>
            <option value="Tahoma">Tahoma</option>
          </select>
        </div>
        <div class="control-group">
          <label>Font Size</label>
          <input type="number" id="textSize" value="48" min="20" max="120"/>
        </div>
        <div class="control-group">
          <label>Font Weight</label>
          <select id="textWeight" class="select">
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
            <option value="lighter">Light</option>
          </select>
        </div>
        <div class="control-group">
          <label>Font Style</label>
          <select id="textStyle" class="select">
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
          </select>
        </div>
        <div class="control-group">
          <label>Color</label>
          <input type="color" id="textColor" value="#ffffff"/>
        </div>
        <div class="control-group">
          <label>Background Color</label>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="checkbox" id="textBgEnabled" style="width: auto;"/>
            <input type="color" id="textBgColor" value="#000000" style="flex: 1;"/>
          </div>
        </div>
        <div class="control-group">
          <label>Text Align</label>
          <select id="textAlign" class="select">
            <option value="left">Left</option>
            <option value="center" selected>Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div class="control-group">
          <label>Vertical Position</label>
          <select id="textVPosition" class="select">
            <option value="top">Top</option>
            <option value="center" selected>Center</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>
        <div class="control-group">
          <label>Animation</label>
          <select id="textAnim" class="select">
            <option value="none">None</option>
            <option value="fade">Fade In</option>
            <option value="slide">Slide Up</option>
            <option value="zoom">Zoom In</option>
            <option value="typewriter">Typewriter</option>
            <option value="bounce">Bounce</option>
            <option value="rotate">Rotate In</option>
          </select>
        </div>
        <button class="btn-secondary" id="previewAnimBtn" style="margin-bottom: 12px;">Preview Animation</button>
        <div class="control-group">
          <label>Start Time (seconds)</label>
          <input type="number" id="textStartTime" value="0" min="0" step="0.1"/>
        </div>
        <div class="control-group">
          <label>Duration (seconds)</label>
          <input type="number" id="textDuration" value="3" min="0.5" step="0.1"/>
        </div>
        <button class="btn-primary" id="addTextBtn">Add Text</button>
      `;
    
    case 'stickers':
      return `
        <label class="upload-box" onclick="document.getElementById('stickerUpload').click()" style="padding: 12px; font-size: 12px;">
          <div>Import PNG/GIF</div>
        </label>
        <div class="sticker-grid">
          <div class="sticker" data-emoji="❤️">❤️</div>
          <div class="sticker" data-emoji="🔥">🔥</div>
          <div class="sticker" data-emoji="⭐">⭐</div>
          <div class="sticker" data-emoji="✨">✨</div>
          <div class="sticker" data-emoji="💯">💯</div>
          <div class="sticker" data-emoji="👍">👍</div>
          <div class="sticker" data-emoji="😍">😍</div>
          <div class="sticker" data-emoji="🎉">🎉</div>
          <div class="sticker" data-emoji="💎">💎</div>
          <div class="sticker" data-emoji="🌟">🌟</div>
          <div class="sticker" data-emoji="🎵">🎵</div>
          <div class="sticker" data-emoji="💫">💫</div>
        </div>
      `;
    
    case 'filters':
      return `
        <div class="filter-grid">
          <div class="filter-item active" data-filter="none">
            <div class="filter-preview">Original</div>
          </div>
          <div class="filter-item" data-filter="warm">
            <div class="filter-preview warm">Warm</div>
          </div>
          <div class="filter-item" data-filter="cool">
            <div class="filter-preview cool">Cool</div>
          </div>
          <div class="filter-item" data-filter="vintage">
            <div class="filter-preview vintage">Vintage</div>
          </div>
          <div class="filter-item" data-filter="bw">
            <div class="filter-preview bw">B&W</div>
          </div>
          <div class="filter-item" data-filter="bright">
            <div class="filter-preview bright">Bright</div>
          </div>
          <div class="filter-item" data-filter="soft">
            <div class="filter-preview soft">Soft</div>
          </div>
          <div class="filter-item" data-filter="dramatic">
            <div class="filter-preview dramatic">Dramatic</div>
          </div>
          <div class="filter-item" data-filter="cinematic">
            <div class="filter-preview cinematic">Cinematic</div>
          </div>
          <div class="filter-item" data-filter="sunset">
            <div class="filter-preview sunset">Sunset</div>
          </div>
          <div class="filter-item" data-filter="arctic">
            <div class="filter-preview arctic">Arctic</div>
          </div>
          <div class="filter-item" data-filter="retro">
            <div class="filter-preview retro">Retro</div>
          </div>
          <div class="filter-item" data-filter="noir">
            <div class="filter-preview noir">Noir</div>
          </div>
          <div class="filter-item" data-filter="vivid">
            <div class="filter-preview vivid">Vivid</div>
          </div>
          <div class="filter-item" data-filter="fade">
            <div class="filter-preview fade">Fade</div>
          </div>
          <div class="filter-item" data-filter="chrome">
            <div class="filter-preview chrome">Chrome</div>
          </div>
          <div class="filter-item" data-filter="dream">
            <div class="filter-preview dream">Dream</div>
          </div>
          <div class="filter-item" data-filter="neon">
            <div class="filter-preview neon">Neon</div>
          </div>
        </div>
        
        <!-- Filter Intensity Adjuster -->
        <div class="filter-intensity-panel" id="filterIntensityPanel">
          <div class="filter-intensity-header">
            <h4 id="filterIntensityTitle">Adjust Filter</h4>
            <button class="filter-intensity-close" id="filterIntensityClose">✕</button>
          </div>
          <div class="filter-intensity-control">
            <label>Intensity</label>
            <input type="range" id="filterIntensitySlider" min="0" max="100" value="100"/>
            <span id="filterIntensityValue">100%</span>
          </div>
        </div>
      `;
    
    case 'adjust':
      return `
        <div class="adjust-controls">
          <div class="adjust-item" data-adjust="frame">
            <div class="adjust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="20" rx="2"></rect>
                <path d="M7 2v20M17 2v20M2 7h20M2 17h20"></path>
              </svg>
            </div>
            <label>Frame</label>
            <span id="frameVal">Fit</span>
          </div>
          <div class="adjust-item" data-adjust="brightness">
            <div class="adjust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            </div>
            <label>Brightness</label>
            <span id="brightnessVal">0</span>
          </div>
          <div class="adjust-item" data-adjust="contrast">
            <div class="adjust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 2v20" stroke-width="0" fill="currentColor"></path>
                <path d="M12 2 A 10 10 0 0 1 12 22 Z" fill="currentColor"></path>
              </svg>
            </div>
            <label>Contrast</label>
            <span id="contrastVal">0</span>
          </div>
          <div class="adjust-item" data-adjust="saturation">
            <div class="adjust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
              </svg>
            </div>
            <label>Saturation</label>
            <span id="saturationVal">0</span>
          </div>
          <div class="adjust-item" data-adjust="warmth">
            <div class="adjust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
              </svg>
            </div>
            <label>Warmth</label>
            <span id="warmthVal">0</span>
          </div>
          <div class="adjust-item" data-adjust="shadows">
            <div class="adjust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </div>
            <label>Shadows</label>
            <span id="shadowsVal">0</span>
          </div>
          <div class="adjust-item" data-adjust="highlights">
            <div class="adjust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <label>Highlights</label>
            <span id="highlightsVal">0</span>
          </div>
          <div class="adjust-item" data-adjust="clarity">
            <div class="adjust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <label>Clarity</label>
            <span id="clarityVal">0%</span>
          </div>
          <div class="adjust-item" data-adjust="sharpen">
            <div class="adjust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <label>Sharpen</label>
            <span id="sharpenVal">0</span>
          </div>
          <div class="adjust-item" data-adjust="hue">
            <div class="adjust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
            </div>
            <label>Hue</label>
            <span id="hueVal">0</span>
          </div>
          <div class="adjust-item" data-adjust="vignette">
            <div class="adjust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6" opacity="0.3" fill="currentColor"></circle>
              </svg>
            </div>
            <label>Vignette</label>
            <span id="vignetteVal">0</span>
          </div>
        </div>
        <button class="btn-secondary" id="resetAdjust" style="margin-top: 16px;">Reset All</button>
        
        <!-- Frame Adjustment Panel -->
        <div class="frame-adjust-panel" id="frameAdjustPanel">
          <div class="frame-adjust-header">
            <h4>Frame Adjustment</h4>
            <button class="frame-adjust-close" id="frameAdjustClose">✕</button>
          </div>
          <div class="frame-options">
            <button class="frame-option active" data-frame="fit">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <rect x="7" y="7" width="10" height="10" rx="1"></rect>
              </svg>
              <span>Fit</span>
            </button>
            <button class="frame-option" data-frame="fill">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor" opacity="0.3"></rect>
              </svg>
              <span>Fill</span>
            </button>
            <button class="frame-option" data-frame="stretch">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <path d="M8 12h8M12 8v8"></path>
              </svg>
              <span>Stretch</span>
            </button>
          </div>
        </div>
        
        <!-- Circular Dial Adjuster -->
        <div class="circular-dial-panel" id="circularDialPanel">
          <div class="circular-dial-header">
            <h4 id="circularDialTitle">Brightness</h4>
            <button class="circular-dial-close" id="circularDialClose">✕</button>
          </div>
          <div class="circular-dial-container">
            <div class="circular-dial" id="circularDial">
              <svg class="dial-track" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="80" fill="none" stroke="#333" stroke-width="8"></circle>
                <circle id="dialProgress" cx="100" cy="100" r="80" fill="none" stroke="var(--accent)" stroke-width="8" 
                  stroke-dasharray="502.65" stroke-dashoffset="251.33" stroke-linecap="round"
                  transform="rotate(-90 100 100)"></circle>
              </svg>
              <div class="dial-center">
                <div class="dial-value" id="dialValue">0</div>
                <div class="dial-label" id="dialLabel">Brightness</div>
              </div>
              <div class="dial-knob" id="dialKnob"></div>
            </div>
            <div class="dial-instructions">Drag to adjust</div>
          </div>
        </div>
      `;
    
    default:
      return '<p>Tool content</p>';
  }
}

function attachToolListeners(tool) {
  switch(tool) {
    case 'music':
      $('musicVolume').oninput = e => {
        state.musicVolume = e.target.value / 100;
        $('musicVolumeVal').textContent = e.target.value + '%';
        if (state.music) state.music.volume = state.musicVolume;
      };
      $('videoVolume').oninput = e => {
        state.videoVolume = e.target.value / 100;
        $('videoVolumeVal').textContent = e.target.value + '%';
        video.volume = state.videoVolume;
      };
      $('fadeIn').oninput = e => {
        state.fadeIn = parseFloat(e.target.value);
        $('fadeInVal').textContent = e.target.value + 's';
      };
      $('fadeOut').oninput = e => {
        state.fadeOut = parseFloat(e.target.value);
        $('fadeOutVal').textContent = e.target.value + 's';
      };
      break;
    
    case 'text':
      // Color combination buttons
      document.querySelectorAll('.color-combo').forEach(btn => {
        btn.onclick = () => {
          const textColor = btn.dataset.text;
          const bgColor = btn.dataset.bg;
          
          const textColorInput = $('textColor');
          const textBgColorInput = $('textBgColor');
          const textBgEnabled = $('textBgEnabled');
          
          if (textColorInput) textColorInput.value = textColor;
          if (textBgColorInput) textBgColorInput.value = bgColor;
          if (textBgEnabled) textBgEnabled.checked = true;
          
          // If editing existing text, update it
          if (selectedTextIndex !== null) {
            const text = state.texts[selectedTextIndex];
            text.color = textColor;
            text.bgColor = bgColor;
            text.bgEnabled = true;
            renderOverlays();
          }
        };
      });
      
      $('addTextBtn').onclick = () => {
        const content = $('textInput').value.trim();
        if (!content) return;
        
        const totalDuration = state.clips.reduce((sum, clip) => sum + clip.duration, 0);
        const startTime = parseFloat($('textStartTime').value) || 0;
        const duration = parseFloat($('textDuration').value) || 3;
        
        const text = {
          id: Date.now(),
          content,
          font: $('textFont').value || 'Arial',
          size: parseInt($('textSize').value),
          weight: $('textWeight').value || 'normal',
          style: $('textStyle').value || 'normal',
          color: $('textColor').value,
          bgEnabled: $('textBgEnabled').checked,
          bgColor: $('textBgColor').value,
          align: $('textAlign').value,
          vPosition: $('textVPosition').value,
          anim: $('textAnim').value,
          startTime: Math.min(startTime, totalDuration),
          duration: duration,
          endTime: Math.min(startTime + duration, totalDuration),
          x: 180,
          y: 320
        };
        
        // Calculate position based on alignment
        if (text.vPosition === 'top') text.y = 100;
        else if (text.vPosition === 'bottom') text.y = 540;
        else text.y = 320;
        
        state.texts.push(text);
        $('textInput').value = '';
        renderOverlays();
        renderTextLayerTimeline();
      };
      
      // Preview animation button
      setTimeout(() => {
        const previewBtn = $('previewAnimBtn');
        if (previewBtn) {
          previewBtn.onclick = () => {
            if (selectedTextIndex !== null) {
              previewTextAnimation(selectedTextIndex);
            } else {
              alert('Please select a text to preview animation');
            }
          };
        }
      }, 100);
      break;
    
    case 'stickers':
      document.querySelectorAll('.sticker').forEach(el => {
        el.onclick = () => {
          const sticker = { type: 'emoji', content: el.dataset.emoji, x: 180, y: 320, scale: 1 };
          state.stickers.push(sticker);
          renderOverlays();
        };
      });
      break;
    
    case 'filters':
      document.querySelectorAll('.filter-item').forEach(el => {
        el.onclick = () => {
          document.querySelectorAll('.filter-item').forEach(f => f.classList.remove('active'));
          el.classList.add('active');
          state.filter = el.dataset.filter;
          applyFilter();
          
          // Show intensity adjuster if not "none" filter
          if (state.filter !== 'none') {
            openFilterIntensityPanel();
          } else {
            closeFilterIntensityPanel();
          }
        };
      });
      
      function openFilterIntensityPanel() {
        const panel = $('filterIntensityPanel');
        const slider = $('filterIntensitySlider');
        const valueSpan = $('filterIntensityValue');
        const title = $('filterIntensityTitle');
        
        if (!panel) return;
        
        // Set title with filter name
        const filterName = state.filter.charAt(0).toUpperCase() + state.filter.slice(1);
        title.textContent = `Adjust ${filterName}`;
        
        // Set slider value
        slider.value = state.filterIntensity;
        valueSpan.textContent = state.filterIntensity + '%';
        
        // Show panel
        panel.classList.add('active');
        
        // Slider input handler
        slider.oninput = () => {
          state.filterIntensity = parseInt(slider.value);
          valueSpan.textContent = slider.value + '%';
          applyFilter();
        };
      }
      
      function closeFilterIntensityPanel() {
        const panel = $('filterIntensityPanel');
        if (panel) {
          panel.classList.remove('active');
        }
      }
      
      // Close button
      const closeBtn = $('filterIntensityClose');
      if (closeBtn) {
        closeBtn.onclick = () => {
          closeFilterIntensityPanel();
        };
      }
      
      // If a filter is already selected, show the panel
      if (state.filter !== 'none') {
        setTimeout(() => openFilterIntensityPanel(), 100);
      }
      break;
    
    case 'adjust':
      let currentAdjustParam = null;
      
      document.querySelectorAll('.adjust-item').forEach(item => {
        item.onclick = () => {
          const adjustType = item.dataset.adjust;
          if (adjustType === 'frame') {
            openFrameAdjust();
          } else {
            openCircularDial(adjustType);
          }
        };
      });
      
      function openFrameAdjust() {
        const panel = $('frameAdjustPanel');
        panel.classList.add('active');
        
        // Set active state
        document.querySelectorAll('.adjust-item').forEach(item => {
          item.classList.toggle('active', item.dataset.adjust === 'frame');
        });
        
        // Frame option buttons
        document.querySelectorAll('.frame-option').forEach(btn => {
          btn.onclick = () => {
            const frameMode = btn.dataset.frame;
            state.frameMode = frameMode;
            
            // Update active state
            document.querySelectorAll('.frame-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update display
            const frameVal = $('frameVal');
            if (frameVal) {
              frameVal.textContent = frameMode.charAt(0).toUpperCase() + frameMode.slice(1);
            }
            
            // Apply frame mode
            applyFrameMode();
          };
        });
        
        // Close button
        const frameCloseBtn = $('frameAdjustClose');
        if (frameCloseBtn) {
          frameCloseBtn.onclick = () => {
            panel.classList.remove('active');
            document.querySelectorAll('.adjust-item').forEach(item => {
              item.classList.remove('active');
            });
          };
        }
      }
      
      function openCircularDial(type) {
        currentAdjustParam = type;
        const panel = $('circularDialPanel');
        const title = $('circularDialTitle');
        const dialLabel = $('dialLabel');
        const dialValue = $('dialValue');
        const dialProgress = $('dialProgress');
        const dialKnob = $('dialKnob');
        
        // Set active state
        document.querySelectorAll('.adjust-item').forEach(item => {
          item.classList.toggle('active', item.dataset.adjust === type);
        });
        
        // Configure dial based on type
        const configs = {
          brightness: { min: -100, max: 100, label: 'Brightness' },
          contrast: { min: -100, max: 100, label: 'Contrast' },
          saturation: { min: -100, max: 100, label: 'Saturation' },
          warmth: { min: -100, max: 100, label: 'Warmth' },
          shadows: { min: -100, max: 100, label: 'Shadows' },
          highlights: { min: -100, max: 100, label: 'Highlights' },
          clarity: { min: 0, max: 100, label: 'Clarity' },
          sharpen: { min: 0, max: 100, label: 'Sharpen' },
          hue: { min: -180, max: 180, label: 'Hue' },
          vignette: { min: 0, max: 100, label: 'Vignette' }
        };
        
        const config = configs[type];
        const currentValue = state.adjust[type] || 0;
        
        title.textContent = config.label;
        dialLabel.textContent = config.label;
        
        const suffix = ['clarity'].includes(type) ? '%' : '';
        dialValue.textContent = currentValue + suffix;
        
        // Update value display in adjust item
        const valueDisplay = $(type + 'Val');
        if (valueDisplay) {
          valueDisplay.textContent = currentValue + suffix;
        }
        
        // Calculate angle and update dial
        updateDialVisuals(currentValue, config.min, config.max);
        
        panel.classList.add('active');
        
        // Dial interaction
        let isDragging = false;
        const dial = $('circularDial');
        const dialRect = dial.getBoundingClientRect();
        const centerX = dialRect.width / 2;
        const centerY = dialRect.height / 2;
        
        function handleDialMove(clientX, clientY) {
          const rect = dial.getBoundingClientRect();
          const x = clientX - rect.left - centerX;
          const y = clientY - rect.top - centerY;
          
          let angle = Math.atan2(y, x) * (180 / Math.PI);
          angle = (angle + 90 + 360) % 360;
          
          // Map angle to value range (270 degrees of rotation)
          const minAngle = 45;
          const maxAngle = 315;
          
          if (angle < minAngle) angle = minAngle;
          if (angle > maxAngle) angle = maxAngle;
          
          const normalizedAngle = (angle - minAngle) / (maxAngle - minAngle);
          const newValue = Math.round(config.min + normalizedAngle * (config.max - config.min));
          
          state.adjust[type] = newValue;
          dialValue.textContent = newValue + suffix;
          
          if (valueDisplay) {
            valueDisplay.textContent = newValue + suffix;
          }
          
          updateDialVisuals(newValue, config.min, config.max);
          applyAdjustments();
        }
        
        function updateDialVisuals(value, min, max) {
          const normalized = (value - min) / (max - min);
          const angle = 45 + normalized * 270;
          
          // Update progress circle
          const circumference = 2 * Math.PI * 80;
          const progress = normalized * 0.75; // 75% of circle (270 degrees)
          const offset = circumference - (progress * circumference);
          dialProgress.style.strokeDashoffset = offset;
          
          // Update knob position
          const knobAngle = (angle - 90) * (Math.PI / 180);
          const knobX = 100 + 80 * Math.cos(knobAngle);
          const knobY = 100 + 80 * Math.sin(knobAngle);
          dialKnob.style.left = knobX + 'px';
          dialKnob.style.top = knobY + 'px';
        }
        
        dial.onmousedown = (e) => {
          isDragging = true;
          handleDialMove(e.clientX, e.clientY);
        };
        
        document.onmousemove = (e) => {
          if (isDragging) {
            handleDialMove(e.clientX, e.clientY);
          }
        };
        
        document.onmouseup = () => {
          isDragging = false;
        };
        
        // Touch support
        dial.ontouchstart = (e) => {
          isDragging = true;
          const touch = e.touches[0];
          handleDialMove(touch.clientX, touch.clientY);
          e.preventDefault();
        };
        
        document.ontouchmove = (e) => {
          if (isDragging) {
            const touch = e.touches[0];
            handleDialMove(touch.clientX, touch.clientY);
            e.preventDefault();
          }
        };
        
        document.ontouchend = () => {
          isDragging = false;
        };
      }
      
      // Close dial panel
      const dialCloseBtn = $('circularDialClose');
      if (dialCloseBtn) {
        dialCloseBtn.onclick = () => {
          $('circularDialPanel').classList.remove('active');
          document.querySelectorAll('.adjust-item').forEach(item => {
            item.classList.remove('active');
          });
        };
      }
      
      $('resetAdjust').onclick = () => {
        const adjustIds = ['brightness', 'contrast', 'saturation', 'warmth', 'shadows', 'highlights', 'clarity', 'sharpen', 'hue', 'vignette'];
        adjustIds.forEach(id => {
          state.adjust[id] = 0;
          const val = $(id + 'Val');
          if (val) {
            val.textContent = ['clarity'].includes(id) ? '0%' : '0';
          }
        });
        state.frameMode = 'fit';
        const frameVal = $('frameVal');
        if (frameVal) frameVal.textContent = 'Fit';
        applyAdjustments();
        applyFrameMode();
        $('circularDialPanel').classList.remove('active');
        $('frameAdjustPanel').classList.remove('active');
        document.querySelectorAll('.adjust-item').forEach(item => {
          item.classList.remove('active');
        });
      };
      break;
  }
}

// VIDEO UPLOAD
$('videoUpload').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
  state.videoUrl = URL.createObjectURL(file);
  
  video.src = state.videoUrl;
  video.load();
  
  video.onloadedmetadata = () => {
    state.duration = video.duration;
    
    // Create initial clip
    state.clips = [{
      id: Date.now(),
      start: 0,
      end: video.duration,
      trimStart: 0,
      trimEnd: video.duration,
      duration: video.duration
    }];
    
    state.selectedClipIndex = 0;
    emptyState.style.display = 'none';
    canvas.width = 360;
    canvas.height = 640;
    video.currentTime = 0;
    state.currentTime = 0;
    
    // Apply initial frame mode
    applyFrameMode();
    
    // Wait a bit then render timeline
    setTimeout(() => {
      renderTimelineClips();
      updateTimeline();
      renderTextLayerTimeline();
    }, 100);
  };
  
  video.onerror = () => {
    alert('Error loading video. Please try another file.');
  };
  
  // Sync playhead when video time changes manually (e.g., user scrubbing)
  video.ontimeupdate = () => {
    if (state.playing) return; // Don't interfere during playback
    syncPlayheadToVideoTime();
  };
};

// APPLY FRAME MODE (Fit, Fill, Stretch)
function applyFrameMode() {
  if (!video.src) return;
  
  switch(state.frameMode) {
    case 'fit':
      video.style.objectFit = 'contain';
      video.style.width = '100%';
      video.style.height = '100%';
      break;
    case 'fill':
      video.style.objectFit = 'cover';
      video.style.width = '100%';
      video.style.height = '100%';
      break;
    case 'stretch':
      video.style.objectFit = 'fill';
      video.style.width = '100%';
      video.style.height = '100%';
      break;
  }
}

// PHOTO UPLOAD
$('photoUpload').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  img.onload = () => {
    const sticker = {
      type: 'image',
      url,
      x: 180,
      y: 320,
      scale: 1,
      rotation: 0
    };
    state.stickers.push(sticker);
    renderOverlays();
  };
};

// MUSIC UPLOAD
$('musicUpload').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  
  if (state.musicUrl) URL.revokeObjectURL(state.musicUrl);
  state.musicUrl = URL.createObjectURL(file);
  
  state.music = new Audio(state.musicUrl);
  state.music.volume = state.musicVolume;
  state.music.loop = true;
};



window.removeText = idx => {
  state.texts.splice(idx, 1);
  renderOverlays();
  renderTextLayerTimeline();
};



$('stickerUpload').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  img.onload = () => {
    const sticker = {
      type: 'image',
      url,
      x: 180,
      y: 320,
      scale: 0.5,
      rotation: 0
    };
    state.stickers.push(sticker);
    renderOverlays();
  };
};



function applyFilter() {
  let filter = '';
  const intensity = state.filterIntensity / 100; // Convert to 0-1 range
  
  switch (state.filter) {
    case 'warm': 
      filter = `sepia(${0.3 * intensity}) saturate(${1 + 0.2 * intensity}) brightness(${1 + 0.05 * intensity})`; 
      break;
    case 'cool': 
      filter = `hue-rotate(${180 * intensity}deg) saturate(${1 + 0.1 * intensity}) brightness(${1 - 0.05 * intensity})`; 
      break;
    case 'vintage': 
      filter = `sepia(${0.5 * intensity}) contrast(${1 + 0.2 * intensity}) brightness(${1 - 0.1 * intensity})`; 
      break;
    case 'bw': 
      filter = `grayscale(${intensity}) contrast(${1 + 0.1 * intensity})`; 
      break;
    case 'bright': 
      filter = `brightness(${1 + 0.3 * intensity}) saturate(${1 + 0.1 * intensity})`; 
      break;
    case 'soft': 
      filter = `contrast(${1 - 0.2 * intensity}) brightness(${1 + 0.1 * intensity}) saturate(${1 - 0.1 * intensity})`; 
      break;
    case 'dramatic': 
      filter = `contrast(${1 + 0.5 * intensity}) brightness(${1 - 0.1 * intensity}) saturate(${1 + 0.3 * intensity})`; 
      break;
    case 'cinematic': 
      filter = `contrast(${1 + 0.2 * intensity}) brightness(${1 - 0.15 * intensity}) saturate(${1 + 0.1 * intensity}) sepia(${0.1 * intensity})`; 
      break;
    case 'sunset': 
      filter = `sepia(${0.4 * intensity}) saturate(${1 + 0.4 * intensity}) hue-rotate(${-10 * intensity}deg) brightness(${1 + 0.1 * intensity})`; 
      break;
    case 'arctic': 
      filter = `hue-rotate(${180 * intensity}deg) saturate(${1 - 0.2 * intensity}) brightness(${1 + 0.2 * intensity}) contrast(${1 + 0.1 * intensity})`; 
      break;
    case 'retro': 
      filter = `sepia(${0.6 * intensity}) contrast(${1 + 0.3 * intensity}) saturate(${1 - 0.2 * intensity}) brightness(${1 - 0.05 * intensity})`; 
      break;
    case 'noir': 
      filter = `grayscale(${intensity}) contrast(${1 + 0.5 * intensity}) brightness(${1 - 0.2 * intensity})`; 
      break;
    case 'vivid': 
      filter = `saturate(${1 + intensity}) contrast(${1 + 0.2 * intensity}) brightness(${1 + 0.05 * intensity})`; 
      break;
    case 'fade': 
      filter = `contrast(${1 - 0.3 * intensity}) brightness(${1 + 0.15 * intensity}) saturate(${1 - 0.3 * intensity}) opacity(${1 - 0.1 * intensity})`; 
      break;
    case 'chrome': 
      filter = `contrast(${1 + 0.4 * intensity}) saturate(${1 - 0.5 * intensity}) brightness(${1 + 0.1 * intensity})`; 
      break;
    case 'dream': 
      filter = `contrast(${1 - 0.1 * intensity}) brightness(${1 + 0.2 * intensity}) saturate(${1 + 0.3 * intensity}) blur(${0.5 * intensity}px)`; 
      break;
    case 'neon': 
      filter = `saturate(${1 + 1.5 * intensity}) contrast(${1 + 0.3 * intensity}) brightness(${1 + 0.1 * intensity}) hue-rotate(${10 * intensity}deg)`; 
      break;
    default: 
      filter = 'none';
  }
  video.style.filter = filter;
}

// ADJUST CONTROLS (Moved to attachToolListeners)

function applyAdjustments() {
  const a = state.adjust;
  let filter = '';
  
  if (a.brightness !== 0) filter += `brightness(${1 + a.brightness / 100}) `;
  if (a.contrast !== 0) filter += `contrast(${1 + a.contrast / 100}) `;
  if (a.saturation !== 0) filter += `saturate(${1 + a.saturation / 100}) `;
  if (a.hue !== 0) filter += `hue-rotate(${a.hue}deg) `;
  if (a.warmth !== 0) filter += `sepia(${Math.abs(a.warmth) / 200}) `;
  
  video.style.filter = filter || 'none';
}

// PLAYBACK
playBtn.onclick = () => {
  if (!video.src) {
    alert('Please import a video first!');
    return;
  }
  
  if (state.playing) {
    pause();
  } else {
    play();
  }
};

function play() {
  if (!video.src) return;
  
  // Find which clip we're in
  let targetClip = null;
  let accumulatedTime = 0;
  
  for (let clip of state.clips) {
    if (state.currentTime >= accumulatedTime && state.currentTime < accumulatedTime + clip.duration) {
      targetClip = clip;
      break;
    }
    accumulatedTime += clip.duration;
  }
  
  if (!targetClip) {
    targetClip = state.clips[0];
    state.currentTime = 0;
  }
  
  // Set video to correct position in original video
  const relativeTime = state.currentTime - accumulatedTime;
  video.currentTime = targetClip.trimStart + relativeTime;
  
  state.playing = true;
  $('playIcon').style.display = 'none';
  $('pauseIcon').style.display = 'block';
  
  // Play video
  video.play().catch(err => {
    console.error('Play error:', err);
    pause();
  });
  
  // Sync music
  if (state.music) {
    state.music.currentTime = state.currentTime;
    state.music.play().catch(err => console.error('Music play error:', err));
  }
  
  requestAnimationFrame(updatePlayback);
}

function pause() {
  state.playing = false;
  $('playIcon').style.display = 'block';
  $('pauseIcon').style.display = 'none';
  video.pause();
  if (state.music) state.music.pause();
}

function updatePlayback() {
  if (!state.playing) return;
  
  // Find current clip
  let currentClipIndex = -1;
  let accumulatedTime = 0;
  
  for (let i = 0; i < state.clips.length; i++) {
    const clip = state.clips[i];
    if (state.currentTime >= accumulatedTime && state.currentTime < accumulatedTime + clip.duration) {
      currentClipIndex = i;
      break;
    }
    accumulatedTime += clip.duration;
  }
  
  if (currentClipIndex === -1) {
    // Reached end of all clips
    state.currentTime = 0;
    video.currentTime = state.clips[0].trimStart;
    pause();
    return;
  }
  
  const currentClip = state.clips[currentClipIndex];
  const relativeTime = state.currentTime - accumulatedTime;
  const videoTime = currentClip.trimStart + relativeTime;
  
  // Check if we've reached end of current clip
  if (videoTime >= currentClip.trimEnd) {
    // Move to next clip
    if (currentClipIndex < state.clips.length - 1) {
      state.currentTime = accumulatedTime + currentClip.duration;
      const nextClip = state.clips[currentClipIndex + 1];
      video.currentTime = nextClip.trimStart;
    } else {
      // End of timeline
      state.currentTime = 0;
      video.currentTime = state.clips[0].trimStart;
      pause();
      return;
    }
  } else {
    state.currentTime += (video.currentTime - videoTime);
  }
  
  const totalDuration = state.clips.reduce((sum, clip) => sum + clip.duration, 0);
  timeDisplay.textContent = `${formatTime(state.currentTime)} / ${formatTime(totalDuration)}`;
  
  // Update playhead position
  const pixelsPerSecond = 100;
  const playheadPos = state.currentTime * pixelsPerSecond;
  playhead.style.left = playheadPos + 'px';
  
  renderOverlays();
  requestAnimationFrame(updatePlayback);
}

// SPEED
$('speedSelect').onchange = e => {
  state.speed = parseFloat(e.target.value);
  video.playbackRate = state.speed;
};

// TRIM & CUT
$('trimBtn').onclick = () => {
  if (!video.src || state.selectedClipIndex === null) {
    alert('Please select a clip first!');
    return;
  }
  
  const clip = state.clips[state.selectedClipIndex];
  const videoTime = video.currentTime;
  
  // Check if video time is within selected clip's trim range
  if (videoTime <= clip.trimStart || videoTime >= clip.trimEnd) {
    alert('Move the playhead inside the clip to split!');
    return;
  }
  
  // Split the clip at current video position
  const clip1 = {
    id: Date.now(),
    start: 0,
    end: 0,
    trimStart: clip.trimStart,
    trimEnd: videoTime,
    duration: videoTime - clip.trimStart
  };
  
  const clip2 = {
    id: Date.now() + 1,
    start: 0,
    end: 0,
    trimStart: videoTime,
    trimEnd: clip.trimEnd,
    duration: clip.trimEnd - videoTime
  };
  
  // Replace original clip with two new clips
  state.clips.splice(state.selectedClipIndex, 1, clip1, clip2);
  
  // Recalculate all clip positions
  recalculateClipPositions();
  
  state.selectedClipIndex = state.selectedClipIndex; // Keep first part selected
  
  pause();
  renderTimelineClips();
  renderTextLayerTimeline();
  updateTimeline();
  
  alert('Clip split successfully!');
};

$('cutBtn').onclick = () => {
  if (!video.src || state.selectedClipIndex === null) {
    alert('Please select a clip first!');
    return;
  }
  
  const clip = state.clips[state.selectedClipIndex];
  const videoTime = video.currentTime;
  
  // Check if video time is within selected clip's trim range
  if (videoTime <= clip.trimStart || videoTime >= clip.trimEnd) {
    alert('Move the playhead inside the clip to cut!');
    return;
  }
  
  // Cut from current position to end of clip (delete everything after current position)
  clip.trimEnd = videoTime;
  clip.duration = clip.trimEnd - clip.trimStart;
  
  // Recalculate all clip positions
  recalculateClipPositions();
  recalculateDuration();
  
  pause();
  renderTimelineClips();
  renderTextLayerTimeline();
  updateTimeline();
  
  alert('Cut successful! Everything after this position was removed.');
};

function recalculateDuration() {
  state.duration = state.clips.reduce((total, clip) => total + clip.duration, 0);
}

function recalculateClipPositions() {
  let currentX = 0;
  for (let i = 0; i < state.clips.length; i++) {
    state.clips[i].start = currentX;
    state.clips[i].end = currentX + state.clips[i].duration;
    currentX += state.clips[i].duration;
  }
}

function updateTimeline() {
  const trimmedDuration = state.clips.reduce((total, clip) => total + clip.duration, 0);
  timeDisplay.textContent = `${formatTime(state.currentTime)} / ${formatTime(trimmedDuration)}`;
  
  // Update timeline duration display
  const timelineDuration = $('timelineDuration');
  if (timelineDuration) {
    timelineDuration.textContent = formatTime(trimmedDuration);
  }
}

// RENDER TIMELINE CLIPS (VN Style)
function renderTimelineClips() {
  const clipContainer = $('clipContainer');
  clipContainer.innerHTML = '';
  
  if (!video.src || state.clips.length === 0) return;
  
  const pixelsPerSecond = 100;
  let currentX = 0;
  let totalWidth = 0;
  
  // Calculate total width first
  state.clips.forEach(clip => {
    totalWidth += clip.duration * pixelsPerSecond;
  });
  
  // Add padding for better visibility
  totalWidth += 100;
  
  state.clips.forEach((clip, index) => {
    const clipWidth = clip.duration * pixelsPerSecond;
    
    // Create clip element
    const clipEl = document.createElement('div');
    clipEl.className = 'video-clip-item';
    if (index === state.selectedClipIndex) {
      clipEl.classList.add('selected');
    }
    clipEl.style.left = currentX + 'px';
    clipEl.style.width = clipWidth + 'px';
    clipEl.dataset.index = index;
    
    // Create thumbnail canvas
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = clipWidth;
    thumbCanvas.height = 75;
    const thumbCtx = thumbCanvas.getContext('2d');
    
    // Create temporary video for thumbnail
    const tempVideo = document.createElement('video');
    tempVideo.src = state.videoUrl;
    tempVideo.muted = true;
    tempVideo.crossOrigin = 'anonymous';
    
    tempVideo.onloadeddata = () => {
      tempVideo.currentTime = clip.trimStart + 0.1;
    };
    
    tempVideo.onseeked = () => {
      // Draw multiple frames
      const frameCount = Math.max(3, Math.floor(clip.duration));
      const frameWidth = clipWidth / frameCount;
      
      for (let i = 0; i < frameCount; i++) {
        const frameTime = clip.trimStart + (clip.duration / frameCount) * i;
        tempVideo.currentTime = frameTime;
        thumbCtx.drawImage(tempVideo, i * frameWidth, 0, frameWidth, 75);
      }
      
      // Add gradient overlay
      const gradient = thumbCtx.createLinearGradient(0, 0, 0, 75);
      gradient.addColorStop(0, 'rgba(0, 212, 255, 0.05)');
      gradient.addColorStop(1, 'rgba(0, 212, 255, 0.15)');
      thumbCtx.fillStyle = gradient;
      thumbCtx.fillRect(0, 0, clipWidth, 75);
    };
    
    tempVideo.load();
    clipEl.appendChild(thumbCanvas);
    
    // Add clip label
    const label = document.createElement('div');
    label.className = 'clip-label';
    label.textContent = `Clip ${index + 1} (${formatTime(clip.duration)})`;
    clipEl.appendChild(label);
    
    // Add trim handles
    const leftHandle = document.createElement('div');
    leftHandle.className = 'clip-trim-handle left';
    leftHandle.innerHTML = '<div class="handle-line"></div><div class="handle-grip">⋮</div>';
    makeClipTrimHandleDraggable(leftHandle, clip, index, 'left', pixelsPerSecond);
    clipEl.appendChild(leftHandle);
    
    const rightHandle = document.createElement('div');
    rightHandle.className = 'clip-trim-handle right';
    rightHandle.innerHTML = '<div class="handle-line"></div><div class="handle-grip">⋮</div>';
    makeClipTrimHandleDraggable(rightHandle, clip, index, 'right', pixelsPerSecond);
    clipEl.appendChild(rightHandle);
    
    // Click to select clip
    clipEl.onclick = (e) => {
      if (e.target.classList.contains('clip-trim-handle') || e.target.closest('.clip-trim-handle')) {
        return;
      }
      selectClip(index);
    };
    
    clipContainer.appendChild(clipEl);
    currentX += clipWidth;
  });
  
  // Set container width to ensure all clips are visible
  clipContainer.style.minWidth = totalWidth + 'px';
  clipContainer.style.width = totalWidth + 'px';
}

// SELECT CLIP
function selectClip(index) {
  state.selectedClipIndex = index;
  const clip = state.clips[index];
  
  // Calculate timeline position for this clip
  let timelinePos = 0;
  for (let i = 0; i < index; i++) {
    timelinePos += state.clips[i].duration;
  }
  
  // Update state current time and video position
  state.currentTime = timelinePos;
  video.currentTime = clip.trimStart;
  
  // Update playhead
  const pixelsPerSecond = 100;
  playhead.style.left = (timelinePos * pixelsPerSecond) + 'px';
  
  // Re-render to show selection
  renderTimelineClips();
  updateTimeline();
}

// MAKE CLIP TRIM HANDLE DRAGGABLE (Manual Trimming)
function makeClipTrimHandleDraggable(handle, clip, clipIndex, side, pixelsPerSecond) {
  let isDragging = false;
  let startX = 0;
  let originalTrimStart = 0;
  let originalTrimEnd = 0;
  let originalLeft = 0;
  
  handle.onmousedown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    startX = e.clientX;
    originalTrimStart = clip.trimStart;
    originalTrimEnd = clip.trimEnd;
    originalLeft = clip.start * pixelsPerSecond;
    handle.classList.add('dragging');
    document.body.style.cursor = 'ew-resize';
    
    state.selectedClipIndex = clipIndex;
    
    // Add visual feedback
    const clipEl = handle.closest('.video-clip-item');
    clipEl.classList.add('selected');
  };
  
  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const deltaX = e.clientX - startX;
    const deltaTime = deltaX / pixelsPerSecond;
    
    // Get original video duration from first clip or find max
    const originalVideoDuration = video.duration || state.clips.reduce((max, c) => Math.max(max, c.trimEnd), 0);
    
    if (side === 'left') {
      // Trim from start
      let newTrimStart = originalTrimStart + deltaTime;
      newTrimStart = Math.max(0, Math.min(newTrimStart, originalTrimEnd - 0.01));
      
      clip.trimStart = newTrimStart;
      clip.duration = clip.trimEnd - clip.trimStart;
      
    } else {
      // Trim from end
      let newTrimEnd = originalTrimEnd + deltaTime;
      newTrimEnd = Math.max(originalTrimStart + 0.01, Math.min(newTrimEnd, originalVideoDuration));
      
      clip.trimEnd = newTrimEnd;
      clip.duration = clip.trimEnd - clip.trimStart;
    }
    
    // Recalculate all clip positions
    recalculateClipPositions();
    recalculateDuration();
    updateTimeline();
    
    // Update all clip positions and widths in real-time
    let posX = 0;
    for (let i = 0; i < state.clips.length; i++) {
      const el = document.querySelector(`.video-clip-item[data-index="${i}"]`);
      if (el) {
        const newWidth = state.clips[i].duration * pixelsPerSecond;
        el.style.left = posX + 'px';
        el.style.width = newWidth + 'px';
        
        const label = el.querySelector('.clip-label');
        if (label) {
          label.textContent = `Clip ${i + 1} (${formatTime(state.clips[i].duration)})`;
        }
      }
      posX += state.clips[i].duration * pixelsPerSecond;
    }
    
    // Update container width
    const clipContainer = $('clipContainer');
    clipContainer.style.width = (posX + 100) + 'px';
    clipContainer.style.minWidth = (posX + 100) + 'px';
  };
  
  const onMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      handle.classList.remove('dragging');
      document.body.style.cursor = 'default';
      renderTimelineClips();
      renderTextLayerTimeline();
    }
  };
  
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

// RENDER OVERLAYS
function renderOverlays() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Texts
  state.texts.forEach((text, index) => {
    // Check if text should be visible at current time
    if (state.currentTime < text.startTime || state.currentTime > text.endTime) {
      return; // Don't render if outside time range
    }
    
    const relativeTime = state.currentTime - text.startTime;
    const progress = Math.min(relativeTime / Math.min(text.duration, 1), 1);
    
    ctx.save();
    
    // Apply font properties
    const fontStyle = text.style || 'normal';
    const fontWeight = text.weight || 'normal';
    const fontSize = text.size;
    const fontFamily = text.font || 'Arial';
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = text.color;
    
    // Text alignment
    if (text.align === 'left') {
      ctx.textAlign = 'left';
      if (!text.customX) text.x = 20;
    } else if (text.align === 'right') {
      ctx.textAlign = 'right';
      if (!text.customX) text.x = 340;
    } else {
      ctx.textAlign = 'center';
      if (!text.customX) text.x = 180;
    }
    
    ctx.textBaseline = 'middle';
    
    // Animation
    let alpha = 1;
    let offsetY = 0;
    let scale = 1;
    let rotation = 0;
    let displayText = text.content;
    
    if (text.anim === 'fade') {
      alpha = progress;
    } else if (text.anim === 'slide') {
      alpha = progress;
      offsetY = (1 - progress) * 50;
    } else if (text.anim === 'zoom') {
      alpha = progress;
      scale = 0.5 + (progress * 0.5);
    } else if (text.anim === 'typewriter') {
      const charCount = Math.floor(progress * text.content.length);
      displayText = text.content.substring(0, charCount);
      alpha = 1;
    } else if (text.anim === 'bounce') {
      alpha = progress;
      const bounceProgress = Math.min(progress * 1.5, 1);
      offsetY = bounceProgress < 1 ? Math.sin(bounceProgress * Math.PI) * -30 : 0;
    } else if (text.anim === 'rotate') {
      alpha = progress;
      rotation = (1 - progress) * Math.PI * 2;
      scale = progress;
    }
    
    ctx.globalAlpha = alpha;
    ctx.translate(text.x, text.y - offsetY);
    ctx.scale(scale, scale);
    ctx.rotate(rotation);
    
    // Draw text with shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Draw background if enabled
    if (text.bgEnabled && text.bgColor) {
      const metrics = ctx.measureText(displayText);
      const textWidth = metrics.width;
      const textHeight = text.size;
      
      let bgX = 0;
      if (text.align === 'center') bgX = -textWidth / 2;
      else if (text.align === 'right') bgX = -textWidth;
      
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = text.bgColor;
      const padding = 8;
      ctx.fillRect(bgX - padding, -textHeight / 2 - padding, textWidth + padding * 2, textHeight + padding * 2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = text.color;
    }
    
    ctx.fillText(displayText, 0, 0);
    
    // Draw selection box if this text is selected
    if (selectedTextIndex === index) {
      ctx.restore();
      ctx.save();
      
      // Measure text with proper font
      const fontStyle = text.style || 'normal';
      const fontWeight = text.weight || 'normal';
      const fontSize = text.size;
      const fontFamily = text.font || 'Arial';
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      const metrics = ctx.measureText(displayText);
      const textWidth = metrics.width;
      const textHeight = text.size;
      
      // Draw selection box
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      
      let boxX = text.x;
      if (text.align === 'center') boxX -= textWidth / 2;
      else if (text.align === 'right') boxX -= textWidth;
      
      const padding = 8;
      ctx.strokeRect(
        boxX - padding, 
        text.y - textHeight / 2 - padding, 
        textWidth + padding * 2, 
        textHeight + padding * 2
      );
      
      // Draw corner handles
      ctx.fillStyle = '#00d4ff';
      ctx.setLineDash([]);
      const handleSize = 10;
      
      // Top-left
      ctx.fillRect(
        boxX - padding - handleSize/2, 
        text.y - textHeight / 2 - padding - handleSize/2, 
        handleSize, handleSize
      );
      // Top-right
      ctx.fillRect(
        boxX + textWidth + padding - handleSize/2, 
        text.y - textHeight / 2 - padding - handleSize/2, 
        handleSize, handleSize
      );
      // Bottom-left
      ctx.fillRect(
        boxX - padding - handleSize/2, 
        text.y + textHeight / 2 + padding - handleSize/2, 
        handleSize, handleSize
      );
      // Bottom-right
      ctx.fillRect(
        boxX + textWidth + padding - handleSize/2, 
        text.y + textHeight / 2 + padding - handleSize/2, 
        handleSize, handleSize
      );
      
      // Draw center move handle
      ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.fillRect(
        text.x - 15, 
        text.y - 15, 
        30, 30
      );
      ctx.fillStyle = '#00d4ff';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✥', text.x, text.y);
    }
    
    ctx.restore();
  });
  
  // Stickers
  state.stickers.forEach(sticker => {
    ctx.save();
    ctx.translate(sticker.x, sticker.y);
    ctx.scale(sticker.scale, sticker.scale);
    
    if (sticker.type === 'emoji') {
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sticker.content, 0, 0);
    } else if (sticker.type === 'image' && sticker.url) {
      const img = new Image();
      img.src = sticker.url;
      ctx.drawImage(img, -50, -50, 100, 100);
    }
    
    ctx.restore();
  });
}

// MAKE TEXT DRAGGABLE IN VIDEO FRAME
const overlayCanvas = $('overlayCanvas');
let isDraggingText = false;
let draggedTextIndex = null;
let dragStartX = 0;
let dragStartY = 0;
let textOriginalX = 0;
let textOriginalY = 0;

overlayCanvas.onmousedown = (e) => {
  const rect = overlayCanvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;
  
  // Check which text was clicked
  let clickedTextIndex = null;
  
  for (let i = state.texts.length - 1; i >= 0; i--) {
    const text = state.texts[i];
    
    // Only check visible texts
    if (state.currentTime < text.startTime || state.currentTime > text.endTime) {
      continue;
    }
    
    // Measure text bounds
    const fontStyle = text.style || 'normal';
    const fontWeight = text.weight || 'normal';
    const fontSize = text.size;
    const fontFamily = text.font || 'Arial';
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text.content);
    const textWidth = metrics.width;
    const textHeight = text.size;
    
    let boxX = text.x;
    if (text.align === 'center') boxX -= textWidth / 2;
    else if (text.align === 'right') boxX -= textWidth;
    
    const boxY = text.y - textHeight / 2;
    
    // Check if click is within text bounds
    if (mouseX >= boxX - 10 && mouseX <= boxX + textWidth + 10 &&
        mouseY >= boxY - 10 && mouseY <= boxY + textHeight + 10) {
      clickedTextIndex = i;
      break;
    }
  }
  
  if (clickedTextIndex !== null) {
    // Select and start dragging
    selectedTextIndex = clickedTextIndex;
    selectTextForEditing(clickedTextIndex);
    
    const text = state.texts[clickedTextIndex];
    isDraggingText = true;
    draggedTextIndex = clickedTextIndex;
    dragStartX = mouseX;
    dragStartY = mouseY;
    textOriginalX = text.x;
    textOriginalY = text.y;
    overlayCanvas.style.cursor = 'move';
    
    renderOverlays();
  } else {
    // Deselect if clicking empty area
    selectedTextIndex = null;
    document.querySelectorAll('.text-layer-item').forEach(item => {
      item.classList.remove('selected');
    });
    renderOverlays();
  }
};

overlayCanvas.onmousemove = (e) => {
  const rect = overlayCanvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;
  
  if (isDraggingText && draggedTextIndex !== null) {
    // Dragging text
    const deltaX = mouseX - dragStartX;
    const deltaY = mouseY - dragStartY;
    
    const text = state.texts[draggedTextIndex];
    text.x = Math.max(20, Math.min(canvas.width - 20, textOriginalX + deltaX));
    text.y = Math.max(20, Math.min(canvas.height - 20, textOriginalY + deltaY));
    text.customX = true; // Mark as custom positioned
    text.customY = true;
    
    renderOverlays();
  } else {
    // Check if hovering over any text
    let hoveringText = false;
    
    for (let i = state.texts.length - 1; i >= 0; i--) {
      const text = state.texts[i];
      
      // Only check visible texts
      if (state.currentTime < text.startTime || state.currentTime > text.endTime) {
        continue;
      }
      
      // Measure text bounds
      const fontStyle = text.style || 'normal';
      const fontWeight = text.weight || 'normal';
      const fontSize = text.size;
      const fontFamily = text.font || 'Arial';
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      const metrics = ctx.measureText(text.content);
      const textWidth = metrics.width;
      const textHeight = text.size;
      
      let boxX = text.x;
      if (text.align === 'center') boxX -= textWidth / 2;
      else if (text.align === 'right') boxX -= textWidth;
      
      const boxY = text.y - textHeight / 2;
      
      // Check if hovering over text
      if (mouseX >= boxX - 10 && mouseX <= boxX + textWidth + 10 &&
          mouseY >= boxY - 10 && mouseY <= boxY + textHeight + 10) {
        hoveringText = true;
        break;
      }
    }
    
    overlayCanvas.style.cursor = hoveringText ? 'pointer' : 'default';
  }
};

overlayCanvas.onmouseup = () => {
  if (isDraggingText) {
    isDraggingText = false;
    draggedTextIndex = null;
    overlayCanvas.style.cursor = 'default';
  }
};

overlayCanvas.onmouseleave = () => {
  if (isDraggingText) {
    isDraggingText = false;
    draggedTextIndex = null;
    overlayCanvas.style.cursor = 'default';
  }
};

// RENDER TEXT LAYER TIMELINE (Main Timeline)
function renderTextLayerTimeline() {
  const textLayerItems = $('textLayerItems');
  if (!textLayerItems) return;
  
  textLayerItems.innerHTML = '';
  
  if (state.texts.length === 0) return;
  
  const totalDuration = state.clips.reduce((sum, clip) => sum + clip.duration, 0);
  const pixelsPerSecond = 100; // Same as video timeline
  
  // Set minimum width for text layer items container
  const minWidth = Math.max(totalDuration * pixelsPerSecond + 100, textLayerItems.parentElement.clientWidth);
  textLayerItems.style.minWidth = minWidth + 'px';
  
  state.texts.forEach((text, index) => {
    // Clamp text times to total duration
    if (text.startTime > totalDuration) {
      text.startTime = Math.max(0, totalDuration - text.duration);
      text.endTime = text.startTime + text.duration;
    }
    if (text.endTime > totalDuration) {
      text.endTime = totalDuration;
      text.duration = text.endTime - text.startTime;
    }
    
    const textItem = document.createElement('div');
    textItem.className = 'text-layer-item';
    textItem.dataset.index = index;
    
    // Stack texts vertically (each on its own row)
    const rowHeight = 40;
    const top = 4 + (index * rowHeight);
    
    const left = text.startTime * pixelsPerSecond;
    const width = text.duration * pixelsPerSecond;
    
    textItem.style.left = left + 'px';
    textItem.style.width = width + 'px';
    textItem.style.top = top + 'px';
    
    const animIcon = {
      'none': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
      'fade': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
      'slide': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>',
      'zoom': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>',
      'typewriter': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>',
      'bounce': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
      'rotate': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>'
    };
    
    textItem.innerHTML = `
      <div class="text-layer-content">
        <span class="text-layer-icon">${animIcon[text.anim] || animIcon['none']}</span>
        <span class="text-layer-text">${text.content}</span>
      </div>
      <div class="text-layer-handle left"></div>
      <div class="text-layer-handle right"></div>
      <button class="text-layer-delete" onclick="removeText(${index})">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    
    // Click to select and edit text
    textItem.onclick = (e) => {
      if (e.target.classList.contains('text-layer-handle') || 
          e.target.classList.contains('text-layer-delete') ||
          e.target.closest('.text-layer-handle') ||
          e.target.closest('.text-layer-delete')) {
        return;
      }
      selectTextForEditing(index);
    };
    
    // Make draggable
    makeTextLayerDraggable(textItem, text, index, pixelsPerSecond, totalDuration);
    
    textLayerItems.appendChild(textItem);
  });
  
  // Adjust text layer track height based on number of texts
  const textLayerTrack = $('textLayerTrack');
  if (textLayerTrack && state.texts.length > 0) {
    const minHeight = Math.max(40, (state.texts.length * 40) + 8);
    textLayerTrack.style.height = minHeight + 'px';
  }
  
  // Sync scroll with video timeline
  const timelineTrack = $('timelineTrack');
  if (timelineTrack && textLayerTrack) {
    textLayerTrack.scrollLeft = timelineTrack.scrollLeft;
  }
}

// SELECT TEXT FOR EDITING
let selectedTextIndex = null;

function selectTextForEditing(index) {
  selectedTextIndex = index;
  const text = state.texts[index];
  
  // Open text tool panel if not open
  if (currentTool !== 'text') {
    openToolPanel('text');
  }
  
  // Populate form with text data
  setTimeout(() => {
    const textInput = $('textInput');
    const textFont = $('textFont');
    const textSize = $('textSize');
    const textWeight = $('textWeight');
    const textStyle = $('textStyle');
    const textColor = $('textColor');
    const textBgEnabled = $('textBgEnabled');
    const textBgColor = $('textBgColor');
    const textAlign = $('textAlign');
    const textVPosition = $('textVPosition');
    const textAnim = $('textAnim');
    const textStartTime = $('textStartTime');
    const textDuration = $('textDuration');
    
    if (textInput) textInput.value = text.content;
    if (textFont) textFont.value = text.font || 'Arial';
    if (textSize) textSize.value = text.size;
    if (textWeight) textWeight.value = text.weight || 'normal';
    if (textStyle) textStyle.value = text.style || 'normal';
    if (textColor) textColor.value = text.color;
    if (textBgEnabled) textBgEnabled.checked = text.bgEnabled || false;
    if (textBgColor) textBgColor.value = text.bgColor || '#000000';
    if (textAlign) textAlign.value = text.align;
    if (textVPosition) textVPosition.value = text.vPosition;
    if (textAnim) textAnim.value = text.anim;
    if (textStartTime) textStartTime.value = text.startTime.toFixed(1);
    if (textDuration) textDuration.value = text.duration.toFixed(1);
    
    // Enable real-time editing
    enableRealTimeTextEditing(index);
    
    // Highlight selected text in timeline
    document.querySelectorAll('.text-layer-item').forEach((item, i) => {
      item.classList.toggle('selected', i === index);
    });
  }, 100);
  
  // Seek to text start time
  state.currentTime = text.startTime;
  seekToTime(text.startTime);
  renderOverlays();
}

// ENABLE REAL-TIME TEXT EDITING
function enableRealTimeTextEditing(index) {
  const text = state.texts[index];
  
  const textInput = $('textInput');
  const textFont = $('textFont');
  const textSize = $('textSize');
  const textWeight = $('textWeight');
  const textStyle = $('textStyle');
  const textColor = $('textColor');
  const textBgEnabled = $('textBgEnabled');
  const textBgColor = $('textBgColor');
  const textAlign = $('textAlign');
  const textVPosition = $('textVPosition');
  const textAnim = $('textAnim');
  
  if (textInput) {
    textInput.oninput = () => {
      text.content = textInput.value;
      renderOverlays();
      renderTextLayerTimeline();
    };
  }
  
  if (textFont) {
    textFont.onchange = () => {
      text.font = textFont.value;
      renderOverlays();
    };
  }
  
  if (textSize) {
    textSize.oninput = () => {
      text.size = parseInt(textSize.value);
      renderOverlays();
    };
  }
  
  if (textWeight) {
    textWeight.onchange = () => {
      text.weight = textWeight.value;
      renderOverlays();
    };
  }
  
  if (textStyle) {
    textStyle.onchange = () => {
      text.style = textStyle.value;
      renderOverlays();
    };
  }
  
  if (textColor) {
    textColor.oninput = () => {
      text.color = textColor.value;
      renderOverlays();
    };
  }
  
  if (textBgEnabled) {
    textBgEnabled.onchange = () => {
      text.bgEnabled = textBgEnabled.checked;
      renderOverlays();
    };
  }
  
  if (textBgColor) {
    textBgColor.oninput = () => {
      text.bgColor = textBgColor.value;
      renderOverlays();
    };
  }
  
  if (textAlign) {
    textAlign.onchange = () => {
      text.align = textAlign.value;
      // Reset custom position when alignment changes
      text.customX = false;
      if (text.align === 'left') text.x = 20;
      else if (text.align === 'right') text.x = 340;
      else text.x = 180;
      renderOverlays();
    };
  }
  
  if (textVPosition) {
    textVPosition.onchange = () => {
      text.vPosition = textVPosition.value;
      // Reset custom position when vertical position changes
      text.customY = false;
      if (text.vPosition === 'top') text.y = 100;
      else if (text.vPosition === 'bottom') text.y = 540;
      else text.y = 320;
      renderOverlays();
    };
  }
  
  if (textAnim) {
    textAnim.onchange = () => {
      text.anim = textAnim.value;
      renderTextLayerTimeline();
      // Preview animation by seeking to text start
      previewTextAnimation(index);
    };
  }
}

// PREVIEW TEXT ANIMATION
let animationPreviewInterval = null;

function previewTextAnimation(index) {
  const text = state.texts[index];
  
  // Clear any existing preview
  if (animationPreviewInterval) {
    clearInterval(animationPreviewInterval);
    animationPreviewInterval = null;
  }
  
  // Seek to text start time
  seekToTime(text.startTime);
  
  // If animation is not 'none', play through the animation
  if (text.anim !== 'none') {
    const animDuration = Math.min(text.duration, 2); // Preview for max 2 seconds
    const fps = 30;
    const frameTime = 1000 / fps;
    const totalFrames = animDuration * fps;
    let currentFrame = 0;
    
    animationPreviewInterval = setInterval(() => {
      currentFrame++;
      const progress = currentFrame / totalFrames;
      const newTime = text.startTime + (progress * animDuration);
      
      if (newTime <= text.endTime && currentFrame <= totalFrames) {
        seekToTime(newTime);
        renderOverlays();
      } else {
        clearInterval(animationPreviewInterval);
        animationPreviewInterval = null;
        // Return to start
        seekToTime(text.startTime);
      }
    }, frameTime);
  }
}

// SEEK TO TIME
function seekToTime(time) {
  const totalDuration = state.clips.reduce((sum, clip) => sum + clip.duration, 0);
  const targetTime = Math.max(0, Math.min(time, totalDuration));
  
  let accumulatedTime = 0;
  for (let i = 0; i < state.clips.length; i++) {
    const clip = state.clips[i];
    if (targetTime >= accumulatedTime && targetTime < accumulatedTime + clip.duration) {
      const relativeTime = targetTime - accumulatedTime;
      video.currentTime = clip.trimStart + relativeTime;
      state.currentTime = targetTime;
      
      const pixelsPerSecond = 100;
      const playheadPos = targetTime * pixelsPerSecond;
      playhead.style.left = playheadPos + 'px';
      
      timeDisplay.textContent = `${formatTime(state.currentTime)} / ${formatTime(totalDuration)}`;
      break;
    }
    accumulatedTime += clip.duration;
  }
}

// MAKE TEXT LAYER DRAGGABLE
function makeTextLayerDraggable(element, text, index, pixelsPerSecond, totalDuration) {
  let isDragging = false;
  let isResizing = false;
  let resizeSide = null;
  let startX = 0;
  let originalStart = 0;
  let originalDuration = 0;
  let originalEnd = 0;
  
  // Handle click on resize handles
  const leftHandle = element.querySelector('.text-layer-handle.left');
  const rightHandle = element.querySelector('.text-layer-handle.right');
  
  leftHandle.onmousedown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    resizeSide = 'left';
    startX = e.clientX;
    originalStart = text.startTime;
    originalEnd = text.endTime;
    originalDuration = text.duration;
    element.classList.add('selected');
    document.body.style.cursor = 'ew-resize';
  };
  
  rightHandle.onmousedown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    resizeSide = 'right';
    startX = e.clientX;
    originalStart = text.startTime;
    originalEnd = text.endTime;
    originalDuration = text.duration;
    element.classList.add('selected');
    document.body.style.cursor = 'ew-resize';
  };
  
  // Handle click on main element (for dragging)
  element.onmousedown = (e) => {
    if (e.target.classList.contains('text-layer-handle') || 
        e.target.classList.contains('text-layer-delete') ||
        e.target.closest('.text-layer-handle') ||
        e.target.closest('.text-layer-delete')) {
      return;
    }
    
    isDragging = true;
    startX = e.clientX;
    originalStart = text.startTime;
    originalDuration = text.duration;
    element.classList.add('selected');
    document.body.style.cursor = 'move';
    e.stopPropagation();
  };
  
  document.onmousemove = (e) => {
    if (!isDragging && !isResizing) return;
    e.preventDefault();
    
    const deltaX = e.clientX - startX;
    const deltaTime = deltaX / pixelsPerSecond;
    
    if (isDragging) {
      // Move text (keep duration same)
      let newStart = originalStart + deltaTime;
      newStart = Math.max(0, Math.min(newStart, totalDuration - text.duration));
      text.startTime = newStart;
      text.endTime = newStart + text.duration;
      
      element.style.left = (newStart * pixelsPerSecond) + 'px';
      
    } else if (isResizing) {
      if (resizeSide === 'left') {
        // Expand/shrink from left (change start time, keep end time)
        let newStart = originalStart + deltaTime;
        newStart = Math.max(0, Math.min(newStart, originalEnd - 0.1));
        
        text.startTime = newStart;
        text.duration = originalEnd - newStart;
        text.endTime = originalEnd;
        
        const newLeft = newStart * pixelsPerSecond;
        const newWidth = text.duration * pixelsPerSecond;
        
        element.style.left = newLeft + 'px';
        element.style.width = newWidth + 'px';
        
      } else if (resizeSide === 'right') {
        // Expand/shrink from right (change end time, keep start time)
        let newEnd = originalEnd + deltaTime;
        newEnd = Math.max(originalStart + 0.1, Math.min(newEnd, totalDuration));
        
        text.endTime = newEnd;
        text.duration = newEnd - originalStart;
        text.startTime = originalStart;
        
        const newWidth = text.duration * pixelsPerSecond;
        element.style.width = newWidth + 'px';
      }
    }
    
    renderOverlays();
  };
  
  document.onmouseup = () => {
    if (isDragging || isResizing) {
      isDragging = false;
      isResizing = false;
      resizeSide = null;
      document.body.style.cursor = 'default';
      element.classList.remove('selected');
      
      // Update the text input fields if tool panel is open
      if (currentTool === 'text') {
        const startTimeInput = $('textStartTime');
        const durationInput = $('textDuration');
        if (startTimeInput) startTimeInput.value = text.startTime.toFixed(1);
        if (durationInput) durationInput.value = text.duration.toFixed(1);
      }
      
      renderTextLayerTimeline();
    }
  };
}

// EXPORT
$('exportBtn').onclick = () => {
  $('exportModal').classList.remove('hidden');
};

$('cancelExport').onclick = () => {
  $('exportModal').classList.add('hidden');
};

$('startExport').onclick = async () => {
  if (!video.src) {
    alert('Please import a video first!');
    return;
  }

  const progressBar = $('progressBar');
  const progressFill = $('progressFill');
  const progressText = $('progressText');
  const exportInfoText = $('exportInfoText');

  progressBar.classList.remove('hidden');
  $('startExport').disabled = true;
  exportInfoText.textContent = 'Preparing video...';

  try {
    // Use MediaRecorder to capture the video with overlays
    const stream = video.captureStream ? video.captureStream() : video.mozCaptureStream();
    const chunks = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      $('exportModal').classList.add('hidden');
      progressBar.classList.add('hidden');
      progressFill.style.width = '0%';
      $('startExport').disabled = false;
      // Send blob URL to parent React component
      window.parent.postMessage({ type: 'SAVE_VIDEO', videoData: blobUrl }, '*');
    };

    // Seek to start and play
    video.currentTime = state.clips[0]?.trimStart ?? 0;
    await new Promise(r => { video.onseeked = r; });

    recorder.start();
    video.play();

    const totalDuration = state.clips.reduce((sum, c) => sum + c.duration, 0);
    const startTime = Date.now();

    const updateProgress = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const pct = Math.min(Math.round((elapsed / totalDuration) * 100), 95);
      progressFill.style.width = pct + '%';
      if (progressText) progressText.textContent = pct + '%';
    }, 200);

    // Stop after total duration
    setTimeout(() => {
      clearInterval(updateProgress);
      video.pause();
      recorder.stop();
      progressFill.style.width = '100%';
      if (progressText) progressText.textContent = '100%';
    }, totalDuration * 1000 + 500);

  } catch (err) {
    console.error('Export error:', err);
    // Fallback: send original video URL directly
    $('exportModal').classList.add('hidden');
    progressBar.classList.add('hidden');
    $('startExport').disabled = false;
    window.parent.postMessage({ type: 'SAVE_VIDEO', videoData: state.videoUrl }, '*');
  }
};

// INIT
canvas.width = 360;
canvas.height = 640;

// MAKE TIMELINE SWIPEABLE & SEEKABLE
let isTimelineDragging = false;
let timelineStartX = 0;
let timelineScrollLeft = 0;
let timelineDragMoved = false;

const mainTimelineTrack = $('timelineTrack');
const mainTextLayerTrack = $('textLayerTrack');

// Make timeline track swipeable
mainTimelineTrack.onmousedown = (e) => {
  if (e.target.closest('.video-clip-item') || e.target.closest('.clip-trim-handle')) {
    return;
  }
  
  isTimelineDragging = true;
  timelineDragMoved = false;
  timelineStartX = e.pageX - mainTimelineTrack.offsetLeft;
  timelineScrollLeft = mainTimelineTrack.scrollLeft;
  mainTimelineTrack.style.cursor = 'grabbing';
};

mainTimelineTrack.onmousemove = (e) => {
  if (!isTimelineDragging) return;
  e.preventDefault();
  const x = e.pageX - mainTimelineTrack.offsetLeft;
  const walk = (x - timelineStartX) * 2;
  
  if (Math.abs(walk) > 5) {
    timelineDragMoved = true;
    mainTimelineTrack.scrollLeft = timelineScrollLeft - walk;
    // Sync text layer scroll
    if (mainTextLayerTrack) {
      mainTextLayerTrack.scrollLeft = mainTimelineTrack.scrollLeft;
    }
  }
};

mainTimelineTrack.onmouseup = (e) => {
  if (isTimelineDragging && !timelineDragMoved) {
    seekToTimelinePosition(e);
  }
  isTimelineDragging = false;
  timelineDragMoved = false;
  mainTimelineTrack.style.cursor = 'grab';
};

mainTimelineTrack.onmouseleave = () => {
  isTimelineDragging = false;
  mainTimelineTrack.style.cursor = 'grab';
};

mainTimelineTrack.ontouchstart = (e) => {
  if (e.target.closest('.video-clip-item') || e.target.closest('.clip-trim-handle')) {
    return;
  }
  
  isTimelineDragging = true;
  timelineDragMoved = false;
  timelineStartX = e.touches[0].pageX - mainTimelineTrack.offsetLeft;
  timelineScrollLeft = mainTimelineTrack.scrollLeft;
};

mainTimelineTrack.ontouchmove = (e) => {
  if (!isTimelineDragging) return;
  const x = e.touches[0].pageX - mainTimelineTrack.offsetLeft;
  const walk = (x - timelineStartX) * 2;
  
  if (Math.abs(walk) > 5) {
    timelineDragMoved = true;
    mainTimelineTrack.scrollLeft = timelineScrollLeft - walk;
    // Sync text layer scroll
    if (mainTextLayerTrack) {
      mainTextLayerTrack.scrollLeft = mainTimelineTrack.scrollLeft;
    }
  }
};

mainTimelineTrack.ontouchend = (e) => {
  if (isTimelineDragging && !timelineDragMoved) {
    seekToTimelinePosition(e.changedTouches[0]);
  }
  isTimelineDragging = false;
  timelineDragMoved = false;
};

// Make text layer track swipeable
let isTextLayerDragging = false;
let textLayerStartX = 0;
let textLayerScrollLeft = 0;
let textLayerDragMoved = false;

if (mainTextLayerTrack) {
  mainTextLayerTrack.onmousedown = (e) => {
    if (e.target.closest('.text-layer-item') || e.target.closest('.text-layer-handle')) {
      return;
    }
    
    isTextLayerDragging = true;
    textLayerDragMoved = false;
    textLayerStartX = e.pageX - mainTextLayerTrack.offsetLeft;
    textLayerScrollLeft = mainTextLayerTrack.scrollLeft;
    mainTextLayerTrack.style.cursor = 'grabbing';
  };
  
  mainTextLayerTrack.onmousemove = (e) => {
    if (!isTextLayerDragging) return;
    e.preventDefault();
    const x = e.pageX - mainTextLayerTrack.offsetLeft;
    const walk = (x - textLayerStartX) * 2;
    
    if (Math.abs(walk) > 5) {
      textLayerDragMoved = true;
      mainTextLayerTrack.scrollLeft = textLayerScrollLeft - walk;
      // Sync timeline scroll
      if (mainTimelineTrack) {
        mainTimelineTrack.scrollLeft = mainTextLayerTrack.scrollLeft;
      }
    }
  };
  
  mainTextLayerTrack.onmouseup = (e) => {
    if (isTextLayerDragging && !textLayerDragMoved) {
      // Click to seek on text layer
      seekToTimelinePosition(e);
    }
    isTextLayerDragging = false;
    textLayerDragMoved = false;
    mainTextLayerTrack.style.cursor = 'grab';
  };
  
  mainTextLayerTrack.onmouseleave = () => {
    isTextLayerDragging = false;
    mainTextLayerTrack.style.cursor = 'grab';
  };
  
  mainTextLayerTrack.ontouchstart = (e) => {
    if (e.target.closest('.text-layer-item') || e.target.closest('.text-layer-handle')) {
      return;
    }
    
    isTextLayerDragging = true;
    textLayerDragMoved = false;
    textLayerStartX = e.touches[0].pageX - mainTextLayerTrack.offsetLeft;
    textLayerScrollLeft = mainTextLayerTrack.scrollLeft;
  };
  
  mainTextLayerTrack.ontouchmove = (e) => {
    if (!isTextLayerDragging) return;
    const x = e.touches[0].pageX - mainTextLayerTrack.offsetLeft;
    const walk = (x - textLayerStartX) * 2;
    
    if (Math.abs(walk) > 5) {
      textLayerDragMoved = true;
      mainTextLayerTrack.scrollLeft = textLayerScrollLeft - walk;
      // Sync timeline scroll
      if (mainTimelineTrack) {
        mainTimelineTrack.scrollLeft = mainTextLayerTrack.scrollLeft;
      }
    }
  };
  
  mainTextLayerTrack.ontouchend = (e) => {
    if (isTextLayerDragging && !textLayerDragMoved) {
      seekToTimelinePosition(e.changedTouches[0]);
    }
    isTextLayerDragging = false;
    textLayerDragMoved = false;
  };
}

// Sync text layer scroll with video timeline
if (mainTimelineTrack && mainTextLayerTrack) {
  // Sync when timeline scrolls
  mainTimelineTrack.addEventListener('scroll', () => {
    if (!isTimelineDragging && mainTextLayerTrack) {
      mainTextLayerTrack.scrollLeft = mainTimelineTrack.scrollLeft;
    }
  });
  
  // Sync when text layer scrolls
  mainTextLayerTrack.addEventListener('scroll', () => {
    if (!isTextLayerDragging && mainTimelineTrack) {
      mainTimelineTrack.scrollLeft = mainTextLayerTrack.scrollLeft;
    }
  });
}

// SEEK TO TIMELINE POSITION
function seekToTimelinePosition(e) {
  if (!video.src || state.clips.length === 0) return;
  
  // Determine which track was clicked
  const clickedTrack = e.target.closest('.timeline-track') || e.target.closest('.text-layer-track');
  if (!clickedTrack) return;
  
  const rect = clickedTrack.getBoundingClientRect();
  const clickX = e.clientX || e.pageX;
  const relativeX = clickX - rect.left + clickedTrack.scrollLeft;
  
  const pixelsPerSecond = 100;
  const clickedTime = relativeX / pixelsPerSecond;
  
  const totalDuration = state.clips.reduce((sum, clip) => sum + clip.duration, 0);
  const targetTime = Math.max(0, Math.min(clickedTime, totalDuration));
  
  let accumulatedTime = 0;
  for (let i = 0; i < state.clips.length; i++) {
    const clip = state.clips[i];
    if (targetTime >= accumulatedTime && targetTime < accumulatedTime + clip.duration) {
      const relativeTime = targetTime - accumulatedTime;
      video.currentTime = clip.trimStart + relativeTime;
      state.currentTime = targetTime;
      state.selectedClipIndex = i;
      
      const playheadPos = targetTime * pixelsPerSecond;
      playhead.style.left = playheadPos + 'px';
      
      timeDisplay.textContent = `${formatTime(state.currentTime)} / ${formatTime(totalDuration)}`;
      renderOverlays();
      renderTimelineClips();
      break;
    }
    accumulatedTime += clip.duration;
  }
}

// SYNC PLAYHEAD TO VIDEO TIME
function syncPlayheadToVideoTime() {
  if (!video.src || state.clips.length === 0) return;
  
  const videoTime = video.currentTime;
  const pixelsPerSecond = 100;
  
  // Find which clip contains this video time
  let foundClip = false;
  let timelinePosition = 0;
  
  for (let i = 0; i < state.clips.length; i++) {
    const clip = state.clips[i];
    
    // Check if video time is within this clip's range
    if (videoTime >= clip.trimStart && videoTime <= clip.trimEnd) {
      const relativeTime = videoTime - clip.trimStart;
      state.currentTime = timelinePosition + relativeTime;
      state.selectedClipIndex = i;
      
      const playheadPos = state.currentTime * pixelsPerSecond;
      playhead.style.left = playheadPos + 'px';
      
      const totalDuration = state.clips.reduce((sum, c) => sum + c.duration, 0);
      timeDisplay.textContent = `${formatTime(state.currentTime)} / ${formatTime(totalDuration)}`;
      
      foundClip = true;
      break;
    }
    
    timelinePosition += clip.duration;
  }
  
  if (!foundClip && state.selectedClipIndex !== null) {
    // Video time is outside all clips, keep current selection
    const clip = state.clips[state.selectedClipIndex];
    if (videoTime < clip.trimStart) {
      video.currentTime = clip.trimStart;
    } else if (videoTime > clip.trimEnd) {
      video.currentTime = clip.trimEnd;
    }
  }
}

console.log('🎬 Reels Editor Ready!');
console.log('✅ Timeline swipe enabled');
console.log('✅ Multi-clip trimming enabled');

// postMessage bridge — receive video from parent React component
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'LOAD_VIDEO') {
    const dataUrl = event.data.videoData;
    fetch(dataUrl)
      .then(r => r.blob())
      .then(blob => {
        const file = new File([blob], event.data.fileName || 'video.mp4', { type: blob.type || 'video/mp4' });
        if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
        state.videoUrl = URL.createObjectURL(file);
        video.src = state.videoUrl;
        video.load();
        video.onloadedmetadata = () => {
          state.duration = video.duration;
          state.clips = [{ id: Date.now(), start: 0, end: video.duration, trimStart: 0, trimEnd: video.duration, duration: video.duration }];
          state.selectedClipIndex = 0;
          emptyState.style.display = 'none';
          canvas.width = 360; canvas.height = 640;
          video.currentTime = 0;
          state.currentTime = 0;
          applyFrameMode();
          setTimeout(() => { renderTimelineClips(); updateTimeline(); renderTextLayerTimeline(); }, 100);
        };
      })
      .catch(() => {
        // fallback: use data URL directly
        video.src = dataUrl;
        video.load();
      });
  }
});

// Signal ready to parent
window.parent.postMessage({ type: 'EDITOR_READY' }, '*');
