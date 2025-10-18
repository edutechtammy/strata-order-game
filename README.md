# Strata Order Game

## Educational Purpose

This interactive educational activity helps students understand how **index fossils** are used to establish the chronological order and relative age of geological strata layers. Students practice the fundamental geological principle that fossil sequences can reveal the temporal relationships between rock formations.

### Learning Objectives

Students will:
- **Apply stratigraphic principles** to determine the relative ages of rock layers
- **Understand index fossils** as key markers for dating geological formations  
- **Practice logical reasoning** by analyzing incomplete fossil records across multiple sample columns
- **Develop spatial reasoning** skills by visualizing geological time sequences

### How It Works

Students drag and drop seven index fossils into the correct chronological order, from youngest (top) to oldest (bottom). The game provides reference strata columns showing partial fossil sequences that students must analyze to determine the complete temporal order. 

**Key Educational Approach**: Rather than requiring memorization of specific fossil names, this game teaches the **logical reasoning process** that geologists use to construct geological time sequences. Students learn how scientists piece together evidence from multiple incomplete fossil records to understand Earth's history - a critical skill that mirrors real-world geological fieldwork.

## Technical Implementation

- **Accessible Design**: Full keyboard navigation support and screen reader compatibility
- **Responsive Interface**: Works on desktop, tablet, and mobile devices
- **Educational Feedback**: Immediate validation with constructive guidance

## Files

- **index.html** — Main interactive page with game interface
- **styles.css** — Responsive styling and accessibility features  
- **app.js** — Game logic including drag & drop, keyboard navigation, and validation
- **assets/** — Index fossil images and reference strata column diagrams used by the game
- **graphics-source/** — Original Photoshop files and exported graphics for future updates

## How to Use

### For Students
1. Open `index.html` in any modern web browser
2. Study the reference strata columns to understand fossil relationships
3. Drag fossils from the pool to the strata layers, youngest to oldest
4. Click "Check" to validate your arrangement
5. Use "Keyboard Navigation" button for accessibility instructions

### For Educators  
This activity works well for:
- **Individual practice** — Students work at their own pace
- **Classroom discussion** — Project for group analysis of fossil sequences
- **Assessment tool** — Quick check of stratigraphic understanding
- **Remote learning** — Self-contained, no special software required

### Technical Setup
1. Download all files maintaining the folder structure
2. For best results, serve from a local web server:

```bash
# From the project folder
python3 -m http.server 8000
# Open http://localhost:8000/index.html
```

Alternatively, open `index.html` directly in most modern browsers.

## Graphics and Asset Management

The **graphics-source/** folder contains the original design files for easy updates:
- **Photoshop source file** (.psd) with all layers and design elements
- **Exported reference images** for backup and comparison
- **Original graphics** at full resolution before web optimization

When updating graphics or visual elements:
1. Edit the `.psd` file in the `graphics-source/` folder
2. Export updated images to the `assets/` folder
3. Maintain consistent file naming and dimensions for seamless integration

## Educational Standards Alignment

This activity supports learning objectives in:
- **Earth Science** — Geological time and fossil evidence
- **Scientific Inquiry** — Data analysis and logical reasoning
- **STEM Integration** — Combining observation, analysis, and technology

## Accessibility Features

- **Keyboard Navigation** — Full functionality without mouse/touch
- **Screen Reader Support** — Comprehensive ARIA labels and announcements
- **High Contrast** — Meets WCAG AAA accessibility standards
- **Multiple Input Methods** — Mouse, keyboard, and touch support
- **Responsive Design** — Works on all device sizes

## Future Enhancements

- Additional fossil sets for different geological periods
- Scoring and progress tracking for classroom management
- Audio descriptions for enhanced accessibility
- Multi-language support for diverse learners

## 🤝 Contributing & Feedback

We welcome feedback from educators, students, geologists, and developers! 

### 📢 Ways to Get Involved
- **🎓 Educational Suggestions**: Use our [Educational Improvement template](../../issues/new?template=educational-improvement.md)
- **🐛 Report Issues**: Found a bug? Use our [Bug Report template](../../issues/new?template=bug-report.md)  
- **🦕 Content Updates**: Need different fossils? Use our [Fossil Content template](../../issues/new?template=fossil-content-request.md)
- **💬 General Discussion**: Join conversations in [Discussions](../../discussions)

### 🎯 We're Especially Looking For
- Feedback from geology educators and students
- Accessibility testing and improvements
- Suggestions for curriculum alignment
- High-quality fossil images and geological accuracy reviews

See our [Contributing Guidelines](CONTRIBUTING.md) for more details on how to get involved!

## 📧 Contact
**Tammy Moore** - teacher.tammy.moore@gmail.com
