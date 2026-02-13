// src/components/CourseProgressBar.tsx

import React from "react";

interface Props {
    completed: number;
    total: number;
}

const CourseProgressBar: React.FC<Props> = ({ completed, total }) => {
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    return (
        <div className="w-full ">
            <div className="flex justify-between items-center">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
                    <div
                        className="h-full bg-maincolor transition-all duration-300"
                        style={{ width: `${percent}%` }}
                    ></div>
                </div>
                <span className="font-medium text-gray-700">{percent}%</span>

            </div>

            <p className="text-[10px] text-gray-500 mt-[-5px]">
                {completed} of {total} items
            </p>
        </div>
    );
};

export default CourseProgressBar;
