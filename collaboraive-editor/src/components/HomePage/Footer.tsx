import React from 'react';
import { Github, Twitter, Linkedin, Code } from 'lucide-react';
import logo from '../../assets/logo2.png';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0c1422] border-t border-[#be9269]/10 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center space-x-2">
              </div>
              <Link to="/" className="flex items-center space-x-2">
                <img
                  src={logo}
                  alt="ECHO Logo"
                  className="h-16 w-auto"
                />
              </Link>            
            <p className="text-gray-400 text-sm">
              A collaborative platform for developers to share knowledge, solve problems, and build solutions together in real-time.
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="text-gray-400 hover:text-[#be9269] transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#be9269] transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#be9269] transition-colors">
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Platform</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-[#be9269] text-sm transition-colors">Questions</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#be9269] text-sm transition-colors">Experts</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#be9269] text-sm transition-colors">Categories</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#be9269] text-sm transition-colors">Trending</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#be9269] text-sm transition-colors">Popular Tags</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-[#be9269] text-sm transition-colors">Documentation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#be9269] text-sm transition-colors">API Reference</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#be9269] text-sm transition-colors">Community Guidelines</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#be9269] text-sm transition-colors">Tutorials</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#be9269] text-sm transition-colors">Blog</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-[#be9269] text-sm transition-colors">About</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#be9269] text-sm transition-colors">Careers</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#be9269] text-sm transition-colors">Privacy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#be9269] text-sm transition-colors">Terms</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#be9269] text-sm transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#be9269]/10 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} ECHO. All rights reserved.
          </p>
          <div className="flex items-center space-x-2 text-gray-500 text-sm">
            <Code size={16} />
            <span>Made with passion by developers for developers</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;