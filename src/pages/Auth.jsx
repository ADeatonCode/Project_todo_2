import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Tab,
  Tabs
} from '@mui/material';
import { motion } from 'motion/react';
import { signupUser, loginUser } from '../utils/api';

const MotionPaper = motion(Paper);

function persistTodoUser(user) {
  if (!user) return;
  localStorage.setItem('todoUser', JSON.stringify({
    _id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role || 'user',
    token: user.token
  }));
}

function apiErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

export default function Auth() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setMessage('');
    setFormData({
      name: '',
      username: '',
      password: '',
      confirmPassword: ''
    });
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await signupUser(formData.name, formData.username, formData.password);
      persistTodoUser(result);
      setMessage('Account created successfully!');
      setMessageType('success');
      navigate('/tasks');
    } catch (error) {
      setMessage(apiErrorMessage(error, 'Error creating account'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await loginUser(formData.username, formData.password);
      persistTodoUser(result);
      setMessage('Login successful!');
      setMessageType('success');
      navigate('/tasks');
    } catch (error) {
      setMessage(apiErrorMessage(error, 'Invalid username or password'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <MotionPaper
        elevation={8}
        sx={{ p: 4, borderRadius: 3 }}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" align="center" gutterBottom>
          Welcome
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 2 }}>
          Visitors are welcome to create an account and try the full task features. Your list is private.
        </Typography>

        <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 3 }}>
          <Tab label="Login" />
          <Tab label="Sign Up" />
        </Tabs>

        <Alert severity="info" sx={{ mb: 2 }}>
          {loading
            ? 'Waking server / this can take a minute...'
            : 'The login process could take a few minutes while the server wakes up — please be patient.'}
        </Alert>

        {message && (
          <Alert severity={messageType} sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}

        {/* Login Form */}
        {tabValue === 0 && (
          <Box component="form" onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              type="text"
              autoComplete="username"
              value={formData.username}
              onChange={handleInputChange}
              margin="normal"
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleInputChange}
              margin="normal"
              required
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 2, py: 1.5 }}
            >
              {loading ? 'Waking server / this can take a minute...' : 'Login'}
            </Button>
          </Box>
        )}

        {/* Signup Form */}
        {tabValue === 1 && (
          <Box component="form" onSubmit={handleSignup}>
            <TextField
              fullWidth
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              margin="normal"
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Username"
              name="username"
              type="text"
              autoComplete="username"
              value={formData.username}
              onChange={handleInputChange}
              margin="normal"
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleInputChange}
              margin="normal"
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              margin="normal"
              required
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 2, py: 1.5 }}
            >
              {loading ? 'Waking server / this can take a minute...' : 'Sign Up'}
            </Button>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
          Open this app over https:// so the browser treats the login as secure.
        </Typography>
      </MotionPaper>
    </Container>
  );
} 