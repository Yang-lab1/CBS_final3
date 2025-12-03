
import { GoogleGenAI } from "@google/genai";

export const generateResponse = async (promptType: 'three_ages' | 'general' | 'analysis' | 'network_batch' | 'network_report', params: any, lang: 'zh' | 'en'): Promise<string> => {
    if (!process.env.API_KEY) {
        return lang === 'zh' ? "API配置错误: 缺少密钥。" : "API Configuration Error: Missing Key.";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langInstruction = lang === 'en' ? "Please answer in English." : "请用中文回答。";
    let systemInstruction = "";
    let prompt = params.query || "";
    let tools: any[] | undefined = undefined;
    let responseMimeType: string | undefined = 'text/plain';

    if (promptType === 'three_ages') {
        systemInstruction = `You are Li Bai (李白). You MUST output exactly three paragraphs separated by "|||" (three vertical bars). The format MUST be: Paragraph 1|||Paragraph 2|||Paragraph 3.
        Paragraph 1: Youthful Li Bai (Young, arrogant, ambitious).
        Paragraph 2: Middle-aged Li Bai (Bold yet sorrowful, frustrated ambition).
        Paragraph 3: Old Li Bai (Weathered, philosophical, transcendental).
        ${langInstruction}`;
        prompt = params.query || "Tell me about yourself.";
    } else if (promptType === 'general') {
        systemInstruction = `You are an expert AI on the life of Li Bai. Answer in a popular, humorous, and engaging style. ${langInstruction}`;
    } else if (promptType === 'analysis') {
        systemInstruction = `You are an expert in Tang Dynasty literature. Analyze Li Bai's poem written in ${params.y} at ${params.l} titled "《${params.t}》".
        Format:
        ### 📜 Full Poem (Traditional Chinese)
        (Content)
        ### 🎭 Emotional Analysis
        (Based on mood: ${params.m})
        ### 🌍 Historical Context
        ${langInstruction}`;
        prompt = `Analyze 《${params.t}》`;
    } else if (promptType === 'network_batch') {
        const inputStr = params.personList.map((p: any) => `${p.name} (${p.rel})`).join("\n");
        systemInstruction = `You are an expert researcher on Li Bai. Analyze the following list of people and their relationships.
        
        Logic:
        1. Geographic Location: Where did this person primarily interact with Li Bai?
        2. Emotional Tone: What is the mood of this relationship?
           - 🔴 Red (#e74c3c): Political Ambition/Ecstasy (Chang'an/Court)
           - 🔵 DarkBlue (#2c3e50): Grief/Disillusionment/Exile (Yelang/Prison)
           - 🟢 Green (#27ae60): Leisure/Nature/Wanderlust (Jiangnan/Travels)
           - ⚪ Gray (#bdc3c7): Other/Neutral
        
        Input Data:
        ${inputStr}
        
        Output Format (Strict pure JSON, no Markdown):
        A JSON object where Key is the Person Name, and Value is { "color": "HexCode", "location": "Location Name", "mood": "Mood Word" }
        ${langInstruction}`;
        prompt = "Analyze the relationships.";
        responseMimeType = 'application/json';
    } else if (promptType === 'network_report') {
        systemInstruction = `You are an expert on Li Bai's life and poetry.
        请基于《李白全集》的文本挖掘视角，分析李白与【${params.name}】的关联。

        请输出严格的结构化报告：
        1. 【GIS空间定位】：他们互动的具体物理地点（如：黄鹤楼、长安翰林院、桃花潭）。
        2. 【NLP情感关键词】：从相关诗作中提取3个核心情感词（如：孤帆、泪湿、仰天大笑）。
        3. 【意象沉淀】：地理环境（如江河、宫阙）如何转化为了诗歌中的心理符号？
        4. 【引用诗句】：引用一句最著名的相关诗句。
        
        重要：如果你在内部知识库中找不到关于此人的足够信息，请务必使用 Google Search 工具进行在线搜索，以确保报告内容详实准确。
        ${langInstruction}`;
        prompt = `分析李白与 ${params.name} 的关联`;
        tools = [{ googleSearch: {} }];
        responseMimeType = undefined; // Do not set mime type when using search tools
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: responseMimeType,
                tools: tools
            }
        });

        let text = response.text || "";

        // Handle Grounding Metadata for Search Results
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            const chunks = response.candidates[0].groundingMetadata.groundingChunks;
            const uniqueLinks = new Map();
            
            chunks.forEach((c: any) => {
                if (c.web?.uri && c.web?.title) {
                    uniqueLinks.set(c.web.uri, c.web.title);
                }
            });

            if (uniqueLinks.size > 0) {
                text += `\n\n---\n**📚 ${lang === 'zh' ? '参考来源' : 'Sources'}:**\n`;
                uniqueLinks.forEach((title, uri) => {
                    text += `- [${title}](${uri})\n`;
                });
            }
        }

        if (text) {
            return text;
        } else {
            return lang === 'zh' ? "无回应。" : "No response.";
        }
    } catch (e) {
        console.error("Gemini API Error:", e);
        return lang === 'zh' ? "网络迷踪... (API Error)" : "Network lost... (API Error)";
    }
};
