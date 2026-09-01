import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/app/globals.css';
import { WorkspaceApp } from '@/components/workspace-app';

const root = document.getElementById('root');

if (!root) throw new Error('Desktop application root was not found.');

createRoot(root).render(
  <StrictMode>
    <WorkspaceApp />
  </StrictMode>,
);

