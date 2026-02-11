'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  FileUp, PenTool, ArrowRight, Loader2, Send, 
  Bot, User, ArrowLeft, Download, Briefcase, 
  Plus, Trash2, CheckCircle, LayoutTemplate, Eye,
  Bold, Italic, Heading1, Heading2, List, Link as LinkIcon, Type
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useAppContext } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

// --- PDF GENERATION LIBRARIES ---
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import htmlToPdfmake from "html-to-pdfmake";
import { TDocumentDefinitions } from 'pdfmake/interfaces';

// Register fonts for client-side generation
// @ts-ignore
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

// AI Actions
import { importResumeFromPdf, generateResumeFromForm, refineResumeWithAgent } from '@/ai/flows/cv-forge-flow';

// --- TYPES ---
type Stage = 'START' | 'IMPORT_SETUP' | 'FORM_FILLING' | 'TEMPLATE_SELECT' | 'WORKSPACE';
type TemplateType = 'Classic Corporate' | 'Minimalist Pro' | 'Tech Modern' | 'Keep Original';

interface ResumeFormData {
  personal: { name: string; email: string; phone: string; location: string; links: string };
  education: { degree: string; college: string; year: string; score: string }[];
  experience: { role: string; company: string; duration: string; details: string }[];
  projects: { title: string; link: string; details: string }[];
  skills: string[]; 
}

const initialFormData: ResumeFormData = {
  personal: { name: '', email: '', phone: '', location: '', links: '' },
  education: [],
  experience: [],
  projects: [],
  skills: [],
};

// --- HELPER COMPONENTS ---

interface FormSectionProps {
  formData: ResumeFormData;
  setFormData: React.Dispatch<React.SetStateAction<ResumeFormData>>;
  onBack: () => void;
  onSubmit: () => void;
}

const FormSection = ({ formData, setFormData, onBack, onSubmit }: FormSectionProps) => {
  const updatePersonal = (field: string, val: string) => 
    setFormData(p => ({ ...p, personal: { ...p.personal, [field]: val } }));
  
  const addEdu = () => setFormData(p => ({ ...p, education: [...p.education, { degree: '', college: '', year: '', score: '' }] }));
  const updateEdu = (idx: number, field: string, val: string) => {
      const newEdu = [...formData.education]; 
      // @ts-ignore
      newEdu[idx] = { ...newEdu[idx], [field]: val };
      setFormData(p => ({ ...p, education: newEdu }));
  };
  const removeEdu = (idx: number) => setFormData(p => ({...p, education: p.education.filter((_, i) => i !== idx)}));

  const addExp = () => setFormData(p => ({ ...p, experience: [...p.experience, { role: '', company: '', duration: '', details: '' }] }));
  const updateExp = (idx: number, field: string, val: string) => {
      const newExp = [...formData.experience]; 
      // @ts-ignore
      newExp[idx] = { ...newExp[idx], [field]: val };
      setFormData(p => ({ ...p, experience: newExp }));
  };
  const removeExp = (idx: number) => setFormData(p => ({...p, experience: p.experience.filter((_, i) => i !== idx)}));

  const addProj = () => setFormData(p => ({ ...p, projects: [...p.projects, { title: '', link: '', details: '' }] }));
  const updateProj = (idx: number, field: string, val: string) => {
      const newProj = [...formData.projects];
      // @ts-ignore
      newProj[idx] = { ...newProj[idx], [field]: val };
      setFormData(p => ({ ...p, projects: newProj }));
  };
  const removeProj = (idx: number) => setFormData(p => ({...p, projects: p.projects.filter((_, i) => i !== idx)}));

  return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
          <div className='flex items-center gap-2 mb-4'>
              <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2"/> Back</Button>
              <h2 className="text-2xl font-bold font-headline">Build Your Resume</h2>
          </div>

          <Card>
              <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Full Name</Label><Input value={formData.personal.name} onChange={e => updatePersonal('name', e.target.value)} placeholder="e.g. Prasoon Sharma" /></div>
                  <div><Label>Email</Label><Input value={formData.personal.email} onChange={e => updatePersonal('email', e.target.value)} placeholder="john@example.com" /></div>
                  <div><Label>Phone</Label><Input value={formData.personal.phone} onChange={e => updatePersonal('phone', e.target.value)} placeholder="+91 98765 43210" /></div>
                  <div><Label>Location</Label><Input value={formData.personal.location} onChange={e => updatePersonal('location', e.target.value)} placeholder="Delhi, India" /></div>
                  <div className="md:col-span-2"><Label>Links (LinkedIn, GitHub)</Label><Input value={formData.personal.links} onChange={e => updatePersonal('links', e.target.value)} placeholder="github.com/user | linkedin.com/in/user" /></div>
              </CardContent>
          </Card>

          <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Education</CardTitle>
                  <Button variant="outline" size="sm" onClick={addEdu}><Plus className="h-4 w-4 mr-2"/> Add</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                  {formData.education.map((edu, idx) => (
                      <div key={idx} className="p-4 border rounded-lg relative bg-muted/20">
                          <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => removeEdu(idx)}><Trash2 className="h-4 w-4"/></Button>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                              <Input placeholder="Degree" value={edu.degree} onChange={e => updateEdu(idx, 'degree', e.target.value)} />
                              <Input placeholder="College / University" value={edu.college} onChange={e => updateEdu(idx, 'college', e.target.value)} />
                              <Input placeholder="Year" value={edu.year} onChange={e => updateEdu(idx, 'year', e.target.value)} />
                              <Input placeholder="CGPA" value={edu.score} onChange={e => updateEdu(idx, 'score', e.target.value)} />
                          </div>
                      </div>
                  ))}
                  {formData.education.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No education details added.</p>}
              </CardContent>
          </Card>

          <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Experience</CardTitle>
                  <Button variant="outline" size="sm" onClick={addExp}><Plus className="h-4 w-4 mr-2"/> Add</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                  {formData.experience.map((exp, idx) => (
                      <div key={idx} className="p-4 border rounded-lg relative bg-muted/20">
                          <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => removeExp(idx)}><Trash2 className="h-4 w-4"/></Button>
                          <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-8">
                                  <Input placeholder="Role" value={exp.role} onChange={e => updateExp(idx, 'role', e.target.value)} />
                                  <Input placeholder="Company" value={exp.company} onChange={e => updateExp(idx, 'company', e.target.value)} />
                                  <Input placeholder="Duration" value={exp.duration} onChange={e => updateExp(idx, 'duration', e.target.value)} />
                              </div>
                              <Textarea placeholder="Description" value={exp.details} onChange={e => updateExp(idx, 'details', e.target.value)} />
                          </div>
                      </div>
                  ))}
                  {formData.experience.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No experience added.</p>}
              </CardContent>
          </Card>

          <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Projects</CardTitle>
                  <Button variant="outline" size="sm" onClick={addProj}><Plus className="h-4 w-4 mr-2"/> Add</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                  {formData.projects.map((proj, idx) => (
                      <div key={idx} className="p-4 border rounded-lg relative bg-muted/20">
                          <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => removeProj(idx)}><Trash2 className="h-4 w-4"/></Button>
                          <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                                  <Input placeholder="Project Title" value={proj.title} onChange={e => updateProj(idx, 'title', e.target.value)} />
                                  <Input placeholder="Project Link" value={proj.link} onChange={e => updateProj(idx, 'link', e.target.value)} />
                              </div>
                              <Textarea placeholder="Project Details" value={proj.details} onChange={e => updateProj(idx, 'details', e.target.value)} />
                          </div>
                      </div>
                  ))}
                  {formData.projects.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No projects added.</p>}
              </CardContent>
          </Card>

          <Card>
              <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
              <CardContent>
                  <Textarea 
                      placeholder="List skills separated by commas..." 
                      value={formData.skills} 
                      onChange={e => setFormData(p => ({...p, skills: e.target.value as any}))} 
                  />
              </CardContent>
          </Card>

          <div className="flex justify-end gap-4 pt-4">
              <Button variant="outline" onClick={onBack}>Cancel</Button>
              <Button onClick={onSubmit} className="w-full md:w-auto">Next: Choose Template <ArrowRight className="ml-2 h-4 w-4"/></Button>
          </div>
      </div>
  );
};

const TemplateCard = ({ title, desc, type, selected, onSelect }: { title: string, desc: string, type: TemplateType, selected: boolean, onSelect: (t: TemplateType) => void }) => (
  <Card 
      className={cn("cursor-pointer transition-all hover:border-primary hover:shadow-md", selected ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "")}
      onClick={() => onSelect(type)}
  >
      <CardHeader>
          <div className="flex justify-between items-start">
              <LayoutTemplate className="h-8 w-8 text-muted-foreground mb-2" />
              {selected && <CheckCircle className="h-5 w-5 text-primary" />}
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
      </CardHeader>
  </Card>
);

// --- MAIN COMPONENT ---

export default function CVForge() {
  const { user } = useAppContext();
  const { toast } = useToast();
  
  const [stage, setStage] = useState<Stage>('START');
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ResumeFormData>(initialFormData);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const [importMode, setImportMode] = useState(false);
  
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // New State: Holds the visual style rules extracted by AI
  const [detectedStyle, setDetectedStyle] = useState<{
    alignment: 'left' | 'center' | 'right';
    fontCategory: 'serif' | 'sans' | 'mono';
    headerCase: 'uppercase' | 'titlecase';
    hasUnderlines: boolean;
    density: 'compact' | 'comfortable';
  } | null>(null);

  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user'|'bot', text: string}[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const pdfSourceRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null); // For toolbar insertion

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Pre-fill form
  useEffect(() => {
    if (user && stage === 'FORM_FILLING') {
      setFormData(prev => ({
        ...prev,
        personal: {
          name: user.name || '',
          email: user.email || '',
          phone: user.mobile || '',
          location: `${user.city || ''} ${user.country || ''}`.trim(),
          links: [user.linkedin, user.github, user.portfolio].filter(Boolean).join(' | ')
        },
      }));
    }
  }, [user, stage]);

  // --- TOOLBAR FUNCTION ---
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = markdown;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = before + prefix + selection + suffix + after;
    setMarkdown(newText);

    // Restore focus and selection
    setTimeout(() => {
        if(textareaRef.current) {
            textareaRef.current.focus();
            const newCursorPos = start + prefix.length + selection.length + suffix.length;
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
    }, 0);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const base64 = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      
      // Call updated backend function that returns Text + Style
      const { markdown, style } = await importResumeFromPdf(base64);
      
      setMarkdown(markdown);
      setDetectedStyle(style); // Save the style for PDF generation
      setImportMode(true);
      setStage('TEMPLATE_SELECT');
      
      toast({ title: "Resume Imported", description: `Detected style: ${style.fontCategory}, ${style.alignment} alignment.` });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Import Failed", description: "Could not parse the PDF." });
    } finally { setLoading(false); }
  };

  const handleFormSubmit = () => {
    setImportMode(false);
    setStage('TEMPLATE_SELECT');
  };

  const handleTemplateSelect = async (template: TemplateType) => {
    setSelectedTemplate(template);
    setLoading(true);

    try {
      if (importMode) {
        if (template === 'Keep Original') {
          setStage('WORKSPACE');
          setMessages([{ role: 'bot', text: "Imported layout preserved. You can now edit." }]);
        } else {
          const { updatedMarkdown } = await refineResumeWithAgent(markdown, `Reformat this entire resume into a ${template} style. Keep all content.`);
          setMarkdown(updatedMarkdown);
          setStage('WORKSPACE');
          setMessages([{ role: 'bot', text: `Reformatted to ${template} style.` }]);
        }
      } else {
        const md = await generateResumeFromForm(formData, template);
        setMarkdown(md);
        setStage('WORKSPACE');
        setMessages([{ role: 'bot', text: `Resume generated in ${template} style!` }]);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error applying template" });
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || loading) return;
    const text = chatInput;
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const { updatedMarkdown, reply } = await refineResumeWithAgent(markdown, text);
      setMarkdown(updatedMarkdown);
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
    } catch (err) {
      toast({ variant: "destructive", title: "Agent encountered an error." });
    } finally { setLoading(false); }
  };

  const handleDownloadPDF = async () => {
    setShowPreview(true);
  };

  // --- EXECUTE DOWNLOAD WITH DYNAMIC STYLE GENERATION ---
  const executeDownload = async () => {
    if (!pdfSourceRef.current) return;
    
    setIsExporting(true);
    toast({ title: "Generating PDF", description: "Creating a high-quality resume..." });

    try {
      // 1. Extract HTML content
      const htmlContent = pdfSourceRef.current.innerHTML;

      // 2. Convert HTML to PDFMake format
      const pdfContent = htmlToPdfmake(htmlContent, {
        defaultStyles: {
            p: { marginBottom: 2, fontSize: 10, lineHeight: 1.3 },
            a: { color: '#2563eb', decoration: 'underline' }
        }
      });

      // 3. Define Styles dynamically
      let styles: any = {};
      let defaultStyle: any = { fontSize: 10, font: 'Roboto' };
      let pageMargins: [number, number, number, number] = [25, 25, 25, 25];

      // A. "Keep Original" Logic: Use AI Detected Style
      if (selectedTemplate === 'Keep Original' && detectedStyle) {
          const s = detectedStyle;
          
          const isCompact = s.density === 'compact';
          pageMargins = isCompact ? [25, 25, 25, 25] : [40, 40, 40, 40];
          const marginBottomHeader = isCompact ? 4 : 10;
          
          styles = {
              'html-h1': { 
                  fontSize: 24, 
                  bold: true, 
                  alignment: s.alignment, 
                  marginBottom: 4, 
                  color: '#000000' 
              },
              'html-h2': { 
                  fontSize: 12, 
                  bold: true, 
                  uppercase: s.headerCase === 'uppercase', 
                  marginBottom: marginBottomHeader, 
                  marginTop: 15, 
                  color: '#000000',
                  border: s.hasUnderlines ? [0, 0, 0, 1] : [0, 0, 0, 0], 
                  borderColor: '#000000'
              },
              'html-h3': { fontSize: 11, bold: true, marginBottom: 2, marginTop: 5, color: '#333333' },
              'html-p': { fontSize: 10, alignment: 'justify', marginBottom: 2, color: '#1f2937' },
              'html-ul': { marginBottom: 5, marginLeft: 15 },
              'html-li': { fontSize: 10, marginBottom: 1, color: '#1f2937' }
          };
      } 
      // B. Template Presets
      else if (selectedTemplate === 'Classic Corporate') {
        styles = {
            'html-h1': { fontSize: 22, bold: true, alignment: 'center', marginBottom: 5, color: '#000000' },
            'html-h2': { fontSize: 14, bold: true, decoration: 'underline', marginBottom: 5, marginTop: 10, color: '#333333' },
            'html-h3': { fontSize: 12, bold: true, marginBottom: 2 },
            'html-p': { fontSize: 11, alignment: 'justify' },
            'html-ul': { marginBottom: 5 },
            'html-li': { fontSize: 11 }
        };
      } 
      else if (selectedTemplate === 'Minimalist Pro') {
        styles = {
            'html-h1': { fontSize: 24, bold: false, alignment: 'left', marginBottom: 10, color: '#2c3e50' },
            'html-h2': { fontSize: 16, bold: true, marginBottom: 5, marginTop: 15, color: '#34495e' },
            'html-p': { fontSize: 10, color: '#555555' },
            'html-li': { fontSize: 10, color: '#555555' }
        };
      }
      else if (selectedTemplate === 'Tech Modern') {
        styles = {
            'html-h1': { fontSize: 20, bold: true, color: '#2563eb', marginBottom: 8 },
            'html-h2': { fontSize: 13, bold: true, color: '#1e293b', marginBottom: 4, marginTop: 12, decoration: 'underline', decorationStyle: 'dashed' },
            'html-p': { fontSize: 10, font: 'Roboto' },
            'html-a': { color: '#3b82f6' }
        };
      }
      else {
        // Fallback if no style detected
        styles = {
            'html-h1': { fontSize: 24, bold: true, alignment: 'center', marginBottom: 2 },
            'html-h2': { fontSize: 12, bold: true, uppercase: true, border: [0,0,0,1], marginBottom: 8, marginTop: 15 },
            'html-p': { fontSize: 10, alignment: 'justify' }
        };
      }

      const docDefinition: TDocumentDefinitions = {
        content: pdfContent,
        styles: styles,
        defaultStyle: defaultStyle,
        pageSize: 'A4',
        pageMargins: pageMargins,
        info: {
            title: `Resume - ${formData.personal.name || 'Candidate'}`,
            author: 'Disha Darshak AI'
        }
      };

      pdfMake.createPdf(docDefinition).download(`${formData.personal.name.replace(/\s+/g, '_') || 'Resume'}_CVForge.pdf`);
      toast({ title: "Success", description: "Resume downloaded successfully." });
      setShowPreview(false); 

    } catch (error) {
      console.error("PDF Export Error:", error);
      toast({ variant: "destructive", title: "Export Failed", description: "Could not generate PDF text." });
    } finally {
      setIsExporting(false);
    }
  };

  // --- STYLING ENGINE FOR THE PREVIEW (SCREEN) ---
  const getTemplateClass = () => {
    switch (selectedTemplate) {
      case 'Classic Corporate': 
        return `
          font-serif text-black
          prose-h1:text-4xl prose-h1:font-bold prose-h1:text-center prose-h1:mb-1 prose-h1:uppercase prose-h1:tracking-wide
          prose-p:text-center prose-p:text-sm prose-p:mb-6 prose-p:mt-0
          prose-h2:text-lg prose-h2:font-bold prose-h2:uppercase prose-h2:border-b-2 prose-h2:border-black prose-h2:pb-1 prose-h2:mt-4 prose-h2:mb-2
          prose-h3:text-base prose-h3:font-bold prose-h3:mt-3 prose-h3:mb-0
          prose-ul:list-disc prose-ul:pl-5 prose-ul:my-1
          prose-li:my-0.5 prose-li:text-sm prose-li:leading-snug
          prose-strong:font-bold
        `;
      case 'Minimalist Pro': 
        return `
          font-sans text-slate-900
          prose-h1:text-3xl prose-h1:font-light prose-h1:mb-2
          prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-2 prose-h2:border-b prose-h2:border-slate-200
          prose-p:text-sm prose-p:text-slate-600
          prose-li:text-sm prose-li:text-slate-700
        `;
      case 'Tech Modern': 
        return `
          font-mono text-sm text-slate-800
          prose-h1:text-xl prose-h1:text-primary prose-h1:mb-4
          prose-h2:text-base prose-h2:font-bold prose-h2:uppercase prose-h2:tracking-wider prose-h2:mt-6 prose-h2:border-b prose-h2:border-dashed prose-h2:border-slate-400
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
        `;
      default: return "";
    }
  };

  if (stage === 'START') return (
    <div className="max-w-4xl mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold font-headline">CV Forge</h1>
        <p className="text-muted-foreground">Tailor your professional story with Agentic AI.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:border-primary cursor-pointer transition-all group" onClick={() => setStage('IMPORT_SETUP')}>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileUp className="text-primary h-6 w-6" />
            </div>
            <CardTitle>Import Existing</CardTitle>
            <CardDescription>Upload your PDF. We'll extract text from all pages and let you reformat it.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="hover:border-primary cursor-pointer transition-all group" onClick={() => { setImportMode(false); setStage('FORM_FILLING'); }}>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <PenTool className="text-accent h-6 w-6" />
            </div>
            <CardTitle>Build from Scratch</CardTitle>
            <CardDescription>Fill a structured form and generate a pro resume.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );

  if (stage === 'IMPORT_SETUP') return (
    <div className="max-w-md mx-auto pt-20">
      <Card>
        <CardHeader>
          <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={() => setStage('START')}><ArrowLeft className="h-4 w-4 mr-2"/> Back</Button>
          <CardTitle>Upload PDF Resume</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-xl p-12 text-center hover:bg-muted/50 transition-colors relative">
            {loading ? <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /> : <FileUp className="h-10 w-10 mx-auto text-muted-foreground" />}
            <p className="mt-4 text-sm font-medium">{loading ? "Analyzing all pages..." : "Drop your multi-page resume here"}</p>
            <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePdfUpload} disabled={loading} />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (stage === 'FORM_FILLING') {
    return (
      <FormSection 
        formData={formData} 
        setFormData={setFormData} 
        onBack={() => setStage('START')}
        onSubmit={handleFormSubmit}
      />
    );
  }

  if (stage === 'TEMPLATE_SELECT') return (
    <div className="max-w-4xl mx-auto py-10 space-y-6">
        <div className='flex items-center gap-2'>
            <Button variant="ghost" size="sm" onClick={() => setStage(importMode ? 'IMPORT_SETUP' : 'FORM_FILLING')}><ArrowLeft className="h-4 w-4 mr-2"/> Back</Button>
            <h2 className="text-2xl font-bold font-headline">Select a Template</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <TemplateCard title="Classic Corporate" desc="Timeless serif style." type="Classic Corporate" selected={selectedTemplate === 'Classic Corporate'} onSelect={handleTemplateSelect} />
            <TemplateCard title="Minimalist Pro" desc="Clean sans-serif." type="Minimalist Pro" selected={selectedTemplate === 'Minimalist Pro'} onSelect={handleTemplateSelect} />
            <TemplateCard title="Tech Modern" desc="Monospace for devs." type="Tech Modern" selected={selectedTemplate === 'Tech Modern'} onSelect={handleTemplateSelect} />
            {importMode && (
                <TemplateCard title="Keep Original" desc="Maintain your current layout (Linearized)." type="Keep Original" selected={selectedTemplate === 'Keep Original'} onSelect={handleTemplateSelect} />
            )}
        </div>

        {loading && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-lg font-semibold">Generating Resume...</p>
                <p className="text-sm text-muted-foreground">Applying {selectedTemplate} style.</p>
            </div>
        )}
    </div>
  );

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-4 overflow-hidden relative">
      
      {/* PDF PREVIEW MODAL */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl h-[95vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2 shrink-0">
                <DialogTitle>PDF Preview</DialogTitle>
                <DialogDescription>Review your resume before downloading.</DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto bg-gray-100 p-8 flex justify-center items-start">
                <div 
                    ref={pdfSourceRef} 
                    className={cn(
                        "bg-white text-black shadow-lg shrink-0", 
                        "w-[210mm] min-h-[297mm]", 
                        "p-[15mm]", // Margins similar to standard docs
                        "prose prose-sm max-w-none", 
                        getTemplateClass()
                    )}
                >
                    <ReactMarkdown>{markdown}</ReactMarkdown>
                </div>
            </div>

            <DialogFooter className="p-6 pt-4 border-t bg-background shrink-0">
                <Button variant="outline" onClick={() => setShowPreview(false)}>Back to Editing</Button>
                <Button onClick={executeDownload} disabled={isExporting}>
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Download className="h-4 w-4 mr-2"/>}
                    Download PDF
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LEFT: WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-2 px-2">
          <h2 className="font-headline font-bold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" /> Workspace ({selectedTemplate})
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStage(importMode ? 'IMPORT_SETUP' : 'FORM_FILLING')}>Start Over</Button>
            <Button 
                variant="default" 
                size="sm" 
                onClick={handleDownloadPDF} 
                className="bg-green-600 hover:bg-green-700 text-white border-none shadow-md"
            >
                <Eye className="h-4 w-4 mr-2"/> Preview & Download
            </Button>
          </div>
        </div>
        
        <Card className="flex-1 overflow-hidden shadow-xl border-primary/20 flex flex-col relative">
             {/* MARKDOWN TOOLBAR */}
             <div className="flex items-center gap-1 p-2 border-b bg-muted/40 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => insertMarkdown('**', '**')} title="Bold">
                    <Bold className="h-4 w-4"/>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => insertMarkdown('*', '*')} title="Italic">
                    <Italic className="h-4 w-4"/>
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button variant="ghost" size="sm" onClick={() => insertMarkdown('## ', '')} title="Section Title">
                    <Heading1 className="h-4 w-4"/>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => insertMarkdown('### ', '')} title="Job Title">
                    <Heading2 className="h-4 w-4"/>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => insertMarkdown('- ', '')} title="Bullet List">
                    <List className="h-4 w-4"/>
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button variant="ghost" size="sm" onClick={() => insertMarkdown('[', '](url)')} title="Link">
                    <LinkIcon className="h-4 w-4"/>
                </Button>
             </div>

             <Textarea 
                ref={textareaRef}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="flex-1 resize-none border-0 p-8 font-mono text-sm leading-relaxed focus-visible:ring-0 bg-background/50 overflow-y-auto rounded-none"
            />
        </Card>
      </div>

      {/* RIGHT: AGENTIC CHAT */}
      <Card className="w-full md:w-[380px] flex flex-col h-full shadow-2xl border-t-4 border-t-primary">
        <CardHeader className="py-3 border-b bg-muted/20">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" /> AI Resume Agent
          </CardTitle>
        </CardHeader>
        
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-3 text-sm", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", m.role === 'bot' ? "bg-primary/10" : "bg-accent/10")}>
                  {m.role === 'bot' ? <Bot className="h-4 w-4 text-primary"/> : <User className="h-4 w-4 text-accent"/>}
                </div>
                {/* FIXED: Added break-words and whitespace-pre-wrap for chat bubbles */}
                <div className={cn(
                    "p-3 rounded-2xl max-w-[85%] break-words whitespace-pre-wrap", 
                    m.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none"
                )}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-primary"/></div>
                <div className="bg-muted p-3 rounded-2xl text-xs italic text-muted-foreground">Thinking...</div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t space-y-2 bg-background">
          <div className="flex gap-2">
            <Input 
              placeholder="e.g. Add keywords for this job link..." 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              className="text-sm"
              disabled={loading}
            />
            <Button size="icon" onClick={handleChat} disabled={loading || !chatInput.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}