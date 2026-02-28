import React from "react";

const AdminFooter: React.FC = () => {
    return (
        <footer className="bg-gray-100 text-center py-3 text-sm text-gray-500 mt-auto">
            © {new Date().getFullYear()} Spectropy LMS. All rights reserved.
        </footer>
    );
};

export default AdminFooter;
