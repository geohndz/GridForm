// GridForm - ASCII Art Animation Generator
// Features: Multiple pattern types, dual pattern blending, interactive effects, and export options
// Export formats: PNG, JPEG, GIF (animated), SVG, and text files
// 
// ASCII grayscale ramp - from darkest to lightest
const ASCII_RAMPS = {
    blocks: " ░▒▓▌▍▎▏▊▋█",
    ascii: " .:-=+*#%@",
    hex: " 0123456789ABCDEF",
    numbers: " 0123456789",
    letters: " ABCDEFGHIJ",
    symbols: " !@#$%^&*().",
    braille: " ⠀⠁⠃⠇⠏⠟⠿⡿⣿",
    custom: " .:-=+*#%@"
};

let baseCharWidth = 8;  // Base character width in pixels
let baseCharHeight = 14; // Base character height in pixels
let gridScale = 1.0;     // Scale factor for the entire grid

let currentRamp = ASCII_RAMPS.blocks;
let currentRamp1 = ASCII_RAMPS.blocks;
let currentRamp2 = ASCII_RAMPS.blocks;

let canvas;
let time = 0;
let gridCols, gridRows;
let mousePos = { x: 0.5, y: 0.5 };
let clickEffects = [];
let cellularGrid = [];
let voronoiPoints = [];

// Resize functionality variables
let isResizing = false;
let resizeStartX = 0;
let resizeStartWidth = 0;

let isPaused = false;

let speedMultiplier = 1.0;

// All available pattern types for morphing
const PATTERN_TYPES = ['waves', 'ripples', 'noise', 'spiral', 'checkerboard', 'stripes', 'plasma', 'mandelbrot', 'julia', 'cellular', 'voronoi', 'tunnel', 'mosaic'];

// Pattern settings
let settings = {
    gridCols: 80,
    gridRows: 50,
    charSize: 12,
    charSpacing: 1.0,
    pattern1: {
        type: 'waves',
        speed: 0.01,
        scale: 0.05,
        color: '#ffffff',
        glow: false,
        rotation: false
    },
    pattern2: {
        enabled: false,
        type: 'ripples',
        speed: 0.02,
        scale: 0.08,
        color: '#00ff00',
        glow: false,
        rotation: false
    },
    interactive: {
        enabled: false,
        type: 'ripple',
        strength: 1.0,
        radius: 0.2,
        clickEnabled: true
    },
    blendSettings: {
        mode: 'multiply',
        amount: 0.5
    }
};

function setup() {
    canvas = createCanvas(800, 500); // Start with default size
    updateCanvasSize(); // Then update to fit grid
    canvas.parent('canvas-container');

    textAlign(CENTER, CENTER);
    noSmooth();

    gridCols = settings.gridCols;
    gridRows = settings.gridRows;

    // Initialize cellular automata
    initCellular();

    // Initialize Voronoi points
    initVoronoi();

    setupControls();
    setupPlayPauseButton();
    setupSpeedButton();
    setupRandomizeButton();
    setupDownloadButton();
    setupResizeHandling();
    setupTooltips();
    
    // Set initial button group position
    updateButtonGroupPosition();

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

function updateCanvasSize() {
    // Calculate required canvas size based on grid and character size
    let requiredWidth = gridCols * baseCharWidth * (settings.charSize / 12) * settings.charSpacing;
    let requiredHeight = gridRows * baseCharHeight * (settings.charSize / 12) * settings.charSpacing;

    // Constrain to maximum dimensions
    let maxWidth = 800;
    let maxHeight = 500;

    // Calculate scale factor if needed
    let scaleX = maxWidth / requiredWidth;
    let scaleY = maxHeight / requiredHeight;
    let scale = Math.min(scaleX, scaleY, 1.0);

    // Calculate final canvas dimensions
    let finalWidth = Math.min(requiredWidth, maxWidth);
    let finalHeight = Math.min(requiredHeight, maxHeight);

    // Only resize if dimensions changed significantly
    if (Math.abs(width - finalWidth) > 5 || Math.abs(height - finalHeight) > 5) {
        resizeCanvas(finalWidth, finalHeight);
    }
}

function setupResizeHandling() {
    const resizeHandle = document.getElementById('resize-handle');
    const controlsPanel = document.getElementById('controls');

    // Update handle position initially
    function updateHandlePosition() {
        const controlsWidth = controlsPanel.offsetWidth;
        resizeHandle.style.right = (controlsWidth - 4.5) + 'px'; // Center on the 1px border
    }

    updateHandlePosition();

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizeStartX = e.clientX;
        resizeStartWidth = controlsPanel.offsetWidth;

        resizeHandle.classList.add('dragging');
        controlsPanel.classList.add('resizing');
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';

        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const deltaX = resizeStartX - e.clientX;
        const newWidth = resizeStartWidth + deltaX;
        const minWidth = 250;
        const maxWidth = window.innerWidth * 0.3;

        const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        controlsPanel.style.width = clampedWidth + 'px';

        // Update handle position
        resizeHandle.style.right = (clampedWidth - 4.5) + 'px';

        // Update button group position to stay centered in the canvas area
        updateButtonGroupPosition();

        e.preventDefault();
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;

            resizeHandle.classList.remove('dragging');
            controlsPanel.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // Reset border color when resizing ends
            controlsPanel.style.borderLeftColor = '#333';
        }
    });

    // Handle hover states
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

    // Update handle position on window resize
    window.addEventListener('resize', () => {
        updateHandlePosition();
        updateButtonGroupPosition();
    });
}

function updateButtonGroupPosition() {
    const buttonGroup = document.getElementById('button-group');
    const controlsPanel = document.getElementById('controls');
    const controlsWidth = controlsPanel.offsetWidth;
    const canvasAreaWidth = window.innerWidth - controlsWidth;
    
    // Calculate the center of the canvas area (left side of the viewport)
    const canvasCenter = canvasAreaWidth / 2;
    
    // Position the button group at the center of the canvas area
    buttonGroup.style.left = canvasCenter + 'px';
    buttonGroup.style.transform = 'translateX(-50%)';
}

function draw() {
    background(0);
    time += 0.016 * speedMultiplier; // ~60fps with speed multiplier

    // Update interactive effects
    updateInteractiveEffects();

    textAlign(CENTER, CENTER);
    textSize(settings.charSize);

    // Calculate grid dimensions in pixels
    let gridPixelWidth = gridCols * baseCharWidth;
    let gridPixelHeight = gridRows * baseCharHeight;

    // Calculate scale factor to fit within canvas bounds
    let scaleX = width / gridPixelWidth;
    let scaleY = height / gridPixelHeight;
    gridScale = Math.min(scaleX, scaleY, 1.0); // Don't scale up, only down

    // Calculate actual character size and spacing
    let actualCharWidth = baseCharWidth * gridScale * settings.charSpacing;
    let actualCharHeight = baseCharHeight * gridScale * settings.charSpacing;
    let actualCharSize = settings.charSize * gridScale;

    // Center the grid in the canvas
    let startX = (width - (gridCols * actualCharWidth)) / 2;
    let startY = (height - (gridRows * actualCharHeight)) / 2;

    textSize(actualCharSize);

    for (let x = 0; x < gridCols; x++) {
        for (let y = 0; y < gridRows; y++) {
            let xPos = startX + (x + 0.5) * actualCharWidth;
            let yPos = startY + (y + 0.5) * actualCharHeight;

            // Calculate primary pattern value
            let value1 = getPatternValue(x, y, settings.pattern1, time);

            let finalValue = value1;
            let finalColor = settings.pattern1.color;
            let glowIntensity1 = settings.pattern1.glow ? value1 : 0;
            let glowIntensity2 = 0;
            let useRamp1 = true;
            let shouldRotate1 = settings.pattern1.rotation;
            let shouldRotate2 = false;

            // Add secondary pattern if enabled
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

                // Decide which character set to use based on blend strength
                let blendStrength = value1 * value2 * settings.blendSettings.amount;
                useRamp1 = blendStrength < 0.5;
                shouldRotate2 = settings.pattern2.rotation;
            }

            // Apply interactive effects
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

            // Convert to ASCII character using appropriate ramp
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

function updateInteractiveEffects() {
    // Decay click effects
    clickEffects = clickEffects.filter(effect => {
        effect.life -= 0.016;
        return effect.life > 0;
    });
}

function applyInteractiveEffect(x, y, baseValue) {
    let normalizedX = x / gridCols;
    let normalizedY = y / gridRows;
    let effect = 0;

    // Mouse effect
    let mouseDistance = dist(normalizedX, normalizedY, mousePos.x, mousePos.y);
    if (mouseDistance < settings.interactive.radius) {
        let strength = (1 - mouseDistance / settings.interactive.radius) * settings.interactive.strength;

        switch (settings.interactive.type) {
            case 'ripple':
                effect += sin(mouseDistance * 20 - time * 5) * strength * 0.3;
                break;
            case 'attract':
                effect += strength * 0.5;
                break;
            case 'repel':
                effect -= strength * 0.5;
                break;
            case 'trail':
                effect += strength * 0.4 * sin(time * 2);
                break;
            case 'distort':
                let angle = atan2(normalizedY - mousePos.y, normalizedX - mousePos.x);
                effect += sin(angle * 4 + time * 3) * strength * 0.3;
                break;
        }
    }

    // Click effects
    for (let clickEffect of clickEffects) {
        let clickDistance = dist(normalizedX, normalizedY, clickEffect.x, clickEffect.y);
        if (clickDistance < clickEffect.radius) {
            let clickStrength = (1 - clickDistance / clickEffect.radius) * clickEffect.strength * (clickEffect.life / clickEffect.maxLife);
            effect += sin(clickDistance * 15 - (clickEffect.maxLife - clickEffect.life) * 3) * clickStrength;
        }
    }

    return constrain(baseValue + effect, 0, 1);
}

function getPatternValue(x, y, pattern, time) {
    let normalizedX = x / gridCols;
    let normalizedY = y / gridRows;
    let value = 0;

    switch (pattern.type) {
        case 'waves':
            value = (sin(normalizedX * TWO_PI * 5 + time * pattern.speed * 100) +
                sin(normalizedY * TWO_PI * 3 + time * pattern.speed * 80)) / 2;
            break;

        case 'ripples':
            let centerX = 0.5;
            let centerY = 0.5;
            let distance = dist(normalizedX, normalizedY, centerX, centerY);
            value = sin(distance * TWO_PI * 10 - time * pattern.speed * 200);
            break;

        case 'noise':
            value = noise(normalizedX * pattern.scale * 100, normalizedY * pattern.scale * 100, time * pattern.speed * 10) * 2 - 1;
            break;

        case 'spiral':
            let angle = atan2(normalizedY - 0.5, normalizedX - 0.5);
            let radius = dist(normalizedX, normalizedY, 0.5, 0.5);
            value = sin(angle * 3 + radius * 20 + time * pattern.speed * 100);
            break;

        case 'checkerboard':
            let checkX = floor(normalizedX * pattern.scale * 100);
            let checkY = floor(normalizedY * pattern.scale * 100);
            value = ((checkX + checkY + floor(time * pattern.speed * 100)) % 2) * 2 - 1;
            break;

        case 'stripes':
            value = sin((normalizedX + normalizedY) * pattern.scale * 200 + time * pattern.speed * 100);
            break;

        case 'plasma':
            value = (sin(normalizedX * 16 + time * pattern.speed * 80) +
                sin(normalizedY * 8 + time * pattern.speed * 60) +
                sin((normalizedX + normalizedY) * 16 + time * pattern.speed * 40) +
                sin(sqrt(normalizedX * normalizedX + normalizedY * normalizedY) * 8 + time * pattern.speed * 120)) / 4;
            break;

        case 'mandelbrot':
            let zx = (normalizedX - 0.5) * 4;
            let zy = (normalizedY - 0.5) * 4;
            let cx = zx + sin(time * pattern.speed * 50) * 0.3;
            let cy = zy + cos(time * pattern.speed * 30) * 0.3;
            value = mandelbrotIteration(cx, cy, 20) / 20;
            break;

        case 'julia':
            let jx = (normalizedX - 0.5) * 4;
            let jy = (normalizedY - 0.5) * 4;
            let juliaC = { x: sin(time * pattern.speed * 100) * 0.8, y: cos(time * pattern.speed * 70) * 0.8 };
            value = juliaIteration(jx, jy, juliaC, 20) / 20;
            break;

        case 'cellular':
            if (floor(time * pattern.speed * 100) % 30 === 0) {
                updateCellular();
            }
            let cellX = floor(normalizedX * 40);
            let cellY = floor(normalizedY * 30);
            value = (cellularGrid[cellY] && cellularGrid[cellY][cellX]) ? 1 : -1;
            break;

        case 'voronoi':
            value = getVoronoiValue(normalizedX, normalizedY, time * pattern.speed);
            break;

        case 'tunnel':
            let tunnelAngle = atan2(normalizedY - 0.5, normalizedX - 0.5);
            let tunnelRadius = dist(normalizedX, normalizedY, 0.5, 0.5);
            value = sin(tunnelAngle * 8 + time * pattern.speed * 100) *
                sin(1 / (tunnelRadius + 0.1) + time * pattern.speed * 50);
            break;

        case 'mosaic':
            let mosaicX = floor(normalizedX * pattern.scale * 200);
            let mosaicY = floor(normalizedY * pattern.scale * 200);
            let mosaicHash = ((mosaicX * 73856093) ^ (mosaicY * 19349663)) % 1000000;
            value = (mosaicHash / 500000 - 1) + sin(time * pattern.speed * 100) * 0.3;
            break;
    }

    // Normalize to 0-1 range
    return (value + 1) / 2;
}

function mandelbrotIteration(cx, cy, maxIter) {
    let zx = 0, zy = 0;
    for (let i = 0; i < maxIter; i++) {
        if (zx * zx + zy * zy > 4) return i;
        let temp = zx * zx - zy * zy + cx;
        zy = 2 * zx * zy + cy;
        zx = temp;
    }
    return maxIter;
}

function juliaIteration(zx, zy, c, maxIter) {
    for (let i = 0; i < maxIter; i++) {
        if (zx * zx + zy * zy > 4) return i;
        let temp = zx * zx - zy * zy + c.x;
        zy = 2 * zx * zy + c.y;
        zx = temp;
    }
    return maxIter;
}

function initCellular() {
    cellularGrid = [];
    for (let y = 0; y < 30; y++) {
        cellularGrid[y] = [];
        for (let x = 0; x < 40; x++) {
            cellularGrid[y][x] = Math.random() > 0.6;
        }
    }
}

function updateCellular() {
    let newGrid = [];
    for (let y = 0; y < 30; y++) {
        newGrid[y] = [];
        for (let x = 0; x < 40; x++) {
            let neighbors = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    let nx = x + dx;
                    let ny = y + dy;
                    if (nx >= 0 && nx < 40 && ny >= 0 && ny < 30) {
                        if (cellularGrid[ny][nx]) neighbors++;
                    }
                }
            }
            // Conway's Game of Life rules
            if (cellularGrid[y][x]) {
                newGrid[y][x] = neighbors === 2 || neighbors === 3;
            } else {
                newGrid[y][x] = neighbors === 3;
            }
        }
    }
    cellularGrid = newGrid;
}

function initVoronoi() {
    voronoiPoints = [];
    for (let i = 0; i < 8; i++) {
        voronoiPoints.push({
            x: Math.random(),
            y: Math.random(),
            vx: (Math.random() - 0.5) * 0.02,
            vy: (Math.random() - 0.5) * 0.02
        });
    }
}

function getVoronoiValue(x, y, timeOffset) {
    // Update point positions
    for (let point of voronoiPoints) {
        point.x += point.vx;
        point.y += point.vy;

        // Bounce off edges
        if (point.x <= 0 || point.x >= 1) point.vx *= -1;
        if (point.y <= 0 || point.y >= 1) point.vy *= -1;
        point.x = constrain(point.x, 0, 1);
        point.y = constrain(point.y, 0, 1);
    }

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

    return ((secondMinDist - minDist) * 10 + sin(timeOffset * 100)) * 2 - 1;
}

function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}

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

function blendColors(color1Hex, color2Hex, mode, value1, value2, amount) {
    let color1 = hexToRgb(color1Hex);
    let color2 = hexToRgb(color2Hex);

    let localBlend = value1 * value2 * amount;

    let r, g, b;

    switch (mode) {
        case 'add':
            r = constrain(color1.r + (color2.r * localBlend), 0, 255);
            g = constrain(color1.g + (color2.g * localBlend), 0, 255);
            b = constrain(color1.b + (color2.b * localBlend), 0, 255);
            break;

        case 'multiply':
            r = lerp(color1.r, (color1.r * color2.r) / 255, localBlend);
            g = lerp(color1.g, (color1.g * color2.g) / 255, localBlend);
            b = lerp(color1.b, (color1.b * color2.b) / 255, localBlend);
            break;

        case 'overlay':
            r = lerp(color1.r, color1.r < 128 ? (2 * color1.r * color2.r) / 255 : 255 - (2 * (255 - color1.r) * (255 - color2.r)) / 255, localBlend);
            g = lerp(color1.g, color1.g < 128 ? (2 * color1.g * color2.g) / 255 : 255 - (2 * (255 - color1.g) * (255 - color2.g)) / 255, localBlend);
            b = lerp(color1.b, color1.b < 128 ? (2 * color1.b * color2.b) / 255 : 255 - (2 * (255 - color1.b) * (255 - color2.b)) / 255, localBlend);
            break;

        case 'difference':
            r = lerp(color1.r, Math.abs(color1.r - color2.r), localBlend);
            g = lerp(color1.g, Math.abs(color1.g - color2.g), localBlend);
            b = lerp(color1.b, Math.abs(color1.b - color2.b), localBlend);
            break;

        case 'screen':
            r = lerp(color1.r, 255 - (((255 - color1.r) * (255 - color2.r)) / 255), localBlend);
            g = lerp(color1.g, 255 - (((255 - color1.g) * (255 - color2.g)) / 255), localBlend);
            b = lerp(color1.b, 255 - (((255 - color1.b) * (255 - color2.b)) / 255), localBlend);
            break;

        default:
            r = lerp(color1.r, color2.r, localBlend);
            g = lerp(color1.g, color2.g, localBlend);
            b = lerp(color1.b, color2.b, localBlend);
    }

    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
}

function applyGlow(color, intensity, charSize) {
    if (intensity <= 0) return;

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
            return;
        }
    }

    let r = parseInt(colorMatch[1]);
    let g = parseInt(colorMatch[2]);
    let b = parseInt(colorMatch[3]);

    // Make glow much more visible
    let glowSize = intensity * charSize * 3.0;  // Increased from 0.8 to 3.0
    let glowAlpha = Math.min(intensity * 1.5, 1.0);  // Increased from 0.6 to 1.5 (capped at 1.0)

    push();
    // Apply multiple glow layers for stronger effect
    drawingContext.shadowColor = `rgba(${r}, ${g}, ${b}, ${glowAlpha})`;
    drawingContext.shadowBlur = glowSize;

    // Add a second, more intense inner glow
    drawingContext.shadowOffsetX = 0;
    drawingContext.shadowOffsetY = 0;
    pop();
}

function blendValues(value1, value2, mode, amount) {
    value2 = lerp(0.5, value2, amount);

    switch (mode) {
        case 'add':
            return constrain(value1 + value2 - 0.5, 0, 1);
        case 'multiply':
            return value1 * value2;
        case 'overlay':
            return value1 < 0.5 ? 2 * value1 * value2 : 1 - 2 * (1 - value1) * (1 - value2);
        case 'difference':
            return abs(value1 - value2);
        case 'screen':
            return 1 - (1 - value1) * (1 - value2);
        default:
            return value1;
    }
}

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

        mousePos.x = relativeX / gridPixelWidth;
        mousePos.y = relativeY / gridPixelHeight;

        // Clamp to 0-1 range
        mousePos.x = constrain(mousePos.x, 0, 1);
        mousePos.y = constrain(mousePos.y, 0, 1);
    }
}

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

        let normalizedX = relativeX / gridPixelWidth;
        let normalizedY = relativeY / gridPixelHeight;

        // Only add click effects if within grid bounds
        if (normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1) {
            clickEffects.push({
                x: normalizedX,
                y: normalizedY,
                life: 3.0,
                maxLife: 3.0,
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