import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const imageUrl = (body.imageUrl || '').toString();
    const description = (body.description || '').toString().slice(0, 500);
    const reportType = (body.type || 'other').toString();

    const schema = {
      type: 'object',
      properties: {
        ai_category: { type: 'string' },
        ai_severity: { type: 'string', enum: ['low','moderate','high','critical'] },
        ai_confidence: { type: 'integer', minimum: 0, maximum: 100 },
        suggested_status: { type: 'string', enum: ['unverified','ai_flagged','human_verified','rejected','resolved'] },
        notes: { type: 'string' }
      },
      required: ['ai_category','ai_severity','ai_confidence','suggested_status','notes']
    };

    const prompt = `You are an AI damage-assessment assistant for AapdaSetu AI. Analyze the reported hazard${imageUrl ? ' and the attached image' : ''}.
Reported type: ${reportType}
Description: ${description || 'none provided'}
Estimate the damage category, severity, confidence, and a suggested verification status. AI assists authorities — do not override human judgment. If no image or insufficient info, return low confidence.`;

    let analysis;
    try {
      const params = { prompt, response_json_schema: schema, model: 'gemini_3_flash' };
      if (imageUrl) params.file_urls = [imageUrl];
      analysis = await base44.asServiceRole.integrations.Core.InvokeLLM(params);
    } catch (e) {
      analysis = {
        ai_category: reportType,
        ai_severity: 'moderate',
        ai_confidence: 0,
        suggested_status: 'unverified',
        notes: 'AI analysis unavailable; pending human verification.',
      };
    }

    return Response.json({ analysis });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}