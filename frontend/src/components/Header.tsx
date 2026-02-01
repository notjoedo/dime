import { useState } from 'react'
import { MdSearch, MdNotifications, MdChat } from 'react-icons/md'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import pfpImage from '../public/pfp.jpeg'

interface HeaderProps {
  title?: string;
}

export default function Header({ title = 'dashboard' }: HeaderProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <>
      <header style={{
        position: 'fixed',
        top: 0,
        left: '85px',
        right: 0,
        height: '81px',
        backgroundColor: '#121212',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        zIndex: 100,
        borderBottom: '1px solid #444',
      }}>
        {/* Dashboard Title */}
        <h1 style={{
          fontFamily: 'Coolvetica, sans-serif',
          fontSize: '36px',
          fontWeight: '400',
          color: '#fff',
          margin: 0,
          letterSpacing: '-0.5px',
        }}>
          {title}
        </h1>

        {/* Search Bar */}
        <div style={{
          position: 'absolute',
          left: '72%',
          transform: 'translateX(-50%)',
          width: '200px',
        }}>
          <MdSearch
            size={22}
            style={{
              position: 'absolute',
              left: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#ffffff',
            }}
          />
          <input
            type="text"
            placeholder="search"
            style={{
              width: '100%',
              height: '42px',
              backgroundColor: '#2d2d2d',
              border: '1px solid #3f3f3f',
              borderRadius: '24px',
              padding: '0 24px 0 54px',
              fontSize: '16px',
              color: '#fff',
              outline: 'none',
              fontFamily: 'Coolvetica, sans-serif',
            }}
          />
        </div>

        {/* Right Icons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          paddingLeft: '32px',
          paddingRight: '16px',
          borderLeft: '1px solid #444',
          height: '100%',
        }}>
          <button style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: '#3a3a3a',
            border: '1.5px solid #555',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            padding: 0,
          }}>
            <MdNotifications size={22} color="#fff" />
          </button>

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: isChatOpen ? '#8B5CF6' : '#3a3a3a',
              border: isChatOpen ? '1.5px solid #8B5CF6' : '1.5px solid #555',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              padding: 0,
            }}
          >
            <MdChat size={22} color="#fff" />
          </button>

          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '1.5px solid #555',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <img
              src={pfpImage}
              alt="Profile"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        </div>
      </header>

      {/* Floating Chatbot */}
      {isChatOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
        }}>
          <div style={{
            width: '380px',
            height: '500px',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #333',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#1a1a1a',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4ade80' }}></div>
                <span style={{ fontWeight: '600' }}>Dime Assistant</span>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
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

            {/* Chatbot Content - Inline Version */}
            <ChatContent />
          </div>
        </div>
      )}
    </>
  )
}

// Inline chat content component
interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
}

function ChatContent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm Dime, your financial assistant. How can I help you today?",
      sender: 'bot',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'aman', message: inputValue }),
      })

      const data = await response.json()

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || 'Sorry, I encountered an error.',
        sender: 'bot',
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error('Error calling chat API:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble connecting. Please try again.",
        sender: 'bot',
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Messages */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: '#f8f9fa',
      }}>
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
              <div style={{ overflowWrap: 'break-word' }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>{children}</ol>,
                    li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
                    strong: ({ children }) => <strong style={{ fontWeight: '600' }}>{children}</strong>,
                    code: ({ children }) => <code style={{ backgroundColor: '#f0f0f0', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}>{children}</code>,
                    table: ({ children }) => (
                      <div style={{ overflowX: 'auto', margin: '8px 0' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>{children}</table>
                      </div>
                    ),
                    th: ({ children }) => <th style={{ border: '1px solid #ddd', padding: '6px', backgroundColor: '#f2f2f2', textAlign: 'left' }}>{children}</th>,
                    td: ({ children }) => <td style={{ border: '1px solid #ddd', padding: '6px' }}>{children}</td>,
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
          <div style={{
            alignSelf: 'flex-start',
            padding: '12px 16px',
            borderRadius: '16px 16px 16px 2px',
            backgroundColor: '#ffffff',
            color: '#999',
            fontSize: '14px',
          }}>
            Thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: '16px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #eee',
        display: 'flex',
        gap: '10px',
      }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
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
    </>
  )
}

