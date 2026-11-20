import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { socket } from '../socket';
import { Send, UserCircle, MessageSquare, Paperclip, FileText } from 'lucide-react';
import clsx from 'clsx';
import { API_URL } from '../api';

export default function ChatWidget({ patientId, currentRole, currentUserId, inline = false }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isExpanded, setIsExpanded] = useState(inline ? true : false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);

    // New State for the unified chat UI
    const [mode, setMode] = useState(currentRole === 'patient' ? 'ai' : 'doctor');
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState('');

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };
    
    // Fetch initial chat history & doctors list if patient
    useEffect(() => {
        if (!isExpanded) return;

        axios.get(`${API_URL}/api/messages/${patientId}`)
            .then(res => {
                setMessages(res.data.messages || []);
                scrollToBottom();
            })
            .catch(err => console.error('Error fetching chat history:', err));

        if (currentRole === 'patient') {
            axios.get(`${API_URL}/api/doctors`)
                .then(res => setDoctors(res.data.doctors || []))
                .catch(err => console.error('Error fetching doctors:', err));
        }

        // Join the socket room for this patient
        socket.emit('join_chat', patientId);

        // Listen for new messages
        const handleReceiveMessage = (msg) => {
            setMessages(prev => [...prev, msg]);
            scrollToBottom();
        };

        socket.on('receive_message', handleReceiveMessage);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
        };
    }, [isExpanded, patientId, currentRole]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const msgContent = newMessage.trim();
        setNewMessage('');

        if (mode === 'ai') {
            const userMsg = {
                id: Date.now(),
                patient_id: patientId,
                sender_role: 'patient',
                sender_id: currentUserId,
                content: msgContent,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, userMsg]);
            scrollToBottom();

            try {
                const res = await axios.post(`${API_URL}/api/ai/chat`, { message: msgContent });
                const aiMsg = {
                    id: Date.now() + 1,
                    patient_id: patientId,
                    sender_role: 'ai',
                    sender_id: 'AI Assistant',
                    content: res.data.reply,
                    timestamp: new Date().toISOString()
                };
                setMessages(prev => [...prev, aiMsg]);
                scrollToBottom();
            } catch (error) {
                console.error('AI error:', error);
            }
        } else {
            const payload = {
                patient_id: patientId,
                content: msgContent
            };
            socket.emit('send_message', payload);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (mode === 'ai') {
            alert('File sharing is currently only supported when talking to a Doctor.');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(`${API_URL}/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.success) {
                const payload = {
                    patient_id: patientId,
                    content: `📎 Shared a file: ${file.name}`,
                    attachment_url: new URL(res.data.fileUrl, API_URL).toString(),
                    attachment_type: res.data.fileType
                };
                socket.emit('send_message', payload);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleEmergency = () => {
        socket.emit('emergency', { patientId });
        const sysMsg = {
            id: Date.now(),
            patient_id: patientId,
            sender_role: 'system',
            sender_id: 'System',
            content: '🚨 Priority Emergency alert has been broadcasted to all active doctors!',
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, sysMsg]);
        scrollToBottom();
    };

    const containerClasses = inline 
        ? "w-full h-full flex flex-col" 
        : clsx("fixed bottom-4 right-4 z-50 transition-all duration-300", isExpanded ? "w-[450px] max-w-[95vw]" : "w-auto");

    const chatBoxClasses = inline 
        ? "bg-white rounded-2xl shadow-md overflow-hidden flex flex-col h-[500px] border border-slate-200"
        : "bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px] border border-slate-200";

    return (
        <div className={containerClasses}>
            {/* Collapsed Bubble */}
            {!isExpanded && !inline && (
                <button 
                    onClick={() => setIsExpanded(true)}
                    className="bg-teal-600 hover:bg-teal-700 text-white rounded-full p-4 shadow-xl flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
                >
                    <MessageSquare size={24} />
                    <span className="font-bold hidden md:inline">Message Doctor / AI</span>
                </button>
            )}

            {/* Expanded Chat Box */}
            {isExpanded && (
                <div className={chatBoxClasses}>
                    {/* Header */}
                    <div className="bg-teal-600 p-3 sm:p-4 text-white flex justify-between items-center shadow-sm z-10 flex-col sm:flex-row gap-3">
                        <div className="flex items-center gap-2 w-full sm:w-auto relative">
                            <MessageSquare size={20} className="shrink-0" />
                            <h3 className="font-bold whitespace-nowrap">{inline ? 'Medical Chat' : 'Medical Chat'}</h3>
                            {!inline && (
                                <button onClick={() => setIsExpanded(false)} className="text-teal-100 hover:text-white cursor-pointer absolute right-0 sm:hidden">
                                    <span className="text-xl leading-none">&times;</span>
                                </button>
                            )}
                        </div>
                        
                        {currentRole === 'patient' && (
                            <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 sm:pb-0 scrollbar-hide shrink-0">
                                {mode === 'ai' ? (
                                    <>
                                        <select 
                                            className="bg-teal-700 text-white rounded px-2 py-1.5 outline-none text-[11px] sm:text-xs min-w-[100px] cursor-pointer"
                                            value={selectedDoctor}
                                            onChange={(e) => setSelectedDoctor(e.target.value)}
                                        >
                                            <option value="">Select Doctor 👨‍⚕️</option>
                                            {doctors.map(doc => (
                                                <option key={doc.doctorId} value={doc.doctorId}>{doc.name}</option>
                                            ))}
                                        </select>
                                        <button 
                                            onClick={() => {
                                                if(!selectedDoctor) {
                                                    alert('Please select a doctor to connect to.');
                                                    return;
                                                }
                                                setMode('doctor');
                                                const sysMsg = {
                                                    id: Date.now(),
                                                    sender_role: 'system',
                                                    content: `Switched to Real-Time Doctor connection.`,
                                                    timestamp: new Date().toISOString()
                                                };
                                                setMessages(prev => [...prev, sysMsg]);
                                            }}
                                            className="bg-white text-teal-700 px-2 sm:px-3 py-1.5 rounded text-[11px] sm:text-xs font-bold whitespace-nowrap shadow-sm hover:bg-teal-50"
                                        >
                                            Talk to Doctor ⚡
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => setMode('ai')}
                                         className="bg-teal-800 hover:bg-teal-900 border border-teal-500 shadow-inner text-white px-3 py-1.5 rounded text-xs whitespace-nowrap font-medium"
                                    >
                                        Back to AI 🤖
                                    </button>
                                )}
                                
                                <button 
                                    onClick={handleEmergency}
                                    className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 py-1.5 rounded text-[11px] sm:text-xs font-bold whitespace-nowrap flex items-center gap-1 shadow-md animate-pulse ml-auto"
                                >
                                    🚨 Emergency
                                </button>
                            </div>
                        )}

                        {!inline && (
                            <button onClick={() => setIsExpanded(false)} className="hidden sm:block text-teal-100 hover:text-white cursor-pointer ml-auto shrink-0 pl-2">
                                <span className="text-xl leading-none">&times;</span>
                            </button>
                        )}
                    </div>

                    {/* Appended Context Bar for AI */}
                    {mode === 'ai' && currentRole === 'patient' && (
                        <div className="bg-purple-100 text-purple-800 px-3 py-1 text-xs text-center font-semibold border-b border-purple-200">
                            🤖 You are talking to our AI Medical Assistant
                        </div>
                    )}
                    {mode === 'doctor' && currentRole === 'patient' && (
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 text-xs text-center font-semibold border-b border-blue-200">
                            ⚡ Connected to Live Doctor Socket
                        </div>
                    )}

                    {/* Messages Area */}
                    <div className="flex-1 p-4 bg-slate-50 overflow-y-auto flex flex-col gap-3">
                        {messages.length === 0 ? (
                            <div className="text-center text-slate-400 mt-10 text-sm">
                                No messages yet. Start the conversation!
                            </div>
                        ) : (
                            messages.map(msg => {
                                const isMe = msg.sender_role === currentRole &&
                                    String(msg.sender_id) === String(currentUserId);
                                
                                let bubbleColor = "bg-white border text-slate-800 rounded-tl-sm";
                                let iconBubble = <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs" title="Patient">PT</div>;
                                
                                if (isMe && msg.sender_role !== 'system') {
                                    bubbleColor = "bg-teal-600 text-white rounded-tr-sm";
                                }

                                if (msg.sender_role === 'doctor') {
                                    iconBubble = <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs" title={msg.sender_id}>DR</div>;
                                } else if (msg.sender_role === 'ai') {
                                    iconBubble = <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs" title="AI">AI</div>;
                                    bubbleColor = "bg-purple-50 border border-purple-200 text-slate-800 rounded-tl-sm shadow-sm";
                                } else if (msg.sender_role === 'system') {
                                    bubbleColor = "bg-red-50 border border-red-200 text-red-800 rounded-lg text-center font-bold italic w-full text-xs shadow-sm py-3";
                                }

                                return (
                                    <div key={msg.id} className={clsx("flex gap-2 max-w-[85%]", isMe && msg.sender_role !== 'system' ? "self-end flex-row-reverse" : "self-start", msg.sender_role === 'system' && "self-center justify-center max-w-[95%]")}>
                                        {msg.sender_role !== 'system' && (
                                            <div className="shrink-0 mt-1">
                                                {iconBubble}
                                            </div>
                                        )}
                                        <div className={clsx("px-4 py-2 rounded-2xl shadow-sm text-sm", bubbleColor)}>
                                            <p>{msg.content}</p>
                                            
                                            {/* Render Attachments */}
                                            {msg.attachment_url && msg.attachment_type?.startsWith('image/') && (
                                                <img src={msg.attachment_url} alt="attachment" className="max-w-[200px] w-full object-cover rounded-lg mt-2 border border-slate-200" />
                                            )}
                                            {msg.attachment_url && !msg.attachment_type?.startsWith('image/') && (
                                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={clsx("flex items-center gap-2 px-3 py-2 rounded-lg mt-2 transition border font-medium text-xs", isMe && msg.sender_role !== 'system' ? "bg-teal-700 border-teal-500 text-white hover:bg-teal-800" : "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100")}>
                                                    <Paperclip size={14} /> Download File
                                                </a>
                                            )}

                                            {msg.sender_role !== 'system' && (
                                                <span className={clsx("text-[10px] mt-2 block opacity-80", isMe ? "text-teal-100" : "text-slate-400")}>
                                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center">
                        <div className="shrink-0 flex items-center">
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                onChange={handleFileUpload}
                                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                            />
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="text-slate-400 hover:text-teal-600 transition-colors p-2 disabled:opacity-50 cursor-pointer"
                                title="Attach Document or Image to send to Doctor"
                            >
                                <Paperclip size={20} />
                            </button>
                        </div>
                        <input 
                            type="text" 
                            className="flex-1 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
                            placeholder={isUploading ? "Uploading..." : (mode === 'ai' ? "Ask the AI assistant..." : "Type a message to the doctor...")}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={isUploading}
                        />
                        <button 
                            type="submit" 
                            disabled={!newMessage.trim()}
                            className="bg-teal-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                        >
                            <Send size={16} className="-ml-1" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
