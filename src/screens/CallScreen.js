import React, {useState, useEffect, useRef} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import {WebRTCService} from '../services/WebRTCService';
import './CallScreen.css';

const CallScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {sessionId, role} = location.state || {};
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const webrtcService = useRef(null);

  useEffect(() => {
    initializeCall();

    return () => {
      if (webrtcService.current) {
        webrtcService.current.cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (localStream && localAudioRef.current) {
      localAudioRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      console.log('Setting remote stream to audio element:', remoteStream);
      remoteAudioRef.current.srcObject = remoteStream;
      
      // Force play (some browsers require user interaction)
      remoteAudioRef.current.play().catch(error => {
        console.warn('Error playing remote audio:', error);
      });
      
      // Log track information
      remoteStream.getTracks().forEach(track => {
        console.log('Remote track:', track.kind, track.id, 'enabled:', track.enabled, 'readyState:', track.readyState);
      });
    }
  }, [remoteStream]);

  const initializeCall = async () => {
    try {
      webrtcService.current = new WebRTCService(role, sessionId);
      
      // Set up event listeners
      webrtcService.current.onLocalStream = stream => {
        setLocalStream(stream);
      };

      webrtcService.current.onRemoteStream = stream => {
        setRemoteStream(stream);
        setCallStatus('Connected');
      };

      webrtcService.current.onConnectionStateChange = state => {
        if (state === 'connected') {
          setCallStatus('Connected');
        } else if (state === 'disconnected') {
          setCallStatus('Disconnected');
          alert('Connection Lost', 'The call has been disconnected.');
          navigate('/');
        } else if (state === 'failed') {
          setCallStatus('Connection Failed');
          alert('Connection Failed', 'Failed to establish connection.');
          navigate('/');
        }
      };

      if (role === 'host') {
        await webrtcService.current.startHosting(sessionId);
      } else {
        await webrtcService.current.joinSession(sessionId);
      }
    } catch (error) {
      console.error('Initialize call error:', error);
      alert('Error', 'Failed to initialize call: ' + error.message);
      navigate('/');
    }
  };

  const toggleMute = () => {
    if (webrtcService.current) {
      const muted = webrtcService.current.toggleMute();
      setIsMuted(muted);
    }
  };

  const toggleSpeaker = () => {
    if (webrtcService.current) {
      const speakerOn = webrtcService.current.toggleSpeaker();
      setIsSpeakerOn(speakerOn);
    }
  };

  const endCall = () => {
    if (window.confirm('Are you sure you want to end the call?')) {
      if (webrtcService.current) {
        webrtcService.current.cleanup();
      }
      navigate('/');
    }
  };

  return (
    <div className="call-screen">
      <div className="call-container">
        <div className="call-info">
          <p className="session-id">Session: {sessionId}</p>
          <p className={`status ${callStatus.toLowerCase().replace(' ', '-')}`}>
            {callStatus}
          </p>
        </div>

        <div className="audio-container">
          {remoteStream && (
            <audio
              ref={remoteAudioRef}
              autoPlay
              playsInline
              className="remote-audio"
            />
          )}
          {localStream && (
            <audio
              ref={localAudioRef}
              autoPlay
              playsInline
              muted
              className="local-audio"
            />
          )}
        </div>

        {!remoteStream && (
          <div className="waiting-placeholder">
            <p>Waiting for connection...</p>
          </div>
        )}

        <div className="call-controls">
          <button
            className={`control-button ${isMuted ? 'active' : ''}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? '🔇' : '🎤'}
            <span className="control-label">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            className={`control-button ${isSpeakerOn ? 'active' : ''}`}
            onClick={toggleSpeaker}
            title={isSpeakerOn ? 'Speaker Off' : 'Speaker On'}>
            {isSpeakerOn ? '🔊' : '🔈'}
            <span className="control-label">
              {isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
            </span>
          </button>

          <button
            className="control-button end-call"
            onClick={endCall}
            title="End Call">
            📞
            <span className="control-label">End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallScreen;
