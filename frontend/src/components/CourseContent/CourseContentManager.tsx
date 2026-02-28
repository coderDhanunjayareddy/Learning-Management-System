import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import LeftPanel from "./LeftPanel";
import ContentViewer from "../../pages/common/ContentViewer";
import { SlControlPlay, SlControlRewind } from "react-icons/sl";
import toast from "react-hot-toast";

interface ContentItem {
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
  items: ContentItem[];
}

const ITEM_TYPES = [
  { value: "folder", label: "Chapter (Folder)" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio File" },
  { value: "pdf", label: "PDF Document" },
  { value: "scorm", label: "SCORM Package" },
  { value: "html", label: "HTML Lesson" },
  { value: "text", label: "Text File" },
  { value: "link", label: "External Link" },
];

const FILE_UPLOAD_TYPES = ["video", "audio", "pdf", "scorm", "html", "text"];
const URL_ONLY_TYPES = ["link"];

type CourseContentManagerProps = {
  courseId?: string | number;
  apiPrefix?: string;
  isGvjbClient?: boolean;
  readOnly?: boolean;
  disableFetch?: boolean;
  initialItems?: ContentItem[];
  onBack?: () => void;
  panelTitle?: string;
};

export default function CourseContentManager({
  courseId,
  apiPrefix = "/admin",
  isGvjbClient = false,
  readOnly = false,
  disableFetch = false,
  initialItems,
  onBack,
  panelTitle = "Course Content",
}: CourseContentManagerProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [itemType, setItemType] = useState("video");
  const [itemTitle, setItemTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [publicUrl, setPublicUrl] = useState("");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [allItems, setAllItems] = useState<ContentItem[]>([]);

  const [showUpdateFileModal, setShowUpdateFileModal] = useState(false);
  const [itemToUpdate, setItemToUpdate] = useState<ContentItem | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);

  const [chapterTitle, setChapterTitle] = useState("");
  const [addingChapter, setAddingChapter] = useState(false);

  const normalizedPrefix = apiPrefix.startsWith("/") ? apiPrefix : `/${apiPrefix}`;
  const resolvedCourseId = courseId ? String(courseId) : "";
  const canEdit = !readOnly && !disableFetch;

  const items = useMemo(() => allItems, [allItems]);
  const currentIndex = items.findIndex((i) => i.id === selectedItem?.id);
  const isFirstItem = currentIndex <= 0;

  const syncContentState = (itemsToSync: ContentItem[]) => {
    const topChapters = itemsToSync.filter((i) => i.parent_id === null);
    const chapterMap: Chapter[] = topChapters.map((chapter: ContentItem) => ({
      id: chapter.id,
      title: chapter.title,
      items: itemsToSync.filter((i: ContentItem) => i.parent_id === chapter.id),
    }));

    setChapters(chapterMap);
    setAllItems(itemsToSync.filter((i: ContentItem) => i.item_type !== "folder"));
  };

  const fetchContent = async () => {
    if (!resolvedCourseId) return;
    setLoading(true);
    try {
      const res = await api.get(`${normalizedPrefix}/courses/${resolvedCourseId}/content`);
      syncContentState(res.data);
    } catch (err) {
      console.error("Failed to load course content", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!resolvedCourseId) return;

    if (disableFetch) {
      if (initialItems) {
        syncContentState(initialItems);
      } else {
        setChapters([]);
        setAllItems([]);
      }
      return;
    }

    fetchContent();
  }, [resolvedCourseId, disableFetch, initialItems]);

  const handleReplaceFile = async () => {
    if (!itemToUpdate || !canEdit || !resolvedCourseId) return;
    setIsUpdating(true);

    const formData = new FormData();
    formData.append("title", itemToUpdate.title);
    if (newFile) {
      formData.append("file", newFile);
    }

    try {
      const res = await api.put(
        `${normalizedPrefix}/courses/${resolvedCourseId}/content/${itemToUpdate.id}/file`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const updatedUrl = res.data?.content_url;
      const updatedType = res.data?.item?.item_type || itemToUpdate.item_type;

      setChapters((prev) =>
        prev.map((ch) => ({
          ...ch,
          items: ch.items.map((i: ContentItem) =>
            i.id === itemToUpdate.id
              ? {
                ...i,
                title: itemToUpdate.title,
                content_url: updatedUrl || i.content_url,
                item_type: updatedType,
              }
              : i
          ),
        }))
      );

      setAllItems((prev) =>
        prev.map((i) =>
          i.id === itemToUpdate.id
            ? {
              ...i,
              title: itemToUpdate.title,
              content_url: updatedUrl || i.content_url,
              item_type: updatedType,
            }
            : i
        )
      );

      if (selectedItem?.id === itemToUpdate.id) {
        setSelectedItem((prev) =>
          prev
            ? {
              ...prev,
              title: itemToUpdate.title,
              content_url: updatedUrl || prev.content_url,
              item_type: updatedType,
            }
            : null
        );
      }

      setShowUpdateFileModal(false);
      setItemToUpdate(null);
      setNewFile(null);
      alert("Item updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update item");
    } finally {
      setIsUpdating(false);
    }
  };

  const openReplaceModal = (item: ContentItem) => {
    if (!canEdit) return;
    setItemToUpdate(item);
    setShowUpdateFileModal(true);
  };

  const handleAddChapter = async () => {
    if (!canEdit || !resolvedCourseId) return;
    if (!chapterTitle.trim()) {
      alert("Enter a chapter title");
      return;
    }

    await api.post(`${normalizedPrefix}/courses/${resolvedCourseId}/content`, {
      item_type: "folder",
      title: chapterTitle.trim(),
      parent_id: null,
    });

    setChapterTitle("");
    setAddingChapter(false);
    fetchContent();
  };

  const markItemCompletedLocal = (itemId: number) => {
    setChapters((prev) =>
      prev.map((ch) => ({
        ...ch,
        items: ch.items.map((i: ContentItem) =>
          i.id === itemId ? { ...i, completion_status: "completed" } : i
        ),
      }))
    );

    setAllItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, completion_status: "completed" } : i
      )
    );
  };

  const goToNext = () => {
    if (!selectedItem) return;
    const index = items.findIndex((i) => i.id === selectedItem.id);
    markItemCompletedLocal(selectedItem.id);
    if (index < items.length - 1) {
      setSelectedItem(items[index + 1]);
    }
  };

  const goToPrevious = () => {
    if (!selectedItem) return;
    const index = items.findIndex((i) => i.id === selectedItem.id);
    if (index > 0) {
      setSelectedItem(items[index - 1]);
    }
  };

  const handleAddItem = async (chapterId: number) => {
    if (!canEdit || !resolvedCourseId) {
      toast.error("Read-only mode");
      return;
    }

    if (!itemTitle.trim()) {
      toast.error("Enter a title");
      return;
    }

    setShowAddItemModal(false);
    try {
      if (FILE_UPLOAD_TYPES.includes(itemType)) {
        if (!selectedFile) {
          toast.error("Please select a file");
          return;
        }

        const uploadToast = toast.loading("Uploading content...");

        const formData = new FormData();
        formData.append("item_type", itemType);
        formData.append("title", itemTitle);
        formData.append("parent_id", chapterId.toString());
        formData.append("file", selectedFile);

        await api.post(
          `${normalizedPrefix}/courses/${resolvedCourseId}/content/upload`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        toast.success("Item added successfully!", { id: uploadToast });
      } else if (URL_ONLY_TYPES.includes(itemType)) {
        if (!publicUrl.trim()) {
          toast.error("Please enter a valid URL");
          return;
        }

        const uploadToast = toast.loading("Adding link...");

        await api.post(`${normalizedPrefix}/courses/${resolvedCourseId}/content`, {
          item_type: itemType,
          title: itemTitle,
          parent_id: chapterId,
          content_url: publicUrl.trim(),
        });

        toast.success("Link added successfully!", { id: uploadToast });
      }

      setItemTitle("");
      setSelectedFile(null);
      setPublicUrl("");
      fetchContent();
    } catch (err) {
      console.error("Failed to add item:", err);
      toast.error("Failed to add item");
    }
  };

  const handleReorderChapters = (newOrder: Chapter[]) => {
    setChapters(newOrder);
  };

  const handleReorderItems = (chapterId: number, newItems: ContentItem[]) => {
    setChapters((prev) =>
      prev.map((ch) => (ch.id === chapterId ? { ...ch, items: newItems } : ch))
    );
  };

  if (!resolvedCourseId) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Course not found. Please return to the courses page.
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {leftPanelOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setLeftPanelOpen(false)}
        />
      )}

      <div
        className={`
          fixed md:static
          inset-y-0 left-0
          z-50
          w-[320px]
          border-r
          ${isGvjbClient ? "border-amber-100 bg-white/90 backdrop-blur" : "border-gray-200 bg-white"}
          shrink-0
          transform transition-transform duration-300
          ${leftPanelOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        <LeftPanel
          courseId={resolvedCourseId}
          chapters={chapters}
          allItems={items}
          selectedItemId={selectedItem?.id}
          isGvjbClient={isGvjbClient}
          readOnly={!canEdit}
          apiPrefix={normalizedPrefix}
          onBack={onBack}
          panelTitle={panelTitle}
          onSelectItem={(item: ContentItem) => {
            setSelectedItem(item);
            setLeftPanelOpen(false);
          }}
          onAddChapter={() => setAddingChapter(true)}
          onAddItem={(id) => {
            setSelectedChapter(id);
            setShowAddItemModal(true);
          }}
          onReorderChapters={handleReorderChapters}
          onReorderItems={handleReorderItems}
          onUpdateFile={openReplaceModal}
        />
      </div>

      <div
        className={`flex-1 shrink-0 overflow-hidden flex flex-col ${isGvjbClient ? "bg-white/80" : "bg-white"
          }`}
      >
        <div
          className={`w-full border-b px-4 pt-4 pb-2.5 ${isGvjbClient ? "border-amber-100 bg-white/70 backdrop-blur" : "border-gray-200 bg-white"
            }`}
        >
          <div className="flex items-center gap-3 mb-3 md:mb-0 md:flex-row md:justify-between md:items-center">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setLeftPanelOpen(true)}
                className={`md:hidden p-2 border rounded-md ${isGvjbClient ? "border-amber-200" : "border-gray-300"
                  }`}
                aria-label="Open course syllabus"
              >
                Menu
              </button>

              <h1 className="text-lg md:text-xl font-semibold truncate">
                {selectedItem ? selectedItem.title.toUpperCase() : ""}
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={goToPrevious}
                disabled={!selectedItem || isFirstItem}
                className={`flex items-center gap-2 py-2 rounded-md border justify-center transition-all duration-200 text-xs w-20 ${isGvjbClient ? "bg-amber-400 text-slate-900 border-amber-200" : "bg-maincolor text-white"
                  }
                ${!selectedItem || isFirstItem
                    ? "opacity-40 cursor-not-allowed"
                    : isGvjbClient
                      ? "hover:bg-amber-500 hover:border-amber-300 active:scale-95"
                      : "hover:bg-lightmain hover:border-gray-300 active:scale-95"
                  }`}
              >
                <SlControlRewind /> Previous
              </button>

              <button
                onClick={goToNext}
                disabled={!selectedItem}
                className={`flex items-center gap-2 py-2 rounded-md border justify-center transition-all duration-200 text-xs w-20 ${isGvjbClient ? "bg-amber-400 text-slate-900 border-amber-200" : "bg-maincolor text-white"
                  }
                ${!selectedItem
                    ? "opacity-40 cursor-not-allowed"
                    : isGvjbClient
                      ? "hover:bg-amber-500 hover:border-amber-300 active:scale-95"
                      : "hover:bg-lightmain hover:border-gray-300 active:scale-95"
                  }`}
              >
                Next <SlControlPlay />
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 md:hidden">
            <button
              onClick={goToPrevious}
              disabled={!selectedItem || isFirstItem}
              className={`p-2 rounded-md border ${isGvjbClient ? "bg-amber-400 text-slate-900 border-amber-200" : "bg-maincolor text-white"
                }
              ${!selectedItem || isFirstItem ? "opacity-40 cursor-not-allowed" : "active:scale-95"}`}
              aria-label="Previous"
            >
              <SlControlRewind />
            </button>

            <button
              onClick={goToNext}
              disabled={!selectedItem}
              className={`p-2 rounded-md border ${isGvjbClient ? "bg-amber-400 text-slate-900 border-amber-200" : "bg-maincolor text-white"
                }
              ${!selectedItem ? "opacity-40 cursor-not-allowed" : "active:scale-95"}`}
              aria-label="Next"
            >
              <SlControlPlay />
            </button>
          </div>
        </div>

        {!selectedItem ? (
          <p className="text-gray-400 text-center mt-20">Select a chapter</p>
        ) : (
          <ContentViewer item={selectedItem} />
        )}
      </div>

      {showAddItemModal && canEdit && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div
            className={`bg-white w-96 p-6 rounded shadow-lg ${isGvjbClient ? "border border-amber-100" : ""
              }`}
          >
            <h3 className="text-lg font-semibold mb-4">Add Item</h3>

            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className={`w-full p-2 border rounded mb-3 ${isGvjbClient ? "border-amber-200" : "border-gray-300"
                }`}
            >
              {ITEM_TYPES.filter((t) => t.value !== "folder").map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
              placeholder="Topic Name"
              className={`w-full p-2 border rounded mb-3 ${isGvjbClient ? "border-amber-200" : "border-gray-300"
                }`}
            />

            {URL_ONLY_TYPES.includes(itemType) && (
              <input
                type="url"
                value={publicUrl}
                onChange={(e) => setPublicUrl(e.target.value)}
                placeholder="Enter external link (https://...)"
                className={`w-full p-2 border rounded mb-3 ${isGvjbClient ? "border-amber-200" : "border-gray-300"
                  }`}
              />
            )}

            {FILE_UPLOAD_TYPES.includes(itemType) && (
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className={`w-full p-2 border rounded mb-3 ${isGvjbClient ? "border-amber-200" : "border-gray-300"
                  }`}
              />
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowAddItemModal(false)}
                className={`px-4 py-2 border rounded ${isGvjbClient
                  ? "border-amber-200 hover:bg-amber-50"
                  : "border-gray-300 hover:bg-gray-50"
                  }`}
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (selectedChapter !== null) {
                    handleAddItem(selectedChapter);
                  }
                }}
                className={`px-4 py-2 rounded ${isGvjbClient
                  ? "bg-amber-400 text-slate-900 hover:bg-amber-500"
                  : "bg-blue-900 text-white hover:bg-blue-700"
                  }`}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {addingChapter && canEdit && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div
            className={`bg-white w-96 p-6 rounded shadow-lg ${isGvjbClient ? "border border-amber-100" : ""
              }`}
          >
            <h3 className="text-lg font-semibold mb-4">Add Chapter</h3>

            <input
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder="Chapter title"
              className={`w-full p-2 border rounded mb-3 ${isGvjbClient ? "border-amber-200" : "border-gray-300"
                }`}
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setAddingChapter(false)}
                className={`px-4 py-2 border rounded ${isGvjbClient
                  ? "border-amber-200 hover:bg-amber-50"
                  : "border-gray-300 hover:bg-gray-50"
                  }`}
              >
                Cancel
              </button>

              <button
                onClick={handleAddChapter}
                className={`px-4 py-2 rounded ${isGvjbClient
                  ? "bg-amber-400 text-slate-900 hover:bg-amber-500"
                  : "bg-blue-900 text-white hover:bg-blue-700"
                  }`}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpdateFileModal && canEdit && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div
            className={`bg-white w-96 p-6 rounded shadow-lg ${isGvjbClient ? "border border-amber-100" : ""
              }`}
          >
            <h3 className="text-lg font-semibold mb-4">
              Update Item - {itemToUpdate?.title}
            </h3>

            <label className="block text-sm font-medium mb-1">Item Name</label>
            <input
              type="text"
              value={itemToUpdate?.title || ""}
              onChange={(e) =>
                setItemToUpdate((prev) =>
                  prev ? { ...prev, title: e.target.value } : null
                )
              }
              className={`w-full p-2 border rounded mb-4 ${isGvjbClient ? "border-amber-200" : "border-gray-300"
                }`}
            />

            <label className="block text-sm font-medium mb-1">Select New File</label>
            <div className="mb-3 text-sm text-gray-600">
              Current Type: <span className="font-medium">{itemToUpdate?.item_type}</span>
            </div>

            <input
              type="file"
              onChange={(e) => setNewFile(e.target.files?.[0] || null)}
              className={`w-full p-2 border rounded mb-4 ${isGvjbClient ? "border-amber-200" : "border-gray-300"
                }`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Uploading a different file type will automatically change the content type.
            </p>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => !isUpdating && setShowUpdateFileModal(false)}
                disabled={isUpdating}
                className={`px-4 py-2 border rounded disabled:opacity-50 ${isGvjbClient ? "border-amber-200 hover:bg-amber-50" : "border-gray-300 hover:bg-gray-50"
                  }`}
              >
                Cancel
              </button>

              <button
                onClick={handleReplaceFile}
                disabled={isUpdating}
                className={`px-4 py-2 rounded ${isUpdating
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : isGvjbClient
                    ? "bg-amber-400 text-slate-900 hover:bg-amber-500"
                    : "bg-maincolor text-white hover:bg-lightmain"
                  }`}
              >
                {isUpdating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating...
                  </div>
                ) : (
                  "Update"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-sm text-gray-400 py-1">
          Refreshing content...
        </div>
      )}
    </div>
  );
}
