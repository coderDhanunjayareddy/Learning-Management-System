import React from "react";

const AdminStats: React.FC = () => {
    const stats = [
        { label: "Total Students", value: "1,240" },
        { label: "Active Courses", value: "36" },
        { label: "Exams Scheduled", value: "12" },
        { label: "Pending Approvals", value: "5" },
    ];

    return (
        <section>
            <h2 className="text-2xl font-semibold text-[#0b285d] mb-4">Overview</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-white p-5 rounded-lg shadow hover:shadow-lg transition"
                    >
                        <h3 className="text-gray-500 text-sm">{stat.label}</h3>
                        <p className="text-2xl font-bold text-[#0b285d]">{stat.value}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default AdminStats;
