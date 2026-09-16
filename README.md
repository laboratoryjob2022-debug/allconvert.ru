# 🚀 AllConvert — Private, Browser-Based File Converter

> Convert videos, audio, images, and documents 100% locally in your browser. No server uploads, no queues, no file tracking.

👉 **Try it now:** [https://allconvert.ru/](https://allconvert.ru/)

[English](README.md) | [Русский](README.ru.md)

---

AllConvert is a modern web application designed to handle media and document conversion directly inside your browser using **WebAssembly**, **WebCodecs**, and native Browser APIs. 

Traditional online converters force you to upload your sensitive files to remote servers, put you in queues, or cap your file sizes. AllConvert runs conversion tasks **locally on your device**, ensuring complete privacy and zero data transfer.

## ✨ Key Features

- 🔒 **100% Client-Side Privacy:** Your files **NEVER** leave your device. All decoding and encoding happen in your browser's local memory. You can even disconnect your internet after loading the page.
- ⚡ **Hardware Acceleration:** Utilizes native **WebCodecs** for ultra-fast video processing using your system's GPU (where supported).
- 🚫 **No Server Limits or Accounts:** No registration, no subscription fees, no arbitrary file size caps (limited only by your RAM/hardware capabilities).
- 📦 **Batch Processing:** Select multiple files, set individual or batch target formats, and download all processed files at once in a ZIP archive.

---

## 📂 Supported Formats

| Category | Formats |
| :--- | :--- |
| **Video** | MP4, WebM, MOV, MKV, AVI, GIF |
| **Audio** | MP3, WAV, AAC, FLAC, OGG, M4A, OPUS *(Instant audio extraction from video)* |
| **Images** | PNG, JPG/JPEG, WebP, AVIF, HEIC (iPhone), SVG, ICO, BMP |
| **Documents** | PDF, DOCX, XLSX, CSV, TXT, JSON, XML, Markdown *(Beta/Experimental)* |

> ⚠️ **Note on Document Conversion:** Document parsing (PDF/DOCX) via WebAssembly is still under active development. Complex document structures or missing custom fonts may occasionally affect the output layout.

---

## 🛠️ Built With

AllConvert is an exploration of how far client-side web technologies can go:

* **React** + **TypeScript**
* **WebAssembly (WASM)** & **FFmpeg WASM**
* **WebCodecs API** & **Web Audio API**
* **Canvas API** & **JSZip**

---

## 🤝 Feedback & Issues

Found a bug or have a feature request? Please open an issue on GitHub with:
1. Input and target formats.
2. Your browser and OS version.
3. Approximate file size.

*(Please do not include private or sensitive files in your issue reports).*

---
*Created with Google AI Studio assistance. Open for community feedback!*
