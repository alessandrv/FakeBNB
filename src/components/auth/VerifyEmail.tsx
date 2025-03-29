import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Spinner } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

// Define API URL with a fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get email either from location state (after registration) or from URL params
  const email = location.state?.email || searchParams.get('email') || '';
  const token = searchParams.get('token') || '';
  const message = location.state?.message || 'Please check your email to verify your account';

  // Auto-verify if token is present in URL
  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    setIsVerifying(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-email`, {
        token: verificationToken
      });
      
      setIsVerified(true);
      
      // Auto redirect after successful verification
      setTimeout(() => {
        navigate('/login', { 
          state: { message: 'Email verified successfully! You can now log in.' } 
        });
      }, 3000);
    } catch (error: any) {
      console.error('Verification error:', error);
      
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('An error occurred during verification. Please try again or contact support.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle resend verification email
  const resendVerification = async () => {
    if (!email) {
      setError('Email address is required to resend verification');
      return;
    }
    
    setIsVerifying(true);
    setError(null);
    
    try {
      await axios.post(`${API_URL}/api/auth/resend-verification`, {
        email
      });
      
      setError(null);
      // Show success message instead of error
      setIsVerified(false);
      alert('Verification email has been sent. Please check your inbox.');
    } catch (error: any) {
      console.error('Resend verification error:', error);
      
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('An error occurred. Please try again later or contact support.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardBody className="gap-6 text-center">
          {isVerified ? (
            // Success state
            <>
              <div className="text-success my-4">
                <Icon icon="lucide:check-circle" className="text-7xl mx-auto" />
              </div>
              <h1 className="text-2xl font-bold">Email Verified!</h1>
              <p className="text-default-500">Your email has been successfully verified.</p>
              <p className="text-default-500">Redirecting to login page...</p>
            </>
          ) : (
            // Verification needed state
            <>
              <div className="my-4">
                {token ? (
                  <Icon icon="lucide:loader" className="text-7xl mx-auto animate-spin" />
                ) : (
                  <Icon icon="lucide:mail-check" className="text-7xl mx-auto text-primary" />
                )}
              </div>
              <h1 className="text-2xl font-bold">Verify Your Email</h1>
              <p className="text-default-500">{message}</p>
              
              {email && (
                <div className="bg-default-100 p-3 rounded-md">
                  <p className="text-default-700 font-medium">{email}</p>
                </div>
              )}
              
              {error && (
                <div className="p-3 bg-danger-100 border border-danger text-danger rounded-md">
                  {error}
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Button 
                  color="primary" 
                  onClick={resendVerification}
                  disabled={isVerifying}
                >
                  {isVerifying ? <Spinner size="sm" color="white" /> : 'Resend Verification Email'}
                </Button>
                
                <Button 
                  variant="flat" 
                  onClick={() => navigate('/login')}
                >
                  Back to Login
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}; 