'use client';
import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Image as ImageIcon, Globe, FileText, Save, CheckCircle, PlusCircle, Compass, User, Rss, Lock, X, Loader2, Mail } from "lucide-react";
import { useAppContext } from '@/contexts/app-context';
import ExplorePage from './explore-page';
import FollowingFeed from './following-feed';
import ProfilePage from './profile-page';
import DMPage from './dm-page'; // Import DM Page
import { cn } from '@/lib/utils';
import { postService } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';

const MAX_CHARS = 280;

// --- Helper Components defined OUTSIDE the main component ---

interface CreatePostViewProps {
  user: any;
  postContent: string;
  setPostContent: (content: string) => void;
  onPostSuccess: () => void;
}

const CreatePostView = ({ user, postContent, setPostContent, onPostSuccess }: CreatePostViewProps) => {
    const { toast } = useToast();
    const [isPublic, setIsPublic] = useState(true);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB Limit
                toast({ variant: "destructive", title: "File too large", description: "Please ensure image is under 2MB." });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePost = async () => {
        if (!user) return;
        setIsPosting(true);
        try {
            await postService.createPost(
                user.uid,
                user.name,
                user.avatar || '',
                user.email,
                postContent,
                imagePreview
            );
            
            toast({ title: "Posted Successfully", description: "Your thought has been shared with the community." });
            setPostContent('');
            setImagePreview(null);
            onPostSuccess(); // Switch to Explore feed
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to post. Please try again." });
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    <Avatar>
                    <AvatarImage src={user?.avatar || undefined} />
                    <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="w-full">
                    <div className="font-semibold">{user?.name || 'User'}</div>
                    <div className="text-sm text-muted-foreground">{user?.fieldOfInterest || 'Member'}</div>
                    
                    <Textarea
                        placeholder="Share your professional insights..."
                        className="mt-2 min-h-[120px] border-none focus-visible:ring-0 p-0 resize-none text-base"
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        maxLength={MAX_CHARS}
                    />

                    {imagePreview && (
                        <div className="relative mt-4 w-full h-64 bg-muted rounded-md overflow-hidden">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <Button 
                                variant="secondary" 
                                size="icon" 
                                className="absolute top-2 right-2 h-8 w-8 rounded-full"
                                onClick={() => setImagePreview(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleImageSelect}
                        />
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => fileInputRef.current?.click()}
                            className={imagePreview ? "text-primary" : "text-muted-foreground"}
                        >
                            <ImageIcon className="h-4 w-4 mr-2"/>
                            {imagePreview ? "Change Photo" : "Photo"}
                        </Button>
                        
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsPublic(!isPublic)}
                            className={isPublic ? "text-green-600" : "text-muted-foreground"}
                        >
                            {isPublic ? <Globe className="h-4 w-4 mr-2"/> : <Lock className="h-4 w-4 mr-2" />}
                            {isPublic ? "Public" : "Private"}
                        </Button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <span className={cn("text-xs", postContent.length > MAX_CHARS * 0.9 ? "text-red-500" : "text-muted-foreground")}>
                            {MAX_CHARS - postContent.length}
                        </span>
                        <Button onClick={handlePost} disabled={!postContent.trim() || isPosting}>
                            {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Post
                        </Button>
                    </div>
                </div>
                </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                <AccordionTrigger className="text-base font-semibold px-1">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" /> Posting Guidelines
                    </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground px-1">
                    Be professional and respectful. Share content that is relevant to career growth and industry insights. Avoid spam and self-promotion that does not add value to the community.
                </AccordionContent>
                </AccordionItem>
            </Accordion>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
            <Card className="text-center">
                <CardHeader>
                    <CardTitle className="font-headline text-lg">Post Preview</CardTitle>
                </CardHeader>
                <CardContent>
                <p className="text-sm text-muted-foreground mt-1">
                    Start typing to see how your post will look.
                </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle className="text-base font-semibold flex justify-between items-center">
                    <span>Draft Manager</span>
                    <span className="text-xs font-normal text-green-500 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Auto-save
                    </span>
                </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm font-semibold mt-2">No draft saved</p>
                    <p className="text-xs text-muted-foreground mt-1">Start typing to auto-save your draft</p>
                    <Button variant="outline" size="sm" className="mt-4 w-full">
                        <Save className="h-4 w-4 mr-2" />
                        Save Draft Manually
                    </Button>
                </CardContent>
            </Card>
            </div>
        </div>
    );
};

interface NavProps {
  activeView: 'explore' | 'following' | 'create' | 'profile' | 'messages';
  setActiveView: (view: 'explore' | 'following' | 'create' | 'profile' | 'messages') => void;
}

const DesktopNav = ({ activeView, setActiveView }: NavProps) => (
  <div className="hidden md:flex items-center gap-2 border-b">
      <Button 
        variant="ghost" 
        onClick={() => setActiveView('explore')}
        className={cn("rounded-none border-b-2", activeView === 'explore' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}
      >
        <Compass className="h-4 w-4 mr-2"/>
        Explore
      </Button>
      <Button 
        variant="ghost" 
        onClick={() => setActiveView('following')}
        className={cn("rounded-none border-b-2", activeView === 'following' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}
      >
        <Rss className="h-4 w-4 mr-2"/>
        Following
      </Button>
      <Button 
        variant="ghost" 
        onClick={() => setActiveView('create')}
        className={cn("rounded-none border-b-2", activeView === 'create' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}
      >
        <PlusCircle className="h-4 w-4 mr-2"/>
        Create Post
      </Button>
      <Button 
        variant="ghost" 
        onClick={() => setActiveView('messages')}
        className={cn("rounded-none border-b-2", activeView === 'messages' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}
      >
        <Mail className="h-4 w-4 mr-2"/>
        Messages
      </Button>
      <Button 
        variant="ghost" 
        onClick={() => setActiveView('profile')}
        className={cn("rounded-none border-b-2 ml-auto", activeView === 'profile' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}
      >
        <User className="h-4 w-4 mr-2"/>
        Profile
      </Button>
    </div>
);

const MobileNav = ({ activeView, setActiveView }: NavProps) => (
  <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-10">
    <div className="flex justify-around items-center h-16">
      <Button variant="ghost" onClick={() => setActiveView('explore')} className={cn("flex flex-col h-auto p-2", activeView === 'explore' ? 'text-primary' : 'text-muted-foreground')}>
        <Compass className="h-5 w-5" />
        <span className="text-xs">Explore</span>
      </Button>
      <Button variant="ghost" onClick={() => setActiveView('following')} className={cn("flex flex-col h-auto p-2", activeView === 'following' ? 'text-primary' : 'text-muted-foreground')}>
        <Rss className="h-5 w-5" />
        <span className="text-xs">Following</span>
      </Button>
      <Button variant="ghost" onClick={() => setActiveView('create')} className={cn("flex flex-col h-auto p-2", activeView === 'create' ? 'text-primary' : 'text-muted-foreground')}>
        <PlusCircle className="h-5 w-5" />
        <span className="text-xs">Post</span>
      </Button>
      <Button variant="ghost" onClick={() => setActiveView('messages')} className={cn("flex flex-col h-auto p-2", activeView === 'messages' ? 'text-primary' : 'text-muted-foreground')}>
        <Mail className="h-5 w-5" />
        <span className="text-xs">Messages</span>
      </Button>
      <Button variant="ghost" onClick={() => setActiveView('profile')} className={cn("flex flex-col h-auto p-2", activeView === 'profile' ? 'text-primary' : 'text-muted-foreground')}>
        <User className="h-5 w-5" />
        <span className="text-xs">Profile</span>
      </Button>
    </div>
  </div>
);

// --- Main Component ---

export default function CommunityPage() {
  const { user } = useAppContext();
  const [postContent, setPostContent] = useState('');
  const [activeView, setActiveView] = useState<'explore' | 'following' | 'create' | 'profile' | 'messages'>('explore');

  const handlePostSuccess = () => {
    setActiveView('explore');
  };

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-headline">Community</h1>
        <p className="text-muted-foreground">Connect with peers and share your professional journey.</p>
      </div>

      <DesktopNav activeView={activeView} setActiveView={setActiveView} />
      <MobileNav activeView={activeView} setActiveView={setActiveView} />

      {/* Conditionally render the views directly instead of using a component map object */}
      {activeView === 'explore' && <ExplorePage onMessageClick={() => setActiveView('messages')} />}
      {/* For now, following behaves same as explore until social graph is implemented */}
      {activeView === 'following' && <ExplorePage onMessageClick={() => setActiveView('messages')} />} 
      {activeView === 'messages' && <DMPage />}
      {activeView === 'create' && (
        <CreatePostView 
          user={user} 
          postContent={postContent} 
          setPostContent={setPostContent}
          onPostSuccess={handlePostSuccess}
        />
      )}
      {activeView === 'profile' && <ProfilePage />}
    </div>
  );
}