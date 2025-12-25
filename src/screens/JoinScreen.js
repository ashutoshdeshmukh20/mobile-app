import React, {useState, useRef, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {WebRTCService} from '../services/WebRTCService';
import './JoinScreen.css';

const JoinScreen = () => {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const webrtcService = useRef(null);

  useEffect(() => {
    webrtcService.current = new WebRTCService('client');

    return () => {
      if (webrtcService.current) {
        webrtcService.current.cleanup();
      }
    };
  }, []);

  const handleJoinSession = async () => {
    if (!sessionId.trim()) {
      alert('Error', 'Please enter a session ID');
      return;
    }

    setIsConnecting(true);
    try {
      const success = await webrtcService.current.joinSession(sessionId);
      if (success) {
        navigate('/call', {
          state: {sessionId, role: 'client'},
        });
      } else {
        alert(
          'Connection Failed',
          'Could not connect to the session. Please check:\n\n1. Session ID is correct\n2. You are connected to the host\'s hotspot\n3. Host has started the session'
        );
      }
    } catch (error) {
      console.error('Join session error:', error);
      alert('Error', 'Failed to join session: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="join-screen">
      <div className="join-content">
        <h1 className="join-title">Join a Session</h1>
        <p className="join-subtitle">
          Enter the session ID provided by the host
        </p>

        <div className="input-box">
          <label className="join-label">Session ID</label>
          <input
            type="text"
            className="join-input"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value.toUpperCase())}
            placeholder="Enter session ID"
            disabled={isConnecting}
          />
        </div>

        <button
          className={`join-button ${isConnecting ? 'disabled' : ''}`}
          onClick={handleJoinSession}
          disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Join Session'}
        </button>

        <div className="info-box">
          <h3 className="info-title">Instructions:</h3>
          <p className="info-text">
            1. Connect to the host's mobile hotspot<br />
            2. Enter the Session ID provided by the host<br />
            3. Click "Join Session" to connect<br />
            4. Wait for the host to accept your connection
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinScreen;
