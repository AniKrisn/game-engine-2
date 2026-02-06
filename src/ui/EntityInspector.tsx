import { useEffect, useState, useCallback } from "react";
import type { Editor, TLShapeId } from "tldraw";
import type { World, EntityId } from "../engine/types";
import { Position, TldrawShape } from "../components";
import { useTheme } from "./theme";

interface EntityInspectorProps {
  world: World;
  editor: Editor | null;
}

export function EntityInspector({ world, editor }: EntityInspectorProps) {
  const { theme } = useTheme();
  const [selectedEntity, setSelectedEntity] = useState<EntityId | null>(null);
  const [allEntities, setAllEntities] = useState<EntityId[]>([]);

  // Refresh entity list
  const refreshEntities = useCallback(() => {
    const entities = world.query(Position);
    setAllEntities(entities);
  }, [world]);

  // Find entity by shapeId
  const findEntityByShapeId = useCallback(
    (shapeId: string): EntityId | null => {
      const entities = world.query(TldrawShape);
      for (const entity of entities) {
        const shape = world.get(entity, TldrawShape);
        if (shape && shape.shapeId === shapeId) {
          return entity;
        }
      }
      return null;
    },
    [world]
  );

  // Handle selection changes from tldraw
  useEffect(() => {
    if (!editor) return;

    const handleSelectionChange = () => {
      const selectedIds = editor.getSelectedShapeIds();
      if (selectedIds.length === 1) {
        const entity = findEntityByShapeId(selectedIds[0] as string);
        setSelectedEntity(entity);
      } else {
        setSelectedEntity(null);
      }
    };

    const cleanup = editor.store.listen(handleSelectionChange, {
      source: "user",
      scope: "document",
    });
    handleSelectionChange();
    return cleanup;
  }, [editor, findEntityByShapeId]);

  // Periodically refresh entity list
  useEffect(() => {
    const interval = setInterval(refreshEntities, 100);
    return () => clearInterval(interval);
  }, [refreshEntities]);

  const entityCount = allEntities.length;
  const MAX_ENTITIES_TO_LIST = 20;

  return (
    <div style={{ fontSize: 13 }}>
      <div style={{ fontSize: 12, color: theme.text3, marginBottom: 8 }}>
        Entities
      </div>

      {entityCount <= MAX_ENTITIES_TO_LIST ? (
        <div
          style={{
            maxHeight: 150,
            overflowY: "auto",
            borderRadius: 6,
            background: theme.panelContrast,
            boxShadow: `inset 0 0 0 1px ${theme.divider}`,
          }}
        >
          {allEntities.map((entity) => (
            <div
              key={entity}
              style={{
                padding: "6px 8px",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "monospace",
                borderBottom: `1px solid ${theme.divider}`,
                background: entity === selectedEntity ? theme.selected : "transparent",
                color: entity === selectedEntity ? theme.selectedContrast : theme.text0,
              }}
              onClick={() => {
                if (selectedEntity === entity) {
                  setSelectedEntity(null);
                  editor?.selectNone();
                } else {
                  setSelectedEntity(entity);
                  const shape = world.get(entity, TldrawShape);
                  if (shape?.shapeId && editor) {
                    editor.select(shape.shapeId as TLShapeId);
                  }
                }
              }}
            >
              {entity.slice(0, 8)}...
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: theme.text3, fontStyle: "italic" }}>
          {entityCount} entities. Select a shape in the canvas.
        </div>
      )}
    </div>
  );
}

export default EntityInspector;
