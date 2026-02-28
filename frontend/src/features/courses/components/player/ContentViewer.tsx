// src/pages/common/ContentViewer.tsx
import { useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import ScormPlayer from "@/features/courses/components/player/ScormPlayer";
import PdfViewer from "@/features/courses/components/player/PdfViewer";
import UniversalContentViewer from "@/features/courses/components/player/UniversalContentViewer";


interface ContentItem {
    id: number;
    item_type: string;
    title: string;
    content_url?: string | null;
}

interface ContentViewerProps {
    item?: ContentItem | null; // direct injection support
}

export default function ContentViewer({ item }: ContentViewerProps) {
    const { contentId } = useParams<{ contentId: string }>();

    const [content, setContent] = useState<ContentItem | null>(item || null);
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    /** -----------------------------------------------------
     *  Generate Signed URL for NON-SCORM content
     * ---------------------------------------------------- */
    const handleSignedUrl = useCallback(async (content: ContentItem) => {
        console.log("generated content url for:", content.content_url);
        if (!content.content_url || content.item_type === "link") {
            setLoading(false);
            return;
        }

        try {
            const signedRes = await api.get(`/scorm/signed-url?path=${encodeURIComponent(content.content_url)}`);
            setMediaUrl(signedRes.data.url);
        } catch (err) {
            console.error("âŒ Failed to get signed URL:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    /** -----------------------------------------------------
     *  FETCH CONTENT BY ID (Route-based only)
     * ---------------------------------------------------- */
    const fetchContentFromAPI = useCallback(async (id: string) => {
        try {
            setLoading(true);
            setMediaUrl(null);

            const res = await api.get(`/student/content/${id}`);
            const data: ContentItem = res.data;
            setContent(data);

            await handleSignedUrl(data);
        } catch (err) {
            console.error("âŒ Failed to fetch content:", err);
        } finally {
            setLoading(false);
        }
    }, [handleSignedUrl]);

    useEffect(() => {
        // If item is passed directly (from a list), do NOT fetch
        if (item) {
            setLoading(true);
            setMediaUrl(null);
            setContent(item);
            handleSignedUrl(item);
            return;
        }

        // Route-based content loading
        if (contentId) fetchContentFromAPI(contentId);
    }, [contentId, item, fetchContentFromAPI, handleSignedUrl]);

    /** -----------------------------------------------------
     *  Loading / Error UI
     * ---------------------------------------------------- */
    if (loading) return <p className="p-6">Loading...</p>;
    if (!content) return <p className="p-6 text-red-500">Content not found.</p>;

    const { item_type, title } = content;
    let viewerElement = null;
    const valcss = "w-[70vw] h-[80vh] ";
    /** -----------------------------------------------------
     *  CONTENT RENDERER (Based on Type)
     * ---------------------------------------------------- */
    switch (item_type) {
        case "video":
            viewerElement = mediaUrl ? (
                <video controls className={valcss}>
                    <source src={mediaUrl} type="video/mp4" />
                </video>
            ) : (
                <p>Loading video...</p>
            );
            break;

        case "audio":
            viewerElement = mediaUrl ? (
                <audio controls className={valcss}>
                    <source src={mediaUrl} type="audio/mpeg" />
                </audio>
            ) : (
                <p>Loading audio...</p>
            );
            break;

        case "pdf":
            viewerElement = mediaUrl ? (
                <PdfViewer url={mediaUrl} title={title} />
            ) : (
                <p>Loading PDF...</p>
            );
            break;

        case "scorm":
            viewerElement = (
                <div className={valcss}>
                    <ScormPlayer
                        contentUrl={content.content_url!}
                        contentId={content.id}
                    />
                </div>
            );
            break;
        case "link":
            viewerElement = (
                <UniversalContentViewer
                    type="link"
                    title={title}
                    url={content.content_url!}
                />
            );
            break;

        case "html":
            viewerElement = mediaUrl ? (
                <UniversalContentViewer
                    type="html"
                    title={title}
                    url={mediaUrl}
                />
            ) : (
                <p>Loading HTML...</p>
            );
            break;

        case "text":
            viewerElement = mediaUrl ? (
                <UniversalContentViewer
                    type="text"
                    title={title}
                    url={mediaUrl}
                />
            ) : (
                <p>Loading text...</p>
            );
            break;



        default:
            viewerElement = (
                <div className="p-4 border rounded bg-gray-50">
                    {title}
                </div>
            );
    }
    console.log("content viewer rendered");
    /** -----------------------------------------------------
     *  FINAL RENDER
     * ---------------------------------------------------- */
    return (
        <div className="flex-1 p-2 w-full mx-auto flex flex-col justify-center items-center h-full">
            {viewerElement}
        </div>
    );
}


