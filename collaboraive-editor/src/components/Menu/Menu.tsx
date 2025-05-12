import React from 'react';
import MenuItem from './MenuItem';

const menuItems = [
  { label: 'File', items: ['New File', 'New Folder', 'Open Folder...', 'Save', 'Save All', 'Exit'] },
  { label: 'Edit', items: ['Undo', 'Redo', 'Cut', 'Copy', 'Paste', 'Find', 'Replace'] },
  { label: 'View', items: ['Command Palette', 'Open View', 'Appearance', 'Terminal', 'Problems'] },
  { label: 'Run', items: ['Start Debugging', 'Run Without Debugging', 'Stop Debugging', 'Restart Debugging'] },
  { label: 'Terminal', items: ['New Terminal', 'Split Terminal', 'Clear Terminal', 'Kill Terminal'] },
  { label: 'Help', items: ['Welcome', 'Documentation', 'About'] },
];

const Menu: React.FC = () => (
  <div className="flex items-center h-8 px-2">
    {menuItems.map((item, index) => (
      <MenuItem key={index} label={item.label} items={item.items} />
    ))}
  </div>
);

export default Menu;