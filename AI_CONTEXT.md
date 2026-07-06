# SuperConnectX AI Context

This document summarizes the local investigation and changes made for future AI tools or follow-up conversations.

## Repository

- Upstream: `https://github.com/SuperStudio/SuperConnectX`
- Fork used for pushes: `https://github.com/naiheSH/SuperConnectX`
- Local path: `/home/naihe/SuperConnectX`
- Current branch: `master`
- Push remote for this work: `fork`
- Do not push to `origin`; it points to upstream.

## Project Overview

- Electron desktop app using Vue + TypeScript.
- Serial terminal tool inherited from SuperCom.
- Supports serial port, telnet, SSH, FTP and related terminal features.
- Main app entry/output uses Electron/Vite:
  - Source: `src/main`, `src/renderer`
  - Build output: `out/`
  - Package output: `release/`

## Local Environment Notes

- Local OS: Linux.
- Node used locally: `v24.18.0`.
- npm used locally: `11.18.0`.
- The project `.npmrc` contains deprecated npm config keys:
  - `electron_mirror`
  - `electron_builder_binaries_mirror`
- npm prints warnings for those keys, but builds/tests can continue.

## Key Fixes Made

### Chinese Serial Encoding

Problem:

- The UI exposes `GB2312` and `GBK` encoding options.
- Backend originally used `Buffer.toString(encoding)`.
- Node does not support `gb2312`, `gbk`, or `gb18030` in `Buffer.toString()`.
- Selecting `GB2312` caused:

```text
TypeError [ERR_UNKNOWN_ENCODING]: Unknown encoding: gb2312
```

Fix:

- Added direct dependency: `iconv-lite`.
- Added `src/main/protocol/decodeBuffer.ts`.
- Replaced receive decoding in:
  - `src/main/protocol/BufferLineSplitter.ts`
  - `src/main/protocol/ComClient.ts`
- Replaced serial send encoding in `ComClient.ts` with `encodeBuffer()`.

Supported behavior:

- Native Node encodings still use native Buffer conversion.
- Non-native encodings supported by `iconv-lite`, such as `gb2312`, `gbk`, `gb18030`, are decoded/encoded through `iconv-lite`.

### Linux Serial Log File Path

Problem:

- Linux serial names look like `/dev/ttyUSB0`.
- The connection name is used in log file templates through `%C`.
- The `/` characters were preserved in file names, turning the file name into a nested path such as:

```text
logs/dev/ttyUSB0-2026-07-06-11h-20m-13s.log
```

- If `logs/dev` did not exist, connection failed with:

```text
ENOENT: no such file or directory
```

Fix:

- In `src/main/utils/ProtocolLogger.ts`, sanitize log file names by replacing path separators with `-`.
- Ensure parent directories exist before creating/appending log files.
- Added/kept related test in `tests/unit/ProtocolLogger.test.ts`.

Result:

- `/dev/ttyUSB0` becomes a safe log file name component such as `-dev-ttyUSB0`.

## Runtime Logs

Default packaged log directory is based on Electron user data:

- Linux: `~/.config/superconnectx/logs`
- Windows: `%APPDATA%\superconnectx\logs`
- macOS: `~/Library/Application Support/superconnectx/logs`

Development mode may use:

```text
/home/naihe/SuperConnectX/node_modules/electron/dist/logs
```

Logs are split by size. Current default split size in code is 20 MB. Existing logs are not automatically deleted by the log writer.

## Linux Serial Permissions

Observed device:

```text
/dev/ttyUSB0
```

It belonged to group `dialout`:

```text
crw-rw---- root dialout /dev/ttyUSB0
```

Actions performed locally:

- Added current user `naihe` to `dialout`.
- Created permanent udev rule:

```text
/etc/udev/rules.d/99-serial-port-permissions.rules
```

Rule content:

```text
SUBSYSTEM=="tty", KERNEL=="ttyUSB[0-9]*", GROUP="dialout", MODE="0666"
SUBSYSTEM=="tty", KERNEL=="ttyACM[0-9]*", GROUP="dialout", MODE="0666"
```

This allows `/dev/ttyUSB*` and `/dev/ttyACM*` devices to be opened directly after plug-in.

## Local Linux Package Build

Local successful Linux build command:

```bash
npx electron-builder --linux --config electron-builder.yml --publish never
```

Important:

- `electron-builder.yml` includes Linux `maintainer`, `AppImage`, `snap`, and `deb` config.
- Building with `package.json` config failed on CI because Linux `.deb` required a maintainer.
- Local build required system packages:

```bash
sudo apt-get install -y build-essential python3 make g++ rpm libarchive-tools
```

Successful local artifacts:

```text
release/superconnectx-1.1.8.AppImage
release/superconnectx_1.1.8_amd64.deb
release/superconnectx_1.1.8_amd64.snap
```

## GitHub Actions

New workflow:

```text
.github/workflows/release-windows-linux.yml
```

Purpose:

- Build Windows and Linux packages.
- Upload artifacts.
- On tag `v*`, create GitHub Release and upload all artifacts.

Important workflow decisions:

- Uses Node `24` to avoid GitHub Actions Node 20 deprecation warnings.
- Does not use `cache: npm` because this repository does not have a committed `package-lock.json` in Git status.
- Linux package step uses:

```bash
npx electron-builder --linux --config electron-builder.yml --publish never
```

- Windows package step uses:

```bash
npx electron-builder --win --publish never
```

CI issue fixed:

- Linux failed with:

```text
Please specify author 'email' in the application package.json
It is required to set Linux .deb package maintainer.
```

- Fixed by making Linux use `electron-builder.yml`, which already has:

```yaml
linux:
  maintainer: SuperStudio
```

## Verification Performed

Commands run successfully:

```bash
npm run typecheck
npm test
npx electron-vite build
npx electron-builder --linux --config electron-builder.yml --publish never
```

Unit test result at the time of work:

```text
29 test files passed
489 tests passed
```

GB2312 runtime validation:

- Local config was switched to `gb2312`.
- App connected to `/dev/ttyUSB0` without `Unknown encoding: gb2312` after the fix.

## Mac Notes

- The project is Electron-based, so macOS is theoretically supported.
- `serialport` supports macOS.
- macOS serial devices usually look like:

```text
/dev/cu.usbserial-xxxx
/dev/cu.usbmodemxxxx
```

- Prefer `/dev/cu.*` over `/dev/tty.*` on macOS.
- No macOS CI/release workflow was added in this work.
- macOS distribution likely needs signing and notarization for good user experience.

## Recent Commits Pushed To Fork

- `87d0cb3` 支持中文串口编码和 Linux 打包
- `e8c37e3` 修复发布 workflow npm 缓存配置
- `21d82cc` 修复 Linux 发布配置

## Useful Commands

Run dev mode:

```bash
npm run dev
```

Typecheck:

```bash
npm run typecheck
```

Unit tests:

```bash
npm test
```

Linux package:

```bash
npx electron-vite build
npx electron-builder --linux --config electron-builder.yml --publish never
```

Push to fork only:

```bash
git push fork master
```
