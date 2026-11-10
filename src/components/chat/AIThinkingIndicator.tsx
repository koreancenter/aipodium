import React, { useState, useId } from 'react';
import { ChevronRight } from 'lucide-react';

export interface AIThinkingProps {
  isThinking: boolean;
  thinkingContent?: string;
  durationSeconds?: number;
  className?: string;
  defaultExpanded?: boolean;
}

/**
 * AIThinkingIndicator
 *
 * A sleek, minimalist AI "Thinking/Reasoning" state React component inspired by
 * the high-end design language of modern AI platforms (Claude 3.7, OpenAI o1/o3, Gemini).
 *
 * Key Design Features:
 * - Minimalist visual language (strictly no decorative robot, star, or cursor bars)
 * - Single micro-sized chevron arrow (14px max) for accordion expand/collapse
 * - Active state: Subtle, calm text shimmer ("Thinking...") passing soft white light over text-zinc-400
 * - Completed state: Clean neutral status ("Thought for X seconds" or "Reasoning complete") in text-zinc-400
 * - Expanded view: border-l border-zinc-800, text-[0.8125rem], leading-relaxed, text-zinc-500
 */
export const AIThinkingIndicator: React.FC<AIThinkingProps> = ({
  isThinking,
  thinkingContent,
  durationSeconds,
  className = '',
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const contentId = useId();

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  // Format completed state text cleanly
  const renderCompletedText = () => {
    if (durationSeconds !== undefined && durationSeconds > 0) {
      return `Thought for ${durationSeconds} second${durationSeconds === 1 ? '' : 's'}`;
    }
    return 'Reasoning complete';
  };

  return (
    <div className={`ai-thinking-indicator font-sans ${className}`}>
      {/* Accordion Toggle Header */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        className="group inline-flex items-center gap-1.5 py-1 text-xs select-none cursor-pointer text-zinc-400 hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 rounded"
      >
        {/* Micro-sized chevron toggle (14px max) */}
        <ChevronRight
          size={14}
          strokeWidth={1.75}
          className={`shrink-0 text-zinc-400 group-hover:text-zinc-300 transition-transform duration-200 ease-out ${
            isExpanded ? 'rotate-90' : 'rotate-0'
          }`}
          aria-hidden="true"
        />

        {/* Status text: Active Shimmer vs Completed Neutral */}
        {isThinking ? (
          <span className="thinking-shimmer-text tracking-normal">
            Thinking...
          </span>
        ) : (
          <span className="text-zinc-400 tracking-normal">
            {renderCompletedText()}
          </span>
        )}
      </button>

      {/* Expanded Reasoning Content */}
      {isExpanded && (
        <div
          id={contentId}
          role="region"
          aria-label="Reasoning details"
          className="mt-1 pl-3.5 ml-1.5 border-l border-zinc-800 text-[0.8125rem] leading-relaxed text-zinc-500 whitespace-pre-wrap select-text cursor-text"
        >
          {thinkingContent || (isThinking ? 'Analyzing query context and evaluating response strategy...' : 'No detailed reasoning recorded.')}
        </div>
      )}
    </div>
  );
};

export default AIThinkingIndicator;
