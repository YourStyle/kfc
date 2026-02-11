import React from 'react';
import { Routes, Route } from 'react-router-dom';
import QuestStartScreen from './QuestStartScreen';
import QuestAuthScreen from './QuestAuthScreen';
import QuestRiddleScreen from './QuestRiddleScreen';
import QuestScanHandler from './QuestScanHandler';
import QuestResultScreen from './QuestResultScreen';

const QuestApp: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<QuestStartScreen />} />
      <Route path="/auth" element={<QuestAuthScreen />} />
      <Route path="/play" element={<QuestRiddleScreen />} />
      <Route path="/scan/:qrToken" element={<QuestScanHandler />} />
      <Route path="/result" element={<QuestResultScreen />} />
    </Routes>
  );
};

export default QuestApp;
