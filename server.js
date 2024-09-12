const { Socket } = require("dgram");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("Um usuário se conectou");

  socket.on("set username", (username) => {
    socket.username = username; // Capturando o nome do Usuário.
    // Quem conectou na sala.
    console.log(`${username} entrou na sala.`);

    if (waitingUser) {
      // Se há um usuário esperando, emparelha os dois.
      socket.partner = waitingUser;
      waitingUser.partner = socket;

      // Notificar os users conectados.
      waitingUser.emit("chat start", `Falando com: ${socket.username}`);
      socket.emit("chat start", `Falando com: ${waitingUser.username}`);

      // Zeramos o user que está esperando.
      waitingUser = null;
    } else {
      // Se não tem ninguém esperando, colocar ele como próximo a esperar.
      waitingUser = socket;
      socket.emit("waiting", "Aguardando por um usuário para papear...");
    }
  });

  // Enviar mensagem
  socket.on("chat message", (msg) => {
    if (socket.partner) {
      socket.partner.emit("chat message", `${socket.username}: ${msg}`);
    }
  });

  // Se Desconectar
  socket.on("manual disconnect", () => {
    if (socket.partner) {
      socket.partner.emit("chat end", `${socket.username} desconectou.`);
      socket.partner.partner = null;
      socket.partner = null;
    }
    socket.emit("chat end", "Você desconectou.");
  });

  // Lidar com Desconexão
  socket.on("disconnect", () => {
    console.log("Usuário de desconectou");
    if (socket.partner) {
      socket.partner.emit("chat end", `${socket.username} desconectou.`);
      socket.partner.partner = null;
    }

    if (waitingUser == socket) {
      waitingUser = null;
    }
  });
});

server.listen(3000, () => {
  console.log("servidor rodando na porta 3000");
});
