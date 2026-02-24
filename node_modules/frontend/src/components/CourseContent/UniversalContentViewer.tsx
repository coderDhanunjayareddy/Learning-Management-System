import { useEffect, useRef, useState } from "react";
import { AiOutlineExpand } from "react-icons/ai";

interface UniversalContentViewerProps {
    type: "link" | "html" | "text";
    title?: string;
    url?: string;
}

export default function UniversalContentViewer({
    type,
    title,
    url,
}: UniversalContentViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [textContent, setTextContent] = useState<string>("");
    const [htmlContent, setHtmlContent] = useState<string>("");
    const resolvedUrl = normalizeUrl(url);


    const lockLandscape = async () => {
        try {
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock("landscape");
            }
        } catch (err) {
            console.warn("Landscape lock not supported", err);
        }
    };

    const unlockOrientation = () => {
        try {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        } catch (err) {
            console.warn("Orientation unlock not supported", err);
        }
    };

    useEffect(() => {
        const onFullscreenChange = () => {
            const webkitDocument = document as Document & { webkitFullscreenElement?: Element };
            const isFullscreen =
                document.fullscreenElement ||
                webkitDocument.webkitFullscreenElement;

            if (isFullscreen) {
                lockLandscape();
            } else {
                unlockOrientation();
            }
        };

        document.addEventListener("fullscreenchange", onFullscreenChange);
        document.addEventListener("webkitfullscreenchange", onFullscreenChange);

        return () => {
            document.removeEventListener("fullscreenchange", onFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
        };
    }, []);

    /* -------------------------------
       Fullscreen toggle
    -------------------------------- */
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen?.();

        } else {
            document.exitFullscreen();
        }
    };

    /* -------------------------------
       Load text/html files
    -------------------------------- */
    useEffect(() => {
        if ((type === "text" || type === "html") && url) {
            fetch(url)
                .then(res => res.text())
                .then(text => {
                    if (type === "text") {
                        setTextContent(text);
                        return;
                    }

                    setHtmlContent(text);
                })
                .catch(err => console.error("Failed to load content file", err));
        }
    }, [type, url]);

    /* -------------------------------
       Render content
    -------------------------------- */
    const renderContent = () => {
        switch (type) {
            case "link":
                if (!resolvedUrl) {
                    return <p>No link provided.</p>;
                }

                return (
                    <div className="w-full h-full flex flex-col">
                        <div className="text-xs text-gray-500 mb-2">
                            If the content does not load, open it in a new tab:{" "}
                            <a
                                href={resolvedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 underline"
                            >
                                Open link
                            </a>
                        </div>
                        <iframe
                            src={resolvedUrl}
                            title={title}
                            className="flex-1 w-full"
                            allow="fullscreen"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                );

            case "html":
                return (
                    <iframe
                        src={htmlContent ? undefined : url}
                        srcDoc={htmlContent}
                        title={title}
                        className="w-full h-full"
                        sandbox="allow-scripts allow-same-origin"
                    />
                );

            case "text":
                return (
                    <pre className="whitespace-pre-wrap text-sm text-gray-800">
                        {textContent || "Loading text..."}
                    </pre>
                );

            default:
                return <p>Unsupported content</p>;
        }
    };

    /* -------------------------------
       FINAL RENDER (60% A- 50%)
    -------------------------------- */
    return (
        <div className="w-full h-full flex-1 flex items-center justify-center p-4">
            <div
                ref={containerRef}
                className="
                 relative
          flex flex-col
          bg-white
          shadow
          rounded
          border
          border-gray-200
          h-full w-full
        "

            >
                <button
                    onClick={toggleFullscreen}
                    className="absolute
      top-2
      right-2
      z-50
      p-1.5
      text-yellow-400
      hover:bg-blue-900
      rounded-4xl"
                    title="Fullscreen"
                >
                    <AiOutlineExpand size={20} />
                </button>


                {/* Content Area */}
                <div className="flex-1 overflow-auto p-2    ">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

function normalizeUrl(value?: string) {
    if (!value) return "";
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)) {
        return value;
    }
    return `https://${value}`;
}
