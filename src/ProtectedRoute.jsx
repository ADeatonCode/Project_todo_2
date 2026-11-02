import React from 'react';
import { Navigate } from 'react-router-dom';

export function readTodoUser() {
  try {
    const raw = localStorage.getItem('todoUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ children }) {
  if (!readTodoUser()) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}
