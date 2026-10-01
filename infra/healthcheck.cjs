const http = require('node:http');
const request = http.get('http://127.0.0.1:3000/api/health', (response) => {
  response.resume();
  process.exitCode = response.statusCode === 200 ? 0 : 1;
});
request.setTimeout(4000, () => request.destroy(new Error('Health check timed out')));
request.on('error', () => { process.exitCode = 1; });
