import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const message = (body.message || '').toString().slice(0, 1000);
    if (!message) return Response.json({ error: 'message is required' }, { status: 400 });

    const language = body.language === 'hi' ? 'Hindi' : 'English';
    const lat = body.latitude;
    const lng = body.longitude;
    const riskContext = body.riskContext ? JSON.stringify(body.riskContext) : 'not available';

    const prompt = `You are the AapdaSetu AI Assistant, an emergency guidance chatbot for Indian disaster management. Answer the user's question concisely with actionable, safety-first guidance. Respond in ${language}. Keep answers under 120 words. If asked about medical emergencies, remind them to call 112. Never claim certainty about live conditions.
User location: lat ${lat}, lng ${lng}
Current risk context: ${riskContext}
User question: ${message}`;

    let reply;
    try {
      reply = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini_3_flash'
      });
    } catch (e) {
      reply = language === 'Hindi'
        ? 'एमर्जेंसी हेल्पलाइन 112 पर कॉल करें। सुरक्षित स्थान पर रहें और आधिकारिक निर्देशों का पालन करें।'
        : 'Call the emergency helpline 112 immediately. Stay in a safe location and follow official instructions.';
    }

    return Response.json({ reply });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}