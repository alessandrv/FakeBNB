import React from 'react';
import { Link } from '@heroui/react';
import { Link as RouterLink } from 'react-router-dom';
import { Icon } from '@iconify/react';

export const Footer = () => {
  return (
    <footer className="border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:home" className="text-2xl text-primary" />
              <span className="font-bold text-xl">ConnectLivin</span>
            </div>
            <p className="text-default-500 text-sm">
              Making property management easier and more efficient.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="text-default-500 hover:text-primary">
                <Icon icon="lucide:facebook" className="text-xl" />
              </Link>
              <Link href="#" className="text-default-500 hover:text-primary">
                <Icon icon="lucide:twitter" className="text-xl" />
              </Link>
              <Link href="#" className="text-default-500 hover:text-primary">
                <Icon icon="lucide:instagram" className="text-xl" />
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <div className="space-y-2">
              <Link as={RouterLink} to="/about" className="block text-default-500">About</Link>
              <Link as={RouterLink} to="/contact" className="block text-default-500">Contact</Link>
              <Link as={RouterLink} to="/faq" className="block text-default-500">FAQ</Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <div className="space-y-2">
              <Link href="#" className="block text-default-500">Terms of Service</Link>
              <Link href="#" className="block text-default-500">Privacy Policy</Link>
              <Link href="#" className="block text-default-500">Cookie Policy</Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <div className="space-y-2 text-default-500">
              <p className="flex items-center gap-2">
                <Icon icon="lucide:mail" />
                support@connectlivin.com
              </p>
              <p className="flex items-center gap-2">
                <Icon icon="lucide:phone" />
                +1 (555) 123-4567
              </p>
              <p className="flex items-center gap-2">
                <Icon icon="lucide:map-pin" />
                123 Property St, NY 10001
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-default-500 text-sm">
          © {new Date().getFullYear()} ConnectLivin. All rights reserved.
        </div>
      </div>
    </footer>
  );
};