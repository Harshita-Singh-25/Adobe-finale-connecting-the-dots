import React from 'react';
import PropTypes from 'prop-types';

const Loader = ({ size = "md", color = "primary", message, className = "" }) => {
  const sizeClasses = {
    xs: 'h-4 w-4 border-2',
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-[3px]',
    lg: 'h-10 w-10 border-4',
    xl: 'h-12 w-12 border-4'
  };

  const colorClasses = {
    primary: 'border-t-blue-600 border-r-blue-600 border-b-transparent border-l-transparent',
    white: 'border-t-white border-r-white border-b-transparent border-l-transparent',
    gray: 'border-t-gray-500 border-r-gray-500 border-b-transparent border-l-transparent',
    danger: 'border-t-red-600 border-r-red-600 border-b-transparent border-l-transparent',
    success: 'border-t-green-600 border-r-green-600 border-b-transparent border-l-transparent'
  };

  return (
    <div className={`inline-flex items-center justify-center gap-2 ${className}`}>
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]}`}
        style={{ animationDuration: '0.75s' }}
      />
      {message && (
        <span className={`${size === 'xs' || size === 'sm' ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-300`}>
          {message}
        </span>
      )}
    </div>
  );
};

Loader.propTypes = {
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  color: PropTypes.oneOf(['primary', 'white', 'gray', 'danger', 'success']),
  message: PropTypes.string,
  className: PropTypes.string
};

export default Loader;