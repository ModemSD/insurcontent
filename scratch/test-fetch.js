async function testFetch() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const signal = {
    id: 118,
    title: 'Claims lag AI solution',
    content: 'Some raw content text',
    topic: 'Claims Automation',
    pain_point: 'Understaffed claims department',
    emotional_trigger: 'Fear of reputation loss',
    rewrite_angle: 'How automation resolves claims',
    target_audience: 'Agency owners',
    url: 'https://reddit.com/r/insurance',
    source: 'Reddit'
  };
  const platform = 'X.com';

  const params = new URLSearchParams({
    signalId: String(signal.id || ''),
    title: signal.title || '',
    content: signal.content || '',
    topic: signal.topic || '',
    painPoint: signal.pain_point || '',
    emotionalTrigger: signal.emotional_trigger || '',
    rewriteAngle: signal.rewrite_angle || '',
    targetAudience: signal.target_audience || '',
    url: signal.url || '',
    source: signal.source || '',
    targetPlatform: platform
  });

  const url = `https://n8n.srv1685912.hstgr.cloud/webhook/fdb5cc2d-d0e6-4827-b767-07b98023e269?${params.toString()}`;
  console.log('Sending GET request to:', url);
  try {
    const res = await fetch(url, {
      method: 'GET'
    });
    console.log('Response status:', res.status);
    console.log('Response text:', await res.text());
  } catch (err) {
    console.error('Fetch error details:');
    console.error(err);
  }
}

testFetch();
