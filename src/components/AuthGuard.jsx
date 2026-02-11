import { useState, useEffect } from 'react';
import { translations } from '../translations';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../hooks/useTheme';
import './AuthGuard.css';

export default function AuthGuard({ children, language, onLanguageChange }) {
  // Check if authentication is required via environment variable
  const disableAuth = import.meta.env.VITE_DISABLE_AUTH === 'true';
  
  // If auth is not required, render children directly
  if (disableAuth) {
    return children;
  }
  
  // Get current theme
  const theme = useTheme();
  
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Check authentication status from sessionStorage
  const authToken = sessionStorage.getItem('chronotunes_auth');
  const [isAuthenticated, setIsAuthenticated] = useState(authToken === 'authenticated');
  
  const t = translations[language];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Password is set during build via VITE_APP_PASSWORD environment variable
    const correctPassword = import.meta.env.VITE_APP_PASSWORD;
    
    if (!correctPassword) {
      setError('Authentication not configured');
      return;
    }
    
    if (password === correctPassword) {
      sessionStorage.setItem('chronotunes_auth', 'authenticated');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError(t.authIncorrectPassword);
      setPassword('');
    }
  };

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="auth-guard">
      <div className="auth-controls">
        <LanguageSelector currentLanguage={language} onLanguageChange={onLanguageChange} />
        <ThemeToggle />
      </div>
      <div className="auth-box">
        <h1>
          <img src={import.meta.env.BASE_URL + (theme === 'dark' ? 'logo-dark.svg' : 'logo.svg')} alt="ChronoTunes" className="title-logo" />
          {t.authTitle}
        </h1>
        <p>{t.authSubtitle}</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.authPasswordPlaceholder}
            autoFocus
          />
          {error && <p className="error">{error}</p>}
          <button type="submit">{t.authEnterButton}</button>
        </form>
      </div>
    </div>
  );
}
