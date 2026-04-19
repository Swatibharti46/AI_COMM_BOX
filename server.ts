import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // IPL Match state
  let matchData = {
    teamA: "Mumbai Indians",
    teamB: "Chennai Super Kings",
    scoreA: 182,
    scoreB: 145,
    overs: 16.4,
    wicketsA: 4,
    wicketsB: 7,
    lastEvent: "Bumrah with a deadly yorker! WICKET!",
    isAirQualityWarning: false, // Just for realism/flavor
    venue: "Wankhede Stadium, Mumbai",
  };

  const funnyFanComments = [
    "RCB fan here, still looking for the calculator. 🧮",
    "Thala for a reason! Entry alone fixed the vibes. 😎",
    "Apun ke pass Rohit hai, tension kaiko lene ka? 🏏",
    "Someone tell the DJ to play 'Zhingat', we need the energy!",
    "My neighbor shouted so loud his dentures fell out. 💀",
    "Wait, is that a Mango in the dugout? Naveen-ul-Haq context? 🥭",
    "Pitch reporting: It's slower than my career growth.",
    "Captaincy changes more frequent than my diet plans.",
  ];

  // Mock match evolution
  setInterval(() => {
    const events = [
      "Vada Pav power! Rohit sweeps for 4!",
      "Sir Jadeja with a bullet throw! Direct hit!",
      "Hardik hits one into the Arabian Sea! SIX!",
      "Sky with a 360-degree scoop! Incredible!",
      "Kohli staring at the bowler. Aggression peaking!",
      "Commentator curse: 'He's playing so well...' OUT!",
      "MS Dhoni behind the stumps. Everyone is alert.",
      "Strategic Timeout: Time for some ads we've seen 100 times.",
    ];
    
    // Simple state progression
    matchData.overs = Number((matchData.overs + 0.1).toFixed(1));
    if (Math.floor(matchData.overs * 10) % 6 === 0) {
      matchData.overs = Math.floor(matchData.overs) + 1;
    }

    const eventIdx = Math.floor(Math.random() * events.length);
    const event = events[eventIdx];
    
    // Add some random score progression
    if (event.includes("4")) matchData.scoreB += 4;
    if (event.includes("SIX")) matchData.scoreB += 6;
    if (event.includes("OUT") || event.includes("WICKET")) matchData.wicketsB += 1;
    
    matchData.lastEvent = event;
    io.emit("match_update", matchData);

    // Randomly inject a funny fan comment
    if (Math.random() > 0.5) {
      const chatIdx = Math.floor(Math.random() * funnyFanComments.length);
      io.emit("chat_update", {
        user: `Fan_${Math.floor(Math.random() * 99) + 1}`,
        text: funnyFanComments[chatIdx],
        timestamp: new Date().toISOString(),
      });
    }
  }, 12000); 

  io.on("connection", (socket) => {
    console.log("A fan joined the comm-box:", socket.id);
    socket.emit("match_update", matchData);

    socket.on("chat_message", (msg) => {
      // Broadcast chat message
      io.emit("chat_update", {
        user: msg.user || "Anonymous Fan",
        text: msg.text,
        timestamp: new Date().toISOString(),
      });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`The AI Comm-Box is live at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
