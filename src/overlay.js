
const backCanvas = document.getElementById('backCanvas');
const canvas = document.getElementById('canvas');
const backCtx = backCanvas.getContext('2d');
const ctx = canvas.getContext('2d');
let startX, startY, isDrawing = false;

// Add to the top of your overlay.js after canvas definition
const infoDisplay = document.createElement('div');
infoDisplay.style.position = 'absolute';
infoDisplay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
//infoDisplay.style.backgroundColor = 'transparent'; // or any other color you prefer
infoDisplay.style.padding = '4px';
infoDisplay.style.borderRadius = '2px';
infoDisplay.style.fontSize = '14px';
//infoDisplay.style.color = "burlywood";
infoDisplay.style.pointerEvents = 'none'; // So it doesn't interfere with mouse events
infoDisplay.style.display = 'none';
document.body.appendChild(infoDisplay);

const blackRGB = 'rgba(0, 0, 0, 1)';
const maskRGB = 'rgba(0, 0, 0, 0.65)';

document.body.addEventListener('click', () => {
    //window.mainChannel.send("close-overlay");
});

// Try with a stronger approach
document.addEventListener('keydown', handleKeyDown, true);
function handleKeyDown(event) {
    if (event.key === 'Escape' || event.keyCode === 27) {
        //window.debug.log('Escape key pressed in popup!');
        event.preventDefault(); // Prevent default escape behavior
        // Force the browser to recognize no buttons are pressed
        isDrawing = false;
        window.dispatchEvent(new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window
        }));
        window.api.closeOverlay(null); // Close window
    }
};

function resizeCanvas() {
    backCanvas.width = window.innerWidth;
    backCanvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log(`Resized canvas to ${backCanvas.width}x${backCanvas.height}`);

    /**
     * Here is a special trick
     * Must initially set backCanvas totally black
     * the totally black would make clearRect contrast strong
     * then set backCanvas width to 0 to make it redraw, aka disappear before drawing 
     */
    backCtx.fillStyle = blackRGB;
    backCtx.fillRect(0, 0, backCanvas.width, backCanvas.height);
    /**
     * This is the simplest and most reliable method. 
     * Setting a canvas's width or height property to itself triggers a complete reset of the canvas. 
     * This clears all pixels and also resets all canvas context properties (like fill styles, line widths, etc.) to their defaults.
     */
    backCanvas.width = backCanvas.width + 0;

    /**
     * Draw the initial overlay
     * Must call with interval to make sure it's drawn before drawing the selection
     * If direct call drawOverlay, the strong contrast will be no effect!
     */
    //setTimeout(drawOverlay, 100);
    drawOverlay();
}

function drawOverlay() {
    // Fill the entire canvas with semi-transparent overlay
    backCtx.fillStyle = maskRGB;
    backCtx.fillRect(0, 0, backCanvas.width, backCanvas.height);
}

window.api.clearupOverlay(() => {
    // Switch to back canvas
    backCanvas.style.display = 'block';
    canvas.style.display = 'none';
    infoDisplay.style.display = 'none';
    // refill the canvas
    resizeCanvas();
});

// Handle window resize
window.addEventListener('resize', resizeCanvas);

/**
 * When backCanvas is clicked, switch to front canvas and draw the selection on it.
 * Hide backCanvas, it sole purpose is to contrast the overlay strongly.
 */
backCanvas.addEventListener('mousedown', function (e) {
    isDrawing = true;
    startX = e.clientX;
    startY = e.clientY;

    // Switch to front canvas
    backCanvas.style.display = 'none';
    canvas.style.display = 'block';

    // Show initial dimensions (0×0)
    infoDisplay.style.display = 'block';
    infoDisplay.style.left = (e.clientX + 10) + 'px';
    infoDisplay.style.top = (e.clientY + 10) + 'px';
    infoDisplay.textContent = `(x:${startX} y:${startY})`;
});

canvas.addEventListener('mousedown', function (e) {
    // Switch to front canvas
    backCanvas.style.display = 'none';
    canvas.style.display = 'block';
});

canvas.addEventListener('mousemove', function (e) {
    if (isDrawing) {
        // Redraw the entire canvas with overlay
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = maskRGB;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const width = e.clientX - startX;
        const height = e.clientY - startY;

        ctx.clearRect(startX, startY, width, height);

        // Optionally draw selection border on foreground canvas
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.strokeRect(startX, startY, width, height);

        // Update and show dimensions info
        infoDisplay.style.display = 'block';
        infoDisplay.style.left = (e.clientX + 10) + 'px';
        infoDisplay.style.top = (e.clientY + 10) + 'px';
        infoDisplay.textContent = `(x:${e.clientX} y:${e.clientY} w:${Math.abs(width)} h:${Math.abs(height)})`;
    }
});

/**
 * We don't need to use this trick anymore since we're using clearRect to clear the selection area.
 */
/*
function updateSelectionDisplay(currentX, currentY) {
    // This completely resets the canvas
    // Setting a canvas's width or height property to itself triggers a complete reset of the canvas. 
    canvas.width = canvas.width + 0;
    
    const width = currentX - startX;
    const height = currentY - startY;
    
    // Calculate rectangle coordinates accounting for negative dimensions
    let x = startX;
    let y = startY;
    let w = width;
    let h = height;
    
    if (width < 0) {
        x = currentX;
        w = Math.abs(width);
    }
    if (height < 0) {
        y = currentY;
        h = Math.abs(height);
    }
    
    // Draw 0.5 opacity in the four regions surrounding the selection rectangle:
    ctx.fillStyle = maskRGB;
    
    // Top region
    ctx.fillRect(0, 0, canvas.width, y);
    
    // Bottom region
    ctx.fillRect(0, y + h, canvas.width, canvas.height - (y + h));
    
    // Left region
    ctx.fillRect(0, y, x, h);
    
    // Right region
    ctx.fillRect(x + w, y, canvas.width - (x + w), h);

    ctx.clearRect(startX, startY, width, height);
    
    // Optionally, add a border around the selection
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
}

canvas.addEventListener('mousemove', function(e) {
    if (isDrawing) {
        updateSelectionDisplay(e.clientX, e.clientY);
        
        // Update info display
        infoDisplay.style.left = (e.clientX + 10) + 'px';
        infoDisplay.style.top = (e.clientY + 10) + 'px';
        infoDisplay.textContent = `(x:${e.clientX} y:${e.clientY} w:${Math.abs(e.clientX - startX)} h:${Math.abs(e.clientY - startY)})`;
    }
});
*/

canvas.addEventListener('mouseup', function (e) {
    console.log('Mouse up fired, isDrawing =', isDrawing);
    if (!isDrawing) return;
    isDrawing = false;

    // Hide dimensions info
    infoDisplay.style.display = 'none';

    // Calculate final rectangle dimensions
    let x = startX;
    let y = startY;
    let width = e.clientX - startX;
    let height = e.clientY - startY;

    // Handle negative dimensions (drawing backwards)
    if (width < 0) {
        x = e.clientX;
        width = Math.abs(width);
    }
    if (height < 0) {
        y = e.clientY;
        height = Math.abs(height);
    }

    let rectData = null;
    // Check if rectangle is empty
    if (width <= 1 || height <= 1) {

    } else {
        // Get rectangle data
        rectData = { x, y, width, height };
    }

    // Clear the canvas completely
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // You can return the data to another function here
    //handleRectangleSelection(rectData);
    window.api.closeOverlay(rectData);
});

function handleRectangleSelection(rectData) {
    // Process the rectangle data here
    alert(`Selected area: x=${rectData.x}, y=${rectData.y}, width=${rectData.width}, height=${rectData.height}`);
}