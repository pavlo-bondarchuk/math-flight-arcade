import React, { useCallback, useEffect, useRef, useState } from "react";

const WIDTH = 820;
const HEIGHT = 560;
const PLAYER_WIDTH = 46;
const PLAYER_HEIGHT = 38;
const BLOCK_WIDTH = 104;
const BLOCK_HEIGHT = 58;
const MIN_SPEED = 0.72;
const MAX_SPEED = 1.85;
const ANSWER_FALL_SPEED = 1.22;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeProblem(level) {
  let operators = ["+"];
  if (level >= 3) {
    operators = ["+", "-"];
  }
  if (level >= 6) {
    operators = ["+", "-", "×"];
  }

  const operator = operators[randomInt(0, operators.length - 1)];
  let a = randomInt(2, Math.min(9 + level * 2, 36));
  let b = randomInt(1, Math.min(6 + level, 24));
  let answer = a + b;

  if (operator === "-") {
    if (b > a) {
      [a, b] = [b, a];
    }
    answer = a - b;
  }

  if (operator === "×") {
    a = randomInt(2, Math.min(5 + Math.floor(level / 2), 12));
    b = randomInt(2, Math.min(4 + Math.floor(level / 2), 12));
    answer = a * b;
  }

  return {
    text: `${a} ${operator} ${b}`,
    answer,
  };
}

function makeBlocks(answer) {
  let wrong = answer;
  while (wrong === answer) {
    wrong = Math.max(0, answer + randomInt(-9, 9));
  }

  return [
    { value: answer, correct: true },
    { value: wrong, correct: false },
  ]
    .sort(() => Math.random() - 0.5)
    .map((block, index) => ({
      ...block,
      x: index === 0 ? WIDTH * 0.28 - BLOCK_WIDTH / 2 : WIDTH * 0.72 - BLOCK_WIDTH / 2,
      y: -BLOCK_HEIGHT - randomInt(index * 90, index * 90 + 80),
      phase: Math.random() * Math.PI * 2,
    }));
}

function getBlockRect(block) {
  return {
    x: block.x,
    y: block.y,
    width: BLOCK_WIDTH,
    height: BLOCK_HEIGHT,
    scale: 1,
  };
}

function getPlayerRect(x, y) {
  return {
    x: x - PLAYER_WIDTH / 2,
    y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
  };
}

function drawPixelText(ctx, text, x, y, size = 18, align = "left", color = "#ffffff") {
  ctx.font = `900 ${size}px "Courier New", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#050814";
  ctx.fillText(text, x + 2, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export default function ArithmeticFlyCollectGame() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const keysRef = useRef({
    left: false,
    right: false,
    turbo: false,
    brake: false,
  });
  const playerXRef = useRef(WIDTH / 2);
  const playerYRef = useRef(HEIGHT - 78);
  const problemRef = useRef(makeProblem(1));
  const blocksRef = useRef(makeBlocks(problemRef.current.answer));
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const streakRef = useRef(0);
  const levelRef = useRef(1);
  const correctRef = useRef(0);
  const speedRef = useRef(0.82);
  const statusRef = useRef("idle");
  const flashRef = useRef({ color: null, time: 0 });
  const scrollRef = useRef(0);

  const [status, setStatus] = useState("idle");
  const [legendOpen, setLegendOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [problem, setProblem] = useState(problemRef.current);
  const [answerOptions, setAnswerOptions] = useState(blocksRef.current.map((block) => block.value));
  const [speed, setSpeed] = useState(speedRef.current);

  const syncUi = useCallback(() => {
    setScore(scoreRef.current);
    setLives(livesRef.current);
    setStreak(streakRef.current);
    setLevel(levelRef.current);
    setProblem(problemRef.current);
    setAnswerOptions(blocksRef.current.map((block) => block.value));
    setSpeed(speedRef.current);
  }, []);

  const nextRound = useCallback(() => {
    problemRef.current = makeProblem(levelRef.current);
    blocksRef.current = makeBlocks(problemRef.current.answer);
    speedRef.current = clamp(speedRef.current + 0.012, MIN_SPEED, MAX_SPEED);
    syncUi();
  }, [syncUi]);

  const setGameStatus = useCallback((nextStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const restartGame = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = 3;
    streakRef.current = 0;
    levelRef.current = 1;
    correctRef.current = 0;
    speedRef.current = 0.82;
    playerXRef.current = WIDTH / 2;
    playerYRef.current = HEIGHT - 78;
    flashRef.current = { color: null, time: 0 };
    scrollRef.current = 0;
    problemRef.current = makeProblem(1);
    blocksRef.current = makeBlocks(problemRef.current.answer);
    setLegendOpen(false);
    setGameStatus("running");
    syncUi();
  }, [setGameStatus, syncUi]);

  const resetGame = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = 3;
    streakRef.current = 0;
    levelRef.current = 1;
    correctRef.current = 0;
    speedRef.current = 0.82;
    playerXRef.current = WIDTH / 2;
    playerYRef.current = HEIGHT - 78;
    flashRef.current = { color: null, time: 0 };
    scrollRef.current = 0;
    problemRef.current = makeProblem(1);
    blocksRef.current = makeBlocks(problemRef.current.answer);
    setGameStatus("idle");
    syncUi();
  }, [setGameStatus, syncUi]);

  const loseLife = useCallback(
    (color = "#ff1744") => {
      livesRef.current -= 1;
      streakRef.current = 0;
      speedRef.current = clamp(speedRef.current + 0.08, MIN_SPEED, MAX_SPEED);
      flashRef.current = { color, time: 260 };

      if (livesRef.current <= 0) {
        setGameStatus("over");
      } else {
        nextRound();
      }

      syncUi();
    },
    [nextRound, setGameStatus, syncUi]
  );

  const collectBlock = useCallback(
    (block) => {
      if (statusRef.current !== "running") {
        return;
      }

      if (block.correct) {
        scoreRef.current += 1;
        streakRef.current += 1;
        correctRef.current += 1;
        speedRef.current = clamp(speedRef.current - 0.04, MIN_SPEED, MAX_SPEED);
        flashRef.current = { color: "#00ff75", time: 220 };

        if (correctRef.current > 0 && correctRef.current % 5 === 0) {
          levelRef.current += 1;
        }

        nextRound();
        syncUi();
        return;
      }

      loseLife("#ff1744");
    },
    [loseLife, nextRound, syncUi]
  );

  const pauseGame = useCallback(() => {
    if (statusRef.current === "running") {
      setGameStatus("paused");
    }
  }, [setGameStatus]);

  const resumeGame = useCallback(() => {
    if (statusRef.current === "paused") {
      lastTimeRef.current = 0;
      setGameStatus("running");
    }
  }, [setGameStatus]);

  const openLegend = useCallback(() => {
    if (statusRef.current === "running") {
      setGameStatus("paused");
    }
    setLegendOpen(true);
  }, [setGameStatus]);

  const closeLegend = useCallback(() => {
    setLegendOpen(false);
    if (statusRef.current === "paused") {
      lastTimeRef.current = 0;
      setGameStatus("running");
    }
  }, [setGameStatus]);

  const drawBackground = useCallback((ctx) => {
    ctx.fillStyle = "#050814";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#08143a");
    gradient.addColorStop(0.45, "#160532");
    gradient.addColorStop(1, "#03040c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 70; i += 1) {
      const x = (i * 97) % WIDTH;
      const y = (i * 53 + Math.floor(scrollRef.current * 0.45)) % Math.floor(HEIGHT * 0.66);
      const size = i % 7 === 0 ? 3 : 2;
      ctx.fillRect(x, y, size, size);
    }

    ctx.strokeStyle = "rgba(0, 229, 255, 0.34)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i += 1) {
      const y = 82 + ((i * 58 + scrollRef.current * 1.4) % (HEIGHT - 82));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255, 43, 214, 0.3)";
    for (let i = 0; i < 10; i += 1) {
      const x = (i * 94 + Math.floor(scrollRef.current * 0.22)) % WIDTH;
      ctx.beginPath();
      ctx.moveTo(x, 70);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }

    if (flashRef.current.color && flashRef.current.time > 0) {
      ctx.globalAlpha = clamp(flashRef.current.time / 260, 0, 0.42);
      ctx.fillStyle = flashRef.current.color;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.globalAlpha = 1;
    }
  }, []);

  const drawHud = useCallback(
    (ctx) => {
      ctx.fillStyle = "#050814";
      ctx.fillRect(0, 0, WIDTH, 70);
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, WIDTH, 70);
      drawPixelText(ctx, `Рахунок ${scoreRef.current}`, 18, 18, 20, "left");
      drawPixelText(ctx, problemRef.current.text, WIDTH / 2, 16, 30, "center", "#fff04a");
      drawPixelText(ctx, "☰", WIDTH - 42, 16, 28, "left", "#00e5ff");
    },
    []
  );

  const drawBlock = useCallback((ctx, block) => {
    const rect = getBlockRect(block);

    ctx.save();
    ctx.translate(Math.round(rect.x), Math.round(rect.y));
    ctx.fillStyle = "#160532";
    ctx.fillRect(0, 0, BLOCK_WIDTH, BLOCK_HEIGHT);
    ctx.fillStyle = block.correct ? "#00e5ff" : "#ff2bd6";
    ctx.fillRect(0, 0, BLOCK_WIDTH, 6);
    ctx.fillRect(0, BLOCK_HEIGHT - 6, BLOCK_WIDTH, 6);
    ctx.fillRect(0, 0, 6, BLOCK_HEIGHT);
    ctx.fillRect(BLOCK_WIDTH - 6, 0, 6, BLOCK_HEIGHT);
    ctx.fillStyle = "#fff04a";
    ctx.fillRect(10, 10, 10, 10);
    ctx.fillRect(BLOCK_WIDTH - 20, BLOCK_HEIGHT - 20, 10, 10);
    drawPixelText(ctx, String(block.value), BLOCK_WIDTH / 2, 17, 24, "center");
    ctx.restore();
  }, []);

  const drawPlayer = useCallback((ctx) => {
    const rect = getPlayerRect(playerXRef.current, playerYRef.current);

    ctx.save();
    ctx.translate(Math.round(rect.x), Math.round(rect.y));
    ctx.fillStyle = "#00e5ff";
    ctx.fillRect(18, 0, 10, 8);
    ctx.fillRect(12, 8, 22, 10);
    ctx.fillStyle = "#fff04a";
    ctx.fillRect(8, 18, 30, 8);
    ctx.fillStyle = "#2f6bff";
    ctx.fillRect(0, 26, 16, 8);
    ctx.fillRect(30, 26, 16, 8);
    ctx.fillStyle = "#ff2bd6";
    ctx.fillRect(18, 30, 10, 8);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(20, 10, 6, 6);

    if (keysRef.current.turbo) {
      ctx.fillStyle = "#ff8a00";
      ctx.fillRect(14, 38, 6, 12);
      ctx.fillRect(26, 38, 6, 12);
    }

    ctx.restore();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    drawBackground(ctx);
    blocksRef.current.forEach((block) => drawBlock(ctx, block));
    drawPlayer(ctx);
    drawHud(ctx);

    if (statusRef.current === "paused") {
      ctx.fillStyle = "rgba(5, 8, 20, 0.72)";
      ctx.fillRect(0, 70, WIDTH, HEIGHT - 70);
      drawPixelText(ctx, "ПАУЗА", WIDTH / 2, HEIGHT / 2 - 22, 34, "center", "#ffffff");
    }

    if (statusRef.current === "idle") {
      ctx.fillStyle = "rgba(5, 8, 20, 0.72)";
      ctx.fillRect(0, 70, WIDTH, HEIGHT - 70);
      drawPixelText(ctx, "Математичний політ", WIDTH / 2, HEIGHT / 2 - 78, 32, "center", "#fff04a");
      drawPixelText(ctx, "Лети й збирай відповіді", WIDTH / 2, HEIGHT / 2 - 28, 22, "center");
      drawPixelText(ctx, "Почати гру", WIDTH / 2, HEIGHT / 2 + 34, 22, "center", "#00e5ff");
    }

    if (statusRef.current === "over") {
      ctx.fillStyle = "rgba(5, 8, 20, 0.82)";
      ctx.fillRect(0, 70, WIDTH, HEIGHT - 70);
      drawPixelText(ctx, "Гру завершено", WIDTH / 2, HEIGHT / 2 - 64, 34, "center", "#ff2bd6");
      drawPixelText(ctx, `Результат ${scoreRef.current}`, WIDTH / 2, HEIGHT / 2 - 10, 24, "center");
      drawPixelText(ctx, "Почати заново", WIDTH / 2, HEIGHT / 2 + 46, 22, "center", "#00e5ff");
    }
  }, [drawBackground, drawBlock, drawHud, drawPlayer]);

  const tick = useCallback(
    (time) => {
      const previous = lastTimeRef.current || time;
      const delta = Math.min((time - previous) / 16.67, 2.2);
      lastTimeRef.current = time;

      if (statusRef.current === "running") {
        const turbo = keysRef.current.turbo ? 1.45 : 1;
        const brake = keysRef.current.brake ? 0.58 : 1;
        const fieldSpeed = (1.75 + Math.min(levelRef.current * 0.22, 2.2)) * speedRef.current * turbo * brake;
        const playerSpeed = 6.4 * delta * (keysRef.current.turbo ? 1.22 : 1) * (keysRef.current.brake ? 0.78 : 1);
        const forwardSpeed = 3.2 * delta;

        scrollRef.current += fieldSpeed * delta;

        if (keysRef.current.left) {
          playerXRef.current -= playerSpeed;
        }
        if (keysRef.current.right) {
          playerXRef.current += playerSpeed;
        }
        if (keysRef.current.turbo) {
          playerYRef.current -= forwardSpeed;
        } else if (keysRef.current.brake) {
          playerYRef.current += forwardSpeed * 1.15;
        } else {
          playerYRef.current += (HEIGHT - 78 - playerYRef.current) * 0.045 * delta;
        }

        playerYRef.current = clamp(playerYRef.current, HEIGHT - 190, HEIGHT - 62);
        playerXRef.current = clamp(playerXRef.current, 40, WIDTH - 40);

        blocksRef.current = blocksRef.current.map((block) => ({
          ...block,
          y: block.y + ANSWER_FALL_SPEED * speedRef.current * delta,
          x: block.x + Math.sin(time / 430 + block.phase) * 0.16 * delta,
        }));

        if (flashRef.current.time > 0) {
          flashRef.current.time -= 16.67 * delta;
        }

        const playerBox = getPlayerRect(playerXRef.current, playerYRef.current);

        const collected = blocksRef.current.find(
          (block) => {
            const blockBox = getBlockRect(block);

            return (
              blockBox.x < playerBox.x + playerBox.width &&
              blockBox.x + blockBox.width > playerBox.x &&
              blockBox.y < playerBox.y + playerBox.height &&
              blockBox.y + blockBox.height > playerBox.y
            );
          }
        );

        if (collected) {
          collectBlock(collected);
        } else if (blocksRef.current.every((block) => block.y > HEIGHT + BLOCK_HEIGHT)) {
          loseLife("#ff1744");
        }
      }

      render();
      rafRef.current = window.requestAnimationFrame(tick);
    },
    [collectBlock, loseLife, render]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.imageRendering = "pixelated";
    }
    render();
    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafRef.current);
    };
  }, [render, tick]);

  useEffect(() => {
    const handleDown = (event) => {
      const key = event.key.toLowerCase();

      if (key === "arrowleft" || key === "a") {
        keysRef.current.left = true;
      }
      if (key === "arrowright" || key === "d") {
        keysRef.current.right = true;
      }
      if (key === "arrowup") {
        keysRef.current.turbo = true;
      }
      if (key === "arrowdown") {
        keysRef.current.brake = true;
      }
      if (key === "escape") {
        pauseGame();
      }
      if (key === " ") {
        event.preventDefault();
        if (statusRef.current === "idle" || statusRef.current === "over") {
          restartGame();
          return;
        }
        if (statusRef.current === "running") {
          pauseGame();
          return;
        }
        resumeGame();
      }
    };

    const handleUp = (event) => {
      const key = event.key.toLowerCase();

      if (key === "arrowleft" || key === "a") {
        keysRef.current.left = false;
      }
      if (key === "arrowright" || key === "d") {
        keysRef.current.right = false;
      }
      if (key === "arrowup") {
        keysRef.current.turbo = false;
      }
      if (key === "arrowdown") {
        keysRef.current.brake = false;
      }
    };

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);

    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, [pauseGame, restartGame, resumeGame]);

  const touch = (name, active) => {
    if (active && statusRef.current === "paused") {
      lastTimeRef.current = 0;
      setGameStatus("running");
    }
    keysRef.current[name] = active;
  };

  const canvasClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    if (x > WIDTH - 76 && y < 70) {
      openLegend();
      return;
    }

    if (statusRef.current === "idle" || statusRef.current === "over") {
      restartGame();
    }
  };

  return (
    <main style={styles.page}>
      <section style={styles.frame}>
        {status === "idle" && (
          <div style={styles.marquee}>
            <div>
              <h1 style={styles.title}>Математичний політ</h1>
              <p style={styles.subtitle}>Лети й збирай відповіді</p>
            </div>
          </div>
        )}

        <div style={styles.canvasShell}>
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} style={styles.canvas} onClick={canvasClick} />
        </div>
      </section>

      {legendOpen && (
        <aside style={styles.legend} aria-label="Керування">
          <div style={styles.legendActions}>
            <button style={styles.legendButton} type="button" onClick={restartGame}>
              Спочатку
            </button>
            <button style={styles.legendButton} type="button" onClick={resetGame}>
              Скинути
            </button>
            <button style={styles.legendButton} type="button" onClick={closeLegend}>
              Закрити ×
            </button>
          </div>

          <h2 style={styles.legendTitle}>Керування</h2>

          <div style={styles.legendGrid}>
            <span>Рахунок</span>
            <strong>{score}</strong>
            <span>Рівень</span>
            <strong>{level}</strong>
            <span>Життя</span>
            <strong>{lives}</strong>
            <span>Поточне завдання</span>
            <strong>{problem.text}</strong>
            <span>Відповіді</span>
            <strong>{answerOptions.join(" / ")}</strong>
            <span>Серія</span>
            <strong>{streak}</strong>
            <span>Швидкість</span>
            <strong>{speed.toFixed(2)}×</strong>
          </div>

          <div style={styles.controlsText}>
            <p>← / A: вліво</p>
            <p>→ / D: вправо</p>
            <p>↑: Турбо</p>
            <p>↓: Гальмо</p>
            <p>Space: пауза або старт</p>
            <p>Escape: пауза</p>
          </div>

          <div style={styles.touchGrid}>
            <button
              style={styles.touchButton}
              type="button"
              onPointerDown={() => touch("left", true)}
              onPointerUp={() => touch("left", false)}
              onPointerCancel={() => touch("left", false)}
              onPointerLeave={() => touch("left", false)}
            >
              ←
            </button>
            <button
              style={styles.touchButton}
              type="button"
              onPointerDown={() => touch("right", true)}
              onPointerUp={() => touch("right", false)}
              onPointerCancel={() => touch("right", false)}
              onPointerLeave={() => touch("right", false)}
            >
              →
            </button>
            <button
              style={styles.touchButton}
              type="button"
              onPointerDown={() => touch("turbo", true)}
              onPointerUp={() => touch("turbo", false)}
              onPointerCancel={() => touch("turbo", false)}
              onPointerLeave={() => touch("turbo", false)}
            >
              Турбо
            </button>
            <button
              style={styles.touchButton}
              type="button"
              onPointerDown={() => touch("brake", true)}
              onPointerUp={() => touch("brake", false)}
              onPointerCancel={() => touch("brake", false)}
              onPointerLeave={() => touch("brake", false)}
            >
              Гальмо
            </button>
          </div>
        </aside>
      )}
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "18px",
    display: "grid",
    placeItems: "center",
    background: "#02030a",
    color: "#ffffff",
    fontFamily: '"Courier New", monospace',
  },
  frame: {
    width: "min(100%, 900px)",
    border: "6px solid #00e5ff",
    background: "#050814",
    boxShadow: "0 0 0 6px #ff2bd6, 0 0 36px #00e5ff",
  },
  marquee: {
    padding: "14px 16px",
    borderBottom: "6px solid #fff04a",
    background: "#12042a",
  },
  title: {
    margin: 0,
    color: "#ffffff",
    fontSize: "clamp(24px, 5vw, 42px)",
    lineHeight: 1,
    textTransform: "uppercase",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#ffffff",
    fontSize: "clamp(14px, 2.8vw, 20px)",
  },
  canvasShell: {
    position: "relative",
    background: "#050814",
  },
  canvas: {
    display: "block",
    width: "100%",
    height: "auto",
    imageRendering: "pixelated",
    cursor: "pointer",
  },
  legend: {
    position: "fixed",
    top: "18px",
    right: "18px",
    bottom: "18px",
    width: "min(380px, calc(100vw - 36px))",
    overflow: "auto",
    border: "6px solid #ff2bd6",
    background: "#050814",
    color: "#ffffff",
    padding: "14px",
    boxShadow: "0 0 0 6px #00e5ff, 0 0 40px rgba(255, 43, 214, 0.7)",
    zIndex: 10,
  },
  legendActions: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginBottom: "16px",
  },
  legendButton: {
    border: "4px solid #fff04a",
    background: "#160532",
    color: "#ffffff",
    padding: "10px",
    font: '900 15px "Courier New", monospace',
    cursor: "pointer",
  },
  legendTitle: {
    margin: "0 0 14px",
    color: "#ffffff",
    fontSize: "26px",
    textTransform: "uppercase",
  },
  legendGrid: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "8px 12px",
    padding: "12px",
    border: "4px solid #00e5ff",
    background: "#12042a",
    color: "#ffffff",
    fontSize: "15px",
  },
  controlsText: {
    marginTop: "16px",
    padding: "12px",
    border: "4px solid #fff04a",
    background: "#12042a",
    color: "#ffffff",
    lineHeight: 1.2,
  },
  touchGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "16px",
  },
  touchButton: {
    minHeight: "58px",
    border: "4px solid #00e5ff",
    background: "#160532",
    color: "#ffffff",
    font: '900 18px "Courier New", monospace',
    cursor: "pointer",
    touchAction: "none",
  },
};
