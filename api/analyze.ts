import { GoogleGenAI } from '@google/genai';

type RequestBody = {
  text?: string;
  fileData?: {
    data: string;
    mimeType: string;
  } | null;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: '서버 환경변수 GEMINI_API_KEY가 설정되지 않았습니다.',
      });
    }

    const body: RequestBody =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const text = body?.text?.trim();
    const fileData = body?.fileData;

    if (!text && !fileData) {
      return res.status(400).json({
        error: '분석할 텍스트 또는 파일 데이터가 필요합니다.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const parts: any[] = [];
    if (text) parts.push({ text });

    if (fileData) {
      parts.push({
        inlineData: {
          data: fileData.data,
          mimeType: fileData.mimeType,
        },
      });
    }

    const prompt = `
당신은 임상 논문 분석 전문가입니다.
입력된 논문 초록 또는 본문을 바탕으로 아래 형식으로 한국어로 정리하세요.

1. 논문 개요
2. 연구 목적
3. 연구 설계 / 방법
4. 주요 결과
5. 임상적 의미
6. 한계점
7. 핵심 한줄 요약
`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            ...parts,
          ],
        },
      ],
    });

    const output =
      result?.text ||
      result?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('\n') ||
      '';

    return res.status(200).json({ result: output });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || '서버에서 분석 중 오류가 발생했습니다.',
    });
  }
}
