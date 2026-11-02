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
import ProtectedRoute, { AdminRoute, isAdminUser, readTodoUser } from './ProtectedRoute';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(readTodoUser);

  useEffect(() => {
    setUser(readTodoUser());
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('todoUser');
    setUser(null);
    navigate('/auth');
  };

  const admin = isAdminUser(user);

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          {user && (
            <>
              <Button color="inherit" component={Link} to="/">Dashboard</Button>
              <Button color="inherit" component={Link} to="/tasks">Tasks</Button>
              {admin && (
                <Button color="inherit" component={Link} to="/admin">Admin</Button>
              )}
            </>
          )}
          <Box sx={{ flexGrow: 1 }} />
          {user ? (
            <>
              <Typography variant="body1" sx={{ mr: 2 }}>
                {user.name}{admin ? ' (admin)' : ''}
              </Typography>
              <Button color="inherit" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/auth">Login/Signup</Button>
          )}
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
          <Route
            path="/auth"
            element={user ? <Navigate to="/tasks" replace /> : <Auth />}
          />
        </Routes>
      </Container>
    </>
  );
}
