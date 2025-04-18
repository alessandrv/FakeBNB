import { Routes, Route } from 'react-router-dom';
import { MobileNavbar } from './components/layout/MobileNavbar';
import { Home } from './pages/Home';
import { Login } from './components/auth/login';
import { Register } from './components/auth/register';
import { Profile } from './pages/Profile';
import { NotFound } from './pages/NotFound';
import { SearchResults } from './pages/SearchResults';
import { PropertyDetails } from './pages/PropertyDetails';
import { BookingHistory } from './pages/BookingHistory';
import Map from './pages/Map';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Faq } from './pages/faq';
import { Contact } from './pages/contact';
import { VerifyEmail } from './pages/VerifyEmail';
import Chat, { NavbarContext } from './pages/Chat';
import { ListingForm } from './pages/CreateHouse';
import { Spacer } from '@heroui/react';
import { PasswordGate } from './components/PasswordGate';
import { useState, useEffect } from 'react';
import { AuthCallback } from './components/auth/AuthCallback';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hideNavbar, setHideNavbar] = useState(false);

  // Check if user has already entered the password
  useEffect(() => {
    const hasEnteredPassword = localStorage.getItem('hasEnteredPassword');
    if (hasEnteredPassword === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePasswordCorrect = () => {
    localStorage.setItem('hasEnteredPassword', 'true');
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <PasswordGate onPasswordCorrect={handlePasswordCorrect} />;
  }

  return (
    <AuthProvider>
      <NavbarContext.Provider value={{ hideNavbar, setHideNavbar }}>
        <Routes>
          {/* Routes WITH navbar */}
          <Route path="/" element={<MobileNavbar />}>
            <Route index element={<Home />} />
            <Route path="property/:id" element={<PropertyDetails />} />
            <Route path="search" element={<SearchResults />} />
            <Route path="map" element={<Map />} />
            <Route path="faq" element={<Faq />} />
            <Route path="contact" element={<Contact />} />
            <Route path="verify-email" element={<VerifyEmail />} />
            
            
            {/* Auth Pages - only accessible when NOT logged in */}
            <Route 
              path="login" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <Login />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="register" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <Register />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Routes with navbar - only accessible when logged in */}
            <Route 
              path="profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="bookings" 
              element={
                <ProtectedRoute>
                  <BookingHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="chat" 
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Route>
          
          {/* Routes WITHOUT navbar */}
          <Route 
            path="create-house" 
            element={
              <ProtectedRoute>
                <ListingForm />
              </ProtectedRoute>
            } 
          />
         
          <Route 
            path="chat/:conversationId" 
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } 
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </NavbarContext.Provider>
    </AuthProvider>
  );
}

export default App;