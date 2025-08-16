/**
 * Text formatting utilities for document processing
 */

/**
 * Truncates text to a specified length with ellipsis
 * @param {string} text - Input text
 * @param {number} maxLength - Maximum length before truncation
 * @param {boolean} [keepWords=true] - Whether to preserve whole words
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength, keepWords = true) => {
  if (!text || text.length <= maxLength) return text;

  if (keepWords) {
    const truncated = text.substr(0, maxLength);
    return truncated.substr(0, truncated.lastIndexOf(' ')) + '...';
  }
  return text.substr(0, maxLength) + '...';
};

/**
 * Highlights search terms in text
 * @param {string} text - Original text
 * @param {string} query - Search query
 * @param {string} [tag='mark'] - Wrapping tag
 * @returns {string} HTML string with highlighted terms
 */
export const highlightSearchTerms = (text, query, tag = 'mark') => {
  if (!query || !text) return text;

  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return text.replace(regex, `<${tag}>$1</${tag}>`);
};

/**
 * Escapes special regex characters
 * @param {string} string - Input string
 * @returns {string} Escaped string
 */
export const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Formats a number as a reading time estimate
 * @param {number} wordCount - Total word count
 * @param {number} [wordsPerMinute=200] - Reading speed
 * @returns {string} Formatted reading time (e.g. "2 min read")
 */
export const formatReadingTime = (wordCount, wordsPerMinute = 200) => {
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
};

/**
 * Capitalizes the first letter of each sentence
 * @param {string} text - Input text
 * @returns {string} Properly capitalized text
 */
export const capitalizeSentences = (text) => {
  if (!text) return '';
  
  return text.replace(/(^\s*\w|[.!?]\s*\w)/g, (match) => {
    return match.toUpperCase();
  });
};

/**
 * Formats a date string for display
 * @param {string|Date} date - Input date
 * @param {string} [locale='en-US'] - Locale string
 * @returns {string} Formatted date (e.g. "January 1, 2023")
 */
export const formatDate = (date, locale = 'en-US') => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString(locale, options);
};

/**
 * Extracts the first paragraph from text
 * @param {string} text - Input text
 * @returns {string} First paragraph
 */
export const getFirstParagraph = (text) => {
  if (!text) return '';
  const paragraphs = text.split('\n\n');
  return paragraphs[0] || text;
};

/**
 * Counts words in a string
 * @param {string} text - Input text
 * @returns {number} Word count
 */
export const countWords = (text) => {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
};

/**
 * Formats a number with commas
 * @param {number} num - Input number
 * @returns {string} Formatted number (e.g. "1,000")
 */
export const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Converts markdown links to HTML anchors
 * @param {string} text - Markdown text
 * @returns {string} Text with HTML links
 */
export const markdownLinksToHTML = (text) => {
  if (!text) return '';
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
};

/**
 * Generates a preview snippet with highlighted terms
 * @param {string} text - Full text
 * @param {string} query - Search query
 * @param {number} [length=150] - Snippet length
 * @returns {string} Formatted preview
 */
export const generatePreviewSnippet = (text, query, length = 150) => {
  if (!text) return '';
  
  const startPos = text.toLowerCase().indexOf(query.toLowerCase());
  let snippet;
  
  if (startPos >= 0) {
    const start = Math.max(0, startPos - 30);
    const end = Math.min(text.length, startPos + query.length + length);
    snippet = text.slice(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
  } else {
    snippet = truncateText(text, length);
  }
  
  return highlightSearchTerms(snippet, query);
};

/**
 * Normalizes text for comparison/search
 * @param {string} text - Input text
 * @returns {string} Normalized text
 */
export const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export default {
  truncateText,
  highlightSearchTerms,
  escapeRegExp,
  formatReadingTime,
  capitalizeSentences,
  formatDate,
  getFirstParagraph,
  countWords,
  formatNumber,
  markdownLinksToHTML,
  generatePreviewSnippet,
  normalizeText
};