import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Results from './pages/Results';
import Dashboard from './pages/Dashboard';
import AuthModal from './components/AuthModal';
import HeroWave from './components/ui/dynamic-wave-canvas-background';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <BrowserRouter>
      <div className="global-wave-background">
        <HeroWave />
      </div>
      
      <Navbar user={user} onLoginClick={() => setIsAuthOpen(true)} onLogout={handleLogout} />
      
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onLoginSuccess={(u) => setUser(u)} 
      />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/results" element={<Results user={user} onLoginClick={() => setIsAuthOpen(true)} />} />
        <Route path="/dashboard" element={<Dashboard user={user} />} />
      </Routes>
    </BrowserRouter>
  );
}

