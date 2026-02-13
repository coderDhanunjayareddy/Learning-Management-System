import logo from "/spectropy_logo.png"; // adjust path if needed
import { useNavigate } from "react-router-dom";

const Header = () => {
    const navigate = useNavigate();

    const navItem =
        "relative inline-block cursor-pointer transition-transform duration-100 hover:scale-110 \
    after:content-[''] after:absolute after:left-0 after:bottom-[-2px] \
    after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-300 \
    hover:after:w-full";

    return (
        <header className="w-full  py-6 px-4 flex justify-between items-center mb-4 md:flex-row flex-col md:gap-0 gap-4 ">

            {/* Logo */}
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate("/")}>
                <img
                    src={logo}
                    alt="Spectropy Logo"
                    className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
                />
            </div>

            {/* Navigation */}
            <nav className="flex flex-col md:flex-row md:space-x-6 text-lg font-medium text-center gap-2 md:gap-0">

                <span className={navItem} onClick={() => navigate("/")}>
                    Home
                </span>

                <span className={navItem} onClick={() => navigate("/courses")}>
                    Courses
                </span>

                <span className={navItem} onClick={() => navigate("/about")}>
                    Membership
                </span>

            </nav>
        </header>
    );
};

export default Header;
