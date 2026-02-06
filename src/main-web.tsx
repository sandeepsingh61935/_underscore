import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRoutes } from './core/routing/AppRoutes';
import './ui-system/theme/global.css';

// Web app entry point
const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(
    <React.StrictMode>
        <AppRoutes />
    </React.StrictMode>
);
