import React from 'react';
import { Button } from '../common/Button';
import { usePDFContext } from '../../context/PDFContext';
import { useInsightsContext } from '../../context/InsightsContext';
import { useAudioGeneration } from '../../hooks/useAudioGeneration';
import { ZoomIn, ZoomOut, Search, Volume2, Lightbulb } from 'lucide-react';

export const PDFToolbar = () => {
  const {
    currentPDF,
    zoomLevel,
    setZoomLevel,
    isDocumentReady,
    searchQuery,
    setSearchQuery,
    performSearch,
  } = usePDFContext();

  const { showInsights, setShowInsights } = useInsightsContext();
  const { generateAudioOverview, isGeneratingAudio } = useAudioGeneration();

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50));
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleGenerateAudio = async () => {
    if (!currentPDF?.id) return;
    await generateAudioOverview(currentPDF.id);
  };

  const toggleInsights = () => {
    setShowInsights(prev => !prev);
  };

  if (!isDocumentReady) return null;

  return (
    <div className="pdf-toolbar bg-white dark:bg-gray-800 shadow-md rounded-lg p-2 flex flex-wrap items-center gap-2 mb-4">
      <div className="zoom-controls flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          disabled={zoomLevel <= 50}
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs font-medium w-10 text-center">
          {zoomLevel}%
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          disabled={zoomLevel >= 200}
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSearchSubmit} className="search-bar flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search in document..."
            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 pl-8 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>

      <div className="feature-buttons flex items-center gap-1">
        {import.meta.env.VITE_ENABLE_INSIGHTS === 'true' && (
          <Button
            variant={showInsights ? 'primary' : 'ghost'}
            size="sm"
            onClick={toggleInsights}
            aria-label="Toggle insights"
            tooltip="Show/Hide Insights"
          >
            <Lightbulb className="w-4 h-4" />
          </Button>
        )}

        {import.meta.env.VITE_ENABLE_AUDIO === 'true' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerateAudio}
            disabled={isGeneratingAudio}
            aria-label="Generate audio overview"
            tooltip="Generate Audio Overview"
          >
            <Volume2 className="w-4 h-4" />
            {isGeneratingAudio && (
              <span className="ml-1 text-xs">Generating...</span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};