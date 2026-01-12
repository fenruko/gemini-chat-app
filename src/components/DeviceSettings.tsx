import React from 'react';
import { useDevices } from '../hooks/useDevices';

interface DeviceSettingsProps {
  onMicChange: (deviceId: string) => void;
  onSpeakerChange: (deviceId: string) => void;
}

const DeviceSettings: React.FC<DeviceSettingsProps> = ({ onMicChange, onSpeakerChange }) => {
  const { audioInputDevices, audioOutputDevices } = useDevices();

  return (
    <div className="device-settings">
      <div className="device-select">
        <label>Microphone</label>
        <select onChange={(e) => onMicChange(e.target.value)}>
          {audioInputDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
          ))}
        </select>
      </div>
      <div className="device-select">
        <label>Speakers</label>
        <select onChange={(e) => onSpeakerChange(e.target.value)}>
          {audioOutputDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default DeviceSettings;
