export function isProbablyMobile() {
  const hasTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0;

  const smallScreen = window.matchMedia('(max-width: 900px)').matches;

  return hasTouch || smallScreen;
}