# Eros Visual Documentation

This folder contains visual representations of the Eros app user flow.

## 📊 Available Visualizations

### 1. Interactive HTML Flowchart
**File:** `user-flow-visual.html`

A beautiful, interactive flowchart with:
- ✨ Gradient styling and hover effects
- 🎯 Complete user journey visualization
- 📱 Responsive design (works on mobile)
- 🎨 Color-coded sections with legend
- 🔍 Detailed feature breakdowns

**How to view:**
1. Open the file in any web browser
2. Or run: `open docs/user-flow-visual.html` (Mac) or `start docs/user-flow-visual.html` (Windows)

### 2. SVG Diagram
**File:** `user-flow-diagram.svg`

A clean, traditional flowchart showing:
- 🏗️ Main application flow
- 🔐 Authentication branches
- 🎮 MapQuest game detail with loops
- 🎨 Color-coded boxes by type
- ↩️ Return paths to dashboard

**How to view:**
1. Open directly in a web browser
2. View on GitHub (SVG renders automatically)
3. Import into design tools (Figma, Sketch, etc.)
4. Or run: `open docs/user-flow-diagram.svg`

## 🗺️ What's Visualized

Both diagrams show the complete Eros user experience:

### Main Flow
1. **Landing Page** → Features & How It Works
2. **Authentication** → Sign Up or Login
3. **Profile Setup** → Personal information
4. **Link Partner** → Generate/enter code
5. **Relationship Setup** → Duration, goals, how you met
6. **Dashboard** → Central hub

### Features from Dashboard
- **💬 Conflict Chat** - 3-way conversation with AI mediator
- **🗺️ MapQuest** - Guess-reveal-reflect relationship game
- **📸 Photos** - Upload and manage couple photos
- **👤 Profile** - Edit personal information
- **🛠️ Dev Tools** - Test AI mediator with simulations

### MapQuest Detailed Flow
1. Choose Mode (Discovery/Growth/Intimacy)
2. Set Depth (Light/Medium/Deep)
3. Partner A Answers → Partner B Guesses
4. Rate the Guess → AI Reflection
5. Continue or End Session
6. View Session Summary

## 🎨 Color Legend

| Color | Represents |
|-------|------------|
| Pink/Red Gradient | Landing/Start |
| Blue Gradient | Authentication |
| Green Gradient | Setup/Onboarding |
| Pink/Yellow Gradient | Dashboard |
| Teal/Purple Gradient | Features |
| Light Gradient | Return/End Points |
| Orange Circle | Decision Points |

## 📝 Notes

- All paths eventually return to the Dashboard
- Features can be accessed in any order
- The Dashboard is the central hub for all functionality
- MapQuest has a detailed loop structure for multiple rounds
- Chat supports continuous back-and-forth conversation

## 🔗 Related Documentation

- **EROS_APP_FLOWCHART.md** - Mermaid diagrams with detailed technical flows
- **EROS_TESTING_PLAN.md** - Comprehensive testing methodology
- **ENHANCED_TESTING_GUIDE.md** - Quick start for testing system

---

*Created with Claude Code - Visualizing the complete Eros user experience*
