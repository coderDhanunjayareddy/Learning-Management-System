import React, { useEffect, useState } from "react";
import {
    DragDropContext,
    Droppable,
    Draggable,
    type DropResult,
} from "@hello-pangea/dnd";

import { BsThreeDotsVertical } from "react-icons/bs";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { MdAdd } from "react-icons/md";
import { AiOutlineArrowLeft } from "react-icons/ai";
import CourseProgressBar from "../CourseContent/CourseProgressBar";
import api from "../../services/api";

//import { useNavigate } from "react-router-dom";

import {
    FaVideo,
    FaFilePdf,
    FaFileAlt,
    FaMusic,
    FaFolder,
    FaBoxOpen
} from "react-icons/fa";


interface CourseItem {
    id: number;
    course_id: number;
    parent_id: number | null;
    item_type: string;
    title: string;
    content_url?: string | null;
    order_index: number;
    created_at: string;
    completion_status?: string | null;

}

interface Chapter {
    id: number;
    title: string;
    items: CourseItem[];
}

interface Props {
    courseId: string | number;
    chapters: Chapter[];
    allItems: CourseItem[];
    onSelectItem: (item: CourseItem) => void;
    onAddChapter: () => void;
    onAddItem: (chapterId: number) => void;
    onReorderChapters: (newChapters: Chapter[]) => void;
    onReorderItems: (chapterId: number, newItems: CourseItem[]) => void;
    onUpdateFile: (item: CourseItem) => void;
    selectedItemId?: number;
    isGvjbClient?: boolean;
    apiPrefix?: string;
    readOnly?: boolean;
    onBack?: () => void;
    panelTitle?: string;
}

const LeftPanel: React.FC<Props> = ({
    courseId,
    chapters,
    allItems,
    onSelectItem,
    onAddChapter,
    onAddItem,
    onReorderChapters,
    onReorderItems,
    onUpdateFile,
    selectedItemId,
    isGvjbClient = false,
    apiPrefix = "/admin",
    readOnly = false,
    onBack,
    panelTitle = "Course Content",
}) => {
    const [expanded, setExpanded] = useState<number | null>(null);
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [openItemMenu, setOpenItemMenu] = useState<number | null>(null);
    const totalItems = allItems.length;
    const completedItems = allItems.filter(i => i.completion_status === "completed").length;
    const canEdit = !readOnly;
    const normalizedPrefix = apiPrefix.startsWith("/") ? apiPrefix : `/${apiPrefix}`;
    const resolvedCourseId = typeof courseId === "string" ? courseId : String(courseId);

    const toggleExpand = (chapterId: number) => {
        setExpanded(expanded === chapterId ? null : chapterId);
    };


    useEffect(() => {
        const handleClickOutside = () => {
            setOpenMenu(null);
            setOpenItemMenu(null);
        };

        // Close when clicking anywhere
        window.addEventListener("click", handleClickOutside);

        return () => window.removeEventListener("click", handleClickOutside);
    }, []);



    const deleteChapter = async (chapterId: number) => {
        if (!canEdit) return;
        if (!window.confirm("Are you sure? This will delete the entire chapter and its items.")) return;

        try {
            if (!resolvedCourseId) {
                alert("Course ID missing. Delete aborted.");
                return;
            }
            await api.delete(`${normalizedPrefix}/courses/${resolvedCourseId}/content/${chapterId}`);

            const updated = chapters.filter(ch => ch.id !== chapterId);
            onReorderChapters(updated);

        } catch (err) {
            console.error("❌ Failed to delete chapter", err);
            alert("Failed to delete. Check console.");
        }
    };



    const deleteItem = async (itemId: number, chapterId: number) => {
        if (!canEdit) return;
        if (!window.confirm("Delete this item?")) return;

        try {
            if (!resolvedCourseId) {
                alert("Course ID missing. Delete aborted.");
                return;
            }

            await api.delete(`${normalizedPrefix}/courses/${resolvedCourseId}/content/${itemId}`);

            const updatedChapters = chapters.map(ch =>
                ch.id === chapterId
                    ? { ...ch, items: ch.items.filter(i => i.id !== itemId) }
                    : ch
            );

            onReorderChapters(updatedChapters);

        } catch (err) {
            console.error("❌ Failed to delete item", err);
            alert("Failed to delete. Check console.");
        }
    };

    // ✨ Rename Chapter
    const renameChapter = async (chapterId: number, newName: string) => {
        if (!canEdit) return;
        if (!resolvedCourseId) return;
        await api.put(`${normalizedPrefix}/courses/${resolvedCourseId}/content/${chapterId}/rename`, {
            title: newName,
        });


        const updated = chapters.map(ch =>
            ch.id === chapterId ? { ...ch, title: newName } : ch
        );

        onReorderChapters(updated);
    };

    // ✨ Rename Item
    const renameItem = async (itemId: number, chapterId: number, newName: string) => {
        if (!canEdit) return;
        if (!resolvedCourseId) return;
        await api.put(`${normalizedPrefix}/courses/${resolvedCourseId}/content/${itemId}/rename`, {
            title: newName,
        });





        const updatedChapters = chapters.map(ch =>
            ch.id === chapterId
                ? {
                    ...ch,
                    items: ch.items.map(i =>
                        i.id === itemId ? { ...i, title: newName } : i
                    )
                }
                : ch
        );

        onReorderChapters(updatedChapters);
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case "video":
                return <FaVideo className="text-sm" />;
            case "pdf":
                return <FaFilePdf className="text-sm" />;
            case "audio":
                return <FaMusic className="text-sm" />;
            case "text":
                return <FaFileAlt className="text-sm" />;
            case "scorm":
                return <FaBoxOpen className="text-sm" />;
            default:
                return <FaFolder className="text-sm" />;
        }
    };

    const onDragEnd = (result: DropResult) => {
        if (!canEdit) return;
        const { source, destination, type } = result;
        if (!destination) return;

        if (type === "CHAPTER") {
            const reordered = Array.from(chapters);
            const [moved] = reordered.splice(source.index, 1);
            reordered.splice(destination.index, 0, moved);
            onReorderChapters(reordered);
            return;
        }

        if (type.startsWith("ITEM-")) {
            const chapterId = parseInt(type.split("-")[1]);
            const chapter = chapters.find((c) => c.id === chapterId);
            if (!chapter) return;

            const reorderedItems = Array.from(chapter.items);
            const [movedItem] = reorderedItems.splice(source.index, 1);
            reorderedItems.splice(destination.index, 0, movedItem);

            onReorderItems(chapterId, reorderedItems);
        }
    };

    return (
        <div
            className={`w-full h-full border-r flex flex-col ${isGvjbClient
                ? "bg-white/90 border-amber-100"
                : "bg-white border-gray-200"
                }`}
        >

            {/* Header WITHOUT Add Chapter button */}
            <div className={`shrink-0 flex flex-col ${isGvjbClient ? "border-amber-100" : "border-gray-200"}`}>
                {/* LEFT SIDE — BACK */}
                <div className={`px-4 py-3 border-b flex justify-between items-center w-full ${isGvjbClient ? "border-amber-100" : "border-gray-200"}`}>
                    {onBack ? (
                        <button
                            onClick={onBack}
                            className={`text-lg ${isGvjbClient ? "hover:text-amber-700" : "hover:text-lightmain"}`}
                        >
                            <AiOutlineArrowLeft />
                        </button>
                    ) : (
                        <div className="w-5" />
                    )}

                    <h1 className="text-lg font-semibold">{panelTitle}</h1>
                </div>
                {/* Progress Bar*/}
                <div className="w-full pt-4 px-4"><CourseProgressBar completed={completedItems} total={totalItems}
                /></div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="chapters" type="CHAPTER">
                    {(provided) => (
                        <div
                            className="p-3 flex-1 overflow-y-scroll"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            {chapters.map((chapter, chapterIndex) => (
                                <Draggable
                                    key={chapter.id}
                                    draggableId={`chapter-${chapter.id}`}
                                    index={chapterIndex}
                                >
                                    {(dragProvided) => (
                                        <div
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            className="mb-1  bg-white cursor-pointer"
                                        >

                                            {/* Chapter Header */}
                                            <div
                                                className={`flex justify-between items-center px-2 py-2 rounded-t-lg ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-50"}`}
                                            >
                                                <div
                                                    {...dragProvided.dragHandleProps}
                                                    className="flex items-center gap-1 flex-1 text-sm "
                                                    onClick={() => toggleExpand(chapter.id)}
                                                >
                                                    {expanded === chapter.id ? (
                                                        <FiChevronDown className="text-sm" />
                                                    ) : (
                                                        <FiChevronRight className="text-sm" />
                                                    )}
                                                    <span className="font-medium">{chapter.title}</span>
                                                </div>



                                                {canEdit && (
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenu(openMenu === chapter.id ? null : chapter.id);
                                                        }}
                                                        className="relative"
                                                    >
                                                        <BsThreeDotsVertical className="text-gray-600 hover:text-black cursor-pointer" />

                                                        {openMenu === chapter.id && (
                                                            <div className={`absolute right-0 top-6 bg-white border shadow-md rounded-md w-40 z-20 ${isGvjbClient ? "border-amber-200" : "border-gray-200"}`}>

                                                                {/* Rename */}
                                                                <button
                                                                    className={`block w-full px-3 py-2 text-left text-sm ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenMenu(null);

                                                                        const newName = prompt("Enter new chapter name:", chapter.title);
                                                                        if (newName && newName.trim()) {
                                                                            renameChapter(chapter.id, newName.trim());
                                                                        }
                                                                    }}
                                                                >
                                                                    ✏ Rename
                                                                </button>

                                                                {/* Delete */}
                                                                <button
                                                                    className={`block w-full px-3 py-2 text-left text-sm text-red-600 ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenMenu(null);
                                                                        deleteChapter(chapter.id);
                                                                    }}
                                                                >
                                                                    🗑 Delete
                                                                </button>
                                                            </div>
                                                        )}

                                                    </div>
                                                )}
                                            </div>

                                            {/* Items List */}
                                            {expanded === chapter.id && (
                                                <Droppable
                                                    droppableId={`items-${chapter.id}`}
                                                    type={`ITEM-${chapter.id}`}
                                                >
                                                    {(dropProvided) => (
                                                        <div
                                                            className={`px-4 py-2 bg-white border-t ${isGvjbClient ? "border-amber-200" : "border-gray-300"}`}
                                                            ref={dropProvided.innerRef}
                                                            {...dropProvided.droppableProps}
                                                        >
                                                            {chapter.items.map((item, itemIndex) => (
                                                                <Draggable
                                                                    key={item.id}
                                                                    draggableId={`item-${chapter.id}-${item.id}`}
                                                                    index={itemIndex}
                                                                >
                                                                    {(itemProvided) => (
                                                                        <div
                                                                            ref={itemProvided.innerRef}
                                                                            {...itemProvided.draggableProps}
                                                                            {...itemProvided.dragHandleProps}
                                                                            onClick={() => onSelectItem(item)}
                                                                            className={`flex justify-between items-center p-1 my-1 relative group cursor-pointer 
                                                                                    ${selectedItemId === item.id
                                                                                    ? isGvjbClient
                                                                                        ? "bg-amber-100 border border-amber-200 rounded"
                                                                                        : "bg-blue-100 border border-blue-200 rounded"
                                                                                    : isGvjbClient
                                                                                        ? "hover:bg-amber-50 hover:rounded"
                                                                                        : "hover:bg-blue-50 hover:rounded"
                                                                                }
`}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                {getIconForType(item.item_type)}
                                                                                <span className="text-gray-700 font-medium text-[14px]">
                                                                                    {item.title}
                                                                                </span>
                                                                            </div>

                                                                            {canEdit && (
                                                                                <div
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setOpenItemMenu(
                                                                                            openItemMenu === item.id ? null : item.id
                                                                                        );
                                                                                    }}
                                                                                    className="opacity-0 group-hover:opacity-100 transition"
                                                                                >
                                                                                    <BsThreeDotsVertical className="text-gray-500 hover:text-black cursor-pointer" />
                                                                                </div>
                                                                            )}

                                                                            {canEdit && openItemMenu === item.id && (
                                                                                <div className={`absolute right-2 top-10 w-40 bg-white shadow-md border rounded-md z-50 ${isGvjbClient ? "border-amber-200" : "border-gray-200"}`}>

                                                                                    {/* Rename */}
                                                                                    <button
                                                                                        className={`w-full text-left px-3 py-2 text-sm ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setOpenItemMenu(null);

                                                                                            const newName = prompt("Enter new item name:", item.title);
                                                                                            if (newName && newName.trim()) {
                                                                                                renameItem(item.id, chapter.id, newName.trim());
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        ✏ Rename
                                                                                    </button>

                                                                                    {/* Update / Replace file */}
                                                                                    <button
                                                                                        className={`w-full text-left px-3 py-2 text-sm ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setOpenItemMenu(null);
                                                                                            onUpdateFile(item);


                                                                                            // TODO: build replace modal
                                                                                        }}
                                                                                    >
                                                                                        🔄 Update
                                                                                    </button>

                                                                                    {/* Delete */}
                                                                                    <button
                                                                                        className={`w-full text-left px-3 py-2 text-sm text-red-600 ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setOpenItemMenu(null);
                                                                                            deleteItem(item.id, chapter.id);
                                                                                        }}
                                                                                    >
                                                                                        🗑 Delete
                                                                                    </button>
                                                                                </div>
                                                                            )}

                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))}

                                                            {dropProvided.placeholder}

                                                            {canEdit && (
                                                                <button
                                                                    onClick={() => onAddItem(chapter.id)}
                                                                    className={`text-sm mt-2 hover:underline ${isGvjbClient ? "text-amber-700" : "text-blue-600"}`}
                                                                >
                                                                    + Add Topic
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            )}
                                        </div>
                                    )}
                                </Draggable>
                            ))}

                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            {/* Bottom Add Chapter button */}
            {canEdit && (
                <div className={`p-3 border-t shrink-0 ${isGvjbClient ? "border-amber-100" : "border-gray-200"}`}>
                    <button
                        onClick={onAddChapter}
                        className={`flex items-center gap-1 px-3 py-2 rounded-md w-full justify-center ${isGvjbClient ? "bg-amber-400 text-slate-900 hover:bg-amber-500" : "bg-maincolor hover:bg-lightmain text-white"}`}
                    >
                        <MdAdd className="text-lg" />
                        Add Chapter
                    </button>
                </div>
            )}

        </div>


    );
};

export default LeftPanel;
