(function () {
  const STORAGE_KEY = "calculator-history";
  const MAX_HISTORY = 50;

  const expressionEl = document.getElementById("expression");
  const resultEl = document.getElementById("result");
  const buttons = document.querySelectorAll(".btn");
  const historyToggle = document.getElementById("historyToggle");
  const historyPanel = document.getElementById("historyPanel");
  const historyOverlay = document.getElementById("historyOverlay");
  const historyList = document.getElementById("historyList");
  const historyClear = document.getElementById("historyClear");
  const historyBadge = document.getElementById("historyBadge");

  let currentValue = "0";
  let previousValue = "";
  let operator = null;
  let shouldResetDisplay = false;
  let history = loadHistory();

  const opSymbol = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  function loadHistory() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      /* storage full or unavailable */
    }
  }

  function formatDisplay(value) {
    if (value === "Error") return "Error";
    if (value.length > 12) {
      const num = parseFloat(value);
      if (Math.abs(num) >= 1e12 || (Math.abs(num) < 1e-6 && num !== 0)) {
        return num.toExponential(6);
      }
    }
    return value;
  }

  function buildExpression() {
    if (!previousValue || !operator) return "";
    return `${formatDisplay(previousValue)} ${opSymbol[operator]}`;
  }

  function updateDisplay() {
    resultEl.textContent = formatDisplay(currentValue);
    resultEl.classList.toggle("error", currentValue === "Error");
    expressionEl.textContent = buildExpression();
    updateOperatorHighlight();
  }

  function updateOperatorHighlight() {
    document.querySelectorAll(".btn-operator").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === operator);
    });
  }

  function formatTime(timestamp) {
    const d = new Date(timestamp);
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }

  function renderHistory() {
    historyBadge.textContent = history.length;
    historyBadge.hidden = history.length === 0;

    if (history.length === 0) {
      historyList.innerHTML = '<li class="history-empty">履歴はありません</li>';
      return;
    }

    historyList.innerHTML = history
      .map(
        (item, index) => `
        <li class="history-item" data-index="${index}">
          <span class="history-expression">${item.expression}</span>
          <span class="history-result">${item.result}</span>
          <span class="history-time">${formatTime(item.timestamp)}</span>
        </li>`
      )
      .join("");

    historyList.querySelectorAll(".history-item").forEach((el) => {
      el.addEventListener("click", () => {
        const item = history[Number(el.dataset.index)];
        if (!item) return;
        currentValue = item.rawResult;
        previousValue = "";
        operator = null;
        shouldResetDisplay = true;
        updateDisplay();
        closeHistory();
      });
    });
  }

  function addHistoryEntry(expression, result) {
    history.unshift({
      expression,
      result: formatDisplay(result),
      rawResult: result,
      timestamp: Date.now(),
    });
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }
    saveHistory();
    renderHistory();
  }

  function openHistory() {
    renderHistory();
    historyOverlay.hidden = false;
    requestAnimationFrame(() => {
      historyOverlay.classList.add("visible");
      historyPanel.classList.add("open");
    });
    historyPanel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeHistory() {
    historyOverlay.classList.remove("visible");
    historyPanel.classList.remove("open");
    historyPanel.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    setTimeout(() => {
      if (!historyPanel.classList.contains("open")) {
        historyOverlay.hidden = true;
      }
    }, 350);
  }

  function clearHistory() {
    history = [];
    saveHistory();
    renderHistory();
  }

  function inputNumber(digit) {
    if (shouldResetDisplay || currentValue === "Error") {
      currentValue = digit;
      shouldResetDisplay = false;
    } else if (currentValue === "0") {
      currentValue = digit;
    } else if (currentValue.replace("-", "").length < 15) {
      currentValue += digit;
    }
    updateDisplay();
  }

  function inputDecimal() {
    if (shouldResetDisplay || currentValue === "Error") {
      currentValue = "0.";
      shouldResetDisplay = false;
    } else if (!currentValue.includes(".")) {
      currentValue += ".";
    }
    updateDisplay();
  }

  function setOperator(op) {
    if (currentValue === "Error") return;

    if (operator && !shouldResetDisplay) {
      calculate(false);
      if (currentValue === "Error") {
        updateDisplay();
        return;
      }
    }

    previousValue = currentValue;
    operator = op;
    shouldResetDisplay = true;
    updateDisplay();
  }

  function calculate(saveToHistory) {
    if (!operator || previousValue === "") return;

    const a = parseFloat(previousValue);
    const b = parseFloat(currentValue);

    if (isNaN(a) || isNaN(b)) {
      currentValue = "Error";
      return;
    }

    const historyExpression = `${formatDisplay(previousValue)} ${opSymbol[operator]} ${formatDisplay(currentValue)} =`;

    let result;
    switch (operator) {
      case "+":
        result = a + b;
        break;
      case "-":
        result = a - b;
        break;
      case "*":
        result = a * b;
        break;
      case "/":
        if (b === 0) {
          currentValue = "Error";
          return;
        }
        result = a / b;
        break;
      default:
        return;
    }

    const resultStr = String(parseFloat(result.toPrecision(12)));

    if (saveToHistory !== false) {
      addHistoryEntry(historyExpression, resultStr);
    }

    currentValue = resultStr;
    previousValue = "";
    operator = null;
    shouldResetDisplay = true;
  }

  function clear() {
    currentValue = "0";
    previousValue = "";
    operator = null;
    shouldResetDisplay = false;
    updateDisplay();
  }

  function toggleSign() {
    if (currentValue === "Error" || currentValue === "0") return;
    currentValue = currentValue.startsWith("-")
      ? currentValue.slice(1)
      : "-" + currentValue;
    updateDisplay();
  }

  function percent() {
    if (currentValue === "Error") return;
    currentValue = String(parseFloat(currentValue) / 100);
    updateDisplay();
  }

  function animateButton(btn) {
    if (!btn) return;
    btn.classList.remove("pressed");
    void btn.offsetWidth;
    btn.classList.add("pressed");
    btn.addEventListener(
      "animationend",
      () => btn.classList.remove("pressed"),
      { once: true }
    );
  }

  function findButtonByAction(action, value) {
    if (action === "number" || action === "operator") {
      return document.querySelector(
        `[data-action="${action}"][data-value="${value}"]`
      );
    }
    return document.querySelector(`[data-action="${action}"]`);
  }

  historyToggle.addEventListener("click", openHistory);
  historyOverlay.addEventListener("click", closeHistory);
  historyClear.addEventListener("click", clearHistory);

  let touchStartY = 0;
  historyPanel.addEventListener("touchstart", (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  historyPanel.addEventListener("touchend", (e) => {
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (deltaY > 80) closeHistory();
  }, { passive: true });

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      animateButton(btn);
      const action = btn.dataset.action;

      switch (action) {
        case "number":
          inputNumber(btn.dataset.value);
          break;
        case "decimal":
          inputDecimal();
          break;
        case "operator":
          setOperator(btn.dataset.value);
          break;
        case "equals":
          calculate();
          updateDisplay();
          break;
        case "clear":
          clear();
          break;
        case "toggle-sign":
          toggleSign();
          break;
        case "percent":
          percent();
          break;
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    let btn = null;

    if (e.key >= "0" && e.key <= "9") {
      inputNumber(e.key);
      btn = findButtonByAction("number", e.key);
    } else if (e.key === ".") {
      inputDecimal();
      btn = findButtonByAction("decimal");
    } else if (e.key === "+") {
      setOperator("+");
      btn = findButtonByAction("operator", "+");
    } else if (e.key === "-") {
      setOperator("-");
      btn = findButtonByAction("operator", "-");
    } else if (e.key === "*") {
      setOperator("*");
      btn = findButtonByAction("operator", "*");
    } else if (e.key === "/") {
      e.preventDefault();
      setOperator("/");
      btn = findButtonByAction("operator", "/");
    } else if (e.key === "Enter" || e.key === "=") {
      calculate();
      updateDisplay();
      btn = findButtonByAction("equals");
    } else if (e.key === "Escape") {
      if (historyPanel.classList.contains("open")) {
        closeHistory();
      } else {
        clear();
        btn = findButtonByAction("clear");
      }
    } else if (e.key === "Backspace") {
      if (currentValue.length > 1 && currentValue !== "Error") {
        currentValue = currentValue.slice(0, -1);
      } else {
        currentValue = "0";
      }
      updateDisplay();
    }

    if (btn) animateButton(btn);
  });

  renderHistory();
  updateDisplay();
})();
