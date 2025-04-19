// AlertManager.tsx
import React, { useState, useEffect } from 'react';
import CustomAlert from './CustomAlert';

interface Alert {
  id: number;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export const useAlertManager = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  let nextId = 0;

  const addAlert = (message: string, type: 'info' | 'warning' | 'error' | 'success') => {
    const id = nextId++;
    setAlerts(prev => [...prev, { id, message, type }]);
    return id;
  };

  const removeAlert = (id: number) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  return {
    alerts,
    addAlert,
    removeAlert,
    showError: (message: string) => addAlert(message, 'error'),
    showWarning: (message: string) => addAlert(message, 'warning'),
    showInfo: (message: string) => addAlert(message, 'info'),
    showSuccess: (message: string) => addAlert(message, 'success')
  };
};

const AlertManager: React.FC<{ alerts: Alert[], removeAlert: (id: number) => void }> = ({ 
  alerts, 
  removeAlert 
}) => {
  return (
    <>
      {alerts.map(alert => (
        <CustomAlert 
          key={alert.id}
          message={alert.message}
          type={alert.type}
          onClose={() => removeAlert(alert.id)}
        />
      ))}
    </>
  );
};

export default AlertManager;
