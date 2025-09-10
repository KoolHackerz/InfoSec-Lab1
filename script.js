// Глобальні змінні
let uploadedFile = null;
let cardanoPattern = Array(16).fill(false); // Сітка 4x4
let originalText = "";
let processedText = "";
let isTextTruncated = false;
let currentRotation = 0; // Поточний стан повороту (0, 1, 2, 3 для 0°, 90°, 180°, 270° відповідно)
let encryptedGrid = []; // Зберігає зашифровану 4x4 сітку
let lastProcessMode = ""; // Зберігає останній режим обробки

// Управління етапами
let currentStage = 0;
const totalStages = 4;
const stageNames = [
  "File Upload",
  "Operation Mode",
  "Pattern Settings",
  "Result",
];

// DOM елементи
const fileDropZone = document.getElementById("fileDropZone");
const fileInput = document.getElementById("fileInput");
const fileDetails = document.getElementById("fileDetails");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const fileType = document.getElementById("fileType");
const removeFileBtn = document.getElementById("removeFileBtn");
const textPreview = document.getElementById("textPreview");
const previewText = document.getElementById("previewText");
const characterCount = document.getElementById("characterCount");
const textWarning = document.getElementById("textWarning");
const confirmTruncateBtn = document.getElementById("confirmTruncateBtn");
const cancelTruncateBtn = document.getElementById("cancelTruncateBtn");
const cardanoGrid = document.getElementById("cardanoGrid");
const randomizeBtn = document.getElementById("randomizeBtn");
const resultSection = document.getElementById("resultSection");
const resultLabel = document.getElementById("resultLabel");
const resultText = document.getElementById("resultText");
const downloadBtn = document.getElementById("downloadBtn");
const resultVisualization = document.getElementById("resultVisualization");
const visualizationTitle = document.getElementById("visualizationTitle");
const gridTitle = document.getElementById("gridTitle");
const gridDescription = document.getElementById("gridDescription");
const encryptedGridElement = document.getElementById("encryptedGrid");
const patternGridElement = document.getElementById("patternGrid");
const rotateBtn = document.getElementById("rotateBtn");
const rotationDegree = document.getElementById("rotationDegree");
const lettersDisplay = document.getElementById("lettersDisplay");

// Елементи навігації між етапами
const stagesContainer = document.getElementById("stagesContainer");
const stageTitle = document.getElementById("stageTitle");
const prevStageBtn = document.getElementById("prevStageBtn");
const nextStageBtn = document.getElementById("nextStageBtn");
const summaryFileName = document.getElementById("summaryFileName");
const summaryMode = document.getElementById("summaryMode");
const summaryPattern = document.getElementById("summaryPattern");

// Ініціалізація
document.addEventListener("DOMContentLoaded", function () {
  initCardanoGrid();
  setupEventListeners();
  initStages();
});

// Функції управління етапами
function initStages() {
  updateStageDisplay();
  updateNavigationButtons();
}

function goToStage(stageIndex) {
  if (stageIndex < 0 || stageIndex >= totalStages) return;

  const previousStage = currentStage;
  currentStage = stageIndex;

  // Оновлення позиції контейнера етапів
  const offset = -currentStage * 25;
  stagesContainer.style.transform = `translateX(${offset}%)`;

  document.querySelectorAll(".stage").forEach((stage, index) => {
    stage.classList.remove("active", "prev", "next");

    if (index === currentStage) {
      stage.classList.add("active");
    } else if (index < currentStage) {
      stage.classList.add("prev");
    } else {
      stage.classList.add("next");
    }
  });

  // Оновлення стану точок етапів
  document.querySelectorAll(".stage-dot").forEach((dot, index) => {
    dot.classList.remove("active", "completed");

    if (index === currentStage) {
      dot.classList.add("active");
    } else if (index < currentStage) {
      dot.classList.add("completed");
    }
  });

  updateStageDisplay();
  updateNavigationButtons();
}

function updateStageDisplay() {
  const newTitle = stageNames[currentStage];

  if (stageTitle.textContent === newTitle) {
    return;
  }

  stageTitle.style.opacity = "0";
  stageTitle.style.transform = "translateY(-10px)";

  setTimeout(() => {
    stageTitle.textContent = newTitle;
    stageTitle.style.opacity = "1";
    stageTitle.style.transform = "translateY(0)";
  }, 150);
}

function updateNavigationButtons() {
  if (currentStage === 0) {
    prevStageBtn.style.display = "none";
  } else {
    prevStageBtn.style.display = "flex";
  }

  const canProceed = canProceedToNextStage();

  if (currentStage === totalStages - 1) {
    nextStageBtn.style.display = "none";
  } else {
    nextStageBtn.style.display = "flex";
    nextStageBtn.disabled = !canProceed;
  }
}

function canProceedToNextStage() {
  switch (currentStage) {
    case 0: // Завантаження файлу
      return (
        uploadedFile !== null &&
        processedText.length === 16 &&
        textWarning.style.display === "none"
      );

    case 1: // Режим операції
      return document.querySelector('input[name="mode"]:checked') !== null;

    case 2: // Налаштування шаблону
      return cardanoPattern.filter((cell) => cell).length === 4;

    default:
      return true;
  }
}

function updateProcessSummary() {
  summaryFileName.textContent = uploadedFile ? uploadedFile.name : "-";

  const mode = document.querySelector('input[name="mode"]:checked');
  summaryMode.textContent = mode
    ? mode.value === "encrypt"
      ? "Encryption"
      : "Decryption"
    : "-";

  const activeCount = cardanoPattern.filter((cell) => cell).length;
  summaryPattern.textContent = `${activeCount} cells selected`;
}

// Створення сітки Кардано
function initCardanoGrid() {
  cardanoGrid.innerHTML = "";
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement("div");
    cell.className = "grid-cell";
    cell.dataset.index = i;
    cell.addEventListener("click", () => toggleCell(i));
    cardanoGrid.appendChild(cell);
  }
  updateGridDisplay();
}

// Отримати всі позиції, які займатиме клітинка під час 4 обертів
function getAllRotationPositions(cellIndex) {
  const positions = new Set();
  const gridSize = 4;

  for (let rotation = 0; rotation < 4; rotation++) {
    const rotatedPos = rotatePattern([cellIndex], rotation, gridSize)[0];
    positions.add(rotatedPos);
  }

  return Array.from(positions);
}

// Перевіряє, чи створить розміщення клітинки конфлікт з існуючими клітинками
function wouldCreateConflict(newCellIndex, existingPattern) {
  const newCellPositions = getAllRotationPositions(newCellIndex);

  // Отримати всі позиції, зайняті існуючими активними клітинками під час обертів
  const existingPositions = new Set();
  existingPattern.forEach((isActive, cellIndex) => {
    if (isActive) {
      const rotationPositions = getAllRotationPositions(cellIndex);
      rotationPositions.forEach((pos) => existingPositions.add(pos));
    }
  });

  // Поверяємо, чи конфліктують будь-які позиції нової клітинки з існуючими
  return newCellPositions.some((pos) => existingPositions.has(pos));
}

// Отримати всі доступні позиції для розміщення наступної клітинки
function getAvailablePositions(currentPattern) {
  const available = [];

  for (let i = 0; i < 16; i++) {
    if (!currentPattern[i] && !wouldCreateConflict(i, currentPattern)) {
      available.push(i);
    }
  }

  return available;
}
function toggleCell(index) {
  const currentActiveCount = cardanoPattern.filter((cell) => cell).length;

  if (cardanoPattern[index]) {
    cardanoPattern[index] = false;
    showMessage("Cell deactivated", "info");
  } else {
    if (currentActiveCount >= 4) {
      showMessage("Maximum 4 cells allowed for Cardano square", "warning");
      return;
    }

    if (wouldCreateConflict(index, cardanoPattern)) {
      showMessage(
        "Cannot place cell here - would conflict with rotations of existing cells",
        "warning"
      );
      return;
    }

    cardanoPattern[index] = true;
    const remaining = 4 - currentActiveCount - 1;
    if (remaining > 0) {
      showMessage(`Cell activated. ${remaining} more cells needed.`, "success");
    } else {
      showMessage("Pattern complete! All 4 cells placed.", "success");
    }
  }

  updateGridDisplay();
  updateNavigationButtons();
}

function updateGridDisplay() {
  const cells = cardanoGrid.querySelectorAll(".grid-cell");
  const availablePositions = getAvailablePositions(cardanoPattern);
  const activeCount = cardanoPattern.filter((cell) => cell).length;

  cells.forEach((cell, index) => {
    cell.classList.remove("active", "available", "blocked");

    if (cardanoPattern[index]) {
      // Активна клітинка
      cell.classList.add("active");
      cell.textContent = "■";
    } else if (activeCount < 4 && availablePositions.includes(index)) {
      // Доступна для розміщення
      cell.classList.add("available");
      cell.textContent = "◯";
    } else if (activeCount < 4) {
      // Заблокована через конфлікти
      cell.classList.add("blocked");
      cell.textContent = "✕";
    } else {
      // Шаблон завершено
      cell.textContent = "";
    }
  });
}

function clearPatternManually() {
  cardanoPattern.fill(false);
  updateGridDisplay();
  showMessage(
    "Pattern cleared. Please select exactly 4 cells manually.",
    "info"
  );
}

function setupEventListeners() {
  prevStageBtn.addEventListener("click", () => goToStage(currentStage - 1));
  nextStageBtn.addEventListener("click", async () => {
    // Якщо поточний етап - Налаштування шаблону (2), обробляємо файл перед переходом
    if (currentStage === 2) {
      await processFile();
      goToStage(3); // Переходимо до етапу результату
    } else if (canProceedToNextStage()) {
      goToStage(currentStage + 1);
    }
  });

  document.querySelectorAll(".stage-dot").forEach((dot, index) => {
    dot.addEventListener("click", () => {
      if (index <= currentStage) {
        goToStage(index);
      }
    });
  });

  fileDropZone.addEventListener("dragover", handleDragOver);
  fileDropZone.addEventListener("dragleave", handleDragLeave);
  fileDropZone.addEventListener("drop", handleFileDrop);
  fileDropZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", handleFileSelect);

  removeFileBtn.addEventListener("click", removeFile);

  confirmTruncateBtn.addEventListener("click", confirmTruncation);
  cancelTruncateBtn.addEventListener("click", cancelTruncation);

  randomizeBtn.addEventListener("click", clearPatternManually);

  downloadBtn.addEventListener("click", downloadResult);

  rotateBtn.addEventListener("click", rotateVisualization);

  document.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      updateModeUI();
      updateNavigationButtons();
    });
  });
}

function handleDragOver(e) {
  e.preventDefault();
  fileDropZone.classList.add("drag-over");
}

function handleDragLeave(e) {
  e.preventDefault();
  fileDropZone.classList.remove("drag-over");
}

function handleFileDrop(e) {
  e.preventDefault();
  fileDropZone.classList.remove("drag-over");

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

async function handleFile(file) {
  const allowedTypes = ["text/plain"];
  const allowedExtensions = [".txt"];

  const isValidType =
    allowedTypes.includes(file.type) ||
    allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

  if (!isValidType) {
    showMessage("Unsupported file type. Only .txt files are allowed.", "error");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showMessage("File is too large. Maximum size: 10MB.", "error");
    return;
  }

  try {
    originalText = await readFileContent(file);

    uploadedFile = file;
    displayFileInfo(file);
    displayTextPreview();
  } catch (error) {
    showMessage("Error reading file: " + error.message, "error");
  }
}

function displayFileInfo(file) {
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  fileType.textContent = getFileTypeDescription(file);

  fileDropZone.style.display = "none";
  fileDetails.style.display = "block";
}

function displayTextPreview() {
  const cleanText = originalText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  previewText.textContent = cleanText;

  const charCount = cleanText.length;
  characterCount.textContent = `Characters: ${charCount}/16`;

  characterCount.classList.remove("warning", "error");
  textWarning.style.display = "none";
  isTextTruncated = false;

  if (charCount === 0) {
    showMessage(
      "File is empty. Please choose a file with text content.",
      "error"
    );
    removeFile();
    return;
  }

  if (charCount > 16) {
    characterCount.classList.add("error");
    textWarning.style.display = "block";
    processedText = cleanText.substring(0, 16);
    isTextTruncated = true;
    updateNavigationButtons();
  } else if (charCount < 16) {
    characterCount.classList.add("warning");
    processedText = padWithRandomLetters(cleanText, 16);
    isTextTruncated = false;
    showMessage(
      `Text has ${charCount} characters. It will be padded with random letters to reach 16 characters.`,
      "info"
    );
    updateNavigationButtons();
  } else {
    processedText = cleanText;
    isTextTruncated = false;
    showMessage("Perfect! Text has exactly 16 characters.", "success");
    updateNavigationButtons();
  }
}

function confirmTruncation() {
  textWarning.style.display = "none";
  previewText.textContent = processedText;
  characterCount.textContent = `Characters: 16/16 (truncated)`;
  characterCount.classList.remove("error");
  characterCount.classList.add("warning");

  showMessage("Using first 16 characters for encryption.", "info");
  updateNavigationButtons();
}

function cancelTruncation() {
  removeFile();
}

function padWithRandomLetters(text, targetLength) {
  // Рідкі укранські літери для заповнення
  const rareUkrainianLetters = [
    "щ",
    "ь",
    "ю",
    "я",
    "ф",
    "х",
    "ц",
    "ч",
  ];

  let paddedText = text;

  while (paddedText.length < targetLength) {
    const randomIndex = Math.floor(Math.random() * rareUkrainianLetters.length);
    paddedText += rareUkrainianLetters[randomIndex];
  }

  return paddedText;
}

function removeFile() {
  uploadedFile = null;
  originalText = "";
  processedText = "";
  isTextTruncated = false;
  fileInput.value = "";
  fileDropZone.style.display = "block";
  fileDetails.style.display = "none";
  textWarning.style.display = "none";
  updateNavigationButtons();
  hideResult();
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileTypeDescription(file) {
  if (file.name.toLowerCase().endsWith(".txt")) return "Text file";
  return "Unknown type";
}

function updateModeUI() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const isEncrypt = mode === "encrypt";

  resultLabel.textContent = isEncrypt ? "Encrypted text:" : "Decrypted text:";
}

async function processFile() {
  if (!uploadedFile || !processedText) {
    showMessage("No file selected or text not ready", "error");
    return;
  }

  const activeCount = cardanoPattern.filter((cell) => cell).length;
  if (activeCount !== 4) {
    showMessage("Cardano square must have exactly 4 active cells", "error");
    return;
  }

  if (processedText.length !== 16) {
    showMessage("Text must be exactly 16 characters for 4x4 matrix", "error");
    return;
  }

  try {
    // Показати індикатор обробки
    nextStageBtn.disabled = true;
    nextStageBtn.innerHTML = '<span class="arrow-icon">⏳</span>';

    const mode = document.querySelector('input[name="mode"]:checked').value;
    lastProcessMode = mode;

    let result;
    if (mode === "encrypt") {
      result = encryptWithCardano(processedText, cardanoPattern);
    } else {
      result = decryptWithCardano(processedText, cardanoPattern);
    }

    displayResult(result);
    showMessage(
      `${
        mode === "encrypt" ? "Encryption" : "Decryption"
      } completed successfully!`,
      "success"
    );

    goToStage(4);
  } catch (error) {
    console.error("File processing error:", error);
    showMessage("Error processing file: " + error.message, "error");
  } finally {
    nextStageBtn.disabled = false;
    nextStageBtn.innerHTML = '<span class="arrow-icon">→</span>';
    updateModeUI();
  }
}

function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      resolve(e.target.result);
    };

    reader.onerror = function () {
      reject(new Error("File reading error"));
    };

    // For .txt files read as text
    if (file.name.toLowerCase().endsWith(".txt")) {
      reader.readAsText(file, "utf-8");
    } else {
      reader.readAsText(file, "utf-8");
    }
  });
}

function encryptWithCardano(text, pattern) {
  if (text.length !== 16) {
    throw new Error("Text must be exactly 16 characters for 4x4 matrix");
  }

  const activePositions = [];
  pattern.forEach((active, index) => {
    if (active) activePositions.push(index);
  });

  const gridSize = 4;
  const grid = Array(16).fill(" "); // Ініціалізуємо сітку порожніми символами
  let charIndex = 0;

  for (let rotation = 0; rotation < 4; rotation++) {
    const rotatedPositions = rotatePattern(activePositions, rotation, gridSize);

    const sortedPositions = rotatedPositions.sort((a, b) => a - b);

    for (const pos of sortedPositions) {
      if (charIndex < text.length) {
        grid[pos] = text[charIndex++];
      }
    }
  }

  return grid.join("");
}

function decryptWithCardano(encryptedText, pattern) {
  if (encryptedText.length !== 16) {
    throw new Error(
      "Encrypted text must be exactly 16 characters for 4x4 matrix"
    );
  }

  const activePositions = [];
  pattern.forEach((active, index) => {
    if (active) activePositions.push(index);
  });

  const gridSize = 4;
  const grid = encryptedText.split(""); // Перетворюємо текст у масив символів
  let decryptedChars = [];

  for (let rotation = 0; rotation < 4; rotation++) {
    const rotatedPositions = rotatePattern(activePositions, rotation, gridSize);

    const sortedPositions = rotatedPositions.sort((a, b) => a - b);

    for (const pos of sortedPositions) {
      if (pos < grid.length) {
        decryptedChars.push(grid[pos]);
      }
    }
  }

  return decryptedChars.join("");
}

function rotatePattern(positions, rotation, gridSize) {
  return positions.map((pos) => {
    const row = Math.floor(pos / gridSize);
    const col = pos % gridSize;

    let newRow, newCol;

    switch (rotation) {
      case 0: // 0° - без змін
        newRow = row;
        newCol = col;
        break;
      case 1: // 90° за годинниковою стрілкою
        newRow = col;
        newCol = gridSize - 1 - row;
        break;
      case 2: // 180°
        newRow = gridSize - 1 - row;
        newCol = gridSize - 1 - col;
        break;
      case 3: // 270° за годинниковою стрілкою (90° проти годинникової стрілки)
        newRow = gridSize - 1 - col;
        newCol = row;
        break;
    }

    return newRow * gridSize + newCol;
  });
}

function displayResult(text) {
  resultText.textContent = text;

  const mode = document.querySelector('input[name="mode"]:checked').value;
  resultVisualization.style.display = "block";

  if (mode === "encrypt") {
    createResultVisualization(text);
  } else {
    createResultVisualization(processedText);
  }

  // Нема потреби показувати розділ результату або прокручувати - це обробляється навігацією етапів
}

function createResultVisualization(encryptedText) {
  encryptedGrid = encryptedText.split("");
  currentRotation = 0;

  const mode = document.querySelector('input[name="mode"]:checked').value;
  if (mode === "encrypt") {
    visualizationTitle.textContent = "Encryption Process Visualization";
    gridTitle.textContent = "Encrypted Grid";
    gridDescription.textContent =
      "Letters arranged in 4x4 matrix after encryption";
  } else {
    visualizationTitle.textContent = "Decryption Process Visualization";
    gridTitle.textContent = "Source Grid";
    gridDescription.textContent = "Encrypted letters arranged in 4x4 matrix";
  }

  createEncryptedGrid();

  createPatternGrid();

  updateRotationDisplay();

  updateExtractedLetters();
}

function createEncryptedGrid() {
  encryptedGridElement.innerHTML = "";

  for (let i = 0; i < 16; i++) {
    const cell = document.createElement("div");
    cell.className = "result-cell";
    cell.textContent = encryptedGrid[i] || " ";

    if (!encryptedGrid[i] || encryptedGrid[i] === " ") {
      cell.classList.add("empty");
    }

    encryptedGridElement.appendChild(cell);
  }
}

function createPatternGrid() {
  patternGridElement.innerHTML = "";

  const activePositions = [];
  cardanoPattern.forEach((active, index) => {
    if (active) activePositions.push(index);
  });

  const rotatedPositions = rotatePattern(activePositions, currentRotation, 4);

  for (let i = 0; i < 16; i++) {
    const cell = document.createElement("div");
    cell.className = "result-cell";

    if (rotatedPositions.includes(i)) {
      cell.classList.add("active");
      cell.textContent = encryptedGrid[i] || " ";
    } else {
      cell.classList.add("inactive");
      cell.textContent = encryptedGrid[i] || " ";
    }

    patternGridElement.appendChild(cell);
  }
}

function rotateVisualization() {
  currentRotation = (currentRotation + 1) % 4;

  createPatternGrid();

  updateRotationDisplay();

  updateExtractedLetters();

  patternGridElement.style.transform = "scale(0.95)";
  setTimeout(() => {
    patternGridElement.style.transform = "scale(1)";
  }, 100);
}

function updateRotationDisplay() {
  const degrees = currentRotation * 90;
  rotationDegree.textContent = `${degrees}°`;
}

function updateExtractedLetters() {
  const activePositions = [];
  cardanoPattern.forEach((active, index) => {
    if (active) activePositions.push(index);
  });

  const rotatedPositions = rotatePattern(activePositions, currentRotation, 4);

  const sortedPositions = rotatedPositions.sort((a, b) => a - b);

  const extractedChars = sortedPositions.map(
    (pos) => encryptedGrid[pos] || " "
  );

  lettersDisplay.textContent = extractedChars.join(" ");
}

function hideResult() {
  resultVisualization.style.display = "none";
  currentRotation = 0;
  encryptedGrid = [];
}

function downloadResult() {
  const text = resultText.textContent;
  if (!text) return;

  const mode = document.querySelector('input[name="mode"]:checked').value;
  const prefix = mode === "encrypt" ? "encrypted" : "decrypted";
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
  const filename = `${prefix}_${timestamp}.txt`;

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showMessage("File downloaded successfully!", "success");
}

function showMessage(message, type = "info") {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message message-${type}`;
  messageDiv.textContent = message;

  messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 12px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
        word-wrap: break-word;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;

  // Колір фону залежно від типу повідомлення
  switch (type) {
    case "success":
      messageDiv.style.background = "rgba(86, 211, 100, 0.8)";
      break;
    case "error":
      messageDiv.style.background = "rgba(248, 81, 73, 0.8)";
      break;
    case "warning":
      messageDiv.style.background = "rgba(241, 224, 90, 0.8)";
      break;
    default:
      messageDiv.style.background = "rgba(88, 166, 255, 0.8)";
  }

  document.body.appendChild(messageDiv);

  // Повідомлення зникає через 5 секунд
  setTimeout(() => {
    messageDiv.style.animation = "slideOutRight 0.3s ease-in";
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 300);
  }, 5000);
}

const style = document.createElement("style");
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Регулярно перевіряємо, чи можна перейти до наступного етапу
setInterval(() => {
  updateNavigationButtons();
}, 100);
