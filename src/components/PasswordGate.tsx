import React, { useState } from 'react';
import { Input, Button, Card } from '@heroui/react';
import { Icon } from '@iconify/react';

interface PasswordGateProps {
  onPasswordCorrect: () => void;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({ onPasswordCorrect }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(false);

    // Simulate API call to verify password
    // In a real app, you would make an actual API call here
    setTimeout(() => {
      if (password === 'Alessandro1!') { // Replace with your desired password
        onPasswordCorrect();
      } else {
        setError(true);
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-default-50 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <Icon 
            icon="lucide:lock" 
            className="w-16 h-16 mx-auto text-primary mb-4"
          />
          <h1 className="text-2xl font-bold mb-2">Welcome</h1>
          <p className="text-default-500">
            Please enter the password to access the website
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            errorMessage={error ? "Incorrect password" : undefined}
            isInvalid={error}
            placeholder="Enter password"
            startContent={
              <Icon icon="lucide:lock" className="text-default-400" />
            }
          />

          <Button
            type="submit"
            color="primary"
            className="w-full"
            isLoading={isLoading}
          >
            {isLoading ? "Verifying..." : "Enter"}
          </Button>
        </form>
      </Card>
    </div>
  );
}; 