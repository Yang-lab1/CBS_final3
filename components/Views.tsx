
import React, { useState, useEffect, useRef } from 'react';
import { T, LIFE_EVENTS, DRINK_DATA, MOOD_TRANSLATIONS, TEAM_MEMBERS, RESEARCH_OVERVIEW, RESEARCH_RESULTS, DATA_SOURCES } from '../constants';
import { Lang } from '../types';
import { generateResponse } from '../services/geminiService';

declare global {
  interface Window {
    vis: any;
    marked: any;
  }
}

interface ViewProps {
    onBack: () => void;
    lang: Lang;
}

const FALLBACK_NET_DATA = [
    { name: "杜甫", rel: "好友" },
    { name: "孟浩然", rel: "好友" },
    { name: "高适", rel: "好友" },
    { name: "贺知章", rel: "赏识" },
    { name: "汪伦", rel: "好友" },
    { name: "杨贵妃", rel: "宫廷关联" },
    { name: "玄宗", rel: "君臣" },
    { name: "王昌龄", rel: "好友" },
    { name: "元丹丘", rel: "道友" }
];

export const NetworkPage: React.FC<ViewProps> = ({ onBack, lang }) => {
    const [network, setNetwork] = useState<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportContent, setReportContent] = useState<string>("");
    const [nodesDataSet, setNodesDataSet] = useState<any>(null);
    const [edgesDataSet, setEdgesDataSet] = useState<any>(null);
    const [analyzed, setAnalyzed] = useState(false);

    useEffect(() => {
        if (window.vis) {
            const nodes = new window.vis.DataSet();
            const edges = new window.vis.DataSet();
            setNodesDataSet(nodes);
            setEdgesDataSet(edges);

            // Initial Li Bai node
            nodes.add({
                id: "0000", label: "李白",
                color: "#f1c40f", size: 40,
                title: "诗仙", font: { size: 20 }
            });
        }
    }, []);

    useEffect(() => {
        if (containerRef.current && nodesDataSet && edgesDataSet && !network) {
            const data = { nodes: nodesDataSet, edges: edgesDataSet };
            const options = {
                nodes: { shape: "dot", font: { color: "#333", face: 'Inter' }, borderWidth: 2 },
                physics: {
                    forceAtlas2Based: { gravitationalConstant: -60, springLength: 100 },
                    minVelocity: 0.75,
                    solver: "forceAtlas2Based"
                },
                interaction: { hover: true }
            };
            const net = new window.vis.Network(containerRef.current, data, options);
            setNetwork(net);

            net.on("click", (params: any) => {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    if (nodeId === "0000") return;
                    const nodeData = nodesDataSet.get(nodeId);
                    generateReport(nodeData.label);
                }
            });
        }
    }, [nodesDataSet, edgesDataSet, network]);

    const startProcess = async () => {
        setLoading(true);
        setReportContent("");
        
        try {
            // 1. Data Prep (Fallback mostly due to CORS on CBDB)
            const personList = FALLBACK_NET_DATA.map((d, index) => ({ ...d, id: "fb_" + index }));

            // 2. AI Analysis
            const resString = await generateResponse('network_batch', { personList }, lang);
            let aiResults: any = {};
            try {
                aiResults = JSON.parse(resString);
            } catch (e) {
                console.error("Failed to parse AI JSON", e);
                // Simple Fallback if JSON fails
                personList.forEach(p => aiResults[p.name] = { color: "#bdc3c7", location: "Unknown", mood: "Neutral" });
            }

            // 3. Update Graph
            if (nodesDataSet && edgesDataSet) {
                nodesDataSet.clear();
                edgesDataSet.clear();

                nodesDataSet.add({
                    id: "0000", label: lang === 'zh' ? "李白" : "Li Bai",
                    color: "#f1c40f", size: 45,
                    title: lang === 'zh' ? "诗仙" : "The Poet Immortal", font: { size: 20, face: 'Noto Serif SC' }
                });

                personList.forEach(p => {
                    const meta = aiResults[p.name] || { color: "#bdc3c7", location: "?", mood: "?" };
                    const hoverText = `${p.name}\n📍 ${meta.location}\n❤️ ${meta.mood}`;

                    nodesDataSet.add({
                        id: p.id,
                        label: p.name,
                        color: meta.color,
                        size: 25,
                        title: hoverText
                    });

                    edgesDataSet.add({
                        from: "0000",
                        to: p.id,
                        color: { color: meta.color, opacity: 0.6 },
                        width: 3
                    });
                });
                
                if (network) network.fit();
                setAnalyzed(true);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const generateReport = async (name: string) => {
        setReportLoading(true);
        setReportContent("");
        const res = await generateResponse('network_report', { name }, lang);
        setReportContent(res);
        setReportLoading(false);
    };

    return (
        <div className="min-h-screen bg-stone-50 text-gray-800 font-serif animate-fade-in flex flex-col">
            {/* Header */}
            <div className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-200 z-50 px-6 py-4 flex justify-between items-center shadow-sm">
                <h2 className="text-xl md:text-2xl font-bold tracking-wider">{T['network.title'][lang]}</h2>
                <button onClick={onBack} className="px-5 py-2 rounded-full bg-gray-100 border border-gray-300 text-sm hover:bg-gray-200 transition-colors font-medium">
                    ✕ {T['life.back'][lang]}
                </button>
            </div>

            <div className="flex-1 pt-24 pb-8 px-4 md:px-8 max-w-7xl mx-auto w-full flex flex-col h-screen">
                
                {/* Controls & Legend */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between animate-fade-up">
                    <button 
                        onClick={startProcess} 
                        disabled={loading}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg shadow hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {loading ? <span className="animate-spin">⌛</span> : <span>🤖</span>}
                        {lang === 'zh' ? '构建 GIS-NLP 图谱' : 'Build GIS-NLP Graph'}
                    </button>

                    <div className="flex flex-wrap gap-4 text-xs md:text-sm font-sans text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#e74c3c] shadow-sm"></span><span>{lang === 'zh' ? '政治抱负 (长安)' : 'Political Ambition'}</span></div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#2c3e50] shadow-sm"></span><span>{lang === 'zh' ? '悲愤流放 (夜郎)' : 'Exile/Grief'}</span></div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#27ae60] shadow-sm"></span><span>{lang === 'zh' ? '山水漫游 (江南)' : 'Nature/Leisure'}</span></div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#bdc3c7] shadow-sm"></span><span>{lang === 'zh' ? '其他' : 'Other'}</span></div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
                    
                    {/* Left: Graph */}
                    <div className="flex-2 md:w-2/3 bg-white rounded-2xl shadow-xl border border-gray-100 relative overflow-hidden animate-fade-up" style={{ animationDelay: '0.1s' }}>
                        <div className="absolute top-4 left-4 z-10 bg-white/90 px-3 py-1 rounded text-xs font-bold text-gray-500 shadow-sm">
                            Vis.js Network
                        </div>
                        <div ref={containerRef} className="w-full h-full bg-[#fdfbf7]" />
                        {!analyzed && !loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/60 pointer-events-none">
                                <p className="text-gray-400 font-medium">{lang === 'zh' ? '点击上方按钮生成图谱' : 'Click button to generate graph'}</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Report Panel */}
                    <div className="flex-1 md:w-1/3 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 overflow-y-auto custom-scrollbar flex flex-col animate-fade-up" style={{ animationDelay: '0.2s' }}>
                        <h3 className="text-lg font-bold border-b border-gray-100 pb-3 mb-4 text-gray-800 flex items-center gap-2">
                            <span>📋</span> {lang === 'zh' ? 'AI 深度分析报告' : 'AI Deep Analysis'}
                        </h3>
                        
                        {reportLoading && (
                            <div className="flex-1 flex flex-col items-center justify-center text-blue-500 gap-3">
                                <div className="animate-spin text-2xl">🌀</div>
                                <p className="text-sm font-medium animate-pulse">{lang === 'zh' ? 'AI 正在阅读《李白全集》挖掘数据中...' : 'AI is analyzing Li Bai\'s works...'}</p>
                            </div>
                        )}

                        {!reportLoading && !reportContent && (
                             <div className="flex-1 flex flex-col items-center justify-center text-gray-300 text-center p-4">
                                <div className="text-4xl mb-2">👈</div>
                                <p className="text-sm">{lang === 'zh' ? '点击左侧人物节点生成【GIS空间定位】与【NLP情感分析】报告' : 'Click a node on the left to generate GIS & NLP report'}</p>
                            </div>
                        )}

                        {reportContent && (
                            <div className="prose prose-stone prose-sm max-w-none font-serif leading-relaxed text-gray-700">
                                <div dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(reportContent) : reportContent }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const DrinkPage: React.FC<ViewProps> = ({ onBack, lang }) => {
    const [mood, setMood] = useState("豪情万丈");
    const [zoom, setZoom] = useState(false);
    const data = DRINK_DATA[mood];

    return (
        <div className="min-h-screen bg-paper-texture font-serif animate-fade-in flex flex-col">
            {zoom && (
                <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center cursor-zoom-out p-6" onClick={() => setZoom(false)}>
                    <img src={data.img} className="max-w-full max-h-full rounded shadow-2xl animate-slow-zoom" alt="Scene" />
                </div>
            )}
            <div className="fixed top-0 w-full bg-white/80 backdrop-blur z-20 px-6 py-4 flex justify-between border-b border-gray-200">
                <h2 className="text-xl font-bold">{T['drink.title'][lang]}</h2>
                <button onClick={onBack} className="px-4 border rounded-full hover:bg-gray-50">{T['drink.back'][lang]}</button>
            </div>
            <div className="flex-1 pt-24 pb-12 px-6 flex flex-col md:flex-row gap-8 max-w-6xl mx-auto w-full">
                <div className="w-full md:w-1/3 space-y-3">
                    <h3 className="font-bold text-gray-500 mb-4">{T['drink.prompt'][lang]}</h3>
                    {Object.keys(DRINK_DATA).map(k => (
                        <button key={k} onClick={() => setMood(k)} className={`w-full p-4 rounded-xl border text-left flex justify-between transition-all ${mood === k ? 'bg-gray-900 text-white shadow-lg scale-105' : 'bg-white hover:bg-gray-50'}`}>
                            <span className="font-bold">
                                {lang === 'zh' ? k : MOOD_TRANSLATIONS[k]}
                            </span>
                            {mood === k && '🍶'}
                        </button>
                    ))}
                </div>
                <div className="w-full md:w-2/3 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
                    <div className="h-80 md:h-96 overflow-hidden cursor-zoom-in relative group" onClick={() => setZoom(true)}>
                        <img src={data.img} className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110" alt="Mood" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                            <h2 className="text-white text-4xl font-bold tracking-widest">{lang === 'zh' ? mood : MOOD_TRANSLATIONS[mood]}</h2>
                        </div>
                    </div>
                    <div className="flex-1 p-10 flex flex-col items-center justify-center text-center bg-[#fffdfa]">
                        <h3 className="text-3xl font-calligraphy mb-4 leading-relaxed">{data.poem}</h3>
                        <p className="text-sm text-gray-400 uppercase tracking-widest mt-4 border-t pt-4">—— {data.desc}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const LifePage: React.FC<ViewProps> = ({ onBack, lang }) => {
    return (
        <div className="min-h-screen bg-stone-50 text-gray-800 font-serif animate-fade-in">
            <div className="fixed top-0 left-0 w-full bg-stone-50/90 backdrop-blur-md border-b border-stone-200 z-20 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 tracking-widest">{T['life.title'][lang]}</h2>
                <button onClick={onBack} className="px-4 py-2 rounded-full bg-white border border-gray-300 text-sm hover:bg-gray-100 transition-colors">✕ {T['life.back'][lang]}</button>
            </div>
            <div className="max-w-4xl mx-auto pt-24 pb-20 px-6">
                <div className="relative border-l-2 border-stone-300 ml-6 md:ml-12 space-y-16">
                    {LIFE_EVENTS.map((e, i) => (
                        <div key={i} className="relative pl-8 md:pl-16 group">
                            <div className="absolute -left-[9px] top-0 w-5 h-5 rounded-full bg-stone-100 border-4 border-gray-400 group-hover:border-blue-600 group-hover:scale-125 transition-all duration-300"></div>
                            <div className="absolute -left-16 md:-left-24 top-0 text-right w-12 md:w-20">
                                <span className="text-lg md:text-xl font-bold text-gray-400 group-hover:text-blue-600 transition-colors font-sans">{e.y}</span>
                            </div>
                            <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-stone-200 hover:shadow-lg transition-shadow duration-300">
                                <h3 className="text-2xl font-bold mb-3 text-gray-900">{lang === 'zh' ? e.t.zh : e.t.en}</h3>
                                <p className="text-lg text-gray-600 leading-relaxed">{lang === 'zh' ? e.d.zh : e.d.en}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const ResultPage: React.FC<ViewProps & { type: string; data: string }> = ({ type, data, onBack, lang }) => {
    if (type === 'three_ages') {
        let parts = data.split('|||');
        if (parts.length < 3) {
            const fallbackText = "（...）";
            parts = [data, fallbackText, fallbackText];
        }
        const cards = [
            { title: lang === 'zh' ? "青年期" : "Youth", age: lang === 'zh' ? "二十岁 · 仗剑去国" : "Age 20 · Wandering", text: parts[0], theme: "text-teal-800", bg: "bg-teal-50/80", border: "border-teal-800", char: "狂", delay: "0s" },
            { title: lang === 'zh' ? "中年期" : "Mid-Age", age: lang === 'zh' ? "四十岁 · 供奉翰林" : "Age 40 · Imperial Scholar", text: parts[1], theme: "text-amber-800", bg: "bg-amber-50/80", border: "border-amber-800", char: "傲", delay: "0.2s" },
            { title: lang === 'zh' ? "老年期" : "Old Age", age: lang === 'zh' ? "六十岁 · 临终绝笔" : "Age 60 · Final Verse", text: parts[2], theme: "text-slate-800", bg: "bg-slate-50/80", border: "border-slate-800", char: "仙", delay: "0.4s" }
        ];
        return (
            <div className="min-h-screen bg-paper-texture py-12 px-4 md:px-8 relative overflow-hidden font-serif">
                <div className="max-w-7xl mx-auto mb-16 flex justify-between items-center relative z-10 animate-fade-up">
                    <div>
                        <div className="text-sm text-gray-500 mb-2 uppercase tracking-widest font-sans">Time Travel Q&A</div>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{lang === 'zh' ? "三时期的回应" : "Response from Three Ages"}</h2>
                    </div>
                    <button onClick={onBack} className="group px-6 py-2 rounded-full bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                        <span className="text-gray-500 group-hover:text-gray-900">✕</span>
                        <span className="font-sans text-sm text-gray-600 group-hover:text-gray-900">{T['drink.back'][lang]}</span>
                    </button>
                </div>
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 pb-20">
                    {cards.map((card, index) => (
                        <div key={index} className={`relative group ink-shadow rounded-xl overflow-hidden animate-fade-up`} style={{ animationDelay: card.delay }}>
                            <div className={`absolute -right-4 -bottom-8 text-[10rem] font-calligraphy opacity-5 select-none transition-transform group-hover:scale-110 duration-700 ${card.theme}`}>{card.char}</div>
                            <div className={`h-full flex flex-col ${card.bg} border-t-4 ${card.border} p-8 transition-colors duration-500`}>
                                <div className="border-b border-gray-200/50 pb-6 mb-6 flex justify-between items-start"><div className="writing-vertical h-24 text-2xl font-bold font-calligraphy tracking-widest opacity-80">{card.title}</div><div className="text-right"><div className="text-xs uppercase tracking-widest opacity-50 font-sans mb-1">Age Period</div><div className="text-sm font-bold opacity-80">{card.age}</div></div></div>
                                <div className="flex-1"><p className="text-lg leading-loose text-gray-800 text-justify relative"><span className="text-4xl float-left mr-2 mt-[-10px] font-calligraphy opacity-30">“</span>{card.text}</p></div>
                                <div className="mt-8 pt-4 border-t border-gray-200/30 flex items-center justify-between opacity-40 text-xs"><span>Tang Dynasty</span><div className="h-px w-12 bg-current"></div></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-paper-texture flex items-center justify-center p-4 font-serif">
            <div className="bg-white p-10 rounded-2xl shadow-xl max-w-3xl w-full relative border border-gray-100 animate-fade-up">
                <button onClick={onBack} className="absolute top-6 right-6 text-gray-400 hover:text-black">✕</button>
                <div className="flex gap-4 mb-6 border-b pb-4"><div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden"><img src="https://picx.zhimg.com/80/v2-7228406e00cce3ede863a49268a98993_720w.webp?source=2c26e567" className="w-full h-full object-cover" alt="Li Bai" /></div><div><h2 className="text-xl font-bold">{T['search.btn'][lang]}</h2><p className="text-xs text-gray-500">Gemini AI Assistant</p></div></div>
                <div className="prose max-w-none leading-loose whitespace-pre-wrap text-gray-700">{data}</div>
            </div>
        </div>
    );
};

export const AboutPage: React.FC<ViewProps> = ({ onBack, lang }) => {
    const [imgError, setImgError] = useState<Record<number, boolean>>({});

    const getAvatarSrc = (member: any, index: number) => {
        if (imgError[index]) {
            return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(member.name.en)}`;
        }
        return member.avatar;
    };

    return (
        <div className="min-h-screen bg-stone-50 font-sans animate-fade-in flex flex-col text-gray-900">
            <div className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-200 z-50 px-6 py-4 flex justify-between items-center shadow-sm">
                <h2 className="text-xl md:text-2xl font-bold tracking-wider">{T['about.title'][lang]}</h2>
                <button onClick={onBack} className="px-5 py-2 rounded-full bg-gray-100 border border-gray-300 text-sm hover:bg-gray-200 transition-colors font-medium">
                    ✕ {T['drink.back'][lang]}
                </button>
            </div>

            <div className="flex-1 pt-24 pb-20 px-6 overflow-y-auto custom-scrollbar">
                <div className="max-w-6xl mx-auto space-y-20">
                    
                    <section className="animate-fade-up">
                        <div className="mb-12">
                            <h3 className="text-3xl font-bold mb-2">{T['about.team'][lang]}</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
                            {TEAM_MEMBERS.map((member, index) => (
                                <div key={index} className="flex flex-col text-left group">
                                    <div className="w-full aspect-square mb-4 overflow-hidden rounded-md bg-gray-100 relative">
                                        <img 
                                            src={getAvatarSrc(member, index)}
                                            alt={lang === 'zh' ? member.name.zh : member.name.en}
                                            onError={() => setImgError(prev => ({...prev, [index]: true}))}
                                            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" 
                                        />
                                    </div>
                                    <h4 className="text-lg font-bold text-blue-600 mb-1">{lang === 'zh' ? member.name.zh : member.name.en}</h4>
                                    <p className="text-sm text-gray-800 mb-3 leading-tight font-medium">{lang === 'zh' ? member.title.zh : member.title.en}</p>
                                    
                                    <div className="text-xs text-gray-500 space-y-2 font-mono">
                                        <a href={`mailto:${member.email}`} className="block break-all hover:text-gray-800 cursor-pointer transition-colors flex items-center gap-1">
                                           ✉️ {member.email}
                                        </a>
                                        <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="block break-all hover:text-blue-600 cursor-pointer transition-colors flex items-center gap-1">
                                           🔗 {member.linkedin.replace(/^https?:\/\//, '')}
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
                        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-gray-100 w-full mb-8">
                            <h3 className="text-2xl font-bold mb-6 text-gray-900">{T['about.research'][lang]}</h3>
                            <p className="leading-loose text-lg text-gray-700 text-justify">
                                {lang === 'zh' ? RESEARCH_OVERVIEW.zh : RESEARCH_OVERVIEW.en}
                            </p>
                        </div>
                        
                        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-gray-100 w-full mb-8">
                            <h3 className="text-2xl font-bold mb-6 text-gray-900">{T['about.results'][lang]}</h3>
                            <p className="leading-loose text-lg text-gray-700 text-justify">
                                {lang === 'zh' ? RESEARCH_RESULTS.zh : RESEARCH_RESULTS.en}
                            </p>
                        </div>
                        
                        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-gray-100 w-full">
                            <h3 className="text-2xl font-bold mb-6 text-gray-900">{T['about.sources'][lang]}</h3>
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                <p className="leading-loose text-lg text-gray-700 text-justify whitespace-pre-line break-words">
                                    {lang === 'zh' ? DATA_SOURCES.zh : DATA_SOURCES.en}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
                        <div className="text-center mb-10">
                            <h3 className="text-3xl font-bold mb-2">{T['about.data'][lang]}</h3>
                            <div className="w-16 h-1 bg-emerald-600 mx-auto rounded-full"></div>
                        </div>
                        <div className="flex justify-center">
                            <a href="https://github.com/1849083010n-cell/libaifinal.github.io" target="_blank" rel="noopener noreferrer" className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-gray-900 font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 hover:bg-gray-800 hover:scale-105 shadow-xl">
                                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                </svg>
                                {T['about.download_btn'][lang]}
                            </a>
                        </div>
                        <div className="text-center mt-4 text-gray-500 text-sm">
                            v1.0.0 • JSON Format • CC BY-NC-SA 4.0
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
