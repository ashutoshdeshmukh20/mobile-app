import React, {useState, useEffect, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import {WebRTCService} from '../services/WebRTCService';
import './HostScreen.css';

const HostScreen = () => {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const webrtcService = useRef(null);

  useEffect(() => {
    generateSessionId();
    webrtcService.current = new WebRTCService('host');

    return () => {
      if (webrtcService.current) {
        webrtcService.current.cleanup();
      }
    };
  }, []);

  const generateSessionId = () => {
    const id = Math.random().toString(36).substring(2, 9).toUpperCase();
    setSessionId(id);
  };

  const handleStartSession = async () => {
    if (!sessionId.trim()) {
      alert('Error', 'Please enter a session ID');
      return;
    }

    setIsStarting(true);
    try {
      const success = await webrtcService.current.startHosting(sessionId);
      if (success) {
        setIsActive(true);
        const proceed = window.confirm(
          `Session Started!\n\nSession ID: ${sessionId}\n\nShare this ID with riders to join.\n\nClick OK to start the call.`
        );
        if (proceed) {
          navigate('/call', {
            state: {sessionId, role: 'host'},
          });
        }
      } else {
        alert('Error', 'Failed to start session. Please try again.');
      }
    } catch (error) {
      console.error('Start session error:', error);
      alert('Error', 'Failed to start session: ' + error.message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopSession = () => {
    if (webrtcService.current) {
      webrtcService.current.cleanup();
    }
    setIsActive(false);
    navigate('/');
  };

  return (
    <div className="host-screen">
      <div className="host-content">
        <h1 className="host-title">Host a Session</h1>
        <p className="host-subtitle">Create a session for riders to join</p>

        <div className="session-box">
          <label className="session-label">Session ID</label>
          <input
            type="text"
            className="session-input"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value.toUpperCase())}
            placeholder="Enter session ID"
            disabled={isActive}
          />
          <button
            className="generate-button"
            onClick={generateSessionId}
            disabled={isActive}>
            Generate New ID
          </button>
        </div>

        {!isActive ? (
          <button
            className={`start-button ${isStarting ? 'disabled' : ''}`}
            onClick={handleStartSession}
            disabled={isStarting}>
            {isStarting ? 'Starting...' : 'Start Session'}
          </button>
        ) : (
          <div className="active-container">
            <div className="active-indicator">
              <span className="active-dot"></span>
              <span className="active-text">Session Active</span>
            </div>
            <button className="stop-button" onClick={handleStopSession}>
              Stop Session
            </button>
          </div>
        )}

        <div className="info-box">
          <h3 className="info-title">Instructions:</h3>
          <p className="info-text">
            1. Enable mobile hotspot on your device<br />
            2. Share the Session ID with riders<br />
            3. Riders should connect to your hotspot<br />
            4. Click "Start Session" to begin
          </p>
        </div>
      </div>
    </div>
  );
};

export default HostScreen;
