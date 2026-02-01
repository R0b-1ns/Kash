import { useState, useEffect } from 'react';

/**
 * Hook pour débouncer une valeur.
 *
 * @param value La valeur à débouncer
 * @param delay Le délai en millisecondes
 * @returns La valeur débouncée
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Mettre à jour la valeur débouncée après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Annuler le timeout si la valeur change (ou si le composant est démonté)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
