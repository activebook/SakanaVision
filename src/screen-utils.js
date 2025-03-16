const { desktopCapturer, nativeImage, screen } = require('electron');
const screenshot = require('screenshot-desktop')
const fs = require('fs');
const path = require('path');

async function captureScreenRegionNative(x, y, width, height, outputPath) {
    try {
        /*
        console.log(`Attempting to capture: { x: ${x}, y: ${y}, width: ${width}, height: ${height} }`);
        
        // Get display that contains this point
        const displays = screen.getAllDisplays();
        console.log(`Found ${displays.length} displays`);
        
        // Log display information for debugging
        displays.forEach((display, i) => {
            console.log(`Display ${i}:`, display.bounds, 'scaleFactor:', display.scaleFactor);
        });
        */

        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: workAreaWidth, height: workAreaHeight } = primaryDisplay.workArea;
        const { width: screenWidth, height: screenHeight } = primaryDisplay.bounds;
        /*
        console.log(`Primary display: ${primaryDisplay.bounds.x}, ${primaryDisplay.bounds.y}, ${primaryDisplay.bounds.width}, ${primaryDisplay.bounds.height}`);
        console.log(`workArea display: ${primaryDisplay.workArea.x}, ${primaryDisplay.workArea.y}, ${primaryDisplay.workArea.width}, ${primaryDisplay.workArea.height}`);
        */

        // Get all screen sources
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: {
                width: screenWidth,  // More reasonable size, still large enough for most screens
                height: screenHeight
            }
        });
        /*
        console.log(`Found ${sources.length} screen sources`);

        // For debugging, save the full screenshot first
        const fullOutputPath = path.join(path.dirname(outputPath), 'full-' + path.basename(outputPath));
        fs.writeFileSync(fullOutputPath, Buffer.from(sources[0].thumbnail.toPNG()));
        console.log(`Saved full screenshot to ${fullOutputPath}`);
        
        // Try with the first source (primary display)
        const image = nativeImage.createFromDataURL(sources[0].thumbnail.toDataURL());
        console.log(`Full image size: ${image.getSize().width}x${image.getSize().height}`);
        */

        // Get the primary display source
        const primarySource = sources[0];

        // Shift x, y to account for the workArea offset
        // Because overlay.html can only work with the workArea
        x = x + primaryDisplay.workArea.x;
        y = y + primaryDisplay.workArea.y;

        // Convert the thumbnail to a native image
        const image = nativeImage.createFromDataURL(primarySource.thumbnail.toDataURL());

        // Try to crop
        const croppedImage = image.crop({ x, y, width, height });
        /*
        const croppedSize = croppedImage.getSize();
        console.log(`Cropped image size: ${croppedSize.width}x${croppedSize.height}`);
        */
        fs.writeFileSync(outputPath, croppedImage.toPNG());
        //console.log(`Screenshot saved to ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error('Screenshot capture failed:', error);
        throw error;
    }
}

function getScreenSize() {
    return screen.getPrimaryDisplay().bounds;
}

function getWorkAreaSize() {
    return screen.getPrimaryDisplay().workArea;
}

async function captureScreenRegion(x, y, width, height, outputPath, shifting = false) {
    return await screenshot({ format: 'png' }).then((img) => {
        /*
        const fullOutputPath = path.join(path.dirname(outputPath), 'full-' + path.basename(outputPath));
        fs.writeFileSync(fullOutputPath, img);
        console.log(`Saved full screenshot to ${fullOutputPath}`);
        if (img) {
            console.log('Screenshot captured successfully');
        } else {
            console.error('Failed to capture screenshot');
        }
        */

        // Shift x, y to account for the workArea offset
        // Because overlay.html can only work with the workArea
        if (shifting) {
            x = x + getWorkAreaSize().x;
            y = y + getWorkAreaSize().y;
        }

        // img: Buffer filled with png goodness
        const image = nativeImage.createFromBuffer(img)
        const croppedImage = image.crop({ x, y, width, height })
        fs.writeFileSync(outputPath, croppedImage.toPNG());
        return outputPath;
    }).catch((error) => {
        console.error('Screenshot capture failed:', error);
        throw error;
    })
}

function slideInWindow(win, direction = 'right') {
    const displayWorkArea = screen.getPrimaryDisplay().workAreaSize;
    const windowWidth = win.getSize()[0];

    // Calculate start and target positions
    let startX, targetX;
    if (direction === 'right') {
        startX = displayWorkArea.width; // Start off-screen to the right
        targetX = displayWorkArea.width - windowWidth; // End at right edge
    } else if (direction === 'left') { // 'left'
        startX = -windowWidth; // Start off-screen to the left
        targetX = 0; // End at left edge
    } else { // 'center'
        return;
    }

    // Set initial position
    win.setPosition(startX, win.getPosition()[1]);

    // Animation parameters
    const animationDuration = 500; // ms
    const fps = 60;
    const frameTime = 1000 / fps;
    const startTime = Date.now();

    // Animation function
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);

        // Easing function for smoother animation
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        // Calculate current position
        const currentX = startX + (targetX - startX) * easedProgress;

        // Set the new position
        win.setPosition(Math.floor(currentX), win.getPosition()[1]);

        // Continue animation if not complete
        if (progress < 1) {
            setTimeout(animate, frameTime);
        }
    };

    // Start animation
    animate();
}

module.exports = {
    captureScreenRegion,
    getScreenSize,
    getWorkAreaSize,
    slideInWindow
};