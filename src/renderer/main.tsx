import React, { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { CreatePowerResult, ProjectData, ProjectForm, ProjectPower, ProjectValidation } from "./vite-env";
import { PowerBlueprintCanvas, type PowerBlueprintCanvasHandle } from "./modules/power-blueprint/ui/BlueprintCanvas";
import "./styles/app.css";

type View = "menu" | "power";
type PendingAction = null | (() => void | Promise<void>);

const INDEPENDENT_POWER_SCOPE = "__independent_powers__";
const SAVED_PROJECT_ROOT_KEY = "ssc-studio:last-valid-project-root";

const EMPTY_VALIDATION: ProjectValidation = {
  ok: false,
  reason: "未选择目录"
};

function isElectronReady() {
  return Boolean(window.ssc);
}

function App() {
  const [view, setView] = useState<View>("menu");
  const [validation, setValidation] = useState<ProjectValidation>(EMPTY_VALIDATION);
  const [errorMessage, setErrorMessage] = useState("");

  React.useEffect(() => {
    if (!window.ssc) return;

    const savedRoot = window.localStorage.getItem(SAVED_PROJECT_ROOT_KEY);
    if (!savedRoot) return;

    let canceled = false;
    window.ssc.validateProject(savedRoot).then((nextValidation) => {
      if (canceled) return;
      if (nextValidation.ok) {
        setValidation(nextValidation);
      } else {
        window.localStorage.removeItem(SAVED_PROJECT_ROOT_KEY);
      }
    }).catch(() => {
      if (!canceled) {
        window.localStorage.removeItem(SAVED_PROJECT_ROOT_KEY);
      }
    });

    return () => {
      canceled = true;
    };
  }, []);

  const selectProject = useCallback(async () => {
    if (!window.ssc) {
      setErrorMessage("目录选择需要在 Electron 桌面窗口中使用。");
      return;
    }

    const result = await window.ssc.selectProject();
    if (!result.canceled) {
      setValidation(result.validation);
      if (!result.validation.ok) {
        window.localStorage.removeItem(SAVED_PROJECT_ROOT_KEY);
        setErrorMessage("未检测到 SSC 项目文件，请重新选择目录。");
      } else {
        window.localStorage.setItem(SAVED_PROJECT_ROOT_KEY, result.validation.rootPath ?? "");
        setErrorMessage("");
      }
    }
  }, []);

  return (
    <div className="app-shell">
      <AppTitlebar />
      {view === "menu" ? (
        <MainMenu
          validation={validation}
          onSelectProject={selectProject}
          onOpenPower={() => setView("power")}
          electronReady={isElectronReady()}
        />
      ) : (
        <PowerBlueprintPage
          projectRoot={validation.rootPath ?? ""}
          onBack={() => setView("menu")}
        />
      )}

      {errorMessage && (
        <MessageDialog
          tone="error"
          title="项目目录无效"
          message={errorMessage}
          confirmText="确定"
          onConfirm={() => setErrorMessage("")}
        />
      )}
    </div>
  );
}

function AppTitlebar() {
  const [maximized, setMaximized] = useState(false);

  const minimize = useCallback(() => {
    void window.ssc?.minimizeWindow();
  }, []);

  const toggleMaximize = useCallback(async () => {
    const next = await window.ssc?.toggleMaximizeWindow();
    if (typeof next === "boolean") {
      setMaximized(next);
    }
  }, []);

  const close = useCallback(() => {
    void window.ssc?.closeWindow();
  }, []);

  return (
    <header className="app-titlebar">
      <div className="titlebar-label">SSC Studio</div>
      <div className="window-controls">
        <button className="window-control" title="最小化" onClick={minimize}>-</button>
        <button className="window-control" title={maximized ? "还原" : "最大化"} onClick={toggleMaximize}>
          {maximized ? "❐" : "□"}
        </button>
        <button className="window-control close" title="关闭" onClick={close}>×</button>
      </div>
    </header>
  );
}

function MainMenu({
  validation,
  onSelectProject,
  onOpenPower,
  electronReady
}: {
  validation: ProjectValidation;
  onSelectProject: () => void;
  onOpenPower: () => void;
  electronReady: boolean;
}) {
  return (
    <main className="main-menu">
      <section className="menu-frame">
        <aside className="logo-panel">
          <div className="logo-mark">SSC</div>
          <div className="logo-caption">Studio</div>
        </aside>

        <section className="menu-content">
          <div className="window-strip" />
          <div className="project-row">
            <button className="primary-button" onClick={onSelectProject}>
              选择打开 SSC 项目根目录
            </button>
            <div className={validation.ok ? "project-status ok" : "project-status"}>
              <strong>{validation.ok ? "已选择有效项目" : "未选择有效项目"}</strong>
              <span>{validation.ok ? validation.rootPath : validation.reason}</span>
            </div>
          </div>

          {!electronReady && (
            <div className="notice-line">
              当前在浏览器预览中运行。目录选择需要 Electron 桌面窗口。
            </div>
          )}

          {validation.ok ? (
            <div className="module-grid" aria-label="模块入口">
              <button className="module-button active" onClick={onOpenPower}>
                <span>编辑形态 Power 蓝图</span>
                <small>读取形态与 Power JSON，进入蓝图工作区</small>
              </button>
              <button className="module-button disabled" disabled>
                <span>配置形态贴图</span>
                <small>贴图、colormask、mask 工作流</small>
              </button>
              <button className="module-button disabled" disabled>
                <span>配置形态描述</span>
                <small>后续扩展入口</small>
              </button>
            </div>
          ) : (
            <div className="empty-menu-state">
              <p>请选择正确的 SSC 项目根目录后继续。</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function PowerBlueprintPage({ projectRoot, onBack }: { projectRoot: string; onBack: () => void }) {
  const canvasRef = React.useRef<PowerBlueprintCanvasHandle | null>(null);
  const [data, setData] = useState<ProjectData | null>(null);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [selectedPowerId, setSelectedPowerId] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const loadData = useCallback(async () => {
    if (!projectRoot || !window.ssc) {
      setPageError("没有可读取的 SSC 项目目录。");
      return;
    }

    setLoading(true);
    setPageError("");
    try {
      const nextData = await window.ssc.getProjectData(projectRoot);
      if (!nextData.validation.ok) {
        setPageError(nextData.validation.reason);
      }
      setData(nextData);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "读取项目数据失败。");
    } finally {
      setLoading(false);
    }
  }, [projectRoot]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const isIndependentScope = selectedFormId === INDEPENDENT_POWER_SCOPE;
  const selectedForm = isIndependentScope ? null : data?.forms.find((form) => form.id === selectedFormId) ?? null;
  const hasPowerScope = isIndependentScope || Boolean(selectedForm);
  const selectedScopeLabel = isIndependentScope ? "独立 Power" : selectedForm?.id ?? "";
  const powerById = useMemo(() => {
    const map = new Map<string, ProjectPower>();
    for (const power of data?.powers ?? []) {
      map.set(power.id, power);
    }
    return map;
  }, [data]);

  const referencedPowerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const form of data?.forms ?? []) {
      for (const powerId of form.powers) {
        ids.add(powerId);
      }
    }
    return ids;
  }, [data]);

  const independentPowers = useMemo(
    () => (data?.powers ?? []).filter((power) => !referencedPowerIds.has(power.id)),
    [data, referencedPowerIds]
  );

  const visiblePowers = useMemo(() => {
    if (isIndependentScope) return independentPowers;
    if (!selectedForm) return [];
    return selectedForm.powers.map((powerId) => powerById.get(powerId)).filter(Boolean) as ProjectPower[];
  }, [independentPowers, isIndependentScope, powerById, selectedForm]);

  const selectedPower = powerById.get(selectedPowerId) ?? null;

  const runGuarded = useCallback(
    (action: () => void | Promise<void>) => {
      if (!dirty) {
        void action();
        return;
      }
      setPendingAction(() => action);
    },
    [dirty]
  );

  const saveCurrentPower = useCallback(async () => {
    const saved = await canvasRef.current?.save();
    if (saved) {
      setDirty(false);
    }
    return Boolean(saved);
  }, []);

  const executePending = useCallback(async (saveFirst: boolean) => {
    if (saveFirst) {
      const saved = await saveCurrentPower();
      if (!saved) return;
    } else {
      setDirty(false);
    }

    const action = pendingAction;
    setPendingAction(null);
    if (action) {
      await action();
    }
  }, [pendingAction, saveCurrentPower]);

  const selectForm = useCallback(
    (form: ProjectForm) => {
      runGuarded(() => {
        setSelectedFormId(form.id);
        setSelectedPowerId("");
      });
    },
    [runGuarded]
  );

  const selectIndependentPowers = useCallback(() => {
    runGuarded(() => {
      setSelectedFormId(INDEPENDENT_POWER_SCOPE);
      setSelectedPowerId("");
    });
  }, [runGuarded]);

  const selectPower = useCallback(
    (power: ProjectPower) => {
      runGuarded(() => {
        setSelectedPowerId(power.id);
      });
    },
    [runGuarded]
  );

  const requestBack = useCallback(() => {
    runGuarded(() => onBack());
  }, [onBack, runGuarded]);

  const requestCreate = useCallback(() => {
    runGuarded(() => {
      setCreateOpen(true);
      setCreateName("");
      setCreateError("");
    });
  }, [runGuarded]);

  const createPower = useCallback(async () => {
    if (!window.ssc) {
      setCreateError("新建 Power 需要在 Electron 桌面窗口中使用。");
      return;
    }

    setCreateError("");
    const result: CreatePowerResult = await window.ssc.createPower({
      rootPath: projectRoot,
      formId: isIndependentScope ? undefined : selectedFormId,
      powerName: createName
    });

    if (!result.ok || !result.power) {
      setCreateError(result.reason ?? "Power 名称重复或违规，请重新输入。");
      return;
    }

    setCreateOpen(false);
    await loadData();
    setSelectedPowerId(result.power.id);
    setDirty(false);
  }, [createName, isIndependentScope, loadData, projectRoot, selectedFormId]);

  return (
    <main className="power-page">
      <header className="power-header">
        <button className="back-button" onClick={requestBack}>
          &lt;- 返回主菜单
        </button>
        <div>
          <h1>Power 蓝图</h1>
          <p>{hasPowerScope ? `当前分类：${selectedScopeLabel}${dirty ? " *" : ""}` : "未选中分类"}</p>
        </div>
      </header>

      <section className="blueprint-shell">
        <aside className="form-column">
          <div className="column-title">选择要配置的形态</div>
          <div className="independent-power-box">
            <button
              className={isIndependentScope ? "list-button independent-button selected" : "list-button independent-button"}
              onClick={selectIndependentPowers}
            >
              <span>独立 Power</span>
              <small>{independentPowers.length} 个未绑定 Power</small>
            </button>
          </div>
          <div className="scroll-list">
            {data?.forms.map((form) => (
              <button
                key={form.id}
                className={form.id === selectedFormId ? "list-button selected" : "list-button"}
                onClick={() => selectForm(form)}
              >
                {form.name}
              </button>
            ))}
          </div>
        </aside>

        <aside className="power-column">
          <div className="column-title">选择或新建 Power</div>
          <button className="secondary-button" disabled={!hasPowerScope} onClick={requestCreate}>
            + 新建 Power
          </button>
          <div className="scroll-list">
            {visiblePowers.map((power) => (
              <button
                key={power.id}
                className={power.id === selectedPowerId ? "list-button selected" : "list-button"}
                onClick={() => selectPower(power)}
              >
                {power.name}
                {dirty && power.id === selectedPowerId ? " *" : ""}
              </button>
            ))}
          </div>
        </aside>

        <section className="blueprint-workspace">
          <div className="workspace-toolbar">
            <button className="tool-button" disabled={!selectedPower || !dirty} onClick={() => void saveCurrentPower()}>
              保存当前蓝图
            </button>
            <button className="tool-button" onClick={() => runGuarded(loadData)}>
              刷新数据
            </button>
          </div>

          <BlueprintPlaceholder
            projectRoot={projectRoot}
            loading={loading}
            error={pageError}
            hasPowerScope={hasPowerScope}
            selectedPower={selectedPower}
            canvasRef={canvasRef}
            onDirtyChange={setDirty}
          />
        </section>
      </section>

      {createOpen && (
        <CreatePowerDialog
          value={createName}
          error={createError}
          onChange={setCreateName}
          onCancel={() => setCreateOpen(false)}
          onConfirm={createPower}
        />
      )}

      {pendingAction && (
        <UnsavedDialog
          onSave={() => void executePending(true)}
          onDiscard={() => void executePending(false)}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </main>
  );
}

function BlueprintPlaceholder({
  projectRoot,
  loading,
  error,
  hasPowerScope,
  selectedPower,
  canvasRef,
  onDirtyChange
}: {
  projectRoot: string;
  loading: boolean;
  error: string;
  hasPowerScope: boolean;
  selectedPower: ProjectPower | null;
  canvasRef: React.RefObject<PowerBlueprintCanvasHandle | null>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  if (loading) {
    return <div className="workspace-message">正在读取项目数据...</div>;
  }

  if (error) {
    return <div className="workspace-message error-text">{error}</div>;
  }

  if (!hasPowerScope) {
    return <div className="workspace-message">请选择要配置的形态或独立 Power</div>;
  }

  if (!selectedPower) {
    return <div className="workspace-message">请选择或新建 Power</div>;
  }

  return (
    <PowerBlueprintCanvas
      ref={canvasRef}
      projectRoot={projectRoot}
      powerId={selectedPower.id}
      onDirtyChange={onDirtyChange}
    />
  );
}

function CreatePowerDialog({
  value,
  error,
  onChange,
  onCancel,
  onConfirm
}: {
  value: string;
  error: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <section className="modal-panel">
        <h2>输入要新建的 Power 名称</h2>
        <input
          autoFocus
          className="text-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="例如：form_spider_3_new_power"
        />
        <p className={error ? "input-help error-text" : "input-help"}>
          {error || "只能使用小写字母、数字和下划线。"}
        </p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onConfirm}>创建</button>
          <button className="danger-button" onClick={onCancel}>取消</button>
        </div>
      </section>
    </div>
  );
}

function UnsavedDialog({
  onSave,
  onDiscard,
  onCancel
}: {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <section className="modal-panel warning">
        <h2>保存当前蓝图更改？</h2>
        <p>当前 Power 蓝图存在未保存修改。</p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onSave}>保存</button>
          <button className="danger-button" onClick={onDiscard}>丢弃</button>
          <button className="plain-button" onClick={onCancel}>取消</button>
        </div>
      </section>
    </div>
  );
}

function MessageDialog({
  tone,
  title,
  message,
  confirmText,
  onConfirm
}: {
  tone: "error" | "info";
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <section className={`modal-panel ${tone}`}>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onConfirm}>{confirmText}</button>
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
