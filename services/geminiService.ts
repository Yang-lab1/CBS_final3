import { GoogleGenAI } from "@google/genai";

export const generateResponse = async (promptType: 'three_ages' | 'general' | 'analysis' | 'network_batch' | 'network_report', params: any, lang: 'zh' | 'en'): Promise<string> => {
    if (!process.env.API_KEY) {
        return lang === 'zh' ? "API配置错误: 缺少密钥。" : "API Configuration Error: Missing Key.";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langInstruction = lang === 'en' ? "Please answer in English." : "请用中文回答。";
    let systemInstruction = "";
    let prompt = params.query || "";

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
    } else if (promptType === 'network_report') {
        systemInstruction = `You are an expert on Li Bai's life and poetry. Generate a report on the relationship between Li Bai and 【${params.name}】.
        Output Markdown format:
        1. **GIS Spatial Location**: Specific physical locations of interaction (e.g., Yellow Crane Tower).
        2. **NLP Emotional Keywords**: Extract 3 core emotional keywords.
        3. **Imagery Precipitation**: How did the environment translate into psychological symbols?
        4. **Famous Quote**: One most famous relevant poem line.
        ${langInstruction}`;
        prompt = `Report on Li Bai and ${params.name}`;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: promptType === 'network_batch' ? 'application/json' : 'text/plain'
            }
        });

        if (response.text) {
            return response.text;
        } else {
            return lang === 'zh' ? "无回应。" : "No response.";
        }
    } catch (e) {
        console.error("Gemini API Error:", e);
        return lang === 'zh' ? "网络迷踪... (API Error)" : "Network lost... (API Error)";
    }
};