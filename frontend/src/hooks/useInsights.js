import { useContext } from 'react';
import { InsightsContext } from '../context/InsightsContext';

export const useInsights = () => {
  const context = useContext(InsightsContext);
  if (!context) {
    throw new Error('useInsights must be used within an InsightsProvider');
  }
  return context;
};