import React, { useEffect, useState, useRef } from 'react';
import apiClient from '../api/client';

export default function SessionTimeoutHandler() {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(120); // 2 minutes in seconds
  
  const activityTimer = useRef(null);
  const countdownTimer = useRef(null);
  const token = localStorage.getItem('accessToken');

  // Set timeout values
  const INACTIVITY_LIMIT = 28 * 60 * 1000; // 28 minutes
  const WARNING_LIMIT = 2 * 60 * 1000;    // 2 minutes

  const resetInactivityTimer = () => {
    if (showWarning) return;

    if (activityTimer.current) clearTimeout(activityTimer.current);
    
    activityTimer.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(120);
    }, INACTIVITY_LIMIT);
  };

  const handleStayLoggedIn = async () => {
    setShowWarning(false);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        const response = await apiClient.post('/auth/refresh', { refreshToken });
        if (response.data && response.data.token) {
          localStorage.setItem('accessToken', response.data.token);
          if (response.data.refreshToken) {
            localStorage.setItem('refreshToken', response.data.refreshToken);
          }
        }
        // Emit global event to display toast if listening
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: '✓ Session Extended Successfully!', type: 'success' }
        }));
      }
    } catch (err) {
      console.error("Failed to extend session:", err);
    }
    
    resetInactivityTimer();
  };

  const handleLogout = async () => {
    setShowWarning(false);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken });
      } catch (err) {
        console.error("Logout request failed", err);
      }
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('session_active');
    
    window.location.href = '/login';
  };

  useEffect(() => {
    if (!token) {
      if (activityTimer.current) clearTimeout(activityTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      setShowWarning(false);
      return;
    }

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    resetInactivityTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (activityTimer.current) clearTimeout(activityTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, [token, showWarning]);

  useEffect(() => {
    if (showWarning) {
      countdownTimer.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer.current);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    }

    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, [showWarning]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xl p-6 md:p-8 max-w-sm w-full text-center space-y-4 font-sans text-gray-800">
        <h3 className="text-lg font-bold text-gray-900">Your session is expiring</h3>
        <p className="text-xs text-gray-500">
          For your security, you will be logged out automatically in <span className="font-extrabold text-[#F7941D] text-sm">{Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</span> due to inactivity.
        </p>
        <div className="flex gap-4 pt-2">
          <button 
            onClick={handleLogout}
            className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px]"
          >
            Logout
          </button>
          <button 
            onClick={handleStayLoggedIn}
            className="flex-1 bg-[#F7941D] hover:bg-[#E07D10] text-white py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px]"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
