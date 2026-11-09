const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const BLACK_NOTES = new Set([1, 3, 6, 8, 10]);
const TOTAL_STEPS = 64;
const TICKS_PER_STEP = 120;
const notes = [];
let nextNoteId = 1;
let audioContext;
let scheduler;
let nextStepTime = 0;
let playbackStartTime = 0;
let currentStep = 0;
let playing = false;
let playhead;
let toastTimeout;

const rollBody = document.querySelector("#roll-body");
const rollScroll = document.querySelector("#roll-scroll");
const rulerGrid = document.querySelector("#ruler-grid");
const noteTotal = document.querySelector("#note-total");
const playButton = document.querySelector("#play-button");
const playLabel = document.querySelector("#play-label");
const playIcon = document.querySelector(".play-icon");
const tempoInput = document.querySelector("#tempo");
const lengthSelect = document.querySelector("#note-length");
const toast = document.querySelector("#toast");

function pitchName(pitch) {
  return `${NOTE_NAMES[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}

function createRoll() {
  for (let bar = 1; bar <= 4; bar += 1) {
    const label = document.createElement("div");
    label.className = "bar-label";
    label.textContent = `BAR ${String(bar).padStart(2, "0")}`;
    rulerGrid.append(label);
  }

  const fragment = document.createDocumentFragment();
  for (let pitch = 127; pitch >= 0; pitch -= 1) {
    const row = document.createElement("div");
    const pitchClass = pitch % 12;
    row.className = `pitch-row ${BLACK_NOTES.has(pitchClass) ? "black" : "white"}${pitchClass === 0 ? " octave" : ""}`;
    row.dataset.pitch = String(pitch);

    const key = document.createElement("div");
    key.className = "key-label";
    key.dataset.pitch = String(pitch);
    key.innerHTML = `<span>${pitchName(pitch)}</span><small>${pitch % 12 === 0 ? `OCT ${Math.floor(pitch / 12) - 1}` : ""}</small><i class="key-color"></i>`;

    const grid = document.createElement("div");
    grid.className = "step-grid";
    for (let step = 0; step < TOTAL_STEPS; step += 1) {
      const cell = document.createElement("div");
      cell.className = `step-cell${step % 4 === 3 ? " beat" : ""}${step % 16 === 15 ? " bar" : ""}`;
      cell.dataset.step = String(step);
      grid.append(cell);
    }

    row.append(key, grid);
    fragment.append(row);
  }
  rollBody.append(fragment);
  playhead = document.createElement("div");
  playhead.className = "playhead";
  playhead.hidden = true;
  rollBody.append(playhead);
  renderNotes();
  rollScroll.scrollTop = Math.max(0, (127 - 60) * 20 - 160);
}

function renderNotes() {
  rollBody.querySelectorAll(".note-block").forEach((note) => note.remove());
  for (const note of notes) {
    const row = rollBody.querySelector(`.pitch-row[data-pitch="${note.pitch}"] .step-grid`);
    const block = document.createElement("button");
    block.type = "button";
    block.className = "note-block";
    block.dataset.noteId = String(note.id);
    block.style.left = `calc(${note.start} * var(--step-width) + 2px)`;
    block.style.width = `calc(${Math.min(note.length, TOTAL_STEPS - note.start)} * var(--step-width) - 4px)`;
    block.title = `${pitchName(note.pitch)} · step ${note.start + 1} · click to remove`;
    block.setAttribute("aria-label", `Remove ${pitchName(note.pitch)} note at step ${note.start + 1}`);
    row.append(block);
  }
  noteTotal.textContent = `${notes.length} ${notes.length === 1 ? "NOTE" : "NOTES"}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("visible"), 2300);
}

function previewPitch(pitch) {
  const context = getAudioContext();
  const start = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = 440 * 2 ** ((pitch - 69) / 12);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.43);
}

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Web Audio is not supported in this browser.");
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

function addScheduledNote(note, startTime, secondsPerStep) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const start = Math.max(startTime, audioContext.currentTime);
  const duration = Math.max(0.045, note.length * secondsPerStep - 0.025);
  oscillator.type = "triangle";
  oscillator.frequency.value = 440 * 2 ** ((note.pitch - 69) / 12);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.11, start + 0.012);
  gain.gain.setValueAtTime(0.11, start + Math.max(0.02, duration - 0.025));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.01);
}

function scheduleAhead() {
  const secondsPerStep = 60 / Number(tempoInput.value) / 4;
  while (nextStepTime < audioContext.currentTime + 0.12) {
    for (const note of notes) {
      if (note.start === currentStep) addScheduledNote(note, nextStepTime, secondsPerStep);
    }
    nextStepTime += secondsPerStep;
    currentStep = (currentStep + 1) % TOTAL_STEPS;
  }
}

async function startPlayback() {
  try {
    audioContext = getAudioContext();
    await audioContext.resume();
    playing = true;
    currentStep = 0;
    nextStepTime = audioContext.currentTime + 0.05;
    playbackStartTime = nextStepTime;
    playButton.setAttribute("aria-label", "Pause playback");
    playLabel.textContent = "Playing";
    playIcon.textContent = "Ⅱ";
    playhead.hidden = false;
    scheduler = window.setInterval(scheduleAhead, 25);
    scheduleAhead();
    requestAnimationFrame(updatePlayhead);
  } catch (error) {
    showToast(error.message || "Could not start audio playback.");
  }
}

function stopPlayback() {
  if (scheduler) window.clearInterval(scheduler);
  scheduler = undefined;
  playing = false;
  playButton.setAttribute("aria-label", "Play");
  playLabel.textContent = "Play";
  playIcon.textContent = "▶";
  playhead.hidden = true;
}

function updatePlayhead() {
  if (!playing || !audioContext) return;
  const secondsPerStep = 60 / Number(tempoInput.value) / 4;
  const elapsed = Math.max(0, audioContext.currentTime - playbackStartTime);
  const step = ((Math.floor(elapsed / secondsPerStep) % TOTAL_STEPS) + TOTAL_STEPS) % TOTAL_STEPS;
  playhead.style.left = `calc(var(--key-width) + ${step} * var(--step-width))`;
  requestAnimationFrame(updatePlayhead);
}

function encodeVariableLength(value) {
  let buffer = value & 0x7f;
  const bytes = [];
  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= ((value & 0x7f) | 0x80);
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}

function createMidiFile() {
  const bpm = Number(tempoInput.value);
  const microsecondsPerBeat = Math.round(60000000 / bpm);
  const events = [
    { tick: 0, order: 0, bytes: [0xff, 0x51, 0x03, (microsecondsPerBeat >> 16) & 0xff, (microsecondsPerBeat >> 8) & 0xff, microsecondsPerBeat & 0xff] },
    { tick: 0, order: 1, bytes: [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08] },
  ];
  for (const note of notes) {
    const startTick = note.start * TICKS_PER_STEP;
    const endTick = startTick + note.length * TICKS_PER_STEP;
    events.push({ tick: startTick, order: 2, bytes: [0x90, note.pitch, 100] });
    events.push({ tick: endTick, order: 1, bytes: [0x80, note.pitch, 0] });
  }
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);

  const track = [];
  let previousTick = 0;
  for (const event of events) {
    track.push(...encodeVariableLength(event.tick - previousTick), ...event.bytes);
    previousTick = event.tick;
  }
  track.push(0x00, 0xff, 0x2f, 0x00);
  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 1, 0xe0];
  const trackHeader = [0x4d, 0x54, 0x72, 0x6b, (track.length >>> 24) & 0xff, (track.length >>> 16) & 0xff, (track.length >>> 8) & 0xff, track.length & 0xff];
  return new Uint8Array([...header, ...trackHeader, ...track]);
}

rollBody.addEventListener("click", (event) => {
  const noteBlock = event.target.closest(".note-block");
  if (noteBlock) {
    const index = notes.findIndex((note) => note.id === Number(noteBlock.dataset.noteId));
    if (index !== -1) notes.splice(index, 1);
    renderNotes();
    return;
  }

  const key = event.target.closest(".key-label");
  if (key) {
    const pitch = Number(key.dataset.pitch);
    rollBody.querySelector(".pitch-row.selected")?.classList.remove("selected");
    key.closest(".pitch-row").classList.add("selected");
    try {
      previewPitch(pitch);
    } catch (error) {
      showToast(error.message || "Could not play this note.");
    }
    return;
  }

  const cell = event.target.closest(".step-cell");
  if (!cell) return;
  const pitch = Number(cell.closest(".pitch-row").dataset.pitch);
  const start = Number(cell.dataset.step);
  notes.push({ id: nextNoteId++, pitch, start, length: Number(lengthSelect.value) });
  try {
    previewPitch(pitch);
  } catch (error) {
    showToast(error.message || "Could not play this note.");
  }
  renderNotes();
});

playButton.addEventListener("click", () => {
  if (playing) stopPlayback();
  else startPlayback();
});

document.querySelector("#stop-button").addEventListener("click", stopPlayback);

document.querySelector("#clear-button").addEventListener("click", () => {
  stopPlayback();
  notes.length = 0;
  renderNotes();
});

document.querySelector("#export-button").addEventListener("click", () => {
  if (notes.length === 0) {
    showToast("Add a few notes before exporting your MIDI.");
    return;
  }
  const file = new Blob([createMidiFile()], { type: "audio/midi" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "LocalMIDI.mid";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Your LocalMIDI pattern has been exported.");
});

tempoInput.addEventListener("change", () => {
  const tempo = Math.min(240, Math.max(40, Number(tempoInput.value) || 112));
  tempoInput.value = String(tempo);
});

createRoll();
requestAnimationFrame(updatePlayhead);
