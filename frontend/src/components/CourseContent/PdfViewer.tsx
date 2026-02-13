// src/components/PdfViewer.tsx
import { useEffect, useRef, useState } from "react";
import { AiOutlineZoomIn, AiOutlineZoomOut, AiOutlineFullscreen,AiOutlineExpand } from "react-icons/ai";

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfViewerProps {
    url: string;
    title?: string;
}

export default function PdfViewer({ url }: PdfViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [zoom, setZoom] = useState<number>(1.2); // Default zoom
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load PDF
    useEffect(() => {
        if (!url) return;
        setIsLoading(true);
        const loadPdf = async () => {
            try {
                const pdf = await pdfjsLib.getDocument(url).promise;
                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
                setCurrentPage(1);
            } catch (error) {
                console.error("Failed to load PDF:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadPdf();
    }, [url]);

    // Render page when pdfDoc, currentPage, or zoom changes
    useEffect(() => {
        if (!pdfDoc || currentPage < 1 || currentPage > numPages) return;
        const render = async () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const page = await pdfDoc.getPage(currentPage);
            const viewport = page.getViewport({ scale: zoom });

            const context = canvas.getContext("2d");
            if (!context) return;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport,
            }).promise;
        };
        render();
    }, [pdfDoc, currentPage, numPages, zoom]);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= numPages) {
            setCurrentPage(page);
        }
    };

    const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const page = Number(e.target.value);
        if (!isNaN(page)) goToPage(page);
    };

    const zoomIn = () => {
        setZoom((prev) => Math.min(prev + 0.2, 3));
    };

    const zoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.2, 0.5));
    };

    const fitToWidth = () => {
        if (!containerRef.current || !pdfDoc) return;
        const containerWidth = containerRef.current.clientWidth - 32;
        pdfDoc.getPage(currentPage).then((page) => {
            const viewport = page.getViewport({ scale: 1 });
            const scale = containerWidth / viewport.width;
            setZoom(Math.max(0.5, Math.min(scale, 3)));
        });
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div className="flex flex-col w-full h-full">
            <div
        ref={containerRef} // ✅ Moved here!
        className="flex flex-col w-full h-full bg-white"
    >
            {/* Header with navigation */}
            <div className="flex items-center justify-between w-full p-3 bg-gray-100 border-b">
                {/* Page Navigation */}
                <div className="flex items-center gap-2 text-sm">
                    <span>Page</span>
                    <input
                        type="number"
                        min="1"
                        max={numPages}
                        value={currentPage}
                        onChange={handlePageInputChange}
                        className="w-12 px-2 py-1 text-center border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span>/ {numPages}</span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Fit to Width (Fullscreen Icon) */}

                    <button onClick={toggleFullscreen} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Toggle fullscreen">
    <AiOutlineExpand size={20} />
</button>
                    <button
                        onClick={fitToWidth}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Fit to width"
                    >
                        <AiOutlineFullscreen size={20} />
                    </button>

                    {/* Zoom In */}
                    <button
                        onClick={zoomIn}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Zoom in"
                    >
                        <AiOutlineZoomIn size={20} />
                    </button>

                    {/* Zoom Out */}
                    <button
                        onClick={zoomOut}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Zoom out"
                    >
                        <AiOutlineZoomOut size={20} />
                    </button>

                    {/* Previous / Next */}
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className={`px-2.5 py-1 text-sm rounded ${
                            currentPage <= 1
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-blue-600 hover:bg-blue-50"
                        }`}
                    >
                        &lt; Previous
                    </button>

                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= numPages}
                        className={`px-2.5 py-1 text-sm rounded ${
                            currentPage >= numPages
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-blue-600 hover:bg-blue-50"
                        }`}
                    >
                        Next &gt;
                    </button>
                </div>
            </div>

            {/* PDF Content in Box */}
            <div className="flex-1 overflow-auto p-2 md:p-4 flex items-start justify-center" >
                {isLoading ? (
                    <div className="text-gray-500">Loading PDF...</div>
                ) : (
                    <div className="bg-white shadow rounded p-2 md:p-4 max-w-[95vw] max-h-[85vh] overflow-auto border border-gray-200">
                        <canvas ref={canvasRef} className="block mx-auto" />
                    </div>
                )}
            </div>
            </div>
        </div>
    );
}