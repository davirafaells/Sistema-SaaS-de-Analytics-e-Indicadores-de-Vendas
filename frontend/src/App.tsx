import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login          from './pages/Login';
import Dashboard      from './pages/Dashboard';
import Upload         from './pages/Upload';
import SalesList      from './pages/SalesList';
import ProductsList   from './pages/ProductsList';
import Inconsistencies from './pages/Inconsistencies';
import Decisions      from './pages/Decisions';   // Sprint 7
import Layout         from './components/Layout';

const App: React.FC = () => {
  const isAuthenticated = () => !!localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          isAuthenticated() ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/sales" element={
          isAuthenticated() ? <Layout><SalesList /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/products" element={
          isAuthenticated() ? <Layout><ProductsList /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/inconsistencies" element={
          isAuthenticated() ? <Layout><Inconsistencies /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/decisions" element={
          isAuthenticated() ? <Layout><Decisions /></Layout> : <Navigate to="/login" />  // Sprint 7
        } />
        <Route path="/upload" element={
          isAuthenticated() ? <Layout><Upload /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;