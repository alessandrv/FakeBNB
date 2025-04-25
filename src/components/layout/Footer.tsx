import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  return (
    <footer className={`footer-desktop bg-background border-t border-default-200 py-8 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Icon icon="lucide:home" className="text-2xl text-primary" />
              <span className="font-bold text-xl">ConnectLivin</span>
            </div>
            <p className="text-default-500">
              Find your perfect stay with our curated selection of properties worldwide.
            </p>
            <div className="flex gap-4 mt-4">
              <a href="#" className="text-default-400 hover:text-primary">
                <Icon icon="lucide:facebook" className="text-xl" />
              </a>
              <a href="#" className="text-default-400 hover:text-primary">
                <Icon icon="lucide:twitter" className="text-xl" />
              </a>
              <a href="#" className="text-default-400 hover:text-primary">
                <Icon icon="lucide:instagram" className="text-xl" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-default-500 hover:text-primary">About Us</Link>
              </li>
              <li>
                <Link to="/careers" className="text-default-500 hover:text-primary">Careers</Link>
              </li>
              <li>
                <Link to="/press" className="text-default-500 hover:text-primary">Press</Link>
              </li>
              <li>
                <Link to="/blog" className="text-default-500 hover:text-primary">Blog</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/help" className="text-default-500 hover:text-primary">Help Center</Link>
              </li>
              <li>
                <Link to="/contact" className="text-default-500 hover:text-primary">Contact Us</Link>
              </li>
              <li>
                <Link to="/faq" className="text-default-500 hover:text-primary">FAQ</Link>
              </li>
              <li>
                <Link to="/covid" className="text-default-500 hover:text-primary">COVID-19 Resources</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-default-500 hover:text-primary">Terms of Service</Link>
              </li>
              <li>
                <Link to="/privacy" className="text-default-500 hover:text-primary">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/cookies" className="text-default-500 hover:text-primary">Cookie Policy</Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-default-200 mt-8 pt-6 text-center text-default-500">
          <p>&copy; {new Date().getFullYear()} ConnectLivin, Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}; 