// build.js - 用 esbuild 构建 dist/worker.js
var esbuild = require("esbuild");
esbuild.buildSync({
  entryPoints: ["src/worker.js"],
  outfile: "dist/worker.js",
  bundle: false,
  minify: true,
  target: "es2020",
  format: "esm"
});
console.log("Build OK:", require("fs").statSync("dist/worker.js").size, "bytes");
