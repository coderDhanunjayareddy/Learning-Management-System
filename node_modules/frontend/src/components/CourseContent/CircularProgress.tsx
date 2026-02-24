interface CircularProgressProps {
    size?: number;
    strokeWidth?: number;
    progress: number; // percentage value (0-100)
}

export default function CircularProgress({
    size = 60,
    strokeWidth = 6,
    progress,
}: CircularProgressProps) {

    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center">
            <svg width={size} height={size}>
                <circle
                    stroke="#E5E7EB"  // gray-300
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    stroke="#2563EB"  // blue-600
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-500"
                />
            </svg>

            <span className="text-sm font-semibold mt-1 text-gray-700">
                {progress}%
            </span>
        </div>
    );
}
