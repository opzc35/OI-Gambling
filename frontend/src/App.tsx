import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './pages/Auth';
import Lobby from './pages/Lobby';
import Room from './pages/Room';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import './App.css';

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return user ? children : <Navigate to="/auth" />;
};

const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return !user ? children : <Navigate to="/lobby" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
      <Route path="/lobby" element={<PrivateRoute><Lobby /></PrivateRoute>} />
      <Route path="/room/:id" element={<PrivateRoute><Room /></PrivateRoute>} />
      <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/" element={<Navigate to="/lobby" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
