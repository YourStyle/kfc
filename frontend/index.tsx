
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TextsProvider } from './contexts/TextsContext';

const App = React.lazy(() => import('./App'));
const QuestApp = React.lazy(() => import('./quest/QuestApp'));

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
          <Suspense fallback={null}>
            <Routes>
              <Route path="/spacequest/*" element={<QuestApp />} />
              <Route path="/match3/*" element={<App />} />
              <Route path="/" element={<Navigate to="/match3" replace />} />
              <Route path="*" element={<Navigate to="/match3" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TextsProvider>
  </React.StrictMode>
);
