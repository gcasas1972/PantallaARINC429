(function () {
  const airplane = document.getElementById("airplane");
  const slipBall = document.getElementById("slipBall");
  const rollValue = document.getElementById("rollValue");
  const pitchValue = document.getElementById("pitchValue");
  const yawValue = document.getElementById("yawValue");
  const socketStatus = document.getElementById("socketStatus");
  const unitSelect = document.getElementById("unitSelect");
  const finalValues = document.getElementById("finalValues");
  const simulatorView = document.getElementById("simulatorView");
  const resultsView = document.getElementById("resultsView");
  const sendDataButton = document.getElementById("sendDataButton");
  const backButton = document.getElementById("backButton");
  const resetButton = document.getElementById("resetButton");
  const newButton = document.getElementById("newButton");
  const resultRoll = document.getElementById("resultRoll");
  const resultPitch = document.getElementById("resultPitch");
  const resultYaw = document.getElementById("resultYaw");
  const resultAngle = document.getElementById("resultAngle");
  const resultBall = document.getElementById("resultBall");
  const resultStatus = document.getElementById("resultStatus");
  const resultTimestamp = document.getElementById("resultTimestamp");
  const rollInput = document.getElementById("rollInput");
  const pitchInput = document.getElementById("pitchInput");
  const yawInput = document.getElementById("yawInput");
  const slipInput = document.getElementById("slipInput");
  const turnGainInput = document.getElementById("turnGain");
  const ballTrimInput = document.getElementById("ballTrim");
  const smoothGainInput = document.getElementById("smoothGain");

  const state = {
    roll: 0,
    pitch: 0,
    yaw: 0,
    slip: 0
  };

  const visual = {
    angle: 0,
    ball: 0
  };

  const target = {
    angle: 0,
    ball: 0
  };

  let socket = null;
  let animationFrame = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function readNumber(input) {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : 0;
  }

  function formatAngle(value, unit) {
    if (unit === "rad") return `${(value * Math.PI / 180).toFixed(3)} rad`;
    return `${value.toFixed(1)}°`;
  }

  function formatRate(value, unit) {
    if (unit === "rad") return `${(value * Math.PI / 180).toFixed(3)} rad/s`;
    return `${value.toFixed(1)}°/s`;
  }

  function formatDegrees(value) {
    return `${value.toFixed(1)}°`;
  }

  function setSocketStatus(text, connected) {
    socketStatus.textContent = text;
    socketStatus.classList.toggle("connected", connected);
  }

  function connectSocket() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      socket = new WebSocket("ws://localhost:8080");
    } catch (error) {
      setSocketStatus("WS error", false);
      return;
    }

    socket.addEventListener("open", function () {
      setSocketStatus("WS conectado", true);
      sendData();
    });

    socket.addEventListener("close", function () {
      setSocketStatus("WS desconectado", false);
      window.setTimeout(connectSocket, 1600);
    });

    socket.addEventListener("error", function () {
      setSocketStatus("WS error", false);
    });
  }

  function sendData() {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({
      roll: Number(state.roll.toFixed(2)),
      pitch: Number(state.pitch.toFixed(2)),
      yaw: Number(state.yaw.toFixed(2))
    }));
  }

  function updateReadouts() {
    const unit = unitSelect.value;
    const rollText = formatAngle(state.roll, unit);
    const pitchText = formatAngle(state.pitch, unit);
    const yawText = formatRate(state.yaw, unit);

    rollValue.textContent = rollText;
    pitchValue.textContent = pitchText;
    yawValue.textContent = yawText;
    finalValues.textContent = `Roll: ${rollText} · Pitch: ${pitchText} · Yaw: ${yawText}`;
  }

  function updateTargets() {
    const turnGain = Number(turnGainInput.value);
    const ballTrim = Number(ballTrimInput.value);

    state.roll = readNumber(rollInput);
    state.pitch = readNumber(pitchInput);
    state.yaw = readNumber(yawInput);
    state.slip = readNumber(slipInput);

    target.angle = clamp(state.yaw * 10 * turnGain, -38, 38);
    target.ball = clamp(state.slip * 18 + ballTrim, -58, 58);

    updateReadouts();
    sendData();
    startInterpolation();
  }

  function ballPositionText(value) {
    if (Math.abs(value) < 6) return "Centrada";
    return value < 0 ? "Izquierda" : "Derecha";
  }

  function turnStatus() {
    const status = [];
    const yawAbs = Math.abs(state.yaw);

    if (yawAbs < 0.05) {
      status.push("Vuelo recto");
    } else {
      status.push(state.yaw < 0 ? "Viraje a la izquierda" : "Viraje a la derecha");
      if (Math.abs(yawAbs - 3) <= 0.35) status.push("Viraje estándar");
    }

    if (state.slip > 0.05) status.push("Derrape");
    if (state.slip < -0.05) status.push("Resbale");

    return status.join(" · ");
  }

  function updateResults() {
    const unit = unitSelect.value;

    resultRoll.textContent = formatAngle(state.roll, unit);
    resultPitch.textContent = formatAngle(state.pitch, unit);
    resultYaw.textContent = formatRate(state.yaw, unit);
    resultAngle.textContent = formatDegrees(target.angle);
    resultBall.textContent = ballPositionText(target.ball);
    resultStatus.textContent = turnStatus();
    resultTimestamp.textContent = new Date().toLocaleString();
  }

  function showResults() {
    updateTargets();
    updateResults();
    sendData();
    simulatorView.classList.add("hidden");
    resultsView.classList.remove("hidden");
  }

  function showSimulator() {
    resultsView.classList.add("hidden");
    simulatorView.classList.remove("hidden");
  }

  function resetSimulation() {
    rollInput.value = "0";
    pitchInput.value = "0";
    yawInput.value = "0";
    slipInput.value = "0";
    ballTrimInput.value = "0";
    unitSelect.value = "deg";
    updateTargets();
    updateResults();
  }

  function render() {
    const smoothing = Number(smoothGainInput.value);

    visual.angle += (target.angle - visual.angle) * smoothing;
    visual.ball += (target.ball - visual.ball) * smoothing;

    airplane.style.transform = `rotate(${visual.angle}deg)`;
    slipBall.style.transform = `translateX(${visual.ball}px)`;

    const angleSettled = Math.abs(target.angle - visual.angle) < 0.02;
    const ballSettled = Math.abs(target.ball - visual.ball) < 0.02;

    if (angleSettled && ballSettled) {
      visual.angle = target.angle;
      visual.ball = target.ball;
      airplane.style.transform = `rotate(${visual.angle}deg)`;
      slipBall.style.transform = `translateX(${visual.ball}px)`;
      animationFrame = null;
      return;
    }

    animationFrame = requestAnimationFrame(render);
  }

  function startInterpolation() {
    if (animationFrame) return;
    animationFrame = requestAnimationFrame(render);
  }

  [
    rollInput,
    pitchInput,
    yawInput,
    slipInput,
    unitSelect,
    turnGainInput,
    ballTrimInput,
    smoothGainInput
  ].forEach((control) => {
    control.addEventListener("input", updateTargets);
    control.addEventListener("change", updateTargets);
  });

  sendDataButton.addEventListener("click", showResults);
  backButton.addEventListener("click", showSimulator);
  resetButton.addEventListener("click", resetSimulation);
  newButton.addEventListener("click", function () {
    resetSimulation();
    showSimulator();
  });

  connectSocket();
  updateTargets();
})();
