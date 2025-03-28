import React from 'react';
import { Card, CardBody, Input, Button, Link } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link as RouterLink } from 'react-router-dom';

export const Register = () => {
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Add registration logic here
  };

  const handleInputChange = (field: keyof typeof formData) => (value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardBody className="gap-6">
          <div className="text-center">
            <Icon icon="lucide:home" className="text-4xl text-primary mb-2" />
            <h1 className="text-2xl font-bold">Create an account</h1>
            <p className="text-default-500">Start managing your properties today</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.firstName}
                onValueChange={handleInputChange('firstName')}
                variant="bordered"
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onValueChange={handleInputChange('lastName')}
                variant="bordered"
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onValueChange={handleInputChange('email')}
              variant="bordered"
              startContent={<Icon icon="lucide:mail" />}
            />
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onValueChange={handleInputChange('password')}
              variant="bordered"
              startContent={<Icon icon="lucide:lock" />}
            />
            <Input
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onValueChange={handleInputChange('confirmPassword')}
              variant="bordered"
              startContent={<Icon icon="lucide:lock" />}
            />

            <Button type="submit" color="primary" fullWidth>
              Create Account
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