import { useState, useEffect } from 'react';

export function useDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    const getDevices = async () => {
      try {
        // We need to get media permissions first to get the full list of device labels
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        setDevices(mediaDevices);
        // Stop the temporary stream immediately after getting the list
        stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error("Could not get media devices.", e);
      }
    };
    getDevices();
  }, []);

  const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
  const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');

  return { audioInputDevices, audioOutputDevices };
}
