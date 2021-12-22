const fs = require("fs-extra");

/**
 * Clear the output directory
 */
fs.emptyDirSync("docs/");

/**
 * Build CSS with PostCSS
 */
const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano");
const postcss = require("postcss");
const tailwindcss = require("tailwindcss");

const css = fs.readFileSync("src/styles/main.css");

const processed = postcss([
  autoprefixer,
  tailwindcss("./tailwind.config.js"),
  cssnano,
]).process(css, {
  from: "src/styles/main.css",
  to: "docs/styles/main.css",
});

processed.then((transformedCss) => {
  fs.outputFile("docs/styles/main.css", transformedCss.css);
  if (transformedCss.map) {
    fs.outputFile("docs/styles/main.css.map", transformedCss.map.toString());
  }
});

/**
 * Copy over static browser assets, docs, images and scripts
 */
fs.copySync("src/browser", "docs/");
fs.copySync("src/images", "docs/images");

/**
 * Read in website structure and metadata
 */
const site = JSON.parse(fs.readFileSync("./site.json", "utf-8"));

/**
 * Prepare Handlebars templates, partials and helpers
 */
const Handlebars = require("handlebars");
const helpers = require("template-helpers")();
const marked = require("marked");

const pages = {
  "error-page": "src/templates/pages/error-page.hbs",
  home: "src/templates/pages/home.hbs",
  post: "src/templates/pages/post.hbs",
};
const partials = {
  header: "src/templates/partials/includes/header.hbs",
  footer: "src/templates/partials/includes/footer.hbs",
  base: "src/templates/partials/layouts/base.hbs",
};

Object.entries(partials).forEach(([name, path]) => {
  const partial = fs.readFileSync(path, "utf-8");
  Handlebars.registerPartial(name, partial);
});

// Register template-helpers library helpers
Object.entries(helpers).forEach(function (helper) {
  const name = helper[0];
  const fn = helper[1];
  if (name === "each") return;
  if (typeof fn !== "function") return;
  Handlebars.registerHelper(name, fn);
});

// Register Markdown helper
const renderer = {
  heading(text, level) {
    // Start headers at level 2 and add id for anchor linking
    return `
    <h${level + 1} id="${helpers.slugify(text)}">
      ${text}
    </h${level + 1}>`;
  },
};
marked.use({ renderer });

Handlebars.registerHelper("md", function (path) {
  const markdown = fs.readFileSync(path, "utf-8");
  return marked(markdown);
});

// Register Logging helper
Handlebars.registerHelper("log", function (data) {
  console.log(data);
});

// Register reading time helper
Handlebars.registerHelper("readingTime", function (path) {
  const markdown = fs.readFileSync(path, "utf-8");
  const words = markdown.split(" ").length;
  const minutes = Math.round(words / 200);
  return `${minutes} min read`;
});

// Register findPageByRoute helper
Handlebars.registerHelper("findPageByRoute", function (route, options) {
  const page = site.find((page) => {
    return page.route.includes(route);
  });
  return options.fn(page);
});

/**
 * Render each page and output to /docs
 */
site.forEach((page) => {
  const template = fs.readFileSync(pages[page.template], "utf-8");
  const compiledTemplate = Handlebars.compile(template);
  page.route.forEach((route) => {
    if (route === "/") {
      route = "/index";
    }
    fs.outputFile("docs" + route + ".html", compiledTemplate({ page, site }));
  });
});
