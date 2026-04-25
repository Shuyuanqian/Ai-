/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Plus, 
  X, 
  Zap, 
  Loader2, 
  Target, 
  MessageSquare, 
  BookOpen,
  ArrowRight,
  Search,
  CheckCircle2,
  Edit2,
  Sparkles,
  LayoutDashboard,
  FileText,
  BrainCircuit,
  Upload,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface DiagnosisResult {
  rawResponse: string;
}

export default function App() {
  const [images, setImages] = useState<string[]>([]);
  const [userContext, setUserContext] = useState("");
  const [expertContext, setExpertContext] = useState("");
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
    setDiagnosis({ rawResponse: "" }); // Trigger transition immediately for perceived speed
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
        # Role
        你是一位具备“格式洁癖”的全科金牌教师。你严禁大篇幅堆砌文字，必须采用【线性循迹、逐题闭环、视觉极简】的逻辑。从第一题开始顺序分析，确保每一道题的诊断都像黑板板书一样整洁规范。

        ### 背景信息锁定 (Context Lock)
        * **当前锁定状态**：${userContext || "未显式选择，请尝试从图片推断"}
        * **同学心虚/蒙题点**：${expertContext || "全盘系统扫描"}

        # ⚠️ 难度识别避坑补丁 (Priority Logic)
        1. **识别逻辑**：优先参考学生填写的“心声告白”中提到的题号。
        2. **看板确认**：在开始分析前，必须先列出分类清单。
           格式例：
           [难度分类看板]
           - 🟢 基础巩固区：(题号列表)
           - 🟡 思维进阶区：(题号列表)
           - 🔴 终极挑战区：(题号列表)
           “同学，如果这里有你觉得分错的，请告诉我，老师立刻调整。”
        3. **动态调整**：如果学生表达了对某题的极度困惑，严禁说“这题很简单”，必须立即切换到“耐心引导”模式。

        # 第一阶段：符号与格式净化禁令 (Highest Priority)
        1. **绝对禁止**：严禁出现 '*', '^', '××', '---', '//', '__', '#' 或任何代码占位符。乘法必用 '×'，除法必用 '÷'。
        2. **标准还原**：上标必上浮（如 10³），下标必下沉（如 H₂O）。几何符号必用标准的 '∠', '△', '⊥', '∥', '⊙'。
        3. **视觉布局**：使用 Markdown 标题、分级列表。确保段落之间有足够的留白，不产生视觉疲劳。严禁使用 $ 符号或 LaTeX/Markdown 数学公式块。
        4. **语言纯度**：一律使用地道、专业的教师用语，严禁繁体字或机器翻译腔。

        # 第二阶段：【线性循迹】逐题分析格式
        请严格按照题号顺序分析。每一道题必须独立成块，格式如下：

        ---
        ### 📍 [题号：知识点名称]
        * **【考察知识点】**：{准确点名}
        * **【题目类型】**：{题型分类}

        **🕯️ 老师想听听你的想法**：
        > 老师注意到你在这一题(描述图中具体痕迹)。结合你提到的困惑，你能告诉老师你当时是怎么想的吗？是由于不熟悉定义，还是审题疏忽？

        **🚩 概念盲区**：
        > 老师直接说出你错的原因：(实事求是对比课本标准，点出病灶。正向鼓励。)

        **📒 课本铁律**：
        > 课本里的标准知识是：(引用该版本教材定义原句。必须是原话。)

        **🎯 提分必杀**：
        > 抛弃错觉，用标准方法：(给出符合规范的极简解法。严禁出现任何电脑符号。)

        **💬 【本题互动与解决空间】**
        > **同学，关于这一题你有任何疑惑，请在这里提问。老师会根据你的问题逐步为你分析解答。**
        ---

        # 第三阶段：模块化总结报告 (Final Diagnosis)
        所有题号分析完毕后，汇总如下：

        ## 📑 诊疗总结看板
        1. **核心病灶汇总**：(总结主要病因：概念混淆、计算粗心等)。
        2. **薄弱模块定位**：(指出具体的系统性漏洞)。
        3. **未来解决路径**：
           - **Step 1**：如何回归课本。
           - **Step 2**：针对训练。
           - **Step 3**：克服心理死穴。

        引导反馈：“以上是全卷的穿透诊断，现在可以开始向老师提问了。”
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

      let firstChunkReceived = false;
      for await (const chunk of result) {
        let chunkText = chunk.text;
        // Immediate cleaning of forbidden artifacts
        chunkText = chunkText
          .replace(/\*/g, '×')
          .replace(/\//g, '÷')
          .replace(/([xX\u00D7\u2715\u2716\u2573\u2613\uFF38_]\s*){2,}/g, ''); // Catch double symbols even with spaces
        
        fullText += chunkText;
        setDiagnosis({ rawResponse: fullText });
        
        if (!firstChunkReceived) {
          setLoading(false);
          firstChunkReceived = true;
        }
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
    setExpertContext("");
    setDiagnosis(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans selection:bg-black selection:text-white p-4 sm:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-black pb-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BrainCircuit className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">All-Subjects Mastery // Cognitive Psychology // Textbook Authority</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase italic">全科金牌老师</h1>
        </div>
        <div className="mt-4 sm:mt-0 text-left sm:text-right font-mono">
          <div className="text-[10px] uppercase font-bold tracking-widest bg-black text-white px-2 py-0.5 inline-block">Role: Mind Reading Mentor</div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mt-1">Status: Standardized Symbols Only</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {!diagnosis ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <h2 className="text-6xl sm:text-8xl font-black tracking-tighter leading-[0.8] uppercase italic">
                  Teach.<br />
                  Lead.<br />
                  <span className="text-red-600">Excel.</span>
                </h2>
                <p className="text-black/60 max-w-xl font-mono text-xs uppercase tracking-widest leading-loose">
                  拥有“透教万卷”能力的金牌教师。严禁生搬硬套，回归课本唯一真理。
                  揪出笔迹背后的思维死穴，25秒极速穿透，还原教材权威。
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-8">
                  {/* Step 1: Background Locking */}
                  <div className="bg-white border-2 border-black p-6 shadow-brutal relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                      <Search className="w-12 h-12 text-black" />
                    </div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex justify-between items-center">
                      <span>1️⃣ 基础背景锁定 // Step 1: Context Lock</span>
                      <span className="text-red-500 text-[8px] animate-pulse">必须准确</span>
                    </label>
                    
                    {/* Quick Selectors */}
                    <div className="grid grid-cols-1 gap-6 mb-6 pb-6 border-b border-black/5">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-black uppercase opacity-60">锁定年级</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['初一', '初二', '初三', '高一', '高二', '高三'].map((v, i) => (
                            <button 
                              key={v} 
                              onClick={() => {
                                const letter = ['A', 'B', 'C', 'D', 'E', 'F'][i];
                                if (!userContext.includes(`[${letter}]`)) {
                                  setUserContext(prev => prev ? `${prev} [${letter}]${v}` : `[${letter}]${v}`);
                                }
                              }}
                              className="px-2 py-1 bg-gray-50 border border-black/10 text-[9px] hover:bg-black hover:text-white transition-all"
                            >
                              [{['A', 'B', 'C', 'D', 'E', 'F'][i]}]{v}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-black uppercase opacity-60">锁定学科</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['语文', '数学', '英语', '物理', '化学', '生物', '地理', '道法', '历史'].map((v, i) => (
                            <button 
                              key={v} 
                              onClick={() => {
                                const num = i + 1;
                                if (!userContext.includes(`[${num}]`)) {
                                  setUserContext(prev => prev ? `${prev} [${num}]${v}` : `[${num}]${v}`);
                                }
                              }}
                              className="px-2 py-1 bg-gray-50 border border-black/10 text-[9px] hover:bg-black hover:text-white transition-all"
                            >
                              [{i + 1}]{v}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-black uppercase opacity-60">锁定教材</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['人教版', '北师大', '苏教/科', '人教PEP', '部编版', '湘教版', '粤教版'].map((v, i) => (
                            <button 
                              key={v}
                              onClick={() => {
                                const letter = ['A', 'B', 'C', 'D', 'E', 'F', 'G'][i];
                                if (!userContext.includes(`(${letter})`)) {
                                  setUserContext(prev => prev ? `${prev} (${letter})${v}` : `(${letter})${v}`);
                                }
                              }}
                              className="px-2 py-1 bg-gray-50 border border-black/10 text-[9px] hover:bg-black hover:text-white transition-all"
                            >
                              ({['A', 'B', 'C', 'D', 'E', 'F', 'G'][i]}){v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <textarea 
                      value={userContext}
                      onChange={(e) => setUserContext(e.target.value)}
                      placeholder="选定上方项目或在此补充信息。例：B, 4, A (初二, 物理, 人教版)"
                      className="w-full bg-gray-50 border-2 border-black/5 p-4 font-sans text-sm focus:border-black transition-colors outline-none resize-none h-20"
                    />
                    <div className="mt-2 flex justify-between items-center">
                      <p className="text-[8px] text-gray-400 font-mono italic">*(请确保背景锁定，否则分析可能偏离教材标准)*</p>
                      <button onClick={() => setUserContext('')} className="text-[8px] font-bold text-red-600 hover:underline">重置背景</button>
                    </div>
                  </div>

                  {/* Step 2: Special Focus */}
                  <div className="bg-white border-2 border-black p-6 shadow-brutal relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                      <Target className="w-12 h-12 text-red-600" />
                    </div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-red-600 mb-4 flex items-center gap-2">
                      <Zap className="w-3 h-3 animate-pulse" />
                      2️⃣ 专项诊断箱 // Step 2: Special Focus
                    </label>
                    <div className="space-y-4">
                      <div className="bg-red-50/50 p-3 border-l-2 border-red-600/20">
                        <p className="text-[10px] text-red-800/60 font-medium leading-relaxed italic">
                          💡 同学请填写：你最不熟悉的基础概念、心虚的考点，或者哪道题是蒙的？
                        </p>
                      </div>
                      <textarea 
                        value={expertContext}
                        onChange={(e) => setExpertContext(e.target.value)}
                        placeholder="例：光现象的作图题我全是蒙的，法线和界面的关系我很乱..."
                        className="w-full bg-red-50/10 border-2 border-red-600/5 p-4 font-sans text-sm focus:border-red-600/20 transition-colors outline-none resize-none h-32"
                      />
                      <p className="text-[8px] text-red-400 uppercase font-mono tracking-tighter">
                        (老师将针对这一部分进行【特写式深度讲解】，精准纠偏思维误区)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Step 3: Evidence Upload & Preview */}
                  <div className="space-y-4">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative aspect-[16/6] bg-white border-2 border-black shadow-brutal-lg hover:shadow-brutal transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-4"
                    >
                      <div className="absolute top-2 left-2 text-[8px] font-mono font-bold text-black/20">UPLOAD_STEP_03</div>
                      <div className="w-10 h-10 border-2 border-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold uppercase tracking-widest text-sm">3️⃣ 扫描证据 // Proof Scan</p>
                        <p className="font-mono text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">上传试卷照片（支持多页并行扫描，越清晰越好）</p>
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

                    {images.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                      >
                        {images.map((img, idx) => (
                          <div key={idx} className="aspect-[3/4] bg-white border-2 border-black shadow-brutal overflow-hidden relative group">
                            <img src={img} alt={`Sheet ${idx + 1}`} className="w-full h-full object-cover grayscale contrast-125" />
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                              className="absolute top-1 right-1 w-5 h-5 bg-black text-white flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                            >
                              <X className="w-2 h-2" />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-black text-white px-1 py-0.5 text-[6px] font-mono">P{idx + 1}</div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {/* Final Action Button */}
                  <div className="pt-4">
                    {!loading ? (
                      <button 
                        onClick={diagnosePaper}
                        disabled={images.length === 0}
                        className={`w-full py-8 font-black uppercase tracking-[0.3em] transition-all shadow-brutal-lg flex flex-col items-center justify-center gap-2 text-2xl border-4 border-black
                          ${images.length > 0 ? 'bg-red-600 text-white hover:bg-black hover:-translate-y-1' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                        `}
                      >
                        <div className="flex items-center gap-4">
                          <Zap className={`w-8 h-8 ${images.length > 0 ? 'fill-white' : ''}`} />
                          开始扫描思维死穴
                        </div>
                        <span className="text-[10px] tracking-widest opacity-60">JUMP TO AI ANALYSIS</span>
                      </button>
                    ) : (
                      <div className="w-full py-8 bg-black text-white flex flex-col items-center justify-center gap-3 border-4 border-black">
                        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                        <span className="font-mono text-xs uppercase tracking-widest font-bold animate-pulse">Scanning Insight Logic...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Dashboard Layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                {/* Left Sidebar */}
                <div className="md:col-span-4 space-y-6">
                  {/* Context Summary */}
                  <div 
                    className="bg-white text-black p-4 shadow-brutal relative group cursor-pointer hover:bg-gray-50 transition-all border-2 border-black"
                    onClick={() => setDiagnosis(null)}
                  >
                    <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-gray-400 mb-2 flex justify-between items-center">
                      Active Context
                      <Edit2 className="w-3 h-3 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs italic line-clamp-3 font-medium">“{sanitizeSymbol(userContext) || "自动识别模式..."}”</p>
                    <div className="mt-2 flex justify-between items-center border-t border-black/5 pt-2">
                      <div className="text-[8px] font-mono text-green-600 flex items-center gap-1">
                        <div className="w-1 h-1 bg-green-600 rounded-full animate-pulse" />
                        LOCKED
                      </div>
                      <span className="text-[8px] font-mono text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">点击修改</span>
                    </div>
                  </div>

                  {/* Image Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="aspect-[3/4] bg-white border-2 border-black shadow-brutal overflow-hidden relative group">
                        <img src={img} alt={`Sheet ${idx + 1}`} className="w-full h-full object-cover grayscale contrast-125" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur text-white px-1 py-0.5 text-[6px] font-mono uppercase">
                          PAGE_{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={reset}
                    className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] shadow-brutal hover:bg-black transition-all border-2 border-black"
                  >
                    重置诊断并返回
                  </button>
                </div>

                {/* Right Content Area */}
                <div className="md:col-span-8">
                  <DiagnosisContent content={diagnosis.rawResponse} loading={loading} />
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
    .replace(/-(?!\d)/g, '—') // Only replace dashes that are not minus signs
    .replace(/([xX\u00D7\u2715\u2716\u2573\u2613\uFF38_]\s*){3,}/g, ''); // Only remove excessive repeats
}

function DiagnosisContent({ content, loading }: { content: string; loading: boolean }) {
  // If loading and no content yet, show an active scanning "Terminal"
  if (loading && !content) {
    return (
      <div className="space-y-8">
        <div className="bg-black text-white p-8 shadow-brutal border-4 border-red-600 animate-pulse">
          <div className="flex items-center gap-4 mb-6">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            <h2 className="text-2xl font-black italic tracking-tighter uppercase">AI 思维扫描中...</h2>
          </div>
          <div className="space-y-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
            <div className="flex justify-between items-center bg-white/5 p-2 border-l-2 border-green-500">
              <span className="text-green-500">01_图像笔迹结构重组</span>
              <span className="text-white/40">已完成 // COMPLETED</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-2 border-l-2 border-red-500 animate-pulse">
              <span className="text-red-500">02_认知病灶同步匹配</span>
              <span className="text-red-500">进行中 // ACTIVE_NOW</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-2 opacity-30">
              <span>03_教材铁律溯源校验</span>
              <span>队列中 // PENDING_QUEUE</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-2 opacity-30">
              <span>04_启发式反馈生成</span>
              <span>队列中 // PENDING_QUEUE</span>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-white/10">
            <p className="text-[9px] italic text-gray-400">“正在深度观摩笔迹痕迹，请稍后，第一波诊断结果即刻到达...”</p>
          </div>
        </div>
        
        {/* Skeleton Placeholders */}
        <div className="grid grid-cols-1 gap-8 opacity-20">
          <div className="h-48 bg-gray-200 border-2 border-black" />
          <div className="h-96 bg-gray-200 border-2 border-black" />
        </div>
      </div>
    );
  }

  // Split into blocks: Analysis blocks (starts with 📍), Summary Board, and Difficulty Board
  const sections = content.split(/(?=📍|📑|难度分类看板|###?\s+)/).filter(s => s.trim().length > 5);

  return (
    <div className="space-y-12 pb-20">
      {sections.map((section, idx) => {
        const isDifficultyBoard = section.includes('难度分类看板');
        const isAnalysisBlock = section.includes('📍');
        const isReport = section.includes('诊疗总结看板');

        if (isDifficultyBoard) {
          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 border-4 border-black p-6 shadow-brutal relative"
            >
              <div className="absolute -top-3 left-4 px-2 bg-white border-2 border-black text-[10px] font-bold">
                📊 难度分类
              </div>
              <div className="space-y-3">
                {section.split('\n').filter(l => l.includes('区') || l.includes('🟢') || l.includes('🟡') || l.includes('🔴')).map((line, lIdx) => (
                  <div key={lIdx} className="flex items-center gap-3 text-sm font-bold">
                    <div className={`w-2 h-6 ${line.includes('🟢') ? 'bg-green-500' : line.includes('🟡') ? 'bg-yellow-500' : 'bg-red-600'}`} />
                    {sanitizeSymbol(line.trim())}
                  </div>
                ))}
              </div>
              {section.includes('调整') && (
                <p className="mt-4 text-[10px] text-gray-500 italic border-t pt-2">
                  “同学，如果这里有你觉得分错的，请通过【思维互动区】告诉老师，老师立刻调整。”
                </p>
              )}
            </motion.div>
          );
        }

        if (isAnalysisBlock) {
          const titleMatch = section.match(/📍\s*(?:\[)?(.*?)(?:\])?\n/);
          const title = sanitizeSymbol(titleMatch ? titleMatch[1] : '错题深度诊断');
          
          const knowledgeMatch = section.match(/【考察知识点】[：:]\s*(.*)/);
          const typeMatch = section.match(/【题目类型】[：:]\s*(.*)/);
          
          const inquiry = (section.match(/🕯️[\s\S]*?(?=(?:🚩|📒|🎯|💬|$))/) || [])[0]?.replace(/🕯️\s*老师想听听你的想法[：:]?\s*/, '').replace(/[>#*]/g, '').trim() || '观摩笔迹中...';
          const reason = (section.match(/🚩[\s\S]*?(?=(?:📒|🎯|💬|$))/) || [])[0]?.replace(/🚩\s*概念盲区[：:]?\s*/, '').replace(/[>#*]/g, '').trim() || '定位病灶中...';
          const standard = (section.match(/📒[\s\S]*?(?=(?:🎯|💬|$))/) || [])[0]?.replace(/📒\s*课本铁律[：:]?\s*/, '').replace(/[>#*]/g, '').trim() || '书籍原文加载中...';
          const secret = (section.match(/🎯[\s\S]*?(?=(?:💬|$))/) || [])[0]?.replace(/🎯\s*提分必杀[：:]?\s*/, '').replace(/[>#*]/g, '').trim() || '生成标准路径...';
          const interact = (section.match(/💬[\s\S]*?$/) || [])[0]?.replace(/💬\s*【本题互动与解决空间】[：:]?\s*/, '').replace(/[>#*]/g, '').trim() || '欢迎提出你的困惑';

          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="border-2 border-black bg-white p-8 shadow-brutal relative group"
            >
              <div className="absolute -top-4 left-6 px-4 py-1 bg-black text-white text-[12px] font-black italic border-2 border-red-600 skew-x-[-10deg]">
                📍 {title}
              </div>
              
              <div className="space-y-8 pt-4">
                <div className="flex flex-wrap gap-4 border-b border-black/5 pb-4">
                  {knowledgeMatch && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">考点:</span>
                      <span className="text-xs font-black">{sanitizeSymbol(knowledgeMatch[1])}</span>
                    </div>
                  )}
                  {typeMatch && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">题型:</span>
                      <span className="text-xs font-black italic">{sanitizeSymbol(typeMatch[1])}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="p-4 bg-gray-50 border-r-4 border-black">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-3.5 h-3.5 text-black" />
                      <span className="text-[10px] font-black uppercase text-black/50">老师想听听你的想法</span>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-700 italic">“{sanitizeSymbol(inquiry)}”</p>
                  </div>

                  <div className="p-4 bg-red-50 border-l-4 border-red-600">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-3.5 h-3.5 text-red-600" />
                      <span className="text-[10px] font-black uppercase text-red-600">🚩 概念盲区</span>
                    </div>
                    <p className="text-sm leading-relaxed font-bold text-red-900">{sanitizeSymbol(reason)}</p>
                  </div>

                  <div className="bg-black text-white p-6 shadow-brutal border-2 border-red-600">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="w-4 h-4 text-red-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">📒 课本铁律 (原句引用)</span>
                    </div>
                    <div className="text-sm leading-relaxed font-serif text-gray-100 bg-white/5 p-4 border-l border-white/20 italic">
                      {sanitizeSymbol(standard)}
                    </div>
                  </div>

                  <div className="p-4 border-2 border-black bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3.5 h-3.5 text-red-600" />
                      <span className="text-[10px] font-black uppercase">🎯 提分必杀 (规范解法)</span>
                    </div>
                    <div className="text-sm font-mono text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {sanitizeSymbol(secret)}
                    </div>
                  </div>

                  <div className="p-4 border-t border-black/5 pt-6 group-hover:border-black/20 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-3 h-3 text-red-500" />
                      <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">💬 【互动解决空间】</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed max-w-lg">
                      {sanitizeSymbol(interact)}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        }

        if (isReport) {
          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-black text-white p-10 border-4 border-red-600 shadow-brutal relative overflow-hidden"
            >
              <h2 className="text-4xl font-black italic tracking-tighter mb-10 flex items-center gap-4">
                <LayoutDashboard className="w-10 h-10 text-red-600" />
                📑 诊疗总结看板
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">核心病灶汇总</p>
                    <div className="text-sm leading-loose opacity-80 whitespace-pre-wrap border-l-2 border-white/20 pl-4">
                      {sanitizeSymbol(section.match(/核心病灶汇总[：:]\s*([\s\S]*?)(?=薄弱模块定位|$)/)?.[1] || '全盘扫描完成。')}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">薄弱模块定位</p>
                    <p className="text-lg font-black tracking-tight border-l-2 border-red-600 pl-4 italic">
                      {sanitizeSymbol(section.match(/薄弱模块定位[：:]\s*([\s\S]*?)(?=未来解决路径|$)/)?.[1] || '系统性扫描。')}
                    </p>
                  </div>
                </div>
                <div className="space-y-6 bg-white/5 p-6 border-2 border-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white">未来解决路径 // PATHWAY</p>
                  <div className="space-y-4">
                    {section.includes('Step') ? (
                      section.match(/Step\s*\d+[：:]\s*([\s\S]*?)(?=Step|$)/g)?.map((step, sIdx) => (
                        <div key={sIdx} className="flex gap-4">
                          <span className="font-mono text-red-500 font-bold">0{sIdx + 1}_</span>
                          <p className="text-xs leading-relaxed opacity-70">{sanitizeSymbol(step.replace(/Step\s*\d+[：:]\s*/, ''))}</p>
                        </div>
                      ))
                    ) : (
                      <div className="markdown-body text-xs opacity-70">
                        <Markdown>{sanitizeSymbol(section.substring(section.indexOf('未来解决路径')))}</Markdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                <p className="text-[10px] font-mono opacity-40">以上是全卷诊断。现在可以向老师提问了。</p>
                <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
              </div>
            </motion.div>
          );
        }

        // Generic Fallback for unparsed markdown sections
        return (
          <motion.div 
            key={idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="prose prose-sm max-w-none border-l-2 border-gray-100 pl-6 py-4"
          >
            <div className="markdown-body">
              <Markdown>{sanitizeSymbol(section)}</Markdown>
            </div>
          </motion.div>
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
              let styleClass = "font-bold";
              if (i === 2) styleClass = "italic text-gray-500 text-[10px]";
              
              return `
                <td class="${styleClass} ${i === 1 && sanitizedCell.includes('病灶') ? 'text-red-600' : ''}">
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
