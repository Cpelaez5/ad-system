const https = require('https');
https.get('https://bcv-api-proxy-r8fs.onrender.com/api/bcv/rates', (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', JSON.stringify(res.headers, null, 2));
}).on('error', (e) => {
  console.error(e);
});
