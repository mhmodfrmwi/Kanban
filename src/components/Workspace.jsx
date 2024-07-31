import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DataContext } from "@/DataContext";
import Column from "./Column";
import { act, useContext, useMemo } from "react";
import { produce } from "immer";

const Workspace = () => {
  const { data, setData, selectedBoardIndex } = useContext(DataContext);
  const columns = data[selectedBoardIndex]?.columns;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const createNewColumn = (num) => ({
    id: Date.now(),
    title: `New Column ${num}`,
    tasks: [],
  });

  const addNewColumnHandler = () => {
    const num = data[selectedBoardIndex].columns.length;
    const newColumn = createNewColumn(num);

    setData((prev) =>
      produce(prev, (draft) => {
        draft[selectedBoardIndex].columns.push(newColumn);
      })
    );
  };

  const tasksIds = useMemo(() => {
    let tasksIds = [];

    if (!columns || columns.length === 0) return tasksIds;
    for (let column of columns) {
      tasksIds = [...tasksIds, ...(column.tasks || []).map((task) => task.id)];
    }
    return tasksIds;
  }, [columns]);

  const onDragEndHandler = (event) => {
    const { active, over } = event;

    if (!over) return; // If not dropped over any column
    if (active.id === over.id) return; // If no change in position

    const activeId = active.id;
    const overId = over.id;

    const overColumnId = over.data.current.columnId;
    const activeColumnId = active.data.current.columnId;

    if (!overColumnId || !activeColumnId) return;

    if (activeColumnId === overColumnId) {
      // If dropped within the same column, just reorder
      const column = columns.find((col) => col.id === activeColumnId);
      const oldIndex = column.tasks.findIndex((task) => task.id === activeId);
      const newIndex = column.tasks.findIndex((task) => task.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const updatedTasks = arrayMove(column.tasks, oldIndex, newIndex);
        const newColumns = columns.map((col) =>
          col.id === activeColumnId ? { ...col, tasks: updatedTasks } : col
        );

        setData((prev) =>
          produce(prev, (draft) => {
            draft[selectedBoardIndex].columns = newColumns;
          })
        );
      }
    } else {
      // If dropped into a different column
      const activeColumn = columns.find((col) => col.id === activeColumnId);
      const overColumn = columns.find((col) => col.id === overColumnId);

      const activeTask = activeColumn.tasks.find(
        (task) => task.id === activeId
      );

      if (activeTask) {
        const updatedOverColumnTasks = overColumn.tasks
          ? [...overColumn.tasks, activeTask]
          : [activeTask];
        const updatedActiveColumnTasks = activeColumn.tasks.filter(
          (task) => task.id !== activeId
        );

        const newColumns = columns.map((col) => {
          if (col.id === activeColumnId) {
            return { ...col, tasks: updatedActiveColumnTasks };
          }
          if (col.id === overColumnId) {
            return { ...col, tasks: updatedOverColumnTasks };
          }
          return col;
        });

        setData((prev) =>
          produce(prev, (draft) => {
            draft[selectedBoardIndex].columns = newColumns;
          })
        );
      }
    }
  };

  const onDragOverHandler = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overColumnId = over.data.current?.columnId;
    const activeColumnId = active.data.current?.columnId;

    if (!overColumnId || !activeColumnId || activeColumnId === overColumnId)
      return;

    const activeColumn = columns.find((column) => column.id === activeColumnId);
    const activeTask = activeColumn?.tasks.find((task) => task.id === activeId);

    if (!activeTask) return;

    const newColumns = columns.map((column) => {
      if (column.id === overColumnId) {
        return {
          ...column,
          tasks: [...column.tasks, activeTask],
        };
      }
      if (column.id === activeColumnId) {
        return {
          ...column,
          tasks: column.tasks.filter((task) => task.id !== activeId),
        };
      }
      return column;
    });

    setData((prev) =>
      produce(prev, (draft) => {
        draft[selectedBoardIndex].columns = newColumns;
      })
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEndHandler}
      onDragOver={onDragOverHandler}
    >
      <div className="flex h-[calc(100vh-97px)] flex-1 gap-6 overflow-auto bg-light-grey p-6">
        <SortableContext
          items={tasksIds}
          strategy={verticalListSortingStrategy}
        >
          {columns?.length &&
            columns.map((item, index) => (
              <Column
                key={`${item.id}${item.title}`}
                id={item.id}
                title={item.title}
                tasks={item.tasks}
                columnIndex={index}
              />
            ))}
        </SortableContext>
        <button
          className="w-72 shrink-0 self-start rounded-md bg-lines-light p-3 text-heading-l text-medium-grey"
          onClick={addNewColumnHandler}
        >
          + New Column
        </button>
      </div>
    </DndContext>
  );
};

export default Workspace;
