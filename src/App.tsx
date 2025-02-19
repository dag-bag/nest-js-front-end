import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { Send, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const socket = io("https://slimy-julietta-virender-cf26f00b.koyeb.app/chat");

interface Message {
  name: string;
  message: string;
  timestamp: string;
}

interface UserTyping {
  name: string;
  isTyping: boolean;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    socket.on("created", (message: Message) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    });

    socket.on("userTyping", ({ name, isTyping }: UserTyping) => {
      setTypingUsers((prev) =>
        isTyping
          ? [...new Set([...prev, name])]
          : prev.filter((user) => user !== name)
      );
    });

    return () => {
      socket.off("created");
      socket.off("userTyping");
    };
  }, []);

  useEffect(() => {
    if (messages.length === 0) {
      socket.emit("findAllMessages", {}, (response: Message[]) => {
        setMessages(response);
        scrollToBottom();
      });
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      socket.emit("join", { name: username });
      setIsJoined(true);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && username) {
      const messageData = {
        name: username,
        message: newMessage.trim(),
        timestamp: new Date().toISOString(),
      };
      socket.emit("createMessage", messageData);
      setNewMessage("");
      socket.emit("typing", { isTyping: false });
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit("typing", { isTyping: true });

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { isTyping: false });
    }, 1000);
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="flex items-center justify-center mb-8">
            <MessageSquare className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-6">Join Chat</h1>
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Join
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-xl font-semibold text-gray-800">Chat Room</h1>
          <p className="text-sm text-gray-600">Logged in as {username}</p>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col">
        <div className="flex-1 bg-white rounded-lg shadow-md p-4 mb-4 overflow-y-auto max-h-[calc(100vh-240px)]">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.name === username ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.name === username
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="text-sm font-semibold">{msg.name}</p>
                  <p className="mt-1">{msg.message}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {formatDistanceToNow(new Date(msg.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {typingUsers.length > 0 && (
          <div className="text-sm text-gray-600 mb-2">
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"}{" "}
            typing...
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type your message..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
