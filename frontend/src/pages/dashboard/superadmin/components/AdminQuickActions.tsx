import React from "react";

const AdminQuickActions: React.FC = () => {
    const actions = [
        { label: "📘 Manage Courses" },
        { label: "👩‍🎓 View Students" },
        { label: "🧾 Generate Reports" },
    ];

    return (
        <section>
            <h3 className="text-lg font-semibold mb-3 text-[#0b285d]">
                Quick Actions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {actions.map((action) => (
                    <button
                        key={action.label}
                        className="bg-[#0b285d] text-white px-6 py-3 rounded-lg hover:bg-blue-900 transition"
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        </section>
    );
};

export default AdminQuickActions;
