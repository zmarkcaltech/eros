// Test script to check Eros conversation API
const fetch = require('node-fetch');

async function testErosAPI() {
  try {
    console.log('Testing Eros conversation API...\n');

    // First, try to get/create a conversation
    console.log('1. Getting conversation...');
    const getResponse = await fetch('http://localhost:3000/api/eros/conversation', {
      method: 'GET',
      headers: {
        'Cookie': 'sb-oqlsvaomefbrinnuedfx-auth-token=...' // Will fail auth but that's ok
      }
    });

    console.log('GET Status:', getResponse.status);
    const getData = await getResponse.json();
    console.log('GET Response:', JSON.stringify(getData, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testErosAPI();
