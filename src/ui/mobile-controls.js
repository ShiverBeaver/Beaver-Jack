// Pointer Events based mobile controls. 
// Swipe direction maps to the same grid movement directions as WASD.
const SWIPE_THRESHOLD_PX = 24;
const HOLD_START_MS = 180;

// Enables swipe and swipe-hold movement while a level is active.
// Returns a cleanup function to remove listeners when leaving the level.
export function enableSwipeControls({ element, heroController }) {
  if (!element || !heroController || !window.PointerEvent) {
    return () => {};
  }

  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let activeDirection = null;
  let holdTimeoutId = null;

  function clearHoldTimeout() {
    if (holdTimeoutId) {
      window.clearTimeout(holdTimeoutId);
      holdTimeoutId = null;
    }
  }

  function resetGesture() {
    clearHoldTimeout();
    heroController.stopDirectionHold(activeDirection);
    activePointerId = null;
    activeDirection = null;
  }

  // First performs one movement immediately, then starts repeated movement if
  // the player keeps holding the swipe direction.
  function beginDirection(direction) {
    if (!direction) return;

    const isSameDirection =
      activeDirection &&
      activeDirection.dx === direction.dx &&
      activeDirection.dz === direction.dz;

    if (isSameDirection) return;

    clearHoldTimeout();
    heroController.stopDirectionHold(activeDirection);
    activeDirection = direction;
    heroController.moveOnce(direction);

    holdTimeoutId = window.setTimeout(() => {
      if (activeDirection === direction) {
        heroController.startDirectionHold(direction);
      }
    }, HOLD_START_MS);
  }

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' || activePointerId !== null) return;

    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    activeDirection = null;

    element.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    if (event.pointerId !== activePointerId) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const direction = getSwipeDirection(dx, dy);

    if (direction) {
      event.preventDefault();
      beginDirection(direction);
    }
  }

  function handlePointerUp(event) {
    if (event.pointerId !== activePointerId) return;
    resetGesture();
  }

  function handlePointerCancel(event) {
    if (event.pointerId !== activePointerId) return;
    resetGesture();
  }

  element.addEventListener('pointerdown', handlePointerDown);
  element.addEventListener('pointermove', handlePointerMove);
  element.addEventListener('pointerup', handlePointerUp);
  element.addEventListener('pointercancel', handlePointerCancel);

  return () => {
    resetGesture();
    element.removeEventListener('pointerdown', handlePointerDown);
    element.removeEventListener('pointermove', handlePointerMove);
    element.removeEventListener('pointerup', handlePointerUp);
    element.removeEventListener('pointercancel', handlePointerCancel);
  };
}

// Converts pointer movement into one of the four tile directions.
function getSwipeDirection(dx, dy) {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (Math.max(absX, absY) < SWIPE_THRESHOLD_PX) {
    return null;
  }

  if (absX > absY) {
    return dx < 0 ? { dx: -1, dz: 0 } : { dx: 1, dz: 0 };
  }

  return dy < 0 ? { dx: 0, dz: -1 } : { dx: 0, dz: 1 };
}
