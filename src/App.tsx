import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Login } from './components/auth/login';
import { Register } from './components/auth/register';
import { Profile } from './pages/Profile';
import { NotFound } from './pages/NotFound';
import { SearchResults } from './pages/SearchResults';
import { PropertyDetails } from './pages/PropertyDetails';
import { BookingHistory } from './pages/BookingHistory';
import { Dashboard } from './pages/Dashboard';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="properties/:id" element={<PropertyDetails />} />
          <Route path="search" element={<SearchResults />} />
          <Route path="map" element={<Dashboard />} />
          
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
          
          {/* Protected Routes - only accessible when logged in */}
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
          
          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;