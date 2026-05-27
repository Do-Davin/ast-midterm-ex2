import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotesPage from './pages/NotesPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <BrowserRouter>
      <Navbar isLoggedIn={!!token} onLogout={handleLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={setToken} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/notes"
            element={token ? <NotesPage /> : <Navigate to="/login" replace />}
          />
          <Route path="/" element={<Navigate to="/notes" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
