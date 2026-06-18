#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACK_DIR="$ROOT_DIR/back"
FRONT_DIR="$ROOT_DIR/front"
FRONT_PORT="${FRONT_PORT:-3000}"
UPLOADS_DIR="$BACK_DIR/uploads"

find_java_home() {
  local candidates=(
    "${JAVA_HOME:-}"
    "$HOME/.local/opt/jdk-21.0.11+10"
    "/usr/lib/jvm/java-21-openjdk-amd64"
    "/usr/lib/jvm/java-21-openjdk"
    "/usr/lib/jvm/default-java"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -n "$candidate" && -x "$candidate/bin/java" ]]; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

MVN_BIN="${MAVEN_BIN:-}"
if [[ -z "$MVN_BIN" ]]; then
  if command -v mvn >/dev/null 2>&1; then
    MVN_BIN="$(command -v mvn)"
  elif [[ -x "$HOME/.local/bin/mvn" ]]; then
    MVN_BIN="$HOME/.local/bin/mvn"
  fi
fi

if [[ -z "$MVN_BIN" ]]; then
  echo "Maven no encontrado. Instalalo o definí MAVEN_BIN." >&2
  exit 1
fi

if JAVA_HOME_VALUE="$(find_java_home)"; then
  export JAVA_HOME="$JAVA_HOME_VALUE"
  export PATH="$JAVA_HOME/bin:$PATH"
else
  echo "Java no encontrado. Instalalo o definí JAVA_HOME." >&2
  exit 1
fi

rm -rf "$UPLOADS_DIR"

cleanup() {
  if [[ -n "${BACK_PID:-}" ]] && kill -0 "$BACK_PID" 2>/dev/null; then
    kill "$BACK_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONT_PID:-}" ]] && kill -0 "$FRONT_PID" 2>/dev/null; then
    kill "$FRONT_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Iniciando backend en http://localhost:8080 ..."
(cd "$BACK_DIR" && "$MVN_BIN" spring-boot:run) &
BACK_PID=$!

echo "Iniciando frontend en http://localhost:${FRONT_PORT} ..."
(cd "$FRONT_DIR" && python3 -m http.server "$FRONT_PORT") &
FRONT_PID=$!

wait -n "$BACK_PID" "$FRONT_PID"
