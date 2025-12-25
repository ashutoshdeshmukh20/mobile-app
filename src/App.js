import React from 'react';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import HostScreen from './screens/HostScreen';
import JoinScreen from './screens/JoinScreen';
import CallScreen from './screens/CallScreen';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/host" element={<HostScreen />} />
          <Route path="/join" element={<JoinScreen />} />
          <Route path="/call" element={<CallScreen />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

