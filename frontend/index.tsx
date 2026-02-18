
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TextsProvider } from './contexts/TextsContext';
import App from './App';
import QuestApp from './quest/QuestApp';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <TextsProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/spacequest/*" element={<QuestApp />} />
            <Route path="/match3/*" element={<App />} />
            <Route path="/" element={<Navigate to="/match3" replace />} />
            <Route path="*" element={<Navigate to="/match3" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TextsProvider>
  </React.StrictMode>
);
