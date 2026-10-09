## Local Setup on Windows

### Prerequisites

Install these before setting up the project:

- [Python](https://www.python.org/downloads/)
- [Node.js](https://nodejs.org/en/download/)
- [Tesseract OCR for Windows](https://github.com/UB-Mannheim/tesseract/wiki)

For Tesseract, use the 64-bit Windows installer and install it to:

```text
C:\Program Files\Tesseract-OCR\tesseract.exe
```

The backend expects Tesseract at that location. If you install it elsewhere, update `pytesseract.pytesseract.tesseract_cmd` in `backend/src/ocr.py`.

You can verify the installation in PowerShell:

```powershell
& "C:\Program Files\Tesseract-OCR\tesseract.exe" --version
```

### Download the project

On GitHub, select **Code → Download ZIP**, then extract the ZIP. Open the extracted project folder in VS Code. In the commands below, replace the example path with the path to your extracted folder.

### Set up and run the backend

Open a VS Code terminal in the project folder and run:

```powershell
cd D:\path\to\Fake-Review-Detection-main\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m playwright install chromium
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Playwright downloads its Chromium browser separately; see the [Playwright Python installation guide](https://playwright.dev/python/docs/intro).

Keep this terminal open while using the app. The backend API is available at `http://127.0.0.1:8000`, and its interactive documentation is at `http://127.0.0.1:8000/docs`.

### Set up and run the frontend

Open a second VS Code terminal and run:

```powershell
cd D:\path\to\Fake-Review-Detection-main\frontend
npm install
npm run dev
```

Open the local address printed by Vite in the terminal.

### Starting the project again

After the first setup, start the backend and frontend in separate terminals:

```powershell
# Backend terminal
cd D:\path\to\Fake-Review-Detection-main\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

```powershell
# Frontend terminal
cd D:\path\to\Fake-Review-Detection-main\frontend
npm run dev
```
```powershell
git add <files-to-include>
git commit -m "Your commit message"
git push origin main
```
