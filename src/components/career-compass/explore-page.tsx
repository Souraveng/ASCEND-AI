'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Share2, Loader2, Send, Mail, Trash2 } from "lucide-react";
import { postService, dmService, Post, Comment } from '@/lib/services';
import { useAppContext } from '@/contexts/app-context';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

// --- DEFAULT POSTS ---
const defaultPosts: Post[] = [
  {
    id: 'default-1',
    authorId: 'default-user-1',
    authorName: "Anjali Sharma",
    authorHandle: "anjalitech",
    authorAvatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
    content: "Just landed a Senior ML Engineer role at a FAANG company! ✨ Over the moon! The grind of the past 5 years has been intense but so worth it. Happy to share my interview prep strategies if anyone is interested. #machinelearning #careergoals",
    image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    timestamp: Date.now() - 7200000,
    likes: {},
    likeCount: 125,
    commentCount: 42,
    shares: 18
  },
  {
    id: 'default-2',
    authorId: 'default-user-2',
    authorName: "Rohan Verma",
    authorHandle: "rohanv",
    authorAvatar: "https://i.pravatar.cc/150?u=a042581f4e29026704e",
    content: "Debating between specializing in cybersecurity or cloud computing for my next career move. Both fields are booming in India right now. What are your thoughts? Pros and cons? 🤔 #cybersecurity #cloud #careeradvice",
    image: null,
    timestamp: Date.now() - 18000000,
    likes: {},
    likeCount: 88,
    commentCount: 61,
    shares: 5
  },
  {
    id: 'default-3',
    authorId: 'default-user-3',
    authorName: "Priya Singh",
    authorHandle: "priyadesigns",
    authorAvatar: "https://i.pravatar.cc/150?u=a042581f4e29026704f",
    content: "Excited to share my latest UI/UX portfolio piece! Reimagined the user flow for a popular e-commerce app. A lot of late nights and Figma magic went into this one. Feedback is welcome! 👇 #uiux #design #portfolio",
    image: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    timestamp: Date.now() - 86400000,
    likes: {},
    likeCount: 234,
    commentCount: 78,
    shares: 32
  },
];

interface ExplorePageProps {
    onMessageClick?: () => void;
}

export default function ExplorePage({ onMessageClick }: ExplorePageProps) {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingDmId, setStartingDmId] = useState<string | null>(null);
  
  // Comment states
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [loadingComments, setLoadingComments] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const fetchedPosts = await postService.getAllPosts();
      const combined = [...(fetchedPosts as Post[]), ...defaultPosts].sort((a, b) => b.timestamp - a.timestamp);
      setPosts(combined);
    } catch (error) {
      console.error("Failed to fetch posts", error);
      setPosts(defaultPosts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleLike = async (postId: string) => {
    if (!user) return;
    setPosts(currentPosts => currentPosts.map(p => {
      if (p.id === postId) {
        const isLiked = !!p.likes?.[user.uid];
        return {
          ...p,
          likes: { ...p.likes, [user.uid]: !isLiked },
          likeCount: isLiked ? Math.max(0, p.likeCount - 1) : p.likeCount + 1
        };
      }
      return p;
    }));
    if (!postId.startsWith('default-')) {
        await postService.toggleLike(postId, user.uid);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
        await postService.deletePost(postId);
        setPosts(prev => prev.filter(p => p.id !== postId));
        toast({ title: "Post Deleted" });
    } catch (error) {
        toast({ variant: "destructive", title: "Error deleting post" });
    }
  };

  const handleToggleComments = async (postId: string) => {
    if (expandedPostId === postId) {
        setExpandedPostId(null);
        return;
    }
    setExpandedPostId(postId);
    if (!commentsMap[postId]) {
        setLoadingComments(postId);
        try {
            const fetchedComments = await postService.getComments(postId);
            setCommentsMap(prev => ({ ...prev, [postId]: fetchedComments as Comment[] }));
        } catch (error) {
            console.error("Error fetching comments", error);
        } finally {
            setLoadingComments(null);
        }
    }
  };

  const handleSubmitComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!user || !text?.trim()) return;

    try {
        const tempComment: Comment = {
            id: 'temp-' + Date.now(),
            authorId: user.uid,
            authorName: user.name,
            authorAvatar: user.avatar || '',
            text: text,
            timestamp: Date.now()
        };
        
        setCommentsMap(prev => ({
            ...prev,
            [postId]: [...(prev[postId] || []), tempComment]
        }));
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        
        if (!postId.startsWith('default-')) {
             await postService.addComment(postId, user.uid, user.name, user.avatar || '', text);
        }
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p));
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Failed to comment" });
    }
  };

  const startDm = async (post: Post) => {
      if(!user) {
          toast({ variant: "destructive", title: "Authentication Required", description: "Please login to send messages." });
          return;
      }
      if(post.authorId === user.uid) {
          toast({ variant: "default", title: "That's you!", description: "You cannot message yourself." });
          return;
      }

      setStartingDmId(post.id); 
      
      try {
          // 1. Initiate the DM
          await dmService.sendMessage(
              user.uid,
              post.authorId,
              post.authorName,
              post.authorAvatar,
              user.name,
              user.avatar || '',
              "Hi! I saw your post on the community."
          );

          // 2. Generate Chat ID locally
          const chatId = dmService.getChatId(user.uid, post.authorId);
          
          // 3. Store in sessionStorage so the DM page knows to open this specific chat
          sessionStorage.setItem('open_chat_id', chatId);

          // 4. Trigger the callback to switch tabs to the DM page
          if (onMessageClick) {
              onMessageClick();
          } else {
              console.warn("onMessageClick callback not provided to ExplorePage");
          }
      } catch (error) {
          console.error("Failed to start DM:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not start conversation. Please try again." });
      } finally {
          setStartingDmId(null);
      }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
        {posts.map((post) => {
            const isLiked = user ? !!post.likes?.[user.uid] : false;
            const postTime = post.timestamp < 10000000000 ? post.timestamp * 1000 : post.timestamp; 
            let timeAgo = 'Just now';
            try {
                timeAgo = formatDistanceToNow(postTime, { addSuffix: true });
            } catch (e) { }
            
            const isExpanded = expandedPostId === post.id;
            const comments = commentsMap[post.id] || [];
            const isMe = user?.uid === post.authorId;
            const isStartingThisDm = startingDmId === post.id;
            
            return (
            <Card key={post.id} className="shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={post.authorAvatar} />
                                <AvatarFallback>{post.authorName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-semibold">{post.authorName}</div>
                                <div className="text-sm text-muted-foreground">@{post.authorHandle} &middot; {timeAgo}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {user && isMe && !post.id.startsWith('default-') && (
                                <Button variant="ghost" size="icon" onClick={() => handleDeletePost(post.id)} title="Delete Post" className="text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                            {user && !isMe && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => startDm(post)} 
                                    title="Message Author"
                                    disabled={isStartingThisDm}
                                >
                                    {isStartingThisDm ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                    {post.image && (
                        <div className="mt-4 relative w-full h-auto rounded-lg overflow-hidden border">
                            <img src={post.image} alt="Post content" className="w-full h-auto object-cover max-h-[500px]" />
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col items-stretch border-t p-0">
                    <div className="flex items-center justify-between text-muted-foreground text-sm p-4">
                        <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={() => handleLike(post.id)}>
                            <Heart className={`h-4 w-4 ${isLiked ? 'text-red-500 fill-current' : ''}`} /> {post.likeCount || 0}
                        </Button>
                        <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={() => handleToggleComments(post.id)}>
                            <MessageCircle className="h-4 w-4" /> {post.commentCount || 0}
                        </Button>
                        <Button variant="ghost" size="sm" className="flex items-center gap-2">
                            <Share2 className="h-4 w-4" /> {post.shares || 0}
                        </Button>
                    </div>

                    {isExpanded && (
                        <div className="bg-muted/30 p-4 border-t space-y-4">
                            {loadingComments === post.id ? (
                                <div className="flex justify-center p-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                            ) : (
                                <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                    {comments.length > 0 ? comments.map((comment) => (
                                        <div key={comment.id} className="flex gap-3 text-sm">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={comment.authorAvatar} />
                                                <AvatarFallback>{comment.authorName[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-xs">{comment.authorName}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {(() => {
                                                            try {
                                                                return formatDistanceToNow(comment.timestamp, { addSuffix: true });
                                                            } catch { return ''; }
                                                        })()}
                                                    </span>
                                                </div>
                                                <p className="text-foreground/90 mt-0.5 break-words">{comment.text}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-center text-muted-foreground py-2">No comments yet.</p>
                                    )}
                                </div>
                            )}

                            {user && (
                                <div className="flex gap-2 items-center pt-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.avatar || undefined} />
                                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <Input 
                                        placeholder="Write a comment..." 
                                        className="h-9 text-sm"
                                        value={commentInputs[post.id] || ''}
                                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment(post.id)}
                                    />
                                    <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => handleSubmitComment(post.id)} disabled={!commentInputs[post.id]?.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardFooter>
            </Card>
        )})}
    </div>
  );
}