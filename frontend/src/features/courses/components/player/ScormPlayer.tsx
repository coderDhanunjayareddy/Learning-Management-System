import React, { useEffect, useRef, useState } from "react";
import ScormAPI from "@/lib/ScormAPIWrapper";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { resolveApiBaseUrl } from "@/lib/apiBaseUrl";


interface Props {
    contentUrl: string;  // "8/1762712441564/res/index.html"
    contentId: number;
}

const ScormPlayer: React.FC<Props> = ({ contentUrl, contentId }) => {
    const { user } = useAuth();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [proxyUrl, setProxyUrl] = useState<string>("");

    useEffect(() => {
        if (!user || !contentUrl) return;

        // âœ… Initialize SCORM API (must be global!)
        const api = new ScormAPI(user.id, contentId);
        const windowWithApi = window as Window & { API?: ScormAPI };
        windowWithApi.API = api;

        // âœ… Fix any double slashes in contentUrl
        const cleanPath = contentUrl.replace(/^\/+/, "");

        // âœ… Build proxy URL for backend
        const backendBase = resolveApiBaseUrl();

        const accessToken = localStorage.getItem("token");
        if (!accessToken) {
            setProxyUrl("");
            return;
        }

        const finalUrl = `${backendBase}/api/scorm/launch/${encodeURIComponent(accessToken)}/${cleanPath}`;

        setProxyUrl(finalUrl);

        return () => {
            api.LMSFinish();
            delete windowWithApi.API;
        };
    }, [user, contentUrl, contentId]);

    return (
        <div className="w-full h-full bg-gray-100">
            {proxyUrl ? (
                <iframe
                    ref={iframeRef}
                    src={proxyUrl}
                    title="SCORM Content"
                    className="w-full h-full border-none background-white"
                    allow="fullscreen"
                />
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-600 text-lg">Loading SCORM content...</p>
                </div>
            )}
        </div>
    );
};

export default ScormPlayer;

