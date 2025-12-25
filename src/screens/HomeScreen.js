import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import './HomeScreen.css';

const HomeScreen = () => {
  const navigate = useNavigate();
  const [networkInfo, setNetworkInfo] = useState(null);
  const [localIP, setLocalIP] = useState('');

  useEffect(() => {
    checkNetworkStatus();
    getLocalIP();
  }, []);

  const getLocalIP = async () => {
    try {
      // Get local IP from WebRTC
      const pc = new RTCPeerConnection({
        iceServers: [{urls: 'stun:stun.l.google.com:19302'}],
      });
      pc.createDataChannel('');
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          const candidate = e.candidate.candidate;
          const match = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
          if (match && !match[1].startsWith('0.') && match[1] !== '127.0.0.1') {
            setLocalIP(match[1]);
            pc.close();
          }
        }
      };
      pc.createOffer().then((offer) => pc.setLocalDescription(offer));
    } catch (error) {
      console.error('Error getting local IP:', error);
    }
  };

  const checkNetworkStatus = () => {
    if (navigator.onLine) {
      setNetworkInfo({isConnected: true, type: 'wifi'});
    } else {
      setNetworkInfo({isConnected: false});
    }

    window.addEventListener('online', () => {
      setNetworkInfo({isConnected: true, type: 'wifi'});
    });

    window.addEventListener('offline', () => {
      setNetworkInfo({isConnected: false});
    });
  };

  const handleHost = () => {
    if (!networkInfo?.isConnected) {
      alert('No Connection', 'Please check your network connection.');
      return;
    }
    navigate('/host');
  };

  const handleJoin = () => {
    if (!networkInfo?.isConnected) {
      alert('No Connection', 'Please check your network connection.');
      return;
    }
    navigate('/join');
  };

  return (
    <div className="home-screen">
      <div className="home-content">
        <h1 className="home-title">Rider Communication</h1>
        <p className="home-subtitle">
          Connect with riders over mobile hotspot
        </p>

        {localIP && (
          <div className="ip-display">
            <p>Access this app at:</p>
            <p className="ip-address">http://{localIP}:3000</p>
            <p className="ip-note">Share this address with riders to join</p>
          </div>
        )}

        <div className="network-status">
          <p className="network-label">Network Status:</p>
          <p
            className={`network-value ${
              networkInfo?.isConnected ? 'connected' : 'disconnected'
            }`}>
            {networkInfo?.isConnected ? 'Connected' : 'Disconnected'}
          </p>
          {networkInfo?.type && (
            <p className="network-type">Type: {networkInfo.type.toUpperCase()}</p>
          )}
        </div>

        <div className="button-container">
          <button className="host-button" onClick={handleHost}>
            <span className="button-text">HOST</span>
            <span className="button-subtext">Start a session</span>
          </button>

          <button className="join-button" onClick={handleJoin}>
            <span className="button-text">JOIN</span>
            <span className="button-subtext">Connect to a session</span>
          </button>
        </div>

        <div className="info-box">
          <p className="info-text">
            💡 Tip: Enable mobile hotspot on the host device for better
            connectivity
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
