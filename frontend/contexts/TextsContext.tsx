import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';

interface TextsContextType {
  /** Get text by key with fallback to default value */
  t: (key: string, fallback: string) => string;
  isLoaded: boolean;
}

const TextsContext = createContext<TextsContextType | undefined>(undefined);

export function TextsProvider({ children }: { children: ReactNode }) {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTexts = async () => {
      const { data } = await api.getTexts();
      if (data) {
        setTexts(data);
      }
      setIsLoaded(true);
    };
    loadTexts();
  }, []);

  const t = useCallback((key: string, fallback: string): string => {
    return texts[key] || fallback;
  }, [texts]);

  return (
    <TextsContext.Provider value={{ t, isLoaded }}>
      {children}
    </TextsContext.Provider>
  );
}

export function useTexts() {
  const context = useContext(TextsContext);
  if (context === undefined) {
    throw new Error('useTexts must be used within a TextsProvider');
  }
  return context;
}
