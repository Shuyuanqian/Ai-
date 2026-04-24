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
  const [userContext, setUserContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const original = reader.result as string;
          const compressed = await compressImage(original);
          setImages(prev => [...prev, compressed]);
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
    let fullText = "";

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
        你是一位拥有“读心术”的理科金牌教师。你最擅长拆穿学生“凭感觉做题”的假象，强制要求回归课本。你说话极简、专业、直击要害。

        ### 核心禁令 (彻底消除机器感)
        1. 零符号容忍：严禁在任何地方输出 '*', '××', '__' 或任何形式的乱码/代码占位符。若需表达不确定信息，请使用“该处”、“某项”或专业名词代替，严禁出现符号占位。
        2. 符号规范：乘法必用 '×'，除法用 '÷'。下角标下沉（H₂O），上角标上浮（x²）。几何符号必用 '∠', '△', '⊥', '∥'。
        3. 极速限制：必须在 25 秒内极速输出，保持全中文讲述。

        ### 第一阶段：首要互动 (学生先说)
        学生描述的背景：${userContext || "未提供具体背景，请根据图片内容自动精准对齐教材难度。"}

        ### 第二阶段：结构化诊断流程

        ## 📊 课本概念“死穴”看板
        | 题目/板块 | 老师直击：你对哪个概念不清晰？ | 对应课本章节 |
        | :--- | :--- | :--- |
        | (板块名称) | **概念死穴**：(点名学生理解模糊的具体知识点) | (精准章节名) |

        ## 🧩 错题思维穿透 (一列一列拆解)
        针对每道典型错题，必须按以下逻辑进行对比，且每块用 --- 分隔：

        ---
        【题号：知识点名称】
        - **🕯️ 心理侧写 (我猜你当时)**：
          > 老师看穿了你的想法：(描述其“想当然”或“偷懒”的心理逻辑。)
        - **🚩 概念盲区 (为什么扣分)**：
          > 老师直接说出你错的原因：(直接定性，指出对教材定义的误解。)
        - **📒 课本铁律 (回归本质)**：
          > 还原教材定义：(引用课本原句，确立权威。)
        - **🎯 提分必杀 (秒杀技巧)**：
          > 抛弃错觉，用课本逻辑：(给出基于课本的极简路径，禁止任何 * 符号。)
        ---

        ## 🚀 终极提分指令
        1. (强制回归课本复习的具体指令 1)
        2. (强制回归课本复习的具体指令 2)
      `;

      const result = await ai.models.generateContentStream({
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

      for await (const chunk of result) {
        let chunkText = chunk.text;
        // Immediate cleaning of forbidden artifacts
        chunkText = chunkText
          .replace(/\*/g, '×')
          .replace(/\//g, '÷')
          .replace(/([xX\u00D7\u2715\u2716\u2573\u2613\uFF38_]\s*){2,}/g, ''); // Catch double symbols even with spaces
        
        fullText += chunkText;
        setDiagnosis({ rawResponse: fullText });
      }

    } catch (error) {
      console.error("Diagnosis error:", error);
      setDiagnosis({ rawResponse: "诊断发生错误，请检查网络或图片清晰度。" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImages([]);
    setUserContext("");
    setDiagnosis(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-black selection:text-white p-4 sm:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-black pb-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BrainCircuit className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Science Specialty // Psychology Expert // Textbook Alignment</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase italic">理科金牌老师</h1>
        </div>
        <div className="mt-4 sm:mt-0 text-left sm:text-right font-mono">
          <div className="text-[10px] uppercase font-bold tracking-widest bg-black text-white px-2 py-0.5 inline-block">Role: Mind Reading Mentor</div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mt-1">Status: Standardized Symbols Only</p>
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
                  Read.<br />
                  Break.<br />
                  <span className="text-red-600">Rebound.</span>
                </h2>
                <p className="text-black/60 max-w-xl font-mono text-xs uppercase tracking-widest leading-loose">
                  拥有“读心术”的理科金牌教师。看穿你的思维盲区，还原教材绝对权威。
                  拒绝空洞解析，在 25 秒内抓出你的丢分死穴。
                </p>
              </div>

              <div className="space-y-6">
                <div className="bg-white border-2 border-black p-6 shadow-brutal">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">老师，我这次考的是... (年级/科目/考点)</label>
                  <textarea 
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    placeholder="例：初三数学，二次函数专练，感觉逻辑很乱..."
                    className="w-full bg-gray-50 border-2 border-black/5 p-4 font-sans text-sm focus:border-black transition-colors outline-none resize-none h-24"
                  />
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative aspect-[16/6] bg-white border-2 border-black shadow-brutal-lg hover:shadow-brutal transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-4"
                >
                  <div className="w-12 h-12 border-2 border-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold uppercase tracking-widest text-sm">初始化诊断队列</p>
                    <p className="font-mono text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">上传试卷照片（支持多页并行扫描）</p>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8">
                {[
                  { id: "01", title: "首要互动", desc: "优先读取背景，对齐学科难度" },
                  { id: "02", title: "符号规范", desc: "绝对禁止计算机符号，回归教材" },
                  { id: "03", title: "秒级洞察", desc: "25秒内输出结构化深度报告" }
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
                  {/* Context Summary in result view */}
                  <div className="bg-black text-white p-4 shadow-brutal relative group">
                    <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/40 mb-2">Active Context</div>
                    <p className="text-xs italic line-clamp-3">“{sanitizeSymbol(userContext) || "自动识别模式..."}”</p>
                    {diagnosis && (
                       <div className="mt-2 text-[8px] font-mono text-green-400">CONTEXT_SYNCED_OK</div>
                    )}
                  </div>

                  {/* Image Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="aspect-[3/4] bg-white border-2 border-black shadow-brutal overflow-hidden relative group">
                        <img src={img} alt={`Sheet ${idx + 1}`} className="w-full h-full object-cover grayscale contrast-125" />
                        {!diagnosis && !loading && (
                          <button 
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 w-6 h-6 bg-black text-white flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur text-white px-1 py-0.5 text-[6px] font-mono uppercase tracking-widest">
                          DATA_STREAM_P{idx + 1}
                        </div>
                      </div>
                    ))}
                    {!diagnosis && !loading && (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-[3/4] bg-white border-2 border-black border-dashed flex flex-col items-center justify-center gap-2 hover:bg-black/5 transition-all"
                      >
                        <Plus className="w-4 h-4 opacity-40" />
                        <span className="text-[8px] font-mono font-bold uppercase tracking-widest opacity-40">ADD PAGE</span>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*" 
                          multiple
                          onChange={handleImageUpload} 
                        />
                      </button>
                    )}
                  </div>
                  
                  <div className="p-4 bg-white border-2 border-black space-y-4">
                    {!diagnosis && !loading && (
                      <button 
                        onClick={diagnosePaper}
                        className="w-full bg-black text-white py-4 font-bold uppercase tracking-[0.2em] hover:bg-red-600 transition-all shadow-brutal flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4 fill-white" />
                        执行逻辑扫描
                      </button>
                    )}

                    {loading && (
                      <div className="w-full py-4 border-2 border-black border-dashed flex items-center justify-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-mono text-[10px] uppercase tracking-widest font-bold">Scanning Insight...</span>
                      </div>
                    )}

                    {diagnosis && (
                      <button 
                         onClick={reset}
                         className="w-full py-3 bg-red-600 text-white font-bold uppercase tracking-widest text-[10px] shadow-brutal hover:bg-black transition-all"
                      >
                        重置诊断队列
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
        <p className="text-[10px] font-mono text-gray-400 tracking-tighter">AI全科金牌教师 // STANDARDIZED EDUCATIONAL ENGINE</p>
        <p className="text-[10px] font-mono text-gray-400 hidden sm:block">NO COMPUTER SYMBOLS. ONLY BLACKBOARD LOGIC.</p>
      </footer>
    </div>
  );
}

function sanitizeSymbol(text: string) {
  if (!text) return "";
  return text
    .replace(/\*/g, '×') 
    .replace(/\//g, '÷')
    .replace(/->/g, '→')
    .replace(/>=/g, '≥')
    .replace(/<=/g, '≤')
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/\^n/g, 'ⁿ')
    .replace(/__+/g, '') 
    .replace(/([xX\u00D7\u2715\u2716\u2573\u2613\uFF38_]\s*){2,}/g, '') // Advanced purge for any sequence of placeholders (even with spaces)
    .replace(/[#*]/g, ''); 
}

function DiagnosisContent({ content }: { content: string }) {
  // Parsing the response into three main stages defined in the prompt
  const stages = content.split(/^## /m).filter(Boolean);

  return (
    <div className="space-y-12">
      {stages.map((stage, idx) => {
        const [titleLine, ...bodyLines] = stage.split('\n');
        const title = sanitizeSymbol(titleLine.replace(/^#+ /, '').trim());
        const bodyContent = bodyLines.join('\n').trim();

        // Phase 1: Table Billboard
        if (title.includes('看板') || bodyContent.includes('|')) {
          return (
            <div key={idx} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-xs">M1</div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">{title}</h2>
              </div>
              <div className="border-2 border-black bg-white shadow-brutal overflow-hidden">
                <div dangerouslySetInnerHTML={{ __html: formatTable(sanitizeSymbol(bodyContent)) }} />
              </div>
            </div>
          );
        }

        // Phase 2: Mind Map Logic Comparison (Mind Reading)
        if (title.includes('思维穿透') || title.includes('拆解') || title.includes('分析')) {
          return (
            <div key={idx} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-xs">M2</div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">{title}</h2>
              </div>
              
              <div className="space-y-8">
                {bodyContent.split(/---/).filter(block => block.trim().length > 20).map((block, bIdx) => {
                  const moduleTitleMatch = block.match(/【(.*?)】/);
                  const moduleTitle = sanitizeSymbol(moduleTitleMatch ? moduleTitleMatch[1] : '错题死穴分析');
                  
                  // Match labels based on strict new structure
                  const psychMatch = block.match(/🕯️\s*心理侧写\s*\(我猜你当时\)[：:]?\s*([\s\S]*?)(?=- \*\*🚩|$)/);
                  const reasonMatch = block.match(/🚩\s*概念盲区\s*\(为什么扣分\)[：:]?\s*([\s\S]*?)(?=- \*\*📒|$)/);
                  const standardMatch = block.match(/📒\s*课本铁律\s*\(回归本质\)[：:]?\s*([\s\S]*?)(?=- \*\*🎯|$)/);
                  const secretMatch = block.match(/🎯\s*提分必杀\s*\(秒杀技巧\)[：:]?\s*([\s\S]*?)(?=$)/);

                  const psychological = sanitizeSymbol(psychMatch ? psychMatch[1].replace(/[>#]/g, '').replace(/老师看穿了你的想法[：:]?\s*/, '').trim() : '秒级读心中...');
                  const pathology = sanitizeSymbol(reasonMatch ? reasonMatch[1].replace(/[>#]/g, '').replace(/老师直接说出你错的原因[：:]?\s*/, '').trim() : '定位死穴中...');
                  const textbook = sanitizeSymbol(standardMatch ? standardMatch[1].replace(/[>#]/g, '').replace(/还原教材定义[：:]?\s*/, '').trim() : '查阅教材权威...');
                  const resultInstruction = sanitizeSymbol(secretMatch ? secretMatch[1].replace(/[>#]/g, '').replace(/抛弃错觉，用课本逻辑[：:]?\s*/, '').trim() : '提炼提分秘籍...');
                  
                  return (
                    <div key={bIdx} className="border-2 border-black bg-white p-6 relative">
                      <div className="absolute -top-3 left-4 px-2 bg-black text-white text-[10px] font-mono uppercase tracking-widest font-bold border border-white/20">
                        PENETRATION // {moduleTitle}
                      </div>
                      
                      <div className="space-y-6 pt-4">
                        {/* Psychological & Pathology Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 bg-gray-50 border-r-2 border-black/5">
                            <p className="text-[10px] font-bold text-black/40 uppercase mb-2 flex items-center gap-2">
                              <Search className="w-3 h-3 text-black" />
                              Psych_Profiling // 秒级读心
                            </p>
                            <p className="text-sm leading-relaxed italic text-gray-700">“我猜你当时：{psychological}”</p>
                          </div>
                          <div className="p-4 bg-red-50/50 border-l-2 border-red-600/30">
                            <p className="text-[10px] font-bold text-red-600 uppercase mb-2 flex items-center gap-2">
                              <Target className="w-3 h-3" />
                              Blind_Spot // 概念盲区
                            </p>
                            <p className="text-sm leading-relaxed font-bold text-red-700">老师直言：{pathology}</p>
                          </div>
                        </div>
                        
                        {/* Textbook Content */}
                        <div className="bg-black text-white p-5 shadow-brutal flex items-start gap-4 border border-red-600/20">
                          <FileText className="w-5 h-5 text-red-500 shrink-0 mt-1" />
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Iron_Rule // 课本铁律</p>
                            <p className="text-sm italic font-serif leading-relaxed text-gray-200">教材原定义：{textbook}</p>
                          </div>
                        </div>
                        
                        {/* Killer Move */}
                        <div className="pt-4 border-t border-black/10 flex items-center gap-3">
                          <Zap className="w-4 h-4 text-red-600 animate-pulse" />
                          <p className="text-sm font-bold tracking-tight">
                            <span className="text-red-600 mr-2">提分必杀:</span>
                            {resultInstruction}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        // Phase 3: Summary / Killer Moves
        return (
          <div key={idx} className="space-y-4">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-xs">M3</div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">{title}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bodyContent.split('\n').filter(l => l.includes('：') || l.includes(':') || l.startsWith('- ') || l.startsWith('* ') || /^\d+\./.test(l.trim())).map((line, lIdx) => {
                  const cleanedLine = sanitizeSymbol(line.replace(/[*#]/g, '').replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''));
                  const [lTitle, ...lRest] = cleanedLine.split(/[：:]/);
                  if (!lTitle) return null;
                  
                  return (
                    <div key={lIdx} className="border-l-4 border-black bg-white p-5 shadow-sm border-y border-r border-black/10">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-red-700 mb-2">
                        {lTitle.trim() || `必杀技 ${lIdx + 1}`}
                      </p>
                      <p className="text-sm font-medium leading-relaxed">{lRest.join('：').trim() || lTitle.trim()}</p>
                    </div>
                  );
                })}
              </div>
          </div>
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
            ${row.map((cell, i) => {
              const sanitizedCell = sanitizeSymbol(cell);
              return `
                <td class="${i === 2 ? 'italic text-gray-500 text-xs' : 'font-bold'} ${i === 1 && sanitizedCell.includes('扣') ? 'text-red-600' : ''}">
                  ${sanitizedCell}
                </td>
              `;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
