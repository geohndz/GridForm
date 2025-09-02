// GridForm - ASCII Art Animation Generator
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

// Predefined color palettes
const COLOR_PALETTES = {
    cyberpunk: ['#ff006e', '#8338ec', '#3a86ff', '#06ffa5', '#ffbe0b'],
    retro: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'],
    neon: ['#ff0080', '#00ff80', '#0080ff', '#8000ff', '#ff8000'],
    monochrome: ['#ffffff', '#cccccc', '#999999', '#666666', '#333333', '#000000'],
    sunset: ['#ff6b35', '#f7931e', '#ffd23f', '#f4a261', '#e76f51'],
    ocean: ['#006994', '#0099cc', '#00bfff', '#87ceeb', '#b0e0e6'],
    forest: ['#228b22', '#32cd32', '#90ee90', '#98fb98', '#00ff7f'],
    fire: ['#ff4500', '#ff6347', '#ff7f50', '#ff8c00', '#ffa500']
};

// Canvas and animation state
let canvas;              // p5.js canvas reference
let time = 0;            // Animation time counter (increments each frame)
let gridCols, gridRows;  // Grid dimensions (columns and rows)

// Interactive effects state
let mousePos = { x: 0.5, y: 0.5 }; // Normalized mouse position (0-1 range)
let clickEffects = [];              // Array of active click ripple effects
let voronoiPoints = [];             // Array of points for Voronoi pattern generation

// Performance optimization variables
let frameCount = 0;      // Frame counter for performance monitoring
let lastFrameTime = 0;   // Time of last frame for FPS calculation
let targetFPS = 60;      // Target frame rate
let frameInterval = 1000 / targetFPS; // Time between frames in milliseconds

// UI resize functionality variables
let isResizing = false;    // Whether user is currently resizing the controls panel
let resizeStartX = 0;      // Mouse X position when resize started
let resizeStartWidth = 0;  // Controls panel width when resize started

// Animation control
let isPaused = false;      // Whether animation is paused
let speedMultiplier = 1.0; // Animation speed multiplier (0.5x, 1x, 2x, etc.)

// All available pattern types for morphing and randomization (removed cellular)
const PATTERN_TYPES = ['waves', 'ripples', 'noise', 'spiral', 'checkerboard', 'stripes', 'plasma', 'mandelbrot', 'julia', 'voronoi', 'tunnel', 'mosaic'];

// Main application settings object - contains all user-configurable parameters
let settings = {
    // Display settings
    gridCols: 140,       // Number of columns in the ASCII grid
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
        noiseVariant: 'simplex'  // Noise variant: 'simplex', 'turbulence', 'ridged'
    },
    
    // Secondary pattern configuration (for blending)
    pattern2: {
        enabled: false,    // Whether secondary pattern is active
        type: 'ripples',   // Pattern type
        speed: 0.02,       // Animation speed multiplier
        scale: 0.08,       // Pattern scale/density
        color: '#00ff00',  // Pattern color (hex)
        glow: false,       // Whether to apply glow effect
        noiseVariant: 'simplex'  // Noise variant: 'simplex', 'turbulence', 'ridged'
    },
    
    // Interactive effects configuration
    interactive: {
        enabled: false,    // Whether interactive effects are active
        type: 'ripple',    // Effect type: 'ripple', 'attract', 'repel', 'trail', 'distort'
        strength: 1.0,     // Effect intensity multiplier
        radius: 0.2,       // Effect radius (normalized 0-1)
        clickEnabled: true // Whether mouse clicks create ripple effects
    },
    
    // Webcam configuration
    webcam: {
        enabled: false,    // Whether webcam is active
        intensity: 0.5,    // How much webcam affects patterns (0-1)
        contrast: 1.0      // Webcam contrast multiplier
    },
    
    // Pattern blending configuration
    blendSettings: {
        mode: 'multiply',  // Blend mode: 'add', 'multiply', 'overlay', 'difference', 'screen'
        amount: 0.5        // Blend intensity (0-1)
    },
    
    // Color configuration
    colors: {
        // Background color
        backgroundColor: '#000000', // Background color for the canvas container
        
        // Pattern colors
        pattern1Color: '#ffffff',  // Primary pattern color
        pattern2Color: '#00ff00',  // Secondary pattern color (only used when pattern2 is enabled)
        
        // Lock settings - controls what gets randomized
        locks: {
            backgroundColor: false,    // Lock background color
            pattern1Color: false,      // Lock primary pattern color
            pattern2Color: false,      // Lock secondary pattern color
            pattern1Type: false,       // Lock primary pattern type
            pattern2Type: false,       // Lock secondary pattern type
            pattern1Speed: false,      // Lock primary pattern speed
            pattern2Speed: false,      // Lock secondary pattern speed
            pattern1Scale: false,      // Lock primary pattern scale
            pattern2Scale: false,      // Lock secondary pattern scale
            charSize: false,           // Lock character size
            gridCols: false,           // Lock grid columns
            gridRows: false,           // Lock grid rows
            colorAnimation: false,     // Lock color animation settings
            colorPalette: false,       // Lock color palette settings
            secondaryPattern: false    // Lock secondary pattern enable/disable
        },
        
        // Color animation settings
        animationEnabled: false,   // Whether colors shift over time
        animationSpeed: 0.01,      // Speed of color transitions
        animationType: 'hue',      // 'hue', 'saturation', 'brightness', 'rainbow'
        animationTime: 0,          // Internal time counter for animations
        
        // Color palette settings
        usePalette: false,         // Whether to use predefined palettes
        currentPalette: 'cyberpunk', // Current palette name
        paletteColors: [],         // Array of colors from current palette
        paletteIndex: 0,           // Current color index in palette
        paletteColorMode: 'single', // 'single', 'cycle', 'random'
        randomColorTimer: 0,       // Timer for random color changes
        
        // Blend mode settings
        blendMode: 'multiply',     // Blend mode for pattern2
        blendAmount: 0.5           // Blend intensity (0-1)
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

    // Initialize special pattern systems (removed cellular)
    initVoronoi();   // Set up Voronoi pattern points

    // Set up all UI components and event listeners
    setupControls();           // Main control panel event listeners
    setupPlayPauseButton();    // Play/pause button functionality
    setupSpeedButton();        // Speed control button
    setupRandomizeButton();    // Randomize settings button
    setupIndividualLockButtons(); // Individual lock buttons
    setupDownloadButton();     // Export/download functionality
    setupResizeHandling();     // Controls panel resize functionality
    setupSidebarToggle();      // Sidebar hide/show functionality
    setupTooltips();           // Button tooltips
    setupCodeFunctionality();  // Code generation and loading functionality
    
    // Initialize color settings
    settings.colors.paletteColors = COLOR_PALETTES[settings.colors.currentPalette];
    settings.pattern1.color = settings.colors.pattern1Color;
    settings.pattern2.color = settings.colors.pattern2Color;
    settings.blendSettings.mode = settings.colors.blendMode;
    settings.blendSettings.amount = settings.colors.blendAmount;
    
    // Initialize background color
    updateBackgroundColor();
    
    // Apply palette colors if palette mode is enabled
    if (settings.colors.usePalette) {
        updateColorsFromPalette();
    }
    
    // Position the floating button group
    updateButtonGroupPosition();
    updateSidebarTogglePosition();
    
    // Ensure canvas size is correct after all UI elements are positioned
    setTimeout(() => updateCanvasSize(), 100);

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
    
    // Handle orientation changes on mobile devices
    window.addEventListener('orientationchange', () => {
        // Wait for orientation change to complete, then update canvas size
        setTimeout(() => {
            updateCanvasSize();
        }, 500);
    });
    
    // Handle window focus events (useful for mobile browsers)
    window.addEventListener('focus', () => {
        // Small delay to ensure window dimensions are stable
        setTimeout(() => {
            updateCanvasSize();
        }, 100);
    });
}

/**
 * Calculates and updates canvas size to fit the current grid configuration
 * Ensures the canvas is large enough to display all characters while staying within bounds
 * Now dynamically scales to 80% of available viewport/container width and allows taller canvas
 */
function updateCanvasSize() {
    // Get the canvas container dimensions
    const canvasContainer = document.getElementById('canvas-container');
    const containerWidth = canvasContainer.offsetWidth;
    const containerHeight = canvasContainer.offsetHeight;
    
    // Calculate required canvas size based on grid and character size
    let requiredWidth = gridCols * baseCharWidth * (settings.charSize / 12) * settings.charSpacing;
    let requiredHeight = gridRows * baseCharHeight * (settings.charSize / 12) * settings.charSpacing;

    // Scale to 80% of available container width
    let targetWidth = containerWidth * 0.8;
    let targetHeight = containerHeight * 0.8;

    // Calculate scale factors to fit within target dimensions
    let scaleX = targetWidth / requiredWidth;
    let scaleY = targetHeight / requiredHeight;
    let scale = Math.min(scaleX, scaleY, 1.0); // Don't scale up beyond 100%

    // Calculate final canvas dimensions
    let finalWidth = Math.floor(requiredWidth * scale);
    let finalHeight = Math.floor(requiredHeight * scale);

    // Ensure minimum dimensions for usability
    finalWidth = Math.max(finalWidth, 400);
    finalHeight = Math.max(finalHeight, 300);

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
    const sidebarToggle = document.getElementById('sidebar-toggle');

    // Helper function to update the resize handle position
    function updateHandlePosition() {
        if (controlsPanel.classList.contains('sidebar-hidden')) {
            resizeHandle.style.right = '-4.5px'; // Hide resize handle when sidebar is hidden
        } else {
            const controlsWidth = controlsPanel.offsetWidth;
            resizeHandle.style.right = (controlsWidth - 4.5) + 'px'; // Center on the 1px border
        }
    }

    updateHandlePosition();
    
    // Set initial CSS custom property
    const initialWidth = controlsPanel.offsetWidth;
    document.documentElement.style.setProperty('--current-sidebar-width', initialWidth + 'px');

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

        // Update CSS custom property for dynamic width calculations
        document.documentElement.style.setProperty('--current-sidebar-width', clampedWidth + 'px');

        // Update handle position to stay aligned
        resizeHandle.style.right = (clampedWidth - 4.5) + 'px';

        // Update button group position to stay centered in the canvas area
        updateButtonGroupPosition();
        // Update sidebar toggle button position in real-time during drag
        updateSidebarTogglePositionWithWidth(clampedWidth);
        
        // Force immediate toggle button positioning during resize (no CSS variable delay)
        if (!controlsPanel.classList.contains('sidebar-hidden')) {
            sidebarToggle.style.right = (clampedWidth + 20) + 'px';
        }
        
        // Update canvas size to fit new available space
        updateCanvasSize();

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
            
            // Clean up inline styles and let CSS take over
            if (!controlsPanel.classList.contains('sidebar-hidden')) {
                sidebarToggle.style.removeProperty('right');
            }
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
        updateSidebarTogglePosition();
        
        // Update CSS custom property with current width
        if (!controlsPanel.classList.contains('sidebar-hidden')) {
            const currentWidth = controlsPanel.offsetWidth;
            document.documentElement.style.setProperty('--current-sidebar-width', currentWidth + 'px');
        }
        
        // Debounced canvas size update to prevent excessive resizing during window resize
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
            updateCanvasSize();
        }, 250);
    });
}

/**
 * Sets up the sidebar toggle functionality
 * Allows users to hide/show the controls panel
 */
function setupSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const controlsPanel = document.getElementById('controls');
    const resizeHandle = document.getElementById('resize-handle');
    const canvasContainer = document.getElementById('canvas-container');
    
    // Check if sidebar was previously hidden
    const sidebarHidden = localStorage.getItem('sidebarHidden') === 'true';
    if (sidebarHidden) {
        controlsPanel.classList.add('sidebar-hidden');
        resizeHandle.classList.add('sidebar-hidden');
        sidebarToggle.classList.add('sidebar-hidden');
        canvasContainer.classList.add('sidebar-hidden');
        // Update positions after restoring state
        setTimeout(() => {
            updateButtonGroupPosition();
            updateHandlePosition();
            updateSidebarTogglePosition();
        }, 100);
    }

    sidebarToggle.addEventListener('click', () => {
        const isHidden = controlsPanel.classList.contains('sidebar-hidden');
        
        if (isHidden) {
            // Show sidebar
            controlsPanel.classList.remove('sidebar-hidden');
            resizeHandle.classList.remove('sidebar-hidden');
            sidebarToggle.classList.remove('sidebar-hidden');
            canvasContainer.classList.remove('sidebar-hidden');
            localStorage.setItem('sidebarHidden', 'false');
            console.log('Sidebar shown, canvas container classes:', canvasContainer.classList.toString());
        } else {
            // Hide sidebar
            controlsPanel.classList.add('sidebar-hidden');
            resizeHandle.classList.add('sidebar-hidden');
            sidebarToggle.classList.add('sidebar-hidden');
            canvasContainer.classList.add('sidebar-hidden');
            localStorage.setItem('sidebarHidden', 'true');
            console.log('Sidebar hidden, canvas container classes:', canvasContainer.classList.toString());
        }
        
        // Update button group position and resize handle position when sidebar state changes
        updateButtonGroupPosition();
        updateHandlePosition();
        updateSidebarTogglePosition();
        
        // Update canvas size to fit new available space
        setTimeout(() => updateCanvasSize(), 100);
    });
}

/**
 * Updates the position of the sidebar toggle button
 * Called when the sidebar state changes
 */
function updateSidebarTogglePosition() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const controlsPanel = document.getElementById('controls');
    
    if (controlsPanel.classList.contains('sidebar-hidden')) {
        // When sidebar is hidden, CSS class handles positioning
        // Update CSS custom property to 0 when hidden
        document.documentElement.style.setProperty('--current-sidebar-width', '0px');
    } else {
        // When sidebar is visible, CSS handles positioning via --current-sidebar-width
        const controlsWidth = controlsPanel.offsetWidth;
        // Update CSS custom property with current width
        document.documentElement.style.setProperty('--current-sidebar-width', controlsWidth + 'px');
    }
}

/**
 * Updates the position of the sidebar toggle button with a specific width
 * More efficient for drag operations
 */
function updateSidebarTogglePositionWithWidth(width) {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const controlsPanel = document.getElementById('controls');
    
    if (controlsPanel.classList.contains('sidebar-hidden')) {
        // When sidebar is hidden, CSS class handles positioning
        // Update CSS custom property to 0 when hidden
        document.documentElement.style.setProperty('--current-sidebar-width', '0px');
    } else {
        // When sidebar is visible, CSS handles positioning via --current-sidebar-width
        // Update CSS custom property with current width
        document.documentElement.style.setProperty('--current-sidebar-width', width + 'px');
    }
}

/**
 * Updates the position of the floating button group to stay centered in the canvas area
 * Called when the controls panel is resized or the window is resized
 */
function updateButtonGroupPosition() {
    const buttonGroup = document.getElementById('button-group');
    const controlsPanel = document.getElementById('controls');
    const controlsWidth = controlsPanel.classList.contains('sidebar-hidden') ? 0 : controlsPanel.offsetWidth;
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
    // Skip rendering if webcam mode is active
    if (webcamMode && isWebcamActive) {
        return;
    }
    
    // Performance optimization: frame rate limiting
    const currentTime = Date.now();
    if (currentTime - lastFrameTime < frameInterval) {
        return; // Skip frame if too soon
    }
    lastFrameTime = currentTime;
    frameCount++;

    // Clear canvas with dynamic background color
    const bgColor = color(settings.colors.backgroundColor);
    background(bgColor);
    
    // Update animation time (adjusted by speed multiplier)
    time += 0.016 * speedMultiplier; // ~60fps with speed multiplier

    // Update colors from animation and palettes
    updateColorsFromAnimation();
    updateColorsFromPalette();

    // Update interactive effects (click ripples, etc.)
    updateInteractiveEffects();
    
    // Performance monitoring
    monitorPerformance();

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

    // Render grid (rotation feature removed for performance)
    renderGrid(startX, startY, actualCharWidth, actualCharHeight, actualCharSize);
}

/**
 * Main rendering function for the ASCII art grid
 * Character rotation feature removed for better performance
 */
function renderGrid(startX, startY, actualCharWidth, actualCharHeight, actualCharSize) {
    // Pre-calculate common values
    let needsGlow = settings.pattern1.glow || (settings.pattern2.enabled && settings.pattern2.glow);
    
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
            
            // Debug logging for first few cells
            if (x === 0 && y === 0) {
                console.log('Rendering colors:', {
                    pattern1Color: settings.pattern1.color,
                    pattern2Color: settings.pattern2.enabled ? settings.pattern2.color : 'disabled',
                    finalColor: finalColor
                });
            }

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
            }

            // Apply interactive effects (mouse hover, clicks, etc.)
            if (settings.interactive.enabled) {
                finalValue = applyInteractiveEffect(x, y, finalValue);
            }

            // Apply glow effect if needed
            if (needsGlow) {
                let maxGlowIntensity = Math.max(glowIntensity1, glowIntensity2);
                if (maxGlowIntensity > 0) {
                    let enhancedGlowIntensity = Math.pow(maxGlowIntensity, 0.7);
                    applyGlow(finalColor, enhancedGlowIntensity, actualCharSize);
                }
            }

            // Set fill color
            fill(finalColor);

            // Convert pattern value to ASCII character using appropriate character set
            let selectedRamp = useRamp1 ? currentRamp1 : currentRamp2;
            let charIndex = Math.floor(map(finalValue, 0, 1, 0, selectedRamp.length - 1));
            charIndex = constrain(charIndex, 0, selectedRamp.length - 1);
            let char = selectedRamp[charIndex];

            // Draw character without rotation (fast)
            text(char, xPos, yPos);
        }
    }
}

/**
 * Updates interactive effects each frame
 * Currently handles decay of click ripple effects
 */
function updateInteractiveEffects() {
    // Performance optimization: only update if interactive effects are enabled
    if (!settings.interactive.enabled) return;
    
    // Decay click effects and remove expired ones
    clickEffects = clickEffects.filter(effect => {
        effect.life -= 0.016; // Reduce life by one frame (~60fps)
        return effect.life > 0; // Keep only effects that are still alive
    });
}

/**
 * Performance monitoring function
 * Logs performance metrics every 60 frames
 */
function monitorPerformance() {
    if (frameCount % 60 === 0) {
        const currentTime = Date.now();
        const fps = 1000 / (currentTime - lastFrameTime);
        // Performance monitoring (commented out to reduce console noise)
        // console.log(`Performance: FPS: ${fps.toFixed(1)}, Grid: ${gridCols}x${gridRows}`);
    }
}

/**
 * Applies interactive effects to a grid cell based on mouse position and click effects
 * @param {number} x - Grid column index
 * @param {number} y - Grid row index
 * @param {number} baseValue - Base pattern value (0-1)
 * @returns {number} Modified pattern value with interactive effects applied
 */
function applyInteractiveEffect(x, y, baseValue) {
    // Performance optimization: early return if no interactive effects
    if (!settings.interactive.enabled) return baseValue;
    
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

    // Performance optimization: only process click effects if there are any
    if (clickEffects.length > 0) {
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
            // Use different noise variants for organic, natural-looking patterns
            const noiseVariant = pattern.noiseVariant || 'simplex';
            switch (noiseVariant) {
                case 'simplex':
                    // Standard Perlin noise (simplex-like)
                    value = noise(normalizedX * pattern.scale * 100, normalizedY * pattern.scale * 100, time * pattern.speed * 10) * 2 - 1;
                    break;
                case 'turbulence':
                    // Turbulence noise - multiple octaves of noise
                    value = 0;
                    let amplitude = 1.0;
                    let frequency = 1.0;
                    for (let i = 0; i < 4; i++) {
                        value += amplitude * noise(
                            normalizedX * pattern.scale * 100 * frequency, 
                            normalizedY * pattern.scale * 100 * frequency, 
                            time * pattern.speed * 10 * frequency
                        );
                        amplitude *= 0.5;
                        frequency *= 2.0;
                    }
                    value = (value / 1.875) * 2 - 1; // Normalize to -1 to 1
                    break;
                case 'ridged':
                    // Ridged noise - creates sharp ridges and valleys
                    let baseNoise = noise(normalizedX * pattern.scale * 100, normalizedY * pattern.scale * 100, time * pattern.speed * 10);
                    value = 1.0 - Math.abs(baseNoise * 2 - 1) * 2 - 1; // Convert to ridged
                    break;
                default:
                    // Fallback to simplex
                    value = noise(normalizedX * pattern.scale * 100, normalizedY * pattern.scale * 100, time * pattern.speed * 10) * 2 - 1;
            }
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
            // Create animated Mandelbrot set pattern (optimized)
            let zx = (normalizedX - 0.5) * 4;
            let zy = (normalizedY - 0.5) * 4;
            let cx = zx + sin(time * pattern.speed * 50) * 0.3;
            let cy = zy + cos(time * pattern.speed * 30) * 0.3;
            // Performance optimization: reduce iterations based on target FPS
            let mandelbrotIterations = targetFPS <= 30 ? 10 : 15;
            value = mandelbrotIteration(cx, cy, mandelbrotIterations) / mandelbrotIterations;
            break;

        case 'julia':
            // Create animated Julia set pattern (optimized)
            let jx = (normalizedX - 0.5) * 4;
            let jy = (normalizedY - 0.5) * 4;
            let juliaC = { x: sin(time * pattern.speed * 100) * 0.8, y: cos(time * pattern.speed * 70) * 0.8 };
            // Performance optimization: reduce iterations based on target FPS
            let juliaIterations = targetFPS <= 30 ? 10 : 15;
            value = juliaIteration(jx, jy, juliaC, juliaIterations) / juliaIterations;
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

    // Performance optimization: check glow quality setting
    const glowQuality = 'medium'; // Default to medium quality
    if (glowQuality === 'low') return; // Skip glow entirely for low quality

    // Performance optimization: cache color parsing
    let r, g, b;
    
    // Parse color to extract RGB values
    let colorMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!colorMatch) {
        // Handle hex colors if rgb parsing fails
        let hexMatch = color.match(/#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/);
        if (hexMatch) {
            r = parseInt(hexMatch[1], 16);
            g = parseInt(hexMatch[2], 16);
            b = parseInt(hexMatch[3], 16);
        } else {
            return; // Skip glow if color parsing fails
        }
    } else {
        r = parseInt(colorMatch[1]);
        g = parseInt(colorMatch[2]);
        b = parseInt(colorMatch[3]);
    }

    // Performance optimization: adjust glow based on quality setting
    let glowSize, glowAlpha;
    switch (glowQuality) {
        case 'low':
            return; // Already handled above
        case 'medium':
            glowSize = intensity * charSize * 1.5;  // Reduced for medium quality
            glowAlpha = Math.min(intensity * 1.0, 0.6);  // Reduced for medium quality
            break;
        case 'high':
            glowSize = intensity * charSize * 2.5;  // Full quality
            glowAlpha = Math.min(intensity * 1.3, 0.9);  // Full quality
            break;
        default:
            glowSize = intensity * charSize * 2.0;  // Default medium
            glowAlpha = Math.min(intensity * 1.2, 0.8);
    }

    // Performance optimization: only apply glow if intensity is significant
    if (intensity > 0.1) {
        push();
        // Apply shadow-based glow effect
        drawingContext.shadowColor = `rgba(${r}, ${g}, ${b}, ${glowAlpha})`;
        drawingContext.shadowBlur = glowSize;
        drawingContext.shadowOffsetX = 0;
        drawingContext.shadowOffsetY = 0;
        pop();
    }
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
            return Math.abs(value1 - value2);
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

    document.getElementById('pattern1Glow').addEventListener('change', (e) => {
        settings.pattern1.glow = e.target.checked;
    });

    document.getElementById('pattern1Type').addEventListener('change', (e) => {
        settings.pattern1.type = e.target.value;
        if (settings.pattern1.type === 'voronoi') {
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

    // Pattern 1 Noise Variant
    safeAddEventListener('pattern1NoiseVariant', 'change', (e) => {
        settings.pattern1.noiseVariant = e.target.value;
    });

    // Secondary Pattern
    document.getElementById('pattern2Toggle').addEventListener('click', (e) => {
        settings.pattern2.enabled = !settings.pattern2.enabled;
        e.currentTarget.classList.toggle('active');
        
        // Update the label text
        const label = e.currentTarget.querySelector('.toggle-switch-label');
        label.textContent = settings.pattern2.enabled ? 'Disable' : 'Enable';

        const pattern2Settings = document.getElementById('pattern2Settings');
        const pattern2ColorSection = document.getElementById('pattern2ColorSection');
        const blendModeSection = document.getElementById('blendModeSection');
        
        pattern2Settings.style.display = settings.pattern2.enabled ? 'block' : 'none';
        if (pattern2ColorSection) {
            pattern2ColorSection.style.display = settings.pattern2.enabled ? 'block' : 'none';
        }
        if (blendModeSection) {
            blendModeSection.style.display = settings.pattern2.enabled ? 'block' : 'none';
        }
    });



    document.getElementById('pattern2Glow').addEventListener('change', (e) => {
        settings.pattern2.glow = e.target.checked;
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

    // Pattern 2 Noise Variant
    safeAddEventListener('pattern2NoiseVariant', 'change', (e) => {
        settings.pattern2.noiseVariant = e.target.value;
    });

    // Interactive Effects
    document.getElementById('interactiveToggle').addEventListener('click', (e) => {
        settings.interactive.enabled = !settings.interactive.enabled;
        e.currentTarget.classList.toggle('active');
        
        // Update the label text
        const label = e.currentTarget.querySelector('.toggle-switch-label');
        label.textContent = settings.interactive.enabled ? 'Disable' : 'Enable';

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

    // Webcam controls
    safeAddEventListener('webcamIntensity', 'input', (e) => {
        settings.webcam.intensity = parseFloat(e.target.value);
        document.getElementById('webcamIntensityValue').textContent = e.target.value;
    });

    safeAddEventListener('webcamContrast', 'input', (e) => {
        settings.webcam.contrast = parseFloat(e.target.value);
        document.getElementById('webcamContrastValue').textContent = e.target.value;
    });

    // Colors Settings
    // Pattern Colors
    safeAddEventListener('pattern1Color', 'input', (e) => {
        settings.colors.pattern1Color = e.target.value;
        settings.pattern1.color = e.target.value;
        // Disable palette and animation when manually changing colors
        if (settings.colors.usePalette) {
            settings.colors.usePalette = false;
            document.getElementById('useColorPalette').checked = false;
            document.getElementById('colorPaletteSettings').style.display = 'none';
        }
        if (settings.colors.animationEnabled) {
            settings.colors.animationEnabled = false;
            document.getElementById('colorAnimationEnabled').checked = false;
            document.getElementById('colorAnimationSettings').style.display = 'none';
        }
    });

    safeAddEventListener('pattern2Color', 'input', (e) => {
        settings.colors.pattern2Color = e.target.value;
        settings.pattern2.color = e.target.value;
        // Disable palette and animation when manually changing colors
        if (settings.colors.usePalette) {
            settings.colors.usePalette = false;
            document.getElementById('useColorPalette').checked = false;
            document.getElementById('colorPaletteSettings').style.display = 'none';
        }
        if (settings.colors.animationEnabled) {
            settings.colors.animationEnabled = false;
            document.getElementById('colorAnimationEnabled').checked = false;
            document.getElementById('colorAnimationSettings').style.display = 'none';
        }
    });

    // Background Color
    safeAddEventListener('backgroundColor', 'input', (e) => {
        settings.colors.backgroundColor = e.target.value;
        updateBackgroundColor();
    });

    // Color Animation
    safeAddEventListener('colorAnimationEnabled', 'change', (e) => {
        settings.colors.animationEnabled = e.target.checked;
        const animationSettings = document.getElementById('colorAnimationSettings');
        animationSettings.style.display = e.target.checked ? 'block' : 'none';
    });

    safeAddEventListener('colorAnimationType', 'change', (e) => {
        settings.colors.animationType = e.target.value;
    });

    safeAddEventListener('colorAnimationSpeed', 'input', (e) => {
        settings.colors.animationSpeed = parseFloat(e.target.value);
        document.getElementById('colorAnimationSpeedValue').textContent = e.target.value;
    });

    // Color Palettes
    safeAddEventListener('useColorPalette', 'change', (e) => {
        settings.colors.usePalette = e.target.checked;
        const paletteSettings = document.getElementById('colorPaletteSettings');
        paletteSettings.style.display = e.target.checked ? 'block' : 'none';
        updatePalettePreview();
        if (e.target.checked) {
            updateColorsFromPalette();
        }
    });

    safeAddEventListener('colorPaletteSelect', 'change', (e) => {
        settings.colors.currentPalette = e.target.value;
        settings.colors.paletteColors = COLOR_PALETTES[e.target.value];
        settings.colors.paletteIndex = 0;
        settings.colors.randomColorTimer = 0; // Reset random timer
        updatePalettePreview();
        if (settings.colors.usePalette) {
            updateColorsFromPalette();
        }
    });

    safeAddEventListener('paletteColorMode', 'change', (e) => {
        settings.colors.paletteColorMode = e.target.value;
        settings.colors.randomColorTimer = 0; // Reset random timer
        if (settings.colors.usePalette) {
            updateColorsFromPalette();
        }
    });

    // Blend Mode Settings
    safeAddEventListener('blendModeSelect', 'change', (e) => {
        settings.colors.blendMode = e.target.value;
        settings.blendSettings.mode = e.target.value;
    });

    safeAddEventListener('blendAmount', 'input', (e) => {
        settings.colors.blendAmount = parseFloat(e.target.value);
        settings.blendSettings.amount = parseFloat(e.target.value);
        const blendAmountValueElement = document.getElementById('blendAmountValue');
        if (blendAmountValueElement) {
            blendAmountValueElement.textContent = e.target.value;
        }
    });



    // Theme Management
    let currentTheme = localStorage.getItem('theme') || 'auto';
    
    // Initialize theme based on user preference or system preference
    function initializeTheme() {
        if (currentTheme === 'auto') {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
            updateThemeUI(prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', currentTheme);
            updateThemeUI(currentTheme);
        }
        updateLogo();
    }
    
    // Update theme UI elements
    function updateThemeUI(theme) {
        const themeIcon = document.getElementById('theme-icon');
        const themeLabel = document.querySelector('.theme-label');
        
        if (theme === 'light') {
            // Show moon icon (indicating dark mode is available)
            if (themeIcon) {
                themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />`;
            }
            if (themeLabel) {
                themeLabel.textContent = 'Light Mode';
            }
        } else {
            // Show sun icon (indicating light mode is available)
            if (themeIcon) {
                themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />`;
            }
            if (themeLabel) {
                themeLabel.textContent = 'Dark Mode';
            }
        }
    }
    
    // Update logo based on theme
    function updateLogo() {
        const logo = document.getElementById('gridform-logo');
        const theme = document.documentElement.getAttribute('data-theme') || 
                     (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        if (theme === 'light') {
            logo.src = 'assets/logo/GridForm.svg';
            // Apply filter to make logo black in light mode
            logo.style.filter = 'brightness(0) saturate(100%)';
        } else {
            logo.src = 'assets/logo/GridForm.svg';
            logo.style.filter = 'none';
        }
    }
    
    // Toggle theme
    function toggleTheme() {
        const currentDataTheme = document.documentElement.getAttribute('data-theme');
        let newTheme;
        
        if (currentDataTheme === 'light') {
            newTheme = 'dark';
        } else if (currentDataTheme === 'dark') {
            newTheme = 'light';
        } else {
            // If no data-theme is set, check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            newTheme = prefersDark ? 'light' : 'dark';
        }
        
        currentTheme = newTheme;
        document.documentElement.setAttribute('data-theme', newTheme);
        updateThemeUI(newTheme);
        updateLogo();
        localStorage.setItem('theme', newTheme);
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (currentTheme === 'auto') {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            updateThemeUI(newTheme);
            updateLogo();
        }
    });
    
    // Initialize theme on page load
    initializeTheme();
    
    // Settings Modal Functionality
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsClose = document.getElementById('settings-close');

    // Open settings modal
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('show');
            // Sync modal values with current settings
            syncModalValues();
        });
    }

    // Close settings modal
    if (settingsClose) {
        settingsClose.addEventListener('click', () => {
            settingsModal.classList.remove('show');
        });
    }

    // Close modal when clicking outside
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('show');
            }
        });
    }
    
    // Theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Handle modal form changes
    const modalTargetFps = document.getElementById('modal-target-fps');
    const modalGlowQuality = document.getElementById('modal-glow-quality');
    const modalAnimationSmoothing = document.getElementById('modal-animation-smoothing');
    const modalMemoryManagement = document.getElementById('modal-memory-management');

    if (modalTargetFps) {
        modalTargetFps.addEventListener('change', (e) => {
            const fps = parseInt(e.target.value);
            targetFPS = fps;
            frameInterval = 1000 / fps;

            console.log(`Target FPS changed to: ${fps}`);
        });
    }

    if (modalGlowQuality) {
        modalGlowQuality.addEventListener('change', (e) => {
            const quality = e.target.value;

            // Apply the same logic as the main dropdown
            switch (quality) {
                case 'low':
                    settings.pattern1.glow = false;
                    settings.pattern2.glow = false;
                    document.getElementById('pattern1Glow').checked = false;
                    document.getElementById('pattern2Glow').checked = false;
                    break;
                case 'medium':
                    // Keep current glow settings
                    break;
                case 'high':
                    settings.pattern1.glow = true;
                    settings.pattern2.glow = true;
                    document.getElementById('pattern1Glow').checked = true;
                    document.getElementById('pattern2Glow').checked = true;
                    break;
            }
            console.log(`Glow quality changed to: ${quality}`);
        });
    }

    // Helper function to sync modal values with current settings
    function syncModalValues() {
        if (modalTargetFps) {
            modalTargetFps.value = targetFPS;
        }
        if (modalGlowQuality) {
            modalGlowQuality.value = 'medium';
        }
        if (modalAnimationSmoothing) {
            modalAnimationSmoothing.value = 'medium'; // Default value
        }
        if (modalMemoryManagement) {
            modalMemoryManagement.value = 'balanced'; // Default value
        }
        
        // Sync theme state
        const currentDataTheme = document.documentElement.getAttribute('data-theme');
        if (currentDataTheme) {
            updateThemeUI(currentDataTheme);
        }
    }
}

function setupDropdowns() {
    const dropdownHeaders = [
        'displayHeader',
        'colorsHeader',
        'pattern1Header',
        'pattern2Header',
        'interactiveHeader',
        'webcamHeader'
    ];

    const dropdownContents = [
        'displayContent',
        'colorsContent',
        'pattern1Content',
        'pattern2Content',
        'interactiveContent',
        'webcamContent'
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
        // Track randomize button click
    gtag('event', 'randomize_click', {
        'event_category': 'engagement',
        'event_label': 'pattern_randomize',
        'value': 1
    });
        // Randomize pattern types
        const patternTypes = ['waves', 'ripples', 'noise', 'spiral', 'checkerboard', 'stripes', 'plasma', 'mandelbrot', 'julia', 'voronoi', 'tunnel', 'mosaic'];
        const charSets = ['blocks', 'ascii', 'hex', 'numbers', 'letters', 'symbols', 'braille'];

        // Randomize primary pattern (respect locks)
        if (!settings.colors.locks.pattern1Type) {
            settings.pattern1.type = patternTypes[Math.floor(Math.random() * patternTypes.length)];
        }
        if (!settings.colors.locks.pattern1Speed) {
            settings.pattern1.speed = Math.random() * 0.049 + 0.001; // 0.001 to 0.05
        }
        if (!settings.colors.locks.pattern1Scale) {
            settings.pattern1.scale = Math.random() * 0.19 + 0.01; // 0.01 to 0.2
        }
        settings.pattern1.glow = Math.random() > 0.5;
        
        // Randomize noise variant if noise is selected
        if (settings.pattern1.type === 'noise') {
            const noiseVariants = ['simplex', 'turbulence', 'ridged'];
            settings.pattern1.noiseVariant = noiseVariants[Math.floor(Math.random() * noiseVariants.length)];
        }
        
        // Randomize color settings - use predefined vibrant colors
        const vibrantColors = [
            '#ff006e', '#8338ec', '#3a86ff', '#06ffa5', '#ffbe0b', // cyberpunk
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', // retro
            '#ff0080', '#00ff80', '#0080ff', '#8000ff', '#ff8000', // neon
            '#ff6b35', '#f7931e', '#ffd23f', '#f4a261', '#e76f51', // sunset
            '#006994', '#0099cc', '#00bfff', '#87ceeb', '#b0e0e6', // ocean
            '#228b22', '#32cd32', '#90ee90', '#98fb98', '#00ff7f', // forest
            '#ff4500', '#ff6347', '#ff7f50', '#ff8c00', '#ffa500'  // fire
        ];
        if (!settings.colors.locks.pattern1Color) {
            const randomColor = vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
            settings.colors.pattern1Color = randomColor;
            settings.pattern1.color = randomColor;
        }
        
        // Randomize background color - full spectrum of colors
        const backgroundColors = [
            // Dark colors for good contrast
            '#000000', '#111111', '#1a1a1a', '#2d2d2d', '#1f1f1f', '#0a0a0a', '#1e1e1e', '#2a2a2a', '#151515', '#0f0f0f',
            // Vibrant colors
            '#ff006e', '#8338ec', '#3a86ff', '#06ffa5', '#ffbe0b', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
            '#ff0080', '#00ff80', '#0080ff', '#8000ff', '#ff8000', '#ff6b35', '#f7931e', '#ffd23f', '#f4a261', '#e76f51',
            '#006994', '#0099cc', '#00bfff', '#87ceeb', '#b0e0e6', '#228b22', '#32cd32', '#90ee90', '#98fb98', '#00ff7f',
            '#ff4500', '#ff6347', '#ff7f50', '#ff8c00', '#ffa500',
            // Pastel colors
            '#ffb3ba', '#baffc9', '#bae1ff', '#ffb3f0', '#fff2ba', '#e6b3ff', '#b3ffd9', '#ffd9b3', '#b3d9ff', '#ffb3d9',
            // Neutral colors
            '#f5f5dc', '#d2b48c', '#deb887', '#f4a460', '#daa520', '#b8860b', '#cd853f', '#d2691e', '#8b4513', '#a0522d',
            // Cool colors
            '#4169e1', '#1e90ff', '#00bfff', '#87ceeb', '#4682b4', '#5f9ea0', '#20b2aa', '#48d1cc', '#40e0d0', '#7fffd4',
            // Warm colors
            '#ff6347', '#ff4500', '#ff8c00', '#ffa500', '#ffd700', '#ffff00', '#adff2f', '#7fff00', '#32cd32', '#00ff00'
        ];
        if (!settings.colors.locks.backgroundColor) {
            const randomBackgroundColor = backgroundColors[Math.floor(Math.random() * backgroundColors.length)];
            settings.colors.backgroundColor = randomBackgroundColor;
        }
        
        // Randomize color animation (25% chance to enable, respect locks)
        if (!settings.colors.locks.colorAnimation) {
            settings.colors.animationEnabled = Math.random() > 0.75;
            if (settings.colors.animationEnabled) {
                const animationTypes = ['hue', 'saturation', 'brightness', 'rainbow'];
                settings.colors.animationType = animationTypes[Math.floor(Math.random() * animationTypes.length)];
                settings.colors.animationSpeed = Math.random() * 0.04 + 0.005; // 0.005 to 0.045
            }
        }
        
        // Randomize color palette (35% chance to enable, respect locks)
        if (!settings.colors.locks.colorPalette) {
            settings.colors.usePalette = Math.random() > 0.65;
            if (settings.colors.usePalette) {
                const paletteNames = Object.keys(COLOR_PALETTES);
                settings.colors.currentPalette = paletteNames[Math.floor(Math.random() * paletteNames.length)];
                settings.colors.paletteColors = COLOR_PALETTES[settings.colors.currentPalette];
                settings.colors.paletteIndex = Math.floor(Math.random() * settings.colors.paletteColors.length);
                
                const paletteModes = ['single', 'cycle', 'random'];
                settings.colors.paletteColorMode = paletteModes[Math.floor(Math.random() * paletteModes.length)];
            } else {
                // If not using palette, ensure we have a good default color
                if (!settings.colors.locks.pattern1Color && (settings.colors.pattern1Color === '#ffffff' || settings.colors.pattern1Color === '#000000')) {
                    const fallbackColors = ['#ff006e', '#8338ec', '#3a86ff', '#06ffa5', '#ffbe0b'];
                    const fallbackColor = fallbackColors[Math.floor(Math.random() * fallbackColors.length)];
                    settings.colors.pattern1Color = fallbackColor;
                    settings.pattern1.color = fallbackColor;
                }
            }
        }

        // Randomize primary character set
        const selectedCharSet1 = charSets[Math.floor(Math.random() * charSets.length)];
        currentRamp1 = ASCII_RAMPS[selectedCharSet1];

        // Randomize secondary pattern (with proper enable/disable logic)
        const shouldEnableSecondary = Math.random() > 0.4; // 60% chance to enable
        settings.pattern2.enabled = shouldEnableSecondary;
        
        if (shouldEnableSecondary) {
            if (!settings.colors.locks.pattern2Type) {
                settings.pattern2.type = patternTypes[Math.floor(Math.random() * patternTypes.length)];
            }
            if (!settings.colors.locks.pattern2Speed) {
                settings.pattern2.speed = Math.random() * 0.049 + 0.001;
            }
            if (!settings.colors.locks.pattern2Scale) {
                settings.pattern2.scale = Math.random() * 0.19 + 0.01;
            }
            settings.pattern2.glow = Math.random() > 0.5;
            
            // Randomize noise variant if noise is selected
            if (settings.pattern2.type === 'noise') {
                const noiseVariants = ['simplex', 'turbulence', 'ridged'];
                settings.pattern2.noiseVariant = noiseVariants[Math.floor(Math.random() * noiseVariants.length)];
            }
            
            // Randomize secondary pattern color - use predefined vibrant colors
            const vibrantColors2 = [
                '#ff006e', '#8338ec', '#3a86ff', '#06ffa5', '#ffbe0b', // cyberpunk
                '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', // retro
                '#ff0080', '#00ff80', '#0080ff', '#8000ff', '#ff8000', // neon
                '#ff6b35', '#f7931e', '#ffd23f', '#f4a261', '#e76f51', // sunset
                '#006994', '#0099cc', '#00bfff', '#87ceeb', '#b0e0e6', // ocean
                '#228b22', '#32cd32', '#90ee90', '#98fb98', '#00ff7f', // forest
                '#ff4500', '#ff6347', '#ff7f50', '#ff8c00', '#ffa500'  // fire
            ];
            if (!settings.colors.locks.pattern2Color) {
                const randomColor2 = vibrantColors2[Math.floor(Math.random() * vibrantColors2.length)];
                settings.colors.pattern2Color = randomColor2;
                settings.pattern2.color = randomColor2;
            }
            
            // Randomize blend settings
            settings.colors.blendAmount = Math.random() * 0.8 + 0.2; // 0.2 to 1.0
            settings.blendSettings.amount = settings.colors.blendAmount;
            
            const blendModes = ['add', 'multiply', 'overlay', 'difference', 'screen'];
            settings.colors.blendMode = blendModes[Math.floor(Math.random() * blendModes.length)];
            settings.blendSettings.mode = settings.colors.blendMode;

            // Randomize secondary character set
            const selectedCharSet2 = charSets[Math.floor(Math.random() * charSets.length)];
            currentRamp2 = ASCII_RAMPS[selectedCharSet2];
            
            // Ensure secondary pattern has a good color if not using palette
            if (!settings.colors.usePalette && !settings.colors.locks.pattern2Color && (settings.colors.pattern2Color === '#ffffff' || settings.colors.pattern2Color === '#000000')) {
                const fallbackColors2 = ['#ff006e', '#8338ec', '#3a86ff', '#06ffa5', '#ffbe0b'];
                const fallbackColor2 = fallbackColors2[Math.floor(Math.random() * fallbackColors2.length)];
                settings.colors.pattern2Color = fallbackColor2;
                settings.pattern2.color = fallbackColor2;
            }
        }

        // Reset color animation timers
        settings.colors.animationTime = 0;
        settings.colors.randomColorTimer = 0;
        
        // Reinitialize special patterns if needed
        if (settings.pattern1.type === 'voronoi') {
            initVoronoi();
        }
        if (settings.pattern2.enabled && settings.pattern2.type === 'voronoi') {
            initVoronoi();
        }

        // Update UI to reflect changes
        updateUIFromSettings();
        
        // Update pattern code display
        updatePatternCodeDisplay();
    });
}



function setupIndividualLockButtons() {
    const lockButtons = document.querySelectorAll('.lock-btn');
    
    lockButtons.forEach(button => {
        const setting = button.getAttribute('data-setting');
        if (!setting) return;
        
        // Update initial appearance
        updateLockButtonAppearance(button, setting);
        
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle lock state for this specific setting
            settings.colors.locks[setting] = !settings.colors.locks[setting];
            
            // Update this button's appearance
            updateLockButtonAppearance(button, setting);
            
            // Show feedback
            const settingName = getSettingDisplayName(setting);
            if (settings.colors.locks[setting]) {
                showToast(`${settingName} locked from randomization`, 'info');
            } else {
                showToast(`${settingName} unlocked for randomization`, 'info');
            }
        });
    });
}

function updateLockButtonAppearance(button, setting) {
    const isLocked = settings.colors.locks[setting];
    
    if (isLocked) {
        button.classList.add('locked');
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="lock-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
        `;
    } else {
        button.classList.remove('locked');
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="lock-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
        `;
    }
}

function updateAllLockButtonAppearances() {
    const lockButtons = document.querySelectorAll('.lock-btn');
    
    lockButtons.forEach(button => {
        const setting = button.getAttribute('data-setting');
        if (setting) {
            updateLockButtonAppearance(button, setting);
        }
    });
}

function getSettingDisplayName(setting) {
    const displayNames = {
        backgroundColor: 'Background Color',
        pattern1Color: 'Primary Pattern Color',
        pattern2Color: 'Secondary Pattern Color',
        pattern1Type: 'Primary Pattern Type',
        pattern2Type: 'Secondary Pattern Type',
        pattern1Speed: 'Primary Pattern Speed',
        pattern2Speed: 'Secondary Pattern Speed',
        pattern1Scale: 'Primary Pattern Scale',
        pattern2Scale: 'Secondary Pattern Scale',
        charSize: 'Character Size',
        gridCols: 'Grid Columns',
        gridRows: 'Grid Rows',
        charSpacing: 'Character Spacing',
        colorAnimation: 'Color Animation',
        colorPalette: 'Color Palette',
        secondaryPattern: 'Secondary Pattern'
    };
    
    return displayNames[setting] || setting;
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

    // Calculate the same scale factor as draw() function (don't scale up, only down)
    let gridPixelWidth = gridCols * baseCharWidth;
    let gridPixelHeight = gridRows * baseCharHeight;
    let scaleX = width / gridPixelWidth;
    let scaleY = height / gridPixelHeight;
    let displayGridScale = Math.min(scaleX, scaleY, 1.0); // Same as draw() function

    // Calculate the actual grid dimensions that would be displayed
    let displayCharWidth = baseCharWidth * displayGridScale * settings.charSpacing;
    let displayCharHeight = baseCharHeight * displayGridScale * settings.charSpacing;
    let displayGridWidth = gridCols * displayCharWidth;
    let displayGridHeight = gridRows * displayCharHeight;

    // Create off-screen canvas with EXACT grid dimensions, scaled up for high resolution
    const offscreenCanvas = document.createElement('canvas');
    const ctx = offscreenCanvas.getContext('2d');

    // Set canvas size to exactly match the grid dimensions at high resolution
    offscreenCanvas.width = Math.floor(displayGridWidth * dpiScale);
    offscreenCanvas.height = Math.floor(displayGridHeight * dpiScale);

    // Clear the off-screen canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

    // Set up text rendering
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Scale up the display dimensions to high resolution
    let actualCharWidth = displayCharWidth * dpiScale;
    let actualCharHeight = displayCharHeight * dpiScale;
    let actualCharSize = (settings.charSize * displayGridScale) * dpiScale;

    // Since the canvas is exactly the grid size, start at (0,0)
    let startX = 0;
    let startY = 0;

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

            ctx.fillText(char, xPos, yPos);
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

            gtag('event', 'file_download', {
                'event_category': 'engagement',
                'event_label': `gridform_${ext}`,
                'value': 1
            });
        
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

    try {
        // Show a brief message that recording is starting
        console.log(`Starting GIF recording: ${filename}.gif (${duration}s duration)`);
        console.log('Note: Processing may take several seconds after recording completes');

        // Show progress overlay and start recording
        showGifProgressOverlay(duration);

        // Create a custom GIF recording with proper grid dimensions
        createCustomGif(filename, duration);

        // Show a "will download soon" toast to set expectations
        showRecordingToast(`${filename}.gif`, duration);

        // Track GIF download attempt
        gtag('event', 'file_download', {
            'event_category': 'engagement',
            'event_label': 'gridform_gif',
            'value': 1
        });

    } catch (error) {
        console.error('GIF export failed:', error);
        alert('GIF export failed. Please try again. Make sure your browser supports the required features.');
    }
}

function createCustomGif(filename, duration) {
    // Calculate the same scale factor as draw() function (don't scale up, only down)
    let gridPixelWidth = gridCols * baseCharWidth;
    let gridPixelHeight = gridRows * baseCharHeight;
    let scaleX = width / gridPixelWidth;
    let scaleY = height / gridPixelHeight;
    let displayGridScale = Math.min(scaleX, scaleY, 1.0); // Same as draw() function

    // Calculate the actual grid dimensions that would be displayed
    let displayCharWidth = baseCharWidth * displayGridScale * settings.charSpacing;
    let displayCharHeight = baseCharHeight * displayGridScale * settings.charSpacing;
    let displayGridWidth = gridCols * displayCharWidth;
    let displayGridHeight = gridRows * displayCharHeight;

    // Create off-screen canvas with EXACT grid dimensions
    const offscreenCanvas = document.createElement('canvas');
    const ctx = offscreenCanvas.getContext('2d');

    // Set canvas size to exactly match the grid dimensions
    offscreenCanvas.width = Math.floor(displayGridWidth);
    offscreenCanvas.height = Math.floor(displayGridHeight);

    // Temporarily replace the main canvas with our off-screen canvas for GIF recording
    const originalCanvas = canvas;
    const originalWidth = width;
    const originalHeight = height;
    
    // Store the original canvas reference
    canvas = offscreenCanvas;
    width = offscreenCanvas.width;
    height = offscreenCanvas.height;

    // Configure GIF options for perfect loops
    const options = {
        units: "seconds", // Use seconds instead of frames for more reliable recording
        delay: 0,
        silent: true, // Disable progress notifications
        notificationDuration: 0, // No notification duration
        notificationID: 'gifProgress'
    };

    // Start the GIF recording with the off-screen canvas
    saveGif(`${filename}.gif`, duration, options);

    // Restore the original canvas after a delay to allow recording to complete
    setTimeout(() => {
        canvas = originalCanvas;
        width = originalWidth;
        height = originalHeight;
    }, (duration * 1000) + 1000); // Wait for recording duration + 1 second buffer
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

        gtag('event', 'file_download', {
            'event_category': 'engagement',
            'event_label': 'gridform_txt',
            'value': 1
        });

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

// Color helper functions
function updatePalettePreview() {
    const preview = document.getElementById('palettePreview');
    if (!preview) return;
    
    const palette = COLOR_PALETTES[settings.colors.currentPalette] || [];
    preview.innerHTML = '';
    
    palette.forEach((color, index) => {
        const colorBox = document.createElement('div');
        colorBox.style.width = '20px';
        colorBox.style.height = '20px';
        colorBox.style.backgroundColor = color;
        colorBox.style.border = '1px solid #333';
        colorBox.style.borderRadius = '3px';
        colorBox.style.cursor = 'pointer';
        colorBox.title = color;
        
        colorBox.addEventListener('click', () => {
            settings.colors.paletteIndex = index;
            if (settings.colors.usePalette) {
                updateColorsFromPalette();
            }
        });
        
        preview.appendChild(colorBox);
    });
}



function updateBackgroundColor() {
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
        canvasContainer.style.backgroundColor = settings.colors.backgroundColor;
    }
    
    // Update button group background color
    updateButtonGroupBackground();
    
    // Force a redraw to update the canvas background
    if (canvas) {
        redraw();
    }
}

function updateButtonGroupBackground() {
    const buttonGroup = document.getElementById('button-group');
    if (!buttonGroup) return;

    // Remove any previously forced inline styles so CSS theme rules apply
    const buttons = buttonGroup.querySelectorAll('button');
    buttons.forEach(button => {
        button.style.backgroundColor = '';
    });
}



function updateColorsFromPalette() {
    if (!settings.colors.usePalette || !settings.colors.paletteColors.length) return;
    
    const palette = settings.colors.paletteColors;
    const mode = settings.colors.paletteColorMode || 'single';
    
    // Debug logging
    console.log('updateColorsFromPalette called:', {
        usePalette: settings.colors.usePalette,
        paletteColors: settings.colors.paletteColors,
        mode: mode,
        paletteIndex: settings.colors.paletteIndex
    });
    
    switch (mode) {
        case 'single':
            const selectedColor = palette[settings.colors.paletteIndex % palette.length];
            settings.colors.pattern1Color = selectedColor;
            settings.pattern1.color = selectedColor;
            if (settings.pattern2.enabled) {
                settings.colors.pattern2Color = selectedColor;
                settings.pattern2.color = selectedColor;
            }
            break;
        case 'cycle':
            const cycleIndex = Math.floor(settings.colors.animationTime * settings.colors.animationSpeed) % palette.length;
            settings.colors.pattern1Color = palette[cycleIndex];
            settings.pattern1.color = palette[cycleIndex];
            if (settings.pattern2.enabled) {
                const cycleIndex2 = (cycleIndex + Math.floor(palette.length / 2)) % palette.length;
                settings.colors.pattern2Color = palette[cycleIndex2];
                settings.pattern2.color = palette[cycleIndex2];
            }
            break;
        case 'random':
            // Update random color timer
            settings.colors.randomColorTimer += 0.016 * speedMultiplier;
            
            // Change colors every 2 seconds
            if (settings.colors.randomColorTimer >= 2.0) {
                const randomIndex = Math.floor(Math.random() * palette.length);
                settings.colors.pattern1Color = palette[randomIndex];
                settings.pattern1.color = palette[randomIndex];
                if (settings.pattern2.enabled) {
                    const randomIndex2 = Math.floor(Math.random() * palette.length);
                    settings.colors.pattern2Color = palette[randomIndex2];
                    settings.pattern2.color = palette[randomIndex2];
                }
                settings.colors.randomColorTimer = 0; // Reset timer
            }
            break;
    }
    
    // Update UI color inputs only if palette is active
    if (settings.colors.usePalette) {
        const pattern1ColorInput = document.getElementById('pattern1Color');
        const pattern2ColorInput = document.getElementById('pattern2Color');
        if (pattern1ColorInput) pattern1ColorInput.value = settings.colors.pattern1Color;
        if (pattern2ColorInput) pattern2ColorInput.value = settings.colors.pattern2Color;
    }
}

function updateColorsFromAnimation() {
    if (!settings.colors.animationEnabled) return;
    
    // Don't override colors if palette mode is enabled
    if (settings.colors.usePalette) return;
    
    // Update internal animation time
    settings.colors.animationTime += 0.016 * speedMultiplier;
    
    const baseColor = settings.colors.pattern1Color;
    const type = settings.colors.animationType;
    const speed = settings.colors.animationSpeed;
    
    let animatedColor = baseColor;
    
    switch (type) {
        case 'hue':
            animatedColor = shiftHue(baseColor, settings.colors.animationTime * speed * 3); // Accelerated hue shift
            break;
        case 'saturation':
            animatedColor = shiftSaturation(baseColor, settings.colors.animationTime * speed);
            break;
        case 'brightness':
            animatedColor = shiftBrightness(baseColor, settings.colors.animationTime * speed);
            break;
        case 'rainbow':
            animatedColor = rainbowColor(settings.colors.animationTime * speed);
            break;
    }
    
    settings.pattern1.color = animatedColor;
    if (settings.pattern2.enabled) {
        settings.pattern2.color = animatedColor;
    }
}

function shiftHue(color, amount) {
    // Convert hex to HSL, shift hue, convert back
    const hsl = hexToHsl(color);
    hsl.h = (hsl.h + amount * 360) % 360;
    return hslToHex(hsl);
}

function shiftSaturation(color, amount) {
    const hsl = hexToHsl(color);
    hsl.s = Math.max(0, Math.min(100, hsl.s + Math.sin(amount) * 50));
    return hslToHex(hsl);
}

function shiftBrightness(color, amount) {
    const hsl = hexToHsl(color);
    hsl.l = Math.max(0, Math.min(100, hsl.l + Math.sin(amount) * 30));
    return hslToHex(hsl);
}

function rainbowColor(amount) {
    const hue = (amount * 360) % 360;
    return hslToHex({ h: hue, s: 100, l: 50 });
}

function hexToHsl(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(hsl) {
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = hsl.l / 100;
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = (c) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function updateUIFromSettings() {
    // Update all UI controls to match current settings
    document.getElementById('pattern1Type').value = settings.pattern1.type;
    document.getElementById('pattern1Speed').value = settings.pattern1.speed;
    document.getElementById('pattern1SpeedValue').textContent = settings.pattern1.speed.toFixed(3);
    document.getElementById('pattern1Scale').value = settings.pattern1.scale;
    document.getElementById('pattern1ScaleValue').textContent = settings.pattern1.scale.toFixed(3);
    document.getElementById('pattern1Color').value = settings.colors.pattern1Color;
    document.getElementById('pattern1Glow').checked = settings.pattern1.glow;
    
    // Update pattern1 noise variant
    const pattern1NoiseVariant = document.getElementById('pattern1NoiseVariant');
    if (pattern1NoiseVariant) {
        pattern1NoiseVariant.value = settings.pattern1.noiseVariant || 'simplex';
    }

    // Update primary character set dropdown
    const charSets = ['blocks', 'ascii', 'hex', 'numbers', 'letters', 'symbols', 'braille'];
    const currentCharSet1 = charSets.find(set => ASCII_RAMPS[set] === currentRamp1) || 'blocks';
    document.getElementById('pattern1CharSet').value = currentCharSet1;

    // Update secondary pattern UI
    const pattern2Toggle = document.getElementById('pattern2Toggle');
    const pattern2Settings = document.getElementById('pattern2Settings');

    if (settings.pattern2.enabled) {
        pattern2Toggle.classList.add('active');
        pattern2Toggle.querySelector('.toggle-switch-label').textContent = 'Disable';
        pattern2Settings.style.display = 'block';

        document.getElementById('pattern2Type').value = settings.pattern2.type;
        document.getElementById('pattern2Speed').value = settings.pattern2.speed;
        document.getElementById('pattern2SpeedValue').textContent = settings.pattern2.speed.toFixed(3);
        document.getElementById('pattern2Scale').value = settings.pattern2.scale;
        document.getElementById('pattern2ScaleValue').textContent = settings.pattern2.scale.toFixed(3);
        document.getElementById('pattern2Color').value = settings.colors.pattern2Color;
        document.getElementById('pattern2Glow').checked = settings.pattern2.glow;
        
        // Update pattern2 noise variant
        const pattern2NoiseVariant = document.getElementById('pattern2NoiseVariant');
        if (pattern2NoiseVariant) {
            pattern2NoiseVariant.value = settings.pattern2.noiseVariant || 'simplex';
        }
        
        document.getElementById('blendModeSelect').value = settings.colors.blendMode;
        document.getElementById('blendAmount').value = settings.colors.blendAmount;
        document.getElementById('blendAmountValue').textContent = settings.colors.blendAmount.toFixed(1);

        // Update secondary character set dropdown
        const currentCharSet2 = charSets.find(set => ASCII_RAMPS[set] === currentRamp2) || 'blocks';
        document.getElementById('pattern2CharSet').value = currentCharSet2;
    } else {
        // Properly disable secondary pattern UI
        pattern2Toggle.classList.remove('active');
        pattern2Toggle.querySelector('.toggle-switch-label').textContent = 'Enable';
        pattern2Settings.style.display = 'none';
    }
    
    // Update interactive effects UI
    const interactiveToggle = document.getElementById('interactiveToggle');
    const interactiveSettings = document.getElementById('interactiveSettings');
    
    if (settings.interactive.enabled) {
        interactiveToggle.classList.add('active');
        interactiveToggle.querySelector('.toggle-switch-label').textContent = 'Disable';
        interactiveSettings.style.display = 'block';
        
        document.getElementById('interactiveType').value = settings.interactive.type;
        document.getElementById('interactiveStrength').value = settings.interactive.strength;
        document.getElementById('interactiveStrengthValue').textContent = settings.interactive.strength.toFixed(1);
        document.getElementById('interactiveRadius').value = settings.interactive.radius;
        document.getElementById('interactiveRadiusValue').textContent = settings.interactive.radius.toFixed(2);
        document.getElementById('interactiveClick').checked = settings.interactive.clickEnabled;
    } else {
        interactiveToggle.classList.remove('active');
        interactiveToggle.querySelector('.toggle-switch-label').textContent = 'Enable';
        interactiveSettings.style.display = 'none';
    }
    
    // Update Webcam UI
    document.getElementById('webcamIntensity').value = settings.webcam.intensity;
    document.getElementById('webcamIntensityValue').textContent = settings.webcam.intensity.toFixed(1);
    document.getElementById('webcamContrast').value = settings.webcam.contrast;
    document.getElementById('webcamContrastValue').textContent = settings.webcam.contrast.toFixed(1);
    
    // Update Colors UI
    document.getElementById('backgroundColor').value = settings.colors.backgroundColor;
    document.getElementById('colorAnimationEnabled').checked = settings.colors.animationEnabled;
    document.getElementById('colorAnimationType').value = settings.colors.animationType;
    document.getElementById('colorAnimationSpeed').value = settings.colors.animationSpeed;
    document.getElementById('colorAnimationSpeedValue').textContent = settings.colors.animationSpeed.toFixed(3);
    
    document.getElementById('useColorPalette').checked = settings.colors.usePalette;
    document.getElementById('colorPaletteSelect').value = settings.colors.currentPalette;
    document.getElementById('paletteColorMode').value = settings.colors.paletteColorMode || 'single';
    
    // Sync pattern color properties with color settings
    settings.pattern1.color = settings.colors.pattern1Color;
    if (settings.pattern2.enabled) {
        settings.pattern2.color = settings.colors.pattern2Color;
    }
    
    // Show/hide color animation settings
    const animationSettings = document.getElementById('colorAnimationSettings');
    if (animationSettings) {
        animationSettings.style.display = settings.colors.animationEnabled ? 'block' : 'none';
    }
    
    // Show/hide color palette settings
    const paletteSettings = document.getElementById('colorPaletteSettings');
    if (paletteSettings) {
        paletteSettings.style.display = settings.colors.usePalette ? 'block' : 'none';
    }
    
    // Show/hide pattern2 color section and blend mode section
    const pattern2ColorSection = document.getElementById('pattern2ColorSection');
    const blendModeSection = document.getElementById('blendModeSection');
    if (pattern2ColorSection) {
        pattern2ColorSection.style.display = settings.pattern2.enabled ? 'block' : 'none';
    }
    if (blendModeSection) {
        blendModeSection.style.display = settings.pattern2.enabled ? 'block' : 'none';
    }
    
    // Update palette preview
    updatePalettePreview();
    
    // Update background color
    updateBackgroundColor();
    
    // Update pattern code display
    updatePatternCodeDisplay();
}

/**
 * Sets up code generation and loading functionality
 * Handles copying pattern codes to clipboard and loading patterns from codes
 */
function setupCodeFunctionality() {
    // Set up copy code button
    const copyCodeBtn = document.getElementById('copy-code-btn');
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', copyPatternCode);
    }
    
    // Set up load code button
    const loadCodeBtn = document.getElementById('load-code-btn');
    if (loadCodeBtn) {
        loadCodeBtn.addEventListener('click', loadPatternFromCode);
    }
    
    // Set up code input field enter key
    const codeInput = document.getElementById('pattern-code-input');
    if (codeInput) {
        codeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadPatternFromCode();
            }
        });
    }
    
    // Initialize code display
    updatePatternCodeDisplay();
    
    console.log('Code functionality initialized successfully');
}

/**
 * Generates a unique code representing the current pattern configuration
 * @returns {string} Base64 encoded pattern configuration
 */
function generatePatternCode() {
    try {
        // Create a simplified settings object for the code
        const codeSettings = {
            grid: {
                cols: settings.gridCols,
                rows: settings.gridRows,
                charSize: settings.charSize,
                charSpacing: settings.charSpacing
            },
            pattern1: {
                type: settings.pattern1.type,
                speed: settings.pattern1.speed,
                scale: settings.pattern1.scale,
                color: settings.colors.pattern1Color,
                glow: settings.pattern1.glow,
                noiseVariant: settings.pattern1.noiseVariant,
                charSet: currentRamp1
            },
            pattern2: {
                enabled: settings.pattern2.enabled,
                type: settings.pattern2.type,
                speed: settings.pattern2.speed,
                scale: settings.pattern2.scale,
                color: settings.colors.pattern2Color,
                glow: settings.pattern2.glow,
                noiseVariant: settings.pattern2.noiseVariant,
                charSet: currentRamp2
            },
            interactive: {
                enabled: settings.interactive.enabled,
                type: settings.interactive.type,
                strength: settings.interactive.strength,
                radius: settings.interactive.radius,
                clickEnabled: settings.interactive.clickEnabled
            },
            colors: {
                backgroundColor: settings.colors.backgroundColor,
                blendMode: settings.colors.blendMode,
                blendAmount: settings.colors.blendAmount
            }
        };
        
        // Convert to JSON and encode to base64 (Unicode-safe)
        const jsonString = JSON.stringify(codeSettings);
        const code = btoa(unescape(encodeURIComponent(jsonString)));
        
        // Add a simple checksum for validation
        const checksum = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000;
        return `${code}.${checksum.toString().padStart(3, '0')}`;
    } catch (error) {
        console.error('Error generating pattern code:', error);
        return 'ERROR';
    }
}

/**
 * Updates the pattern code display in the top bar
 */
function updatePatternCodeDisplay() {
    const codeDisplay = document.getElementById('pattern-code');
    if (codeDisplay) {
        const code = generatePatternCode();
        codeDisplay.textContent = code;
        codeDisplay.title = `Pattern Code: ${code}`;
    }
}

/**
 * Copies the current pattern code to the clipboard
 */
async function copyPatternCode() {
    try {
        const code = generatePatternCode();
        await navigator.clipboard.writeText(code);
        
        // Show success feedback
        const copyBtn = document.getElementById('copy-code-btn');
        if (copyBtn) {
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.classList.remove('copied');
            }, 2000);
        }
        
        // Show toast notification
        showToast('Pattern code copied to clipboard!', 'success');
    } catch (error) {
        console.error('Failed to copy pattern code:', error);
        showToast('Failed to copy pattern code', 'error');
    }
}

/**
 * Loads a pattern configuration from a code
 * @param {string} code - The pattern code to load
 */
function loadPatternFromCode(code = null) {
    try {
        // Get code from input if not provided
        if (!code) {
            const codeInput = document.getElementById('pattern-code-input');
            code = codeInput ? codeInput.value.trim() : '';
        }
        
        if (!code) {
            showToast('Please enter a pattern code', 'error');
            return;
        }
        
        // Parse the code
        const parts = code.split('.');
        if (parts.length !== 2) {
            showToast('Invalid pattern code format', 'error');
            return;
        }
        
        const encodedSettings = parts[0];
        const checksum = parseInt(parts[1]);
        
        // Validate checksum
        const calculatedChecksum = encodedSettings.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000;
        if (checksum !== calculatedChecksum) {
            showToast('Invalid pattern code (checksum mismatch)', 'error');
            return;
        }
        
        // Decode and parse settings (Unicode-safe)
        const jsonString = decodeURIComponent(escape(atob(encodedSettings)));
        const codeSettings = JSON.parse(jsonString);
        
        // Apply the settings
        applyPatternCode(codeSettings);
        
        // Clear input and show success
        const codeInput = document.getElementById('pattern-code-input');
        if (codeInput) {
            codeInput.value = '';
        }
        
        showToast('Pattern loaded successfully!', 'success');
        
    } catch (error) {
        console.error('Error loading pattern code:', error);
        showToast('Failed to load pattern code', 'error');
    }
}

/**
 * Applies pattern settings from a code to the current configuration
 * @param {object} codeSettings - The decoded pattern settings
 */
function applyPatternCode(codeSettings) {
    try {
        // Apply grid settings
        if (codeSettings.grid) {
            settings.gridCols = codeSettings.grid.cols || settings.gridCols;
            settings.gridRows = codeSettings.grid.rows || settings.gridRows;
            settings.charSize = codeSettings.grid.charSize || settings.charSize;
            settings.charSpacing = codeSettings.grid.charSpacing || settings.charSpacing;
            
            // Update grid dimensions
            gridCols = settings.gridCols;
            gridRows = settings.gridRows;
        }
        
        // Apply pattern1 settings
        if (codeSettings.pattern1) {
            settings.pattern1.type = codeSettings.pattern1.type || settings.pattern1.type;
            settings.pattern1.speed = codeSettings.pattern1.speed || settings.pattern1.speed;
            settings.pattern1.scale = codeSettings.pattern1.scale || settings.pattern1.scale;
            settings.colors.pattern1Color = codeSettings.pattern1.color || settings.colors.pattern1Color;
            settings.pattern1.color = settings.colors.pattern1Color; // Sync pattern color property
            settings.pattern1.glow = codeSettings.pattern1.glow !== undefined ? codeSettings.pattern1.glow : settings.pattern1.glow;
            settings.pattern1.noiseVariant = codeSettings.pattern1.noiseVariant || settings.pattern1.noiseVariant;
            
            // Debug logging
            console.log('Pattern1 color loaded:', {
                fromCode: codeSettings.pattern1.color,
                finalColor: settings.pattern1.color,
                pattern1Color: settings.colors.pattern1Color
            });
            
            // Update character set
            if (codeSettings.pattern1.charSet) {
                currentRamp1 = codeSettings.pattern1.charSet;
            }
        }
        
        // Apply pattern2 settings
        if (codeSettings.pattern2) {
            settings.pattern2.enabled = codeSettings.pattern2.enabled !== undefined ? codeSettings.pattern2.enabled : settings.pattern2.enabled;
            settings.pattern2.type = codeSettings.pattern2.type || settings.pattern2.type;
            settings.pattern2.speed = codeSettings.pattern2.speed || settings.pattern2.speed;
            settings.pattern2.scale = codeSettings.pattern2.scale || settings.pattern2.scale;
            settings.colors.pattern2Color = codeSettings.pattern2.color || settings.colors.pattern2Color;
            settings.pattern2.color = settings.colors.pattern2Color; // Sync pattern color property
            settings.pattern2.glow = codeSettings.pattern2.glow !== undefined ? codeSettings.pattern2.glow : settings.pattern2.glow;
            settings.pattern2.noiseVariant = codeSettings.pattern2.noiseVariant || settings.pattern2.noiseVariant;
            
            // Debug logging
            console.log('Pattern2 color loaded:', {
                fromCode: codeSettings.pattern2.color,
                finalColor: settings.pattern2.color,
                pattern2Color: settings.colors.pattern2Color
            });
            
            // Update character set
            if (codeSettings.pattern2.charSet) {
                currentRamp2 = codeSettings.pattern2.charSet;
            }
        }
        
        // Apply interactive settings
        if (codeSettings.interactive) {
            settings.interactive.enabled = codeSettings.interactive.enabled !== undefined ? codeSettings.interactive.enabled : settings.interactive.enabled;
            settings.interactive.type = codeSettings.interactive.type || settings.interactive.type;
            settings.interactive.strength = codeSettings.interactive.strength || settings.interactive.strength;
            settings.interactive.radius = codeSettings.interactive.radius || settings.interactive.radius;
            settings.interactive.clickEnabled = codeSettings.interactive.clickEnabled !== undefined ? codeSettings.interactive.clickEnabled : settings.interactive.clickEnabled;
        }
        
        // Apply color settings
        if (codeSettings.colors) {
            settings.colors.backgroundColor = codeSettings.colors.backgroundColor || settings.colors.backgroundColor;
            settings.colors.blendMode = codeSettings.colors.blendMode || settings.colors.blendMode;
            settings.blendSettings.amount = codeSettings.colors.blendAmount || settings.blendSettings.amount;
        }
        
        // Disable palette mode when loading a pattern code to preserve the specific colors
        if (settings.colors.usePalette) {
            settings.colors.usePalette = false;
            // Also disable color animation to prevent conflicts
            if (settings.colors.animationEnabled) {
                settings.colors.animationEnabled = false;
            }
        }
        
        // Update UI to reflect new settings
        updateUIFromSettings();
        
        // Update canvas size for new grid dimensions
        updateCanvasSize();
        
        // Update background color
        updateBackgroundColor();
        
        // Ensure colors are properly synced after loading pattern code
        updateColorsFromPalette();
        
        // Update pattern code display
        updatePatternCodeDisplay();
        
    } catch (error) {
        console.error('Error applying pattern code:', error);
        showToast('Error applying pattern settings', 'error');
    }
}

/**
 * Shows a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast ('success', 'error', 'info')
 */
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span>${message}</span>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Webcam Functionality
let webcamStream = null;
let webcamVideo = null;
let webcamCanvas = null;
let webcamContext = null;
let isWebcamActive = false;
let webcamMode = false; // Whether we're in webcam display mode
let webcamInterval = null;

// Create webcam elements
function createWebcamElements() {
    // Create video element for webcam stream
    webcamVideo = document.createElement('video');
    webcamVideo.style.display = 'none';
    webcamVideo.autoplay = true;
    webcamVideo.muted = true;
    webcamVideo.playsInline = true;
    document.body.appendChild(webcamVideo);
    
    // Create canvas for processing webcam frames
    webcamCanvas = document.createElement('canvas');
    webcamCanvas.style.display = 'none';
    webcamContext = webcamCanvas.getContext('2d');
    document.body.appendChild(webcamCanvas);
}

// ASCII gradient for webcam display
const webcamGradient = "_______.:!/r(l1Z4H9W8$@";
const preparedWebcamGradient = webcamGradient.replaceAll('_', '\u00A0');

// Get character by grayscale value
function getWebcamCharByScale(scale) {
    const val = Math.floor(scale / 255 * (webcamGradient.length - 1));
    return preparedWebcamGradient[val];
}

// Render webcam as ASCII art
function renderWebcamASCII() {
    if (!isWebcamActive || !webcamVideo || !webcamContext) return;
    
    try {
        // Use the same dimensions as the main canvas grid
        const width = gridCols;
        const height = gridRows;
        webcamCanvas.width = width;
        webcamCanvas.height = height;
        
        // Draw mirrored video frame to canvas
        webcamContext.save();
        webcamContext.translate(width, 0);
        webcamContext.scale(-1, 1);
        webcamContext.drawImage(webcamVideo, 0, 0, width, height);
        webcamContext.restore();
        
        // Get image data
        const imageData = webcamContext.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Convert to ASCII
        let asciiText = '';
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const avg = (r + g + b) / 3;
            
            asciiText += getWebcamCharByScale(avg);
            
            // Add line break at end of each row
            if ((i / 4 + 1) % width === 0) {
                asciiText += '\n';
            }
        }
        
        // Display ASCII art in the main canvas area
        displayWebcamASCII(asciiText);
        
    } catch (error) {
        console.error('Error rendering webcam ASCII:', error);
    }
}

// Display webcam ASCII art
function displayWebcamASCII(asciiText) {
    // Hide only the main p5 canvas element and show ASCII text
    const domCanvas = (canvas && canvas.canvas) ? canvas.canvas : document.querySelector('canvas');
    if (domCanvas) {
        domCanvas.style.display = 'none';
    }
    
    // Create or update ASCII display
    let asciiDisplay = document.getElementById('webcam-ascii-display');
    if (!asciiDisplay) {
        asciiDisplay = document.createElement('div');
        asciiDisplay.id = 'webcam-ascii-display';
        document.getElementById('canvas-container').appendChild(asciiDisplay);
    }
    
    // Always update styling to match current settings
    updateWebcamDisplayStyle(asciiDisplay);
    asciiDisplay.textContent = asciiText;
}

// Update webcam display styling to match current settings
function updateWebcamDisplayStyle(asciiDisplay) {
    asciiDisplay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'FeatureMono', 'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', 'Source Code Pro', Consolas, 'Courier New', monospace;
        font-size: ${settings.charSize}px;
        line-height: ${settings.charSize * settings.charSpacing}px;
        color: white;
        white-space: pre;
        z-index: 120; /* above canvas (base ~100), below UI (>=1000) */
        background: transparent; /* don't cover borders/backgrounds */
        pointer-events: none; /* allow clicks to pass through to UI */
        overflow: hidden;
    `;
}

// Start webcam
async function startWebcam() {
    try {
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia not supported');
        }
        
        if (!webcamVideo) {
            createWebcamElements();
        }
        
        // Use the simple approach from the working example
        webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        webcamVideo.srcObject = webcamStream;
        webcamVideo.play();
        
        // Wait for video to be ready
        await new Promise((resolve) => {
            webcamVideo.onloadedmetadata = resolve;
        });
        
        isWebcamActive = true;
        webcamMode = true;
        updateWebcamUI();
        
        // Start ASCII rendering loop
        startWebcamRendering();
        
        console.log('Webcam started successfully');
    } catch (error) {
        console.error('Error starting webcam:', error);
        isWebcamActive = false;
        webcamMode = false;
        updateWebcamUI();
        
        // Show user-friendly error message
        if (error.name === 'NotAllowedError') {
            alert('Camera access denied. Please allow camera access and try again.');
        } else if (error.name === 'NotFoundError') {
            alert('No camera found. Please connect a camera and try again.');
        } else {
            alert('Unable to access webcam. Please check your camera and try again.');
        }
    }
}

// Start webcam rendering loop
function startWebcamRendering() {
    if (webcamInterval) {
        clearInterval(webcamInterval);
    }
    
    webcamInterval = setInterval(() => {
        if (isWebcamActive && webcamMode) {
            requestAnimationFrame(() => {
                renderWebcamASCII();
            });
        }
    }, 100); // 10 FPS for smooth but not too intensive
}

// Stop webcam
function stopWebcam() {
    // Stop rendering loop
    if (webcamInterval) {
        clearInterval(webcamInterval);
        webcamInterval = null;
    }
    
    // Stop webcam stream
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }
    
    if (webcamVideo) {
        webcamVideo.srcObject = null;
    }
    
    // Hide ASCII display and show only the p5 canvas element
    const asciiDisplay = document.getElementById('webcam-ascii-display');
    if (asciiDisplay) {
        asciiDisplay.remove();
    }
    
    const domCanvas = (canvas && canvas.canvas) ? canvas.canvas : document.querySelector('canvas');
    if (domCanvas) {
        domCanvas.style.display = 'block';
    }
    
    isWebcamActive = false;
    webcamMode = false;
    updateWebcamUI();
    
    console.log('Webcam stopped');
}

// Toggle webcam on/off
function toggleWebcam() {
    if (isWebcamActive) {
        stopWebcam();
    } else {
        startWebcam();
    }
}

// Update webcam UI
function updateWebcamUI() {
    const webcamBtn = document.getElementById('webcam-btn');
    const webcamIconOff = document.getElementById('webcam-icon-off');
    const webcamIconOn = document.getElementById('webcam-icon-on');
    
    if (webcamBtn) {
        if (isWebcamActive) {
            webcamBtn.classList.add('recording');
            webcamIconOff.style.display = 'none';
            webcamIconOn.style.display = 'block';
            webcamBtn.title = 'Stop Webcam';
        } else {
            webcamBtn.classList.remove('recording');
            webcamIconOff.style.display = 'block';
            webcamIconOn.style.display = 'none';
            webcamBtn.title = 'Start Webcam';
        }
    }
}

// Get webcam frame data for pattern generation
function getWebcamFrameData() {
    if (!isWebcamActive || !webcamVideo || !webcamContext) {
        return null;
    }
    
    try {
        // Draw current video frame to canvas
        webcamContext.drawImage(webcamVideo, 0, 0, webcamCanvas.width, webcamCanvas.height);
        
        // Get image data
        const imageData = webcamContext.getImageData(0, 0, webcamCanvas.width, webcamCanvas.height);
        return imageData;
    } catch (error) {
        console.error('Error getting webcam frame:', error);
        return null;
    }
}



// Initialize webcam functionality when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Webcam button event listener
    const webcamBtn = document.getElementById('webcam-btn');
    if (webcamBtn) {
        webcamBtn.addEventListener('click', toggleWebcam);
    }
    
    // Clean up webcam on page unload
    window.addEventListener('beforeunload', () => {
        if (isWebcamActive) {
            stopWebcam();
        }
    });
});

// What's New modal logic
(function() {
    const modal = document.getElementById('whatsnew-modal');
    const closeBtn = document.getElementById('whatsnew-close');

    function showWhatsNew() {
        if (!modal) return;
        modal.classList.add('show');
    }

    function hideWhatsNew() {
        if (!modal) return;
        modal.classList.remove('show');
        // Show ephemeral tooltip from the version label using shared tooltip behavior
        const versionEl = document.getElementById('version-label');
        const tooltip = document.getElementById('version-tooltip');
        if (versionEl && tooltip) {
            // Position tooltip below the version label (similar to other tooltips positioning)
            const rect = versionEl.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
            const top = rect.bottom + 10; // below element
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';

            tooltip.classList.add('show');
            tooltip.setAttribute('aria-hidden', 'false');

            // Auto-hide after 3 seconds
            window.setTimeout(() => {
                tooltip.classList.remove('show');
                tooltip.setAttribute('aria-hidden', 'true');
            }, 3000);
        }
    }

    if (modal) {
        // Determine current version label text (e.g., "[v2]")
        const versionEl = document.getElementById('version-label');
        const versionText = (versionEl && versionEl.textContent) ? versionEl.textContent.trim() : '[v]';
        const storageKey = `whatsnew_shown_${versionText}`;

        // Show only once per version
        try {
            const hasShown = window.localStorage.getItem(storageKey) === '1';
            if (!hasShown) {
                window.requestAnimationFrame(() => {
                    showWhatsNew();
                    // Mark as shown after opening
                    window.localStorage.setItem(storageKey, '1');
                });
            }
        } catch (e) {
            // Fallback if localStorage is unavailable
            window.requestAnimationFrame(() => showWhatsNew());
        }

        // Allow opening the modal by clicking the version label
        if (versionEl) {
            versionEl.addEventListener('click', (e) => {
                e.preventDefault();
                showWhatsNew();
            });

            // Tooltip on hover for version label
            const tooltip = document.getElementById('version-tooltip');
            if (tooltip) {
                function positionVersionTooltip() {
                    const rect = versionEl.getBoundingClientRect();
                    const tooltipRect = tooltip.getBoundingClientRect();
                    const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    const top = rect.bottom + 10;
                    tooltip.style.left = left + 'px';
                    tooltip.style.top = top + 'px';
                }

                versionEl.addEventListener('mouseenter', () => {
                    positionVersionTooltip();
                    tooltip.classList.add('show');
                    tooltip.setAttribute('aria-hidden', 'false');
                });
                versionEl.addEventListener('mouseleave', () => {
                    tooltip.classList.remove('show');
                    tooltip.setAttribute('aria-hidden', 'true');
                });
                // Keep tooltip aligned on window resize while hovered
                window.addEventListener('resize', () => {
                    if (tooltip.classList.contains('show')) positionVersionTooltip();
                });
            }
        }

        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', hideWhatsNew);
        }

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideWhatsNew();
        });

        // Esc to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) hideWhatsNew();
        });
    }
})();