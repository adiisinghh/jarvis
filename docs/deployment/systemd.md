# systemd Service (Linux)

Jarvis includes a systemd unit file for running the API server as a managed background service on Linux. This provides automatic startup on boot, crash recovery, and integration with standard Linux service management tools.

## Prerequisites

Before installing the service, ensure that:

1. Jarvis is installed in a virtual environment at `/opt/jarvis/.venv` (or adjust paths accordingly).
2. A dedicated `jarvis` system user exists (recommended for security).
3. An inference engine (such as Ollama) is running and accessible.

Create the user and installation directory:

```bash
sudo useradd --system --create-home --home-dir /opt/jarvis jarvis
sudo -u jarvis python3 -m venv /opt/jarvis/.venv
sudo -u jarvis git clone https://github.com/adiisinghh/jarvis.git /opt/jarvis/Jarvis
cd /opt/jarvis/Jarvis && sudo -u jarvis uv sync --extra server
```

## Installing the Service

The unit binds `0.0.0.0`, so an **API key is required** — and the unit
declares `EnvironmentFile=/etc/jarvis/env` (no `-` prefix), so it will
**fail to start** until that file exists with a key. Create it first:

```bash
sudo mkdir -p /etc/jarvis
echo "JARVIS_API_KEY=$(jarvis auth generate-key)" | sudo tee /etc/jarvis/env
sudo chmod 600 /etc/jarvis/env
```

Then copy the unit file, reload the daemon, and enable the service:

```bash
sudo cp deploy/systemd/jarvis.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable jarvis
sudo systemctl start jarvis
```

Clients must send `Authorization: Bearer <key>` on `/v1/*` and `/api/*`
requests. (If you instead bind to `127.0.0.1`, the key is optional and you
can drop the `EnvironmentFile` line.)

Verify it is running:

```bash
sudo systemctl status jarvis
```

## Service File Reference

The provided unit file at `deploy/systemd/jarvis.service`:

```ini
[Unit]
Description=Jarvis API Server
After=network.target

[Service]
Type=simple
User=jarvis
WorkingDirectory=/opt/jarvis
ExecStart=/opt/jarvis/.venv/bin/jarvis serve --host 0.0.0.0 --port 8000
Restart=on-failure
RestartSec=5
Environment=HOME=/opt/jarvis

[Install]
WantedBy=multi-user.target
```

### `[Unit]` Section

| Directive     | Value              | Description                                                                 |
|---------------|--------------------|-----------------------------------------------------------------------------|
| `Description` | `Jarvis API Server` | Human-readable name shown in `systemctl status` and logs.              |
| `After`       | `network.target`   | Delays startup until the network stack is available, since the server binds to a network socket and may need to reach a remote engine. |

### `[Service]` Section

| Directive          | Value                                                              | Description                                                                                     |
|--------------------|--------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| `Type`             | `simple`                                                           | The process started by `ExecStart` is the main service process. systemd considers the service started immediately. |
| `User`             | `jarvis`                                                       | Runs the server as the `jarvis` user rather than root, limiting the blast radius of any security issue. |
| `WorkingDirectory` | `/opt/jarvis`                                                  | Sets the working directory for the process. This is where Jarvis looks for local files and writes data. |
| `ExecStart`        | `/opt/jarvis/.venv/bin/jarvis serve --host 0.0.0.0 --port 8000` | The command to start the server. Uses the full path to the `jarvis` binary inside the virtual environment. |
| `Restart`          | `on-failure`                                                       | Automatically restarts the service if it exits with a non-zero exit code. Does not restart on clean shutdown (`systemctl stop`). |
| `RestartSec`       | `5`                                                                | Waits 5 seconds before attempting a restart, preventing rapid restart loops if the service crashes immediately on startup. |
| `Environment`      | `HOME=/opt/jarvis`                                             | Sets the `HOME` environment variable so Jarvis finds its configuration at `~/.jarvis/config.toml` (resolving to `/opt/jarvis/.jarvis/config.toml`). |

### `[Install]` Section

| Directive    | Value               | Description                                                                                 |
|--------------|---------------------|---------------------------------------------------------------------------------------------|
| `WantedBy`   | `multi-user.target` | The service starts when the system reaches multi-user mode (standard boot target for servers). `systemctl enable` creates a symlink under this target. |

## Configuration Options

### Changing the Bind Address and Port

Edit the `ExecStart` line to change the host or port:

```ini
ExecStart=/opt/jarvis/.venv/bin/jarvis serve --host 127.0.0.1 --port 9000
```

!!! tip
    Binding to `127.0.0.1` restricts access to localhost only. Use this when running behind a reverse proxy like Nginx or Caddy.

### Setting the Engine and Model

Pass additional flags to `jarvis serve`:

```ini
ExecStart=/opt/jarvis/.venv/bin/jarvis serve --host 0.0.0.0 --port 8000 --engine ollama --model qwen3:8b
```

### Adding Environment Variables

Add multiple `Environment` directives or use `EnvironmentFile` for complex configurations:

```ini
[Service]
Environment=HOME=/opt/jarvis
Environment=JARVIS_ENGINE_DEFAULT=vllm
Environment=JARVIS_OLLAMA_HOST=http://localhost:11434
```

Or load from a file:

```ini
[Service]
EnvironmentFile=/opt/jarvis/.env
```

### Changing the User

If you prefer a different service user, update both the `User` directive and the paths:

```ini
[Service]
User=myuser
WorkingDirectory=/home/myuser/jarvis
ExecStart=/home/myuser/jarvis/.venv/bin/jarvis serve --host 0.0.0.0 --port 8000
Environment=HOME=/home/myuser/jarvis
```

### Using a Configuration File

Ensure the configuration file exists at the path where `HOME` points:

```bash
sudo -u jarvis mkdir -p /opt/jarvis/.jarvis
sudo -u jarvis cp config.toml /opt/jarvis/.jarvis/config.toml
```

The server reads `~/.jarvis/config.toml` on startup, where `~` resolves from the `HOME` environment variable.

## Viewing Logs

Jarvis logs are captured by journald. View them with `journalctl`:

```bash
# View all logs for the service
sudo journalctl -u jarvis

# Follow logs in real time
sudo journalctl -u jarvis -f

# View logs since the last boot
sudo journalctl -u jarvis -b

# View logs from the last hour
sudo journalctl -u jarvis --since "1 hour ago"

# View only error-level messages
sudo journalctl -u jarvis -p err
```

## Managing the Service

### Start, Stop, and Restart

```bash
# Start the service
sudo systemctl start jarvis

# Stop the service
sudo systemctl stop jarvis

# Restart the service (stop + start)
sudo systemctl restart jarvis

# Reload configuration without full restart (sends SIGHUP)
sudo systemctl reload-or-restart jarvis
```

### Check Status

```bash
sudo systemctl status jarvis
```

Example output:

```
● jarvis.service - Jarvis API Server
     Loaded: loaded (/etc/systemd/system/jarvis.service; enabled; preset: enabled)
     Active: active (running) since Fri 2026-02-21 10:00:00 UTC; 2h ago
   Main PID: 12345 (jarvis)
      Tasks: 4 (limit: 4915)
     Memory: 256.0M
        CPU: 1min 23s
     CGroup: /system.slice/jarvis.service
             └─12345 /opt/jarvis/.venv/bin/python /opt/jarvis/.venv/bin/jarvis serve --host 0.0.0.0 --port 8000
```

### Enable and Disable on Boot

```bash
# Enable automatic start on boot
sudo systemctl enable jarvis

# Disable automatic start on boot
sudo systemctl disable jarvis
```

### Apply Changes After Editing the Unit File

After modifying `/etc/systemd/system/jarvis.service`, reload the systemd daemon and restart the service:

```bash
sudo systemctl daemon-reload
sudo systemctl restart jarvis
```

## Running Alongside Ollama

If Ollama is also managed via systemd, you can add an ordering dependency so the Jarvis service waits for Ollama to start:

```ini
[Unit]
Description=Jarvis API Server
After=network.target ollama.service
Requires=ollama.service
```

| Directive  | Description                                                              |
|------------|--------------------------------------------------------------------------|
| `After`    | Ensures Jarvis starts after Ollama.                                  |
| `Requires` | If Ollama fails to start, Jarvis will not start either.              |

!!! note
    Use `Wants` instead of `Requires` if you want Jarvis to start even when Ollama is unavailable (for example, if you plan to start Ollama manually later).
