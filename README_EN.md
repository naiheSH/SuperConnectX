

[中文](README.md) [English](README_EN.md) [日本語](README_JP.md)


<h1 align="center">SuperConnectX</h1>

[![LICENSE](https://img.shields.io/badge/license-GPL%203.0-blue)](#)
[![Star](https://img.shields.io/github/stars/SuperStudio/SuperConnectX?label=Star%20this%20repo)](https://github.com/SuperStudio/SuperConnectX)
[![Fork](https://img.shields.io/github/forks/SuperStudio/SuperConnectX?label=Fork%20this%20repo)](https://github.com/SuperStudio/SuperConnectX/fork)


SuperConnectX is a **super terminal tool** supporting COM, Telnet, and other terminal connections, fully developed using **vibe coding**.

Download: [Personal fork Releases](https://github.com/naiheSH/SuperConnectX/releases); upstream: [SuperStudio/SuperConnectX](https://github.com/SuperStudio/SuperConnectX)


![image-20260531221403478](Image/image-20260531221403478.png)


![star-history](https://api.star-history.com/svg?repos=SuperStudio/SuperConnectX&type=Date)

# Features

1. Serial port functionality fully inherited from [SuperCom](https://github.com/SuperStudio/SuperCom)

2. Telnet support

# Highlights

## Syntax Highlighting

<img src="Image/image-20260712223054054.png" alt="image-20260712223054054" style="zoom:80%;" />

<img src="Image/image-20260712223112569.png" alt="image-20260712223112569" style="zoom:80%;" />

## Split Panels

<img src="Image/image-20260712223133963.png" alt="image-20260712223133963" style="zoom:80%;" />

Tab drag and drop support

<img src="Image/image-20260712223431638.png" alt="image-20260712223431638" style="zoom:80%;" />

## Command Editor

<img src="Image/image-20260712223209692.png" alt="image-20260712223209692" style="zoom:80%;" />

Batch Command Loop Execution

<img src="Image/2.gif" alt="2" style="zoom:80%;" />



## Serial CRC Checksum

<img src="Image/image-20260712223233500.png" alt="image-20260712223233500" style="zoom:80%;" />

## Themes - Dark & Light Mode

<img src="Image/image-20260712212608912.png" alt="image-20260712212608912" style="zoom:80%;" />

<img src="Image/image-20260712212627051.png" alt="image-20260712212627051" style="zoom:80%;" />

## Multiple Connection Types

COM / Telnet / FTP

<img src="Image/image-20260712212729695.png" alt="image-20260712212729695" style="zoom:80%;" />

<img src="Image/image-20260712222905898.png" alt="image-20260712222905898" style="zoom:80%;" />

<img src="Image/image-20260712222929409.png" alt="image-20260712222929409" style="zoom:80%;" />

## Virtual Serial Port Emulation

<img src="Image/image-20260809175628990.png" alt="image-20260809175628990" style="zoom:80%;" />

## Keyboard Shortcuts

<img src="Image/image-20260712222946297.png" alt="image-20260712222946297" style="zoom:80%;" />

## Import / Export Data

<img src="Image/image-20260712223001191.png" alt="image-20260712223001191" style="zoom:80%;" />

## Fonts, Line Wrapping & More

<img src="Image/image-20260712223024396.png" alt="image-20260712223024396" style="zoom:80%;" />



## Auto Update

<img src="Image/image-20260712223343355.png" alt="image-20260712223343355" style="zoom:80%;" />

# Development

## Environment Setup

Install dependencies

```bash
npm install
```

Run

```bash
npm run dev
```

## Contributing

Install the CodeBuddy extension in VS Code, or use any other agent for vibe coding.

<img src="Image/image-20260531221642675.png" alt="image-20260531221642675" style="zoom: 80%;" />

# Release

## Auto-generate Release Notes

Paste the content from `skills/version-generate.md` into the vibe coding dialog.

## Code Check

Run `npm run typecheck`

## Local Build

Run `build.bat`

## CI/CD Build

Run `release.bat` and GitHub Actions will start automatically. Once the build completes, the latest releases will be generated.

<img src="Image/image-20260531222201852.png" alt="image-20260531222201852" style="zoom:80%;" />

# Personal Edition and Log Management

This personal edition is based on [SuperStudio/SuperConnectX](https://github.com/SuperStudio/SuperConnectX). Packages and update metadata are published from [naiheSH/SuperConnectX](https://github.com/naiheSH/SuperConnectX). It additionally maintains cross-platform serial display, log management, packaging, and release workflow changes.

## Log Management Guide

- Log splitting can be enabled or disabled in Settings. Enabled splitting uses the configured split size (20 MB by default); disabled splitting or “unlimited” sets no size limit.
- The only log toolbar action is **Save As**, calling `saveLogFileAs` without rotating the active file. Archive/rotation remains the internal `rotateLogFile` capability and has no UI entry.
- Save As exports complete split-file boundaries by default. With an export time range configured, only lines in that range are exported, so complete split files or complete cross-restart exports are not guaranteed.
- Cleanup follows maximum retention days and maximum file count; 0 means no cleanup or no limit.
- Serial remarks are used in log and export filenames. Linux/macOS `/dev/...` names are made safe for filenames, while Windows `COMx` names remain readable.
- Notifications display for 5 seconds by default. Production packages check for updates after startup; development environments do not automatically check online. The update source is the personal fork.

## Features
- Support Chinese serial port encoding and Linux packaging
- Display per-line timestamps for received data
- Export logs via Save As according to the current export settings
- Add AI context documentation (localized to Chinese)
- Add Windows zip release artifacts
- Add Ubuntu 24 compatible builds (Electron 35 + 38)
- Add macOS dual-architecture builds (arm64 + x64)
- Support naihe tag releases
- Auto-generate changelog in release workflow
- Add afterPack hook to auto-fix chrome-sandbox permissions
- Version suffix -naihe, notifications display for 5 seconds by default

## Fixes
- Fix release workflow npm cache config
- Fix Linux release config
- Fix Linux log Save As default filename
- Fix tray icon resources
- Fix log split filename basename
- Adjust log Save As default filename
- Change release artifacts to installer format
- Fix custom tag release naming
- Fix Ubuntu 24 build artifact filename conflict
- Fix AppDir test cross-platform compatibility
- Fix TypeScript type errors
- Re-apply Linux serial port filtering (lost after upstream merge)
- Fix CI test failures
- Fix macOS build Python setuptools installation
- Fix macOS pip externally-managed-environment
- Distinguish macOS vs other platforms for Python setuptools
- Fix log rotation data loss and timestamp regex
- Make serial port filtering conservative

## CI
- Add cross-platform build workflow
- Fix macOS Intel build runner
- Publish separate macOS architecture packages
- Update release assets and serial port filtering

## Tests
- Use platform-specific serial port test fixtures
- Fix Windows serial port test expectations
