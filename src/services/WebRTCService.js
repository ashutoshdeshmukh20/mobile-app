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
      // Check if getUserMedia is available
      let getUserMedia;
      
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Modern API (preferred)
        getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      } else if (navigator.getUserMedia) {
        // Legacy API fallback
        getUserMedia = (constraints) => {
          return new Promise((resolve, reject) => {
            navigator.getUserMedia(constraints, resolve, reject);
          });
        };
      } else if (navigator.webkitGetUserMedia) {
        // WebKit legacy API
        getUserMedia = (constraints) => {
          return new Promise((resolve, reject) => {
            navigator.webkitGetUserMedia(constraints, resolve, reject);
          });
        };
      } else if (navigator.mozGetUserMedia) {
        // Mozilla legacy API
        getUserMedia = (constraints) => {
          return new Promise((resolve, reject) => {
            navigator.mozGetUserMedia(constraints, resolve, reject);
          });
        };
      } else {
        throw new Error('getUserMedia is not supported in this browser. Please use HTTPS or a modern browser.');
      }

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false, // Voice only
      };

      this.localStream = await getUserMedia(constraints);
      
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
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    const serverUrl = window.location.origin;
    console.log('Connecting to signaling server:', serverUrl);
    
    // Try polling first (more reliable on mobile networks), then websocket
    this.socket = io(serverUrl, {
      transports: ['polling', 'websocket'], // Try polling first
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
      timeout: 20000, // 20 second connection timeout (increased for mobile networks)
      forceNew: true, // Force new connection
      upgrade: true, // Allow upgrade from polling to websocket
      rememberUpgrade: false, // Don't remember upgrade preference
    });

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      // Join room if sessionId is already set
      if (this.sessionId) {
        console.log('Joining room:', this.sessionId, 'as', this.role);
        this.socket.emit('join-room', this.sessionId, this.role);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      console.error('Error details:', {
        message: error.message,
        type: error.type,
        description: error.description
      });
      
      // Provide more helpful error message
      if (error.message === 'timeout') {
        console.error('Connection timeout. Possible causes:');
        console.error('1. Server is not running');
        console.error('2. Firewall blocking connection');
        console.error('3. Network connectivity issues');
        console.error('4. Wrong IP address');
      }
      
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange('failed');
      }
    });
    
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}...`);
    });
    
    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect after all attempts');
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
        // IMPORTANT: Create offer even without localStream to receive audio
        const pc = this.createPeerConnection(userId);
        if (pc) {
          try {
            console.log('Creating offer as client (localStream available:', !!this.localStream, ')');
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            if (this.socket) {
              this.socket.emit('offer', {
                offer: offer,
                to: userId,
              });
              console.log('Offer sent to host:', userId);
            }
          } catch (error) {
            console.error('Error creating offer:', error);
          }
        } else {
          console.error('Failed to create peer connection for client');
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

    // Add local stream tracks (if available)
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try {
          pc.addTrack(track, this.localStream);
        } catch (error) {
          console.warn('Error adding track to peer connection:', error);
        }
      });
    }

    // Handle remote stream - this is critical for receiving audio
    pc.ontrack = (event) => {
      console.log('Received remote stream track:', event);
      console.log('Track details:', {
        kind: event.track?.kind,
        id: event.track?.id,
        enabled: event.track?.enabled,
        readyState: event.track?.readyState,
        streams: event.streams?.length
      });
      
      if (event.streams && event.streams.length > 0) {
        this.remoteStream = event.streams[0];
        console.log('Setting remote stream from event.streams[0]:', this.remoteStream);
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      } else if (event.track) {
        // Fallback: create a stream from the track
        const stream = new MediaStream([event.track]);
        this.remoteStream = stream;
        console.log('Created remote stream from track:', stream);
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      } else {
        console.warn('No stream or track in ontrack event');
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
        // Check if already connected
        if (this.socket && this.socket.connected) {
          // Already connected, emit join-room
          console.log('Socket already connected, joining room');
          this.socket.emit('join-room', this.sessionId, this.role);
          resolve();
          return;
        }
        
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout: Could not connect to server. Please check your network connection.'));
        }, 10000); // 10 second timeout
        
        const connectHandler = () => {
          clearTimeout(timeout);
          console.log('Socket connected, joining room');
          this.socket.emit('join-room', this.sessionId, this.role);
          this.socket.off('connect', connectHandler);
          this.socket.off('connect_error', errorHandler);
          resolve();
        };
        
        const errorHandler = (error) => {
          clearTimeout(timeout);
          this.socket.off('connect', connectHandler);
          this.socket.off('connect_error', errorHandler);
          reject(new Error('Could not connect to server: ' + (error.message || 'Connection failed')));
        };
        
        this.socket.on('connect', connectHandler);
        this.socket.on('connect_error', errorHandler);
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
        // Check if already connected
        if (this.socket && this.socket.connected) {
          // Already connected, emit join-room
          console.log('Socket already connected, joining room');
          this.socket.emit('join-room', this.sessionId, this.role);
          resolve();
          return;
        }
        
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout: Could not connect to server. Please check your network connection.'));
        }, 10000); // 10 second timeout
        
        const connectHandler = () => {
          clearTimeout(timeout);
          console.log('Socket connected, joining room');
          this.socket.emit('join-room', this.sessionId, this.role);
          this.socket.off('connect', connectHandler);
          this.socket.off('connect_error', errorHandler);
          resolve();
        };
        
        const errorHandler = (error) => {
          clearTimeout(timeout);
          this.socket.off('connect', connectHandler);
          this.socket.off('connect_error', errorHandler);
          reject(new Error('Could not connect to server: ' + (error.message || 'Connection failed')));
        };
        
        this.socket.on('connect', connectHandler);
        this.socket.on('connect_error', errorHandler);
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
      
      // Ensure local stream is added (if available)
      if (this.localStream) {
        const existingTracks = pc.getSenders().map(sender => sender.track).filter(Boolean);
        this.localStream.getTracks().forEach(track => {
          // Only add if not already added
          if (!existingTracks.includes(track)) {
            try {
              pc.addTrack(track, this.localStream);
            } catch (error) {
              console.warn('Error adding track:', error);
            }
          }
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
      console.log('Received answer from host:', from);
      let pc = this.connectedPeers.get(from);
      if (!pc) {
        console.error('No peer connection found for', from);
        // Try to create one
        pc = this.createPeerConnection(from);
        if (!pc) {
          throw new Error('Failed to create peer connection');
        }
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Set remote description (answer) successfully');
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
