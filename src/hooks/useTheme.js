import { useState, useEffect } from 'react';

// Get system theme preference
const getSystemTheme = () => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

/**
 * Custom hook to get and track the current theme
 * @returns {string} Current theme ('light' or 'dark')
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || getSystemTheme();
  });
  
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      setTheme(currentTheme);
    });
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['data-theme'] 
    });
    return () => observer.disconnect();
  }, []);
  
  return theme;
}
