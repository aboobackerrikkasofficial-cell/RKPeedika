import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000/api';

async function testUpload() {
  console.log('1. Attempting login...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rikkas.aboo@gmail.com', password: '9188072646' })
  });

  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    return;
  }

  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Login successful. Token acquired.');

  // Create a valid dummy PNG file
  const dummyFilePath = path.resolve('scratch/dummy.png');
  fs.mkdirSync(path.dirname(dummyFilePath), { recursive: true });
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  fs.writeFileSync(dummyFilePath, Buffer.from(pngBase64, 'base64'));
  console.log('Created valid dummy PNG file:', dummyFilePath);

  // Send request letting the browser/fetch set the boundary (standard way)
  console.log('2. Sending upload request without manual Content-Type header (correct way)...');
  try {
    const fileBlob = new Blob([fs.readFileSync(dummyFilePath)], { type: 'image/png' });
    const formData = new FormData();
    formData.append('images', fileBlob, 'dummy.png');

    const res = await fetch(`${BASE_URL}/uploads/product-images`, {
      method: 'POST',
      headers: {
        'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
      },
      body: formData
    });

    console.log('Response status (auto Content-Type):', res.status);
    console.log('Response body (auto Content-Type):', await res.text());
  } catch (err) {
    console.error('Request failed (auto Content-Type):', err);
  }
}

testUpload();
