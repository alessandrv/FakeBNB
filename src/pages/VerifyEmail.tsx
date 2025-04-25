import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button, Card, CardBody, CardFooter, CardHeader } from '@heroui/react';
import { Icon } from '@iconify/react';

// Define API URL with fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshToken } = useAuth();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const email = searchParams.get('email');
      
      if (!token) {
        setError('Verification token is missing');
        setIsVerifying(false);
        return;
      }
      
      try {
        // Send verification request to the backend
        const response = await axios.post(`${API_URL}/api/auth/verify-email`, {
          token
        });
        
        console.log('Verification response:', response.data);
        
        // If verification was successful
        setIsSuccess(true);
        
        // If the user is logged in, refresh their token to update their verification status
        await refreshToken();
      } catch (err) {
        console.error('Verification error:', err);
        
        if (axios.isAxiosError(err) && err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError('Failed to verify email. The token may be invalid or expired.');
        }
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyEmail();
  }, [searchParams, refreshToken]);
  
  const handleContinue = () => {
    navigate('/');
  };
  
  return (
    <div className="max-w-md mx-auto p-4 mt-8">
      <Card>
        <CardHeader className="flex gap-3">
          <div className="flex flex-col">
            <p className="text-xl font-semibold">Email Verification</p>
          </div>
        </CardHeader>
        <CardBody>
          {isVerifying ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Icon icon="lucide:loader-2" className="animate-spin h-10 w-10 text-primary mb-4" />
              <p>Verifying your email address...</p>
            </div>
          ) : isSuccess ? (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="bg-success/10 p-3 rounded-full mb-4">
                <Icon icon="lucide:check" className="h-10 w-10 text-success" />
              </div>
              <p className="text-center text-lg font-medium mb-2">Email Verified Successfully!</p>
              <p className="text-center text-default-500 mb-4">
                Your email has been verified. You can now enjoy all features of ConnectLivin.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="bg-danger/10 p-3 rounded-full mb-4">
                <Icon icon="lucide:x" className="h-10 w-10 text-danger" />
              </div>
              <p className="text-center text-lg font-medium mb-2">Verification Failed</p>
              <p className="text-center text-default-500 mb-4">
                {error || 'An unknown error occurred during verification'}
              </p>
            </div>
          )}
        </CardBody>
        <CardFooter>
          <Button 
            color={isSuccess ? "primary" : "default"} 
            onClick={handleContinue}
            className="w-full"
          >
            {isSuccess ? 'Continue to Home' : 'Back to Home'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}; 