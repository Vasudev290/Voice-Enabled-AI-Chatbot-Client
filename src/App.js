import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from './store';

// Components
import Header from './Components/Layout/Header';
import Login from './Components/Auth/Login';
import Register from './Components/Auth/Register';
import ChatInterface from './Components/Chat/ChatInterface';

// Simple route protection
const ProtectedRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  
  if (user) {
    return <Navigate to="/chat" replace />;
  }
  
  return children;
};

const AppContent = () => {
  const { user } = useSelector((state) => state.auth);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500">
      {user && <Header />}
      <Routes>
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } 
        />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <ChatInterface />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/chat" replace />} />
      </Routes>
      
      
    </div>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
};

export default App;