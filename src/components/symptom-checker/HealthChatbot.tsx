import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2 } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface HealthChatbotProps {
    sessionId?: string;
}

export default function HealthChatbot({ sessionId = 'default' }: HealthChatbotProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hi! 👋 I'm your health assistant. Ask me anything about general health, nutrition, wellness, or lifestyle tips!"
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        // Add user message
        const userMessage: Message = {
            role: 'user',
            content: inputMessage
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            const response = await fetch(`${apiUrl}/api/health-chatbot/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: inputMessage,
                    session_id: sessionId
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Add assistant response
            const assistantMessage: Message = {
                role: 'assistant',
                content: data.response || "I'm sorry, I couldn't process that. Please try again."
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please try again in a moment. 🙏"
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

    const handleClearChat = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            await fetch(`${apiUrl}/api/health-chatbot/clear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ session_id: sessionId }),
            });

            // Reset messages to initial state
            setMessages([
                {
                    role: 'assistant',
                    content: "Hi! 👋 I'm your health assistant. Ask me anything about general health, nutrition, wellness, or lifestyle tips!"
                }
            ]);
        } catch (error) {
            console.error('Error clearing chat:', error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-800/80 rounded-lg border border-slate-700/50">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                            Health Assistant
                        </h3>
                        <p className="text-xs text-slate-400">Ask me anything!</p>
                    </div>
                </div>
                <button
                    onClick={handleClearChat}
                    className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                    title="Clear conversation"
                >
                    <Trash2 className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-96">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex items-start gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''
                            }`}
                    >
                        {/* Avatar */}
                        <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${message.role === 'user'
                                    ? 'bg-blue-600'
                                    : 'bg-blue-500'
                                }`}
                        >
                            {message.role === 'user' ? (
                                <User className="w-4 h-4 text-white" />
                            ) : (
                                <Bot className="w-4 h-4 text-white" />
                            )}
                        </div>

                        {/* Message bubble */}
                        <div
                            className={`flex-1 px-3 py-2 rounded-lg text-xs ${message.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-700/50 text-slate-200'
                                }`}
                        >
                            <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex items-start gap-2">
                        <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 px-3 py-2 rounded-lg bg-slate-700/50">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                <span className="text-xs text-slate-400">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-700/50">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask a health question..."
                        className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                            <Send className="w-4 h-4 text-white" />
                        )}
                    </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}
