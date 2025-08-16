import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Lightbulb, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../common/Button';

export const InsightBulb = ({ 
  insights,
  onDismiss,
  defaultExpanded = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);

  if (!insights || insights.length === 0) return null;

  const currentInsight = insights[currentInsightIndex];
  const hasMultipleInsights = insights.length > 1;

  const toggleExpand = () => setIsExpanded(!isExpanded);
  const nextInsight = () => {
    setCurrentInsightIndex((prev) => (prev + 1) % insights.length);
  };
  const prevInsight = () => {
    setCurrentInsightIndex((prev) => (prev - 1 + insights.length) % insights.length);
  };

  return (
    <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-start p-4">
        <div className="flex-shrink-0 mt-0.5">
          <Lightbulb className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
        </div>
        
        <div className="ml-3 flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {currentInsight.type ? `${currentInsight.type}:` : 'Insight:'}
            </h3>
            <div className="flex space-x-2">
              {hasMultipleInsights && (
                <div className="flex items-center space-x-1 text-xs text-yellow-600 dark:text-yellow-300">
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    onClick={prevInsight}
                    aria-label="Previous insight"
                    className="text-yellow-600 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-800/50"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <span>{currentInsightIndex + 1}/{insights.length}</span>
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    onClick={nextInsight}
                    aria-label="Next insight"
                    className="text-yellow-600 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-800/50"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <Button
                variant="ghost"
                size="xs"
                onClick={onDismiss}
                aria-label="Dismiss insight"
                className="text-yellow-600 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-800/50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
            {isExpanded ? (
              <div className="space-y-2">
                <p className="font-medium">{currentInsight.summary}</p>
                {currentInsight.details && (
                  <p className="text-yellow-600 dark:text-yellow-400/80">
                    {currentInsight.details}
                  </p>
                )}
                {currentInsight.source && (
                  <div className="text-xs text-yellow-500 dark:text-yellow-500/70 mt-2">
                    Source: {currentInsight.source}
                  </div>
                )}
              </div>
            ) : (
              <p className="truncate">{currentInsight.summary}</p>
            )}
          </div>
        </div>
        
        <div className="ml-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="xs"
            onClick={toggleExpand}
            aria-label={isExpanded ? 'Collapse insight' : 'Expand insight'}
            className="text-yellow-600 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-800/50"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

InsightBulb.propTypes = {
  insights: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.oneOf(['Contradiction', 'Example', 'Key Takeaway', 'Inspiration', 'Did You Know']),
      summary: PropTypes.string.isRequired,
      details: PropTypes.string,
      source: PropTypes.string,
    })
  ).isRequired,
  onDismiss: PropTypes.func.isRequired,
  defaultExpanded: PropTypes.bool,
  className: PropTypes.string,
};

export default InsightBulb;