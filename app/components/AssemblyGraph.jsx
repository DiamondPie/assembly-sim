'use client';

import { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
  BaseEdge,
  useNodes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import styles from './AssemblyGraph.module.css';
import clsx from 'clsx';

function JumpEdge({ sourceX, sourceY, targetX, targetY, data, style, label, labelStyle, labelBgStyle }) {
  const nodes = useNodes();
  const r = 10;
  const padding = 40; 
  const laneSpacing = 16;
  
  // 1. 动态避障通道计算 (保持之前的鲁棒性逻辑)
  const minY = Math.min(sourceY, targetY);
  const maxY = Math.max(sourceY, targetY);
  const intersectingNodes = nodes.filter(n => {
    const y = n.position.y;
    const h = n.measured?.height ?? 60;
    return (y + h) > minY && y < maxY;
  });
  const maxRight = intersectingNodes.reduce((max, n) => 
    Math.max(max, n.position.x + (n.measured?.width ?? 220)), 110);
  
  const bypassX = maxRight + padding + (data?.laneIndex ?? 0) * laneSpacing;

  // 2. 核心修复：定义明确的出场和进场高度
  const exitY = sourceY + 20;    // 从底部 Handle 向下延伸 20px
  const entryY = targetY - 20;   // 从顶部 Handle 向上延伸 20px

  const isRightTarget = data?.targetIsRight === true;

  const path = isRightTarget
    ? [
      // A. 起点：源节点底部
      `M ${sourceX} ${sourceY}`,
      // B. 出场：先向下一点，再右转进通道
      `L ${sourceX} ${exitY - r}`,
      `Q ${sourceX} ${exitY} ${sourceX + r} ${exitY}`,
      `L ${bypassX - r} ${exitY}`,
      `Q ${bypassX} ${exitY} ${bypassX} ${exitY - r}`,
      // C. 垂直段：向上走到目标节点的高度
      `L ${bypassX} ${targetY + r}`,
      // D. 进场：右转，水平向左进入右侧 handle
      `Q ${bypassX} ${targetY} ${bypassX - r} ${targetY}`,
      `L ${targetX} ${targetY}`,
    ].join(' ')
    : [
      // 原有顶部 handle 逻辑（保持不变）
      `M ${sourceX} ${sourceY}`,
      `L ${sourceX} ${exitY - r}`,
      `Q ${sourceX} ${exitY} ${sourceX + r} ${exitY}`,
      `L ${bypassX - r} ${exitY}`,
      `Q ${bypassX} ${exitY} ${bypassX} ${exitY - (sourceY < targetY ? -r : r)}`,
      `L ${bypassX} ${entryY + (sourceY < targetY ? -r : r)}`,
      `Q ${bypassX} ${entryY} ${bypassX - r} ${entryY}`,
      `L ${targetX + r} ${entryY}`,
      `Q ${targetX} ${entryY} ${targetX} ${entryY + r}`,
      `L ${targetX} ${targetY}`,
    ].join(' ');

  return (
    <BaseEdge path={path} style={style} label={label} labelStyle={labelStyle} labelBgStyle={labelBgStyle} />
  );
}

const EDGE_TYPES = { 
  jumpEdge: JumpEdge 
};

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const JUMP_OPCODES = new Set([
  'JUMP', 'JMP',
  'JUMPGT', 'JGT', 'BGT',
  'JUMPLT', 'JLT', 'BLT',
  'JUMPEQ', 'JEQ', 'BEQ', 'BZ',
  'JUMPNE', 'JNE', 'BNE', 'BNZ',
  'JUMPGE', 'JGE', 'BGE',
  'JUMPLE', 'JLE', 'BLE',
  'CALL', 'B', 'BR',
]);

const HALT_OPCODES = new Set(['HALT', 'HLT', 'STOP', 'RET', 'RETURN', 'END']);

const NODE_WIDTH  = 220;
const NODE_X      = 0;
const NODE_GAP_Y  = 60;
// Estimated row height in px (used for rough layout before measurement)
const ROW_H       = 22;
const NODE_PADDING_Y = 32; // top + bottom header/footer area

// ─────────────────────────────────────────────
// Parser: rows → blocks → RF nodes + edges
// ─────────────────────────────────────────────

/**
 * Split flat instruction rows into basic blocks.
 * A new block starts when:
 *   1. A row has a non-empty label (it's a jump target)
 *   2. The previous row was a jump or halt instruction
 *
 * Rules for inclusion:
 *   - Jump instructions are kept as the *last* line of their block
 *   - Every instruction appears exactly once
 */
function parseBlocks(rows) {
  // Filter out fully empty rows
  const normalized = rows.map(r => ({
    ...r,
    label:   r.label.trim(),
    opcode:  r.opcode.trim().toUpperCase(),
    operand: r.operand.trim(),
  }));

  const instructions = normalized.filter(r => r.opcode || r.label || r.operand);

  if (instructions.length === 0) return [];

  const blocks = [];
  let current = null;

  const flushBlock = () => {
    if (current && current.instructions.length > 0) {
      blocks.push(current);
    }
  };

  for (let i = 0; i < instructions.length; i++) {
    const row = instructions[i];
    const op  = row.opcode.toUpperCase();
    const isJump = JUMP_OPCODES.has(op);
    const isHalt = HALT_OPCODES.has(op);
    const hasLabel = row.label !== '';

    // Start a new block if: this row has a label AND current block isn't empty
    if (hasLabel && current && current.instructions.length > 0) {
      flushBlock();
      current = null;
    }

    // Open a new block if needed
    if (!current) {
      current = {
        id: `block-${blocks.length}`,
        entryLabel: row.label || null,
        instructions: [],
        isEntry: blocks.length === 0,
        isHalt: false,
        jumpTarget: null,
        jumpOp: null,
      };
    }

    current.instructions.push(row);

    if (isJump) {
      current.jumpTarget = row.operand;
      current.jumpOp     = op;
      flushBlock();
      current = null;
    } else if (isHalt) {
      current.isHalt = true;
      flushBlock();
      current = null;
    }
  }
  flushBlock();

  return blocks;
}

/**
 * Convert blocks into React Flow nodes and edges.
 * Layout: vertical stack, left-aligned.
 */
function blocksToGraph(blocks) {
  if (blocks.length === 0) return { nodes: [], edges: [] };

  // Build label→blockId map for resolving jump targets
  const labelMap = {};
  for (const block of blocks) {
    if (block.entryLabel) {
      labelMap[block.entryLabel] = block.id;
    }
  }

  // 追踪每个节点的出/入边计数，用于分配 handle id
  const sourceCount = {};
  const targetCount = {};

  const edges = [];

  let jumpEdgeCount = 0;

  const addEdge = (source, target, label, type = 'sequential', targetIsRight = false) => {
    if (!target) return;
    const srcIdx = sourceCount[source] = (sourceCount[source] ?? 0) + 1;
    const tgtIdx = targetCount[target] = (targetCount[target] ?? 0) + 1;

    const laneIndex = type === 'jump' ? jumpEdgeCount++ : 0;
    edges.push({
      id: `e-${source}-${target}-${srcIdx}`,
      source,
      target,
      sourceHandle: `src-${srcIdx}`,
      targetHandle: `tgt-${tgtIdx}`,
      label: label || undefined,
      type: type === 'jump' ? 'jumpEdge' : 'smoothstep',
      animated: type === 'jump',
      data: { edgeType: type, laneIndex, targetIsRight },
      style: {
        stroke: type === 'jump'
          ? 'var(--accent-primary, #e9a0ff)'
          : 'var(--text-tertiary, #484f58)',
        strokeWidth: type === 'jump' ? 2 : 1.5,
      },
      labelStyle: {
        fill: 'var(--accent-primary, #e9a0ff)',
        fontSize: 10,
        fontFamily: "'Google Sans Code', monospace",
      },
      labelBgStyle: {
        fill: 'var(--bg-primary, #010101)',
        fillOpacity: 0.85,
      },
    });
  };

  // Calculate y positions based on instruction count
  let yOffset = 0;
  let currentXOffset = NODE_X; // 初始 X 位置为 0

  const nodes = blocks.map((block) => {
    const instrCount = block.instructions.length;
    const estimatedH = instrCount * ROW_H + NODE_PADDING_Y;

    const isConditionalJump = block.jumpTarget && 
      !['JUMP', 'JMP', 'B', 'BR', 'CALL'].includes(block.jumpOp);
    
    if (isConditionalJump) {
      currentXOffset -= 40; 
    }

    const node = {
      id: block.id,
      type: 'asmBlock',
      position: { x: currentXOffset, y: yOffset },
      data: { block, isEntry: block.isEntry, isHalt: block.isHalt, xOffset: currentXOffset },
      width: NODE_WIDTH,
    };
    yOffset += estimatedH + NODE_GAP_Y;
    if (isConditionalJump) {
      yOffset += 10;
    }
    return node;
  });

  // 第一遍：优先处理所有顺序连线，确保它们抢占 tgt-1 和 src-1
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const nextId = i + 1 < blocks.length ? blocks[i + 1].id : null;
    const isConditional = block.jumpTarget && !['JUMP', 'JMP', 'B', 'BR', 'CALL'].includes(block.jumpOp);

    // 只要不是强制停机且有下一个节点，就生成顺序线
    if ((isConditional || !block.isHalt) && nextId) {
      addEdge(block.id, nextId, '', 'sequential');
    }
  }
  // 第二遍：处理跳转连线，它们将自动获得 tgt-2, tgt-3... 等靠右的句柄
  for (const block of blocks) {
    if (block.jumpTarget) {
      const resolvedTarget = labelMap[block.jumpTarget] ?? null;
      if (resolvedTarget) {
        const targetBlock = blocks.find(b => b.id === resolvedTarget);
        const targetIsRight = targetBlock?.isEntry === true;   // 入口节点用右侧 handle
        addEdge(block.id, resolvedTarget, block.jumpOp, 'jump', targetIsRight);
      }
    }
  }

  // Collect which nodes are jump targets
  const jumpTargetIds = new Set(
    edges.filter(e => e.data?.edgeType === 'jump').map(e => e.target)
  );

  for (const node of nodes) {
    node.data.sourceHandles = sourceCount[node.id] ?? 1;
    node.data.targetHandles = targetCount[node.id] ?? 1;
    node.data.hasIncomingJump = jumpTargetIds.has(node.id);
  }

  return { nodes, edges };
}

function getHandlePositions(n) {
  if (n <= 0) return [];
  const spacing = 18;
  const total = (n - 1) * spacing;
  return Array.from({ length: n },
    (_, i) => `calc(50% + ${i * spacing - total / 2}px)`);
}

// ─────────────────────────────────────────────
// Custom Node
// ─────────────────────────────────────────────

// Defined OUTSIDE the parent component to avoid re-creating on every render
// (React Flow warns when nodeTypes changes between renders)
function AsmBlockNode({ data }) {
  const { block, isEntry, isHalt } = data;
  const srcCount = data.sourceHandles ?? 0;
  const tgtCount = data.targetHandles ?? 0;

  return (
    <div className={clsx(styles.node, isEntry && styles.nodeEntry, isHalt && styles.nodeHalt)}>
      {/* Target handles (top) */}
      {!isEntry && getHandlePositions(tgtCount).map((left, i) => (
        <Handle
          key={`tgt-${i + 1}`}
          id={`tgt-${i + 1}`}
          type="target"
          position={Position.Top}
          className={clsx(styles.handle, styles.handleTop)}
          style={{ left, transform: 'translateX(-50%)' }}
        />
      ))}
      {isEntry && data.hasIncomingJump && (
        <Handle
          id="tgt-1"
          type="target"
          position={Position.Right}
          className={clsx(styles.handle, styles.handleRight)}
        />
      )}

      {block.entryLabel && (
        <div className={styles.nodeLabelBadge}>{block.entryLabel}</div>
      )}

      <div className={styles.nodeBody}>
        {block.instructions.map((row, idx) => {
          const op = row.opcode.trim().toUpperCase();
          const isJ = JUMP_OPCODES.has(op);
          const isH = HALT_OPCODES.has(op);
          return (
            <div key={idx} className={clsx(styles.instrRow, isJ && styles.instrJump, isH && styles.instrHalt)}>
              <span className={styles.instrOpcode}>{op || '\u00A0'}</span>
              <span className={styles.instrOperand}>{row.operand.trim() || '\u00A0'}</span>
            </div>
          );
        })}
      </div>

      {/* Source handles (bottom) */}
      {!isHalt && getHandlePositions(srcCount).map((left, i) => (
        <Handle
          key={`src-${i + 1}`}
          id={`src-${i + 1}`}
          type="source"
          position={Position.Bottom}
          className={clsx(styles.handle, styles.handleBottom)}
          style={{ left, transform: 'translateX(-50%)' }}
        />
      ))}
    </div>
  );
}

// nodeTypes must be stable (defined at module level)
const NODE_TYPES = { asmBlock: AsmBlockNode };

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

// rows prop: same shape as AsmEditor rows
// [{ id, label, opcode, operand }]
export default function AssemblyGraph({ rows = [] }) {

  const { nodes: computedNodes, edges } = useMemo(() => {
    const blocks = parseBlocks(rows);
    return blocksToGraph(blocks);
  }, [rows]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes);
  
  useEffect(() => {
    setNodes(computedNodes);
  }, [computedNodes, setNodes]);

  const isEmpty = rows.filter(r => r.opcode.trim()).length === 0;

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.title}>Assembly Graph</span>
        <span className={styles.badge}>{nodes.length} block{nodes.length !== 1 ? 's' : ''}</span>
      </div>

      <div className={styles.canvas}>
        {isEmpty ? (
          <div className={styles.empty}>
            <span className={styles.emptyText}>write instructions in the editor to see the graph</span>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.25, includeHiddenNodes: true }}
            minZoom={0.2} 
            maxZoom={1.5}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            proOptions={{ hideAttribution: true }}
            edgeTypes={EDGE_TYPES}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--grid-color, #ffffff0d)"
            />
            <Controls
              className={styles.controls}
              showInteractive={false}
            />
            <Panel position="bottom-right" className={styles.panel}>
              <span className={styles.hint}>drag to pan · scroll to zoom</span>
            </Panel>
          </ReactFlow>
        )}
      </div>
    </div>
  );
}