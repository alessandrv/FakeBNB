import React, { useState, useEffect } from 'react';
import { Card, CardBody, Input, Button, Link, Spinner } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Define API URL with a fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Rate limiting constants
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_RESET_TIME = 60; // seconds

// Helper to check rate limiting
const checkRateLimit = (): { canLogin: boolean, remainingTime: number } => {
  try {
    const now = Date.now();
    const storedData = localStorage.getItem('loginRateLimit');
    
    if (!storedData) {
      // No rate limit data, initialize it
      localStorage.setItem('loginRateLimit', JSON.stringify({
        attempts: 0,
        resetTime: now + (RATE_LIMIT_RESET_TIME * 1000)
      }));
      return { canLogin: true, remainingTime: 0 };
    }
    
    const rateData = JSON.parse(storedData);
    
    // Check if reset time has passed
    if (now > rateData.resetTime) {
      // Reset the counter
      localStorage.setItem('loginRateLimit', JSON.stringify({
        attempts: 0,
        resetTime: now + (RATE_LIMIT_RESET_TIME * 1000)
      }));
      return { canLogin: true, remainingTime: 0 };
    }
    
    // Check if max attempts reached
    if (rateData.attempts >= MAX_LOGIN_ATTEMPTS) {
      const remainingTime = Math.ceil((rateData.resetTime - now) / 1000);
      return { canLogin: false, remainingTime };
    }
    
    // Can login, return remaining attempts
    return { canLogin: true, remainingTime: 0 };
  } catch (err) {
    // In case of any errors with localStorage, allow login
    console.error('Error checking rate limit:', err);
    return { canLogin: true, remainingTime: 0 };
  }
};

// Helper to increment login attempt counter
const incrementLoginAttempt = (): void => {
  try {
    const storedData = localStorage.getItem('loginRateLimit');
    
    if (!storedData) {
      const now = Date.now();
      localStorage.setItem('loginRateLimit', JSON.stringify({
        attempts: 1,
        resetTime: now + (RATE_LIMIT_RESET_TIME * 1000)
      }));
      return;
    }
    
    const rateData = JSON.parse(storedData);
    rateData.attempts += 1;
    localStorage.setItem('loginRateLimit', JSON.stringify(rateData));
  } catch (err) {
    console.error('Error incrementing login attempts:', err);
  }
};

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginDisabled, setLoginDisabled] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if there's a message in the location state (e.g., from email verification)
  const locationMessage = location.state?.message;

  // Check rate limiting on component mount
  useEffect(() => {
    const rateLimit = checkRateLimit();
    if (!rateLimit.canLogin) {
      setLoginDisabled(true);
      setRetryAfter(rateLimit.remainingTime);
      setError(`Too many login attempts. Please try again in ${rateLimit.remainingTime} seconds.`);
    }
  }, []);

  // Countdown timer for rate limiting
  useEffect(() => {
    if (retryAfter === null || retryAfter <= 0) {
      setLoginDisabled(false);
      return;
    }

    const timer = setTimeout(() => {
      setRetryAfter(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [retryAfter]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    // Check client-side rate limiting
    const rateLimit = checkRateLimit();
    if (!rateLimit.canLogin) {
      setLoginDisabled(true);
      setRetryAfter(rateLimit.remainingTime);
      setError(`Too many login attempts. Please try again in ${rateLimit.remainingTime} seconds.`);
      return;
    }

    if (loginDisabled) {
      setError(`Too many login attempts. Please try again in ${retryAfter} seconds.`);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Increment login attempt before trying
    incrementLoginAttempt();
    
    try {
      await login(email, password);
      
      // Redirect to home page or previous page
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from);
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle rate limiting errors
      if (err.name === 'RateLimitError' || err.response?.status === 429) {
        const retrySeconds = err.retryAfter || 
          (err.response?.headers['retry-after'] ? parseInt(err.response.headers['retry-after'], 10) : 30);
        
        setLoginDisabled(true);
        setRetryAfter(retrySeconds);
        setError(`Too many login attempts. Please try again in ${retrySeconds} seconds.`);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.status === 401) {
        setError('Invalid email or password');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('An error occurred during login. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // OAuth handlers
  const handleGoogleSignIn = () => {
    // Check rate limiting before redirecting
    const rateLimit = checkRateLimit();
    if (!rateLimit.canLogin) {
      setLoginDisabled(true);
      setRetryAfter(rateLimit.remainingTime);
      setError(`Too many login attempts. Please try again in ${rateLimit.remainingTime} seconds.`);
      return;
    }
    
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const handleAppleSignIn = () => {
    // Check rate limiting before redirecting
    const rateLimit = checkRateLimit();
    if (!rateLimit.canLogin) {
      setLoginDisabled(true);
      setRetryAfter(rateLimit.remainingTime);
      setError(`Too many login attempts. Please try again in ${rateLimit.remainingTime} seconds.`);
      return;
    }
    
    window.location.href = `${API_URL}/api/auth/apple`;
  };

  // For development/testing - simulates a successful login
 

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

          {/* Error message */}
          {error && (
            <div className="p-3 bg-danger-100 border border-danger text-danger rounded-md">
              {error}
            </div>
          )}

          {/* Rate limit warning */}
          {loginDisabled && retryAfter && retryAfter > 0 && (
            <div className="p-3 bg-warning-100 border border-warning text-warning rounded-md">
              Login temporarily disabled. You can try again in {retryAfter} seconds.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onValueChange={setEmail}
              variant="bordered"
              startContent={<Icon icon="lucide:mail" />}
              isDisabled={isLoading || loginDisabled}
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onValueChange={setPassword}
              variant="bordered"
              startContent={<Icon icon="lucide:lock" />}
              isDisabled={isLoading || loginDisabled}
            />
            
            <div className="flex justify-between items-center">
              <Link as={RouterLink} to="/forgot-password" size="sm">Forgot password?</Link>
            </div>

            <Button 
              type="submit" 
              color="primary" 
              className="bg-gradient-to-tr from-gradient-first to-gradient-second text-primary-foreground"
              fullWidth
              disabled={isLoading || loginDisabled}
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
              disabled={isLoading || loginDisabled}
            >
              Google
            </Button>
            <Button 
              variant="bordered" 
              startContent={<Icon icon="logos:apple" />}
              onPress={handleAppleSignIn}
              disabled={isLoading || loginDisabled}
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