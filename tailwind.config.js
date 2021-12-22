// const colors = require("tailwindcss/colors");
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  darkMode: "class",
  content: ["./src/templates/**/*.{css,hbs,txt}", "./src/content/*.md"],
  plugins: [require("@tailwindcss/typography")],
};
