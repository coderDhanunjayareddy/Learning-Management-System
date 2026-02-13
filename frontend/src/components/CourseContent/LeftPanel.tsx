import React, { useState } from "react";
import { useEffect } from "react";
import {
    DragDropContext,
    Droppable,
    Draggable,
    type DropResult,
} from "@hello-pangea/dnd";

import { BsThreeDotsVertical } from "react-icons/bs";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { MdAdd } from "react-icons/md";
import { useNavigate } from "react-router-dom";
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
    chapters: Chapter[];
    allItems: CourseItem[];
    onSelectItem: (item: CourseItem) => void;
    onAddChapter: () => void;
    onAddItem: (chapterId: number) => void;
    onReorderChapters: (newChapters: Chapter[]) => void;
    onReorderItems: (chapterId: number, newItems: CourseItem[]) => void;
    onUpdateFile: (item: CourseItem) => void;
    selectedItemId?: number;
}

const LeftPanel: React.FC<Props> = ({
    chapters,
    allItems,
    onSelectItem,
    onAddChapter,
    onAddItem,
    onReorderChapters,
    onReorderItems,
    onUpdateFile,
    selectedItemId,
}) => {
    const [expanded, setExpanded] = useState<number | null>(null);
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [openItemMenu, setOpenItemMenu] = useState<number | null>(null);
    const totalItems = allItems.length;
    const completedItems = allItems.filter(i => i.completion_status === "completed").length;
    const navigate = useNavigate();
    //const navigate = useNavigate();

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
        if (!window.confirm("Are you sure? This will delete the entire chapter and its items.")) return;

        try {
            // 🔍 get courseId from any item belonging to that chapter
            const courseId = allItems[0]?.course_id;

            await api.delete(`/admin/courses/${courseId}/content/${chapterId}`);

            const updated = chapters.filter(ch => ch.id !== chapterId);
            onReorderChapters(updated);

        } catch (err) {
            console.error("❌ Failed to delete chapter", err);
            alert("Failed to delete. Check console.");
        }
    };



    const deleteItem = async (itemId: number, chapterId: number) => {
        if (!window.confirm("Delete this item?")) return;

        try {
            const courseId = allItems.find(i => i.id === itemId)?.course_id;

            if (!courseId) {
                alert("Course ID missing. Delete aborted.");
                return;
            }

            await api.delete(`/admin/courses/${courseId}/content/${itemId}`);

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
        const courseId = allItems[0]?.course_id;
        await api.put(`/admin/courses/${courseId}/content/${chapterId}/rename`, {
            title: newName,
        });


        const updated = chapters.map(ch =>
            ch.id === chapterId ? { ...ch, title: newName } : ch
        );

        onReorderChapters(updated);
    };

    // ✨ Rename Item
    const renameItem = async (itemId: number, chapterId: number, newName: string) => {
        const courseId = allItems.find(i => i.id === itemId)?.course_id;

        await api.put(`/admin/courses/${courseId}/content/${itemId}/rename`, {
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
        <div className="w-full h-full bg-white border-r border-gray-200  flex flex-col">

            {/* Header WITHOUT Add Chapter button */}
            <div className=" py-2 border-b border-gray-200 shrink-0 flex justify-between items-center flex-col    ">
                {/* LEFT SIDE — BACK */}
                <div className="px-4 py-3 border-b border-gray-200 shrink-0 flex justify-between items-center w-full">
                    <button
                        onClick={() => navigate("/admin/dashboard")}
                        className="text-lg hover:text-lightmain"
                    >
                        <AiOutlineArrowLeft />
                    </button>

                    <h1 className="text-lg font-semibold">Course Content</h1>
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
                                                className="flex justify-between items-center px-2 py-2 hover:bg-gray-50 rounded-t-lg "
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



                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenu(openMenu === chapter.id ? null : chapter.id);
                                                    }}
                                                    className="relative"
                                                >
                                                    <BsThreeDotsVertical className="text-gray-600 hover:text-black cursor-pointer" />

                                                    {openMenu === chapter.id && (
                                                        <div className="absolute right-0 top-6 bg-white border shadow-md rounded-md w-40 z-20">

                                                            {/* Rename */}
                                                            <button
                                                                className="block w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
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
                                                                className="block w-full px-3 py-2 text-left hover:bg-gray-100 text-sm text-red-600"
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
                                            </div>

                                            {/* Items List */}
                                            {expanded === chapter.id && (
                                                <Droppable
                                                    droppableId={`items-${chapter.id}`}
                                                    type={`ITEM-${chapter.id}`}
                                                >
                                                    {(dropProvided) => (
                                                        <div
                                                            className="px-4 py-2 bg-white border-t border-gray-300"
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
                                                                                    ? "bg-blue-100 border border-blue-200 rounded"
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

                                                                            {openItemMenu === item.id && (
                                                                                <div className="absolute right-2 top-10 w-40 bg-white shadow-md border rounded-md z-50">

                                                                                    {/* Rename */}
                                                                                    <button
                                                                                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
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
                                                                                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
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
                                                                                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-red-600"
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

                                                            <button
                                                                onClick={() => onAddItem(chapter.id)}
                                                                className="text-blue-600 text-sm mt-2 hover:underline "
                                                            >
                                                                + Add Topic
                                                            </button>
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
            <div className="p-3 border-t border-gray-200 shrink-0">
                <button
                    onClick={onAddChapter}
                    className="flex items-center gap-1 px-3 py-2 bg-maincolor hover:bg-lightmain text-white rounded-md w-full justify-center"
                >
                    <MdAdd className="text-lg" />
                    Add Chapter
                </button>
            </div>

        </div>


    );
};

export default LeftPanel;
