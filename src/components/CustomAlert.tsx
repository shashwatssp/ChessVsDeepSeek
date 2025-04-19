// CustomAlert.tsx
import React, { useEffect, useState } from 'react';

type AlertType = 'info' | 'warning' | 'error' | 'success';

interface CustomAlertProps {
  message: string;
  type: AlertType;
  duration?: number;
  onClose?: () => void;
}

const AlertIcon = ({ type }: { type: AlertType }) => {
  switch (type) {
    case 'info':
      return <span className="alert-icon">ℹ️</span>;
    case 'warning':
      return <span className="alert-icon">⚠️</span>;
    case 'error':
      return <span className="alert-icon">❗</span>;
    case 'success':
      return <span className="alert-icon">✅</span>;
    default:
      return null;
  }
};

const CustomAlert: React.FC<CustomAlertProps> = ({ 
  message, 
  type = 'info', 
  duration = 3000,
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`custom-alert ${type}`}>
      <AlertIcon type={type} />
      {message}
    </div>
  );
};

export default CustomAlert;
