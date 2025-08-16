import React from 'react';
import { ReactComponent as AdobeLogo } from '../../assets/adobe-logo.svg';
import { ReactComponent as GithubIcon } from '../../assets/icons/github.svg';
import { ReactComponent as LinkedInIcon } from '../../assets/icons/linkedin.svg';
import { ReactComponent as TwitterIcon } from '../../assets/icons/twitter.svg';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Branding */}
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <AdobeLogo className="h-6 w-auto" />
            <span className="text-sm text-gray-500">
              Adobe India Hackathon 2025 - Connecting the Dots
            </span>
          </div>

          {/* Links */}
          <div className="flex space-x-6">
            <a 
              href="https://github.com/your-repo" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-500"
              aria-label="GitHub"
            >
              <GithubIcon className="h-5 w-5" />
            </a>
            <a 
              href="https://linkedin.com/your-profile" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-500"
              aria-label="LinkedIn"
            >
              <LinkedInIcon className="h-5 w-5" />
            </a>
            <a 
              href="https://twitter.com/your-handle" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-500"
              aria-label="Twitter"
            >
              <TwitterIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Copyright and legal */}
        <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-gray-500 mb-2 md:mb-0">
            &copy; {currentYear} Your Team Name. All rights reserved.
          </p>
          <div className="flex space-x-4">
            <a href="#" className="text-xs text-gray-500 hover:text-gray-700">
              Privacy Policy
            </a>
            <a href="#" className="text-xs text-gray-500 hover:text-gray-700">
              Terms of Service
            </a>
            <a href="#" className="text-xs text-gray-500 hover:text-gray-700">
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;