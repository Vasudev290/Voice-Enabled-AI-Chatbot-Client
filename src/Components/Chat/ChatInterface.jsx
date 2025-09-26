import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { sendMessage, getChatHistory, addMessage } from '../../slices/chatSlice';
import { Send, Bot, User, Loader, AlertCircle, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatInterface = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [spokenMessages, setSpokenMessages] = useState(new Set()); // Track spoken messages
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechSynthesisRef = useRef(null);
  
  const { messages, loading, error, historyLoaded } = useSelector((state) => state.chat);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');

        setInputMessage(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    } else {
      console.warn('Speech Recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Initialize Text-to-Speech
  useEffect(() => {
    speechSynthesisRef.current = window.speechSynthesis;
    
    // Clean up speech synthesis on unmount
    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (user && !historyLoaded) {
      dispatch(getChatHistory())
        .unwrap()
        .catch((error) => {
          console.error('Failed to load chat history:', error);
        });
    }
  }, [dispatch, user, historyLoaded]);

  useEffect(() => {
    if (isSpeechEnabled && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage.response && 
          !lastMessage.isSending && 
          !spokenMessages.has(lastMessage._id)) {
        
        if (speechSynthesisRef.current && speechSynthesisRef.current.speaking) {
          speechSynthesisRef.current.cancel();
        }
        
        speakMessage(lastMessage.response, lastMessage._id);
      }
    }
  }, [messages, isSpeechEnabled, spokenMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const speakMessage = (text, messageId) => {
    if (!isSpeechEnabled || !speechSynthesisRef.current) return;

    try {
      // Create a new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; 
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      utterance.lang = 'en-US';

      utterance.onstart = () => {
        console.log('Speech started');
      };

      utterance.onend = () => {
        console.log('Speech finished');
        // Mark as spoken only when speech completes successfully
        setSpokenMessages(prev => new Set([...prev, messageId]));
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        // Handle specific error cases
        if (event.error === 'not-allowed') {
          console.warn('Speech synthesis not allowed by browser. This might be due to:');
          console.warn('1. Page not served over HTTPS');
          console.warn('2. User needs to interact with page first');
          console.warn('3. Browser permissions blocking speech');
          setIsSpeechEnabled(false); // Disable speech to prevent repeated errors
        }
      };

      // Speak the message
      speechSynthesisRef.current.speak(utterance);
      
    } catch (error) {
      console.error('Error in speakMessage:', error);
    }
  };

  const toggleSpeech = () => {
    if (isSpeechEnabled) {
      // Stop any ongoing speech when disabling
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    } else {
      // When enabling speech, try to speak the last message if it hasn't been spoken
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.response && !spokenMessages.has(lastMessage._id)) {
        speakMessage(lastMessage.response, lastMessage._id);
      }
    }
    setIsSpeechEnabled(!isSpeechEnabled);
  };

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    // Create a temporary message with serializable data
    const tempMessage = {
      _id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More unique ID
      query: inputMessage,
      response: '',
      createdAt: new Date().toISOString(), // Use ISO string for serializability
      isSending: true,
    };

    dispatch(addMessage(tempMessage));
    setInputMessage('');

    try {
      await dispatch(sendMessage(inputMessage)).unwrap();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const formatTime = (dateString) => {
    try {
      return new Date(dateString).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return '--:--';
    }
  };

  const sortedMessages = [...messages]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((message, index) => ({
      ...message,
      uniqueKey: message._id || `msg-${index}-${Date.now()}`
    }));

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-gray-900">
      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="m-4 p-4 bg-red-500 bg-opacity-20 border border-red-500 text-red-200 rounded-lg flex items-center space-x-2"
        >
          <AlertCircle size={20} />
          <div>
            <strong>Error:</strong> {typeof error === 'string' ? error : error.message || 'Something went wrong'}
            <br />
            <small>You can still try sending messages</small>
          </div>
        </motion.div>
      )}

      {/* Header with Speech Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <Bot className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-xl font-bold text-white">AI Assistant</h1>
            <p className="text-sm text-gray-400">Powered by AI</p>
          </div>
        </div>
        
        {/* Speech Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleSpeech}
          className={`p-2 rounded-lg transition-all duration-200 ${
            isSpeechEnabled 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-600 text-gray-300'
          }`}
          title={isSpeechEnabled ? "Disable voice responses" : "Enable voice responses"}
        >
          {isSpeechEnabled ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5" />
          )}
        </motion.button>
      </div>

      {/* Chat Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        <div className="space-y-6">
          <AnimatePresence>
            {sortedMessages.length === 0 && historyLoaded ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center text-white mt-20"
              >
                <Bot className="h-16 w-16 mx-auto mb-4 text-white opacity-50" />
                <h3 className="text-2xl font-bold mb-2">Welcome to AI Chatbot!</h3>
                <p className="text-blue-100">Start a conversation by sending a message below.</p>
                <div className="mt-4 text-sm text-gray-400">
                  <p>💡 You can type or use voice input</p>
                  <p>🔊 Enable voice responses for audio feedback</p>
                </div>
              </motion.div>
            ) : (
              sortedMessages.map((message) => (
                <div key={message.uniqueKey} className="space-y-4">
                  {/* User Message */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-end"
                  >
                    <div className="flex items-end space-x-2 max-w-2xl">
                      <div className="text-right">
                        <span className="text-blue-200 text-sm block mb-1">
                          {user?.name} • {formatTime(message.createdAt)}
                        </span>
                        <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-br-none max-w-md">
                          <p className="whitespace-pre-wrap">{message.query}</p>
                        </div>
                      </div>
                      <div className="bg-blue-500 text-white p-2 rounded-full flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                  </motion.div>

                  {/* Bot Response */}
                  {message.response && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex justify-start"
                    >
                      <div className="flex items-end space-x-2 max-w-2xl">
                        <div className="bg-gray-600 text-white p-2 rounded-full flex-shrink-0">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-blue-200 text-sm">
                              AI Assistant • {formatTime(message.createdAt)}
                            </span>
                            {isSpeechEnabled && spokenMessages.has(message._id) && (
                              <Volume2 className="h-3 w-3 text-green-400" />
                            )}
                          </div>
                          <div className="bg-gray-700 text-white px-4 py-3 rounded-2xl rounded-bl-none max-w-md">
                            <p className="whitespace-pre-wrap">{message.response}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Loading Indicator */}
                  {message.isSending && !message.response && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex justify-start"
                    >
                      <div className="flex items-end space-x-2">
                        <div className="bg-gray-600 text-white p-2 rounded-full flex-shrink-0">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="bg-gray-700 text-white px-4 py-3 rounded-2xl rounded-bl-none">
                          <div className="flex items-center space-x-2">
                            <Loader className="h-4 w-4 animate-spin" />
                            <span>Thinking...</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              ))
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="glass-effect rounded-2xl m-4 p-4 border border-white border-opacity-10">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message here or use voice input..."
              className="w-full px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          
          {/* Voice Input Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleSpeechRecognition}
            disabled={!recognitionRef.current || loading}
            className={`p-3 rounded-xl transition-all duration-200 flex-shrink-0 ${
              isListening 
                ? 'bg-red-500 text-white' 
                : 'bg-white bg-opacity-10 text-white hover:bg-opacity-20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Voice input"
          >
            {isListening ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </motion.button>

          {/* Send Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="bg-blue-500 text-white p-3 rounded-xl hover:bg-blue-600 transition-all duration-200 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send message"
          >
            {loading ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </motion.button>
        </form>
        
        {/* Voice Input Status */}
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 text-center"
          >
            <div className="inline-flex items-center space-x-2 bg-red-500 bg-opacity-20 px-3 py-2 rounded-full border border-red-500 border-opacity-30">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <span className="text-red-200 text-sm">Listening... Speak now</span>
            </div>
          </motion.div>
        )}

        {/* Speech Status */}
        <div className="mt-2 text-center">
          <div className="inline-flex items-center space-x-2 text-xs text-gray-400">
            {isSpeechEnabled ? (
              <>
                <Volume2 className="h-3 w-3 text-green-400" />
                <span>Voice responses enabled</span>
              </>
            ) : (
              <>
                <VolumeX className="h-3 w-3 text-gray-400" />
                <span>Voice responses disabled</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;