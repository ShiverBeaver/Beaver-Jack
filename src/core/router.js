// Small hash-based SPA router built on the History API.
// It lets the game switch screens without reloading the document while still
// supporting browser back/forward navigation.
export function createRouter({ onRouteChange }) {
  // Updates the URL hash and notifies the app about the new route.
  function goTo(route, options = {}) {
    const { push = true, level = null } = options;
    const url = level ? `#${route}?level=${level}` : `#${route}`;

    if (push) {
      history.pushState({ route, level }, '', url);
    }

    onRouteChange(route, { level });
  }

  // Parses URLs like #game?level=3 or #game?level=custom.
  function parseCurrentRoute() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) {
      return { route: 'menu', level: null };
    }

    const [routePart, queryString] = hash.split('?');
    const params = new URLSearchParams(queryString || '');
    const level = params.get('level');

    return {
      route: routePart || 'menu',
      level
    };
  }

  window.addEventListener('popstate', () => {
    const { route, level } = parseCurrentRoute();
    onRouteChange(route, { level });
  });

  return {
    goTo,
    parseCurrentRoute
  };
}