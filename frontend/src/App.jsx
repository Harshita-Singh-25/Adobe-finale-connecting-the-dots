import React, { Suspense } from 'react';
import { PDFProvider } from './context/PDFContext';
import { InsightsProvider } from './context/InsightsContext';
import Audio from './context/AudioContext';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Loader from './components/common/Loader';
import { SelectionProvider } from './context/SelectionContext'; //

// Lazy load pages
const Home = React.lazy(() => import('./pages/Home'));
const Reader = React.lazy(() => import('./pages/Reader'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

function App() {
  return (
    <SelectionProvider>
      <Router>
        <PDFProvider>
          <InsightsProvider>
            <Audio.Provider>
              <Suspense fallback={<Loader fullScreen />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/reader/:documentId?" element={<Reader />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Toaster position="bottom-right" />
              </Suspense>
            </Audio.Provider>
          </InsightsProvider>
        </PDFProvider>
      </Router>
    </SelectionProvider>
  );
}

export default App;