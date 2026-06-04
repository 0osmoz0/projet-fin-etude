"""
Workstation Kali — exécute tout binaire présent dans PATH (résolution dynamique).
"""
from __future__ import annotations

import os
import re
import shlex
import shutil
import subprocess
import time
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="OMEGA Workstation Kali", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

BLOCKED_TOOLS = frozenset(
    {
        "sudo",
        "su",
        "rm",
        "rmdir",
        "mkfs",
        "dd",
        "shutdown",
        "reboot",
        "halt",
        "poweroff",
        "init",
        "systemctl",
        "mount",
        "umount",
        "chroot",
        "killall",
        "pkill",
    }
)

# Alias shell → paquet Kali
TOOL_ALIASES: dict[str, str] = {
    "nc": "nc",
    "netcat": "nc",
    "ncat": "ncat",
    "set": "setoolkit",
    "zap": "zaproxy",
    "beef": "beef-xss",
    "beef-xss": "beef-xss",
    "r2": "radare2",
    "vol": "volatility",
    "msfdb": "msfdb",
    "kat": "kali-tools",
}

# Outils GUI / interactifs : variante batch headless
HEADLESS_ARGS: dict[str, list[str]] = {
    "msfconsole": ["-q", "-x", "version; help; exit -y"],
    "msfvenom": ["-h"],
    "burpsuite": ["--help"],
    "wireshark": ["-v"],
    "maltego": ["--help"],
    "armitage": ["--help"],
    "ettercap": ["-h"],
    "beef": ["-h"],
    "beef-xss": ["-h"],
}

TOOL_FALLBACK_BIN: dict[str, str] = {
    "wireshark": "tshark",
    "burpsuite": "zaproxy",
}

HOST_ALIASES: dict[str, str] = {
    "pivot": "blacktide_gateway",
    "gateway": "blacktide_gateway",
    "blacktide": "blacktide_gateway",
    "partner": "blacktide_gateway",
    "cctv": "cctv",
    "alarm": "alarm",
    "vault": "vault",
    "localhost": "host.docker.internal",
    "127.0.0.1": "host.docker.internal",
    "hub": "host.docker.internal",
    "omega-poste": "host.docker.internal",
    "kali": "host.docker.internal",
}

URL_REWRITES: dict[str, str] = {
    "http://localhost:18080": "http://host.docker.internal:18080",
    "http://127.0.0.1:18080": "http://host.docker.internal:18080",
    "http://localhost:18081": "http://blacktide_gateway:8080",
    "http://127.0.0.1:18081": "http://blacktide_gateway:8080",
    "http://localhost:8081": "http://blacktide_gateway:8080",
    "http://127.0.0.1:8081": "http://blacktide_gateway:8080",
}

SAFE_ARG = re.compile(r"^[a-zA-Z0-9._@:/=%+\[\],*#~;,!_-]+$")
MAX_TIMEOUT = 300
MAX_OUTPUT = 768_000
PATH_ENV = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"


class RunRequest(BaseModel):
    tool: str = Field(..., min_length=1, max_length=80)
    args: list[str] = Field(default_factory=list, max_length=96)
    session: str = Field(default="local", max_length=16)


class RunResponse(BaseModel):
    ok: bool
    tool: str
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: int
    executed: bool
    fallback: bool = False
    reason: str | None = None
    binary: str | None = None


def normalize_tool(name: str) -> str:
    name = name.strip().lower()
    if name.startswith("/"):
        name = os.path.basename(name)
    return name


def resolve_binary(tool: str) -> str | None:
    tool = normalize_tool(tool)
    if tool in BLOCKED_TOOLS:
        return None
    candidates = [tool]
    if tool in TOOL_ALIASES:
        candidates.insert(0, TOOL_ALIASES[tool])
    if tool in TOOL_FALLBACK_BIN:
        candidates.append(TOOL_FALLBACK_BIN[tool])
    seen: set[str] = set()
    for cand in candidates:
        if cand in seen:
            continue
        seen.add(cand)
        path = shutil.which(cand, path=PATH_ENV)
        if path and path.startswith("/"):
            return path
    return None


def validate_args(args: list[str]) -> list[str]:
    out: list[str] = []
    for raw in args:
        if len(raw) > 1024:
            raise HTTPException(status_code=400, detail="argument too long")
        if not SAFE_ARG.match(raw) or ".." in raw:
            raise HTTPException(status_code=400, detail=f"invalid argument: {raw!r}")
        out.append(raw)
    return out


def rewrite_host_token(token: str) -> str:
    low = token.lower()
    if low in HOST_ALIASES:
        return HOST_ALIASES[low]
    for src, dst in URL_REWRITES.items():
        if token.startswith(src):
            return dst + token[len(src) :]
    if ":" in token and not token.startswith("-"):
        host, sep, rest = token.partition(":")
        if host.lower() in HOST_ALIASES:
            return f"{HOST_ALIASES[host.lower()]}{sep}{rest}"
    return token


def rewrite_args(_tool: str, args: list[str]) -> list[str]:
    out: list[str] = []
    for a in args:
        if a.startswith("-"):
            out.append(a)
        else:
            out.append(rewrite_host_token(a))
    return out


def default_args(tool: str, args: list[str]) -> list[str]:
    if args:
        return args
    if tool in HEADLESS_ARGS:
        return list(HEADLESS_ARGS[tool])
    return ["--help"] if tool not in ("nmap", "ping", "nc", "netcat") else args


def build_command(tool: str, args: list[str]) -> tuple[list[str], str | None]:
    binary = resolve_binary(tool)
    if not binary:
        return [], None
    safe = rewrite_args(tool, validate_args(default_args(tool, args)))
    if tool == "ping" and "-c" not in safe:
        safe = ["-c", "4", *safe]
    if tool == "nikto" and safe and safe[0].startswith("http") and "-h" not in safe:
        safe = ["-h", *safe]
    return [binary, *safe], binary


def count_path_bins() -> int:
    n = 0
    for directory in PATH_ENV.split(":"):
        if not os.path.isdir(directory):
            continue
        try:
            n += sum(1 for entry in os.listdir(directory) if os.path.isfile(os.path.join(directory, entry)))
        except OSError:
            continue
    return n


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "mode": "kali-dynamic",
        "distribution": "Kali GNU/Linux Rolling",
        "path_execution": True,
        "bins_in_path": count_path_bins(),
        "version": "2026.1",
    }


@app.get("/api/v1/tools")
def list_tools() -> dict[str, Any]:
    return {
        "mode": "dynamic",
        "note": "Tout outil Kali présent dans PATH est exécutable (sauf liste noire).",
        "bins_in_path": count_path_bins(),
    }


@app.post("/api/v1/run", response_model=RunResponse)
def run_tool(req: RunRequest) -> RunResponse:
    tool = normalize_tool(req.tool)
    cmd, binary = build_command(tool, req.args)
    if not cmd or not binary:
        return RunResponse(
            ok=False,
            tool=tool,
            exit_code=127,
            stdout="",
            stderr=f"{tool}: command not found in Kali PATH",
            duration_ms=0,
            executed=False,
            fallback=True,
            reason="not_installed",
            binary=None,
        )

    start = time.monotonic()
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=MAX_TIMEOUT,
            env={
                "PATH": PATH_ENV,
                "HOME": os.environ.get("HOME", "/home/workstation"),
                "TERM": "xterm-256color",
                "LANG": "C.UTF-8",
            },
        )
    except subprocess.TimeoutExpired:
        elapsed = int((time.monotonic() - start) * 1000)
        return RunResponse(
            ok=False,
            tool=tool,
            exit_code=124,
            stdout="",
            stderr=f"{tool}: timeout ({MAX_TIMEOUT}s)",
            duration_ms=elapsed,
            executed=True,
            fallback=False,
            binary=binary,
        )

    elapsed = int((time.monotonic() - start) * 1000)
    out = (proc.stdout or "")[:MAX_OUTPUT]
    err = (proc.stderr or "")[:MAX_OUTPUT]
    header = f"[workstation:kali] {' '.join(shlex.quote(x) for x in cmd)}"
    merged = header + ("\n" + out if out else "")

    return RunResponse(
        ok=proc.returncode == 0,
        tool=tool,
        exit_code=int(proc.returncode),
        stdout=merged.strip("\n"),
        stderr=err.strip("\n"),
        duration_ms=elapsed,
        executed=True,
        fallback=False,
        binary=binary,
    )
