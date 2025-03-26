// AlertContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomAlert from './CustomAlert';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    message: '',
    imageUrl: null,
    autoCloseDelay: 2000,
    onAfterClose: null,
  });

  // Function to open the alert with dynamic configuration
  const openAlert = useCallback(({ message, imageUrl, autoCloseDelay, onAfterClose }) => {
    setAlertConfig({
      isOpen: true,
      message,
      imageUrl: imageUrl || null,
      autoCloseDelay: autoCloseDelay || 2000,
      onAfterClose: onAfterClose || null,
    });
  }, []);

  // Function to close the alert
  const closeAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <AlertContext.Provider value={{ openAlert, closeAlert }}>
      {children}
      {alertConfig.isOpen && (
        <CustomAlert
          message={alertConfig.message}
          imageUrl={alertConfig.imageUrl}
          autoCloseDelay={alertConfig.autoCloseDelay}
          onAfterClose={alertConfig.onAfterClose}
          onClose={closeAlert}
        />
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);