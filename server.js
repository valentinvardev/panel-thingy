// Panel para la API de SMM World (uso personal en red local).
// Acciones permitidas: balance, services, status (consulta) y add (coloca ordenes).
// Node 22 (fetch y http nativos, sin dependencias). Arranca con: node server.js

const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PORT = process.env.PORT || 3000;
const API_URL = "https://smmworld.org/api/v2";

// Config: API key del servidor y credenciales de acceso.
// Lee config.json (no se versiona); las variables de entorno tienen prioridad.
let config = {};
try {
  config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
} catch { /* sin archivo: se usan variables de entorno o valores por defecto */ }
const SMM_KEY = process.env.SMM_KEY || config.smmKey || "";
const AUTH_USER = process.env.APP_USER || config.user || "admin";
const AUTH_PASS = process.env.APP_PASSWORD || config.password || "";

// Lista blanca: consulta (balance, services, status) y colocacion de ordenes (add).
const ALLOWED_ACTIONS = new Set(["balance", "services", "status", "add"]);

// Basic Auth: protege toda la app. Si no hay password configurada, no exige login.
function authOk(req) {
  if (!AUTH_PASS) return true;
  const m = /^Basic\s+(.+)$/i.exec(req.headers["authorization"] || "");
  if (!m) return false;
  const i = Buffer.from(m[1], "base64").toString("utf8").indexOf(":");
  const u = i < 0 ? "" : Buffer.from(m[1], "base64").toString("utf8").slice(0, i);
  const p = i < 0 ? "" : Buffer.from(m[1], "base64").toString("utf8").slice(i + 1);
  return u === AUTH_USER && p === AUTH_PASS;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  // Puerta de entrada: si hay password, exige Basic Auth en todas las rutas.
  if (!authOk(req)) {
    res.writeHead(401, {
      "WWW-Authenticate": 'Basic realm="SMM Panel", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    });
    res.end("Autenticacion requerida.");
    return;
  }

  // Servir la pagina
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    fs.readFile(path.join(__dirname, "index.html"), (err, data) => {
      if (err) return send(res, 500, { error: "No se pudo leer index.html" });
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(data);
    });
    return;
  }

  // Proxy hacia la API (evita CORS y mantiene la key fuera del navegador del cliente)
  if (req.method === "POST" && req.url === "/proxy") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) req.destroy(); // corta payloads absurdos
    });
    req.on("end", async () => {
      let params;
      try {
        params = JSON.parse(raw || "{}");
      } catch {
        return send(res, 400, { error: "JSON invalido" });
      }

      const action = params.action;
      if (!ALLOWED_ACTIONS.has(action)) {
        return send(res, 403, {
          error: `Accion no permitida: "${action}". Solo se permite ${[...ALLOWED_ACTIONS].join(", ")}.`,
        });
      }
      // La key la pone el servidor (config.json); si no hay, se acepta la del cliente.
      const key = SMM_KEY || params.key;
      if (!key) {
        return send(res, 400, { error: "Falta la API key (config.json → smmKey)." });
      }
      params.key = key;

      const form = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") form.append(k, v);
      }

      try {
        const apiRes = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        });
        const text = await apiRes.text();
        // Reenviamos tal cual; la API responde JSON.
        send(res, apiRes.status, text);
      } catch (e) {
        send(res, 502, { error: "Fallo al contactar la API", detail: String(e) });
      }
    });
    return;
  }

  send(res, 404, { error: "No encontrado" });
});

function lanAddresses() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] || []) {
      if (ni.family === "IPv4" && !ni.internal) out.push(ni.address);
    }
  }
  return out;
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n  SMM World — Panel (red local)`);
  console.log(`  Local:   http://localhost:${PORT}`);
  for (const ip of lanAddresses()) console.log(`  Red:     http://${ip}:${PORT}`);
  if (!SMM_KEY)  console.log(`  ⚠  Falta la API key:    define "smmKey" en config.json`);
  if (!AUTH_PASS) console.log(`  ⚠  Sin contraseña:      define "password" en config.json (acceso abierto en tu LAN)`);
  console.log("");
});
