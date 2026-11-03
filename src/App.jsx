import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import ProtectedRoute, { AdminRoute, isAdminUser, isHeadUser, readTodoUser } from './ProtectedRoute';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [, setUser] = useState(readTodoUser);

  useEffect(() => {
    const refresh = () => setUser(readTodoUser());
    refresh();
    window.addEventListener('todoUserUpdated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('todoUserUpdated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [location.pathname]);

  const session = readTodoUser();

  const handleLogout = () => {
    localStorage.removeItem('todoUser');
    setUser(null);
    navigate('/auth');
  };

  // Anonymous visitors never mount Dashboard / Tasks / Admin (no flash, no API calls).
  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }

  const admin = isAdminUser(session);
  const head = isHeadUser(session);

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ mr: 2 }}>
            Project TODO
          </Typography>
          <Button color="inherit" component={Link} to="/">Dashboard</Button>
          <Button color="inherit" component={Link} to="/tasks">Tasks</Button>
          {admin && (
            <Button color="inherit" component={Link} to="/admin">Admin</Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body1" sx={{ mr: 2 }}>
            {session.name}{head ? ' (head admin)' : admin ? ' (admin)' : ''}
          </Typography>
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <Tasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route path="/auth" element={<Navigate to="/tasks" replace />} />
        </Routes>
      </Container>
    </>
  );
}
