import React, { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message } from "@/types";

interface ChatPanelProps {
  messages: Message[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUserId,
  onSendMessage,
}) => {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = input.trim();
    if (!clean) return;
    onSendMessage(clean);
    setInput("");
  };

  return (
    <div className="w-full lg:w-80 flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden h-[420px] lg:h-auto shadow-md">
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Room Chat
        </span>
        <span className="text-[11px] text-zinc-500">{messages.length} msgs</span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 text-xs italic">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.user_id === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex flex-col text-xs ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center space-x-1.5 mb-0.5">
                  <span className={`font-medium ${isMe ? "text-violet-400" : "text-zinc-400"}`}>
                    {m.display_name}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div
                  className={`px-3 py-2 rounded-lg max-w-[85%] break-words leading-relaxed ${
                    isMe
                      ? "bg-violet-600 text-white rounded-br-none"
                      : "bg-zinc-800 text-zinc-200 rounded-bl-none"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-zinc-800 bg-zinc-900/40 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          maxLength={1000}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
          aria-label="Chat input message"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!input.trim()}
          className="bg-violet-600 hover:bg-violet-500 text-white p-2 h-8 w-8 rounded-lg flex items-center justify-center"
          aria-label="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  );
};
