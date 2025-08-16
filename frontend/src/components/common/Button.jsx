import React from 'react';
import PropTypes from 'prop-types';
import { Loader } from './Loader';

const Button = React.forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      fullWidth = false,
      icon: Icon,
      iconPosition = 'left',
      className = '',
      tooltip,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
      secondary:
        'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600',
      ghost:
        'hover:bg-gray-100 focus-visible:ring-gray-500 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
      outline:
        'border border-gray-300 bg-transparent hover:bg-gray-50 focus-visible:ring-gray-500 dark:border-gray-600 dark:hover:bg-gray-800',
    };

    const sizeClasses = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
      icon: 'h-10 w-10', // For icon-only buttons
    };

    const buttonClasses = [
      baseClasses,
      variantClasses[variant],
      sizeClasses[Icon && !children ? 'icon' : size],
      fullWidth ? 'w-full' : '',
      className,
    ].join(' ');

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || isLoading}
        aria-disabled={disabled || isLoading}
        aria-busy={isLoading}
        title={tooltip}
        {...props}
      >
        {isLoading ? (
          <Loader size={size === 'lg' ? 'md' : 'sm'} className="text-current" />
        ) : (
          <>
            {Icon && iconPosition === 'left' && (
              <Icon className={`mr-2 h-4 w-4 ${children ? '' : 'm-0'}`} />
            )}
            {children}
            {Icon && iconPosition === 'right' && (
              <Icon className={`ml-2 h-4 w-4 ${children ? '' : 'm-0'}`} />
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost', 'danger', 'outline']),
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'icon']),
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  icon: PropTypes.elementType,
  iconPosition: PropTypes.oneOf(['left', 'right']),
  className: PropTypes.string,
  tooltip: PropTypes.string,
};

export { Button };