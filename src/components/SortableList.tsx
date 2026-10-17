import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props<T extends { id: number }> {
  items: T[]
  onReorder: (items: T[]) => void
  renderItem: (item: T, index: number, handle: ReactNode) => ReactNode
  grid?: boolean
}

export default function SortableList<T extends { id: number }>({ items, onReorder, renderItem, grid }: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = items.findIndex((item) => item.id === active.id)
    const to = items.findIndex((item) => item.id === over.id)
    if (from < 0 || to < 0) return
    onReorder(arrayMove(items, from, to))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}>
        <ul className={grid ? 'grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4' : 'flex flex-col gap-2'}>
          {items.map((item, index) => (
            <SortableRow key={item.id} id={item.id}>
              {(handle) => renderItem(item, index, handle)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function SortableRow({ id, children }: { id: number; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label="Kéo để sắp xếp"
      className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  )

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'relative z-10 opacity-80 shadow-lg' : undefined}
    >
      {children(handle)}
    </li>
  )
}
