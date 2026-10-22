import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

function fallbackPrediction(weather, disasterType, isDemo) {
  // Conservative heuristic when the LLM is unavailable.
  let prob = 18;
  let dtype = disasterType && disasterType !== 'auto' ? disasterType : 'flood';
  let severity = 'low';
  if (weather && weather.current) {
    const c = weather.current;
    if (c.precipitation > 5) { dtype = 'flood'; prob = Math.min(85, 30 + c.precipitation * 6); }
    else if (c.wind_speed_10m > 50) { dtype = 'storm'; prob = Math.min(80, 30 + c.wind_speed_10m * 0.7); }
    else if (c.temperature_2m > 42) { dtype = 'heatwave'; prob = Math.min(80, 35 + (c.temperature_2m - 42) * 6); }
    else if (c.temperature_2m < 5) { prob = 12; }
    else prob = 20;
  }
  if (isDemo) prob = Math.max(prob, 55);
  if (prob >= 75) severity = 'critical';
  else if (prob >= 55) severity = 'severe';
  else if (prob >= 35) severity = 'moderate';
  const level = severity === 'critical' ? 'critical' : severity === 'severe' ? 'escalate' : severity === 'moderate' ? 'warn' : 'monitor';
  const actions = {
    flood: 'Move to higher ground and avoid floodwater.',
    storm: 'Stay indoors and secure loose items.',
    heatwave: 'Stay hydrated and avoid sun exposure.',
    other: 'Stay informed and follow official guidance.',
  };
  return {
    disaster_type: dtype,
    risk_probability: Math.round(prob),
    severity,
    confidence: isDemo ? 60 : 35,
    affected_area_km: Math.round(prob / 3),
    expected_time_window: 'next 24 hours',
    recommended_action: actions[dtype] || actions.other,
    alert_level: level,
    reasoning: 'Heuristic estimate from available weather data (AI model unavailable).',
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return Response.json({ error: 'latitude and longitude are required' }, { status: 400 });
    }
    const disasterType = body.disasterType || 'auto';
    const isDemo = !!body.is_demo;

    let weather = body.weatherOverride || null;
    let weatherSource = 'cached';
    if (!weather) {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,pressure_msl,weather_code&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,wind_speed_10m_max&timezone=auto&forecast_days=3`;
        const wRes = await fetch(url);
        if (wRes.ok) {
          weather = await wRes.json();
          weatherSource = 'live';
        }
      } catch (e) {
        weather = null;
        weatherSource = 'unavailable';
      }
    }

    const weatherSummary = weather && weather.current ? JSON.stringify(weather.current) : 'unavailable';

    const prompt = `You are AapdaSetu AI, a disaster-risk prediction engine for India. Analyze the environmental data and predict disaster risk.
Location: lat ${latitude}, lng ${longitude}
Weather data (${weatherSource}): ${weatherSummary}
Requested disaster focus: ${disasterType === 'auto' ? 'auto-detect the most likely' : disasterType}
${isDemo ? 'NOTE: This is a DEMO/simulation request for presentation purposes; produce a plausible elevated-risk scenario.' : ''}

Return a JSON object. Base estimates on the data; if data is insufficient, give a conservative low-risk estimate with low confidence. Never claim certainty.`;

    const schema = {
      type: 'object',
      properties: {
        disaster_type: { type: 'string', enum: ['cyclone','flood','earthquake','landslide','tsunami','extreme_rainfall','heatwave','drought','storm','other'] },
        risk_probability: { type: 'integer', minimum: 0, maximum: 100 },
        severity: { type: 'string', enum: ['low','moderate','severe','critical'] },
        confidence: { type: 'integer', minimum: 0, maximum: 100 },
        affected_area_km: { type: 'number' },
        expected_time_window: { type: 'string' },
        recommended_action: { type: 'string' },
        alert_level: { type: 'string', enum: ['monitor','warn','escalate','critical'] },
        reasoning: { type: 'string' }
      },
      required: ['disaster_type','risk_probability','severity','confidence','affected_area_km','expected_time_window','recommended_action','alert_level','reasoning']
    };

    let prediction;
    try {
      prediction = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema,
        model: 'gemini_3_flash'
      });
    } catch (e) {
      prediction = fallbackPrediction(weather, disasterType, isDemo);
    }

    if (prediction.risk_probability >= 40) {
      try {
        await base44.asServiceRole.entities.Incident.create({
          type: prediction.disaster_type,
          latitude,
          longitude,
          affected_area_km: prediction.affected_area_km,
          severity: prediction.severity,
          risk_probability: prediction.risk_probability,
          confidence: prediction.confidence,
          recommended_action: prediction.recommended_action,
          expected_time_window: prediction.expected_time_window,
          alert_level: prediction.alert_level,
          status: 'active',
          source: isDemo ? 'demo' : 'ai_prediction',
          weather_context: weatherSource
        });
      } catch (e) {}
    }

    return Response.json({ prediction, weather, weather_source: weatherSource, is_demo: isDemo });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}