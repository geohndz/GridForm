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

// All available pattern types for morphing
const PATTERN_TYPES = ['waves', 'ripples', 'noise', 'spiral', 'checkerboard', 'stripes', 'plasma', 'mandelbrot', 'julia', 'cellular', 'voronoi', 'tunnel', 'mosaic'];

// Pattern settings
let settings = {
    gridCols: 80,
    gridRows: 50,
    charSize: 12,
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
    blend: {
        mode: 'multiply',
        amount: 0.5
    }
};

function setup() {
    canvas = createCanvas(800, 500);
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
    setupResizeHandling();
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
        
        e.preventDefault();
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            
            resizeHandle.classList.remove('dragging');
            controlsPanel.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
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
    window.addEventListener('resize', updateHandlePosition);
}

function draw() {
    background(0);
    time += 0.016; // ~60fps

    // Update interactive effects
    updateInteractiveEffects();

    textAlign(CENTER, CENTER);
    textSize(settings.charSize);

    for (let x = 0; x < gridCols; x++) {
        for (let y = 0; y < gridRows; y++) {
            let xPos = (x + 0.5) * (width / gridCols);
            let yPos = (y + 0.5) * (height / gridRows);

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
                finalValue = blendValues(value1, value2, settings.blend.mode, settings.blend.amount);
                glowIntensity2 = settings.pattern2.glow ? value2 : 0;

                finalColor = blendColors(
                    settings.pattern1.color,
                    settings.pattern2.color,
                    settings.blend.mode,
                    value1,
                    value2,
                    settings.blend.amount
                );

                // Decide which character set to use based on blend strength
                let blendStrength = value1 * value2 * settings.blend.amount;
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
                applyGlow(finalColor, enhancedGlowIntensity, settings.charSize);
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
    } : {r: 255, g: 255, b: 255};
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
        mousePos.x = mouseX / width;
        mousePos.y = mouseY / height;
    }
}

function mousePressed() {
    if (settings.interactive.enabled && settings.interactive.clickEnabled) {
        clickEffects.push({
            x: mouseX / width,
            y: mouseY / height,
            life: 3.0,
            maxLife: 3.0,
            strength: settings.interactive.strength,
            radius: settings.interactive.radius
        });
    }
}

function setupControls() {
    // Setup dropdown functionality
    setupDropdowns();
    
    // Display Settings
    document.getElementById('gridCols').addEventListener('input', (e) => {
        settings.gridCols = parseInt(e.target.value);
        gridCols = settings.gridCols;
        document.getElementById('gridColsValue').textContent = e.target.value;
    });

    document.getElementById('gridRows').addEventListener('input', (e) => {
        settings.gridRows = parseInt(e.target.value);
        gridRows = settings.gridRows;
        document.getElementById('gridRowsValue').textContent = e.target.value;
    });

    document.getElementById('charSize').addEventListener('input', (e) => {
        settings.charSize = parseInt(e.target.value);
        document.getElementById('charSizeValue').textContent = e.target.value;
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
    document.getElementById('blendMode').addEventListener('change', (e) => {
        settings.blend.mode = e.target.value;
    });

    document.getElementById('blendAmount').addEventListener('input', (e) => {
        settings.blend.amount = parseFloat(e.target.value);
        document.getElementById('blendAmountValue').textContent = e.target.value;
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
    resizeCanvas(800, 500);
} 