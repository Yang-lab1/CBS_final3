
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { T, JOURNEY_DATA, EMOTION_MAP_DATA, ANALYTICS_DATA_FULL, TOTAL_ANALYTICS_VALUE, PERIODS, POEM_DATABASE } from '../constants';
import { Lang } from '../types';
import { generateResponse } from '../services/geminiService';

declare global {
  interface Window {
    L: any;
    ChartDataLabels: any;
  }
}

interface MapProps {
    viewType?: string;
    onBack: () => void;
    lang: Lang;
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Hide label if slice is too small to fit text comfortably
    if (percent < 0.05) return null;

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
            {name}
        </text>
    );
};

export const EmotionMapPage: React.FC<MapProps> = ({ viewType, onBack, lang }) => {
    const [activeEmotion, setActiveEmotion] = useState('joy');
    const [activePeriod, setActivePeriod] = useState('all');
    const mapInstanceRef = useRef<any>(null);
    const heatLayerRef = useRef<any>(null);

    const [sY, setSY] = useState(''); 
    const [sL, setSL] = useState(''); 
    const [sM, setSM] = useState(''); 
    const [sT, setST] = useState('');
    const [aiRes, setAiRes] = useState<string | null>(null); 
    const [aiLoading, setAiLoading] = useState(false);

    const listYears = useMemo(() => [...new Set(POEM_DATABASE.map(i => i.y))].sort(), []);
    const listLocs = useMemo(() => sY ? [...new Set(POEM_DATABASE.filter(i => i.y === Number(sY)).map(i => i.l))] : [], [sY]);
    const listMoods = useMemo(() => sL ? [...new Set(POEM_DATABASE.filter(i => i.y === Number(sY) && i.l === sL).map(i => i.m))] : [], [sY, sL]);
    const listTitles = useMemo(() => sM ? [...new Set(POEM_DATABASE.filter(i => i.y === Number(sY) && i.l === sL && i.m === sM).map(i => i.t))] : [], [sY, sL, sM]);

    const handleAnalyze = async () => {
        setAiLoading(true);
        const res = await generateResponse('analysis', { y: sY, l: sL, m: sM, t: sT }, lang);
        setAiRes(res);
        setAiLoading(false);
    };

    useEffect(() => {
        if (viewType !== 'map') return;
        const timer = setTimeout(() => {
            if (!mapInstanceRef.current && window.L && document.getElementById('em-map')) {
                const m = window.L.map('em-map', { center: [33.0, 110.0], zoom: 5, zoomControl: false, attributionControl: false });
                window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(m);
                mapInstanceRef.current = m;
            }
            if (mapInstanceRef.current) {
                const m = mapInstanceRef.current;
                if (heatLayerRef.current) heatLayerRef.current.remove();
                const category = EMOTION_MAP_DATA[activeEmotion];
                const pts = category.points.filter(p => activePeriod === 'all' || p.period === activePeriod).map(p => [p.lat, p.lng, p.intensity]);

                let gradient: Record<number, string> = { 0.3: 'blue', 0.5: 'lime', 0.7: 'yellow', 1.0: 'red' };
                if (category.color === 'orange') gradient = { 0.2: '#fbbf24', 0.6: '#f59e0b', 1: '#b45309' };
                if (category.color === 'red') gradient = { 0.2: '#f87171', 0.6: '#dc2626', 1: '#991b1b' };
                if (category.color === 'grey') gradient = { 0.2: '#9ca3af', 0.6: '#4b5563', 1: '#111827' };
                if (category.color === 'purple') gradient = { 0.2: '#a78bfa', 0.6: '#7c3aed', 1: '#4c1d95' };
                if (category.color === 'green') gradient = { 0.2: '#34d399', 0.6: '#059669', 1: '#064e3b' };

                if (window.L.heatLayer) heatLayerRef.current = window.L.heatLayer(pts, { radius: 50, blur: 30, max: 2.0, minOpacity: 0.65, gradient }).addTo(m);
            }
        }, 50);
        return () => { clearTimeout(timer); if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
    }, [viewType, activeEmotion, activePeriod]);

    const pieData = ANALYTICS_DATA_FULL.map(i => ({
        name: lang === 'zh' ? i.name : i.enName,
        value: i.value,
        color: i.color
    }));

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none flex flex-col md:flex-row justify-between p-4 md:p-6 gap-4">
                {viewType === 'map' ? (
                    <div className="pointer-events-auto bg-white/95 backdrop-blur shadow-xl rounded-2xl p-5 border border-gray-200 max-w-md w-full flex flex-col gap-5">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 font-serif">{T['emotion.title'][lang]}</h2>
                            <p className="text-xs text-gray-500 mt-1">{T['emotion.subtitle'][lang]}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{T['emotion.period'][lang]}</label>
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                {PERIODS.map(p => (
                                    <button key={p.id} onClick={() => setActivePeriod(p.id)} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activePeriod === p.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{p.label[lang]}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{T['emotion.core'][lang]}</label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(EMOTION_MAP_DATA).map(([key, { label, enLabel, color }]) => (
                                    <button key={key} onClick={() => setActiveEmotion(key)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${activeEmotion === key ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                                        <span className="w-3 h-3 rounded-full shadow-sm border border-white/20" style={{ backgroundColor: color === 'grey' ? '#374151' : color }}></span>
                                        {lang === 'zh' ? label : enLabel}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : <div></div>}
                <button onClick={onBack} className="pointer-events-auto h-10 px-4 rounded-full bg-white shadow-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium">✕ {T['emotion.exit'][lang]}</button>
            </div>

            {viewType === 'map' && <div id="em-map" className="w-full h-full relative z-0 bg-stone-50"></div>}

            {viewType === 'stats' && (
                <div className="flex-1 relative bg-stone-50 overflow-y-auto custom-scrollbar pt-20 px-6 pb-20">
                    <div className="max-w-6xl mx-auto space-y-12">
                        <div className="text-center mb-8"><h2 className="text-3xl font-bold font-serif text-gray-800">{T['emotion.stats_title'][lang]}</h2></div>

                        <div className="grid md:grid-cols-2 gap-12 items-stretch">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col items-center justify-between">
                                <h3 className="text-lg font-bold mb-6 text-gray-800 w-full text-left border-l-4 border-blue-800 pl-3">{T['emotion.fav_words'][lang]}</h3>
                                <div className="w-full h-72 relative flex justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                dataKey="value"
                                                startAngle={90}
                                                endAngle={-270}
                                                labelLine={false}
                                                label={renderCustomizedLabel}
                                                stroke="none"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full mt-6 flex h-5 rounded-full overflow-hidden">
                                    {ANALYTICS_DATA_FULL.map((item, i) => {
                                        const percent = Math.round((item.value / TOTAL_ANALYTICS_VALUE) * 100);
                                        return (
                                            <div key={i} className="h-full flex items-center justify-center text-[10px] text-white/90 font-bold" style={{ width: `${percent}%`, background: item.color }} title={`${lang === 'zh' ? item.name : item.enName} ${percent}%`}>
                                                {percent > 5 ? `${percent}%` : ''}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col">
                                <h3 className="text-lg font-bold mb-6 text-gray-800 border-l-4 border-blue-800 pl-3">{T['emotion.dist'][lang]}</h3>
                                <div className="space-y-5 flex-1">
                                    {ANALYTICS_DATA_FULL.map((item, idx) => (
                                        <div key={idx} className="group">
                                            <div className="flex justify-between text-sm mb-2 font-bold text-gray-700">
                                                <span>{lang === 'zh' ? item.name : item.enName}</span>
                                                <span>{lang === 'zh' ? item.emotion : item.enEmotion}</span>
                                            </div>
                                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden relative" title={`${item.value} (${Math.round((item.value / TOTAL_ANALYTICS_VALUE) * 100)}%)`}>
                                                <div className="h-full rounded-full transition-all duration-700 hover:opacity-80 cursor-help" style={{ width: `${(item.value / 120) * 100}%`, backgroundColor: item.color }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden p-8">
                            <div className="flex items-center gap-2 mb-6 border-b pb-4"><span className="text-2xl">🧠</span><h3 className="font-bold text-gray-800">{T['emotion.ai_title'][lang]}</h3></div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <select className="p-3 rounded-xl border" value={sY} onChange={e => setSY(e.target.value)}><option value="">{T['emotion.select_year'][lang]}</option>{listYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
                                <select className="p-3 rounded-xl border" value={sL} onChange={e => setSL(e.target.value)} disabled={!sY}><option value="">{T['emotion.select_loc'][lang]}</option>{listLocs.map(l => <option key={l} value={l}>{l}</option>)}</select>
                                <select className="p-3 rounded-xl border" value={sM} onChange={e => setSM(e.target.value)} disabled={!sL}><option value="">{T['emotion.select_mood'][lang]}</option>{listMoods.map(m => <option key={m} value={m}>{m}</option>)}</select>
                                <select className="p-3 rounded-xl border" value={sT} onChange={e => setST(e.target.value)} disabled={!sM}><option value="">{T['emotion.select_poem'][lang]}</option>{listTitles.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            <button onClick={handleAnalyze} disabled={!sT || aiLoading} className="w-full py-4 bg-gradient-to-r from-blue-800 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50">{aiLoading ? T['emotion.analyzing'][lang] : T['emotion.btn_analyze'][lang]}</button>
                            {aiRes && <div className="mt-8 p-8 bg-[#fdfbf7] rounded-xl border border-stone-200 whitespace-pre-wrap leading-loose font-serif">{aiRes}</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const BaseMap = ({ onL }: { onL: (map: any) => void }) => {
    const r = useRef<any>(null);
    useEffect(() => {
        if (!r.current && window.L) {
            const m = window.L.map('b-m', { center: [33, 110], zoom: 5, zoomControl: false });
            window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(m);
            r.current = m;
            if (onL) onL(m);
        }
    }, [onL]);
    return <div id="b-m" className="w-full h-full" />;
};

export const FootprintPage: React.FC<MapProps> = ({ onBack, lang }) => {
    const [m, sM] = useState<any>(null);
    const [p, sP] = useState(701);
    const lRef = useRef<any>({});

    const markerSvg = `
    <svg class="icon" viewBox="0 0 1024 1024" width="64" height="64" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
        <path d="M949.1 501.1c0 35.4-4.2 69.8-12.1 102.8-5.7 23.9-13.6 47.2-23.1 69.4-0.5 1.2-0.9 2.3-1.5 3.3-4.3 9.8-9 19.4-14 28.9-45.2 85.4-117.9 154-206.2 194.1-1.3 0.6-2.6 1.2-4 1.8-53.6 23.6-113 36.8-175.2 36.8-118.9 0-226.7-47.7-305.4-125.2-6.5-6.4-12.7-12.9-18.8-19.6-0.7-0.8-1.5-1.6-2.1-2.4-41.9-47.5-73.7-104-92-166.5-11.4-39.1-17.6-80.5-17.6-123.4 0-27.5 2.5-54.4 7.4-80.4 12.2-65.7 39-126.2 77-178 28.5-39 63.4-73 103-100.6 56.8-39.6 123.6-66.1 195.9-74.8 4.8-0.6 9.6-1 14.4-1.5 12.6-1.2 25.5-1.7 38.5-1.7 80.8 0 156.6 22.1 221.4 60.4 50.7 30 94.8 70.1 129.6 117.3 22.4 30.4 40.9 63.8 54.9 99.5 2 5 3.9 10.2 5.7 15.4 15.7 45.2 24.2 93.8 24.2 144.4z" fill="#FFFFFF" opacity=".4"></path>
        <path d="M893.8 495.6c0 31-3.6 61-10.6 89.8-5 20.9-11.8 41.2-20.1 60.6-0.5 1-0.8 2-1.3 2.9-3.7 8.6-7.8 17-12.2 25.2-39.4 74.6-102.9 134.5-180 169.5-1.1 0.5-2.3 1-3.5 1.6-46.8 20.6-98.6 32.1-153 32.1-103.8 0-197.9-41.6-266.6-109.3-5.6-5.6-11.1-11.2-16.4-17.1-0.6-0.7-1.3-1.4-1.8-2.1-36.6-41.5-64.4-90.9-80.3-145.4-10.1-34.2-15.5-70.4-15.5-107.8 0-24 2.2-47.5 6.5-70.2 10.7-57.3 34.1-110.2 67.2-155.4 24.9-34.1 55.4-63.7 89.9-87.8 49.6-34.6 107.9-57.7 171-65.3 4.2-0.5 8.4-0.9 12.6-1.3 11-1 22.2-1.5 33.6-1.5 70.6 0 136.7 19.3 193.3 52.8 44.3 26.2 82.8 61.2 113.1 102.5 19.6 26.6 35.7 55.7 47.9 86.9 1.7 4.4 3.4 8.9 5 13.4 13.7 39.2 21.2 81.7 21.2 125.9z" fill="#FFFFFF"></path>
        <path d="M282.7 368.668c-3.9-1.5-8.6-0.1-11 3.5l-2.3 5.4-15.9 37.4-11 25.9-19.1 44.8 16.5 7 6.6-15.3 15.1-35.5c-2.7-0.9-4.9-2.9-6.2-5.4-1-2.1-1.4-4.4-0.7-6.9 1.1-4.8 5.5-8.1 10.2-8.1 0.8 0 1.6 0.1 2.4 0.3l2.6 0.6 6.6-15.4 9.7-22.8 2.2-5.2c0.9-4.2-1.5-8.6-5.7-10.3z" fill="#1F0D60"></path>
        <path d="M240 492.768c-4.1 4.5-8.1 9-12.2 13.4-3.1 3.4-6.3 6.9-9.4 10.3 0.7-4.5 1.5-9 2.2-13.4 0.9-5.8 1.9-11.5 2.8-17.3 2.6-0.9 5-1.8 7.6-2.6 0.2 1.5 0.4 3.1 0.5 4.6 1.9-2.7 3.7-5.4 5.7-8.2 1 4.4 1.9 8.8 2.8 13.2z" fill="#D5E0EA"></path>
        <path d="M288.3 379.068l-2.2 5.1-16.6-6.6 2.3-5.4c2.4-3.6 7-5.1 11-3.5 4.1 1.6 6.5 6 5.5 10.4z" fill="#F714FF"></path>
        <path d="M286.1 385.368c-0.1 0-0.2 0-0.4-0.1l-16.6-6.7c-0.5-0.2-0.7-0.7-0.5-1.2 0.2-0.5 0.7-0.7 1.2-0.6l16.6 6.7c0.5 0.2 0.7 0.7 0.5 1.2-0.2 0.5-0.4 0.7-0.8 0.7zM284.6 389.068c-0.1 0-0.2 0-0.4-0.1l-16.6-6.7c-0.5-0.2-0.7-0.7-0.5-1.2 0.2-0.5 0.7-0.7 1.2-0.6l16.6 6.7c0.5 0.2 0.7 0.7 0.5 1.2 0 0.5-0.4 0.7-0.8 0.7z" fill="#D5E0EA"></path>
        <path d="M227.8 506.268c-3.1 3.4-6.3 6.8-9.4 10.2 0.7-4.5 1.5-8.9 2.2-13.3l7.2 3.1z" fill="#1F0D60"></path>
        <path d="M645.031 463.1c2-10.2 4-20.5 5.9-30.7-6.9 1.7-16.1 2.8-24-1.7-22.7-12.9-7.3-56.5-25.6-73.4-11.7-10.9-38.7-12.2-101.1 18.9-6.1 18.6-7.7 36.1-8.5 45.5-0.9 10.6-7.1 82.7 32.9 105.2 7.3 4.1 15.4 6.2 23.6 6.5-0.3 6.4-0.8 21-1.6 36.5-0.8 19.8-1.7 41-2.1 48.6 32.1-20.9 64.1-41.7 96.1-62.5 0-0.3 0-0.6 0.1-0.9 0.5-8.1 0.9-16 1.4-24.1 0.7-12.2 1.4-24.3 2.1-36.5 0.4-6.3 0.7-12.5 1.1-18.8 0-1.9-0.1-3.7-0.3-5.5v-0.5c0.1-0.6 0.2-1.2 0.3-1.7-0.1-1.8-0.2-3.4-0.3-4.9z" fill="#FFD2DC"></path>
        <path d="M729.236 280.4c0.5-33.3-26.3-60.7-59.8-61.1-33.5-0.5-61.1 26.1-61.6 59.4-0.1 9.3 1.8 18.1 5.5 25.9-16.4-3.9-33.9-4.8-50.2-1.9-9.2 1.6-32.9 6.3-49.3 25.4-4.1 4.8-12.8 15.1-14.6 30.8-0.8 7.2 0 13.2 0.9 17.2 0.1 0 0.2-0.1 0.3-0.2 62.5-31.1 89.4-29.8 101.1-18.9 18.3 17 2.9 60.6 25.6 73.5 7.9 4.5 17.2 3.4 24 1.7-2 10.3-6.5 55.8-6.8 62-0.7 12.2-1.4 24.3-2.1 36.5 8.8-6.1 19.4-15 29-27.5 23.6-30.5 26.3-62.4 27.1-73.6 3.1-43.3-14.6-75.4-21.9-87.1-0.6-1-1.4-2-2.2-3 30.4-2.6 54.5-27.9 55-59.1zM548.231 533.9c-0.5 0-0.8-0.3-0.9-0.7-0.1-0.5 0.3-1 0.7-1 5.8-1 11.8-2.3 17.5-3.8 7.8-2.1 15.7-4.8 23.1-7.8 0.5-0.2 1 0 1.2 0.5s0 1-0.5 1.2c-7.6 3.2-15.4 5.9-23.3 7.9-5.7 1.5-11.8 2.8-17.7 3.8h-0.1v-0.1z"></path>
        <path d="M672.63 423.17c-3-0.6-5.9-0.9-8.9-0.7-5.2 0.3-10.1 1.7-14.5 4.2-0.8 0.5-1.6 0.9-2.3 1.5-0.6 0.5-1.3 0.9-1.9 1.4-6.2 4.6-10.8 11.5-12.5 19.6-3.9 18.1 7.8 36 26 39.9 18.3 3.9 36.2-7.7 40.2-25.9 3.8-18.2-7.8-36.1-26.1-40z" fill="#FFD2DC"></path>
        <path d="M651.33 468.47c-0.4 0-0.6-0.2-0.8-0.5-0.2-0.5-0.1-1 0.4-1.2 3-1.5 5-4.6 5.2-8 0.2-3.4-1.6-6.8-4.6-8.6-0.3-0.2-0.5-0.5-0.5-0.8 0-0.4 0.2-0.6 0.5-0.8l30.9-17.5c0.5-0.3 1-0.1 1.3 0.4 0.3 0.5 0.1 1-0.4 1.3l-29.6 16.9c2.8 2.3 4.5 5.8 4.2 9.4-0.2 4-2.7 7.7-6.2 9.5-0.1-0.2-0.2-0.1-0.4-0.1z"></path>
        <path d="M651.231 475.2l-28.6 16.8 33.2 16.7z" fill="#00B7EA"></path>
        <path d="M855.969 661.719c-3.7 8.6-7.9 17.2-12.4 25.6-18.3 34.2-41.7 65.3-69.6 92.5s-59.8 50-94.5 67.5c-0.9 0.5-1.3 1.5-0.8 2.4-4.7 2.4-9.3 4.5-14.1 6.7-1.1 0.5-2.3 1-3.5 1.5-47 20.5-99 31.9-153.5 31.9-63.2 0-122.8-15.2-175.3-42.2 0.5-0.9 0.1-2-0.7-2.4-33.1-17.2-63.4-39.1-90.1-65.2-5.7-5.4-11.2-11.2-16.6-17.2-0.1-0.2-0.3-0.3-0.4-0.5 34.1-92.2 68.2-184.3 102.2-276.5 22.1 7.2 44.3 14.3 66.4 21.6-0.7 23.5-1.7 47.1-2.8 71.2-2 41.3-4.6 81.9-7.6 121.6 4.1-6.3 64.1-94.7 164.3-130.6-0.8 19.8-1.7 41-2.1 48.6 32.1-20.9 64-41.7 96.1-62.5 0-0.3 0-0.6 0.1-0.9 106.6 3.8 183.5 75.2 214.9 106.9z" fill="#4A90E2"></path>
        <path d="M544.669 618.819c-0.2 0-0.3 0-0.5-0.1-0.3-0.2-0.5-0.5-0.5-0.8l1.4-31.2c0-0.5 0.5-0.9 0.9-0.9 0.5 0 0.9 0.5 0.9 0.9l-1.3 29.5 86-55.8c0.5-0.3 1-0.2 1.3 0.3 0.3 0.5 0.2 1-0.3 1.3l-87.4 56.8c-0.1-0.1-0.3 0-0.5 0z" fill="#D5E0EA"></path>
        <path d="M609.768 709.857v223.5c0 4.1-3.1 7.5-7.2 8-51.6 5.5-103.3 11.2-155 16.7-1.6 0.2-3.1-0.1-4.5-0.8-37.5-18.5-74.9-37.1-112.4-55.6-3-1.5-4.8-4.6-4.5-7.9 1.3-14.2 2.6-28.5 3.8-42.7 5-55.9 10.1-111.8 15.2-167.7 0.5-6.2 7.7-9.4 12.7-5.9 0.1 0 0.1 0.1 0.2 0.1 24.9 17.4 81.2 58.2 95.5 68.6 2.1 1.5 4.8 1.9 7.3 1.2l132.7-43.3 5.4-1.7c5.4-1.8 10.8 2.1 10.8 7.5z" fill="#1F0D60"></path>
        <path d="M423.768 948.857c-0.5-0.1-0.9-0.5-0.9-1l21.9-207.4c0.1-0.5 0.5-0.8 1-0.8 0.5 0.1 0.8 0.5 0.8 1l-21.9 207.4c-0.1 0.4-0.5 0.8-0.9 0.8zM487.268 954.857c-0.5 0-0.9-0.4-0.9-0.9l-7.5-212.6c0-0.5 0.4-0.9 0.9-0.9 0.5-0.1 0.9 0.4 0.9 0.9l7.5 212.6c0 0.4-0.4 0.9-0.9 0.9z" fill="#D5E0EA"></path>
        <path d="M593.768 704.157l-136.6 44.6s-70.3-50.9-98.9-71l19.6-7.9 79.6 63.5 115.8-44.8 20.5 15.6z" fill="#D5E0EA"></path>
        <path d="M382.537 464.694c-11.7-24.5-32.5-43.3-36.7-47-9.9-8.8-19.2-14.9-26-19-2.8-2.9-7.4-4.1-11.6-2.6l-31.6 11-6.6 15.4-2.6-0.6c-0.8-0.2-1.6-0.3-2.4-0.3-4.8 0-9.1 3.3-10.2 8.1-0.1 0.4-0.1 0.6-0.2 1v0.2c0 0.3-0.1 0.5-0.1 0.7V432.894c0 0.2 0 0.4 0.1 0.5 0 0.2 0.1 0.3 0.1 0.5s0.1 0.3 0.1 0.4c0 0.2 0.1 0.4 0.1 0.5 0 0.1 0.1 0.2 0.1 0.3 0.1 0.2 0.1 0.5 0.2 0.6v0.1c1.1 2.8 3.5 5.2 6.5 6.2l-15.2 35.4c3.1 0.2 6.2-1 8.4-3.4l16-17.8-7.6 15.9c-2.5 5.2-0.2 11.4 5 13.9 5.2 2.4 11.5 0.2 14-5l6.3-13.4-2.7 8.3c-1.8 5.4 1.2 11.3 6.7 13.1 5.5 1.8 11.4-1.2 13.3-6.6l5.7-16.8c5 10.9 12.2 17.8 15.1 20.4 22.1 7.2 44.3 14.3 66.4 21.6-0.7-13.3-3.4-28-10.6-42.9z" fill="#FFD2DC"></path>
        <path d="M346.637 454.694c-0.2 0-0.5-0.1-0.6-0.3-10-9.2-21.3-16.5-33.6-21.8-14.3-6.2-29.4-9.6-45.1-10.1-0.5 0-0.9-0.5-0.9-0.9 0-0.5 0.5-0.9 0.9-0.9 15.9 0.5 31.3 3.9 45.8 10.1 12.5 5.4 24 12.9 34.2 22.2 0.4 0.4 0.4 0.9 0.1 1.3-0.3 0.3-0.5 0.4-0.8 0.4zM288.737 468.294c-0.1 0-0.3 0-0.4-0.1-0.5-0.2-0.6-0.7-0.5-1.2l6.5-13.6c0.2-0.5 0.7-0.6 1.2-0.5 0.5 0.2 0.6 0.7 0.5 1.2l-6.5 13.6c-0.1 0.5-0.4 0.6-0.8 0.6z"></path>
        <path d="M229.837 423.094l23.8-8.3-11.1 26-5.6 1.9c-5.7 1.9-11.9-0.8-13.8-6.3-2-5.3 1.1-11.3 6.7-13.3z" fill="#FFD2DC"></path>
        <path d="M687.683 838.994c-0.1 0.5-0.7 4.1-1.9 7-5.2 12.7-48.7 27.7-67.3 31.8-11.8 2.6-27.6 5.7-46.5 8-5.7 1.2-11.2-2.4-12.4-8.1-0.2-0.7-0.2-1.5-0.2-2.2 0-0.8 0.1-1.5 0.3-2.3-5.1 0.4-10-3.1-11-8.2-1.2-5.6 2.5-11.2 8.1-12.3l9.6-2-15.4 2.3c-0.5 0.1-1 0.1-1.6 0.1-5.1 0-9.6-3.7-10.4-8.9-0.9-5.7 3.1-11.1 8.8-11.9l62-9.2v-10.8h-57.1c-5.8 0-10.5-4.7-10.5-10.4s4.8-10.4 10.5-10.4h57.1v-24.4c11.2 0.5 26.5 2.8 42.1 11.7 19.8 11.3 31.5 29.1 34.7 40.8 2.7 10.3 1.1 19.4 1.1 19.4z" fill="#FFD2DC"></path>
        <path d="M556.483 853.494c-0.5 0-0.8-0.3-0.9-0.7s0.3-1 0.7-1.1l56.2-10.5c0.5-0.1 1 0.3 1.1 0.7s-0.3 1-0.7 1.1l-56.2 10.5h-0.2zM559.383 874.194c-0.5 0-0.8-0.3-0.9-0.7-0.1-0.5 0.2-1 0.6-1.1l58.3-13.9c0.5-0.1 1 0.2 1.1 0.6s-0.2 1-0.6 1.1l-58.3 13.9c0 0.1-0.1 0.1-0.2 0.1zM639.483 792.394h-30c-0.5 0-0.9-0.4-0.9-0.9s0.4-0.9 0.9-0.9h30c0.5 0 0.9 0.4 0.9 0.9s-0.3 0.9-0.9 0.9z"></path>
    </svg>`;

    useEffect(() => {
        if (m && window.L) {
            const L = window.L;
            if (lRef.current.group) lRef.current.group.clearLayers();
            const group = L.featureGroup().addTo(m);
            lRef.current.group = group;

            const curPoints = JOURNEY_DATA.filter(d => d.y <= p);
            if (curPoints.length === 0) return;

            L.polyline(curPoints.map(c => [c.lat, c.lng]), { color: '#2563eb', weight: 3, dashArray: '10,10' }).addTo(group);
            curPoints.forEach(pt => L.circleMarker([pt.lat, pt.lng], { radius: 5, color: '#ffffff', weight: 1, fillColor: '#1e40af', fillOpacity: 1 }).addTo(group));

            const cur = curPoints[curPoints.length - 1];
            L.marker([cur.lat, cur.lng], { 
                icon: L.divIcon({ 
                    html: markerSvg, 
                    className: 'bg-transparent', 
                    iconAnchor: [32, 32],
                    popupAnchor: [0, -32]
                }) 
            })
                .addTo(group)
                .bindTooltip(`${cur.y} - ${cur.n}`, { permanent: true, direction: 'top', offset: [0, -40], className: 'font-bold text-blue-600 bg-white/90 border-0 shadow-sm px-2 py-1 rounded' })
                .openTooltip();
        }
    }, [m, p]);

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
            <div className="absolute top-0 z-[2000] w-full p-4 flex justify-between pointer-events-none">
                <div className="bg-white/90 p-3 rounded-xl pointer-events-auto shadow-sm border border-gray-100">
                    <h2 className="font-bold">{T['footprint.title'][lang]}</h2>
                </div>
                <button onClick={onBack} className="bg-white px-4 py-2 rounded-full shadow pointer-events-auto border hover:bg-gray-50 transition-colors font-bold text-gray-700">🏠 {T['life.back'][lang]}</button>
            </div>
            <div className="flex-1 bg-blue-50/30"><BaseMap onL={sM} /></div>
            <div className="bg-white p-8 border-t z-[2000] relative">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between text-sm text-gray-500 mb-2 font-mono font-bold">
                        <span>701 ({T['footprint.birth'][lang]})</span>
                        <span>724 ({T['footprint.out'][lang]})</span>
                        <span>742 ({T['footprint.capital'][lang]})</span>
                        <span>755 ({T['footprint.war'][lang]})</span>
                        <span>762 ({T['footprint.death'][lang]})</span>
                    </div>
                    <input type="range" min="701" max="762" value={p} onChange={e => sP(+e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    <div className="text-center mt-2 text-blue-600 font-bold">{p}</div>
                </div>
            </div>
        </div>
    );
};
