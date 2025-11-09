import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Integrations from './pages/Integrations';
import Contacts from './pages/Contacts';
import Messages from './pages/Messages';
import ApiKeys from './pages/ApiKeys';
import Webhooks from './pages/Webhooks';

const isAuthed = () => !!localStorage.getItem('token');

export default function App() {
  return (
    <Routes>
      <Route path='/login' element={<Login/>} />
      <Route path='/dashboard' element={isAuthed() ? <Dashboard/> : <Navigate to='/login'/>} />
      <Route path='/integrations' element={isAuthed() ? <Integrations/> : <Navigate to='/login'/>} />
      <Route path='/contacts' element={isAuthed() ? <Contacts/> : <Navigate to='/login'/>} />
      <Route path='/messages' element={isAuthed() ? <Messages/> : <Navigate to='/login'/>} />
      <Route path='/messages/:filter' element={isAuthed() ? <Messages/> : <Navigate to='/login'/>} />
      <Route path='/api-keys' element={isAuthed() ? <ApiKeys/> : <Navigate to='/login'/>} />
      <Route path='/webhooks' element={isAuthed() ? <Webhooks/> : <Navigate to='/login'/>} />
      <Route path='*' element={<Navigate to={isAuthed() ? '/dashboard' : '/login'} />} />
    </Routes>
  );
}
