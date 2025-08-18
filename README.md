# GridForm

A dynamic ASCII art generator that creates mesmerizing animated patterns using mathematical algorithms and interactive effects. Built with p5.js, GridForm transforms mathematical functions into beautiful text-based visualizations.

![GridForm Demo](assets/logo/GridForm.svg)

## Features

### 🎨 **Multiple Pattern Types**
- **Sine Waves** - Smooth oscillating patterns
- **Ripples** - Circular wave patterns
- **Perlin Noise** - Organic, natural-looking textures
- **Spiral** - Rotating spiral patterns
- **Checkerboard** - Geometric grid patterns
- **Stripes** - Linear stripe patterns
- **Plasma** - Colorful plasma-like effects
- **Mandelbrot** - Fractal patterns
- **Julia Set** - Complex mathematical fractals
- **Cellular Automata** - Life-like evolving patterns
- **Voronoi** - Geometric cell patterns
- **Tunnel** - 3D tunnel effects
- **Mosaic** - Tiled pattern effects

### 🎛️ **Dual Pattern System**
- **Primary Pattern** - Main visual pattern
- **Secondary Pattern** - Overlay pattern with blend modes
- **Blend Modes** - Add, Multiply, Overlay, Difference, Screen
- **Independent Controls** - Separate settings for each pattern

### 🎮 **Interactive Effects**
- **Mouse Ripples** - Create ripples with mouse movement
- **Mouse Attractor** - Patterns follow your cursor
- **Mouse Repeller** - Patterns move away from cursor
- **Mouse Trail** - Leave trails as you move
- **Mouse Distortion** - Distort patterns around cursor
- **Click Effects** - Add permanent effects with clicks

### 🎯 **Visual Effects**
- **Progressive Glow** - Characters glow based on intensity
- **Character Rotation** - Dynamic character rotation
- **Custom Character Sets** - Choose from various ASCII ramps
- **Color Customization** - Full color control for each pattern
- **Speed Control** - Adjust animation speed (0.25x to 4x)

### 📱 **User Interface**
- **Resizable Controls Panel** - Drag to resize the control panel
- **Collapsible Sections** - Organize controls into groups
- **Real-time Preview** - See changes instantly
- **Play/Pause Controls** - Control animation playback
- **Randomize Button** - Generate new random patterns
- **Download Options** - Export as PNG, JPEG, GIF, SVG, or TXT

### 🎨 **Character Sets**
- **Blocks** - █▉▊▋▌▍▎▏▒░▓ (traditional ASCII art)
- **ASCII** - .:-=+*#%@ (classic ASCII)
- **Hex** - 0123456789ABCDEF (hexadecimal)
- **Numbers** - 0123456789 (numeric)
- **Letters** - ABCDEFGHIJ (alphabetic)
- **Symbols** - !@#$%^&*(). (symbolic)
- **Braille** - ⠀⠁⠃⠇⠏⠟⠿⡿⣿ (braille patterns)
- **Custom** - Define your own character sets

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No additional software installation required

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/GridForm.git
   cd GridForm
   ```

2. Open `index.html` in your web browser
   - Or serve the files using a local web server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   ```

3. Navigate to `http://localhost:8000` in your browser

## Usage

### Basic Controls
1. **Play/Pause** - Click the play/pause button to control animation
2. **Speed Control** - Use the speed dropdown to adjust playback speed
3. **Randomize** - Click the randomize button to generate new patterns
4. **Download** - Use the download menu to export your creation

### Pattern Configuration

#### Display Settings
- **Columns/Rows** - Adjust grid resolution (20-300 columns, 15-200 rows)
- **Character Size** - Change text size (6-20 pixels)
- **Character Spacing** - Adjust spacing between characters (0.5-2.0)

#### Primary Pattern
- **Color** - Choose the main pattern color
- **Pattern Type** - Select from 13 different pattern algorithms
- **Character Set** - Choose how values are mapped to characters
- **Speed** - Control animation speed (0.001-0.05)
- **Scale** - Adjust pattern scale (0.01-0.2)
- **Progressive Glow** - Enable glow effects based on intensity
- **Character Rotation** - Enable dynamic character rotation

#### Secondary Pattern
- **Enable/Disable** - Toggle secondary pattern overlay
- **Blend Mode** - Choose how patterns combine
- **Opacity** - Control secondary pattern intensity
- **Same controls as Primary** - Independent settings for secondary pattern

#### Interactive Effects
- **Enable/Disable** - Toggle interactive mouse effects
- **Effect Type** - Choose interaction behavior
- **Strength** - Control effect intensity (0.1-2.0)
- **Radius** - Set effect area size (0.05-0.5)
- **Click Effects** - Enable permanent effects on click

### Export Options
- **PNG Image** - Static image export
- **JPEG Image** - Compressed image format
- **GIF Animation** - Animated GIF export
- **SVG Vector** - Scalable vector format
- **Text File** - Raw ASCII text output

## Technical Details

### Architecture
- **Frontend** - Pure HTML5, CSS3, and JavaScript
- **Graphics Library** - p5.js for canvas rendering
- **No Dependencies** - Self-contained application
- **Responsive Design** - Adapts to different screen sizes

### Performance
- **Optimized Rendering** - Efficient canvas-based rendering
- **Frame Rate Control** - Maintains 60fps with speed controls
- **Memory Management** - Efficient pattern calculations
- **Tab Visibility** - Automatically pauses when tab is inactive

### Browser Compatibility
- **Modern Browsers** - Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Canvas Support** - Requires HTML5 Canvas support
- **ES6 Features** - Uses modern JavaScript features

## Customization

### Adding New Patterns
To add a new pattern type, modify the `getPatternValue()` function in `js/scripts.js`:

```javascript
function getPatternValue(x, y, pattern, time) {
    // Add your pattern calculation here
    switch(pattern.type) {
        case 'yourPattern':
            return yourPatternFunction(x, y, time, pattern);
        // ... existing cases
    }
}
```

### Custom Character Sets
You can define custom character sets in the UI or modify the `ASCII_RAMPS` object:

```javascript
const ASCII_RAMPS = {
    // ... existing ramps
    custom: " .:-=+*#%@"
};
```

### Styling
The application uses CSS custom properties and can be styled by modifying `styles/styles.css`.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **p5.js** - Creative coding library
- **FeatureMono Font** - Custom monospace font family
- **Mathematical Patterns** - Inspired by various mathematical visualizations

## Version History

- **v1.0** - Initial release with core pattern generation and interactive effects

---

**GridForm** - Where mathematics meets ASCII art. Create, explore, and share your digital masterpieces!
