process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testFetch() {
  const webhookType = 'webhook-test';
  const url = `https://n8n.srv1685912.hstgr.cloud/${webhookType}/36b26179-26a4-4e9d-8c82-ece5d3fd1835`;

  const body = {
    signalId: 'test-id',
    title: 'Test Title',
    content: 'Test Content',
    topic: 'Test Topic',
    painPoint: 'Test Pain',
    emotionalTrigger: 'Test Trigger',
    rewriteAngle: 'Test Angle',
    targetAudience: 'Test Audience',
    url: 'https://test.com',
    source: 'test-source',
    targetPlatform: 'LinkedIn'
  };

  console.log('Sending request to:', url);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', response.headers);
    const text = await response.text();
    console.log('Response Body:', text);
  } catch (error) {
    console.error('Fetch Error:', error);
  }
}

testFetch();
