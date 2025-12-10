

import { GoogleGenAI } from "@google/genai";

// Using process.env.API_KEY as per strict coding guidelines
const API_KEY = process.env.API_KEY;

const getClient = () => {
  return new GoogleGenAI({ apiKey: API_KEY });
};

export const getFractalInsight = async (mode: string, params: string): Promise<string> => {
  try {
    const ai = getClient();
    const prompt = `
      You are a chaotic mathematician AI analyzing a digital fractal system.
      The current mode is ${mode}.
      The current parameters are: ${params}.
      
      Provide a short, cryptic, yet scientifically accurate 2-sentence insight about the mathematical properties or the "feeling" of this specific fractal configuration. 
      Mention concepts like "escape time", "strange attractors", "imaginary numbers", or "hyper-dimensional folding" where appropriate.
      Do not use markdown. Keep it raw and mysterious.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || "The void is silent.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The void refuses to answer... (Check API Key)";
  }
};

export const analyzeFractalPattern = async (imageBase64: string): Promise<any> => {
    const ai = getClient();

    const prompt = `
      Analyze this image for fractal patterns and mathematical geometry. 
      Act as a PHD Mathematician. 
      Return a STRICT JSON object (no markdown formatting, no code blocks, just the raw json) with the following structure:
      {
        "patternType": "String (e.g. Fibonacci Spiral, Self-Similar Branching)",
        "similarityScore": "Number 0-100",
        "mathematicalProperties": ["String", "String", "String"],
        "primaryEquation": "String (LaTeX format if possible)",
        "description": "A sophisticated paragraph explaining the recursive nature found in the image."
      }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/png', data: imageBase64.split(',')[1] } },
                    { text: prompt }
                ]
            }
        });
        
        let text = response.text || "{}";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            text = text.substring(start, end + 1);
        }
        
        return JSON.parse(text);
    } catch (error) {
        console.error("Analysis Error", error);
        throw error;
    }
};

export const optimizePrompt = async (originalPrompt: string): Promise<string> => {
    const ai = getClient();
    const prompt = `
      Act as a professional generative art prompt engineer specializing in fractals and mathematical visualization.
      Enhance the following user prompt to be more descriptive, artistic, and technically precise for a fractal generation model.
      
      Focus on:
      - Mathematical terminology (e.g., recursive, self-similar, Euclidean, non-Euclidean)
      - Lighting effects (e.g., volumetric, bioluminescent, ray-traced)
      - Texture details (e.g., crystalline, liquid, metallic, obsidian)
      - Composition (e.g., golden ratio, symmetry, chaos)
      
      Keep the original subject matter but elevate the description significantly.
      
      Original User Prompt: "${originalPrompt}"
      
      Return ONLY the optimized prompt text. Do not include any explanations.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text?.trim() || originalPrompt;
    } catch (error) {
        console.error("Prompt Optimization Error", error);
        return originalPrompt;
    }
};

export const generateFractalArt = async (prompt: string, style: string, imageSize: string, refImage?: string): Promise<string> => {
    const ai = getClient();

    const enhancedPrompt = `
      Create a high-quality, 8k resolution fractal artwork.
      Subject: ${prompt}
      Style: ${style} (Apply this artistic style rigorously).
      
      STRICT RENDERING RULES (FOR 2D MODELS):
      Render the fractal using the SAME visual style as the input. 
      DO NOT apply radial gradients, heatmap coloring, smoothing, blurring, or soft glow effects. 
      The interior of the fractal must remain completely black. 
      The boundary must follow the exact pixel-sharp outline without softening or feathering. 
      Colors must follow the reference style only — do NOT replace them with red–orange–yellow gradients. 
      Preserve the original fractal’s filaments, edges, and geometric detail exactly as shown.
      
      Technical requirements: High recursive detail, self-similarity, mathematical precision, intricate geometry.
    `;

    // Internal helper to try generation with a specific model
    const tryGenerate = async (model: string) => {
        const parts: any[] = [{ text: enhancedPrompt }];
        if (refImage) {
             const base64Data = refImage.split(',')[1];
             if (base64Data) {
                parts.unshift({ inlineData: { mimeType: 'image/png', data: base64Data } });
             }
        }

        // Configure options based on model capabilities
        const config: any = {
            imageConfig: {
                aspectRatio: "1:1"
            }
        };

        // Only add imageSize for the Pro model which supports it
        if (model === 'gemini-3-pro-image-preview') {
            config.imageConfig.imageSize = imageSize;
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: parts },
            config: config
        });

        if (response.candidates && response.candidates.length > 0) {
            for (const candidate of response.candidates) {
                if (candidate.content && candidate.content.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.inlineData && part.inlineData.data) {
                            return `data:image/png;base64,${part.inlineData.data}`;
                        }
                    }
                }
            }
        }
        throw new Error(`No image data returned from ${model}`);
    };

    try {
        // Try high quality first, then fallback
        try {
             return await tryGenerate('gemini-3-pro-image-preview');
        } catch (proError: any) {
             console.warn("Pro model failed, falling back to Flash...", proError.message);
             // Note: Fallback ignores imageSize as Flash usually doesn't support it or uses default
             return await tryGenerate('gemini-2.5-flash-image');
        }

    } catch (error: any) {
        console.error("Final Generation Error", error);
        if (error.message?.includes('403') || error.status === 403) {
            throw new Error("Permission Denied (403). The API Key does not have access to Image Generation models.");
        }
        throw error;
    }
};
