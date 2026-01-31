import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Hi! I\'m Dime, your financial assistant. How can I help you today?',
            sender: 'bot',
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputValue,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:5001/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: 'aman',
                    message: inputValue,
                }),
            });

            const data = await response.json();

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: data.response || 'Sorry, I encountered an error.',
                sender: 'bot',
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error('Error calling chat API:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: 'I\'m sorry, I\'m having trouble connecting to the server. Please try again later.',
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, fontFamily: 'system-ui, sans-serif' }}>
            {/* Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '30px',
                        backgroundColor: '#1a1a1a',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div
                    style={{
                        width: '380px',
                        height: '500px',
                        backgroundColor: '#ffffff',
                        borderRadius: '20px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        border: '1px solid #eee',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            padding: '16px 20px',
                            backgroundColor: '#1a1a1a',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4ade80' }}></div>
                            <span style={{ fontWeight: '600' }}>Dime Assistant</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '4px',
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div
                        style={{
                            flex: 1,
                            padding: '20px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            backgroundColor: '#f8f9fa',
                        }}
                    >
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                style={{
                                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '80%',
                                    padding: '12px 16px',
                                    borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                                    backgroundColor: msg.sender === 'user' ? '#1a1a1a' : '#ffffff',
                                    color: msg.sender === 'user' ? '#ffffff' : '#333333',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                    fontSize: '14px',
                                    lineHeight: '1.4',
                                }}
                            >
                                {msg.sender === 'bot' ? (
                                    <div className="markdown-container" style={{
                                        overflowWrap: 'break-word',
                                    }}>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({ node, ...props }) => <p style={{ margin: '0 0 8px 0' }} {...props} />,
                                                ul: ({ node, ...props }) => <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }} {...props} />,
                                                ol: ({ node, ...props }) => <ol style={{ margin: '0 0 8px 0', paddingLeft: '20px' }} {...props} />,
                                                li: ({ node, ...props }) => <li style={{ marginBottom: '4px' }} {...props} />,
                                                strong: ({ node, ...props }) => <strong style={{ fontWeight: '600' }} {...props} />,
                                                code: ({ node, ...props }) => <code style={{ backgroundColor: '#f0f0f0', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace' }} {...props} />,
                                                table: ({ node, ...props }) => (
                                                    <div style={{ overflowX: 'auto', margin: '8px 0' }}>
                                                        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }} {...props} />
                                                    </div>
                                                ),
                                                th: ({ node, ...props }) => <th style={{ border: '1px solid #ddd', padding: '6px', backgroundColor: '#f2f2f2', textAlign: 'left' }} {...props} />,
                                                td: ({ node, ...props }) => <td style={{ border: '1px solid #ddd', padding: '6px' }} {...props} />,
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    msg.text
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div
                                style={{
                                    alignSelf: 'flex-start',
                                    padding: '12px 16px',
                                    borderRadius: '16px 16px 16px 2px',
                                    backgroundColor: '#ffffff',
                                    color: '#999',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                    fontSize: '14px',
                                }}
                            >
                                Thinking...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div
                        style={{
                            padding: '16px',
                            backgroundColor: '#ffffff',
                            borderTop: '1px solid #eee',
                            display: 'flex',
                            gap: '10px',
                        }}
                    >
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask me anything..."
                            style={{
                                flex: 1,
                                padding: '10px 16px',
                                borderRadius: '24px',
                                border: '1px solid #ddd',
                                outline: 'none',
                                fontSize: '14px',
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !inputValue.trim()}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '20px',
                                backgroundColor: inputValue.trim() ? '#1a1a1a' : '#ccc',
                                color: 'white',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: inputValue.trim() ? 'pointer' : 'default',
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
