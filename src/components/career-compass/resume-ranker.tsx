'use client';
import { useRef, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { FileUp, CheckCircle, Lightbulb, ThumbsUp, ThumbsDown, Sparkles, Flame, Loader2, MessageSquare, Link as LinkIcon, AlertCircle, Briefcase, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/app-context';
import { evaluationService } from '@/lib/services';
import { rankResumeFlow } from '@/ai/flows/rank-resume';
import { roastResumeFlow } from '@/ai/flows/roast-resume';
import { fetchJobDescriptionFromUrl } from '@/ai/flows/fetch-job-content';
import CircularProgress from './circular-progress';

// --- FIXED PREVIEW COMPONENT ---
const MemoizedResumePreview = memo(function MemoizedResumePreview({ url, fileName }: { url: string, fileName: string | undefined }) {
  return (
    <motion.div
      key="resume-preview"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card className="flex flex-col h-[80vh] w-full overflow-hidden shadow-sm border-muted">
        <CardHeader className="flex-none border-b py-3 px-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-md font-headline">Resume Preview</CardTitle>
              <CardDescription className="text-xs line-clamp-1">{fileName}</CardDescription>
            </div>
          </div>
        </CardHeader>
        {/* flex-1 ensures this content area fills the remaining height of the 80vh card */}
        <CardContent className="flex-1 p-0 bg-slate-50 dark:bg-slate-900/50">
          <iframe
            src={url}
            className="w-full h-full border-0"
            title="Resume Preview"
          />
        </CardContent>
      </Card>
    </motion.div>
  );
});

export default function ResumeRanker() {
  const { toast } = useToast();
  const { user, refreshEvaluations, resumeRankerState, setResumeRankerState, startChatWithEvaluationContext } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRoasting, setIsRoasting] = useState(false);
  
  // Tabs State: 'rank' vs 'roast' for results, 'jd' vs 'manual' for input
  const [resultTab, setResultTab] = useState('rank'); 
  const [inputTab, setInputTab] = useState<'jd' | 'manual'>('jd');
  
  const [isFetchingJd, setIsFetchingJd] = useState(false);
  
  const { rankingResult, roastResult } = resumeRankerState;

  // File Upload Logic
  const processFile = async (file: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
        toast({ variant: 'destructive', title: "Invalid File Type", description: "Please upload a PDF file." });
        return;
    }
    const previewUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        setResumeRankerState({
          uploadedFile: file,
          pdfPreviewUrl: previewUrl,
          pdfBase64: base64,
          rankingResult: null,
          roastResult: null,
        });
        toast({ title: "Resume Loaded", description: `Ready to analyze ${file.name}.` });
    };
    reader.onerror = () => { toast({ variant: 'destructive', title: "File Read Error" }); };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if(e.target.files?.[0]) processFile(e.target.files[0]); };
  const handleDragOver = (e: any) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: any) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: any) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if(e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); };

  const isValidUrl = (string: string) => {
    try { return Boolean(new URL(string)); } catch(e){ return false; }
  }

  // ANALYSIS LOGIC
  const handleAnalyze = async () => {
    const { pdfBase64, jobRole, field, jobDescriptionInput } = resumeRankerState;
    
    if (!pdfBase64) {
        toast({ variant: 'destructive', title: "No Resume", description: "Please upload a PDF resume first." });
        return;
    }
    if (!user) {
        toast({ variant: 'destructive', title: "Login Required", description: "Please login to continue." });
        return;
    }

    // Input Validation
    if (inputTab === 'jd' && !jobDescriptionInput?.trim()) {
        toast({ variant: 'destructive', title: "Missing Input", description: "Please paste a Job Description or URL." });
        return;
    }
    if (inputTab === 'manual' && (!jobRole?.trim() || !field?.trim())) {
        toast({ variant: 'destructive', title: "Missing Input", description: "Please enter both Job Role and Field." });
        return;
    }

    setIsAnalyzing(true);
    // Reset results when starting new analysis
    setResumeRankerState({ rankingResult: null, roastResult: null });

    let finalJobDescription = undefined;
    let effectiveJobRole = jobRole || "Candidate";
    let effectiveField = field || "General";

    // --- URL / JD Logic ---
    if (inputTab === 'jd') {
        const trimmedInput = jobDescriptionInput.trim();
        effectiveJobRole = "Target Role"; // Generic label for history
        effectiveField = "N/A";

        if (isValidUrl(trimmedInput)) {
            setIsFetchingJd(true);
            try {
                toast({ title: "Fetching Job Data...", description: "Reading content from the link." });
                const fetchedText = await fetchJobDescriptionFromUrl(trimmedInput);
                
                if (!fetchedText) {
                    setIsFetchingJd(false);
                    setIsAnalyzing(false);
                    
                    const isLinkedIn = trimmedInput.toLowerCase().includes('linkedin');
                    toast({ 
                        variant: "destructive", 
                        title: "Fetch Failed", 
                        description: isLinkedIn 
                            ? "LinkedIn blocks automated access. Please copy/paste the text manually." 
                            : "Could not read the link. Please paste the text manually." 
                    });
                    return;
                }
                finalJobDescription = fetchedText;
                toast({ title: "Success", description: "Job details extracted." });
            } catch (error) {
                setIsFetchingJd(false);
                setIsAnalyzing(false);
                return;
            }
            setIsFetchingJd(false);
        } else {
            finalJobDescription = trimmedInput;
        }
    }

    // --- API Call ---
    try {
        const result = await rankResumeFlow({ 
            pdfBase64, 
            jobRole: inputTab === 'manual' ? effectiveJobRole : "Job Description Match", 
            field: effectiveField, 
            jobDescription: finalJobDescription 
        });
        
        setResumeRankerState({ rankingResult: result });
        setResultTab('rank');
        await evaluationService.saveRankResult(user.uid, { jobRole: effectiveJobRole, field: effectiveField, result });
        await refreshEvaluations();
        toast({ title: "Analysis Complete", description: "Your resume has been ranked." });
    } catch (error) {
        console.error("Ranking error:", error);
        toast({ variant: 'destructive', title: "Analysis Failed", description: "Please try again." });
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleRoast = async () => {
    const { pdfBase64, jobRole, field } = resumeRankerState;
    if (!pdfBase64) {
        toast({ variant: 'destructive', title: "No Resume", description: "Please upload a resume." });
        return;
    }
    
    setIsRoasting(true);
    setResumeRankerState({ rankingResult: null, roastResult: null });
    
    // Fallback role if using JD tab
    const roleForRoast = inputTab === 'manual' && jobRole ? jobRole : "Target Role";
    const fieldForRoast = inputTab === 'manual' && field ? field : "General";

    try {
        const result = await roastResumeFlow({ pdfBase64, jobRole: roleForRoast, field: fieldForRoast });
        setResumeRankerState({ roastResult: result });
        setResultTab('roast');
        if(user) {
            await evaluationService.saveRoastResult(user.uid, { jobRole: roleForRoast, field: fieldForRoast, result });
            await refreshEvaluations();
        }
        toast({ title: "Roast Complete", description: "Prepared to be roasted." });
    } catch (e) { toast({ variant: 'destructive', title: "Roast Failed" }); } 
    finally { setIsRoasting(false); }
  };

  const handleRankInsight = () => {
    if (!rankingResult) return;
    startChatWithEvaluationContext({
        type: 'Resume Ranking',
        inputs: { jobRole: resumeRankerState.jobRole, field: resumeRankerState.field },
        result: rankingResult,
    });
  };

  const handleRoastInsight = () => {
    if (!roastResult) return;
    startChatWithEvaluationContext({
        type: 'Resume Roast',
        inputs: { jobRole: resumeRankerState.jobRole, field: resumeRankerState.field },
        result: roastResult,
    });
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' }}
  };

  // --- SUB-COMPONENTS ---
  const RankingResults = () => (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="space-y-6">
        <motion.div variants={itemVariants}>
            <Card>
                <CardHeader className="text-center">
                    <div className="mx-auto">
                        <CircularProgress progress={rankingResult?.match_score || 0} size={120} strokeWidth={10}/>
                    </div>
                    <CardTitle className="font-headline text-2xl pt-2">Match Score</CardTitle>
                    <CardDescription>{rankingResult?.final_recommendation}</CardDescription>
                </CardHeader>
            </Card>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div variants={itemVariants}><Card className="h-full"><CardHeader><CardTitle className="flex items-center gap-2"><ThumbsUp className="h-5 w-5 text-green-500"/> Strengths</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{rankingResult?.strengths}</p></CardContent></Card></motion.div>
            <motion.div variants={itemVariants}><Card className="h-full"><CardHeader><CardTitle className="flex items-center gap-2"><ThumbsDown className="h-5 w-5 text-red-500"/> Weaknesses</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{rankingResult?.weaknesses}</p></CardContent></Card></motion.div>
        </div>
        <motion.div variants={itemVariants}><Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-yellow-500"/> Missing Keywords</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                {rankingResult?.keywords_missing.map(k => <Badge key={k} variant="secondary">{k}</Badge>)}
            </CardContent>
        </Card></motion.div>
        <motion.div variants={itemVariants} className="text-center pt-2">
            <Button onClick={handleRankInsight}>
                <MessageSquare className="mr-2 h-4 w-4" /> Chat with AI about this
            </Button>
        </motion.div>
    </motion.div>
  );

  const RoastResults = () => (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="space-y-6">
        <motion.div variants={itemVariants}><Card>
            <CardHeader><CardTitle className="flex items-center gap-2 font-headline"><Flame className="h-6 w-6 text-orange-500"/> The Roast</CardTitle></CardHeader>
            <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground text-sm">
                    {roastResult?.roast_comments.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
            </CardContent>
        </Card></motion.div>
        <motion.div variants={itemVariants}><Card>
            <CardHeader><CardTitle className="flex items-center gap-2 font-headline"><Sparkles className="h-6 w-6 text-accent"/> Fixes</CardTitle></CardHeader>
            <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground text-sm">
                    {roastResult?.improvement_tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
            </CardContent>
        </Card></motion.div>
        <motion.div variants={itemVariants} className="text-center pt-2">
            <Button onClick={handleRoastInsight}>
                <MessageSquare className="mr-2 h-4 w-4" /> Ask AI how to fix this
            </Button>
        </motion.div>
    </motion.div>
  );

  const Placeholder = () => (
    <Card className="w-full text-center p-12 h-[80vh] flex flex-col justify-center border-dashed">
        <CardHeader>
            <div className="mx-auto bg-muted rounded-full p-4 mb-4">
                <Sparkles className="h-10 w-10 text-muted-foreground" />
            </div>
            <CardTitle className="font-headline text-xl">Awaiting Analysis</CardTitle>
            <CardDescription className="max-w-sm mx-auto">Upload your resume and provide job details to get a comprehensive AI evaluation.</CardDescription>
        </CardHeader>
    </Card>
  );

  const showResults = !isAnalyzing && !isRoasting && (rankingResult || roastResult);
  const showPreview = resumeRankerState.pdfPreviewUrl && !showResults;

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="space-y-6">
      <motion.h1 variants={itemVariants} className="text-2xl md:text-3xl font-bold font-headline text-center">TorchMyResume</motion.h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: SETUP */}
        <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
            <Card className="shadow-md border-primary/10">
                <CardHeader className="pb-3">
                    <CardTitle className="font-headline">Setup Evaluation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 1. Resume Upload */}
                    <div className="space-y-2">
                        <Label>1. Upload Resume (PDF)</Label>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" className="hidden" />
                        <div onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                            className={cn("border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200",
                            isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50")}>
                            {resumeRankerState.uploadedFile ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full"><CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" /></div>
                                    <span className="font-medium text-sm text-foreground line-clamp-1 break-all">{resumeRankerState.uploadedFile.name}</span>
                                    <span className="text-xs text-muted-foreground">Click to change</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <FileUp className="h-8 w-8 opacity-50" />
                                    <span className="text-sm font-medium">Click to upload or drag PDF</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Target Selection */}
                    <div className="space-y-2">
                        <Label>2. Target Job Details</Label>
                        <Tabs defaultValue="jd" value={inputTab} onValueChange={(v) => setInputTab(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-3">
                                <TabsTrigger value="jd">By Description</TabsTrigger>
                                <TabsTrigger value="manual">By Role Name</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="jd" className="space-y-2 animate-in fade-in slide-in-from-left-1 duration-200">
                                <Textarea 
                                    placeholder="Paste Job Description text OR Job Post URL..." 
                                    className="min-h-[120px] resize-none text-sm font-sans bg-muted/30"
                                    value={resumeRankerState.jobDescriptionInput}
                                    onChange={(e) => setResumeRankerState({ jobDescriptionInput: e.target.value })}
                                />
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
                                    <LinkIcon className="h-3 w-3" />
                                    <span>Paste a URL to auto-extract via AI</span>
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="manual" className="space-y-3 animate-in fade-in slide-in-from-right-1 duration-200">
                                <div className="space-y-1">
                                    <Label htmlFor="job-role" className="text-xs font-normal text-muted-foreground">Job Role</Label>
                                    <Input id="job-role" className="h-9 bg-muted/30" placeholder="e.g. Senior Product Designer" value={resumeRankerState.jobRole} onChange={e => setResumeRankerState({ jobRole: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="field" className="text-xs font-normal text-muted-foreground">Industry</Label>
                                    <Input id="field" className="h-9 bg-muted/30" placeholder="e.g. Fintech" value={resumeRankerState.field} onChange={e => setResumeRankerState({ field: e.target.value })} />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* 3. Actions */}
                    <div className="pt-2 grid grid-cols-2 gap-3">
                        <Button onClick={handleAnalyze} disabled={isAnalyzing || isRoasting || !resumeRankerState.pdfBase64} className="w-full">
                            {isAnalyzing || isFetchingJd ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Search className="mr-2 h-4 w-4" />}
                            {isFetchingJd ? "Fetching..." : "Analyze"}
                        </Button>
                        <Button onClick={handleRoast} disabled={isAnalyzing || isRoasting || !resumeRankerState.pdfBase64} variant="outline" className="w-full hover:border-orange-500 hover:text-orange-500">
                            {isRoasting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Flame className="mr-2 h-4 w-4" />}
                            Roast Me
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
        
        {/* RIGHT COLUMN: PREVIEW / RESULTS */}
        <div className="lg:col-span-2 relative">
            <AnimatePresence>
                {(isAnalyzing || isRoasting || isFetchingJd) && (
                    <motion.div 
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-xl border h-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="bg-card p-8 rounded-full shadow-lg mb-6 relative overflow-hidden">
                            <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                            <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
                        </div>
                        <p className="font-headline font-bold text-xl mb-2">
                            {isFetchingJd ? 'Reading Job Post...' : isAnalyzing ? 'Ranking Your Resume...' : 'Roasting Your Resume...'}
                        </p>
                        <p className="text-muted-foreground text-sm max-w-xs text-center">
                            {isFetchingJd 
                                ? 'AI Agent is browsing the website to extract requirements.' 
                                : isAnalyzing 
                                    ? 'Comparing your skills against the job requirements.'
                                    : 'Preparing a spicy critique of your career history.'}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {showResults ? (
                    <motion.div
                        key="results-view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Tabs value={resultTab} onValueChange={setResultTab}>
                            <div className="flex justify-center mb-6">
                                <TabsList className="grid w-[300px] grid-cols-2">
                                    <TabsTrigger value="rank" disabled={!rankingResult}>Rank Results</TabsTrigger>
                                    <TabsTrigger value="roast" disabled={!roastResult}>Roast Results</TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsContent value="rank">
                                {rankingResult ? <RankingResults /> : <Placeholder />}
                            </TabsContent>
                            <TabsContent value="roast">
                                {roastResult ? <RoastResults /> : <Placeholder />}
                            </TabsContent>
                        </Tabs>
                    </motion.div>
                ) : showPreview ? (
                    <MemoizedResumePreview url={resumeRankerState.pdfPreviewUrl} fileName={resumeRankerState.uploadedFile?.name} />
                ) : (
                    <motion.div key="placeholder-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Placeholder />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}