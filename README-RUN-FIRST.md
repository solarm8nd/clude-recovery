# clude recovery agent

This package is a recovery wrapper around the available source tree. It is **not** a faithful upstream release of the original app. Its purpose is to give you a usable local agent for project inspection while continuing to improve startup compatibility for the source tree.

## What works now

- Runs from the terminal on Windows with Node 20+
- Works without a local LLM in offline analysis mode
- Understands natural-language requests like:
  - `حلل المشروع`
  - `اعملي خطة اصلاح للمشروع`
  - `analyze this project`
- Handles protected or temporary directories more safely during analysis
- Supports slash commands for file inspection and project analysis

## What does not mean the same thing

This package does **not** prove that the original leaked/recovered source tree fully boots yet. It gives you a usable terminal-first assistant while source compatibility work continues.

## Install on Windows

From the package folder:

```powershell
npm install
.\install-windows.ps1
```

Then open a **new PowerShell window** and run:

```powershell
clude
```

## Run in a specific project

```powershell
cd "E:\Spring 2026\AI-System"
clude
```

Inside the agent, try:

```text
حلل المشروع
اعملي خطة اصلاح مرتبة للمشروع ده
/doctor
/analyze
/search spring .
/read package.json
```

## Optional local model

If you have a local OpenAI-compatible endpoint, create a `.env` file in the project folder with:

```env
LOCAL_LLM_BASE_URL=http://127.0.0.1:11434/v1
LOCAL_LLM_MODEL=your-model-name
LOCAL_LLM_API_KEY=
```

Then restart `clude`.

## Optional Claude binary integrations

If you have a compatible Claude binary, set:

```powershell
$env:CLAUDE_CLI_PATH="C:\path\to\claude.exe"
```

This only affects optional features such as Chrome and Computer Use.
