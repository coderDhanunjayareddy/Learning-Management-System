import React from "react";
import AdminNavbar from "./components/AdminNavbar";
import AdminStats from "./components/AdminStats";
import AdminQuickActions from "./components/AdminQuickActions";
import AdminFooter from "./components/AdminFooter";

const AdminHome: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <AdminNavbar />
            <main className="flex-1 p-6">
                <AdminStats />
                <AdminQuickActions />
            </main>
            <AdminFooter />
        </div>
    );
};

export default AdminHome;
