import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import logo from "/spectropy_logo.png"; // replace with your actual logo path

const AdminNavbar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <header className="bg-[#0b285d] text-white shadow-md">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                {/* Left: Logo + Title */}
                <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => navigate("/admin")}
                >
                    <img
                        src={logo}
                        alt="Spectropy Logo"
                        className="h-10 w-10 rounded-md border border-white"
                    />
                    <h1 className="text-xl font-semibold tracking-wide">
                        Spectropy Admin
                    </h1>
                </div>

                {/* Right: User section */}
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="flex items-center gap-2 bg-[#12326f] px-3 py-2 rounded-md hover:bg-[#1a3b80] transition"
                    >
                        <span className="text-sm font-medium">
                            {user?.name || "Admin"}
                        </span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="white"
                            className={`w-4 h-4 transform transition-transform ${menuOpen ? "rotate-180" : "rotate-0"
                                }`}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Dropdown menu */}
                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-white text-gray-700 rounded-md shadow-lg overflow-hidden z-20">
                            <button
                                onClick={() => navigate("/admin/profile")}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition"
                            >
                                Profile
                            </button>
                            <button
                                onClick={() => navigate("/admin/settings")}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition"
                            >
                                Settings
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AdminNavbar;
