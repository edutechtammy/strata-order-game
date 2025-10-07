// Improved rebuild with pointer (touch) drag support and keyboard accessibility
const pieces = [
  { id: 'p1', img: 'assets/4109_56_56.png', name: 'Fossil A' },
  { id: 'p2', img: 'assets/4114_56_56.png', name: 'Fossil B' },
  { id: 'p3', img: 'assets/4119_58_56.png', name: 'Fossil C' },
  { id: 'p4', img: 'assets/4124_56_56.png', name: 'Fossil D' },
  { id: 'p5', img: 'assets/4129_56_56.png', name: 'Fossil E' },
  { id: 'p6', img: 'assets/4134_56_56.png', name: 'Fossil F' },
  { id: 'p7', img: 'assets/4139_56_56.png', name: 'Fossil G' }
];

let state = { placements: [null, null, null, null, null, null, null] };

function getPieceNameById(id) {
  const p = pieces.find(x => x.id === id);
  return p ? p.name : id;
}

const piecesContainer = document.getElementById('piecesContainer');
const message = document.getElementById('message');
const strataEls = Array.from(document.querySelectorAll('.stratum'));
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');

// History for undo/redo: store snapshots of state.placements arrays
// history stores objects: { snap: Array, desc: string }
let history = [];
let historyIndex = -1; // points at current snapshot

function pushHistory(desc) {
  // truncate any redo states
  history = history.slice(0, historyIndex + 1);
  const snapshot = state.placements.slice();
  history.push({ snap: snapshot, desc: desc || message.textContent || '' });
  historyIndex = history.length - 1;
  updateHistoryButtons();
}

function updateHistoryButtons() {
  undoBtn.disabled = historyIndex <= 0;
  redoBtn.disabled = historyIndex >= history.length - 1 || historyIndex === -1;
}

function applyPlacementSnapshot(snapshot) {
  // clear all strata nodes
  strataEls.forEach(s => {
    const p = s.querySelector('.piece');
    if (p) s.removeChild(p);
  });
  // clear pool
  piecesContainer.innerHTML = '';
  // reconstruct: for each placement slot, if snapshot has an id, find piece data and append
  const remaining = new Set(pieces.map(p => p.id));
  snapshot.forEach((pid, idx) => {
    if (pid) {
      const pDef = pieces.find(p => p.id === pid);
      if (pDef) {
        const el = createPieceEl(pDef);
        strataEls[idx].appendChild(el);
        remaining.delete(pid);
      }
    }
  });
  // append remaining pieces to pool
  Array.from(remaining).forEach(id => {
    const pDef = pieces.find(p => p.id === id);
    if (pDef) piecesContainer.appendChild(createPieceEl(pDef));
  });
  // update state
  state.placements = snapshot.slice();
  updateStratumHeights();
}

// human-friendly name for a stratum (reads hidden sr-only label if present)
function getStratumName(idx) {
  const labelEl = document.getElementById(`stratum-label-${idx}`);
  if (labelEl && labelEl.textContent) {
    let text = labelEl.textContent.trim();
    // strip leading 'Stratum N:' if present
    text = text.replace(/^Stratum\s*\d+\s*:\s*/i, '');
    if (/^Stratum\s*\d+$/i.test(labelEl.textContent) || text === '') {
      return `layer ${idx}`;
    }
    return text;
  }
  return `layer ${idx}`;
}

// simple visual flash for moved/swapped pieces
function flashElement(el) {
  if (!el) return;
  el.classList.add('recent-change');
  const remove = () => { el.classList.remove('recent-change'); el.removeEventListener('animationend', remove); };
  el.addEventListener('animationend', remove);
  // safety fallback
  setTimeout(() => el.classList.remove('recent-change'), 1200);
}


function createPieceEl(p) {
  const el = document.createElement('div');
  el.className = 'piece';
  el.tabIndex = 0; // make focusable for keyboard
  el.id = p.id;
  el.setAttribute('role', 'listitem');
  el.setAttribute('aria-grabbed', 'false');
  const img = document.createElement('img');
  img.src = p.img;
  img.alt = p.name;
  el.appendChild(img);

  // Pointer events for touch/mouse/pen
  el.addEventListener('pointerdown', onPointerDown);
  // keyboard support
  el.addEventListener('keydown', onKeyDown);
  return el;
}

function renderPieces(arr) {
  piecesContainer.innerHTML = '';
  arr.forEach(p => {
    piecesContainer.appendChild(createPieceEl(p));
  });
  // ensure stratum heights match piece image height + 10px after pieces are rendered
  updateStratumHeights();
}

// Set each .stratum height to the rendered image height plus 10px.
function updateStratumHeights() {
  // Measure all piece images (both in pool and placed) and use the tallest height.
  const imgs = Array.from(document.querySelectorAll('.piece img'));
  if (!imgs.length) return;

  const computeAndApply = () => {
    let maxH = 0;
    imgs.forEach(img => {
      const rect = img.getBoundingClientRect();
      if (rect.height > maxH) maxH = rect.height;
    });
    const targetH = Math.round(maxH) + 10;
    strataEls.forEach(s => { s.style.height = targetH + 'px'; });
  };

  // If all images are complete, apply immediately. Otherwise wait for each to load then apply.
  const notLoaded = imgs.filter(img => !img.complete || !img.naturalHeight);
  if (notLoaded.length === 0) {
    computeAndApply();
  } else {
    let remaining = notLoaded.length;
    notLoaded.forEach(img => {
      img.addEventListener('load', () => {
        remaining -= 1;
        if (remaining === 0) computeAndApply();
      }, { once: true });
    });
    // also compute after a short timeout in case some images don't fire load (cached, errors)
    setTimeout(computeAndApply, 300);
  }
}


// Pointer drag handling (works on touch, pen, mouse)
let dragSrc = null;
let dragOriginIndex = null; // index of origin stratum, or null if from pool
let ghostEl = null;
let hoverTimer = null;
let autoDropped = false;
const AUTO_DROP_DELAY = 600; // ms dwell time to auto-drop
function onPointerDown(e) {
  const el = e.currentTarget;
  // record origin: if parent is a stratum capture its index
  if (el.parentElement && el.parentElement.classList.contains('stratum')) {
    dragOriginIndex = strataEls.indexOf(el.parentElement);
  } else {
    dragOriginIndex = null;
  }
  // prevent default (avoid focus/click behavior) and capture pointer on the element itself
  e.preventDefault && e.preventDefault();
  e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
  dragSrc = el;
  dragSrc.setAttribute('aria-grabbed', 'true');
  dragSrc.classList.add('dragging');
  // create ghost preview
  if (!ghostEl) {
    ghostEl = document.createElement('div');
    ghostEl.className = 'ghost';
    const img = dragSrc.querySelector('img');
    if (img) {
      const gImg = document.createElement('img');
      gImg.src = img.src;
      gImg.alt = img.alt;
      gImg.style.width = '100%';
      ghostEl.appendChild(gImg);
    }
    document.body.appendChild(ghostEl);
  }
  // position initial ghost
  ghostEl.style.left = (e.clientX || (e.touches && e.touches[0].clientX) || 0) + 'px';
  ghostEl.style.top = (e.clientY || (e.touches && e.touches[0].clientY) || 0) + 'px';
  // add pointermove & up on document
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  // also handle pointercancel to clean up if the pointer is interrupted
  document.addEventListener('pointercancel', onPointerUp);
}

function onPointerMove(e) {
  // Identify strata under pointer
  const el = document.elementFromPoint(e.clientX, e.clientY);
  strataEls.forEach(s => s.classList.remove('over'));
  const s = el && el.closest && el.closest('.stratum');
  if (s) {
    s.classList.add('over');
    // start or reset hover timer for auto-drop
    if (hoverTimer) clearTimeout(hoverTimer);
    if (dragSrc) {
      hoverTimer = setTimeout(() => {
        // perform auto-drop at this pointer location
        performDrop(e.clientX, e.clientY);
        autoDropped = true;
      }, AUTO_DROP_DELAY);
    }
  } else {
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
  }
  // move ghost if present
  if (ghostEl) {
    ghostEl.style.left = e.clientX + 'px';
    ghostEl.style.top = e.clientY + 'px';
  }
}

// perform drop logic at given client coordinates (used for auto-drop)
function performDrop(clientX, clientY) {
  if (!dragSrc) return;
  const el = document.elementFromPoint(clientX, clientY);
  const s = el && el.closest && el.closest('.stratum');
  if (!s) return;
  const toIdx = strataEls.indexOf(s);
  const existing = s.querySelector('.piece');
  if (existing === dragSrc) {
    return;
  } else if (!existing) {
    if (dragOriginIndex !== null && dragOriginIndex >= 0) {
      state.placements[dragOriginIndex] = null;
    }
    s.appendChild(dragSrc);
    state.placements[toIdx] = dragSrc.id;
    const strName = getStratumName(toIdx);
    message.textContent = `Placed ${getPieceNameById(dragSrc.id)} into ${strName}.`;
    flashElement(dragSrc);
    pushHistory(message.textContent);
  } else {
    if (dragOriginIndex === null) {
      piecesContainer.appendChild(existing);
      s.appendChild(dragSrc);
      state.placements[toIdx] = dragSrc.id;
      const strName2 = getStratumName(toIdx);
      message.textContent = `Moved ${getPieceNameById(existing.id)} back to the pool and placed ${getPieceNameById(dragSrc.id)} into ${strName2}.`;
      flashElement(dragSrc);
      pushHistory(message.textContent);
    } else {
      const fromIdx = dragOriginIndex;
      const fromStratum = strataEls[fromIdx];
      fromStratum.appendChild(existing);
      s.appendChild(dragSrc);
      state.placements[toIdx] = dragSrc.id;
      state.placements[fromIdx] = existing.id;
      const nameA = getPieceNameById(dragSrc.id);
      const nameB = getPieceNameById(existing.id);
      const sTo = getStratumName(toIdx);
      const sFrom = getStratumName(fromIdx);
      message.textContent = `Swapped ${nameA} (to ${sTo}) with ${nameB} (to ${sFrom}).`;
      flashElement(dragSrc);
      flashElement(existing);
      pushHistory(message.textContent);
    }
  }
  strataEls.forEach(s => s.classList.remove('over'));
}

function onPointerUp(e) {
  document.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('pointerup', onPointerUp);
  document.removeEventListener('pointercancel', onPointerUp);
  if (!dragSrc) return;
  // remove hover timer
  if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
  // remove ghost
  if (ghostEl && ghostEl.parentElement) ghostEl.parentElement.removeChild(ghostEl);
  ghostEl = null;
  dragSrc.classList.remove('dragging');
  dragSrc.setAttribute('aria-grabbed', 'false');

  // find drop target
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const s = el && el.closest && el.closest('.stratum');
  if (s) {
    // if autoDropped already handled drop, skip
    if (autoDropped) { autoDropped = false; strataEls.forEach(s => s.classList.remove('over')); dragSrc = null; dragOriginIndex = null; return; }
    const toIdx = strataEls.indexOf(s);
    const existing = s.querySelector('.piece');
    // if dropping into the same stratum nothing to do
    if (existing === dragSrc) {
      /* noop */
    } else if (!existing) {
      // empty target: move dragSrc here
      // if origin was a stratum, clear that placement
      if (dragOriginIndex !== null && dragOriginIndex >= 0) {
        state.placements[dragOriginIndex] = null;
      }
      s.appendChild(dragSrc);
      state.placements[toIdx] = dragSrc.id;
      const strName = getStratumName(toIdx);
      message.textContent = `Placed ${getPieceNameById(dragSrc.id)} into ${strName}.`;
      flashElement(dragSrc);
      // record history with description
      pushHistory(message.textContent);
    } else {
      // occupied target: swap
      if (dragOriginIndex === null) {
        // from pool: move existing back to pool
        piecesContainer.appendChild(existing);
        s.appendChild(dragSrc);
        state.placements[toIdx] = dragSrc.id;
        const strName2 = getStratumName(toIdx);
        message.textContent = `Moved ${getPieceNameById(existing.id)} back to the pool and placed ${getPieceNameById(dragSrc.id)} into ${strName2}.`;
        flashElement(dragSrc);
        // record history
        pushHistory(message.textContent);
      } else {
        // from another stratum: swap nodes
        const fromIdx = dragOriginIndex;
        const fromStratum = strataEls[fromIdx];
        // move existing into origin
        fromStratum.appendChild(existing);
        // move dragged into target
        s.appendChild(dragSrc);
        // update placements
        state.placements[toIdx] = dragSrc.id;
        state.placements[fromIdx] = existing.id;
        const nameA = getPieceNameById(dragSrc.id);
        const nameB = getPieceNameById(existing.id);
        const sTo = getStratumName(toIdx);
        const sFrom = getStratumName(fromIdx);
        message.textContent = `Swapped ${nameA} (to ${sTo}) with ${nameB} (to ${sFrom}).`;
        flashElement(dragSrc);
        flashElement(existing);
      }
      // record history after swap
      pushHistory();
    }
  }
  strataEls.forEach(s => s.classList.remove('over'));
  dragSrc = null;
  dragOriginIndex = null;
}

// Keyboard: allow focused piece to be moved with Enter or space into a selected stratum
let keyboardSelectedPiece = null;
function onKeyDown(e) {
  const el = e.currentTarget;
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    // toggle selection
    if (keyboardSelectedPiece === el) {
      // deselect
      keyboardSelectedPiece.classList.remove('selected');
      keyboardSelectedPiece = null;
      message.textContent = '';
    } else {
      if (keyboardSelectedPiece) keyboardSelectedPiece.classList.remove('selected');
      keyboardSelectedPiece = el;
      el.classList.add('selected');
      message.textContent = 'Piece selected. Navigate to a stratum and press Enter to place.';
      // focus first stratum for convenience
      strataEls[0].focus();
    }
  }
}

// Make strata focusable and keyboard-drop capable
strataEls.forEach((s, idx) => {
  s.tabIndex = 0;
  s.addEventListener('focus', () => s.classList.add('focus'));
  s.addEventListener('blur', () => s.classList.remove('focus'));
  s.addEventListener('keydown', (e) => {
    // If Enter/Space and a piece is selected, drop it here
    if ((e.key === 'Enter' || e.key === ' ') && keyboardSelectedPiece) {
      e.preventDefault();
      // determine origin (null for pool or index for stratum)
      const originEl = keyboardSelectedPiece.parentElement;
      const originIdx = (originEl && originEl.classList && originEl.classList.contains('stratum')) ? strataEls.indexOf(originEl) : null;
      const occupied = s.querySelector('.piece');
      const toIdx = idx;
      if (!occupied) {
        // empty: move here
        if (originIdx !== null) state.placements[originIdx] = null;
        s.appendChild(keyboardSelectedPiece);
        state.placements[toIdx] = keyboardSelectedPiece.id;
        const sName = getStratumName(toIdx);
        message.textContent = `Placed ${getPieceNameById(keyboardSelectedPiece.id)} into ${sName}.`;
        flashElement(keyboardSelectedPiece);
        pushHistory(message.textContent);
      } else {
        // occupied: swap
        if (originIdx === null) {
          // from pool: move existing back to pool
          piecesContainer.appendChild(occupied);
          s.appendChild(keyboardSelectedPiece);
          state.placements[toIdx] = keyboardSelectedPiece.id;
          const sName2 = getStratumName(toIdx);
          message.textContent = `Moved ${getPieceNameById(occupied.id)} back to the pool and placed ${getPieceNameById(keyboardSelectedPiece.id)} into ${sName2}.`;
          flashElement(keyboardSelectedPiece);
          pushHistory(message.textContent);
        } else {
          const fromIdx = originIdx;
          const fromStratum = strataEls[fromIdx];
          // swap
          fromStratum.appendChild(occupied);
          s.appendChild(keyboardSelectedPiece);
          state.placements[toIdx] = keyboardSelectedPiece.id;
          state.placements[fromIdx] = occupied.id;
          const kName = getPieceNameById(keyboardSelectedPiece.id);
          const oName = getPieceNameById(occupied.id);
          const sToName = getStratumName(toIdx);
          const sFromName = getStratumName(fromIdx);
          message.textContent = `Swapped ${kName} (to ${sToName}) with ${oName} (to ${sFromName}).`;
          flashElement(keyboardSelectedPiece);
          flashElement(occupied);
          pushHistory(message.textContent);
        }
      }
      keyboardSelectedPiece.classList.remove('selected');
      keyboardSelectedPiece.focus();
      keyboardSelectedPiece = null;
      message.textContent = '';
    }
  });
  // pointer hover visuals
  s.addEventListener('pointerenter', () => {
    // only show the drop target highlight when a piece is actively being dragged
    if (dragSrc) s.classList.add('over');
  });
  s.addEventListener('pointerleave', () => s.classList.remove('over'));
});

// Controls

document.getElementById('resetBtn').addEventListener('click', () => {
  // clear any pieces from strata first (remove nodes)
  strataEls.forEach(s => {
    const p = s.querySelector('.piece');
    if (p) s.removeChild(p);
  });
  // reset state and re-render fresh piece elements
  state.placements = [null, null, null, null, null, null, null];
  renderPieces(pieces);
  message.textContent = '';
  // record reset in history
  pushHistory();
});

// Undo / Redo handlers
undoBtn.addEventListener('click', () => {
  if (historyIndex > 0) {
    const prev = history[historyIndex];
    historyIndex -= 1;
    const next = history[historyIndex];
    applyPlacementSnapshot(next.snap);
    updateHistoryButtons();
    // announce description if present
    message.textContent = next.desc || 'Undo performed.';
    // flash any pieces that changed between prev and next
    if (prev && prev.snap && next && next.snap) {
      prev.snap.forEach((pid, i) => {
        if (pid !== next.snap[i]) {
          const el = document.getElementById(next.snap[i] || pid);
          if (el) flashElement(el);
        }
      });
    }
  }
});

redoBtn.addEventListener('click', () => {
  if (historyIndex < history.length - 1) {
    const prev = history[historyIndex];
    historyIndex += 1;
    const next = history[historyIndex];
    applyPlacementSnapshot(next.snap);
    updateHistoryButtons();
    message.textContent = next.desc || 'Redo performed.';
    if (prev && prev.snap && next && next.snap) {
      prev.snap.forEach((pid, i) => {
        if (pid !== next.snap[i]) {
          const el = document.getElementById(next.snap[i] || pid);
          if (el) flashElement(el);
        }
      });
    }
  }
});

// Keyboard shortcuts: Ctrl/Cmd+Z for Undo, Shift+Ctrl/Cmd+Z for Redo
window.addEventListener('keydown', (e) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const meta = isMac ? e.metaKey : e.ctrlKey;
  if (meta && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      // redo
      if (historyIndex < history.length - 1) {
        historyIndex += 1;
        applyPlacementSnapshot(history[historyIndex]);
        updateHistoryButtons();
        message.textContent = 'Redo performed.';
      }
    } else {
      // undo
      if (historyIndex > 0) {
        historyIndex -= 1;
        applyPlacementSnapshot(history[historyIndex]);
        updateHistoryButtons();
        message.textContent = 'Undo performed.';
      }
    }
  }
});

document.getElementById('checkBtn').addEventListener('click', () => {
  const placed = state.placements.filter(Boolean);
  if (placed.length !== 7) { message.textContent = 'Place all fossils before checking.'; return; }
  const set = new Set(placed);
  if (set.size !== 7) { message.textContent = 'Each stratum must contain a unique fossil.'; return; }
  // update this array to reflect the correct bottom-to-top order for 7 items
  const correct = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
  const isCorrect = state.placements.every((val, i) => val === correct[i]);
  if (isCorrect) { message.textContent = 'Correct! Well done.'; }
  else { message.textContent = 'Not quite — try rearranging and check again.'; }
});

// initial render
renderPieces(pieces);
// initialize history with empty placements (pool only)
pushHistory();

// adjust heights on window resize in case image rendering changes
window.addEventListener('resize', () => updateStratumHeights());

// Keyboard Navigation Modal functionality
const keyboardNavBtn = document.getElementById('keyboardNavBtn');
const keyboardModal = document.getElementById('keyboardModal');
const modalOverlay = keyboardModal?.querySelector('.modal-overlay');
const modalCloseBtn = keyboardModal?.querySelector('.modal-close');
const modalCloseFooterBtn = keyboardModal?.querySelector('.modal-close-btn');

function openModal() {
  if (!keyboardModal) return;

  keyboardModal.setAttribute('aria-hidden', 'false');
  keyboardModal.style.display = 'flex';

  // Focus the close button for keyboard accessibility
  const firstFocusable = modalCloseBtn || modalCloseFooterBtn;
  if (firstFocusable) {
    firstFocusable.focus();
  }

  // Trap focus within modal
  trapFocusInModal();
}

function closeModal() {
  if (!keyboardModal) return;

  keyboardModal.setAttribute('aria-hidden', 'true');
  keyboardModal.style.display = 'none';

  // Return focus to the button that opened the modal
  if (keyboardNavBtn) {
    keyboardNavBtn.focus();
  }

  // Remove focus trap
  document.removeEventListener('keydown', handleModalKeydown);
}

function trapFocusInModal() {
  const focusableElements = keyboardModal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  function handleModalKeydown(e) {
    if (e.key === 'Escape') {
      closeModal();
      return;
    }

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    }
  }

  document.addEventListener('keydown', handleModalKeydown);
}

// Event listeners for modal
if (keyboardNavBtn) {
  keyboardNavBtn.addEventListener('click', openModal);
}

if (modalCloseBtn) {
  modalCloseBtn.addEventListener('click', closeModal);
}

if (modalCloseFooterBtn) {
  modalCloseFooterBtn.addEventListener('click', closeModal);
}

if (modalOverlay) {
  modalOverlay.addEventListener('click', closeModal);
}

// Close modal on Escape key (global listener)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && keyboardModal && keyboardModal.getAttribute('aria-hidden') === 'false') {
    closeModal();
  }
});
