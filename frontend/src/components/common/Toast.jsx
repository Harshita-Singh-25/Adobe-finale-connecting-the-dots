import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle2, AlertCircle, X, Info, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

// Move toast types to a separate constants file (toastTypes.js)
const TOAST_TYPES = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-800 dark:text-green-200',
    border: 'border-green-200 dark:border-green-800',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-800 dark:text-red-200',
    border: 'border-red-200 dark:border-red-800',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-800 dark:text-yellow-200',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-800 dark:text-blue-200',
    border: 'border-blue-200 dark:border-blue-800',
  },
};

export const Toast = ({ 
  message, 
  type = 'info', 
  duration = 5000, 
  onClose, 
  position = 'bottom-right',
  title,
  isVisible = true,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef(null);
  const toastRef = useRef(null);
  const Icon = TOAST_TYPES[type]?.icon || Info;

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose?.();
    }, 300);
  }, [onClose]);

  const startTimer = useCallback(() => {
    if (duration === 0) return;
    
    timerRef.current = setTimeout(() => {
      handleClose();
    }, duration);
  }, [duration, handleClose]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      startTimer();
      return clearTimer;
    }
  }, [isVisible, startTimer, clearTimer]);

  if (!isVisible && !isClosing) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      ref={toastRef}
      role="alert"
      aria-live="assertive"
      className={`fixed ${positionClasses[position]} z-50 transition-all duration-300 ease-in-out ${
        isClosing ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
      style={{
        __css: `
          @keyframes toast-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          animation: toast-in 0.3s ease-out;
        `,
      }}
    >
      <div
        className={`flex items-start w-full max-w-xs p-4 rounded-lg shadow-lg border ${TOAST_TYPES[type].bg} ${TOAST_TYPES[type].border}`}
      >
        <div className={`flex-shrink-0 ${TOAST_TYPES[type].text}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="ml-3 w-0 flex-1 pt-0.5">
          {title && (
            <p className={`text-sm font-medium ${TOAST_TYPES[type].text}`}>
              {title}
            </p>
          )}
          <p className={`mt-1 text-sm ${TOAST_TYPES[type].text}`}>
            {message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <Button
            variant="ghost"
            size="xs"
            onClick={handleClose}
            aria-label="Close toast"
            className={`${TOAST_TYPES[type].text} hover:bg-opacity-20 focus:outline-none`}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  duration: PropTypes.number,
  onClose: PropTypes.func,
  position: PropTypes.oneOf([
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
    'top-center',
    'bottom-center',
  ]),
  title: PropTypes.string,
  isVisible: PropTypes.bool,
};

// Move ToastProvider and related code to a separate file (ToastContext.jsx)