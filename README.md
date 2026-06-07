# EMDR Therapy Guide - Self-Directed Session App

A premium, interactive, self-directed EMDR (Eye Movement Desensitization and Reprocessing) therapy web application. This tool is designed to facilitate desensitization sessions locally, privately, and completely free of charge.

## 🔗 Try it Live
You can access the hosted application here: **[https://fraterr.github.io/EMDRapp/](https://fraterr.github.io/EMDRapp/)**

---

## 📸 Screenshots

### 1. Welcome Screen
Includes instructions, safety disclaimer, and support link.
![Welcome Screen](assets/welcome_screen.png)

### 2. Sensory Recall Guide
Prompts for structured detailing of traumatic memories (visuals, sounds, tactile sensations, tastes, smells).
![Sensory Screen](assets/sensory_screen.png)

### 3. Bilateral Stimulation Screen
A full-viewport dark environment with a finger pointer that moves horizontally.
![Bilateral Stimulation](assets/stimulation_screen.png)

---

## ✨ Features

- **Structured Sensory Detail Capture:** Guided steps to bring specific components of the distressing memory (Visual imagery, Voices/Speech, Body/Tactile sensations, Tastes, Smells) into awareness.
- **Bilateral Stimulation Engine:** 
  - Dynamic acceleration/deceleration movement variations.
  - Therapeutic high-bell chimes synchronized with stimulation steps.
  - Full-screen support (F11) to maximize tracking area across your field of view.
- **SUDS distress tracker:** Tracks Subjective Units of Distress (SUDS) before and after sets to monitor session efficacy.
- **Deep Breath Regulation:** Transitions between sets with relaxing breathing cycles to assist emotional regulation.
- **Session History Dashboard:** Logs completed sessions securely in the browser's local storage.
- **Privacy First:** 100% client-side. No logins, no databases, no tracking. All data remains exclusively on your device.

---

## 🛠️ Tech Stack & Architecture

- **Core:** Vanilla HTML5, CSS3, and modern JavaScript (ES6+).
- **Styling:** Custom CSS with HSL-based palettes, glassmorphism tokens, and ambient background animations.
- **Audio Synthesizer:** Built-in Web Audio API synthesizer for clean, responsive sound chimes without external assets.

---

## 🧑‍💻 How to Run Locally

Since the project is built with vanilla web technologies, you can run it without any build step:

1. Clone the repository:
   ```bash
   git clone https://github.com/fraterr/EMDRapp.git
   cd EMDRapp
   ```
2. Serve the directory using any local server (e.g. Python):
   ```bash
   python -m http.server 8080
   ```
3. Open `http://localhost:8080` in your web browser.

---

## ⚠️ Disclaimer
*This application is a self-help tool and is not a substitute for professional medical advice, clinical diagnosis, or psychotherapy. If you are experiencing severe distress or trauma symptoms, please consult a licensed healthcare professional.*
