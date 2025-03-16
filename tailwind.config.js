// tailwind.config.js
module.exports = {
    content: [
      "./src/**/*.{html,js,jsx,ts,tsx}",
      "./node_modules/flowbite/**/*.js" // Add this line
    ],
    theme: {
      extend: {},
    },
    plugins: [
      require('flowbite/plugin') // Add this line
    ],
  };
  