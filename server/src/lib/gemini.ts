export interface FoodAnalysis {
  food_name: string;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
}

const PROMPT = `이 사진 속 음식을 분석해줘. 여러 음식이 있으면 대표적인 하나로 합쳐서 이름을 짓고, 전체 기준으로 추정치를 계산해줘.
반드시 아래 JSON 형식으로만 답해줘. 다른 설명은 절대 붙이지 마.
{"food_name": "음식 이름(한글)", "calories": 숫자(kcal), "carbs_g": 숫자, "protein_g": 숫자, "fat_g": 숫자}`;

function extractJson(text: string): FoodAnalysis {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Gemini 응답에서 JSON을 찾지 못했습니다.");
  const parsed = JSON.parse(match[0]);
  return {
    food_name: String(parsed.food_name ?? "분석된 음식"),
    calories: Number(parsed.calories) || 0,
    carbs_g: Number(parsed.carbs_g) || 0,
    protein_g: Number(parsed.protein_g) || 0,
    fat_g: Number(parsed.fat_g) || 0,
  };
}

export async function analyzeFoodImage(imageBuffer: Buffer, mimeType: string): Promise<FoodAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 서버 .env에 설정되어 있지 않습니다.");
  }

  const base64 = imageBuffer.toString("base64");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API 오류 (${response.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini 응답이 비어 있습니다.");
  return extractJson(text);
}
