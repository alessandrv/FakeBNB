import React from 'react';
import { Card, CardBody, Input, Button, Link } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link as RouterLink } from 'react-router-dom';

export const Login = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Add login logic here
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

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onValueChange={setEmail}
              variant="bordered"
              startContent={<Icon icon="lucide:mail" />}
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onValueChange={setPassword}
              variant="bordered"
              startContent={<Icon icon="lucide:lock" />}
            />
            
            <div className="flex justify-between items-center">
              <Link href="#" size="sm">Forgot password?</Link>
            </div>

            <Button type="submit" color="primary" fullWidth>
              Sign In
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
            <Button variant="bordered" startContent={<Icon icon="logos:google-icon" />}>
              Google
            </Button>
            <Button variant="bordered" startContent={<Icon icon="logos:apple" />}>
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