import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from './components/header';
import { CreateHouse } from './pages/create-house';
import { Settings } from './components/settings';
import { Dashboard } from './components/dashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create-house" element={<CreateHouse />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}