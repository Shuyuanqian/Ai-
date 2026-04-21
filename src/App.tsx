/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Upload, 
  Camera, 
  Search, 
  Zap, 
  Target, 
  X, 
  Plus, 
  ArrowRight,
  Loader2,
  FileText,
  BrainCircuit,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface DiagnosisResult {
  rawResponse: string;
}

export default function App() {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: string[] = [];
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string]);
          setDiagnosis(null);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (images.length <= 1) setDiagnosis(null);
  };

  const diagnosePaper = async () => {
    if (images.length === 0) return;

    setLoading(true);
    setDiagnosis(null);

    try {
      const imageParts = images.map(img => {
        const base64Data = img.split(',')[1];
        return {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data,
          },
        };
      });

      const prompt = `
        你是一位顶级“AI穿透式学习教练”，专注于初高中全科试卷诊断。你说话简练、质朴、专业且有力。
        
        请分析这些试卷图片（可能包含多张照片），忽略任何手写涂改的干扰。请综合所有图片的信息给出整体诊断。
        
        请严格按照以下格式输出：

        ### 1. 全卷板块透视图 (表格化呈现)
        根据学科标准，列出分值分布：
        | 核心板块 | 总分 | 得分 | 丢分 | 教练定性 |
        | :--- | :--- | :--- | :--- | :--- |
        | (板块名称) | X | X | X | (一句话刺破现状) |

        ### 2. 核心错题深度穿透 (另起一行，深层剖析)
        针对重点错题，直接给出以下干货：
        - **【考官套路】**：用一句话拆穿出题人的陷阱。
        - **| 秒杀模型】**：用最通俗的大白话讲透解题模型。
        - **【避坑信号】**：告诉学生下次看到什么词（信号灯）必须立刻警觉。

        ### 3. 提分必杀技
        直接给出下一阶段最值得突击的 1-2 个点，不准有客套话，只要提分干货。
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              ...imageParts
            ],
          },
        ],
      });

      const text = response.text || "诊断失败，请重试。";
      setDiagnosis({ rawResponse: text });
    } catch (error) {
      console.error("Diagnosis error:", error);
      setDiagnosis({ rawResponse: "诊断发生错误，请检查网络或图片清晰度。" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImages([]);
    setDiagnosis(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-black selection:text-white p-4 sm:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-black pb-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BrainCircuit className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">AI-Powered Diagnostic Engine // Multi-Sheet V2.6</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase italic">AI Penetrative Coaching</h1>
        </div>
        <div className="mt-4 sm:mt-0 text-left sm:text-right font-mono">
          <div className="text-[10px] uppercase font-bold tracking-widest bg-black text-white px-2 py-0.5 inline-block">Active Sheets: {images.length}</div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mt-1">Ref ID: {new Date().getFullYear()}-PAPER-EXT</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {images.length === 0 ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <h2 className="text-6xl sm:text-8xl font-black tracking-tighter leading-[0.8] uppercase italic">
                  Penetrate.<br />
                  Extract.<br />
                  <span className="text-red-600">Succeed.</span>
                </h2>
                <p className="text-black/60 max-w-xl font-mono text-xs uppercase tracking-widest leading-loose">
                  Upload multiple examination sheets for a comprehensive structural analysis.
                  We aggregate data from all pages to provide a deep logic map.
                </p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative aspect-[16/7] bg-white border-2 border-black shadow-brutal-lg hover:shadow-brutal transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-4"
              >
                <div className="w-12 h-12 border-2 border-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="font-bold uppercase tracking-widest text-sm">Initialize Data Upload</p>
                  <p className="font-mono text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">Support Multiple File Selection</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  multiple
                  onChange={handleImageUpload} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8">
                {[
                  { id: "01", title: "Comprehensive Scanning", desc: "Scan 1-10 sheets in a single go" },
                  { id: "02", title: "Logic Extraction", desc: "Model-based error profiling" },
                  { id: "03", title: "Aggregate Insights", desc: "Pattern recognition across pages" }
                ].map((feature, i) => (
                  <div key={i} className="border-t-2 border-black pt-4">
                    <span className="font-mono text-[10px] text-black/30 block mb-2">{feature.id}</span>
                    <h3 className="font-bold uppercase tracking-widest text-sm mb-1">{feature.title}</h3>
                    <p className="text-xs text-black/50 font-mono leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Dashboard Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 items-start">
                <div className="sm:col-span-4 space-y-6">
                  {/* Image Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="aspect-[3/4] bg-white border-2 border-black shadow-brutal overflow-hidden relative group">
                        <img src={img} alt={`Sheet ${idx + 1}`} className="w-full h-full object-cover grayscale contrast-125 hover:grayscale-0 transition-all" />
                        <button 
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black text-white flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur text-white px-1 py-0.5 text-[6px] font-mono uppercase tracking-widest">
                          P.{idx + 1}
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[3/4] bg-white border-2 border-black border-dashed flex flex-col items-center justify-center gap-2 hover:bg-black/5 transition-all"
                    >
                      <Plus className="w-4 h-4 opacity-40" />
                      <span className="text-[8px] font-mono font-bold uppercase tracking-widest opacity-40">Add Sheet</span>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        multiple
                        onChange={handleImageUpload} 
                      />
                    </button>
                  </div>
                  
                  <div className="p-4 bg-white border-2 border-black space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono italic text-gray-400">{images.length} Sheet(s) Cached.</p>
                      <h3 className="text-xl font-black uppercase italic tracking-tighter">Ready for Extraction</h3>
                    </div>

                    {!diagnosis && !loading && (
                      <button 
                        onClick={diagnosePaper}
                        className="w-full bg-black text-white py-4 font-bold uppercase tracking-[0.2em] hover:bg-red-600 transition-all shadow-brutal flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4 fill-white" />
                        Run Comprehensive Diagnostic
                      </button>
                    )}

                    {loading && (
                      <div className="w-full py-4 border-2 border-black border-dashed flex items-center justify-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-mono text-[10px] uppercase tracking-widest font-bold">Processing {images.length} Sheets...</span>
                      </div>
                    )}

                    {diagnosis && (
                      <button 
                         onClick={reset}
                         className="w-full py-2 text-[10px] font-mono uppercase tracking-widest font-bold text-gray-400 hover:text-black transition-colors"
                      >
                        [ Clear All Data ]
                      </button>
                    )}
                  </div>
                </div>

                {/* Aggregated Results Section */}
                <div className="sm:col-span-8">
                  <AnimatePresence>
                    {diagnosis && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-8"
                      >
                        <div className="bg-black text-white px-4 py-2 text-[10px] font-mono uppercase tracking-[0.2em] inline-block mb-4">
                          Aggregate Intelligence Report // Confidence: High
                        </div>
                        <DiagnosisContent content={diagnosis.rawResponse} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto py-8 border-t border-black/10 mt-12 flex justify-between items-center">
        <p className="text-[10px] font-mono text-gray-400 tracking-tighter">AI PENETRATIVE LEARNING ENGINE // NO COMPROMISE ON LOGIC</p>
        <p className="text-[10px] font-mono text-gray-400 hidden sm:block">© {new Date().getFullYear()} EDUCATIONAL DIAGNOSTICS GROUP</p>
      </footer>
    </div>
  );
}

function DiagnosisContent({ content }: { content: string }) {
  const sections = content.split(/^### /m).filter(Boolean);

  return (
    <div className="space-y-12">
      {sections.map((section, idx) => {
        const [title, ...rest] = section.split('\n');
        const bodyContent = rest.join('\n').trim();

        // Check if it's the table section (Section 01)
        if (title.includes('透视图') || bodyContent.includes('|')) {
          return (
            <section key={idx} className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-black"></span> 0{idx + 1}. {title} (Sectional Mapping)
              </h2>
              <div className="border-2 border-black bg-white shadow-brutal overflow-hidden">
                <div dangerouslySetInnerHTML={{ __html: formatTable(bodyContent) }} />
              </div>
            </section>
          );
        }

        // Section 02 or 03
        return (
          <section key={idx} className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <span className={idx === 1 ? "w-2 h-2 bg-red-600" : "w-2 h-2 bg-black"}></span> 
              0{idx + 1}. {title} ({idx === 1 ? "Deep Dive" : "Killer Moves"})
            </h2>
            
            <div className={idx === 1 ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
              {bodyContent.split('\n').map((line, i) => {
                if (line.startsWith('- **')) {
                  const [label, text] = line.split('】：');
                  const cleanLabel = label.replace('- **', '').replace('**', '').replace('【', '');
                  
                  // Section 02: Deep Dive Cards
                  return (
                    <div key={i} className={i === 0 ? "bg-black text-white p-5 shadow-brutal-red" : "bg-white border-2 border-black p-5"}>
                      <div className={`flex justify-between border-b ${i === 0 ? 'border-white/20' : 'border-black/10'} pb-2 mb-3`}>
                        <span className="font-mono text-[9px] uppercase tracking-widest">{cleanLabel} PHASE</span>
                        {i === 0 && <span className="text-red-500 font-black italic text-[10px]">ROUTINE EXPOSED</span>}
                      </div>
                      <p className="text-sm leading-relaxed">{text}</p>
                    </div>
                  );
                }
                
                // Section 03: Killer Moves
                if (line.trim().length > 0) {
                  return (
                    <div key={i} className={`border-l-4 ${i % 2 === 0 ? 'border-red-600' : 'border-black'} bg-white border-y border-r border-black/5 pl-4 py-3 shadow-sm`}>
                      <p className="text-xs font-mono font-bold uppercase tracking-tighter mb-1 opacity-40">Tactical Move // {i+1}</p>
                      <p className="text-sm font-medium">{line}</p>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function formatTable(markdownTable: string) {
  const rows = markdownTable.trim().split('\n').filter(row => row.includes('|') && !row.includes('---'));
  if (rows.length < 2) return '';

  const headers = rows[0].split('|').filter(Boolean).map(h => h.trim());
  const body = rows.slice(1).map(row => row.split('|').filter(Boolean).map(c => c.trim()));

  return `
    <table class="tech-table">
      <thead>
        <tr>
          ${headers.map(h => `<th>${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${body.map((row, rowIdx) => `
          <tr class="${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}">
            ${row.map((cell, i) => `
              <td class="${i === 0 ? 'font-bold uppercase italic' : ''} ${i === 3 ? 'text-red-600 font-bold' : ''} ${i === 4 ? 'italic text-gray-500 text-xs' : ''}">
                ${cell}
              </td>
            `).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
