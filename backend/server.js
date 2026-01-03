const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'OK',
    app: 'KZIIK',
    time: new Date()
  }));
});

server.listen(5000, () => {
  console.log('KZIIK backend running on port 5000');
});
