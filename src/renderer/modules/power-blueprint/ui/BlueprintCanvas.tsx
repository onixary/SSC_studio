import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  SelectionMode,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type OnConnectStartParams,
  type ReactFlowInstance,
  type XYPosition
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { FieldSchema, NodeSchema, SlotKind } from "../schema/blueprintSchemaTypes";
import { astToBlueprintGraph, sourceHandleId } from "../graph/astToGraph";
import { graphToPowerAst } from "../graph/graphToAst";
import type { BlueprintGraph, BlueprintGraphEdge, BlueprintGraphField, BlueprintGraphNode } from "../graph/blueprintGraphTypes";
import type { PowerAst } from "../ast/powerAstTypes";
import { parsePowerJsonToAst } from "../ast/parsePowerJson";
import { serializePowerAstToJson } from "../ast/serializePowerJson";
import { createExampleSchemaRegistry } from "../schema/exampleSchemas";

export interface PowerBlueprintCanvasProps {
  projectRoot: string;
  powerId: string;
  onDirtyChange?: (dirty: boolean) => void;
}

export interface PowerBlueprintCanvasHandle {
  save: () => Promise<boolean>;
  undo: () => boolean;
  redo: () => boolean;
}

interface BlueprintNodeData extends Record<string, unknown> {
  graphNode: BlueprintGraphNode;
}

type BlueprintFlowNode = Node<BlueprintNodeData, "blueprintNode">;

interface NodeMenuState {
  screenPosition: XYPosition;
  flowPosition: XYPosition;
  query: string;
  slotKind?: SlotKind;
  datatype?: string;
  pendingConnection?: PendingConnection;
}

interface NodeMenuCategory {
  id: string;
  label: string;
  schemas: NodeSchema[];
  children: NodeMenuCategory[];
}

interface PendingConnection {
  source: string;
  sourceHandle: string;
  fieldName: string;
  color: string;
  slotKind?: SlotKind;
  datatype?: string;
  multi: boolean;
}

interface BlueprintNodeInteraction {
  commitFieldValue: (nodeId: string, fieldName: string, rawValue: string) => boolean;
  renamePowerNode: (nodeId: string, rawName: string) => boolean;
  selectNode: (nodeId: string) => void;
}

interface BlueprintHistorySnapshot {
  nodes: BlueprintFlowNode[];
  edges: Edge[];
}

const BlueprintNodeInteractionContext = React.createContext<BlueprintNodeInteraction | null>(null);

const nodeTypes = {
  blueprintNode: BlueprintNodeView
};

const HISTORY_LIMIT = 80;

const PowerBlueprintCanvasWithRef = React.forwardRef<PowerBlueprintCanvasHandle, PowerBlueprintCanvasProps>(BlueprintCanvasInner);
PowerBlueprintCanvasWithRef.displayName = "PowerBlueprintCanvas";

export { PowerBlueprintCanvasWithRef as PowerBlueprintCanvas };

function BlueprintCanvasInner(
  { projectRoot, powerId, onDirtyChange }: PowerBlueprintCanvasProps,
  ref: React.ForwardedRef<PowerBlueprintCanvasHandle>
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [baseAst, setBaseAst] = useState<PowerAst | null>(null);
  const [nodes, setNodes] = useState<BlueprintFlowNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [nodeMenu, setNodeMenu] = useState<NodeMenuState | null>(null);
  const [optionalNodeId, setOptionalNodeId] = useState<string | null>(null);
  const registry = useMemo(() => createExampleSchemaRegistry(), []);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const flowInstanceRef = useRef<ReactFlowInstance<BlueprintFlowNode, Edge> | null>(null);
  const lastFlowPositionRef = useRef<XYPosition>({ x: 160, y: 160 });
  const pendingConnectionRef = useRef<PendingConnection | null>(null);
  const connectSucceededRef = useRef(false);
  const nextNodeIdRef = useRef(1);
  const pendingViewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const undoStackRef = useRef<BlueprintHistorySnapshot[]>([]);
  const redoStackRef = useRef<BlueprintHistorySnapshot[]>([]);
  const dragStartSnapshotRef = useRef<BlueprintHistorySnapshot | null>(null);

  const markDirty = useCallback(() => {
    onDirtyChange?.(true);
  }, [onDirtyChange]);

  const currentHistorySnapshot = useCallback(
    () => createHistorySnapshot(nodes, edges),
    [edges, nodes]
  );

  const pushHistorySnapshot = useCallback((snapshot: BlueprintHistorySnapshot) => {
    undoStackRef.current = [...undoStackRef.current, snapshot].slice(-HISTORY_LIMIT);
    redoStackRef.current = [];
  }, []);

  const restoreHistorySnapshot = useCallback(
    (snapshot: BlueprintHistorySnapshot) => {
      setNodes(cloneFlowNodes(snapshot.nodes));
      setEdges(cloneEdges(snapshot.edges));
      markDirty();
    },
    [markDirty]
  );

  const undo = useCallback(() => {
    const previous = undoStackRef.current.pop();
    if (!previous) return false;
    redoStackRef.current.push(currentHistorySnapshot());
    restoreHistorySnapshot(previous);
    return true;
  }, [currentHistorySnapshot, restoreHistorySnapshot]);

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (!next) return false;
    undoStackRef.current.push(currentHistorySnapshot());
    restoreHistorySnapshot(next);
    return true;
  }, [currentHistorySnapshot, restoreHistorySnapshot]);

  const onNodesChange = useCallback(
    (changes: NodeChange<BlueprintFlowNode>[]) => {
      if (changes.some((change) => change.type === "position" && "position" in change && change.position)) {
        markDirty();
      }
      setNodes((current) => applyNodeChanges(changes, current));
    },
    [markDirty, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      if (changes.some((change) => change.type === "remove")) {
        pushHistorySnapshot(currentHistorySnapshot());
        markDirty();
      }
      setEdges((current) => applyEdgeChanges(changes, current));
    },
    [currentHistorySnapshot, markDirty, pushHistorySnapshot, setEdges]
  );

  const makeEdge = useCallback((source: string, target: string, sourceHandle: string, color: string): Edge => {
    return {
      id: `${sourceHandle}->${target}:${Date.now()}`,
      source,
      target,
      sourceHandle,
      targetHandle: `${target}:in`,
      type: "straight",
      className: `blueprint-edge blueprint-edge-${color}`,
      data: {
        color,
        fieldName: fieldNameFromSourceHandle(sourceHandle)
      }
    };
  }, []);

  const canConnect = useCallback(
    (sourceHandle: string, target: string, multi: boolean) => {
      if (edges.some((edge) => edge.target === target)) return false;
      if (!multi && edges.some((edge) => edge.sourceHandle === sourceHandle)) return false;
      return true;
    },
    [edges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !connection.sourceHandle) return;
      const sourceField = findSourceField(nodes, connection.source, connection.sourceHandle);
      if (!sourceField) return;
      const schema = sourceField.schema;
      const multi = schema.valueKind === "slot_array" || schema.valueKind === "datatype_array";
      if (!canConnect(connection.sourceHandle, connection.target, multi)) return;

      connectSucceededRef.current = true;
      pushHistorySnapshot(currentHistorySnapshot());
      setEdges((current) => [
        ...current,
        makeEdge(connection.source!, connection.target!, connection.sourceHandle!, sourceField.field.color)
      ]);
      markDirty();
    },
    [canConnect, currentHistorySnapshot, makeEdge, markDirty, nodes, pushHistorySnapshot]
  );

  const openNodeMenu = useCallback((screenPosition: XYPosition, options?: Partial<NodeMenuState>) => {
    const flowPosition = flowInstanceRef.current?.screenToFlowPosition(screenPosition) ?? lastFlowPositionRef.current;
    setNodeMenu({
      screenPosition,
      flowPosition,
      query: "",
      ...options
    });
  }, []);

  const closeNodeMenu = useCallback(() => {
    setNodeMenu(null);
  }, []);

  const onConnectStart = useCallback(
    (_event: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
      connectSucceededRef.current = false;
      pendingConnectionRef.current = null;
      if (!params.nodeId || !params.handleId || params.handleType !== "source") return;
      const sourceField = findSourceField(nodes, params.nodeId, params.handleId);
      if (!sourceField) return;

      pendingConnectionRef.current = {
        source: params.nodeId,
        sourceHandle: params.handleId,
        fieldName: sourceField.field.name,
        color: sourceField.field.color,
        slotKind: sourceField.schema.slotKind,
        datatype: sourceField.schema.datatype,
        multi: sourceField.schema.valueKind === "slot_array" || sourceField.schema.valueKind === "datatype_array"
      };
    },
    [nodes]
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      window.setTimeout(() => {
        if (connectSucceededRef.current) return;
        const pendingConnection = pendingConnectionRef.current;
        if (!pendingConnection) return;
        const screenPosition = eventToScreenPosition(event);
        openNodeMenu(screenPosition, {
          slotKind: pendingConnection.slotKind,
          datatype: pendingConnection.datatype,
          pendingConnection
        });
      }, 0);
    },
    [openNodeMenu]
  );

  const createNodeFromSchema = useCallback(
    (schema: NodeSchema) => {
      if (!nodeMenu) return;
      const kind = nodeMenu.slotKind && schema.kind !== "datatype" ? nodeMenu.slotKind : schema.kind;
      const color = colorForSlotKind(kind);
      const id = `new-${nextNodeIdRef.current++}`;
      const graphNode: BlueprintGraphNode = {
        id,
        astNodeId: id,
        type: schema.type,
        kind,
        title: schema.title ?? readableTypeName(schema.type),
        color,
        position: nodeMenu.flowPosition,
        fields: schema.fields
          .filter((field) => field.required)
          .map((field) => createGraphField(id, field, color))
      };

      const nextNode: BlueprintFlowNode = {
        id,
        type: "blueprintNode",
        position: nodeMenu.flowPosition,
        data: { graphNode },
        draggable: true
      };

      pushHistorySnapshot(currentHistorySnapshot());
      setNodes((current) => [...current, nextNode]);
      if (nodeMenu.pendingConnection && canConnect(nodeMenu.pendingConnection.sourceHandle, id, nodeMenu.pendingConnection.multi)) {
        setEdges((current) => [
          ...current,
          makeEdge(
            nodeMenu.pendingConnection!.source,
            id,
            nodeMenu.pendingConnection!.sourceHandle,
            nodeMenu.pendingConnection!.color
          )
        ]);
      }
      markDirty();
      setNodeMenu(null);
    },
    [canConnect, currentHistorySnapshot, makeEdge, markDirty, nodeMenu, pushHistorySnapshot]
  );

  const openOptionalFields = useCallback((event: React.MouseEvent, node: BlueprintFlowNode) => {
    event.preventDefault();
    setOptionalNodeId(node.id);
  }, []);

  const addOptionalField = useCallback((nodeId: string, field: FieldSchema) => {
    const targetNode = nodes.find((node) => node.id === nodeId);
    if (!targetNode || targetNode.data.graphNode.fields.some((existing) => existing.name === field.name)) return;
    pushHistorySnapshot(currentHistorySnapshot());
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId) return node;
        const graphNode = node.data.graphNode;
        if (graphNode.fields.some((existing) => existing.name === field.name)) return node;
        const nextGraphNode = {
          ...graphNode,
          fields: [...graphNode.fields, createGraphField(graphNode.id, field, graphNode.color)]
        };
        return { ...node, data: { graphNode: nextGraphNode } };
      })
    );
    markDirty();
  }, [currentHistorySnapshot, markDirty, nodes, pushHistorySnapshot]);

  const removeOptionalField = useCallback((nodeId: string, fieldName: string) => {
    const targetNode = nodes.find((node) => node.id === nodeId);
    if (!targetNode || !targetNode.data.graphNode.fields.some((field) => field.name === fieldName)) return;
    pushHistorySnapshot(currentHistorySnapshot());
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId) return node;
        const graphNode = node.data.graphNode;
        const nextGraphNode = {
          ...graphNode,
          fields: graphNode.fields.filter((field) => field.name !== fieldName)
        };
        return { ...node, data: { graphNode: nextGraphNode } };
      })
    );
    setEdges((current) => current.filter((edge) => edge.sourceHandle !== sourceHandleId(nodeId, fieldName)));
    markDirty();
  }, [currentHistorySnapshot, markDirty, nodes, pushHistorySnapshot]);

  const closeOptionalFields = useCallback(() => {
    setOptionalNodeId(null);
  }, []);

  const selectNode = useCallback((nodeId: string) => {
    setNodes((current) => current.map((node) => ({ ...node, selected: node.id === nodeId })));
    setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
  }, []);

  const renamePowerNode = useCallback((nodeId: string, rawName: string) => {
    const nextName = rawName.trim();
    if (!isValidPowerNodeName(nextName)) return false;
    const targetNode = nodes.find((node) => node.id === nodeId);
    if (!targetNode || targetNode.data.graphNode.kind !== "power") return false;
    if (targetNode.data.graphNode.label === nextName && targetNode.data.graphNode.title === nextName) return true;

    pushHistorySnapshot(currentHistorySnapshot());
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId || node.data.graphNode.kind !== "power") return node;
        const graphNode = node.data.graphNode;
        if (graphNode.label === nextName && graphNode.title === nextName) return node;
        return {
          ...node,
          data: {
            graphNode: {
              ...graphNode,
              label: nextName,
              title: nextName
            }
          }
        };
      })
    );
    markDirty();
    return true;
  }, [currentHistorySnapshot, markDirty, nodes, pushHistorySnapshot]);

  const commitFieldValue = useCallback((nodeId: string, fieldName: string, rawValue: string) => {
    const targetNode = nodes.find((node) => node.id === nodeId);
    const targetField = targetNode?.data.graphNode.fields.find((field) => field.name === fieldName);
    if (!targetField || !targetField.inputKind) return false;

    const nextDisplayValue = parseInputValue(rawValue, targetField.inputKind);
    if (nextDisplayValue === null) return false;
    if (targetField.displayValue === nextDisplayValue) return true;

    pushHistorySnapshot(currentHistorySnapshot());
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId) return node;
        const graphNode = node.data.graphNode;
        return {
          ...node,
          data: {
            graphNode: {
              ...graphNode,
              fields: graphNode.fields.map((field) =>
                field.name === fieldName ? { ...field, displayValue: nextDisplayValue } : field
              )
            }
          }
        };
      })
    );
    markDirty();
    return true;
  }, [currentHistorySnapshot, markDirty, nodes, pushHistorySnapshot]);

  const saveCurrentBlueprint = useCallback(async () => {
    if (!window.ssc) {
      setSaveError("Save requires the Electron desktop window.");
      return false;
    }

    setSaving(true);
    setSaveError("");
    try {
      const graph = reactFlowToBlueprintGraph(nodes, edges);
      const ast = graphToPowerAst(graph, registry, baseAst ?? undefined);
      const json = serializePowerAstToJson(ast);
      const powerResult = await window.ssc.savePowerJson({ rootPath: projectRoot, powerId, json });
      if (!powerResult.ok) {
        setSaveError(powerResult.reason ?? "Power JSON save failed.");
        return false;
      }

      const state = createBlueprintState(powerId, graph, flowInstanceRef.current?.getViewport());
      const blueprintResult = await window.ssc.saveBlueprintState({ rootPath: projectRoot, powerId, state });
      if (!blueprintResult.ok) {
        setSaveError(blueprintResult.reason ?? "Blueprint state save failed.");
        return false;
      }

      setBaseAst(ast);
      onDirtyChange?.(false);
      return true;
    } catch (saveErrorValue) {
      setSaveError(saveErrorValue instanceof Error ? saveErrorValue.message : "Power blueprint save failed.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [baseAst, edges, nodes, onDirtyChange, powerId, projectRoot, registry]);

  React.useImperativeHandle(ref, () => ({ save: saveCurrentBlueprint, undo, redo }), [redo, saveCurrentBlueprint, undo]);

  useEffect(() => {
    setNodes((current) => synchronizeFieldConnectionState(current, edges));
  }, [edges]);

  const deleteSelectedElements = useCallback(() => {
    const selectedNodeIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id));
    const selectedEdgeIds = new Set(edges.filter((edge) => edge.selected).map((edge) => edge.id));
    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return false;

    pushHistorySnapshot(currentHistorySnapshot());
    setNodes((current) => current.filter((node) => !selectedNodeIds.has(node.id)));
    setEdges((current) =>
      current.filter(
        (edge) =>
          !selectedEdgeIds.has(edge.id) &&
          !selectedNodeIds.has(edge.source) &&
          !selectedNodeIds.has(edge.target)
      )
    );
    markDirty();
    return true;
  }, [currentHistorySnapshot, edges, markDirty, nodes, pushHistorySnapshot]);

  useEffect(() => {
    let canceled = false;

    async function load() {
      if (!window.ssc) {
        setLoading(false);
        setError("Power JSON loading requires the Electron desktop window.");
        setBaseAst(null);
        onDirtyChange?.(false);
        setNodes([]);
        setEdges([]);
        return;
      }

      setLoading(true);
      setError("");
      setSaveError("");
      setBaseAst(null);
      undoStackRef.current = [];
      redoStackRef.current = [];
      dragStartSnapshotRef.current = null;
      onDirtyChange?.(false);
      const result = await window.ssc.readPowerJson({ rootPath: projectRoot, powerId });

      if (canceled) return;

      if (!result.ok || result.json === undefined) {
        setLoading(false);
        setError(result.reason ?? "Power JSON load failed.");
        setBaseAst(null);
        onDirtyChange?.(false);
        setNodes([]);
        setEdges([]);
        return;
      }

      try {
        const ast = parsePowerJsonToAst(result.json, registry);
        serializePowerAstToJson(ast);
        const stateResult = await window.ssc.readBlueprintState({ rootPath: projectRoot, powerId });
        const graph = applyBlueprintState(astToBlueprintGraph(ast, registry), stateResult.ok ? stateResult.state : null);
        const nextNodes: BlueprintFlowNode[] = graph.nodes.map((node) => ({
          id: node.id,
          type: "blueprintNode",
          position: node.position,
          data: { graphNode: node },
          draggable: true
        }));
        const nextEdges: Edge[] = graph.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          type: "straight",
          className: `blueprint-edge blueprint-edge-${edge.color}`,
          data: {
            color: edge.color,
            fieldName: edge.fieldName,
            order: edge.order
          }
        }));
        pendingViewportRef.current = blueprintStateViewport(stateResult.ok ? stateResult.state : null);
        nextNodeIdRef.current = graph.nodes.length + 1;
        setBaseAst(ast);
        setNodes(nextNodes);
        setEdges(nextEdges);
        onDirtyChange?.(false);
        setLoading(false);
        const viewport = pendingViewportRef.current;
        if (viewport && flowInstanceRef.current) {
          void flowInstanceRef.current.setViewport(viewport);
          pendingViewportRef.current = null;
        }
      } catch (loadError) {
        setLoading(false);
        setError(loadError instanceof Error ? loadError.message : "Power blueprint generation failed.");
        setBaseAst(null);
        onDirtyChange?.(false);
        setNodes([]);
        setEdges([]);
      }
    }

    void load();

    return () => {
      canceled = true;
    };
  }, [onDirtyChange, powerId, projectRoot, registry, setEdges, setNodes]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space" || event.repeat || nodeMenu) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      event.preventDefault();
      const rect = wrapperRef.current?.getBoundingClientRect();
      const screenPosition = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      openNodeMenu(screenPosition);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nodeMenu, openNodeMenu]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        target.blur();
      }
      window.setTimeout(() => {
        void saveCurrentBlueprint();
      }, 0);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveCurrentBlueprint]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === "y") {
        event.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (nodeMenu || optionalNodeId) return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (deleteSelectedElements()) {
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelectedElements, nodeMenu, optionalNodeId]);

  if (loading) {
    return <div className="workspace-message">正在生成 Power 蓝图...</div>;
  }

  if (error) {
    return <div className="workspace-message error-text">{error}</div>;
  }

  return (
    <BlueprintNodeInteractionContext.Provider value={{ commitFieldValue, renamePowerNode, selectNode }}>
      <div
        ref={wrapperRef}
        className="react-flow-shell"
        onMouseMove={(event) => {
          lastFlowPositionRef.current =
            flowInstanceRef.current?.screenToFlowPosition({ x: event.clientX, y: event.clientY }) ?? lastFlowPositionRef.current;
        }}
        onDoubleClick={(event) => {
          if (event.target instanceof HTMLElement && event.target.closest(".react-flow__node")) return;
          openNodeMenu({ x: event.clientX, y: event.clientY });
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeDoubleClick={openOptionalFields}
          onNodeContextMenu={openOptionalFields}
          onPaneClick={closeNodeMenu}
          onNodeClick={closeNodeMenu}
          onEdgeClick={closeNodeMenu}
          onNodeDragStart={() => {
            dragStartSnapshotRef.current = currentHistorySnapshot();
          }}
          onNodeDragStop={(_event, node) => {
            const snapshot = dragStartSnapshotRef.current;
            dragStartSnapshotRef.current = null;
            if (!snapshot) return;
            const beforeNode = snapshot.nodes.find((candidate) => candidate.id === node.id);
            if (!beforeNode || positionsEqual(beforeNode.position, node.position)) return;
            pushHistorySnapshot(snapshot);
            markDirty();
          }}
          onPaneContextMenu={(event) => {
            event.preventDefault();
            openNodeMenu({ x: event.clientX, y: event.clientY });
          }}
          onInit={(instance) => {
            flowInstanceRef.current = instance;
            if (pendingViewportRef.current) {
              void instance.setViewport(pendingViewportRef.current);
              pendingViewportRef.current = null;
            }
          }}
          fitView
          fitViewOptions={{ padding: 0.2, includeHiddenNodes: false }}
          nodesDraggable
          nodesConnectable
          elementsSelectable
          selectionOnDrag
          selectionMode={SelectionMode.Partial}
          multiSelectionKeyCode="Shift"
          panOnDrag={[1, 2]}
          minZoom={0.35}
          maxZoom={1.4}
          zoomOnDoubleClick={false}
        >
          <Background color="#3b444e" gap={28} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>

        {nodeMenu && (
          <NodeCreateMenu
            state={nodeMenu}
            schemas={registry.list()}
            onQueryChange={(query) => setNodeMenu((current) => (current ? { ...current, query } : current))}
            onCreate={createNodeFromSchema}
            onClose={closeNodeMenu}
          />
        )}

        {optionalNodeId && (
          <OptionalFieldsDialog
            node={nodes.find((node) => node.id === optionalNodeId) ?? null}
            schema={registry.get(
              nodes.find((node) => node.id === optionalNodeId)?.data.graphNode.type,
              nodes.find((node) => node.id === optionalNodeId)?.data.graphNode.kind
            )}
            onAdd={addOptionalField}
            onRemove={removeOptionalField}
            onClose={closeOptionalFields}
          />
        )}

        {(saving || saveError) && (
          <div className={saveError ? "blueprint-save-status error-text" : "blueprint-save-status"}>
            {saveError || "正在保存 Power JSON..."}
          </div>
        )}
      </div>
    </BlueprintNodeInteractionContext.Provider>
  );
}

function BlueprintNodeView({ data }: NodeProps<BlueprintFlowNode>) {
  const node = data.graphNode;
  const interaction = React.useContext(BlueprintNodeInteractionContext);

  return (
    <section className={`blueprint-node blueprint-node-${node.color}`}>
      {node.kind !== "power" && (
        <Handle
          id={`${node.id}:in`}
          type="target"
          position={Position.Left}
          className="node-input-handle"
          isConnectable
        />
      )}
      <header className="blueprint-node-header">
        <span>{node.kind}</span>
        {node.kind === "power" ? (
          <EditablePowerNameInput node={node} interaction={interaction} />
        ) : (
          <strong>{node.title}</strong>
        )}
        <small>{node.type}</small>
      </header>
      <div className="blueprint-node-fields">
        {node.fields.length === 0 ? (
          <div className="blueprint-node-empty">No parameters</div>
        ) : (
          node.fields.map((field) => <BlueprintFieldRow key={field.name} field={field} />)
        )}
      </div>
    </section>
  );
}

function EditablePowerNameInput({
  node,
  interaction
}: {
  node: BlueprintGraphNode;
  interaction: BlueprintNodeInteraction | null;
}) {
  const [draft, setDraft] = useState(powerNodeDisplayName(node));

  useEffect(() => {
    setDraft(powerNodeDisplayName(node));
  }, [node]);

  const commit = useCallback(() => {
    if (!interaction) return;
    const committed = interaction.renamePowerNode(node.id, draft);
    if (!committed) {
      setDraft(powerNodeDisplayName(node));
    }
  }, [draft, interaction, node]);

  return (
    <input
      className="power-node-name-input nodrag nowheel"
      value={draft}
      onFocus={() => interaction?.selectNode(node.id)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function BlueprintFieldRow({ field }: { field: BlueprintGraphField }) {
  const interaction = React.useContext(BlueprintNodeInteractionContext);

  return (
    <div className={`blueprint-field blueprint-field-${field.color}${field.connected ? " connected" : ""}`}>
      <span className="field-name">{field.name}</span>
      {field.inputKind ? (
        <EditableFieldInput field={field} interaction={interaction} />
      ) : (
        <span className="field-value">{field.displayValue}</span>
      )}
      {(field.valueKind === "slot" ||
        field.valueKind === "slot_array" ||
        field.valueKind === "datatype" ||
        field.valueKind === "datatype_array") && (
        <Handle
          id={field.sourceHandleId}
          type="source"
          position={Position.Right}
          className="field-output-handle"
          isConnectable
        />
      )}
    </div>
  );
}

function EditableFieldInput({
  field,
  interaction
}: {
  field: BlueprintGraphField;
  interaction: BlueprintNodeInteraction | null;
}) {
  const [draft, setDraft] = useState(field.displayValue);
  const nodeId = nodeIdFromSourceHandle(field.sourceHandleId);

  useEffect(() => {
    setDraft(field.displayValue);
  }, [field.displayValue]);

  const commit = useCallback(() => {
    if (!interaction) return;
    const committed = interaction.commitFieldValue(nodeId, field.name, draft);
    if (!committed) {
      setDraft(field.displayValue);
    }
  }, [draft, field.displayValue, field.name, interaction, nodeId]);

  if (field.inputKind === "boolean") {
    const checked = field.displayValue.trim().toLowerCase() === "true";
    return (
      <button
        type="button"
        className={`field-toggle nodrag nowheel${checked ? " checked" : ""}`}
        aria-pressed={checked}
        onClick={(event) => {
          event.stopPropagation();
          interaction?.selectNode(nodeId);
          interaction?.commitFieldValue(nodeId, field.name, checked ? "false" : "true");
        }}
      >
        <span />
      </button>
    );
  }

  return (
    <input
      className="field-value-input nodrag nowheel"
      value={draft}
      style={{ width: `${Math.max(7, draft.length + 1)}ch` }}
      onFocus={() => interaction?.selectNode(nodeId)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

interface BlueprintUiState {
  version: 1;
  powerId: string;
  updatedAt: string;
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  nodes: Array<{
    id: string;
    astNodeId: string;
    type: string;
    kind: SlotKind;
    label?: string;
    title: string;
    signature: string;
    occurrence: number;
    position: XYPosition;
  }>;
  graph: BlueprintGraph;
}

function reactFlowToBlueprintGraph(nodes: BlueprintFlowNode[], edges: Edge[]): BlueprintGraph {
  return {
    nodes: nodes.map((node) => ({
      ...node.data.graphNode,
      position: node.position
    })),
    edges: edges.flatMap((edge, index): BlueprintGraphEdge[] => {
      if (!edge.sourceHandle || !edge.targetHandle) return [];
      const edgeData = edge.data as { color?: unknown; fieldName?: unknown; order?: unknown } | undefined;
      const color = typeof edgeData?.color === "string" ? edgeData.color : edgeColorFromClassName(edge.className);
      const fieldName = typeof edgeData?.fieldName === "string" ? edgeData.fieldName : fieldNameFromSourceHandle(edge.sourceHandle);
      const order = typeof edgeData?.order === "number" ? edgeData.order : undefined;
      return [
        {
          id: edge.id || `${edge.sourceHandle}->${edge.target}:${index}`,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          fieldName,
          color,
          order
        }
      ];
    })
  };
}

function createHistorySnapshot(nodes: BlueprintFlowNode[], edges: Edge[]): BlueprintHistorySnapshot {
  return {
    nodes: cloneFlowNodes(nodes),
    edges: cloneEdges(edges)
  };
}

function cloneFlowNodes(nodes: BlueprintFlowNode[]): BlueprintFlowNode[] {
  return nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: {
      ...node.data,
      graphNode: cloneGraphNode(node.data.graphNode)
    }
  }));
}

function cloneGraphNode(node: BlueprintGraphNode): BlueprintGraphNode {
  return {
    ...node,
    position: { ...node.position },
    fields: node.fields.map((field) => ({
      ...field,
      schema: { ...field.schema }
    }))
  };
}

function cloneEdges(edges: Edge[]): Edge[] {
  return edges.map((edge) => ({
    ...edge,
    data: edge.data ? { ...edge.data } : edge.data
  }));
}

function positionsEqual(left: XYPosition, right: XYPosition) {
  return left.x === right.x && left.y === right.y;
}

function createBlueprintState(
  powerId: string,
  graph: BlueprintGraph,
  viewport: { x: number; y: number; zoom: number } | undefined
): BlueprintUiState {
  const occurrenceBySignature = new Map<string, number>();
  return {
    version: 1,
    powerId,
    updatedAt: new Date().toISOString(),
    viewport,
    nodes: graph.nodes.map((node) => {
      const signature = nodeSignature(node);
      const occurrence = occurrenceBySignature.get(signature) ?? 0;
      occurrenceBySignature.set(signature, occurrence + 1);
      return {
        id: node.id,
        astNodeId: node.astNodeId,
        type: node.type,
        kind: node.kind,
        label: node.label,
        title: node.title,
        signature,
        occurrence,
        position: node.position
      };
    }),
    graph
  };
}

function applyBlueprintState(graph: BlueprintGraph, rawState: unknown): BlueprintGraph {
  const state = parseBlueprintState(rawState);
  if (!state) return graph;

  const stateNodesById = new Map(state.nodes.flatMap((node) => [[node.id, node], [node.astNodeId, node]]));
  const stateNodesBySignature = new Map<string, BlueprintUiState["nodes"][number]>();
  for (const node of state.nodes) {
    stateNodesBySignature.set(`${node.signature}#${node.occurrence}`, node);
  }

  const occurrenceBySignature = new Map<string, number>();
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const signature = nodeSignature(node);
      const occurrence = occurrenceBySignature.get(signature) ?? 0;
      occurrenceBySignature.set(signature, occurrence + 1);
      const stateNode = stateNodesById.get(node.id) ?? stateNodesById.get(node.astNodeId) ?? stateNodesBySignature.get(`${signature}#${occurrence}`);
      if (!stateNode) return node;
      return {
        ...node,
        position: stateNode.position,
        ...(node.kind === "power"
          ? {
              label: stateNode.label,
              title: stateNode.title
            }
          : {})
      };
    })
  };
}

function blueprintStateViewport(rawState: unknown) {
  return parseBlueprintState(rawState)?.viewport ?? null;
}

function parseBlueprintState(rawState: unknown): BlueprintUiState | null {
  if (!rawState || typeof rawState !== "object") return null;
  const state = rawState as Partial<BlueprintUiState>;
  if (state.version !== 1 || !Array.isArray(state.nodes)) return null;
  return state as BlueprintUiState;
}

function nodeSignature(node: BlueprintGraphNode) {
  return `${node.kind}|${node.type}|${node.label ?? ""}|${node.title}`;
}

function powerNodeDisplayName(node: BlueprintGraphNode) {
  return node.label && node.label !== "root" ? node.label : node.title;
}

function isValidPowerNodeName(value: string) {
  return /^[a-z0-9_]+$/.test(value);
}

function edgeColorFromClassName(className: string | undefined) {
  const match = className?.match(/blueprint-edge-([a-z_]+)/);
  return match?.[1] ?? "unknown";
}

function synchronizeFieldConnectionState(nodes: BlueprintFlowNode[], edges: Edge[]): BlueprintFlowNode[] {
  const edgesBySourceHandle = new Map<string, Edge[]>();
  const nodeTitles = new Map(nodes.map((node) => [node.id, node.data.graphNode.title]));

  for (const edge of edges) {
    if (!edge.sourceHandle) continue;
    const matchingEdges = edgesBySourceHandle.get(edge.sourceHandle) ?? [];
    matchingEdges.push(edge);
    edgesBySourceHandle.set(edge.sourceHandle, matchingEdges);
  }

  let changed = false;
  const nextNodes = nodes.map((node) => {
    const graphNode = node.data.graphNode;
    let nodeChanged = false;
    const nextFields = graphNode.fields.map((field) => {
      if (
        field.valueKind !== "slot" &&
        field.valueKind !== "slot_array" &&
        field.valueKind !== "datatype" &&
        field.valueKind !== "datatype_array"
      ) {
        return field;
      }

      const connectedEdges = edgesBySourceHandle.get(field.sourceHandleId) ?? [];
      const connected = connectedEdges.length > 0;
      const displayValue = connected ? connectionDisplayValue(field, connectedEdges, nodeTitles) : disconnectedDisplayValue(field);

      if (field.connected === connected && field.displayValue === displayValue) return field;
      nodeChanged = true;
      return { ...field, connected, displayValue };
    });

    if (!nodeChanged) return node;
    changed = true;
    return {
      ...node,
      data: {
        graphNode: {
          ...graphNode,
          fields: nextFields
        }
      }
    };
  });

  return changed ? nextNodes : nodes;
}

function connectionDisplayValue(field: BlueprintGraphField, edges: Edge[], nodeTitles: Map<string, string>) {
  if (field.valueKind === "slot_array" || field.valueKind === "datatype_array") return `Array[${edges.length}]`;
  const targetTitle = nodeTitles.get(edges[0]?.target ?? "");
  return targetTitle ? `-> ${targetTitle}` : "Connected";
}

function disconnectedDisplayValue(field: BlueprintGraphField) {
  if (field.valueKind === "slot_array" || field.valueKind === "datatype_array") return "Array[0]";
  return "Disconnected";
}

function NodeCreateMenu({
  state,
  schemas,
  onQueryChange,
  onCreate,
  onClose
}: {
  state: NodeMenuState;
  schemas: NodeSchema[];
  onQueryChange: (query: string) => void;
  onCreate: (schema: NodeSchema) => void;
  onClose: () => void;
}) {
  const [expandedDrawers, setExpandedDrawers] = useState<Set<string>>(
    () => new Set(["data_type", "power", "action", "condition", "misc"])
  );
  const query = state.query.trim().toLowerCase();
  const filteredSchemas = schemas.filter((schema) => {
    if (schema.type === "origins:multiple") return false;
    if (state.datatype && (schema.kind !== "datatype" || schema.type !== state.datatype)) return false;
    if (state.slotKind && schema.kind !== state.slotKind && !isContextualSchema(schema, state.slotKind)) return false;
    if (!query) return true;
    const title = schema.title ?? readableTypeName(schema.type);
    return `${title} ${schema.type} ${schema.kind}`.toLowerCase().includes(query);
  });
  const menuSchemas = useMemo(() => normalizeNodeMenuSchemas(filteredSchemas, state.slotKind), [filteredSchemas, state.slotKind]);
  const categories = useMemo(() => buildNodeMenuCategories(menuSchemas), [menuSchemas]);
  const resultCount = countCategorySchemas(categories);
  const searchActive = query.length > 0;

  const toggleDrawer = useCallback((id: string) => {
    setExpandedDrawers((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <section className="node-create-menu" style={{ left: state.screenPosition.x, top: state.screenPosition.y }}>
      <div className="node-create-menu-header">
        <input
          autoFocus
          value={state.query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索节点类型"
        />
        <button onClick={onClose}>x</button>
      </div>
      <div className="node-create-menu-list">
        {resultCount === 0 ? (
          <div className="node-create-empty">没有匹配节点</div>
        ) : (
          categories.map((category) => (
            <NodeMenuDrawer
              key={category.id}
              category={category}
              level={0}
              forceOpen={searchActive}
              expandedDrawers={expandedDrawers}
              onToggle={toggleDrawer}
              onCreate={onCreate}
            />
          ))
        )}
      </div>
    </section>
  );
}

function normalizeNodeMenuSchemas(schemas: NodeSchema[], slotKind?: SlotKind): NodeSchema[] {
  if (slotKind) return schemas;

  const output: NodeSchema[] = [];
  const seen = new Set<string>();

  for (const schema of schemas) {
    const key = menuSchemaKey(schema);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(schema);
  }

  return output;
}

function menuSchemaKey(schema: NodeSchema) {
  if (schema.type === "origins:and" && schema.kind.includes("action")) return "origins:and#action";
  if (schema.type === "origins:and" && schema.kind.includes("condition")) return "origins:and#condition";
  return `${schema.type}#${schema.kind}`;
}

function NodeMenuDrawer({
  category,
  level,
  forceOpen,
  expandedDrawers,
  onToggle,
  onCreate
}: {
  category: NodeMenuCategory;
  level: number;
  forceOpen: boolean;
  expandedDrawers: Set<string>;
  onToggle: (id: string) => void;
  onCreate: (schema: NodeSchema) => void;
}) {
  const count = countCategorySchemas([category]);
  if (count === 0) return null;

  const open = forceOpen || expandedDrawers.has(category.id);
  return (
    <section className={`node-menu-drawer level-${level}`}>
      <button
        type="button"
        className="node-menu-drawer-title"
        style={{ paddingLeft: 10 + level * 14 }}
        onClick={() => onToggle(category.id)}
      >
        <span>{open ? "v" : ">"}</span>
        <strong>{category.label}</strong>
        <small>{count}</small>
      </button>
      {open && (
        <div className="node-menu-drawer-body">
          {category.children.map((child) => (
            <NodeMenuDrawer
              key={child.id}
              category={child}
              level={level + 1}
              forceOpen={forceOpen}
              expandedDrawers={expandedDrawers}
              onToggle={onToggle}
              onCreate={onCreate}
            />
          ))}
          {category.schemas.map((schema) => (
            <button
              key={`${schema.kind}:${schema.type}`}
              className="node-create-option"
              style={{
                marginLeft: 10 + level * 14,
                width: `calc(100% - ${10 + level * 14}px)`
              }}
              onClick={() => onCreate(schema)}
            >
              <span>{schema.title ?? readableTypeName(schema.type)}</span>
              <small>{schema.kind} · {schema.type}</small>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function buildNodeMenuCategories(schemas: NodeSchema[]): NodeMenuCategory[] {
  const roots = [
    createCategory("data_type", "Data Type"),
    createCategory("power", "Power"),
    createCategory("action", "Action"),
    createCategory("condition", "Condition"),
    createCategory("misc", "Misc")
  ];
  const rootById = new Map(roots.map((category) => [category.id, category]));

  for (const schema of schemas) {
    const path = categoryPathForSchema(schema);
    const rootSegment = path[0];
    if (!rootSegment) continue;
    const rootCategory = rootById.get(rootSegment.id);
    if (!rootCategory) continue;
    let current: NodeMenuCategory = rootCategory;

    for (const segment of path.slice(1)) {
      let next: NodeMenuCategory | undefined = current.children.find((child) => child.id === segment.id);
      if (!next) {
        next = createCategory(segment.id, segment.label);
        current.children.push(next);
      }
      current = next;
    }

    current.schemas.push(schema);
  }

  return roots.filter((category) => countCategorySchemas([category]) > 0);
}

function createCategory(id: string, label: string): NodeMenuCategory {
  return { id, label, children: [], schemas: [] };
}

function countCategorySchemas(categories: NodeMenuCategory[]): number {
  return categories.reduce(
    (total, category) =>
      total + category.schemas.length + countCategorySchemas(category.children),
    0
  );
}

function categoryPathForSchema(schema: NodeSchema) {
  if (schema.kind === "datatype") {
    return [
      { id: "data_type", label: "Data Types" }
    ];
  }

  if (schema.kind === "power") {
    return [
      { id: "power", label: "Power Types" }
    ];
  }

  if (schema.kind.includes("action")) {
    return [
      { id: "action", label: "Action Types" },
      actionTypeCategory(schema)
    ];
  }

  if (schema.kind.includes("condition")) {
    return [
      { id: "condition", label: "Condition Types" },
      conditionTypeCategory(schema)
    ];
  }

  return [
    { id: "misc", label: "Misc" },
    namespaceCategory("misc", schema)
  ];
}

function namespaceCategory(prefix: string, schema: NodeSchema) {
  const namespace = schema.type.includes(":") ? schema.type.split(":")[0] : "studio";
  return {
    id: `${prefix}_namespace_${namespace.replace(/[^a-z0-9_]+/gi, "_")}`,
    label: namespace === "shape-shifter-curse" ? "Shape Shifter Curse" : readableTypeName(namespace)
  };
}

function actionTypeCategory(schema: NodeSchema) {
  if (isMetaNode(schema)) return { id: "action_meta", label: "Meta Action Types" };
  if (schema.kind === "bientity_action") return { id: "action_bientity", label: "Bi-entity Action Types" };
  if (schema.kind === "block_action") return { id: "action_block", label: "Block Action Types" };
  if (schema.kind === "entity_action") return { id: "action_entity", label: "Entity Action Types" };
  if (schema.kind === "item_action") return { id: "action_item", label: "Item Action Types" };
  return { id: "action_other", label: "Other Action Types" };
}

function conditionTypeCategory(schema: NodeSchema) {
  if (isMetaNode(schema)) return { id: "condition_meta", label: "Meta Condition Types" };
  if (schema.kind === "bientity_condition") return { id: "condition_bientity", label: "Bi-entity Condition Types" };
  if (schema.kind === "biome_condition") return { id: "condition_biome", label: "Biome Condition Types" };
  if (schema.kind === "block_condition") return { id: "condition_block", label: "Block Condition Types" };
  if (schema.kind === "damage_condition") return { id: "condition_damage", label: "Damage Condition Types" };
  if (schema.kind === "entity_condition") return { id: "condition_entity", label: "Entity Condition Types" };
  if (schema.kind === "fluid_condition") return { id: "condition_fluid", label: "Fluid Condition Types" };
  if (schema.kind === "item_condition") return { id: "condition_item", label: "Item Condition Types" };
  return { id: "condition_other", label: "Other Condition Types" };
}

function isMetaNode(schema: NodeSchema) {
  return ["origins:and", "origins:or", "origins:chance", "origins:if_else", "origins:choice"].includes(schema.type);
}

function OptionalFieldsDialog({
  node,
  schema,
  onAdd,
  onRemove,
  onClose
}: {
  node: BlueprintFlowNode | null;
  schema: NodeSchema | undefined;
  onAdd: (nodeId: string, field: FieldSchema) => void;
  onRemove: (nodeId: string, fieldName: string) => void;
  onClose: () => void;
}) {
  if (!node) return null;
  const graphNode = node.data.graphNode;
  const existingFields = new Set(graphNode.fields.map((field) => field.name));
  const addableFields = (schema?.fields ?? []).filter((field) => !existingFields.has(field.name));
  const removableFields = graphNode.fields.filter((field) => {
    const fieldSchema = schema?.fields.find((candidate) => candidate.name === field.name);
    return Boolean(fieldSchema && !fieldSchema.required);
  });

  return (
    <div className="modal-backdrop">
      <section className="modal-panel optional-fields-panel">
        <h2>Optional Parameters</h2>
        <p>{graphNode.title}</p>
        <div className="optional-fields-grid">
          <section>
            <h3>添加参数</h3>
            {addableFields.length === 0 ? (
              <div className="optional-field-empty">No addable parameters</div>
            ) : (
              addableFields.map((field) => (
                <button key={field.name} onClick={() => onAdd(node.id, field)}>
                  {field.name}
                </button>
              ))
            )}
          </section>
          <section>
            <h3>删除参数</h3>
            {removableFields.length === 0 ? (
              <div className="optional-field-empty">No removable parameters</div>
            ) : (
              removableFields.map((field) => (
                <button key={field.name} onClick={() => onRemove(node.id, field.name)}>
                  {field.name}
                </button>
              ))
            )}
          </section>
        </div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>完成</button>
        </div>
      </section>
    </div>
  );
}

function createGraphField(nodeId: string, field: FieldSchema, nodeColor: string): BlueprintGraphField {
  return {
    name: field.name,
    schema: field,
    valueKind: field.valueKind,
    displayValue: displayDefaultValue(field),
    connected: false,
    color: colorForFieldSchema(field, nodeColor),
    inputKind: inputKindForFieldSchema(field),
    sourceHandleId: sourceHandleId(nodeId, field.name)
  };
}

function inputKindForFieldSchema(field: FieldSchema): BlueprintGraphField["inputKind"] {
  if (field.valueKind === "number") return field.numberKind ?? "float";
  if (field.valueKind === "string" || field.valueKind === "enum") return "string";
  if (field.valueKind === "boolean") return "boolean";
  return undefined;
}

function displayDefaultValue(field: FieldSchema) {
  if (field.valueKind === "slot" || field.valueKind === "datatype") return "Disconnected";
  if (field.valueKind === "slot_array" || field.valueKind === "datatype_array") return "Array[0]";
  if (field.defaultValue === undefined) return "";
  if (field.defaultValue === null) return "null";
  return String(field.defaultValue);
}

function colorForFieldSchema(field: FieldSchema, nodeColor: string) {
  if (field.valueKind === "slot" || field.valueKind === "slot_array") {
    return colorForSlotKind(field.slotKind ?? "unknown");
  }
  if (field.valueKind === "datatype" || field.valueKind === "datatype_array") return "datatype";
  return "scalar";
}

function colorForSlotKind(kind: SlotKind) {
  if (kind === "power") return "power";
  if (kind === "datatype") return "datatype";
  if (kind.includes("action")) return "action";
  if (kind.includes("condition")) return "condition";
  return "unknown";
}

function findSourceField(nodes: BlueprintFlowNode[], sourceNodeId: string, sourceHandleIdValue: string) {
  const sourceNode = nodes.find((node) => node.id === sourceNodeId);
  const field = sourceNode?.data.graphNode.fields.find((candidate) => candidate.sourceHandleId === sourceHandleIdValue);
  if (!sourceNode || !field) return null;
  const nodeSchema = sourceNode.data.graphNode;
  return {
    node: nodeSchema,
    field,
    schema: field.schema
  };
}

function createFieldSchemaFromGraphField(field: BlueprintGraphField): FieldSchema {
  const fieldName = field.name;
  if (field.valueKind === "slot_array") {
    return {
      name: fieldName,
      valueKind: field.valueKind,
      slotKind: colorToSlotKind(field.color),
      multi: true
    };
  }
  if (field.valueKind === "datatype_array") {
    return {
      name: fieldName,
      valueKind: field.valueKind,
      datatype: field.schema.datatype ?? datatypeFromFieldName(fieldName),
      multi: true
    };
  }
  if (field.valueKind === "slot") {
    return {
      name: fieldName,
      valueKind: field.valueKind,
      slotKind: colorToSlotKind(field.color)
    };
  }
  if (field.valueKind === "datatype") {
    return {
      name: fieldName,
      valueKind: field.valueKind,
      datatype: field.color === "datatype" ? datatypeFromFieldName(fieldName) : undefined
    };
  }
  return { name: fieldName, valueKind: field.valueKind };
}

function colorToSlotKind(color: string): SlotKind {
  if (color === "power") return "power";
  if (color === "action") return "entity_action";
  if (color === "condition") return "entity_condition";
  if (color === "datatype") return "datatype";
  return "unknown";
}

function parseInputValue(rawValue: string, inputKind: NonNullable<BlueprintGraphField["inputKind"]>) {
  if (inputKind === "string") {
    return rawValue;
  }

  if (inputKind === "boolean") {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized === "true") return "true";
    if (normalized === "false") return "false";
    return null;
  }

  const trimmed = rawValue.trim();
  if (inputKind === "int") {
    if (!/^-?\d+$/.test(trimmed)) return null;
    return String(Number.parseInt(trimmed, 10));
  }

  if (!/^-?(?:\d+|\d+\.\d+|\.\d+)$/.test(trimmed)) return null;
  return String(Number.parseFloat(trimmed));
}

function nodeIdFromSourceHandle(sourceHandleIdValue: string) {
  const marker = ":out:";
  const markerIndex = sourceHandleIdValue.indexOf(marker);
  return markerIndex >= 0 ? sourceHandleIdValue.slice(0, markerIndex) : sourceHandleIdValue;
}

function fieldNameFromSourceHandle(sourceHandleIdValue: string) {
  const marker = ":out:";
  const markerIndex = sourceHandleIdValue.indexOf(marker);
  return markerIndex >= 0 ? sourceHandleIdValue.slice(markerIndex + marker.length) : sourceHandleIdValue;
}

function datatypeFromFieldName(fieldName: string) {
  if (fieldName === "particle") return "particle_effect";
  if (fieldName === "spread") return "vector";
  return undefined;
}

function isContextualSchema(schema: NodeSchema, slotKind: SlotKind) {
  return schema.type === "origins:and" && schema.kind === slotKind;
}

function eventToScreenPosition(event: MouseEvent | TouchEvent): XYPosition {
  if ("changedTouches" in event && event.changedTouches.length > 0) {
    return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
  }
  if ("clientX" in event) {
    return { x: event.clientX, y: event.clientY };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

function readableTypeName(type: string) {
  const parts = type.split(":");
  return parts[parts.length - 1].replaceAll("_", " ");
}
