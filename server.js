const WebSocket = require("ws");

const PORT = 8080;
const server = new WebSocket.Server({ port: PORT });

console.log(`Servidor WebSocket escuchando en ws://localhost:${PORT}`);

server.on("connection", (socket, request) => {
  const address = request.socket.remoteAddress;
  console.log(`Cliente conectado: ${address}`);

  socket.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log({
        roll: data.roll,
        pitch: data.pitch,
        yaw: data.yaw
      });
    } catch (error) {
      console.log("Mensaje no válido:", message.toString());
    }
  });

  socket.on("close", () => {
    console.log(`Cliente desconectado: ${address}`);
  });
});

server.on("error", (error) => {
  console.error("Error del servidor WebSocket:", error.message);
});
