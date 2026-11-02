import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Tab,
  Tabs,
  Grid
} from '@mui/material';
import { motion } from 'motion/react';
import { signupUser, loginUser } from '../utils/api';

const MotionPaper = motion(Paper);

export default function Auth() {
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
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
      email: '',
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
      const result = await signupUser(formData.name, formData.email, formData.password);
      setMessage('Account created successfully!');
      setMessageType('success');
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error creating account');
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
      const result = await loginUser(formData.email, formData.password);
      setMessage('Login successful!');
      setMessageType('success');
      // Here you would typically redirect or update global state
      console.log('Login result:', result);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error logging in');
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
        
        <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 3 }}>
          <Tab label="Login" />
          <Tab label="Sign Up" />
        </Tabs>

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
              label="Email"
              name="email"
              type="email"
              value={formData.email}
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
              {loading ? 'Logging in...' : 'Login'}
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
              label="Email"
              name="email"
              type="email"
              value={formData.email}
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
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </Box>
        )}
      </MotionPaper>
    </Container>
  );
} 