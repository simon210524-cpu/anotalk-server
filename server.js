import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// várakozó játékos (max 1 db egyszerre)
let waitingSocket = null;

io.on("connection", (socket) => {
  console.log("Új kliens:", socket.id);

  // ha nincs várakozó, ez lesz az
  if (!waitingSocket) {
    waitingSocket = socket;
    socket.emit("waiting");
    console.log("Várakozó lett:", socket.id);
  } else {
    // találtunk párt
    const roomId = `room_${waitingSocket.id}_${socket.id}`;
    waitingSocket.join(roomId);
    socket.join(roomId);

    // értesítjük mindkettőt
    waitingSocket.emit("match", { roomId, partnerId: socket.id });
    socket.emit("match", { roomId, partnerId: waitingSocket.id });

    console.log("Pár kész:", roomId);

    waitingSocket = null; // felszabadítjuk a várakozót
  }

  // üzenetek szobán belül
  socket.on("message", ({ roomId, text }) => {
    socket.to(roomId).emit("message", { text });
  });

  socket.on("disconnect", () => {
    console.log("Kilépett:", socket.id);
    if (waitingSocket && waitingSocket.id === socket.id) {
      waitingSocket = null;
    }
    // a szobákból való kilépést a kliens oldalon egyszerűen úgy kezeljük,
    // hogy partner_left eseményt küldünk, ha kell – ezt később bővíthetjük.
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Szerver fut port:", PORT);
});

// gyökér GET csak teszthez
app.get("/", (req, res) => {
  res.send("Anotalk-szerű matchmaking szerver fut.");
});
