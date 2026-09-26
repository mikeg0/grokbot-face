const DATA = window.GROK_FACE_DATA;
const SHAPES = Object.keys(DATA.shapes);
const COLORS = Object.entries(DATA.colors).map(([id, value]) => ({ id, value }));
const STATES = Object.keys(DATA.statePoses);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const randomItem = items => items[Math.floor(Math.random() * items.length)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = selector => document.querySelector(selector);

class Face {
  constructor(mount, { shape = 'blob', color = 'black', state = 'idle', size = 292 } = {}) {
    Object.assign(this, { mount, shape, color, state, size, visible: true });
    mount.classList.add('face');
    mount.style.setProperty('--face-size', `${size}px`);
    this.reset();
  }
  reset() {
    this.renderer?.destroy();
    this.renderer = window.createGrokRenderer(this.mount, { shape: this.shape, state: this.state, badgeColor: '#1d9bf0', choreographed: this.choreographed ?? false });
    this.appearance();
    this.renderer.advance(1);
  }
  appearance() {
    this.mount.style.setProperty('--fg', DATA.colors[this.color]);
    this.mount.dataset.state = this.state;
    this.renderer.svg.setAttribute('role', 'img');
    this.renderer.svg.setAttribute('aria-label', `${this.shape} Grok Bot face, ${this.color}, ${this.state}`);
  }
  setShape(shape) {
    if (!DATA.shapes[shape] || this.shape === shape) return;
    this.shape = shape;
    this.renderer.update({ shape });
    this.appearance();
  }
  setColor(color) {
    if (!DATA.colors[color]) return;
    this.color = color;
    this.appearance();
  }
  setState(state) {
    if (!DATA.statePoses[state] || this.state === state) return;
    this.state = state;
    this.renderer.update({ state });
    this.appearance();
  }
  setGaze(point) { this.renderer.update({ gazeTarget: point }); }
  action(name) { this.renderer.action(name); }
  advance(delta) { this.renderer.advance(delta); }
}

const mainFace = new Face($('#heroFace'));
const shapeSelect = $('#shapeSelect');
const stateSelect = $('#stateSelect');
let paused = reducedMotion;
let speed = 1;
let gazeAmount = 1;
let sequenceOn = true;
let sequenceTime = 0;
let cueIndex = 0;
let galleryTime = 0;
const DURATION = 30750;
// Choreographed demo cues; the source renderer supplies motion.
const CUES = [
  { at: 0, state: 'idle', shape: 'blob', expression: 0, label: 'Home' },
  { at: 250, state: 'idle', expression: 6, label: 'Look & blink' },
  { at: 1150, state: 'thinking', label: 'Thinking dots' },
  { at: 2350, state: 'idle', label: 'Return to face' },
  { at: 3300, state: 'suspicious', label: 'Asymmetric eyes' },
  { at: 4500, state: 'happy', expression: 2, label: 'Wide eyes' },
  { at: 5880, state: 'writing', label: 'Writing pen' },
  { at: 7700, state: 'idle', label: 'Return to face' },
  { at: 8750, state: 'notifying', expression: 21, label: 'Notification' },
  { at: 10000, state: 'alerting', label: 'Exclamation' },
  { at: 11400, state: 'idle', label: 'Return to face' },
  { at: 12600, state: 'bouncing', label: 'Bouncing ball' },
  { at: 13800, state: 'idle', label: 'Return to face' },
  { at: 15400, shape: 'egg', label: 'Egg morph' },
  { at: 16600, shape: 'hex', label: 'Hex morph' },
  { at: 17700, shape: 'wedge', action: 'burst', label: 'Wedge & trails' },
  { at: 19100, action: 'wild', label: 'Tumble & colored trails' },
  { at: 21000, shape: 'blob', label: 'Return to blob' },
  { at: 22800, state: 'idle', action: 'blink', label: 'Settle' },
  { at: 24000, state: 'orbit', label: 'Orbiting satellites' },
  { at: 25200, state: 'powering-down', label: 'Quiet dot' },
  { at: 26000, state: 'idle', label: 'Return to face' },
  { at: 27300, state: 'loading', label: 'Small dot & colored trails' },
  { at: 29400, state: 'idle', label: 'Return home' }
];

function applyCue(cue) {
  mainFace.renderer.update({ expression: cue.expression ?? null });
  if (cue.shape) mainFace.setShape(cue.shape);
  if (cue.state) mainFace.setState(cue.state);
  if (cue.action) mainFace.action(cue.action);
  $('#sequenceLabel').textContent = cue.label;
}
function advanceSequence(delta) {
  let target = Math.min(DURATION, sequenceTime + delta);
  while (cueIndex < CUES.length && CUES[cueIndex].at <= target) {
    const cue = CUES[cueIndex++];
    mainFace.advance(Math.max(0, cue.at - sequenceTime));
    sequenceTime = cue.at;
    applyCue(cue);
  }
  mainFace.advance(target - sequenceTime);
  sequenceTime = target;
  syncTimeline();
  if (sequenceTime >= DURATION && delta > 0) restartSequence();
}
function restartSequence() {
  mainFace.shape = 'blob';
  mainFace.state = 'idle';
  mainFace.color = 'black';
  mainFace.choreographed = true;
  mainFace.reset();
  sequenceTime = 0;
  cueIndex = 0;
  sequenceOn = true;
  advanceSequence(0);
  syncUI();
}
function seekSequence(milliseconds) {
  restartSequence();
  // Replay transitions, including springs and trail history, for accurate seeking.
  const target = clamp(milliseconds, 0, DURATION - 1);
  while (sequenceTime < target) advanceSequence(Math.min(1000 / 60, target - sequenceTime));
  syncUI();
}
function stopSequence() {
  sequenceOn = false;
  mainFace.choreographed = false;
  mainFace.renderer.update({ choreographed: false, expression: null });
  $('#sequenceLabel').textContent = 'Free play';
  syncUI();
}
function syncTimeline() {
  $('#timeline').value = sequenceTime;
  $('#timeOutput').value = `${(sequenceTime / 1000).toFixed(1)} / 30.8 s`;
}
function syncUI() {
  $('#nowPlaying').textContent = `${mainFace.shape} · ${mainFace.color} · ${mainFace.state.replaceAll('-', ' ')}`;
  shapeSelect.value = mainFace.shape;
  stateSelect.value = mainFace.state;
  document.querySelectorAll('.swatch').forEach(item => {
    const active = item.dataset.color === mainFace.color;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('.state-chip').forEach(item => {
    const active = item.dataset.state === mainFace.state;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  const button = $('#autoplayButton');
  button.classList.toggle('is-on', sequenceOn);
  button.setAttribute('aria-pressed', String(sequenceOn));
  button.querySelector('span:nth-child(2)').textContent = sequenceOn ? 'Demo sequence is on' : 'Play demo sequence';
  $('#gazeHint').textContent = sequenceOn ? 'following the demo sequence' : 'move your pointer';
  $('#pauseButton').setAttribute('aria-pressed', String(paused));
  $('#pauseButton span:last-child').textContent = paused ? 'Resume' : 'Pause';
}
function choose(change) {
  stopSequence();
  change();
  syncUI();
}

SHAPES.forEach(shape => shapeSelect.add(new Option(DATA.shapes[shape].label, shape)));
STATES.forEach(state => stateSelect.add(new Option(state.replaceAll('-', ' '), state)));
COLORS.forEach(color => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'swatch';
  button.style.setProperty('--swatch', color.value);
  button.dataset.color = color.id;
  button.title = color.id;
  button.setAttribute('aria-label', `Use ${color.id}`);
  button.addEventListener('click', () => choose(() => mainFace.setColor(color.id)));
  $('#colorSwatches').appendChild(button);
});
STATES.forEach(state => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'state-chip';
  button.textContent = state.replaceAll('-', ' ');
  button.dataset.state = state;
  button.addEventListener('click', () => {
    choose(() => mainFace.setState(state));
    $('#top').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' });
  });
  $('#stateList').appendChild(button);
});
shapeSelect.addEventListener('change', event => {
  // Entering free play synchronizes the controls, so capture the choice first.
  const shape = event.currentTarget.value;
  choose(() => mainFace.setShape(shape));
});
stateSelect.addEventListener('change', event => {
  const state = event.currentTarget.value;
  choose(() => mainFace.setState(state));
});
$('#speedRange').addEventListener('input', event => {
  speed = Number(event.target.value);
  $('#speedOutput').value = `${speed.toFixed(1)}×`;
});
$('#gazeRange').addEventListener('input', event => {
  gazeAmount = Number(event.target.value);
  $('#gazeOutput').value = `${Math.round(gazeAmount * 100)}%`;
  if (gazeAmount === 0) mainFace.setGaze(null);
});
$('#heroStage').addEventListener('pointermove', event => {
  if (sequenceOn || paused) return;
  const bounds = mainFace.renderer.svg.getBoundingClientRect();
  const cx = bounds.left + bounds.width / 2;
  const cy = bounds.top + bounds.height / 2;
  mainFace.setGaze({ x: cx + (event.clientX - cx) * gazeAmount, y: cy + (event.clientY - cy) * gazeAmount });
});
$('#heroStage').addEventListener('pointerleave', () => mainFace.setGaze(null));
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
  if (paused) return;
  choose(() => mainFace.action(button.dataset.action));
}));
$('#pauseButton').addEventListener('click', () => { paused = !paused; syncUI(); });
$('#autoplayButton').addEventListener('click', () => {
  if (sequenceOn) stopSequence();
  else { restartSequence(); paused = false; syncUI(); }
});
$('#replayButton').addEventListener('click', () => { restartSequence(); paused = false; syncUI(); });
$('#timeline').addEventListener('input', event => {
  paused = true;
  seekSequence(Number(event.target.value));
});
function randomize() {
  choose(() => {
    mainFace.setShape(randomItem(SHAPES));
    mainFace.setColor(randomItem(COLORS).id);
    mainFace.setState(randomItem(STATES));
  });
}
$('#randomizeButton').addEventListener('click', randomize);

const gallery = [];
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const item = gallery.find(item => item.specimen === entry.target);
    if (item) item.face.visible = entry.isIntersecting;
  }
}, { rootMargin: '60px' });
SHAPES.forEach((shape, index) => {
  const specimen = document.createElement('article');
  specimen.className = 'specimen';
  specimen.innerHTML = `<div class="mini-face"></div><button type="button" aria-label="Use ${shape} shape"></button><div class="specimen-label"><strong>${shape}</strong><span class="specimen-state"></span></div>`;
  $('#faceGrid').appendChild(specimen);
  const state = STATES[(index * 2 + 2) % STATES.length];
  const face = new Face(specimen.querySelector('.mini-face'), { shape, color: COLORS[index % COLORS.length].id, state, size: 128 });
  face.visible = false;
  specimen.querySelector('.specimen-state').textContent = state.replaceAll('-', ' ');
  specimen.querySelector('button').addEventListener('click', () => {
    choose(() => { mainFace.setShape(face.shape); mainFace.setColor(face.color); mainFace.setState(face.state); });
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' });
  });
  gallery.push({ specimen, face, offset: index });
  observer.observe(specimen);
});
let galleryStep = 0;
let lastFrame = performance.now();
let lastUI = '';
function animate(now) {
  const delta = Math.min(now - lastFrame, 50) * speed;
  lastFrame = now;
  if (!paused && !document.hidden) {
    if (sequenceOn) advanceSequence(delta);
    else mainFace.advance(delta);
    galleryTime += delta;
    if (galleryTime >= 6000) {
      galleryTime %= 6000;
      galleryStep++;
      for (const { specimen, face, offset } of gallery) {
        face.setState(STATES[(galleryStep + offset * 2) % STATES.length]);
        specimen.querySelector('.specimen-state').textContent = face.state.replaceAll('-', ' ');
      }
    }
    for (const { face } of gallery) if (face.visible) face.advance(delta);
  }
  const ui = `${mainFace.shape}/${mainFace.state}/${mainFace.color}`;
  if (ui !== lastUI) { lastUI = ui; syncUI(); }
  requestAnimationFrame(animate);
}
document.addEventListener('visibilitychange', () => { lastFrame = performance.now(); });
document.addEventListener('keydown', event => {
  if (event.target.matches('input, select, button')) return;
  if (event.key.toLowerCase() === 'r') randomize();
  if (event.code === 'Space') { event.preventDefault(); paused = !paused; syncUI(); }
});

// Small inspection surface for repeatable visual checks and automated validation.
window.faceLab = {
  get face() { return mainFace; },
  get status() { return { paused, speed, sequenceOn, sequenceTime, shape: mainFace.shape, state: mainFace.state }; },
  seek: seekSequence,
  pause(value = true) { paused = value; syncUI(); }
};
restartSequence();
requestAnimationFrame(animate);
