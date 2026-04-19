/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent, Suspense, lazy } from 'react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Users, 
  MessageSquare, 
  Mic2, 
  Zap, 
  BarChart3, 
  Volume2,
  Send,
  Eye,
  Box,
  Monitor,
  Flame,
  Activity,
  ChevronRight,
  TrendingUp,
  LayoutDashboard,
  Quote,
  RotateCw
} from 'lucide-react';
import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";
import { MatchData, ChatMessage, Personality, PERSONALITIES, FALLBACK_COMMENTARY } from './types';

// Lazy load Konva
const Stage = lazy(() => import('react-konva').then(m => ({ default: m.Stage })));
const Layer = lazy(() => import('react-konva').then(m => ({ default: m.Layer })));
const Circle = lazy(() => import('react-konva').then(m => ({ default: m.Circle })));
const Line = lazy(() => import('react-konva').then(m => ({ default: m.Line })));
const Text = lazy(() => import('react-konva').then(m => ({ default: m.Text })));
const Group = lazy(() => import('react-konva').then(m => ({ default: m.Group })));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [match, setMatch] = useState<MatchData | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [activePersonality, setActivePersonality] = useState<Personality>(PERSONALITIES[1]);
  const [commentary, setCommentary] = useState<string>('BOOM! You said it! MS Dhoni finishing in style with a cracking boundary!');
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [useBrowserTTS, setUseBrowserTTS] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<'broadcast' | '3d'>('broadcast');
  const [isAutoSim, setIsAutoSim] = useState(true);
  const [recentPhrases, setRecentPhrases] = useState<string[]>([]);
  
  const socketRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bgAudioRef = useRef<HTMLAudioElement>(null);
  const sfxRef = useRef<HTMLAudioElement>(null);

  const SFX_URLS = {
    boundary: "https://www.soundjay.com/human/applause-01.mp3",
    six: "https://www.soundjay.com/human/crowd-cheer-01.mp3",
    wicket: "https://www.soundjay.com/buttons/beep-07.mp3",
    celebration: "https://www.soundjay.com/human/applause-01.mp3"
  };

  const playSFX = (url: string | undefined) => {
    if (sfxRef.current && url) {
      sfxRef.current.src = url;
      sfxRef.current.load();
      sfxRef.current.play().catch(e => console.log("SFX play failed:", e));
    }
  };

  useEffect(() => {
    socketRef.current = io();
    socketRef.current.on('match_update', (data: MatchData) => setMatch(data));
    socketRef.current.on('chat_update', (msg: ChatMessage) => {
      setChat(prev => [...prev.slice(-49), msg]);
    });
    return () => socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  useEffect(() => {
    if (match?.lastEvent) {
      const event = match.lastEvent.toUpperCase();
      if (event.includes("4") || event.includes("BOUNDARY")) playSFX(SFX_URLS.boundary);
      else if (event.includes("SIX")) playSFX(SFX_URLS.six);
      else if (event.includes("WICKET") || event.includes("OUT")) playSFX(SFX_URLS.wicket);
      else if (event.includes("BOWLER") || event.includes("DHONI") || event.includes("KOHLI")) playSFX(SFX_URLS.celebration);
    }
  }, [match?.lastEvent]);

  useEffect(() => {
    if (match && isAutoSim) generateCommentary(match);
  }, [match?.lastEvent, activePersonality.id]);

  const generateCommentary = async (currentMatch: MatchData) => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const recentChat = chat.slice(-4).map(m => `[${m.user}]: ${m.text}`).join(' | ');
      const avoid = recentPhrases.slice(-3).join('. ');
      const prompt = `
        IPL MATCH: ${currentMatch.teamA} vs ${currentMatch.teamB}
        BATTING TEAM: ${currentMatch.teamA}
        SCORE: ${currentMatch.scoreA}/${currentMatch.wicketsA} (${currentMatch.overs} overs)
        LAST EVENT: ${currentMatch.lastEvent}
        FAN CHAT CONTEXT: "${recentChat}"
        
        TASK: Write a punchy, one-paragraph IPL commentary (2-3 sentences).
        IMPORTANT: Use EXTRA FUNNY AND COMIC SLANG. Think like a witty, street-smart commentator.
        PROHIBITED PHRASES (DO NOT USE): "${avoid}"
        
        PERSONALITY RULES:
        ${activePersonality.instruction}
        
        Reference specific fans from the chat by username to make it feel alive!
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { 
          systemInstruction: "Your goal is to provide immersive, professional sports commentary that feels deeply connected to the fans and the local culture of IPL. Prioritize humor, wit, and diverse cricket slangs.", 
          temperature: 1.0,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
        },
      });

      const text = result.text || "";
      setCommentary(text);
      setRecentPhrases(prev => [...prev.slice(-9), text]);
      setApiError(null);
      await playCommentary(text);
    } catch (error: any) {
      let errorMsg = error?.message || "";
      if (!errorMsg && typeof error === 'object') {
        try { errorMsg = JSON.stringify(error); } catch { errorMsg = String(error); }
      }
      
      console.log("Commentary Gen Error:", errorMsg);
      
      if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("spending cap") || errorMsg.includes("quota")) {
        setApiError("AI Quota Exceeded (Deep Simulation Mode)");
        
        const eventType = currentMatch.lastEvent.toUpperCase();
        const category = (eventType.includes('BOUNDARY') || eventType.includes('4') || eventType.includes('SIX')) 
          ? 'BOUNDARY' 
          : (eventType.includes('WICKET') || eventType.includes('OUT')) 
          ? 'WICKET' 
          : 'DEFAULT';
        
        const personalPool = FALLBACK_COMMENTARY[activePersonality.id];
        const bank = personalPool[category] || personalPool['DEFAULT'];
        const fallbackMsg = bank[Math.floor(Math.random() * bank.length)];
        
        setCommentary(fallbackMsg);
        playCommentary(fallbackMsg, true); // Force browser fallback on quota issue
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const playCommentary = async (text: string, forceBrowser = false) => {
    if (useBrowserTTS || forceBrowser) {
      speakCommentary(text);
      return;
    }

    try {
      const audioResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: activePersonality.voice } } },
        },
      });
      const base64Audio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const audioBlob = await fetch(`data:audio/wav;base64,${base64Audio}`).then(res => res.blob());
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setApiError(null);
      }
    } catch (error: any) {
      console.log("Fallback to Browser TTS due to error or quota");
      speakCommentary(text);
    }
  };

  const speakCommentary = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 0.9;
    
    // Choose a male/authoritative voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') || v.lang.startsWith('en-IN')) || voices[0];
    if (preferred) utterance.voice = preferred;
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      audioRef.current.play().catch(e => console.log("Audio Play Failed:", e.message));
    }
  }, [audioUrl]);

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    socketRef.current?.emit('chat_message', { user: `Fan_${Math.floor(Math.random() * 100)}`, text: message });
    setMessage('');
  };

  return (
    <div className="h-screen bg-[#0f1118] text-[#e0e1e6] font-sans flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <nav className="h-14 bg-[#0a0c12] border-b border-white/5 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <Activity className="w-4 h-4 text-red-500 animate-pulse" />
          </div>
          <div className="bg-white/10 p-1.5 rounded-lg border border-white/10 mr-2">
             <Mic2 className="w-4 h-4 text-blue-400" />
          </div>
          <h1 className="text-sm font-black uppercase tracking-tighter text-white font-mono">The AI Comm-Box</h1>
        </div>

        <div className="flex items-center gap-4">
          {apiError && (
            <div className="hidden md:flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-lg">
              <RotateCw className="w-3 h-3 text-amber-500 animate-spin" />
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{apiError}</span>
            </div>
          )}

          <button 
            onClick={() => setUseBrowserTTS(!useBrowserTTS)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${useBrowserTTS ? 'bg-amber-600 border-amber-400 text-white' : 'bg-zinc-800 border-white/10 text-zinc-500'}`}
            title="Switch to Browser Voice to save AI Quota"
          >
            {useBrowserTTS ? 'Local Voice' : 'AI Voice'}
          </button>

          <button 
            onClick={() => setIsAutoSim(!isAutoSim)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${isAutoSim ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]' : 'bg-zinc-800 border-white/10 text-zinc-500 opacity-50'}`}
          >
            Auto-Simulate: {isAutoSim ? 'ON' : 'OFF'}
          </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Settings & Match Data */}
        <aside className="w-64 bg-[#0a0c12] border-r border-white/5 flex flex-col overflow-hidden">
          <div className="p-6">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">Select AI Personality</h2>
            <div className="space-y-3">
              {PERSONALITIES.map((p) => {
                const isActive = activePersonality.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActivePersonality(p)}
                    className={`w-full text-left p-4 rounded-xl transition-all border group relative overflow-hidden ${
                      isActive 
                      ? 'bg-white/5 border-blue-500/50 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]' 
                      : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'}`}>
                        {p.id === 'data-scientist' && <LayoutDashboard className="w-4 h-4" />}
                        {p.id === 'hype-man' && <Zap className="w-4 h-4" />}
                        {p.id === 'local-hero' && <Flame className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className={`text-xs font-bold leading-none mb-1.5 ${isActive ? 'text-white' : 'text-zinc-400'}`}>{p.name}</p>
                        <p className="text-[10px] text-zinc-500 font-medium leading-tight line-clamp-2">{p.description}</p>
                      </div>
                    </div>
                    {isActive && (
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto p-6 border-t border-white/5 bg-[#0a0c12]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Live Match Data</h2>
              <TrendingUp className="w-3.5 h-4 text-blue-500" />
            </div>
            
            <div className="space-y-6">
              <div>
                 <div className="flex items-baseline justify-center gap-1.5">
                   <p className="text-4xl font-black text-white tabular-nums">{match?.scoreA || 0}</p>
                   <p className="text-2xl font-black text-zinc-700">/</p>
                   <p className="text-4xl font-black text-zinc-400 tabular-nums">{match?.wicketsA || 0}</p>
                 </div>
                 <p className="text-center text-[10px] font-bold text-zinc-600 uppercase mt-2">Overs: {match?.overs || 0}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-[9px] font-black text-zinc-600 uppercase mb-1">Target</p>
                  <p className="text-sm font-black text-white">183</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-[9px] font-black text-zinc-600 uppercase mb-1">Current RR</p>
                  <p className="text-sm font-black text-blue-500">9.4</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content: Stadium View & Commentary */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-black">
          {/* Match Background Section */}
          <div className="flex-1 relative group overflow-hidden">
             {viewMode === 'broadcast' ? (
                <div className="absolute inset-0">
                  <img src="https://picsum.photos/seed/ipl_broadcast/1920/1080?blur=4" className="w-full h-full object-cover opacity-50 grayscale scale-110" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60" />
                  
                  {/* Floating HUD Elements */}
                  <div className="absolute top-8 left-8 flex items-center gap-3">
                    <div className="bg-red-600 px-3 py-1 rounded-md text-[10px] font-black flex items-center gap-1.5 shadow-xl">
                       <Activity className="w-3 h-3" /> LIVE
                    </div>
                    <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-md border border-white/10 text-[10px] font-black">
                       CSK vs MI
                    </div>
                  </div>
                </div>
             ) : (
                <div className="absolute inset-0 z-10 pointer-events-auto">
                   <Suspense fallback={<div className="flex items-center justify-center inset-0 absolute">Loading Analytics...</div>}>
                      <Field3D />
                   </Suspense>
                </div>
             )}

             {/* View Mode Switching */}
             <div className="absolute top-8 right-8 flex gap-2 z-30">
               <button onClick={() => setViewMode('broadcast')} className={`p-2 rounded-lg border transition-all ${viewMode === 'broadcast' ? 'bg-white text-black border-white' : 'bg-black/40 text-zinc-500 border-white/10 hover:border-white/30'}`}>
                 <Monitor className="w-4 h-4" />
               </button>
               <button onClick={() => setViewMode('3d')} className={`p-2 rounded-lg border transition-all ${viewMode === '3d' ? 'bg-white text-black border-white' : 'bg-black/40 text-zinc-500 border-white/10 hover:border-white/30'}`}>
                 <Box className="w-4 h-4" />
               </button>
             </div>

             {/* Central Commentary HUD (Exact Match to Screenshot) */}
             <div className="absolute bottom-10 left-12 right-12 max-w-4xl mx-auto z-40">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-[#0a0c12]/90 backdrop-blur-3xl border border-white/10 rounded-2xl p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] relative"
                >
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${activePersonality.id === 'hype-man' ? 'bg-blue-600/20 text-blue-400' : activePersonality.id === 'data-scientist' ? 'bg-orange-600/20 text-orange-400' : 'bg-purple-600/20 text-purple-400'}`}>
                           {activePersonality.id === 'hype-man' ? <Zap className="w-5 h-5 fill-current" /> : activePersonality.id === 'data-scientist' ? <LayoutDashboard className="w-5 h-5" /> : <Flame className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white uppercase">{activePersonality.name}</h3>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">AI Generated Commentary</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {audioUrl && (
                          <button 
                            onClick={() => audioRef.current?.play()}
                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-blue-500 transition-colors border border-blue-500/20"
                            title="Replay Commentary"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => match && generateCommentary(match)}
                          disabled={isGenerating}
                          className="bg-zinc-800 hover:bg-zinc-700 transition-colors px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-wider border border-white/5 disabled:opacity-50"
                        >
                           <RotateCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} /> Force Generate
                        </button>
                      </div>
                   </div>

                   <div className="relative">
                      <Quote className="absolute -top-4 -left-6 w-10 h-10 text-zinc-800/50" />
                      <AnimatePresence mode="wait">
                         <div className="space-y-4">
                           <motion.p 
                              key={commentary}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-2xl font-black italic tracking-tight text-white leading-tight pr-4"
                           >
                              {commentary}
                           </motion.p>
                           
                           {/* Audio Reactivity Visualizer */}
                           <div className="flex items-center gap-1.5 h-2">
                              {[...Array(24)].map((_, i) => (
                                <motion.div 
                                  key={i}
                                  animate={{ 
                                    height: isPlaying ? [2, 12, 4, 18, 2] : [2, 2],
                                    opacity: isPlaying ? 0.8 : 0.2 
                                  }}
                                  transition={{ 
                                    duration: 0.5, 
                                    repeat: Infinity, 
                                    delay: i * 0.04,
                                    ease: "easeInOut"
                                  }}
                                  className="bg-blue-500 w-1.5 rounded-full"
                                />
                              ))}
                            </div>
                         </div>
                       </AnimatePresence>
                   </div>
                </motion.div>
             </div>
          </div>
        </main>

        {/* Right Sidebar: Live Fan Chat */}
        <aside className="w-80 bg-[#0a0c12] border-l border-white/5 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <h2 className="text-[10px] font-black text-white uppercase tracking-widest">Live Fan Chat</h2>
            </div>
            <div className="bg-white/5 px-2 py-0.5 rounded text-[10px] font-bold text-zinc-500">{chat.length} msgs</div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-black/20">
            {chat.map((m, i) => (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                key={i} 
                className="group"
              >
                <div className="flex items-center gap-2 mb-1">
                   <span className="text-[11px] font-black text-[#8b8e9b] group-hover:text-blue-400 transition-colors">{m.user}</span>
                   {m.text.includes("BOOM") || m.text.includes("shot") ? <span className="text-xs">🔥</span> : null}
                </div>
                <p className="text-[13px] text-[#e0e1e6] font-medium leading-relaxed bg-white/5 p-3 rounded-lg border border-transparent group-hover:border-white/5 transition-all">
                  {m.text}
                </p>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-6 bg-[#0a0c12] border-t border-white/5">
            <form onSubmit={sendMessage} className="relative">
              <input 
                type="text" 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Send a message..."
                className="w-full bg-[#161821] border border-white/5 rounded-xl py-3 px-5 pr-12 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700 font-medium"
              />
              <button 
                type="submit"
                className="absolute right-2 top-2 bottom-2 aspect-square text-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center rounded-lg"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </aside>
      </div>

      <audio 
        ref={bgAudioRef} 
        src="https://www.soundjay.com/ambient/audiocheck.net_white_noise_lowpass_3s.mp3" 
        loop 
        className="hidden" 
        crossOrigin="anonymous"
        onError={() => console.log("Ambient Audio failed to load")}
      />
      <audio 
        ref={audioRef} 
        className="hidden" 
        onPlay={() => setIsPlaying(true)}
        onEnded={() => setIsPlaying(false)}
        crossOrigin="anonymous"
        onError={() => {
          console.log("TTS Audio error - check source");
          setIsPlaying(false);
        }}
      />
      <audio 
        ref={sfxRef} 
        className="hidden" 
        crossOrigin="anonymous"
        onError={() => console.log("SFX Audio error")}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 9px; }
      `}</style>
    </div>
  );
}

function Field3D() {
  const fieldMapping = [
    { role: 'BAT', label: 'STRIKER', color: '#fbbf24', x: 600, y: 440 },
    { role: 'BAT', label: 'NON-STRIKER', color: '#fbbf24', x: 600, y: 360 },
    { role: 'WK', label: 'KEEPER', color: '#3b82f6', x: 600, y: 480 },
    { role: 'FLD', label: 'SLIP 1', color: '#3b82f6', x: 630, y: 480 },
    { role: 'FLD', label: 'SLIP 2', color: '#3b82f6', x: 660, y: 470 },
    { role: 'FLD', label: 'GULLY', color: '#3b82f6', x: 680, y: 450 },
    { role: 'FLD', label: 'POINT', color: '#3b82f6', x: 750, y: 400 },
    { role: 'FLD', label: 'COVERS', color: '#3b82f6', x: 720, y: 320 },
    { role: 'FLD', label: 'MID OFF', color: '#3b82f6', x: 640, y: 280 },
    { role: 'FLD', label: 'MID ON', color: '#3b82f6', x: 560, y: 280 },
    { role: 'FLD', label: 'MID WICKET', color: '#3b82f6', x: 480, y: 320 },
    { role: 'FLD', label: 'SQUARE LEG', color: '#3b82f6', x: 450, y: 400 },
    { role: 'FLD', label: 'FINE LEG', color: '#3b82f6', x: 520, y: 480 },
  ];

  const [players, setPlayers] = useState(fieldMapping.map((p, i) => ({
    ...p,
    id: i,
    currentX: p.x,
    currentY: p.y,
  })));

  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers(prev => prev.map(p => ({
        ...p,
        currentX: p.x + (Math.random() - 0.5) * 8,
        currentY: p.y + (Math.random() - 0.5) * 8,
      })));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <Stage width={1200} height={800} className="w-full h-full flex justify-center items-center">
      <Layer>
        {/* Pitch Area */}
        <Line 
          points={[585, 340, 615, 340, 615, 460, 585, 460]} 
          closed 
          fill="rgba(59,130,246,0.15)" 
          stroke="#3b82f6" 
          strokeWidth={1} 
        />
        
        {/* Field Boundary Lines */}
        <Circle x={600} y={400} radius={350} stroke="rgba(255,255,255,0.05)" strokeWidth={1} dash={[10, 5]} />
        <Circle x={600} y={400} radius={250} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />

        {/* Players */}
        {players.map(p => (
           <Group key={p.id}>
             {/* Glow effect */}
             <Circle 
               x={p.currentX} 
               y={p.currentY} 
               radius={12} 
               fill={p.color} 
               opacity={0.15}
             />
             {/* Core dot */}
             <Circle 
               x={p.currentX} 
               y={p.currentY} 
               radius={4} 
               fill={p.color} 
               shadowBlur={10} 
               shadowColor={p.color} 
             />
             {/* Role label */}
             <Text 
               x={p.currentX - 25} 
               y={p.currentY + 12} 
               text={p.role} 
               fontSize={8} 
               fill="white" 
               opacity={0.4} 
               fontStyle="bold"
               align="center"
               width={50}
             />
             {/* Position Name Label */}
             <Text 
               x={p.currentX - 40} 
               y={p.currentY - 15} 
               text={p.label} 
               fontSize={7} 
               fill={p.color} 
               opacity={0.8} 
               fontStyle="bold"
               align="center"
               width={80}
             />
           </Group>
        ))}

        {/* Legend */}
        <Text x={40} y={40} text="3D ANALYTICS: PLAYER POSITIONS (REAL-TIME)" fontSize={12} fill="#3b82f6" fontStyle="bold" />
        <Group x={40} y={65}>
          <Circle radius={4} fill="#fbbf24" x={0} y={0} />
          <Text x={10} y={-4} text="BATTING UNIT" fontSize={10} fill="white" opacity={0.6} />
          
          <Circle radius={4} fill="#3b82f6" x={0} y={20} />
          <Text x={10} y={16} text="FIELDING UNIT" fontSize={10} fill="white" opacity={0.6} />
        </Group>
      </Layer>
    </Stage>
  );
}

