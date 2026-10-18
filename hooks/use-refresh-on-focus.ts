import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

// Re-runs `loadFn` every time a screen comes back into focus — e.g.
// returning to a list after accepting a quote, sending a message, or
// completing a payment elsewhere — so data doesn't go stale until the user
// manually pulls to refresh. Also fires on initial mount, so it fully
// replaces a plain `useEffect(() => { load() }, [])` used only for fetching.
//
// Callers don't need to memoize loadFn themselves — it's kept in a ref so
// the focus subscription (keyed on an empty dep array) only ever fires on
// real focus transitions, not on every render.
export function useRefreshOnFocus(loadFn: () => void) {
  const loadFnRef = useRef(loadFn);
  useEffect(() => {
    loadFnRef.current = loadFn;
  });

  useFocusEffect(
    useCallback(() => {
      loadFnRef.current();
    }, [])
  );
}
