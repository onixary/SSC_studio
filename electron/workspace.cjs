const fs = require("node:fs/promises");
const path = require("node:path");

const SSC_NAMESPACE = "shape-shifter-curse";

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function projectPaths(rootPath) {
  const resources = path.join(rootPath, "src", "main", "resources");
  const dataRoot = path.join(resources, "data", SSC_NAMESPACE);
  return {
    resources,
    fabricMod: path.join(resources, "fabric.mod.json"),
    buildGradle: path.join(rootPath, "build.gradle"),
    gradleProperties: path.join(rootPath, "gradle.properties"),
    originsDir: path.join(dataRoot, "origins"),
    powersDir: path.join(dataRoot, "powers")
  };
}

async function validateProject(rootPath) {
  if (!rootPath || typeof rootPath !== "string") {
    return { ok: false, reason: "未选择目录" };
  }

  const paths = projectPaths(rootPath);
  const checks = await Promise.all([
    exists(paths.buildGradle),
    exists(paths.gradleProperties),
    exists(paths.fabricMod),
    exists(paths.originsDir),
    exists(paths.powersDir)
  ]);

  const missing = [];
  if (!checks[0]) missing.push("build.gradle");
  if (!checks[1]) missing.push("gradle.properties");
  if (!checks[2]) missing.push("src/main/resources/fabric.mod.json");
  if (!checks[3]) missing.push("src/main/resources/data/shape-shifter-curse/origins");
  if (!checks[4]) missing.push("src/main/resources/data/shape-shifter-curse/powers");

  return {
    ok: missing.length === 0,
    rootPath,
    reason: missing.length === 0 ? "已检测到 SSC 项目文件" : `缺少：${missing.join("、")}`
  };
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

function powerIdFromName(name) {
  return `${SSC_NAMESPACE}:${name}`;
}

function powerNameFromId(powerId) {
  const parts = String(powerId).split(":");
  return parts.length === 2 ? parts[1] : parts[0];
}

async function listJsonFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function getProjectData(rootPath) {
  const validation = await validateProject(rootPath);
  if (!validation.ok) {
    return { validation, forms: [], powers: [] };
  }

  const paths = projectPaths(rootPath);
  const originFiles = await listJsonFiles(paths.originsDir);
  const powerFiles = await listJsonFiles(paths.powersDir);

  const powerMap = new Map();
  for (const fileName of powerFiles) {
    const name = fileName.replace(/\.json$/i, "");
    const fullPath = path.join(paths.powersDir, fileName);
    let type = "unknown";
    try {
      const data = await readJson(fullPath);
      type = typeof data.type === "string" ? data.type : "unknown";
    } catch {
      type = "parse_error";
    }
    powerMap.set(name, {
      id: powerIdFromName(name),
      name,
      type,
      filePath: fullPath
    });
  }

  const forms = [];
  for (const fileName of originFiles) {
    const formId = fileName.replace(/\.json$/i, "");
    const fullPath = path.join(paths.originsDir, fileName);
    let powers = [];
    try {
      const data = await readJson(fullPath);
      powers = Array.isArray(data.powers) ? data.powers.filter((item) => typeof item === "string") : [];
    } catch {
      powers = [];
    }

    forms.push({
      id: formId,
      name: formId,
      filePath: fullPath,
      powers
    });
  }

  return {
    validation,
    forms,
    powers: Array.from(powerMap.values())
  };
}

function validatePowerName(name) {
  if (typeof name !== "string" || name.trim() !== name || name.length === 0) {
    return "Power 名称不能为空，且不能包含首尾空格";
  }

  if (!/^[a-z0-9_]+$/.test(name)) {
    return "Power 名称只能包含小写字母、数字和下划线";
  }

  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    return "Power 名称不能包含路径片段";
  }

  return "";
}

async function createPower({ rootPath, formId, powerName }) {
  const validation = await validateProject(rootPath);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason };
  }

  const nameError = validatePowerName(powerName);
  if (nameError) {
    return { ok: false, reason: nameError };
  }

  const paths = projectPaths(rootPath);
  const targetPath = path.join(paths.powersDir, `${powerName}.json`);
  if (await exists(targetPath)) {
    return { ok: false, reason: "Power 名称重复或违规，请重新输入" };
  }

  const content = {
    type: "origins:simple"
  };
  await fs.writeFile(targetPath, `${JSON.stringify(content, null, 2)}\n`, "utf-8");

  if (formId) {
    const originPath = path.join(paths.originsDir, `${formId}.json`);
    if (await exists(originPath)) {
      const origin = await readJson(originPath);
      const powerId = powerIdFromName(powerName);
      const powers = Array.isArray(origin.powers) ? origin.powers : [];
      if (!powers.includes(powerId)) {
        origin.powers = [...powers, powerId];
        await fs.writeFile(originPath, `${JSON.stringify(origin, null, 2)}\n`, "utf-8");
      }
    }
  }

  return {
    ok: true,
    power: {
      id: powerIdFromName(powerName),
      name: powerName,
      type: "origins:simple",
      filePath: targetPath
    }
  };
}

async function readPowerJson({ rootPath, powerId }) {
  const validation = await validateProject(rootPath);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason };
  }

  const powerName = powerNameFromId(powerId);
  const nameError = validatePowerName(powerName);
  if (nameError) {
    return { ok: false, reason: nameError };
  }

  const paths = projectPaths(rootPath);
  const filePath = path.join(paths.powersDir, `${powerName}.json`);
  if (!(await exists(filePath))) {
    return { ok: false, reason: "Power 文件不存在" };
  }

  try {
    return {
      ok: true,
      powerId: powerIdFromName(powerName),
      name: powerName,
      filePath,
      json: await readJson(filePath)
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Power JSON 读取失败"
    };
  }
}

module.exports = {
  createPower,
  getProjectData,
  powerNameFromId,
  projectPaths,
  readPowerJson,
  validatePowerName,
  validateProject
};
