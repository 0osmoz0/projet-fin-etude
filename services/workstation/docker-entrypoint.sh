#!/bin/bash
set -euo pipefail

export DISPLAY="${DISPLAY:-:99}"
export HOME="${HOME:-/home/workstation}"
export LANG="${LANG:-C.UTF-8}"

start_gui_stack() {
  if [ -f /tmp/omega-gui-ready ]; then
    return 0
  fi

  rm -f /tmp/.X99-lock /tmp/.X11-unix/X99 2>/dev/null || true

  Xvfb :99 -screen 0 1280x800x24 -ac +extension RANDR +extension GLX -noreset \
    >/tmp/xvfb.log 2>&1 &
  for _ in $(seq 1 30); do
    [ -S /tmp/.X11-unix/X99 ] && break
    sleep 0.2
  done

  dbus-run-session -- openbox-session >/tmp/openbox.log 2>&1 &
  sleep 1

  x11vnc -display :99 -forever -shared -rfbport 5900 -nopw -localhost -noxdamage \
    >/tmp/x11vnc.log 2>&1 &

  websockify --web=/usr/share/novnc/ 0.0.0.0:6080 localhost:5900 >/tmp/novnc.log 2>&1 &

  touch /tmp/omega-gui-ready
}

start_gui_stack

exec /app/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
