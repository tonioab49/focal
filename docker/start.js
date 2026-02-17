const { spawn } = require("node:child_process");
const fs = require("node:fs");

const processes = [];
let shuttingDown = false;

function start(name, command, args, env = process.env) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env,
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    console.error(`[runtime] ${name} exited (code=${code}, signal=${signal})`);
    shutdown(code ?? 1);
  });

  processes.push({ name, child });
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const { child } of processes) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    for (const { child } of processes) {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }
  }, 5000).unref();

  setTimeout(() => process.exit(exitCode), 0);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const externalPort = process.env.PORT || "4000";
const nextInternalPort = process.env.NEXT_INTERNAL_PORT || "3000";
const hocuspocusPort = process.env.HOCUSPOCUS_PORT || "1236";

const nginxTemplatePath = "/etc/nginx/http.d/default.conf.template";
const nginxConfigPath = "/etc/nginx/http.d/default.conf";
const nginxConfig = fs
  .readFileSync(nginxTemplatePath, "utf8")
  .replaceAll("__PORT__", externalPort)
  .replaceAll("__NEXT_INTERNAL_PORT__", nextInternalPort)
  .replaceAll("__HOCUSPOCUS_PORT__", hocuspocusPort);
fs.writeFileSync(nginxConfigPath, nginxConfig, "utf8");

start("next", "node", ["server.js"], {
  ...process.env,
  PORT: nextInternalPort,
});

start("hocuspocus", "node", ["dist-server/hocuspocus.js"], {
  ...process.env,
  HOCUSPOCUS_PORT: hocuspocusPort,
});

start("nginx", "nginx", ["-g", "pid /tmp/nginx.pid; daemon off;"]);
