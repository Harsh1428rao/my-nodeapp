const http = require("http");

const PORT = 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello from my automated Kubernetes deployment!");
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
