import React, { useState } from 'react';
import { Card, CardBody, Input, Button, Link, Spinner } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Define API URL with a fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if there's a message in the location state (e.g., from email verification)
  const locationMessage = location.state?.message;

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear field-specific error when the user edits a field
    if (errors[field]) {
      const updatedErrors = { ...errors };
      delete updatedErrors[field];
      setErrors(updatedErrors);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setApiError(null);
    
    try {
      await login(formData.email, formData.password);
      
      // Redirect to home page or previous page
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from);
    } catch (err: any) {
      console.error('Login error:', err);
      
      if (err.response?.data?.message) {
        setApiError(err.response.data.message);
      } else if (err.response?.status === 401) {
        setApiError('Invalid email or password');
      } else if (err.message) {
        setApiError(err.message);
      } else {
        setApiError('An error occurred during login. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // OAuth handlers
  const handleGoogleSignIn = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const handleAppleSignIn = () => {
    window.location.href = `${API_URL}/api/auth/apple`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardBody className="gap-6">
          <div className="text-center">
            <Icon icon="lucide:home" className="text-4xl text-primary mb-2" />
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-default-500">Sign in to manage your properties</p>
          </div>

          {/* Success message from verification */}
          {locationMessage && (
            <div className="p-3 bg-success-100 border border-success text-success rounded-md">
              {locationMessage}
            </div>
          )}

          {/* API Error */}
          {apiError && (
            <div className="p-3 bg-danger-100 border border-danger text-danger rounded-md">
              {apiError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onValueChange={(value) => handleChange('email', value)}
              variant="bordered"
              startContent={<Icon icon="lucide:mail" />}
              isInvalid={!!errors.email}
              errorMessage={errors.email}
              isDisabled={isLoading}
            />
            
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onValueChange={(value) => handleChange('password', value)}
              variant="bordered"
              startContent={<Icon icon="lucide:lock" />}
              isInvalid={!!errors.password}
              errorMessage={errors.password}
              isDisabled={isLoading}
            />
            
            <div className="flex justify-between items-center">
              <Link as={RouterLink} to="/forgot-password" size="sm">Forgot password?</Link>
            </div>

            <Button 
              type="submit" 
              color="primary" 
              className="bg-gradient-to-tr from-gradient-first to-gradient-second text-primary-foreground"
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? <Spinner size="sm" color="white" /> : 'Sign In'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-content1 px-2 text-default-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="bordered" 
              startContent={<Icon icon="logos:google-icon" />}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              Google
            </Button>
            <Button 
              variant="bordered" 
              startContent={<Icon icon="logos:apple" />}
              onPress={handleAppleSignIn}
              disabled={isLoading}
            >
              Apple
            </Button>
          </div>

          <p className="text-center text-small">
            Don't have an account?{' '}
            <Link as={RouterLink} to="/register" color="primary">
              Sign up
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
};