import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Watch, HeartPulse, Activity, Wifi, WifiOff } from 'lucide-react';
import clsx from 'clsx';
import { API_URL } from '../api';

const gadgets = [
    {
        id: 'apple_watch_8',
        name: 'Apple Watch Series 8',
        icon: <Watch size={24} />,
        capabilities: ['heart_rate', 'spo2'],
        color: 'blue'
    },
    {
        id: 'fitbit_pulse',
        name: 'Fitbit Charge 5',
        icon: <HeartPulse size={24} />,
        capabilities: ['heart_rate'],
        color: 'emerald'
    },
    {
        id: 'generic_spo2',
        name: 'Medical O2 Ring Explorer',
        icon: <Activity size={24} />,
        capabilities: ['spo2'],
        color: 'amber'
    }
];

export default function DeviceConnector({ patientId }) {
    const [connectedDevices, setConnectedDevices] = useState({});

    // Cleanup intervals on unmount
    useEffect(() => {
        return () => {
            Object.values(connectedDevices).forEach(intervalId => clearInterval(intervalId));
        };
    }, [connectedDevices]);

    const handleConnect = (gadget) => {
        if (connectedDevices[gadget.id]) {
            // Disconnect
            clearInterval(connectedDevices[gadget.id]);
            setConnectedDevices(prev => {
                const updated = { ...prev };
                delete updated[gadget.id];
                return updated;
            });
            return;
        }

        // Connect & start streaming
        const intervalId = setInterval(() => sendLiveData(gadget), 5000);
        setConnectedDevices(prev => ({
            ...prev,
            [gadget.id]: intervalId
        }));
    };

    const sendLiveData = async (gadget) => {
        try {
            const timestamp = new Date().toISOString();
            
            if (gadget.capabilities.includes('heart_rate')) {
                // Heart rate between 65 and 95
                const hrValue = Math.floor(Math.random() * (95 - 65 + 1) + 65);
                
                // Occasional dramatic spike
                const isSpike = Math.random() > 0.95;
                const finalHr = isSpike ? hrValue + 40 : hrValue;

                await axios.post(`${API_URL}/api/ingest`, {
                    patient_id: patientId,
                    device_id: gadget.id,
                    vital_type: 'heart_rate',
                    value: finalHr,
                    unit: 'bpm',
                    timestamp
                }, {
                    headers: { 'x-device-key': import.meta.env.VITE_DEVICE_API_KEY }
                });
            }

            if (gadget.capabilities.includes('spo2')) {
                // SpO2 between 95 and 100
                const spo2Value = Math.floor(Math.random() * (100 - 95 + 1) + 95);

                // Occasional dramatic dip
                const isDip = Math.random() > 0.95;
                const finalSpo2 = isDip ? spo2Value - 10 : spo2Value;

                await axios.post(`${API_URL}/api/ingest`, {
                    patient_id: patientId,
                    device_id: gadget.id,
                    vital_type: 'spo2',
                    value: finalSpo2,
                    unit: '%',
                    timestamp
                }, {
                    headers: { 'x-device-key': import.meta.env.VITE_DEVICE_API_KEY }
                });
            }
        } catch (error) {
            console.error('Data stream error:', error);
        }
    };

    return (
        <div className="glass-panel p-6 bg-white shadow-sm border border-slate-100 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Wifi size={18} className="text-blue-500" /> Wearable Devices & Gadgets
                </h3>
            </div>
            
            <p className="text-sm text-slate-500 mb-4">
                Connect your personal gadgets to share live health data securely with your doctor.
            </p>

            <div className="flex-1 overflow-y-auto space-y-3">
                {gadgets.map(gadget => {
                    const isConnected = !!connectedDevices[gadget.id];
                    return (
                        <div key={gadget.id} className={clsx(
                            "p-4 rounded-xl border flex items-center justify-between transition-all",
                            isConnected ? `bg-${gadget.color}-50 border-${gadget.color}-500 shadow-sm` : 'bg-slate-50 border-slate-200'
                        )}>
                            <div className="flex items-center gap-3">
                                <div className={clsx(
                                    "p-2 rounded-lg text-white font-bold shrink-0",
                                    isConnected ? `bg-${gadget.color}-500` : "bg-slate-300"
                                )}>
                                    {gadget.icon}
                                </div>
                                <div>
                                    <h4 className={clsx("font-semibold text-sm", isConnected ? "text-slate-800" : "text-slate-600")}>
                                        {gadget.name}
                                    </h4>
                                    <div className="flex gap-1 mt-1">
                                        {gadget.capabilities.map(cap => (
                                            <span key={cap} className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                                                {cap.replace('_', ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => handleConnect(gadget)}
                                className={clsx(
                                    "text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors",
                                    isConnected 
                                        ? `bg-${gadget.color}-100 text-${gadget.color}-700 hover:bg-${gadget.color}-200` 
                                        : "bg-teal-600 text-white hover:bg-teal-700"
                                )}
                            >
                                {isConnected ? (
                                    <><Wifi size={12} className="animate-pulse" /> Connected</>
                                ) : (
                                    <><WifiOff size={12} /> Connect</>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
