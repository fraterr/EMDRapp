# EMDR Therapy Guide - Self-Directed Session App

A premium, interactive, self-directed EMDR (Eye Movement Desensitization and Reprocessing) therapy web application designed to facilitate desensitization sessions locally and privately.

## 🔗 Try it Live
You can access the hosted application here: **[https://fraterr.github.io/EMDRapp/](https://fraterr.github.io/EMDRapp/)**

---

## 📸 Screenshots

### 1. Welcome Screen
Includes instructions, safety disclaimer, and support link.
![Welcome Screen](assets/welcome_screen.png)

### 2. Sensory Recall Guide
Prompts for structured detailing of traumatic memories (visuals, sounds, tactile feelings, tastes, smells).
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

## 🔍 What the App Does

This application guides you through a self-directed EMDR session step-by-step to help reduce the emotional intensity associated with distressing or traumatic memories:

1. **Active Memory Refocusing:** Helps you bring a specific distressing memory to mind and rate its initial intensity on a 1–10 distress scale (SUDS).
2. **Sensory Detailing:** Prompts you to log visual images, voices, body/tactile feelings, smells, and tastes associated with the memory, helping you isolate sensory triggers.
3. **Bilateral Stimulation Exercise:** Runs a 1-minute eye-tracking exercise where you follow a moving pointer horizontally. The exercise uses dynamic frequency cycles (accelerating and decelerating naturally) and calming high-bell chime audio tones to facilitate desensitization.
4. **Emotional Regulation & Breathing:** Guides you through deep breathing exercises immediately following the tracking set.
5. **Re-evaluation and Progress Comparison:** Re-evaluates your distress rating and compares it to your pre-exercise level, offering the option to perform subsequent stimulation rounds directly.
6. **Local Logs & History:** Keeps track of your session history logs securely in browser storage, allowing you to monitor desensitization patterns over time.

---

## ⚠️ Disclaimer
*This application is a self-help tool and is not a substitute for professional medical advice, clinical diagnosis, or psychotherapy. If you are experiencing severe distress or trauma symptoms, please consult a licensed healthcare professional.*
