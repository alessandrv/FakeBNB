import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokens } = useAuth();

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const error = searchParams.get('error');

    if (error) {
      navigate('/login', { 
        state: { 
          error: error === 'auth_failed' 
            ? 'Authentication failed. Please try again.' 
            : 'An error occurred during authentication.' 
        } 
      });
      return;
    }

    if (accessToken && refreshToken) {
      // Store tokens
      setTokens(accessToken, refreshToken);
      
      // Redirect to home or previous page
      navigate('/', { replace: true });
    } else {
      navigate('/login', { 
        state: { 
          error: 'Authentication failed. Please try again.' 
        } 
      });
    }
  }, [navigate, searchParams, setTokens]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Completing authentication...</h2>
        <p className="text-gray-600">Please wait while we log you in.</p>
      </div>
    </div>
  );
}; 