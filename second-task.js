const fs = require("fs");
const util = require("util");
const stylelint = require("stylelint");

async function processFile(file) {
  const content = fs.readFileSync(file, "utf-8");
  const result = await stylelint.lint({
    code: content,
    codeFilename: file,
  });

  const errorsByLine = {};
  for (let message of result.results[0].warnings) {
    const line = message.line;
    errorsByLine[line] = errorsByLine[line] || [];
    errorsByLine[line].push(message);
  }

  const lines = content.split("\n");
  for (let [lineNumber, errors] of Object.entries(errorsByLine)) {
    let shouldIgnore = true;
    let errorCodes = [];
    for (let error of errors) {
      if (error.severity === "error") {
        shouldIgnore = false;
        break;
      }
      errorCodes.push(error.rule);
    }
    if (shouldIgnore) {
      lines[
        lineNumber - 1
      ] += ` /* stylelint-disable-next-line ${errorCodes.join(" ")} */`;
    }
  }

  fs.writeFileSync(file, lines.join("\n"), "utf-8");
}

(async () => {
  const stylelintIgnoreContent = fs.readFileSync(".stylelintignore", "utf-8");
  const ignoredPaths = stylelintIgnoreContent
    .split("\n")
    .filter(
      (path) => path.trim() !== "" && path[0] !== "#" && !path.includes("/*")
    );

  for (let path of ignoredPaths) {
    const fileContent = fs.readFileSync(path, "utf-8");
    const commentRegExp = /\/\*[\s\S]*?\*\//g;
    const disabledRegExp = /stylelint-disable[\s\S]*?(?:\n|$)/g;
    const comments = fileContent.match(commentRegExp) || [];

    let shouldProcess = true;
    for (let comment of comments) {
      if (disabledRegExp.test(comment)) {
        shouldProcess = false;
        break;
      }
    }

    if (shouldProcess) {
      await processFile(path);
    }
  }

  const newIgnoreContent = ignoredPaths
    .filter((path) => {
      const fileContent = fs.readFileSync(path, "utf-8");
      const result = stylelint.lint({
        code: fileContent,
        codeFilename: path,
      }).results[0];

      return result.warnings.some((message) => message.severity === "error");
    })
    .join("\n");

  fs.writeFileSync(".stylelintignore", newIgnoreContent, "utf-8");
})();
