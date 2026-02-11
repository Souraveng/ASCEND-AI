import { LS_KEYS } from './constants';
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseAuthProfile,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser,
} from 'firebase/auth';
import { ref, set, get, child, update, push, serverTimestamp, remove, query, limitToLast, orderByChild, runTransaction } from 'firebase/database';
import { RoastResumeOutput } from '@/ai/flows/roast-resume';
import { RankResumeOutput } from '@/ai/flows/rank-resume';
import { InterviewEvaluation } from '@/ai/flows/mock-interview-flow';

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export type UserProfileData = {
    uid: string;
    name: string;
    email: string;
    mobile?: string;
    dob?: string;
    gender?: string;
    age?: number;
    country?: string;
    language?: string;
    fieldOfInterest?: string;
    college?: string;
    degree?: string;
    gradYear?: number;
    skills?: string[];
    experience?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    avatar?: string | null;
    profileCompleted?: boolean;
    createdAt?: any;
    skillAssessments?: any;
    resumeEvaluations?: any;
    mockInterviews?: any;
    chats?: any;
}

export type SignUpData = {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    mobile: string;
    age: string;
    gender: string;
    country: string;
    language: string;
    fieldOfInterest: string;
    avatar?: string | null;
}

// --- COMMUNITY TYPES ---
export type Comment = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  timestamp: number;
};

export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  content: string;
  image?: string | null;
  timestamp: number;
  likes: Record<string, boolean>;
  likeCount: number;
  commentCount: number;
  shares: number;
};

// --- DM TYPES ---
export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
};

export type ChatSummary = {
  chatId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string;
  lastMessage: string;
  timestamp: number;
  status?: 'pending' | 'accepted'; 
};

export type { FirebaseUser };

// --- USER DB SERVICE ---
export const userDbService = {
  createUser: async (user: FirebaseUser) => {
    const userRef = ref(db, 'users/' + user.uid);
    await set(userRef, {
      uid: user.uid,
      email: user.email,
      name: user.displayName || user.email?.split('@')[0],
      avatar: user.photoURL,
      createdAt: serverTimestamp(),
      profileCompleted: false,
    });
  },

  getUser: async (uid: string): Promise<UserProfileData | null> => {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `users/${uid}`));
    return snapshot.exists() ? snapshot.val() : null;
  },

  updateUser: async (uid: string, data: Partial<UserProfileData>) => {
    const userRef = ref(db, 'users/' + uid);
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    await update(userRef, cleanData);
  }
};

// --- AUTH SERVICE ---
export const authService = {
  login: async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },
  
  signUp: async (data: Partial<SignUpData>) => {
    if (!data.email || !data.password) {
      throw new Error("Email and password are required for signup.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const user = userCredential.user;
    
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    const profileData: Partial<UserProfileData> = {
        uid: user.uid,
        email: user.email || undefined,
        name: fullName || user.email?.split('@')[0],
        mobile: data.mobile,
        age: data.age ? parseInt(data.age, 10) : undefined,
        gender: data.gender,
        country: data.country,
        language: data.language,
        fieldOfInterest: data.fieldOfInterest,
        avatar: data.avatar || null,
        createdAt: serverTimestamp(),
        profileCompleted: true,
    };

    await updateFirebaseAuthProfile(user, {
      displayName: profileData.name,
      photoURL: profileData.avatar || '',
    });

    await userDbService.updateUser(user.uid, profileData);

    return user;
  },
  
  signInOrSignUpWithGoogle: async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userProfile = await userDbService.getUser(user.uid);
    const isNewUser = !userProfile;
    
    return { user, isNewUser };
  },

  loginWithGoogle: async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userProfile = await userDbService.getUser(user.uid);
    
    if (!userProfile) {
      await signOut(auth);
      const error = new Error("No account found with this Google account. Please sign up first.");
      error.name = 'auth/user-not-found';
      throw error;
    }
    
    return { user, isNewUser: false };
  },
  
  updateProfile: async (uid: string, data: Partial<UserProfileData>) => {
    const user = auth.currentUser;
    if (!user || user.uid !== uid) throw new Error("User not authenticated.");
    
    const authUpdates: { displayName?: string, photoURL?: string | null } = {};
    if (data.name) {
      authUpdates.displayName = data.name;
    }
    if (data.avatar !== undefined) {
      authUpdates.photoURL = data.avatar; 
    }
    
    if (Object.keys(authUpdates).length > 0) {
      await updateFirebaseAuthProfile(user, authUpdates as { displayName?: string, photoURL?: string });
    }
    
    await userDbService.updateUser(uid, data);
    return await userDbService.getUser(uid);
  },

  deleteAccount: async (uid: string) => {
    const user = auth.currentUser;
    if (!user || user.uid !== uid) throw new Error("Authentication error.");

    const userDbRef = ref(db, `users/${uid}`);
    await remove(userDbRef);

    await deleteUser(user);
  },
  logout: async () => {
    await signOut(auth);
    if (typeof window !== 'undefined') {
        localStorage.removeItem(LS_KEYS.resume);
    }
  },

  cancelSignUpAndDeleteAuthUser: async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        await deleteUser(user);
      } catch (error) {
        console.error("Error deleting temporary auth user:", error);
        await signOut(auth);
      }
    }
  }
};

// --- NEWS SERVICE ---
export const newsService = {
  fetchTrending: async () => {
    await sleep(400);
    return [
      { 
        title: 'Remote Work is Here to Stay: Why', 
        description: 'Exploring the lasting impact of remote work on the global job market and company culture.', 
        url: '#', imageUrl: 'https://picsum.photos/400/250', 'data-ai-hint': 'remote work',
      },
      { 
        title: 'AI In Healthcare: The Next Frontier', 
        description: 'How artificial intelligence is revolutionizing patient diagnostics, treatment plans, and drug discovery.', 
        url: '#', imageUrl: 'https://picsum.photos/400/251', 'data-ai-hint': 'ai healthcare',
      },
    ];
  },
};

// --- RESUME SERVICE ---
export const resumeService = {
  saveText: (text: string) => {
    if (typeof window !== 'undefined') localStorage.setItem(LS_KEYS.resume, text || '');
  },
  getText: () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(LS_KEYS.resume) || '';
  },
  hasResume: () => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem(LS_KEYS.resume));
  },
};

// --- CHAT HISTORY ---
export type Message = {
    role: 'user' | 'bot';
    text: string;
};
  
export type ChatSession = {
    id: string;
    title: string;
    timestamp: number;
    messages: Message[];
};

export const chatHistoryService = {
    saveChatSession: async (userId: string, messages: Message[], existingId: string | null) => {
        if (!userId || messages.length <= 1) return { sessionId: existingId };
        let sessionId = existingId;
        const generateTitle = (msgs: Message[]) => msgs.find(m => m.role === 'user')?.text.split(' ').slice(0, 5).join(' ') + '...' || 'New Chat';
        if (sessionId) {
            await update(ref(db, `users/${userId}/chats/${sessionId}`), { messages, timestamp: serverTimestamp() });
        } else {
            const newSessionRef = push(ref(db, `users/${userId}/chats`));
            sessionId = newSessionRef.key;
            if (!sessionId) throw new Error("Failed to create new chat session.");
            await set(newSessionRef, { title: generateTitle(messages), timestamp: serverTimestamp(), messages });
        }
        return { sessionId };
    }
};

// --- EVALUATIONS ---
export const evaluationService = {
  saveRankResult: async (userId: string, data: { jobRole: string; field: string; result: RankResumeOutput }) => {
    const newEvalRef = push(ref(db, `users/${userId}/resumeEvaluations`));
    await set(newEvalRef, { type: 'rank', ...data, createdAt: serverTimestamp() });
  },
  saveRoastResult: async (userId: string, data: { jobRole: string; field: string; result: RoastResumeOutput }) => {
    const newEvalRef = push(ref(db, `users/${userId}/resumeEvaluations`));
    await set(newEvalRef, { type: 'roast', ...data, createdAt: serverTimestamp() });
  },
  saveInterview: async (userId: string, data: { jobRole: string; field: string; difficulty: string; evaluation: InterviewEvaluation, history: any[] }) => {
    const newInterviewRef = push(ref(db, `users/${userId}/mockInterviews`));
    await set(newInterviewRef, { ...data, createdAt: serverTimestamp() });
  },
  saveSkillAssessment: async (userId: string, analysis: { scores: any; chosenRole: string; roadmap: any; }) => {
    const newAssessmentRef = push(ref(db, `users/${userId}/skillAssessments`));
    await set(newAssessmentRef, { ...analysis, createdAt: serverTimestamp() });
  },
  getEvaluations: async (userId: string) => {
    const snapshot = await get(ref(db, `users/${userId}`));
    if (!snapshot.exists()) return { skillAssessments: [], resumeReviews: [], mockInterviews: [] };
    const data = snapshot.val();
    const formatData = (obj: any) => obj ? Object.values(obj).sort((a: any, b: any) => (b as any).createdAt - a.createdAt) : [];
    return {
      skillAssessments: formatData(data.skillAssessments),
      resumeReviews: formatData(data.resumeEvaluations),
      mockInterviews: formatData(data.mockInterviews),
    };
  }
};

// --- COMMUNITY POST SERVICE ---
export const postService = {
  createPost: async (userId: string, authorName: string, authorAvatar: string, email: string, content: string, image: string | null) => {
    const newPostRef = push(ref(db, 'posts'));
    const postData = {
      authorId: userId,
      authorName,
      authorHandle: email.split('@')[0],
      authorAvatar: authorAvatar || '',
      content,
      image,
      timestamp: serverTimestamp(),
      likeCount: 0,
      commentCount: 0,
      shares: 0
    };
    await set(newPostRef, postData);
    return newPostRef.key;
  },

  // --- DELETE POST ---
  deletePost: async (postId: string) => {
    // 1. Remove the post itself
    await remove(ref(db, `posts/${postId}`));
    // 2. Remove associated comments
    await remove(ref(db, `comments/${postId}`));
  },

  getAllPosts: async () => {
    const recentPostsQuery = query(ref(db, 'posts'), limitToLast(50));
    const snapshot = await get(recentPostsQuery);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })).sort((a, b) => b.timestamp - a.timestamp);
    }
    return [];
  },

  toggleLike: async (postId: string, userId: string) => {
    const postRef = ref(db, `posts/${postId}`);
    const snapshot = await get(postRef);
    
    if (snapshot.exists()) {
      const post = snapshot.val();
      const likes = post.likes || {};
      const isLiked = !!likes[userId];
      
      const updates: any = {};
      if (isLiked) {
        updates[`likes/${userId}`] = null;
        updates['likeCount'] = Math.max(0, (post.likeCount || 1) - 1);
      } else {
        updates[`likes/${userId}`] = true;
        updates['likeCount'] = (post.likeCount || 0) + 1;
      }
      
      await update(postRef, updates);
    }
  },

  addComment: async (postId: string, userId: string, authorName: string, authorAvatar: string, text: string) => {
    // 1. Add the comment
    const commentRef = push(ref(db, `comments/${postId}`));
    await set(commentRef, {
      authorId: userId,
      authorName,
      authorAvatar,
      text,
      timestamp: serverTimestamp(),
    });

    // 2. Increment counter
    const postRef = ref(db, `posts/${postId}/commentCount`);
    await runTransaction(postRef, (currentCount) => {
      return (currentCount || 0) + 1;
    });

    return commentRef.key;
  },

  getComments: async (postId: string) => {
    const commentsRef = ref(db, `comments/${postId}`);
    const snapshot = await get(commentsRef);
    if (snapshot.exists()) {
       const data = snapshot.val();
       return Object.keys(data).map(key => ({
         id: key,
         ...data[key]
       })).sort((a, b) => a.timestamp - b.timestamp);
    }
    return [];
  }
};

// --- DM SERVICE ---
export const dmService = {
  // 1. Get a unique Chat ID between two users
  getChatId: (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  },

  // 2. Send a Message
  sendMessage: async (currentUserId: string, otherUserId: string, otherUserName: string, otherUserAvatar: string, currentUserName: string, currentUserAvatar: string, text: string) => {
    const chatId = dmService.getChatId(currentUserId, otherUserId);
    const timestamp = Date.now();

    // A. Push message to the chat history
    const messageRef = push(ref(db, `chats/${chatId}/messages`));
    await set(messageRef, {
      senderId: currentUserId,
      text,
      timestamp
    });

    // B. Update metadata for Current User's Inbox (Sender always accepts their own chat)
    const currentUserChatRef = ref(db, `user-chats/${currentUserId}/${chatId}`);
    await update(currentUserChatRef, {
      chatId,
      otherUserId,
      otherUserName,
      otherUserAvatar: otherUserAvatar || '',
      lastMessage: text,
      timestamp,
      status: 'accepted'
    });

    // C. Update metadata for Other User's Inbox (Recipient)
    const otherUserChatRef = ref(db, `user-chats/${otherUserId}/${chatId}`);
    
    // Check if this chat already exists for the recipient
    const snapshot = await get(otherUserChatRef);
    const updates: any = {
      chatId,
      otherUserId: currentUserId,
      otherUserName: currentUserName,
      otherUserAvatar: currentUserAvatar || '',
      lastMessage: text,
      timestamp
    };

    // If the chat does NOT exist for the recipient, mark it as a pending request
    // If it exists, we DO NOT overwrite the status (it stays 'accepted' if they accepted)
    if (!snapshot.exists()) {
        updates.status = 'pending';
    }

    await update(otherUserChatRef, updates);
  },

  // --- DELETE MESSAGE ---
  deleteMessage: async (chatId: string, messageId: string) => {
    await remove(ref(db, `chats/${chatId}/messages/${messageId}`));
  },

  // 3. Get list of chats (Inbox)
  getUserChatsRef: (userId: string) => {
    return ref(db, `user-chats/${userId}`);
  },

  // 4. Get messages for specific chat
  getMessagesRef: (chatId: string) => {
    return ref(db, `chats/${chatId}/messages`);
  },

  // 5. Accept a chat request
  acceptChatRequest: async (userId: string, chatId: string) => {
    const chatRef = ref(db, `user-chats/${userId}/${chatId}`);
    await update(chatRef, { status: 'accepted' });
  },

  // 6. Remove chat (Decline or Delete)
  removeChat: async (userId: string, chatId: string) => {
    await remove(ref(db, `user-chats/${userId}/${chatId}`));
  }
};