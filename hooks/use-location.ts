import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

interface Coords {
  latitude: number;
  longitude: number;
}

export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') {
        if (mounted) { setError('Location permission denied'); setLoading(false); }
        return;
      }
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((loc) => {
        if (mounted) {
          setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          setLoading(false);
        }
      });
    });
    return () => { mounted = false; };
  }, []);

  return { coords, error, loading };
}
