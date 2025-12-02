
import React, { useState, useEffect, useRef } from 'react';
import { TYPEWRITER_PHRASES, T } from '../constants';
import { Lang } from '../types';

interface HomeProps {
    lang: Lang;
    onSearch: (q: string, type: 'general' | 'three_ages') => void;
    loading: boolean;
}

export const Typewriter: React.FC<{ lang: Lang }> = ({ lang }) => {
    const phrases = TYPEWRITER_PHRASES[lang];
    const [index, setIndex] = useState(0);
    const [subIndex, setSubIndex] = useState(0);
    const [reverse, setReverse] = useState(false);

    useEffect(() => {
        setIndex(0);
        setSubIndex(0);
        setReverse(false);
    }, [lang]);

    useEffect(() => {
        if (index >= phrases.length) { setIndex(0); return; }
        const currentPhrase = phrases[index];
        let timeoutValue = 150;
        if (reverse) timeoutValue = 50;
        if (!reverse && subIndex === currentPhrase.length) timeoutValue = 2000;
        if (reverse && subIndex === 0) timeoutValue = 500;
        
        const timer = setTimeout(() => {
            if (!reverse && subIndex === currentPhrase.length) { setReverse(true); return; }
            if (reverse && subIndex === 0) { setReverse(false); setIndex((prev) => (prev + 1) % phrases.length); return; }
            setSubIndex((prev) => prev + (reverse ? -1 : 1));
        }, timeoutValue);
        return () => clearTimeout(timer);
    }, [subIndex, index, reverse, phrases]);

    return (
        <div className="flex flex-col">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight text-gray-900 mb-2">
                {T['home.hero.title'][lang]}
            </h1>
            <div className="text-5xl md:text-7xl font-bold tracking-tight leading-tight min-h-[1.2em]">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-transparent bg-clip-text animate-gradient-x">
                    {phrases[index].substring(0, subIndex)}
                </span>
                <span className="ml-1 inline-block w-1 h-12 md:h-16 bg-gray-800 animate-blink align-middle mb-2"></span>
            </div>
        </div>
    );
};

export const SearchSection: React.FC<HomeProps> = ({ onSearch, loading, lang }) => {
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<'general' | 'three_ages'>('general');
    const [menuOpen, setMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) onSearch(query, mode);
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-4 relative z-50 flex flex-col gap-4">
            <form onSubmit={handleSubmit} className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
                <div className="relative flex items-center bg-white rounded-3xl leading-none shadow-sm h-16">
                    <div className="relative h-full flex items-center border-r border-gray-100" ref={dropdownRef}>
                        <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 px-5 h-full text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors whitespace-nowrap bg-gray-50 hover:bg-gray-100 rounded-l-3xl min-w-[120px] justify-between">
                            {mode === 'general' ? T['search.btn'][lang] : T['search.btn_alt'][lang]}
                            <span className="text-xs opacity-50">▼</span>
                        </button>
                        {menuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 overflow-hidden animate-fade-up">
                                <button type="button" onClick={() => { setMode('general'); setMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50">{T['search.btn'][lang]}</button>
                                <button type="button" onClick={() => { setMode('three_ages'); setMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-purple-50">{T['search.btn_alt'][lang]}</button>
                            </div>
                        )}
                    </div>
                    <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder={T['search.placeholder'][lang]} className="flex-1 h-full py-2 px-4 text-gray-900 bg-transparent border-0 ring-0 outline-none focus:ring-0 text-lg font-serif placeholder-gray-400" />
                    <button type="submit" disabled={loading} className="px-6 h-full text-blue-600 hover:text-blue-800 transition-colors rounded-r-3xl hover:bg-blue-50 flex items-center justify-center">
                        {loading ? <span className="animate-spin">⌛</span> : <span className="text-xl">➤</span>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export const Portrait: React.FC = () => {
    return (
        <div className="relative w-full aspect-square max-w-[400px] mx-auto">
            <div className="absolute inset-0 bg-gray-100 rounded-full transform translate-x-4 translate-y-4 -z-10"></div>
            <div className="w-full h-full rounded-full overflow-hidden shadow-2xl border-4 border-white relative bg-gray-200 flex items-center justify-center group">
                <img src="https://picx.zhimg.com/80/v2-7228406e00cce3ede863a49268a98993_720w.webp?source=2c26e567" className="w-full h-full object-cover hover:scale-110 transition-transform duration-1000 ease-in-out" alt="Li Bai Portrait" />
                <div className="absolute inset-0 bg-blue-900/10 group-hover:bg-transparent transition-colors duration-500"></div>
            </div>
        </div>
    );
};
