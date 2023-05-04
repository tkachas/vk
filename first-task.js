const fs = require("fs");
const util = require("util");
const stylelint = require("stylelint");

const stylelintIgnoreContent = fs.readFileSync(".stylelintignore", "utf-8");

const ignoredPaths = stylelintIgnoreContent
  .split("\n")
  .filter(
    (path) => path.trim() !== "" && path[0] !== "#" && !path.includes("/*")
  );

// Фильтр комментариев, указывающих на отключение линтинга
const disabledLintPaths = ignoredPaths.filter((path) => {
  const fileContent = fs.readFileSync(path, "utf-8");
  const commentRegExp = /\/\*[\s\S]*?\*\//g;
  const disabledRegExp = /stylelint-disable[\s\S]*?(?:\n|$)/g;
  const comments = fileContent.match(commentRegExp) || [];

  for (let comment of comments) {
    if (disabledRegExp.test(comment)) {
      return true;
    }
  }
  return false;
});

// Stylelint на оставшихся файлах
(async () => {
  const filesWithoutErrors = [];
  const results = await stylelint.lint({
    files: ignoredPaths.filter((path) => !disabledLintPaths.includes(path)),
  });

  for (let result of results.results) {
    if (result.errored) {
      continue;
    }
    filesWithoutErrors.push(result.source);
  }

  // Новый .stylelintignore файл
  const newIgnoreContent = filesWithoutErrors.join("\n");
  fs.writeFileSync(".stylelintignore", newIgnoreContent, "utf-8");
})();
