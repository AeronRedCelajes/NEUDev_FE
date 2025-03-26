// CustomAlert.js
import React, { useEffect, useState, useCallback } from 'react';
import '../style/CustomAlert.css';

const CustomAlert = ({ 
  message, 
  imageUrl, 
  onClose, 
  onAfterClose, 
  autoCloseDelay = 2000 
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const exitAnimationDuration = 500; // milliseconds

  // Trigger closing animation then call onClose and onAfterClose
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      if (onAfterClose) {
        onAfterClose();
      }
    }, exitAnimationDuration);
  }, [onClose, onAfterClose]);

  // Auto-close after specified delay
  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, autoCloseDelay);
    return () => clearTimeout(timer);
  }, [autoCloseDelay, handleClose]);

  return (
    <div className="custom-alert-overlay">
      <div className={`custom-alert-box ${isClosing ? 'closing' : ''}`}>
        {/* Orange progress bar indicating auto-close */}
        <div 
          className="custom-alert-progress" 
          style={{ animationDuration: `${autoCloseDelay}ms` }}
        ></div>
        <div className="custom-alert-content">
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt="Alert Icon" 
              className="custom-alert-image" 
            />
          )}
          <p>{message}</p>
          <button className="custom-alert-close" onClick={handleClose}>
            &times;
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomAlert;