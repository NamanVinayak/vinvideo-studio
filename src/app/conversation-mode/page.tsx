'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ConversationMode() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi there! I'm here to help you turn your idea into a short dramatic video. What's your idea?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canGenerateScript, setCanGenerateScript] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [scriptGenerated, setScriptGenerated] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Enable Generate Script button after 2+ user messages (3+ total exchanges)
      const userMessageCount = [...messages, userMessage].filter(m => m.role === 'user').length;
      console.log('User message count:', userMessageCount);
      if (userMessageCount >= 2) {
        setCanGenerateScript(true);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble responding right now. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleGenerateScript = async () => {
    if (!canGenerateScript) return;
    
    setIsGeneratingScript(true);
    
    try {
      // Extract the full conversation
      const conversationText = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');

      // Call our conversation-to-script API
      const response = await fetch('/api/conversation-to-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: conversationText
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate script from conversation');
      }

      const data = await response.json();
      setGeneratedScript(data.script);
      setScriptGenerated(true);
      
    } catch (error) {
      console.error('Error generating script:', error);
      // Add error message to conversation
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I had trouble generating the script. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!scriptGenerated || !generatedScript) return;
    
    try {
      // Navigate to test-tts with the generated script
      const searchParams = new URLSearchParams({
        conversationMode: 'true',
        script: encodeURIComponent(generatedScript)
      });
      
      router.push(`/test-tts?${searchParams.toString()}`);
    } catch (error) {
      console.error('Error navigating to video generation:', error);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>VinVideo</h1>
        <nav className={styles.nav}>
          <a href="/" className={styles.navLink}>Home</a>
          <a href="/test-tts" className={styles.navLink}>Script Mode</a>
        </nav>
      </div>

      <div className={styles.chatContainer}>
        <div className={styles.messagesContainer}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.role === 'user' ? styles.userMessage : styles.assistantMessage
              }`}
            >
              <div className={styles.messageContent}>
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.message} ${styles.assistantMessage}`}>
              <div className={styles.messageContent}>
                <div className={styles.loadingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.inputContainer}>
          <div className={styles.inputWrapper}>
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className={styles.messageInput}
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className={styles.sendButton}
            >
              Send
            </button>
          </div>
          
          {canGenerateScript && !scriptGenerated && (
            <button
              onClick={handleGenerateScript}
              disabled={isGeneratingScript}
              className={styles.generateScriptButton}
            >
              {isGeneratingScript ? 'Generating Script...' : 'Generate Script'}
            </button>
          )}
          
          {/* Debug info - remove later */}
          <div style={{color: '#666', fontSize: '12px', marginTop: '0.5rem'}}>
            Debug: canGenerateScript={canGenerateScript.toString()}, scriptGenerated={scriptGenerated.toString()}, userMessages={messages.filter(m => m.role === 'user').length}
          </div>
          
          {scriptGenerated && (
            <div className={styles.scriptContainer}>
              <h3>Generated Script:</h3>
              <div className={styles.scriptPreview}>
                {generatedScript}
              </div>
              <button
                onClick={handleGenerateVideo}
                className={styles.generateVideoButton}
              >
                Generate Video
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}