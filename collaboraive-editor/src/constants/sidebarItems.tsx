import { Files, Search, GitBranch, Play, Package, User, Settings } from 'lucide-react';

export const sidebarItems = [
  { icon: <Files size={24} />, label: 'Explorer' },
  { icon: <Search size={24} />, label: 'Search' },
  { icon: <GitBranch size={24} />, label: 'Source Control' },
  { icon: <Play size={24} />, label: 'Run and Debug' },
  { icon: <Package size={24} />, label: 'Extensions' },
  { icon: <User size={24} />, label: 'Account' },
  { icon: <Settings size={24} />, label: 'Settings' },
];