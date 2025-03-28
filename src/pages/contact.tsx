import React from 'react';
import { Card, CardBody, Input, Textarea, Button } from '@heroui/react';
import { Icon } from '@iconify/react';

export const Contact = () => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
          <p className="text-default-500 mb-8">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Icon icon="lucide:map-pin" className="text-xl text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Office Location</h3>
                <p className="text-default-500">123 Property St, NY 10001</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Icon icon="lucide:phone" className="text-xl text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Phone</h3>
                <p className="text-default-500">+1 (555) 123-4567</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Icon icon="lucide:mail" className="text-xl text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Email</h3>
                <p className="text-default-500">support@homemanager.com</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <Card>
            <CardBody className="gap-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Name"
                  placeholder="Your name"
                  value={formData.name}
                  onValueChange={(value) => setFormData({ ...formData, name: value })}
                />
                <Input
                  label="Email"
                  placeholder="your.email@example.com"
                  type="email"
                  value={formData.email}
                  onValueChange={(value) => setFormData({ ...formData, email: value })}
                />
                <Input
                  label="Subject"
                  placeholder="How can we help?"
                  value={formData.subject}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                />
                <Textarea
                  label="Message"
                  placeholder="Your message"
                  value={formData.message}
                  onValueChange={(value) => setFormData({ ...formData, message: value })}
                  minRows={4}
                />
                <Button color="primary" type="submit" fullWidth>
                  Send Message
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};