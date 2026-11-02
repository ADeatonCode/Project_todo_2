import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Analytics from './pages/Analytics';
import Auth from './pages/Auth';

function readTodoUser() {
  try {
    const raw = localStorage.getItem('todoUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Button color="inherit" component={Link} to="/">Dashboard</Button>
          <Button color="inherit" component={Link} to="/tasks">Tasks</Button>
          <Button color="inherit" component={Link} to="/analytics">Analytics</Button>
          <Box sx={{ flexGrow: 1 }} />
          {user ? (
            <>
              <Typography variant="body1" sx={{ mr: 2 }}>
                {user.name}
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </Container>
    </>
  );
}
