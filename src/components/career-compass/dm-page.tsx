'use client';
import { useEffect, useState, useRef } from 'react';
import { useAppContext } from '@/contexts/app-context';
import { dmService, ChatSummary, ChatMessage } from '@/lib/services';
import { onValue, off } from 'firebase/database';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, MessageCircle, AlertCircle, Check, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function DMPage() {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Load Chat List (Inbox) - LISTENER
  useEffect(() => {
    if (!user) return;
    const chatListRef = dmService.getUserChatsRef(user.uid);
    
    const unsubscribe = onValue(chatListRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.values(data) as ChatSummary[];
        // Sort by newest first
        const sortedList = list.sort((a, b) => b.timestamp - a.timestamp);
        setChats(sortedList);
      } else {
        setChats([]);
      }
    });

    return () => off(chatListRef);
  }, [user]);

  // 2. Handle Redirects and Updates - EFFECT
  useEffect(() => {
    // A. Check for Redirect (open_chat_id)
    const pendingChatId = sessionStorage.getItem('open_chat_id');
    
    // We check if pendingChatId exists. We search for it in 'chats'.
    // Because 'chats' updates asynchronously via the firebase listener,
    // this effect will run when that data arrives, find the chat, and select it.
    if (pendingChatId && chats.length > 0) {
        const chatToOpen = chats.find(c => c.chatId === pendingChatId);
        if (chatToOpen) {
            setSelectedChat(chatToOpen);
            sessionStorage.removeItem('open_chat_id'); // Clear it immediately after finding it
        }
    }

    // B. Sync Selected Chat with latest data from list (e.g. updates lastMessage or status)
    if (selectedChat && chats.length > 0) {
        const updatedChat = chats.find(c => c.chatId === selectedChat.chatId);
        // Only update state if something meaningful changed to avoid loops
        if (updatedChat && (updatedChat.lastMessage !== selectedChat.lastMessage || updatedChat.status !== selectedChat.status)) {
             setSelectedChat(updatedChat);
        }
    }
  }, [chats, selectedChat]);

  // 3. Load Messages when a chat is selected
  useEffect(() => {
    if (!selectedChat) return;
    const messagesRef = dmService.getMessagesRef(selectedChat.chatId);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const msgs = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })) as ChatMessage[];
        setMessages(msgs.sort((a, b) => a.timestamp - b.timestamp));
      } else {
        setMessages([]);
      }
    });

    return () => off(messagesRef);
  }, [selectedChat?.chatId]); 

  // 4. Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!user || !selectedChat || !newMessage.trim()) return;

    const text = newMessage;
    setNewMessage(''); // Optimistic clear

    await dmService.sendMessage(
      user.uid,
      selectedChat.otherUserId,
      selectedChat.otherUserName,
      selectedChat.otherUserAvatar,
      user.name,
      user.avatar || '',
      text
    );
  };

  const handleAcceptRequest = async () => {
    if (!user || !selectedChat) return;
    await dmService.acceptChatRequest(user.uid, selectedChat.chatId);
  };

  const handleDeclineRequest = async () => {
    if (!user || !selectedChat) return;
    if (confirm("Are you sure you want to decline this message request? The conversation will be removed.")) {
        await dmService.removeChat(user.uid, selectedChat.chatId);
        setSelectedChat(null);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if(!selectedChat) return;
    try {
        await dmService.deleteMessage(selectedChat.chatId, messageId);
    } catch (error) {
        toast({ variant: "destructive", title: "Failed to delete message" });
    }
  };

  const isWaitingForAcceptance = user && messages.length > 0 && messages.every(m => m.senderId === user.uid);
  const isIncomingRequest = selectedChat?.status === 'pending';

  return (
    <div className="h-[calc(100vh-200px)] grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left: Chat List */}
      <Card className={cn("md:col-span-1 flex flex-col overflow-hidden", selectedChat ? "hidden md:flex" : "flex")}>
        <div className="p-4 border-b font-headline font-semibold text-lg">Messages</div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {chats.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>No messages yet.</p>
            </div>
          ) : (
            chats.map(chat => (
              <button
                key={chat.chatId}
                onClick={() => setSelectedChat(chat)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left relative",
                  selectedChat?.chatId === chat.chatId ? "bg-primary/10" : "hover:bg-muted"
                )}
              >
                <div className="relative">
                    <Avatar>
                    <AvatarImage src={chat.otherUserAvatar} />
                    <AvatarFallback>{chat.otherUserName[0]}</AvatarFallback>
                    </Avatar>
                    {chat.status === 'pending' && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full border-2 border-background"></span>
                    )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold truncate">{chat.otherUserName}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {formatDistanceToNow(chat.timestamp, { addSuffix: false }).replace('about ', '')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={cn("text-xs truncate max-w-[80%]", chat.status === 'pending' ? "font-semibold text-foreground" : "text-muted-foreground")}>
                        {chat.status === 'pending' ? "New Message Request" : chat.lastMessage}
                    </p>
                    {chat.status === 'pending' && <Badge variant="secondary" className="text-[10px] h-4 px-1">Req</Badge>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Right: Chat Window */}
      <Card className={cn("md:col-span-2 flex flex-col overflow-hidden", !selectedChat ? "hidden md:flex" : "flex")}>
        {!selectedChat ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="h-16 w-16 opacity-10 mb-4" />
            <p>Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center gap-3 bg-muted/20">
              <Button variant="ghost" size="sm" className="md:hidden mr-2" onClick={() => setSelectedChat(null)}>
                  ←
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedChat.otherUserAvatar} />
                <AvatarFallback>{selectedChat.otherUserName[0]}</AvatarFallback>
              </Avatar>
              <span className="font-semibold">{selectedChat.otherUserName}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <div key={msg.id} className={cn("flex group", isMe ? "justify-end" : "justify-start")}>
                    <div className="flex items-end gap-2">
                        {isMe && (
                            <button 
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                                title="Delete message"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                        )}
                        <div className={cn(
                        "max-w-[75%] rounded-lg px-4 py-2 text-sm",
                        isMe ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
                        )}>
                        {msg.text}
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {isWaitingForAcceptance && !isIncomingRequest && (
                <div className="px-4 py-2">
                    <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900/50">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <AlertDescription className="text-xs text-yellow-700 dark:text-yellow-300 ml-2">
                            Request not accepted yet. You can continue messaging, but the user may not see it immediately.
                        </AlertDescription>
                    </Alert>
                </div>
            )}

            {isIncomingRequest && (
                <div className="p-4 bg-muted/30 border-t">
                    <Alert className="bg-background border-primary/20">
                        <div className="flex flex-col gap-3 w-full">
                            <div>
                                <AlertTitle className="font-semibold flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4 text-primary" />
                                    Message Request
                                </AlertTitle>
                                <AlertDescription className="text-sm text-muted-foreground mt-1">
                                    {selectedChat.otherUserName} wants to send you a message.
                                </AlertDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" className="flex-1" onClick={handleAcceptRequest}>
                                    <Check className="mr-2 h-4 w-4" /> Accept
                                </Button>
                                <Button size="sm" variant="outline" className="flex-1 hover:bg-destructive/10 hover:text-destructive" onClick={handleDeclineRequest}>
                                    <X className="mr-2 h-4 w-4" /> Decline
                                </Button>
                            </div>
                        </div>
                    </Alert>
                </div>
            )}

            {!isIncomingRequest && (
                <div className="p-4 border-t flex gap-2">
                <Input 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..." 
                />
                <Button size="icon" onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                </Button>
                </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}