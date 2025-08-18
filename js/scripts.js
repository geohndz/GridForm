// GridForm - ASCII Art Animation Generator
// Features: Multiple pattern types, dual pattern blending, interactive effects, and export options
// Export formats: PNG, JPEG, GIF (animated), and text files
// 
// ASCII grayscale ramp - from darkest to lightest
// Each string represents a progression from dark to light characters
const ASCII_RAMPS = {
    blocks: " ░▒▓▌▍▎▏▊▋█",    // Block characters for high contrast
    ascii: " .:-=+*#%@",      // Standard ASCII characters
    hex: " 0123456789ABCDEF", // Hexadecimal digits
    numbers: " 0123456789",   // Decimal digits
    letters: " ABCDEFGHIJ",   // Alphabetic characters
    symbols: " !@#$%^&*().",  // Special symbols
    braille: " ⠀⠁⠃⠇⠏⠟⠿⡿⣿", // Braille patterns
    custom: " .:-=+*#%@"      // User-defined custom set
};

// Character dimensions and scaling
let baseCharWidth = 8;   // Base character width in pixels (monospace font)
let baseCharHeight = 14; // Base character height in pixels (monospace font)
let gridScale = 1.0;     // Scale factor for the entire grid (for responsive sizing)

// Character sets for primary and secondary patterns
let currentRamp = ASCII_RAMPS.blocks;  // Legacy variable (deprecated)
let currentRamp1 = ASCII_RAMPS.blocks; // Character set for primary pattern
let currentRamp2 = ASCII_RAMPS.blocks; // Character set for secondary pattern

// Canvas and animation state
let canvas;              // p5.js canvas reference
let time = 0;            // Animation time counter (increments each frame)
let gridCols, gridRows;  // Grid dimensions (columns and rows)

// Interactive effects state
let mousePos = { x: 0.5, y: 0.5 }; // Normalized mouse position (0-1 range)
let clickEffects = [];              // Array of active click ripple effects
let cellularGrid = [];              // 2D array for cellular automata patterns
let voronoiPoints = [];             // Array of points for Voronoi pattern generation

// UI resize functionality variables
let isResizing = false;    // Whether user is currently resizing the controls panel
let resizeStartX = 0;      // Mouse X position when resize started
let resizeStartWidth = 0;  // Controls panel width when resize started

// Animation control
let isPaused = false;      // Whether animation is paused
let speedMultiplier = 1.0; // Animation speed multiplier (0.5x, 1x, 2x, etc.)

// All available pattern types for morphing and randomization
const PATTERN_TYPES = ['waves', 'ripples', 'noise', 'spiral', 'checkerboard', 'stripes', 'plasma', 'mandelbrot', 'julia', 'cellular', 'voronoi', 'tunnel', 'mosaic'];

// Main application settings object - contains all user-configurable parameters
let settings = {
    // Display settings
    gridCols: 80,        // Number of columns in the ASCII grid
    gridRows: 50,        // Number of rows in the ASCII grid
    charSize: 12,        // Font size for ASCII characters
    charSpacing: 1.0,    // Spacing multiplier between characters
    
    // Primary pattern configuration
    pattern1: {
        type: 'waves',     // Pattern type (see PATTERN_TYPES)
        speed: 0.01,       // Animation speed multiplier
        scale: 0.05,       // Pattern scale/density
        color: '#ffffff',  // Pattern color (hex)
        glow: false,       // Whether to apply glow effect
        rotation: false    // Whether to rotate characters based on pattern value
    },
    
    // Secondary pattern configuration (for blending)
    pattern2: {
        enabled: false,    // Whether secondary pattern is active
        type: 'ripples',   // Pattern type
        speed: 0.02,       // Animation speed multiplier
        scale: 0.08,       // Pattern scale/density
        color: '#00ff00',  // Pattern color (hex)
        glow: false,       // Whether to apply glow effect
        rotation: false    // Whether to rotate characters
    },
    
    // Interactive effects configuration
    interactive: {
        enabled: false,    // Whether interactive effects are active
        type: 'ripple',    // Effect type: 'ripple', 'attract', 'repel', 'trail', 'distort'
        strength: 1.0,     // Effect intensity multiplier
        radius: 0.2,       // Effect radius (normalized 0-1)
        clickEnabled: true // Whether mouse clicks create ripple effects
    },
    
    // Pattern blending configuration
    blendSettings: {
        mode: 'multiply',  // Blend mode: 'add', 'multiply', 'overlay', 'difference', 'screen'
        amount: 0.5        // Blend intensity (0-1)
    }
};

/**
 * Main initialization function called by p5.js when the sketch starts
 * Sets up the canvas, initializes all UI controls, and configures event listeners
 */
function setup() {
    // Create canvas with default size, then resize to fit grid
    canvas = createCanvas(800, 500); // Start with default size
    updateCanvasSize(); // Then update to fit grid
    canvas.parent('canvas-container');

    // Configure text rendering
    textAlign(CENTER, CENTER);
    noSmooth(); // Disable anti-aliasing for crisp ASCII characters

    // Set grid dimensions from settings
    gridCols = settings.gridCols;
    gridRows = settings.gridRows;

    // Initialize special pattern systems
    initCellular();  // Set up cellular automata grid
    initVoronoi();   // Set up Voronoi pattern points

    // Set up all UI components and event handlers
    setupControls();           // Main control panel event listeners
    setupPlayPauseButton();    // Play/pause button functionality
    setupSpeedButton();        // Speed control button
    setupRandomizeButton();    // Randomize settings button
    setupDownloadButton();     // Export/download functionality
    setupResizeHandling();     // Controls panel resize functionality
    setupTooltips();           // Button tooltips
    
    // Position the floating button group
    updateButtonGroupPosition();

    // Handle tab visibility changes (pause animation when tab is hidden)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Tab is hidden/inactive - pause if not already paused
            if (!isPaused) {
                noLoop();
            }
        } else {
            // Tab is visible/active - resume if not manually paused
            if (!isPaused) {
                loop();
            }
        }
    });
}

/**
 * Calculates and updates canvas size to fit the current grid configuration
 * Ensures the canvas is large enough to display all characters while staying within bounds
 */
function updateCanvasSize() {
    // Calculate required canvas size based on grid and character size
    let requiredWidth = gridCols * baseCharWidth * (settings.charSize / 12) * settings.charSpacing;
    let requiredHeight = gridRows * baseCharHeight * (settings.charSize / 12) * settings.charSpacing;

    // Constrain to maximum dimensions to prevent oversized canvas
    let maxWidth = 800;
    let maxHeight = 500;

    // Calculate scale factor if needed (don't scale up, only down)
    let scaleX = maxWidth / requiredWidth;
    let scaleY = maxHeight / requiredHeight;
    let scale = Math.min(scaleX, scaleY, 1.0);

    // Calculate final canvas dimensions (constrained to maximum)
    let finalWidth = Math.min(requiredWidth, maxWidth);
    let finalHeight = Math.min(requiredHeight, maxHeight);

    // Only resize if dimensions changed significantly (prevents unnecessary resizing)
    if (Math.abs(width - finalWidth) > 5 || Math.abs(height - finalHeight) > 5) {
        resizeCanvas(finalWidth, finalHeight);
    }
}

/**
 * Sets up the resize functionality for the controls panel
 * Allows users to drag the left edge of the controls panel to resize it
 */
function setupResizeHandling() {
    const resizeHandle = document.getElementById('resize-handle');
    const controlsPanel = document.getElementById('controls');

    // Helper function to update the resize handle position
    function updateHandlePosition() {
        const controlsWidth = controlsPanel.offsetWidth;
        resizeHandle.style.right = (controlsWidth - 4.5) + 'px'; // Center on the 1px border
    }

    updateHandlePosition();

    // Start resize operation on mouse down
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizeStartX = e.clientX;
        resizeStartWidth = controlsPanel.offsetWidth;

        // Add visual feedback classes
        resizeHandle.classList.add('dragging');
        controlsPanel.classList.add('resizing');
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';

        e.preventDefault();
    });

    // Handle resize during mouse movement
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const deltaX = resizeStartX - e.clientX;
        const newWidth = resizeStartWidth + deltaX;
        const minWidth = 250;  // Minimum controls panel width
        const maxWidth = window.innerWidth * 0.3;  // Maximum 30% of window width

        const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        controlsPanel.style.width = clampedWidth + 'px';

        // Update handle position to stay aligned
        resizeHandle.style.right = (clampedWidth - 4.5) + 'px';

        // Update button group position to stay centered in the canvas area
        updateButtonGroupPosition();

        e.preventDefault();
    });

    // End resize operation on mouse up
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;

            // Remove visual feedback classes
            resizeHandle.classList.remove('dragging');
            controlsPanel.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // Reset border color when resizing ends
            controlsPanel.style.borderLeftColor = '#333';
        }
    });

    // Handle hover states for visual feedback
    resizeHandle.addEventListener('mouseenter', () => {
        if (!isResizing) {
            controlsPanel.style.borderLeftColor = '#fff';
        }
    });

    resizeHandle.addEventListener('mouseleave', () => {
        if (!isResizing) {
            controlsPanel.style.borderLeftColor = '#333';
        }
    });

    // Update handle position when window is resized
    window.addEventListener('resize', () => {
        updateHandlePosition();
        updateButtonGroupPosition();
    });
}

/**
 * Updates the position of the floating button group to stay centered in the canvas area
 * Called when the controls panel is resized or the window is resized
 */
function updateButtonGroupPosition() {
    const buttonGroup = document.getElementById('button-group');
    const controlsPanel = document.getElementById('controls');
    const controlsWidth = controlsPanel.offsetWidth;
    const canvasAreaWidth = window.innerWidth - controlsWidth;
    
    // Calculate the center of the canvas area (left side of the viewport)
    const canvasCenter = canvasAreaWidth / 2;
    
    // Position the button group at the center of the canvas area
    buttonGroup.style.left = canvasCenter + 'px';
    buttonGroup.style.transform = 'translateX(-50%)'; // Center the button group on its position
}

/**
 * Main rendering function called by p5.js each frame
 * Renders the ASCII art grid with all patterns, effects, and animations
 */
function draw() {
    // Clear canvas with black background
    background(0);
    
    // Update animation time (adjusted by speed multiplier)
    time += 0.016 * speedMultiplier; // ~60fps with speed multiplier

    // Update interactive effects (click ripples, etc.)
    updateInteractiveEffects();

    // Configure text rendering
    textAlign(CENTER, CENTER);
    textSize(settings.charSize);

    // Calculate grid dimensions in pixels
    let gridPixelWidth = gridCols * baseCharWidth;
    let gridPixelHeight = gridRows * baseCharHeight;

    // Calculate scale factor to fit within canvas bounds
    let scaleX = width / gridPixelWidth;
    let scaleY = height / gridPixelHeight;
    gridScale = Math.min(scaleX, scaleY, 1.0); // Don't scale up, only down

    // Calculate actual character size and spacing (scaled for responsive design)
    let actualCharWidth = baseCharWidth * gridScale * settings.charSpacing;
    let actualCharHeight = baseCharHeight * gridScale * settings.charSpacing;
    let actualCharSize = settings.charSize * gridScale;

    // Center the grid in the canvas
    let startX = (width - (gridCols * actualCharWidth)) / 2;
    let startY = (height - (gridRows * actualCharHeight)) / 2;

    textSize(actualCharSize);

    // Render each character in the grid
    for (let x = 0; x < gridCols; x++) {
        for (let y = 0; y < gridRows; y++) {
            // Calculate pixel position for this grid cell
            let xPos = startX + (x + 0.5) * actualCharWidth;
            let yPos = startY + (y + 0.5) * actualCharHeight;

            // Calculate primary pattern value (0-1 range)
            let value1 = getPatternValue(x, y, settings.pattern1, time);

            // Initialize final values with primary pattern
            let finalValue = value1;
            let finalColor = settings.pattern1.color;
            let glowIntensity1 = settings.pattern1.glow ? value1 : 0;
            let glowIntensity2 = 0;
            let useRamp1 = true;
            let shouldRotate1 = settings.pattern1.rotation;
            let shouldRotate2 = false;

            // Add secondary pattern if enabled (pattern blending)
            if (settings.pattern2.enabled) {
                let value2 = getPatternValue(x, y, settings.pattern2, time);
                finalValue = blendValues(value1, value2, settings.blendSettings.mode, settings.blendSettings.amount);
                glowIntensity2 = settings.pattern2.glow ? value2 : 0;

                // Blend colors from both patterns
                finalColor = blendColors(
                    settings.pattern1.color,
                    settings.pattern2.color,
                    settings.blendSettings.mode,
                    value1,
                    value2,
                    settings.blendSettings.amount
                );

                // Decide which character set to use based on blend strength
                let blendStrength = value1 * value2 * settings.blendSettings.amount;
                useRamp1 = blendStrength < 0.5;
                shouldRotate2 = settings.pattern2.rotation;
            }

            // Apply interactive effects (mouse hover, clicks, etc.)
            if (settings.interactive.enabled) {
                finalValue = applyInteractiveEffect(x, y, finalValue);
            }

            // Apply glow effect BEFORE setting fill and drawing text
            let maxGlowIntensity = Math.max(glowIntensity1, glowIntensity2);
            if (maxGlowIntensity > 0) {
                // Enhance the glow intensity based on the pattern value
                let enhancedGlowIntensity = Math.pow(maxGlowIntensity, 0.7); // Use power curve to make mid-values more visible
                applyGlow(finalColor, enhancedGlowIntensity, actualCharSize);
            }

            // Set fill color AFTER applying glow
            fill(finalColor);

            // Convert pattern value to ASCII character using appropriate character set
            let selectedRamp = useRamp1 ? currentRamp1 : currentRamp2;
            let charIndex = Math.floor(map(finalValue, 0, 1, 0, selectedRamp.length - 1));
            charIndex = constrain(charIndex, 0, selectedRamp.length - 1);
            let char = selectedRamp[charIndex];

            // Calculate rotation if enabled
            let rotationAngle = 0;
            if ((useRamp1 && shouldRotate1) || (!useRamp1 && shouldRotate2)) {
                // Create rotation based on pattern value and position
                rotationAngle = finalValue * TWO_PI + (x + y) * 0.1 + time * 2;
            }

            // Draw character with or without rotation
            if (rotationAngle !== 0) {
                push();
                translate(xPos, yPos);
                rotate(rotationAngle);
                text(char, 0, 0);
                pop();
            } else {
                text(char, xPos, yPos);
            }
        }
    }
}

/**
 * Updates interactive effects each frame
 * Currently handles decay of click ripple effects
 */
function updateInteractiveEffects() {
    // Decay click effects and remove expired ones
    clickEffects = clickEffects.filter(effect => {
        effect.life -= 0.016; // Reduce life by one frame (~60fps)
        return effect.life > 0; // Keep only effects that are still alive
    });
}

/**
 * Applies interactive effects to a grid cell based on mouse position and click effects
 * @param {number} x - Grid column index
 * @param {number} y - Grid row index
 * @param {number} baseValue - Base pattern value (0-1)
 * @returns {number} Modified pattern value with interactive effects applied
 */
function applyInteractiveEffect(x, y, baseValue) {
    // Convert grid coordinates to normalized coordinates (0-1 range)
    let normalizedX = x / gridCols;
    let normalizedY = y / gridRows;
    let effect = 0;

    // Apply mouse hover effects
    let mouseDistance = dist(normalizedX, normalizedY, mousePos.x, mousePos.y);
    if (mouseDistance < settings.interactive.radius) {
        let strength = (1 - mouseDistance / settings.interactive.radius) * settings.interactive.strength;

        // Apply different effect types based on settings
        switch (settings.interactive.type) {
            case 'ripple':
                // Create ripple waves emanating from mouse position
                effect += sin(mouseDistance * 20 - time * 5) * strength * 0.3;
                break;
            case 'attract':
                // Increase brightness near mouse
                effect += strength * 0.5;
                break;
            case 'repel':
                // Decrease brightness near mouse
                effect -= strength * 0.5;
                break;
            case 'trail':
                // Create animated trail effect
                effect += strength * 0.4 * sin(time * 2);
                break;
            case 'distort':
                // Create distortion based on angle from mouse
                let angle = atan2(normalizedY - mousePos.y, normalizedX - mousePos.x);
                effect += sin(angle * 4 + time * 3) * strength * 0.3;
                break;
        }
    }

    // Apply click ripple effects
    for (let clickEffect of clickEffects) {
        let clickDistance = dist(normalizedX, normalizedY, clickEffect.x, clickEffect.y);
        if (clickDistance < clickEffect.radius) {
            // Calculate effect strength based on distance and remaining life
            let clickStrength = (1 - clickDistance / clickEffect.radius) * clickEffect.strength * (clickEffect.life / clickEffect.maxLife);
            // Create expanding ripple wave
            effect += sin(clickDistance * 15 - (clickEffect.maxLife - clickEffect.life) * 3) * clickStrength;
        }
    }

    // Return final value constrained to 0-1 range
    return constrain(baseValue + effect, 0, 1);
}

/**
 * Calculates the pattern value for a specific grid cell
 * @param {number} x - Grid column index
 * @param {number} y - Grid row index
 * @param {object} pattern - Pattern configuration object
 * @param {number} time - Current animation time
 * @returns {number} Pattern value in 0-1 range
 */
function getPatternValue(x, y, pattern, time) {
    // Convert grid coordinates to normalized coordinates (0-1 range)
    let normalizedX = x / gridCols;
    let normalizedY = y / gridRows;
    let value = 0;

    // Generate different pattern types based on pattern.type
    switch (pattern.type) {
        case 'waves':
            // Create animated wave pattern using sine waves
            value = (sin(normalizedX * TWO_PI * 5 + time * pattern.speed * 100) +
                sin(normalizedY * TWO_PI * 3 + time * pattern.speed * 80)) / 2;
            break;

        case 'ripples':
            // Create expanding ripple waves from center
            let centerX = 0.5;
            let centerY = 0.5;
            let distance = dist(normalizedX, normalizedY, centerX, centerY);
            value = sin(distance * TWO_PI * 10 - time * pattern.speed * 200);
            break;

        case 'noise':
            // Use Perlin noise for organic, natural-looking patterns
            value = noise(normalizedX * pattern.scale * 100, normalizedY * pattern.scale * 100, time * pattern.speed * 10) * 2 - 1;
            break;

        case 'spiral':
            // Create spiral pattern using polar coordinates
            let angle = atan2(normalizedY - 0.5, normalizedX - 0.5);
            let radius = dist(normalizedX, normalizedY, 0.5, 0.5);
            value = sin(angle * 3 + radius * 20 + time * pattern.speed * 100);
            break;

        case 'checkerboard':
            // Create animated checkerboard pattern
            let checkX = floor(normalizedX * pattern.scale * 100);
            let checkY = floor(normalizedY * pattern.scale * 100);
            value = ((checkX + checkY + floor(time * pattern.speed * 100)) % 2) * 2 - 1;
            break;

        case 'stripes':
            // Create diagonal stripe pattern
            value = sin((normalizedX + normalizedY) * pattern.scale * 200 + time * pattern.speed * 100);
            break;

        case 'plasma':
            // Create complex plasma effect using multiple sine waves
            value = (sin(normalizedX * 16 + time * pattern.speed * 80) +
                sin(normalizedY * 8 + time * pattern.speed * 60) +
                sin((normalizedX + normalizedY) * 16 + time * pattern.speed * 40) +
                sin(sqrt(normalizedX * normalizedX + normalizedY * normalizedY) * 8 + time * pattern.speed * 120)) / 4;
            break;

        case 'mandelbrot':
            // Create animated Mandelbrot set pattern
            let zx = (normalizedX - 0.5) * 4;
            let zy = (normalizedY - 0.5) * 4;
            let cx = zx + sin(time * pattern.speed * 50) * 0.3;
            let cy = zy + cos(time * pattern.speed * 30) * 0.3;
            value = mandelbrotIteration(cx, cy, 20) / 20;
            break;

        case 'julia':
            // Create animated Julia set pattern
            let jx = (normalizedX - 0.5) * 4;
            let jy = (normalizedY - 0.5) * 4;
            let juliaC = { x: sin(time * pattern.speed * 100) * 0.8, y: cos(time * pattern.speed * 70) * 0.8 };
            value = juliaIteration(jx, jy, juliaC, 20) / 20;
            break;

        case 'cellular':
            // Create cellular automata pattern (Conway's Game of Life)
            if (floor(time * pattern.speed * 100) % 30 === 0) {
                updateCellular();
            }
            let cellX = floor(normalizedX * 40);
            let cellY = floor(normalizedY * 30);
            value = (cellularGrid[cellY] && cellularGrid[cellY][cellX]) ? 1 : -1;
            break;

        case 'voronoi':
            // Create Voronoi diagram pattern
            value = getVoronoiValue(normalizedX, normalizedY, time * pattern.speed);
            break;

        case 'tunnel':
            // Create tunnel/wormhole effect
            let tunnelAngle = atan2(normalizedY - 0.5, normalizedX - 0.5);
            let tunnelRadius = dist(normalizedX, normalizedY, 0.5, 0.5);
            value = sin(tunnelAngle * 8 + time * pattern.speed * 100) *
                sin(1 / (tunnelRadius + 0.1) + time * pattern.speed * 50);
            break;

        case 'mosaic':
            // Create mosaic/tiled pattern using hash function
            let mosaicX = floor(normalizedX * pattern.scale * 200);
            let mosaicY = floor(normalizedY * pattern.scale * 200);
            let mosaicHash = ((mosaicX * 73856093) ^ (mosaicY * 19349663)) % 1000000;
            value = (mosaicHash / 500000 - 1) + sin(time * pattern.speed * 100) * 0.3;
            break;
    }

    // Normalize to 0-1 range (convert from -1 to 1 range)
    return (value + 1) / 2;
}

/**
 * Calculates Mandelbrot set iteration count for a given complex number
 * @param {number} cx - Real part of complex number
 * @param {number} cy - Imaginary part of complex number
 * @param {number} maxIter - Maximum number of iterations
 * @returns {number} Number of iterations before escape (0 to maxIter)
 */
function mandelbrotIteration(cx, cy, maxIter) {
    let zx = 0, zy = 0;
    for (let i = 0; i < maxIter; i++) {
        if (zx * zx + zy * zy > 4) return i; // Escape condition
        let temp = zx * zx - zy * zy + cx;   // z^2 + c (real part)
        zy = 2 * zx * zy + cy;               // z^2 + c (imaginary part)
        zx = temp;
    }
    return maxIter; // Point is in the set
}

/**
 * Calculates Julia set iteration count for a given complex number and constant
 * @param {number} zx - Real part of starting complex number
 * @param {number} zy - Imaginary part of starting complex number
 * @param {object} c - Complex constant {x: real, y: imaginary}
 * @param {number} maxIter - Maximum number of iterations
 * @returns {number} Number of iterations before escape (0 to maxIter)
 */
function juliaIteration(zx, zy, c, maxIter) {
    for (let i = 0; i < maxIter; i++) {
        if (zx * zx + zy * zy > 4) return i; // Escape condition
        let temp = zx * zx - zy * zy + c.x;  // z^2 + c (real part)
        zy = 2 * zx * zy + c.y;              // z^2 + c (imaginary part)
        zx = temp;
    }
    return maxIter; // Point is in the set
}

/**
 * Initializes the cellular automata grid with random cells
 * Creates a 40x30 grid where each cell has a 40% chance of being alive
 */
function initCellular() {
    cellularGrid = [];
    for (let y = 0; y < 30; y++) {
        cellularGrid[y] = [];
        for (let x = 0; x < 40; x++) {
            cellularGrid[y][x] = Math.random() > 0.6; // 40% chance of being alive
        }
    }
}

/**
 * Updates the cellular automata grid using Conway's Game of Life rules
 * Rules: Live cells with 2-3 neighbors survive, dead cells with exactly 3 neighbors become alive
 */
function updateCellular() {
    let newGrid = [];
    for (let y = 0; y < 30; y++) {
        newGrid[y] = [];
        for (let x = 0; x < 40; x++) {
            // Count live neighbors (8 surrounding cells)
            let neighbors = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue; // Skip the cell itself
                    let nx = x + dx;
                    let ny = y + dy;
                    if (nx >= 0 && nx < 40 && ny >= 0 && ny < 30) {
                        if (cellularGrid[ny][nx]) neighbors++;
                    }
                }
            }
            
            // Apply Conway's Game of Life rules
            if (cellularGrid[y][x]) {
                // Live cell: survives if it has 2 or 3 neighbors
                newGrid[y][x] = neighbors === 2 || neighbors === 3;
            } else {
                // Dead cell: becomes alive if it has exactly 3 neighbors
                newGrid[y][x] = neighbors === 3;
            }
        }
    }
    cellularGrid = newGrid;
}

/**
 * Initializes Voronoi pattern points with random positions and velocities
 * Creates 8 moving points that will define the Voronoi diagram regions
 */
function initVoronoi() {
    voronoiPoints = [];
    for (let i = 0; i < 8; i++) {
        voronoiPoints.push({
            x: Math.random(),                    // Random initial X position
            y: Math.random(),                    // Random initial Y position
            vx: (Math.random() - 0.5) * 0.02,   // Random X velocity
            vy: (Math.random() - 0.5) * 0.02    // Random Y velocity
        });
    }
}

/**
 * Calculates Voronoi diagram value for a given position
 * @param {number} x - Normalized X coordinate (0-1)
 * @param {number} y - Normalized Y coordinate (0-1)
 * @param {number} timeOffset - Time offset for animation
 * @returns {number} Voronoi value in -1 to 1 range
 */
function getVoronoiValue(x, y, timeOffset) {
    // Update point positions (move points around)
    for (let point of voronoiPoints) {
        point.x += point.vx;
        point.y += point.vy;

        // Bounce points off edges to keep them within bounds
        if (point.x <= 0 || point.x >= 1) point.vx *= -1;
        if (point.y <= 0 || point.y >= 1) point.vy *= -1;
        point.x = constrain(point.x, 0, 1);
        point.y = constrain(point.y, 0, 1);
    }

    // Find the two closest points to create Voronoi regions
    let minDist = Infinity;
    let secondMinDist = Infinity;

    for (let point of voronoiPoints) {
        let d = dist(x, y, point.x, point.y);
        if (d < minDist) {
            secondMinDist = minDist;
            minDist = d;
        } else if (d < secondMinDist) {
            secondMinDist = d;
        }
    }

    // Create pattern based on distance difference between closest and second-closest points
    return ((secondMinDist - minDist) * 10 + sin(timeOffset * 100)) * 2 - 1;
}

/**
 * Converts a hex color string to RGB object
 * @param {string} hex - Hex color string (e.g., "#ff0000" or "ff0000")
 * @returns {object} RGB object with r, g, b properties (0-255)
 */
function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 }; // Default to white if parsing fails
}

/**
 * Converts HSL color values to hex string
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} Hex color string
 */
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Blends two colors using various blend modes
 * @param {string} color1Hex - First color in hex format
 * @param {string} color2Hex - Second color in hex format
 * @param {string} mode - Blend mode: 'add', 'multiply', 'overlay', 'difference', 'screen'
 * @param {number} value1 - Pattern value from first pattern (0-1)
 * @param {number} value2 - Pattern value from second pattern (0-1)
 * @param {number} amount - Blend intensity (0-1)
 * @returns {string} Blended color in RGB format
 */
function blendColors(color1Hex, color2Hex, mode, value1, value2, amount) {
    let color1 = hexToRgb(color1Hex);
    let color2 = hexToRgb(color2Hex);

    // Calculate local blend factor based on pattern values and blend amount
    let localBlend = value1 * value2 * amount;

    let r, g, b;

    // Apply different blend modes
    switch (mode) {
        case 'add':
            // Additive blending (brightens the result)
            r = constrain(color1.r + (color2.r * localBlend), 0, 255);
            g = constrain(color1.g + (color2.g * localBlend), 0, 255);
            b = constrain(color1.b + (color2.b * localBlend), 0, 255);
            break;

        case 'multiply':
            // Multiplicative blending (darkens the result)
            r = lerp(color1.r, (color1.r * color2.r) / 255, localBlend);
            g = lerp(color1.g, (color1.g * color2.g) / 255, localBlend);
            b = lerp(color1.b, (color1.b * color2.b) / 255, localBlend);
            break;

        case 'overlay':
            // Overlay blending (combines multiply and screen)
            r = lerp(color1.r, color1.r < 128 ? (2 * color1.r * color2.r) / 255 : 255 - (2 * (255 - color1.r) * (255 - color2.r)) / 255, localBlend);
            g = lerp(color1.g, color1.g < 128 ? (2 * color1.g * color2.g) / 255 : 255 - (2 * (255 - color1.g) * (255 - color2.g)) / 255, localBlend);
            b = lerp(color1.b, color1.b < 128 ? (2 * color1.b * color2.b) / 255 : 255 - (2 * (255 - color1.b) * (255 - color2.b)) / 255, localBlend);
            break;

        case 'difference':
            // Difference blending (shows the difference between colors)
            r = lerp(color1.r, Math.abs(color1.r - color2.r), localBlend);
            g = lerp(color1.g, Math.abs(color1.g - color2.g), localBlend);
            b = lerp(color1.b, Math.abs(color1.b - color2.b), localBlend);
            break;

        case 'screen':
            // Screen blending (lightens the result)
            r = lerp(color1.r, 255 - (((255 - color1.r) * (255 - color2.r)) / 255), localBlend);
            g = lerp(color1.g, 255 - (((255 - color1.g) * (255 - color2.g)) / 255), localBlend);
            b = lerp(color1.b, 255 - (((255 - color1.b) * (255 - color2.b)) / 255), localBlend);
            break;

        default:
            // Linear interpolation (default)
            r = lerp(color1.r, color2.r, localBlend);
            g = lerp(color1.g, color2.g, localBlend);
            b = lerp(color1.b, color2.b, localBlend);
    }

    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
}

/**
 * Applies a glow effect to the current drawing context
 * @param {string} color - Color string (RGB or hex format)
 * @param {number} intensity - Glow intensity (0-1)
 * @param {number} charSize - Character size for scaling the glow
 */
function applyGlow(color, intensity, charSize) {
    if (intensity <= 0) return;

    // Parse color to extract RGB values
    let colorMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!colorMatch) {
        // Handle hex colors if rgb parsing fails
        let hexMatch = color.match(/#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/);
        if (hexMatch) {
            let r = parseInt(hexMatch[1], 16);
            let g = parseInt(hexMatch[2], 16);
            let b = parseInt(hexMatch[3], 16);
            colorMatch = [null, r, g, b];
        } else {
            return; // Skip glow if color parsing fails
        }
    }

    let r = parseInt(colorMatch[1]);
    let g = parseInt(colorMatch[2]);
    let b = parseInt(colorMatch[3]);

    // Calculate glow parameters
    let glowSize = intensity * charSize * 3.0;  // Glow blur radius
    let glowAlpha = Math.min(intensity * 1.5, 1.0);  // Glow opacity (capped at 1.0)

    push();
    // Apply shadow-based glow effect
    drawingContext.shadowColor = `rgba(${r}, ${g}, ${b}, ${glowAlpha})`;
    drawingContext.shadowBlur = glowSize;

    // Ensure no shadow offset for centered glow
    drawingContext.shadowOffsetX = 0;
    drawingContext.shadowOffsetY = 0;
    pop();
}

/**
 * Blends two pattern values using various mathematical blend modes
 * @param {number} value1 - First pattern value (0-1)
 * @param {number} value2 - Second pattern value (0-1)
 * @param {string} mode - Blend mode: 'add', 'multiply', 'overlay', 'difference', 'screen'
 * @param {number} amount - Blend intensity (0-1)
 * @returns {number} Blended value (0-1)
 */
function blendValues(value1, value2, mode, amount) {
    // Adjust second value based on blend amount
    value2 = lerp(0.5, value2, amount);

    // Apply different mathematical blend modes
    switch (mode) {
        case 'add':
            // Additive blending (brightens)
            return constrain(value1 + value2 - 0.5, 0, 1);
        case 'multiply':
            // Multiplicative blending (darkens)
            return value1 * value2;
        case 'overlay':
            // Overlay blending (combines multiply and screen)
            return value1 < 0.5 ? 2 * value1 * value2 : 1 - 2 * (1 - value1) * (1 - value2);
        case 'difference':
            // Difference blending (shows contrast)
            return abs(value1 - value2);
        case 'screen':
            // Screen blending (lightens)
            return 1 - (1 - value1) * (1 - value2);
        default:
            // Return original value if mode not recognized
            return value1;
    }
}

/**
 * p5.js mouse moved event handler
 * Updates mouse position for interactive effects when interactive mode is enabled
 */
function mouseMoved() {
    if (settings.interactive.enabled) {
        // Calculate grid dimensions and position
        let gridPixelWidth = gridCols * baseCharWidth * gridScale;
        let gridPixelHeight = gridRows * baseCharHeight * gridScale;
        let startX = (width - gridPixelWidth) / 2;
        let startY = (height - gridPixelHeight) / 2;

        // Convert mouse position to grid-relative coordinates
        let relativeX = mouseX - startX;
        let relativeY = mouseY - startY;

        // Convert to normalized coordinates (0-1 range)
        mousePos.x = relativeX / gridPixelWidth;
        mousePos.y = relativeY / gridPixelHeight;

        // Clamp to 0-1 range to ensure coordinates are within bounds
        mousePos.x = constrain(mousePos.x, 0, 1);
        mousePos.y = constrain(mousePos.y, 0, 1);
    }
}

/**
 * p5.js mouse pressed event handler
 * Creates click ripple effects when interactive mode and click effects are enabled
 */
function mousePressed() {
    if (settings.interactive.enabled && settings.interactive.clickEnabled) {
        // Calculate grid dimensions and position
        let gridPixelWidth = gridCols * baseCharWidth * gridScale;
        let gridPixelHeight = gridRows * baseCharHeight * gridScale;
        let startX = (width - gridPixelWidth) / 2;
        let startY = (height - gridPixelHeight) / 2;

        // Convert mouse position to grid-relative coordinates
        let relativeX = mouseX - startX;
        let relativeY = mouseY - startY;

        // Convert to normalized coordinates (0-1 range)
        let normalizedX = relativeX / gridPixelWidth;
        let normalizedY = relativeY / gridPixelHeight;

        // Only add click effects if within grid bounds
        if (normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1) {
            clickEffects.push({
                x: normalizedX,
                y: normalizedY,
                life: 3.0,                    // Initial life in seconds
                maxLife: 3.0,                 // Maximum life for decay calculation
                strength: settings.interactive.strength,
                radius: settings.interactive.radius
            });
        }
    }
}

function setupControls() {
    // Helper function to safely add event listeners
    function safeAddEventListener(elementId, eventType, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, handler);
        } else {
            console.warn(`Element with id '${elementId}' not found`);
        }
    }

    // Setup dropdown functionality
    setupDropdowns();

    // Display Settings
    safeAddEventListener('gridCols', 'input', (e) => {
        settings.gridCols = parseInt(e.target.value);
        gridCols = settings.gridCols;
        const gridColsValueElement = document.getElementById('gridColsValue');
        if (gridColsValueElement) gridColsValueElement.textContent = e.target.value;
        updateCanvasSize();
    });

    safeAddEventListener('gridRows', 'input', (e) => {
        settings.gridRows = parseInt(e.target.value);
        gridRows = settings.gridRows;
        const gridRowsValueElement = document.getElementById('gridRowsValue');
        if (gridRowsValueElement) gridRowsValueElement.textContent = e.target.value;
        updateCanvasSize();
    });

    safeAddEventListener('charSize', 'input', (e) => {
        settings.charSize = parseInt(e.target.value);
        const charSizeValueElement = document.getElementById('charSizeValue');
        if (charSizeValueElement) charSizeValueElement.textContent = e.target.value;
        updateCanvasSize();
    });

    safeAddEventListener('charSpacing', 'input', (e) => {
        settings.charSpacing = parseFloat(e.target.value);
        const charSpacingValueElement = document.getElementById('charSpacingValue');
        if (charSpacingValueElement) charSpacingValueElement.textContent = e.target.value;
        updateCanvasSize();
    });

    // Character Set
    document.getElementById('pattern1CharSet').addEventListener('change', (e) => {
        const selectedSet = e.target.value;
        const customInput = document.getElementById('pattern1CustomCharInput');

        if (selectedSet === 'custom1') {
            customInput.style.display = 'block';
            const customChars = document.getElementById('pattern1CustomChars').value || " .:-=+*#%@";
            currentRamp1 = customChars;
        } else {
            customInput.style.display = 'none';
            currentRamp1 = ASCII_RAMPS[selectedSet];
        }
    });

    document.getElementById('pattern1CustomChars').addEventListener('input', (e) => {
        if (document.getElementById('pattern1CharSet').value === 'custom1') {
            currentRamp1 = e.target.value || " .:-=+*#%@";
        }
    });

    document.getElementById('pattern2CharSet').addEventListener('change', (e) => {
        const selectedSet = e.target.value;
        const customInput = document.getElementById('pattern2CustomCharInput');

        if (selectedSet === 'custom2') {
            customInput.style.display = 'block';
            const customChars = document.getElementById('pattern2CustomChars').value || " .:-=+*#%@";
            currentRamp2 = customChars;
        } else {
            customInput.style.display = 'none';
            currentRamp2 = ASCII_RAMPS[selectedSet];
        }
    });

    document.getElementById('pattern2CustomChars').addEventListener('input', (e) => {
        if (document.getElementById('pattern2CharSet').value === 'custom2') {
            currentRamp2 = e.target.value || " .:-=+*#%@";
        }
    });

    // Primary Pattern
    document.getElementById('pattern1Color').addEventListener('input', (e) => {
        settings.pattern1.color = e.target.value;
    });

    document.getElementById('pattern1Glow').addEventListener('change', (e) => {
        settings.pattern1.glow = e.target.checked;
    });

    document.getElementById('pattern1Rotation').addEventListener('change', (e) => {
        settings.pattern1.rotation = e.target.checked;
    });

    document.getElementById('pattern1Type').addEventListener('change', (e) => {
        settings.pattern1.type = e.target.value;
        if (settings.pattern1.type === 'cellular') {
            initCellular();
        } else if (settings.pattern1.type === 'voronoi') {
            initVoronoi();
        }
    });

    document.getElementById('pattern1Speed').addEventListener('input', (e) => {
        settings.pattern1.speed = parseFloat(e.target.value);
        document.getElementById('pattern1SpeedValue').textContent = e.target.value;
    });

    document.getElementById('pattern1Scale').addEventListener('input', (e) => {
        settings.pattern1.scale = parseFloat(e.target.value);
        document.getElementById('pattern1ScaleValue').textContent = e.target.value;
    });

    // Secondary Pattern
    document.getElementById('pattern2Toggle').addEventListener('click', (e) => {
        settings.pattern2.enabled = !settings.pattern2.enabled;
        e.target.classList.toggle('active');
        e.target.textContent = settings.pattern2.enabled ? 'Disable Secondary Pattern' : 'Enable Secondary Pattern';

        const pattern2Settings = document.getElementById('pattern2Settings');
        pattern2Settings.style.display = settings.pattern2.enabled ? 'block' : 'none';
    });

    document.getElementById('pattern2Color').addEventListener('input', (e) => {
        settings.pattern2.color = e.target.value;
    });

    document.getElementById('pattern2Glow').addEventListener('change', (e) => {
        settings.pattern2.glow = e.target.checked;
    });

    document.getElementById('pattern2Rotation').addEventListener('change', (e) => {
        settings.pattern2.rotation = e.target.checked;
    });

    document.getElementById('pattern2Type').addEventListener('change', (e) => {
        settings.pattern2.type = e.target.value;
    });

    document.getElementById('pattern2Speed').addEventListener('input', (e) => {
        settings.pattern2.speed = parseFloat(e.target.value);
        document.getElementById('pattern2SpeedValue').textContent = e.target.value;
    });

    document.getElementById('pattern2Scale').addEventListener('input', (e) => {
        settings.pattern2.scale = parseFloat(e.target.value);
        document.getElementById('pattern2ScaleValue').textContent = e.target.value;
    });

    // Interactive Effects
    document.getElementById('interactiveToggle').addEventListener('click', (e) => {
        settings.interactive.enabled = !settings.interactive.enabled;
        e.target.classList.toggle('active');
        e.target.textContent = settings.interactive.enabled ? 'Disable Interactive Effects' : 'Enable Interactive Effects';

        const interactiveSettings = document.getElementById('interactiveSettings');
        interactiveSettings.style.display = settings.interactive.enabled ? 'block' : 'none';

        const canvasContainer = document.getElementById('canvas-container');
        canvasContainer.style.cursor = settings.interactive.enabled ? 'crosshair' : 'default';
    });

    document.getElementById('interactiveType').addEventListener('change', (e) => {
        settings.interactive.type = e.target.value;
    });

    document.getElementById('interactiveStrength').addEventListener('input', (e) => {
        settings.interactive.strength = parseFloat(e.target.value);
        document.getElementById('interactiveStrengthValue').textContent = e.target.value;
    });

    document.getElementById('interactiveRadius').addEventListener('input', (e) => {
        settings.interactive.radius = parseFloat(e.target.value);
        document.getElementById('interactiveRadiusValue').textContent = e.target.value;
    });

    document.getElementById('interactiveClick').addEventListener('change', (e) => {
        settings.interactive.clickEnabled = e.target.checked;
    });

    // Blending
    safeAddEventListener('blendMode', 'change', (e) => {
        settings.blendSettings.mode = e.target.value;
    });

    safeAddEventListener('blendAmount', 'input', (e) => {
        settings.blendSettings.amount = parseFloat(e.target.value);
        const blendAmountValueElement = document.getElementById('blendAmountValue');
        if (blendAmountValueElement) {
            blendAmountValueElement.textContent = e.target.value;
        }
    });
}

function setupDropdowns() {
    const dropdownHeaders = [
        'displayHeader',
        'pattern1Header',
        'pattern2Header',
        'interactiveHeader'
    ];

    const dropdownContents = [
        'displayContent',
        'pattern1Content',
        'pattern2Content',
        'interactiveContent'
    ];

    // Set initial state - Display Settings open by default
    document.getElementById('displayContent').classList.add('open');
    document.getElementById('displayHeader').classList.add('active');
    document.getElementById('displayHeader').querySelector('.dropdown-arrow').classList.add('open');

    dropdownHeaders.forEach((headerId, index) => {
        const header = document.getElementById(headerId);
        const content = document.getElementById(dropdownContents[index]);
        const arrow = header.querySelector('.dropdown-arrow');

        header.addEventListener('click', () => {
            const isOpen = content.classList.contains('open');

            if (isOpen) {
                // Close this dropdown
                content.classList.remove('open');
                header.classList.remove('active');
                arrow.classList.remove('open');
            } else {
                // Open this dropdown (don't close others)
                content.classList.add('open');
                header.classList.add('active');
                arrow.classList.add('open');
            }
        });
    });
}

function windowResized() {
    updateCanvasSize();
}

function setupPlayPauseButton() {
    const playPauseBtn = document.getElementById('play-pause-btn');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
    const playIcon = playPauseBtn.querySelector('.play-icon');

    playPauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        playPauseBtn.classList.toggle('paused', isPaused);

        if (isPaused) {
            pauseIcon.style.display = 'none';
            playIcon.style.display = 'block';
            noLoop();
        } else {
            pauseIcon.style.display = 'block';
            playIcon.style.display = 'none';
            loop();
        }
    });
}

function setupRandomizeButton() {
    const randomizeBtn = document.getElementById('randomize-btn');

    randomizeBtn.addEventListener('click', () => {
        // Randomize pattern types
        const patternTypes = ['waves', 'ripples', 'noise', 'spiral', 'checkerboard', 'stripes', 'plasma', 'mandelbrot', 'julia', 'cellular', 'voronoi', 'tunnel', 'mosaic'];
        const charSets = ['blocks', 'ascii', 'hex', 'numbers', 'letters', 'symbols', 'braille'];

        // Randomize primary pattern
        settings.pattern1.type = patternTypes[Math.floor(Math.random() * patternTypes.length)];
        settings.pattern1.speed = Math.random() * 0.049 + 0.001; // 0.001 to 0.05
        settings.pattern1.scale = Math.random() * 0.19 + 0.01; // 0.01 to 0.2
        settings.pattern1.color = hslToHex(Math.floor(Math.random() * 360), 70, 60);
        settings.pattern1.glow = Math.random() > 0.5;

        // Randomize primary character set
        const selectedCharSet1 = charSets[Math.floor(Math.random() * charSets.length)];
        currentRamp1 = ASCII_RAMPS[selectedCharSet1];

        // Maybe enable secondary pattern
        if (Math.random() > 0.4) {
            settings.pattern2.enabled = true;
            settings.pattern2.type = patternTypes[Math.floor(Math.random() * patternTypes.length)];
            settings.pattern2.speed = Math.random() * 0.049 + 0.001;
            settings.pattern2.scale = Math.random() * 0.19 + 0.01;
            settings.pattern2.color = hslToHex(Math.floor(Math.random() * 360), 70, 60);
            settings.pattern2.glow = Math.random() > 0.5;
            settings.blendSettings.amount = Math.random() * 0.8 + 0.2; // 0.2 to 1.0

            // Randomize secondary character set
            const selectedCharSet2 = charSets[Math.floor(Math.random() * charSets.length)];
            currentRamp2 = ASCII_RAMPS[selectedCharSet2];

            const blendModes = ['add', 'multiply', 'overlay', 'difference', 'screen'];
            settings.blendSettings.mode = blendModes[Math.floor(Math.random() * blendModes.length)];
        }

        // Reinitialize special patterns if needed
        if (settings.pattern1.type === 'cellular' || settings.pattern2.type === 'cellular') {
            initCellular();
        }
        if (settings.pattern1.type === 'voronoi' || settings.pattern2.type === 'voronoi') {
            initVoronoi();
        }

        // Update UI to reflect changes
        updateUIFromSettings();
    });
}

function setupDownloadButton() {
    const downloadBtn = document.getElementById('download-btn');
    const downloadMenu = document.getElementById('download-menu');
    const downloadOpts = downloadMenu.querySelectorAll('.download-option');

    let menuVisible = false;
    let isSaving = false;

    const hideMenu = () => {
        menuVisible = false;
        downloadMenu.classList.remove('show');
    };

    downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        menuVisible = !menuVisible;
        downloadMenu.classList.toggle('show', menuVisible);
    });

    document.addEventListener('click', (e) => {
        if (!downloadBtn.contains(e.target) && !downloadMenu.contains(e.target)) {
            hideMenu();
        }
    });

    downloadOpts.forEach(opt => {
        const handler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isSaving) return;
            isSaving = true;

            const format = opt.dataset.format;

            setTimeout(() => {
                try {
                    exportCanvasFile(format);
                } catch (err) {
                    console.error('Download failed:', err);
                    alert(`Failed to export ${format.toUpperCase()} file. Please try again.`);
                } finally {
                    setTimeout(() => {
                        hideMenu();
                        isSaving = false;
                    }, 100);
                }
            }, 50);
        };

        opt.addEventListener('click', handler, { passive: false });
    });
}

function exportCanvasFile(format) {
    const pattern1Name = settings.pattern1.type;
    const pattern2Name = settings.pattern2.enabled ? `-${settings.pattern2.type}` : '';
    const base = `gridform-${pattern1Name}${pattern2Name}`;
    const ext = (format === 'jpeg') ? 'jpg' : format;

    if (format === 'txt') {
        exportTextFile(base);
        return;
    }

    if (format === 'gif') {
        exportGifAnimation(base);
        return;
    }

    if (ext !== 'png' && ext !== 'jpg') {
        alert(`Export format ${format} not supported yet.`);
        return;
    }

    // Create high-resolution version
    exportHighResCanvas(base, ext);
}

function exportHighResCanvas(filename, ext) {
    // Calculate scale factor for 300 DPI (300/72 = ~4.17x)
    const dpiScale = 300 / 72;

    // Create off-screen canvas for high-res rendering
    const offscreenCanvas = document.createElement('canvas');
    const ctx = offscreenCanvas.getContext('2d');

    // Use the EXACT same dimensions as the current canvas, just scaled up
    offscreenCanvas.width = Math.floor(width * dpiScale);
    offscreenCanvas.height = Math.floor(height * dpiScale);

    // Clear the off-screen canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

    // Set up text rendering
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Use the SAME scaling logic as the main draw() function, just scaled up
    let gridPixelWidth = gridCols * baseCharWidth;
    let gridPixelHeight = gridRows * baseCharHeight;

    // Use the same scale calculation as draw(), but with the high-res dimensions
    let scaleX = offscreenCanvas.width / gridPixelWidth;
    let scaleY = offscreenCanvas.height / gridPixelHeight;
    let currentGridScale = Math.min(scaleX, scaleY, dpiScale); // This was the issue - should match draw()

    let actualCharWidth = baseCharWidth * currentGridScale * settings.charSpacing;
    let actualCharHeight = baseCharHeight * currentGridScale * settings.charSpacing;
    let actualCharSize = settings.charSize * currentGridScale;

    // Center the grid exactly like in draw()
    let startX = (offscreenCanvas.width - (gridCols * actualCharWidth)) / 2;
    let startY = (offscreenCanvas.height - (gridRows * actualCharHeight)) / 2;

    ctx.font = `${actualCharSize}px monospace`;

    // Render the grid at high resolution on off-screen canvas
    for (let x = 0; x < gridCols; x++) {
        for (let y = 0; y < gridRows; y++) {
            let xPos = startX + (x + 0.5) * actualCharWidth;
            let yPos = startY + (y + 0.5) * actualCharHeight;

            let value1 = getPatternValue(x, y, settings.pattern1, time);
            let finalValue = value1;
            let finalColor = settings.pattern1.color;
            let glowIntensity1 = settings.pattern1.glow ? value1 : 0;
            let glowIntensity2 = 0;
            let useRamp1 = true;
            let shouldRotate1 = settings.pattern1.rotation;
            let shouldRotate2 = false;

            if (settings.pattern2.enabled) {
                let value2 = getPatternValue(x, y, settings.pattern2, time);
                finalValue = blendValues(value1, value2, settings.blendSettings.mode, settings.blendSettings.amount);
                glowIntensity2 = settings.pattern2.glow ? value2 : 0;

                finalColor = blendColors(
                    settings.pattern1.color,
                    settings.pattern2.color,
                    settings.blendSettings.mode,
                    value1,
                    value2,
                    settings.blendSettings.amount
                );

                let blendStrength = value1 * value2 * settings.blendSettings.amount;
                useRamp1 = blendStrength < 0.5;
                shouldRotate2 = settings.pattern2.rotation;
            }

            if (settings.interactive.enabled) {
                finalValue = applyInteractiveEffect(x, y, finalValue);
            }

            // Apply glow effect if needed
            let maxGlowIntensity = Math.max(glowIntensity1, glowIntensity2);
            if (maxGlowIntensity > 0) {
                let enhancedGlowIntensity = Math.pow(maxGlowIntensity, 0.7);
                let colorMatch = finalColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/) || finalColor.match(/#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/);
                if (colorMatch) {
                    let r, g, b;
                    if (colorMatch[0].startsWith('rgb')) {
                        r = parseInt(colorMatch[1]);
                        g = parseInt(colorMatch[2]);
                        b = parseInt(colorMatch[3]);
                    } else {
                        r = parseInt(colorMatch[1], 16);
                        g = parseInt(colorMatch[2], 16);
                        b = parseInt(colorMatch[3], 16);
                    }

                    let glowSize = enhancedGlowIntensity * actualCharSize * 3.0;
                    let glowAlpha = Math.min(enhancedGlowIntensity * 1.5, 1.0);

                    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${glowAlpha})`;
                    ctx.shadowBlur = glowSize;
                }
            } else {
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            }

            ctx.fillStyle = finalColor;

            let selectedRamp = useRamp1 ? currentRamp1 : currentRamp2;
            let charIndex = Math.floor(map(finalValue, 0, 1, 0, selectedRamp.length - 1));
            charIndex = constrain(charIndex, 0, selectedRamp.length - 1);
            let char = selectedRamp[charIndex];

            let rotationAngle = 0;
            if ((useRamp1 && shouldRotate1) || (!useRamp1 && shouldRotate2)) {
                rotationAngle = finalValue * TWO_PI + (x + y) * 0.1 + time * 2;
            }

            if (rotationAngle !== 0) {
                ctx.save();
                ctx.translate(xPos, yPos);
                ctx.rotate(rotationAngle);
                ctx.fillText(char, 0, 0);
                ctx.restore();
            } else {
                ctx.fillText(char, xPos, yPos);
            }
        }
    }

    // Export the off-screen canvas
    try {
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        const quality = ext === 'jpg' ? 0.9 : undefined;

        offscreenCanvas.toBlob((blob) => {
            if (!blob) {
                alert('Export failed');
                return;
            }
        
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.${ext}`;
            a.style.display = 'none';
        
            document.body.appendChild(a);
            a.click();
        
            // Add this line to show the success toast
            showSuccessToast(`${filename}.${ext}`);
        
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 1000);
        
        }, mimeType, quality);

    } catch (error) {
        alert('High-res export failed');
    }
}

function tryP5SaveMethod(filename, ext) {
    try {
        if (typeof save === 'function') {
            save(canvas, `${filename}.${ext}`);
        } else if (typeof saveCanvas === 'function') {
            saveCanvas(canvas, filename, ext);
        } else {
            throw new Error('No p5.js save functions available');
        }
    } catch (p5Error) {
        tryManualSave(filename, ext);
    }
}

function tryManualSave(filename, ext) {
    try {
        const domCanvas = canvas?.canvas || document.querySelector('canvas');
        if (!domCanvas) {
            throw new Error('No canvas element found');
        }

        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        const dataURL = domCanvas.toDataURL(mimeType, ext === 'jpg' ? 0.9 : undefined);

        if (!dataURL || dataURL === 'data:,') {
            throw new Error('Canvas toDataURL failed');
        }

        const byteString = atob(dataURL.split(',')[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < byteString.length; i++) {
            uint8Array[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([arrayBuffer], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${ext}`;
        a.style.display = 'none';

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        alert('Download failed completely. Please try refreshing the page.');
    }
}

function exportGifAnimation(filename) {
    // Check if saveGif is available
    if (typeof saveGif !== 'function') {
        // Try to provide helpful error message
        console.error('saveGif function not available');
        alert('GIF export requires p5.js version 1.9.0 or higher. Please update your p5.js library.');
        return;
    }

    // TODO: Future enhancement - Add UI controls for custom GIF duration
    // This could include a dialog to let users choose frame count and duration

    // Ensure animation is running for GIF recording
    if (isPaused) {
        alert('Please unpause the animation before recording a GIF.');
        return;
    }

    // Use shorter durations for faster downloads and smaller files
    // Focus on creating perfect loops rather than long animations
    let duration = 1.0; // Duration in seconds
    
    // Adjust based on pattern type for better loops
    if (settings.pattern1.type === 'waves' || settings.pattern1.type === 'ripples') {
        duration = 1.0; // 1 second for smooth oscillations
    } else if (settings.pattern1.type === 'spiral' || settings.pattern1.type === 'tunnel') {
        duration = 1.5; // 1.5 seconds for complex rotations
    } else if (settings.pattern1.type === 'cellular') {
        duration = 2.0; // 2 seconds for evolution patterns
    } else if (settings.pattern1.type === 'mandelbrot' || settings.pattern1.type === 'julia') {
        duration = 2.5; // 2.5 seconds for smooth transitions
    } else {
        duration = 1.0; // Default 1 second
    }
    
    // Configure GIF options for perfect loops
    const options = {
        units: "seconds", // Use seconds instead of frames for more reliable recording
        delay: 0,
        silent: true, // Disable progress notifications
        notificationDuration: 0, // No notification duration
        notificationID: 'gifProgress'
    };

    try {
        // Show a brief message that recording is starting
        console.log(`Starting GIF recording: ${filename}.gif (${duration}s duration)`);
        console.log('GIF options:', options);
        console.log('Note: Processing may take several seconds after recording completes');
        
        // Show progress overlay and start recording
        showGifProgressOverlay(duration);
        
        // Start the GIF recording
        saveGif(`${filename}.gif`, duration, options);
        
        // Show a "will download soon" toast to set expectations
        showRecordingToast(`${filename}.gif`, duration);
        
    } catch (error) {
        console.error('GIF export failed:', error);
        alert('GIF export failed. Please try again. Make sure your browser supports the required features.');
    }
}

function exportTextFile(filename) {
    let textContent = '';

    for (let y = 0; y < gridRows; y++) {
        for (let x = 0; x < gridCols; x++) {
            let value1 = getPatternValue(x, y, settings.pattern1, time);
            let finalValue = value1;
            let useRamp1 = true;

            if (settings.pattern2.enabled) {
                let value2 = getPatternValue(x, y, settings.pattern2, time);
                finalValue = blendValues(value1, value2, settings.blendSettings.mode, settings.blendSettings.amount);

                let blendStrength = value1 * value2 * settings.blendSettings.amount;
                useRamp1 = blendStrength < 0.5;
            }

            if (settings.interactive.enabled) {
                finalValue = applyInteractiveEffect(x, y, finalValue);
            }

            let selectedRamp = useRamp1 ? currentRamp1 : currentRamp2;
            let charIndex = Math.floor(map(finalValue, 0, 1, 0, selectedRamp.length - 1));
            charIndex = constrain(charIndex, 0, selectedRamp.length - 1);
            let char = selectedRamp[charIndex];

            textContent += char;
        }
        textContent += '\n';
    }

    try {
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename + '.txt';
        a.style.display = 'none';

        document.body.appendChild(a);
        a.click();
        showSuccessToast(filename + '.txt');
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        alert('Text file download failed.');
    }
}

function setupSpeedButton() {
    const speedBtn = document.getElementById('speed-btn');
    const speedMenu = document.getElementById('speed-menu');
    const speedOptions = speedMenu.querySelectorAll('.speed-option');
    const speedText = speedBtn.querySelector('.speed-text');

    let menuVisible = false;
    let currentSpeed = 1.0;

    const hideMenu = () => {
        menuVisible = false;
        speedMenu.classList.remove('show');
    };

    speedBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        menuVisible = !menuVisible;
        speedMenu.classList.toggle('show', menuVisible);
    });

    document.addEventListener('click', (e) => {
        if (!speedBtn.contains(e.target) && !speedMenu.contains(e.target)) {
            hideMenu();
        }
    });

    speedOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const speed = parseFloat(option.dataset.speed);
            currentSpeed = speed;

            // Update active state
            speedOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');

            // Update button text
            speedText.textContent = speed === 1 ? '1×' : `${speed}×`;

            // Apply speed multiplier to animation
            applySpeedMultiplier(speed);

            hideMenu();
        });
    });
}

function applySpeedMultiplier(multiplier) {
    speedMultiplier = multiplier;
}

function setupTooltips() {
    const buttons = [
        { btn: '#play-pause-btn', tooltip: '#play-pause-tooltip' },
        { btn: '#speed-btn', tooltip: '#speed-tooltip' },
        { btn: '#randomize-btn', tooltip: '#randomize-tooltip' },
        { btn: '#download-btn', tooltip: '#download-tooltip' }
    ];

    buttons.forEach(({ btn, tooltip }) => {
        const button = document.querySelector(btn);
        const tooltipEl = document.querySelector(tooltip);

        if (!button || !tooltipEl) return;

        let hoverTimeout;

        button.addEventListener('mouseenter', (e) => {
            clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
                const rect = button.getBoundingClientRect();
                const tooltipRect = tooltipEl.getBoundingClientRect();

                // Position tooltip above button, centered
                const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                const top = rect.top - tooltipRect.height - 10;

                tooltipEl.style.left = left + 'px';
                tooltipEl.style.top = top + 'px';
                tooltipEl.classList.add('show');
            }, 300); // 500ms delay before showing
        });

        button.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimeout);
            tooltipEl.classList.remove('show');
        });

        // Hide tooltip when button is clicked
        button.addEventListener('click', () => {
            clearTimeout(hoverTimeout);
            tooltipEl.classList.remove('show');
        });
    });
}

function showGifProgressOverlay(duration) {
    const overlay = document.getElementById('gif-progress-overlay');
    const progressFill = document.getElementById('gif-progress-fill');
    const progressText = document.getElementById('gif-progress-text');
    
    if (!overlay || !progressFill || !progressText) {
        console.warn('Progress overlay elements not found');
        return;
    }
    
    // Show the overlay
    overlay.classList.add('show');
    
    // Reset progress
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
    
    // Animate progress over the duration
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    
    function updateProgress() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        
        const percentage = Math.round(progress * 100);
        progressFill.style.width = percentage + '%';
        progressText.textContent = percentage + '%';
        
        if (progress < 1) {
            requestAnimationFrame(updateProgress);
        } else {
            // Hide overlay after recording completes, but keep it visible during processing
            setTimeout(() => {
                overlay.classList.remove('show');
            }, 2000); // Keep overlay visible for 2 seconds after recording to show processing
        }
    }
    
    requestAnimationFrame(updateProgress);
}

function showRecordingToast(filename, duration) {
    const toast = document.getElementById('success-toast');
    const filenameEl = document.getElementById('toast-filename');
    const closeBtn = document.getElementById('toast-close');
    
    // Set the filename with "processing" message
    filenameEl.textContent = `${filename} (processing...)`;
    
    // Show the toast
    toast.classList.add('show');
    
    // Auto-dismiss after recording duration + 8 seconds (accounting for processing time)
    const autoDismissTimeout = setTimeout(() => {
        hideToast();
    }, (duration * 1000) + 8000);
    
    // Close button handler
    const closeHandler = () => {
        clearTimeout(autoDismissTimeout);
        hideToast();
        closeBtn.removeEventListener('click', closeHandler);
    };
    
    closeBtn.addEventListener('click', closeHandler);
    
    function hideToast() {
        toast.classList.remove('show');
    }
}

function showSuccessToast(filename) {
    const toast = document.getElementById('success-toast');
    const filenameEl = document.getElementById('toast-filename');
    const closeBtn = document.getElementById('toast-close');
    
    // Set the filename
    filenameEl.textContent = filename;
    
    // Show the toast
    toast.classList.add('show');
    
    // Auto-dismiss after 5 seconds
    const autoDismissTimeout = setTimeout(() => {
        hideToast();
    }, 5000);
    
    // Close button handler
    const closeHandler = () => {
        clearTimeout(autoDismissTimeout);
        hideToast();
        closeBtn.removeEventListener('click', closeHandler);
    };
    
    closeBtn.addEventListener('click', closeHandler);
    
    function hideToast() {
        toast.classList.remove('show');
    }
}

function updateUIFromSettings() {
    // Update all UI controls to match current settings
    document.getElementById('pattern1Type').value = settings.pattern1.type;
    document.getElementById('pattern1Speed').value = settings.pattern1.speed;
    document.getElementById('pattern1SpeedValue').textContent = settings.pattern1.speed.toFixed(3);
    document.getElementById('pattern1Scale').value = settings.pattern1.scale;
    document.getElementById('pattern1ScaleValue').textContent = settings.pattern1.scale.toFixed(3);
    document.getElementById('pattern1Color').value = settings.pattern1.color;
    document.getElementById('pattern1Glow').checked = settings.pattern1.glow;

    // Update character set dropdowns
    const charSets = ['blocks', 'ascii', 'hex', 'numbers', 'letters', 'symbols', 'braille'];
    const currentCharSet1 = charSets.find(set => ASCII_RAMPS[set] === currentRamp1) || 'blocks';
    document.getElementById('pattern1CharSet').value = currentCharSet1;

    // Update secondary pattern UI
    const pattern2Toggle = document.getElementById('pattern2Toggle');
    const pattern2Settings = document.getElementById('pattern2Settings');

    if (settings.pattern2.enabled) {
        pattern2Toggle.classList.add('active');
        pattern2Toggle.textContent = 'Disable Secondary Pattern';
        pattern2Settings.style.display = 'block';

        document.getElementById('pattern2Type').value = settings.pattern2.type;
        document.getElementById('pattern2Speed').value = settings.pattern2.speed;
        document.getElementById('pattern2SpeedValue').textContent = settings.pattern2.speed.toFixed(3);
        document.getElementById('pattern2Scale').value = settings.pattern2.scale;
        document.getElementById('pattern2ScaleValue').textContent = settings.pattern2.scale.toFixed(3);
        document.getElementById('pattern2Color').value = settings.pattern2.color;
        document.getElementById('pattern2Glow').checked = settings.pattern2.glow;
        document.getElementById('blendMode').value = settings.blendSettings.mode;
        document.getElementById('blendAmount').value = settings.blendSettings.amount;
        document.getElementById('blendAmountValue').textContent = settings.blendSettings.amount.toFixed(1);

        // Update secondary character set dropdown
        const currentCharSet2 = charSets.find(set => ASCII_RAMPS[set] === currentRamp2) || 'blocks';
        document.getElementById('pattern2CharSet').value = currentCharSet2;
    }
}