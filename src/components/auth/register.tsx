import React, { useState } from 'react';
import { Card, CardBody, Input, Button, Link, Spinner } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Define API URL with a fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const navigate = useNavigate();

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
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[0-9\s-()]{10,15}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Phone number is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setApiError(null);
    
    try {
      // Map form data to match API's expected format
      const userData = {
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phoneNumber,
      };
      
      // Make API call to register
      const response = await axios.post(`${API_URL}/api/auth/register`, userData);
      
      // Store tokens in localStorage
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      
      // Redirect to verification page with message
      navigate('/login', { 
        state: { 
          message: 'Registration successful! Please check your email to verify your account.' 
        } 
      });
      
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Handle validation errors from backend
      if (err.response?.data?.errors) {
        const backendErrors = err.response.data.errors;
        const formattedErrors: Record<string, string> = {};
        
        // Map backend errors to form fields
        backendErrors.forEach((error: any) => {
          const field = error.param === 'first_name' ? 'firstName' : 
                       error.param === 'last_name' ? 'lastName' :
                       error.param === 'phone_number' ? 'phoneNumber' : error.param;
          
          formattedErrors[field] = error.msg;
        });
        
        setErrors(formattedErrors);
      } else if (err.response?.data?.message) {
        // Handle general error message
        setApiError(err.response.data.message);
      } else {
        setApiError('An error occurred during registration. Please try again.');
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
            <h1 className="text-2xl font-bold">Create an account</h1>
            <p className="text-default-500">Join our community of hosts and travelers</p>
          </div>

          {/* API Error */}
          {apiError && (
            <div className="p-3 bg-danger-100 border border-danger text-danger rounded-md">
              {apiError}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.firstName}
                onValueChange={(value) => handleChange('firstName', value)}
                variant="bordered"
                isInvalid={!!errors.firstName}
                errorMessage={errors.firstName}
                isDisabled={isLoading}
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onValueChange={(value) => handleChange('lastName', value)}
                variant="bordered"
                isInvalid={!!errors.lastName}
                errorMessage={errors.lastName}
                isDisabled={isLoading}
              />
            </div>
            
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
              label="Phone Number"
              type="tel"
              value={formData.phoneNumber}
              onValueChange={(value) => handleChange('phoneNumber', value)}
              variant="bordered"
              startContent={<Icon icon="lucide:phone" />}
              isInvalid={!!errors.phoneNumber}
              errorMessage={errors.phoneNumber}
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
            
            <Input
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onValueChange={(value) => handleChange('confirmPassword', value)}
              variant="bordered"
              startContent={<Icon icon="lucide:lock" />}
              isInvalid={!!errors.confirmPassword}
              errorMessage={errors.confirmPassword}
              isDisabled={isLoading}
            />

            <Button 
              type="submit" 
              color="primary" 
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? <Spinner size="sm" color="white" /> : 'Sign Up'}
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
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              Google
            </Button>
            <Button 
              variant="bordered" 
              startContent={<Icon icon="logos:apple" />}
              onClick={handleAppleSignIn}
              disabled={isLoading}
            >
              Apple
            </Button>
          </div>

          <p className="text-center text-small">
            Already have an account?{' '}
            <Link as={RouterLink} to="/login" color="primary">
              Sign in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
};