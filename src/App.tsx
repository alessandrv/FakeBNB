import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from './components/header';
import { CreateHouse } from './pages/create-house';
import { Settings } from './components/settings';
import { Dashboard } from './components/dashboard';
import { Login } from './components/auth/login';
import { Register } from './components/auth/register';
import { FAQ } from './pages/faq';
import { Contact } from './pages/contact';
import { Footer } from './components/footer';

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/create-house" element={<CreateHouse />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}