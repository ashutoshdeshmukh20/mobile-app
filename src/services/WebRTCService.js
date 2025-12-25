import io from 'socket.io-client';

class WebRTCService {
  constructor(role, sessionId = null) {
    this.role = role; // 'host' or 'client'
    this.sessionId = sessionId;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isMuted = false;
    this.isSpeakerOn = true;
    this.socket = null;
    this.connectedPeers = new Map();
    
    // Event callbacks
    this.onLocalStream = null;
    this.onRemoteStream = null;
    this.onConnectionStateChange = null;
  }

  // STUN/TURN servers configuration
  getIceServers() {
    return {
      iceServers: [
        {urls: 'stun:stun.l.google.com:19302'},
        {urls: 'stun:stun1.l.google.com:19302'},
      ],
    };
  }

  // Initialize local media stream (audio only for voice calls)
  async initializeLocalStream() {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false, // Voice only
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }

      return true;
    } catch (error) {
      console.error('Error getting user media:', error);
      throw new Error('Failed to access microphone: ' + error.message);
    }
  }

  // Connect to signaling server
  connectSignaling() {
    // Clean up existing socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    const serverUrl = window.location.origin;
    console.log('Connecting to signaling server:', serverUrl);
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000, // 10 second connection timeout
      forceNew: true, // Force new connection
    });

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      if (this.sessionId) {
        this.socket.emit('join-room', this.sessionId, this.role);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange('failed');
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange('disconnected');
      }
    });

    this.socket.on('user-joined', async (userId) => {
      console.log('User joined:', userId);
      if (this.role === 'host') {
        // Host: create peer connection when client joins
        this.createPeerConnection(userId);
      } else if (this.role === 'client') {
        // Client: create peer connection and send offer to host
        const pc = this.createPeerConnection(userId);
        if (pc && this.localStream) {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            if (this.socket) {
              this.socket.emit('offer', {
                offer: offer,
                to: userId,
              });
            }
          } catch (error) {
            console.error('Error creating offer:', error);
          }
        }
      }
    });

    this.socket.on('offer', async (data) => {
      await this.handleOffer(data.offer, data.from);
    });

    this.socket.on('answer', async (data) => {
      await this.handleAnswer(data.answer, data.from);
    });

    this.socket.on('ice-candidate', async (data) => {
      await this.handleIceCandidate(data.candidate, data.from);
    });

    this.socket.on('user-left', (userId) => {
      console.log('User left:', userId);
      if (this.connectedPeers.has(userId)) {
        this.connectedPeers.get(userId).close();
        this.connectedPeers.delete(userId);
      }
    });

    this.socket.on('room-joined', (data) => {
      console.log('Successfully joined room:', data);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error from server:', error);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange('error');
      }
    });
  }

  // Create peer connection
  createPeerConnection(userId) {
    // Check if peer connection already exists
    if (this.connectedPeers.has(userId)) {
      return this.connectedPeers.get(userId);
    }

    const configuration = this.getIceServers();
    const pc = new RTCPeerConnection(configuration);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: userId,
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    };

    this.connectedPeers.set(userId, pc);
    return pc;
  }

  // Start hosting a session
  async startHosting(sessionId) {
    try {
      this.sessionId = sessionId;
      
      // Connect to signaling server first
      this.connectSignaling();
      
      // Wait for socket connection with timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout: Could not connect to server. Please check your network connection.'));
        }, 10000); // 10 second timeout
        
        if (this.socket && this.socket.connected) {
          clearTimeout(timeout);
          resolve();
          return;
        }
        
        this.socket.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        this.socket.once('connect_error', (error) => {
          clearTimeout(timeout);
          reject(new Error('Could not connect to server: ' + (error.message || 'Connection failed')));
        });
      });
      
      // Now try to initialize local stream (mic permission)
      try {
        await this.initializeLocalStream();
      } catch (micError) {
        console.warn('Microphone access failed, but continuing connection:', micError);
        // Don't throw - allow connection without mic
        // The user can still host but won't be able to speak
      }
      
      return true;
    } catch (error) {
      console.error('Error starting host:', error);
      // Clean up socket if connection failed
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      throw error;
    }
  }

  // Join a session
  async joinSession(sessionId) {
    try {
      this.sessionId = sessionId;
      
      // Connect to signaling server first (before requesting mic)
      this.connectSignaling();
      
      // Wait for socket connection with timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout: Could not connect to server. Please check your network connection.'));
        }, 10000); // 10 second timeout
        
        if (this.socket && this.socket.connected) {
          clearTimeout(timeout);
          resolve();
          return;
        }
        
        this.socket.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        this.socket.once('connect_error', (error) => {
          clearTimeout(timeout);
          reject(new Error('Could not connect to server: ' + (error.message || 'Connection failed')));
        });
      });
      
      // Now try to initialize local stream (mic permission)
      // If this fails, we still allow connection but show warning
      try {
        await this.initializeLocalStream();
      } catch (micError) {
        console.warn('Microphone access failed, but continuing connection:', micError);
        // Don't throw - allow connection without mic
        // The user can still join but won't be able to speak
      }
      
      return true;
    } catch (error) {
      console.error('Error joining session:', error);
      // Clean up socket if connection failed
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      throw error;
    }
  }

  // Handle offer from client (host side)
  async handleOffer(offer, from) {
    try {
      let pc = this.connectedPeers.get(from);
      if (!pc) {
        // Create peer connection if it doesn't exist
        pc = this.createPeerConnection(from);
      }
      
      if (!pc) {
        console.error('Failed to create peer connection for', from);
        throw new Error('Failed to create peer connection');
      }
      
      // Ensure local stream is added
      if (this.localStream && pc.getSenders().length === 0) {
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream);
        });
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer back to client
      if (this.socket) {
        this.socket.emit('answer', {
          answer: answer,
          to: from,
        });
      }
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  // Handle answer from host (client side)
  async handleAnswer(answer, from) {
    try {
      let pc = this.connectedPeers.get(from);
      if (!pc) {
        console.error('No peer connection found for', from);
        return;
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(candidate, from) {
    try {
      const pc = this.connectedPeers.get(from);
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  // Toggle mute
  toggleMute() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted; // Enable if muted, disable if not muted
      });
      this.isMuted = !this.isMuted;
    }
    return this.isMuted;
  }

  // Toggle speaker (for web, this is handled by browser)
  toggleSpeaker() {
    this.isSpeakerOn = !this.isSpeakerOn;
    return this.isSpeakerOn;
  }

  // Cleanup
  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }

    this.connectedPeers.forEach(pc => {
      pc.close();
    });
    this.connectedPeers.clear();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.remoteStream = null;
  }
}

export {WebRTCService};
