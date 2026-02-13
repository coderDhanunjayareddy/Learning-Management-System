import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- PEDAGOGICAL GRAPHICS (UNCHANGED) ---
type ChallengeId = 1 | 2 | 3 | 4 | 5;

interface ChallengeContent {
    title: string;
    subtitle?: string;
    desc: string;
    graphic: React.ReactNode;
    bg: string;
    text: string;
    accent: string;
}

const GraphicTheoretical = () => (
    <svg viewBox="0 0 300 200" className="w-full h-auto max-h-[220px] drop-shadow-xl">
        <path d="M20 180 L80 180 L80 80 L20 80 Z" fill="#bfdbfe" />
        <rect x="30" y="70" width="40" height="10" fill="#60a5fa" rx="2" />
        <text x="50" y="140" fontSize="12" textAnchor="middle" fill="#1e40af" fontWeight="bold">THEORY</text>
        <path d="M220 180 L280 180 L280 80 L220 80 Z" fill="#bfdbfe" />
        <motion.g animate={{ rotate: 360 }} transition={{ duration: 20, ease: "linear", repeat: Infinity }} style={{ transformOrigin: "250px 60px" }}>
            <path d="M235 45 L265 45 L265 75 L235 75 Z" fill="#f59e0b" />
            <circle cx="250" cy="60" r="20" stroke="#b45309" strokeWidth="4" fill="none" strokeDasharray="5 5" />
        </motion.g>
        <text x="250" y="140" fontSize="12" textAnchor="middle" fill="#b45309" fontWeight="bold">APPLICATION</text>
        <motion.path d="M80 90 L220 90" stroke="#ef4444" strokeWidth="4" strokeDasharray="10 5" fill="none" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
        <text x="150" y="80" fontSize="14" textAnchor="middle" fill="#ef4444" fontWeight="bold">GAP</text>
    </svg>
);

const GraphicBasics = () => (
    <svg viewBox="0 0 300 200" className="w-full h-auto max-h-[220px] drop-shadow-xl">
        <motion.g animate={{ rotate: [-2, 2, -2] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "150px 100px" }}>
            <rect x="100" y="40" width="100" height="25" fill="#fdba74" stroke="#c2410c" strokeWidth="2" rx="2" />
            <text x="150" y="57" fontSize="10" textAnchor="middle" fill="#c2410c" fontWeight="bold">HIGHER CLASS</text>
            <rect x="110" y="70" width="80" height="25" fill="#fdba74" stroke="#c2410c" strokeWidth="2" rx="2" />
        </motion.g>
        <rect x="90" y="110" width="35" height="25" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" rx="2" />
        <motion.rect x="135" y="110" width="35" height="25" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} />
        <rect x="180" y="110" width="35" height="25" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" rx="2" />
        <rect x="80" y="140" width="140" height="30" fill="#fee2e2" stroke="#ef4444" strokeWidth="3" rx="4" />
        <text x="150" y="160" fontSize="12" textAnchor="middle" fill="#dc2626" fontWeight="bold">WEAK BASICS</text>
    </svg>
);


const GraphicTeachers = () => (
    <svg viewBox="0 0 300 200" className="w-full h-auto max-h-[220px] drop-shadow-xl">
        <g transform="translate(160, 50)">
            <rect x="0" y="0" width="100" height="100" rx="8" fill="#e9d5ff" stroke="#7e22ce" strokeWidth="3" />
            <motion.circle cx="50" cy="50" r="30" stroke="#a855f7" fill="none" strokeWidth="4" strokeDasharray="10 5" animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "50px 50px" }} />
            <text x="50" y="125" fontSize="10" textAnchor="middle" fill="#7e22ce" fontWeight="bold">STEM CONCEPTS</text>
        </g>
        <g transform="translate(40, 80)">
            <circle cx="30" cy="30" r="20" fill="#d8b4fe" />
            <path d="M10 80 L50 80 L50 50 L10 50 Z" fill="#d8b4fe" />
            <rect x="45" y="40" width="40" height="8" fill="white" stroke="#cbd5e1" transform="rotate(-20 45 40)" />
            <text x="30" y="120" fontSize="10" textAnchor="middle" fill="#6b21a8">Standard Faculty</text>
        </g>
        <text x="150" y="30" fontSize="14" textAnchor="middle" fill="#7e22ce" fontWeight="bold">NO SPECIALIZED FACULTY</text>
        <motion.text x="130" y="90" fontSize="24" fill="#a855f7" animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>?</motion.text>
    </svg>
);

const GraphicPressure = () => (
    <svg viewBox="0 0 300 200" className="w-full h-auto max-h-[220px] drop-shadow-xl">
        <circle cx="150" cy="160" r="25" fill="#86efac" stroke="#16a34a" strokeWidth="3" />
        <path d="M140 160 Q150 175 160 160" stroke="#16a34a" strokeWidth="3" fill="none" />
        <motion.g animate={{ rotate: [-5, 5, -5], y: [0, 5, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "150px 130px" }}>
            <rect x="100" y="100" width="100" height="30" rx="4" fill="#bbf7d0" stroke="#16a34a" strokeWidth="2" />
            <text x="150" y="120" fontSize="10" textAnchor="middle" fill="#15803d" fontWeight="bold">SCHOOL</text>
            <rect x="105" y="65" width="90" height="30" rx="4" fill="#bbf7d0" stroke="#16a34a" strokeWidth="2" />
            <text x="150" y="85" fontSize="10" textAnchor="middle" fill="#15803d" fontWeight="bold">IIT / NEET</text>
            <motion.g animate={{ x: [-5, 5, -5] }} transition={{ duration: 1, repeat: Infinity }}>
                <rect x="115" y="30" width="70" height="30" rx="4" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
                <text x="150" y="50" fontSize="10" textAnchor="middle" fill="white" fontWeight="bold">INTEGRATED</text>
            </motion.g>
        </motion.g>
        <text x="150" y="20" fontSize="14" textAnchor="middle" fill="#15803d" fontWeight="bold">ONE STOP SOLUTION</text>
    </svg>
);

const GraphicBlind = () => (
    <svg viewBox="0 0 300 200" className="w-full h-auto max-h-[220px] drop-shadow-xl">
        <path d="M30 160 C 30 80, 270 80, 270 160" stroke="#94a3b8" strokeWidth="8" fill="none" />
        <line x1="30" y1="160" x2="270" y2="160" stroke="#94a3b8" strokeWidth="8" />
        <g transform="translate(70, 130)">
            <circle cx="0" cy="0" r="30" fill="#fee2e2" stroke="#ef4444" strokeWidth="3" />
            <line x1="0" y1="0" x2="0" y2="-25" stroke="#ef4444" strokeWidth="3" transform="rotate(-45)" />
            <text x="0" y="15" fontSize="10" textAnchor="middle" fill="#ef4444">METRICS</text>
            <text x="0" y="-5" fontSize="20" textAnchor="middle" fill="#ef4444" fontWeight="bold">0</text>
        </g>
        <g transform="translate(230, 130)">
            <circle cx="0" cy="0" r="30" fill="#fee2e2" stroke="#ef4444" strokeWidth="3" />
            <text x="0" y="5" fontSize="24" textAnchor="middle" fill="#ef4444" fontWeight="bold">?</text>
        </g>
        <text x="150" y="60" fontSize="16" textAnchor="middle" fill="#dc2626" fontWeight="bold">NO ANALYTICS</text>
        <rect x="30" y="0" width="240" height="100" fill="url(#fogGradient)" opacity="0.3" />
        <defs>
            <linearGradient id="fogGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity="0" />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity="1" />
            </linearGradient>
        </defs>
    </svg>
);

// --- MAIN COMPONENT ---

interface ChallengesFlowProps {
    activeModal: string | null;
    onClose?: () => void; // Kept for type safety, but effectively optional now
}

const ChallengesFlowFinal: React.FC<ChallengesFlowProps> = ({ activeModal }) => {
    // 1. INTERNAL STATE TO MANAGE VISIBILITY INDEPENDENTLY
    const [showModal, setShowModal] = useState(false);

    const [viewMode, setViewMode] = useState('intro'); // 'intro' | 'split'
    const [activeStep, setActiveStep] = useState<ChallengeId>(1);

    const lastScrollTime = useRef(0);
    const touchStartY = useRef(0);


    // 2. SYNC PROP TO INTERNAL STATE
    // This ensures if the parent opens it, we open. 
    // But we can close it ourselves without the parent.
    useEffect(() => {
        if (activeModal === 'challenges') {
            setShowModal(true);
            setViewMode('intro'); // Reset to intro on open
            setActiveStep(1);     // Reset to step 1 on open
        } else {
            // Optional: if parent closes it via prop, we also close
            setShowModal(false);
        }
    }, [activeModal]);



    // Timer: Auto transition from Intro to Split
    useEffect(() => {
        if (viewMode !== 'intro' || !showModal) return;
        const timer = setTimeout(() => {
            setViewMode('split');
        }, 5000);
        return () => clearTimeout(timer);
    }, [viewMode, showModal]);

    // Navigation Handlers
    const handleNext = () => setActiveStep((prev) => Math.min(prev + 1, 5) as ChallengeId);
    const handlePrev = () => setActiveStep((prev) => Math.max(prev - 1, 1) as ChallengeId);

    // Scroll & Touch Logic
    useEffect(() => {
        if (viewMode !== 'split' || !showModal) return;

        const handleWheel = (event: WheelEvent) => {
            const now = Date.now();
            if (now - lastScrollTime.current < 600) return;
            if (event.deltaY > 30) {
                handleNext();
                lastScrollTime.current = now;
            } else if (event.deltaY < -30) {
                handlePrev();
                lastScrollTime.current = now;
            }
        };

        const handleTouchStart = (e: TouchEvent) => touchStartY.current = e.touches[0].clientY;
        const handleTouchEnd = (e: TouchEvent) => {
            const touchEndY = e.changedTouches[0].clientY;
            const diff = touchStartY.current - touchEndY;
            if (Math.abs(diff) > 50) {
                if (diff > 0) handleNext();
                else handlePrev();
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [viewMode, showModal]);
    // --- KEYBOARD & PRESENTER REMOTE SUPPORT ---


    // --- DATA & CONFIG ---
    const contentData: Record<ChallengeId, ChallengeContent> = {
        1: {
            title: "CURRICULUM IS THEORETICAL",
            desc: "Students lack application-based learning which is essential for IIT, Olympiads, and competitive exams.",
            graphic: <GraphicTheoretical />, bg: "bg-blue-50", text: "text-blue-700", accent: "border-blue-600"
        },
        2: {
            title: "CONCEPTUAL GAPS INCREASE",
            subtitle: "OVER TIME",
            desc: "Weak basics in lower grades lead to exponential struggle in higher classes. Fundamental misunderstanding compounds.",
            graphic: <GraphicBasics />, bg: "bg-orange-50", text: "text-orange-700", accent: "border-orange-600"
        },
        3: {
            title: "TEACHER SHORTAGE IN STEM",
            desc: "Schools often lack specialized faculty for higher-level problem-solving and advanced STEM concepts required for competitive levels.",
            graphic: <GraphicTeachers />, bg: "bg-purple-50", text: "text-purple-700", accent: "border-purple-600"
        },
        4: {
            title: "PARENT EXPECTATIONS",
            subtitle: "INCREASING",
            desc: "Parents want IIT/NEET/Engineering foundation programs integrated directly into the school curriculum, seeking a one-stop solution.",
            graphic: <GraphicPressure />, bg: "bg-green-50", text: "text-green-700", accent: "border-green-600"
        },
        5: {
            title: "NO DIAGNOSTIC TRACKING",
            desc: "Schools do not receive accurate analytics for identifying specific student weaknesses, leading to ineffective remedial actions.",
            graphic: <GraphicBlind />, bg: "bg-red-50", text: "text-red-700", accent: "border-red-600"
        }
    };

    const steps = [
        { id: 1 as ChallengeId, title: "CURRICULUM IS THEORETICAL", color: "bg-blue-500", x: 250, y: 90 },
        { id: 2 as ChallengeId, title: "CONCEPTUAL GAPS INCREASE", color: "bg-orange-500", x: 450, y: 220 },
        { id: 3 as ChallengeId, title: "TEACHER SHORTAGE IN STEM", color: "bg-purple-500", x: 250, y: 350 },
        { id: 4 as ChallengeId, title: "PARENT EXPECTATIONS", color: "bg-green-500", x: 50, y: 480 },
        { id: 5 as ChallengeId, title: "NO DIAGNOSTIC TRACKING", color: "bg-red-500", x: 250, y: 610 },
    ];
    const tension = 120;

    return (
        <AnimatePresence>
            {/* 4. RENDER CONDITION CHANGED TO INTERNAL STATE */}
            {showModal && (
                <motion.div
                    className="h-full w-full inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >


                    {/* MODAL CONTAINER */}
                    <motion.div
                        className="relative w-full h-full max-w-6xl max-h-[800px] bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10"
                        initial={{ scale: 0.95, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: 20, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >

                        {/* === LEFT PANEL === */}
                        <motion.div
                            layout
                            className="relative border-r border-slate-100 bg-slate-50/80 flex flex-col items-center overflow-hidden shrink-0"
                            animate={{
                                // Responsive Width Logic:
                                // Mobile: Always 100% width (stacked)
                                // Desktop (split mode): 45% width
                                // Desktop (intro mode): 100% width
                                width: window.innerWidth < 768 ? "100%" : (viewMode === 'split' ? "40%" : "100%"),
                                height: window.innerWidth < 768 && viewMode === 'split' ? "300px" : "100%" // Shrink height on mobile split view
                            }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                        >
                            {/* Skip Intro Button */}
                            {viewMode === 'intro' && (
                                <button
                                    onClick={() => setViewMode('split')}
                                    className="absolute top-6 right-6 z-50 text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-widest border border-slate-200 px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 transition-colors"
                                >
                                    Skip Intro
                                </button>
                            )}

                            {/* Header - Stacks naturally at the top */}
                            <div className="w-full pt-8 pb-2 px-4 text-center z-20 shrink-0">
                                <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-none uppercase tracking-tight">
                                    The Core <span className="text-blue-600">Challenges</span>
                                </h2>
                                <p className="text-slate-400 text-[10px] md:text-xs mt-2 font-medium tracking-wide">
                                    Why Traditional Schooling Falls Short
                                </p>
                            </div>

                            {/* SVG CONTAINER - Fills remaining space */}
                            <div className="flex-1 w-full flex items-center justify-center relative min-h-0 p-4">

                                {/* RESPONSIVE WRAPPER:
                                    - max-h-full: prevents overflowing vertically
                                    - aspect-[5/7]: maintains the aspect ratio of the snake path (500x700)
                                    - w-auto / h-auto: lets it scale based on whichever dimension is tighter
                                */}
                                <div className="relative w-full max-w-[400px] aspect-[500/700] max-h-full">

                                    <svg className="w-full h-full overflow-visible" viewBox="0 0 500 700">
                                        <defs>
                                            <linearGradient id="splitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="50%" stopColor="#a855f7" />
                                                <stop offset="100%" stopColor="#ef4444" />
                                            </linearGradient>
                                        </defs>

                                        {/* BACKGROUND PATH */}
                                        <path
                                            d={`M ${steps[0].x} ${steps[0].y} 
                                            C ${steps[0].x} ${steps[0].y + tension}, ${steps[1].x} ${steps[1].y - tension}, ${steps[1].x} ${steps[1].y}
                                            C ${steps[1].x} ${steps[1].y + tension}, ${steps[2].x} ${steps[2].y - tension}, ${steps[2].x} ${steps[2].y}
                                            C ${steps[2].x} ${steps[2].y + tension}, ${steps[3].x} ${steps[3].y - tension}, ${steps[3].x} ${steps[3].y}
                                            C ${steps[3].x} ${steps[3].y + tension}, ${steps[4].x} ${steps[4].y - tension}, ${steps[4].x} ${steps[4].y}`}
                                            fill="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" strokeDasharray="12 12"
                                        />

                                        {/* ANIMATED PATH */}
                                        <motion.path
                                            d={`M ${steps[0].x} ${steps[0].y} 
                                            C ${steps[0].x} ${steps[0].y + tension}, ${steps[1].x} ${steps[1].y - tension}, ${steps[1].x} ${steps[1].y}
                                            C ${steps[1].x} ${steps[1].y + tension}, ${steps[2].x} ${steps[2].y - tension}, ${steps[2].x} ${steps[2].y}
                                            C ${steps[2].x} ${steps[2].y + tension}, ${steps[3].x} ${steps[3].y - tension}, ${steps[3].x} ${steps[3].y}
                                            C ${steps[3].x} ${steps[3].y + tension}, ${steps[4].x} ${steps[4].y - tension}, ${steps[4].x} ${steps[4].y}`}
                                            fill="none" stroke="url(#splitGradient)" strokeWidth="6" strokeLinecap="round"
                                            initial={{ pathLength: 0 }}
                                            animate={{
                                                pathLength: viewMode === 'intro' ? 1 : (activeStep - 0.5) / 4.5
                                            }}
                                            transition={{ duration: 1.5, ease: "easeInOut" }}
                                        />
                                    </svg>

                                    {/* NODES (Overlay on top of SVG) */}
                                    {steps.map((step, index) => {
                                        const isActive = activeStep === step.id && viewMode === 'split';
                                        const isIntro = viewMode === 'intro';
                                        const theme = contentData[step.id];

                                        // Calculate position as percentages
                                        const leftPos = `${(step.x / 500) * 100}%`;
                                        const topPos = `${(step.y / 700) * 100}%`;
                                        const isRightEdge = step.x > 350;

                                        return (
                                            <div
                                                key={step.id}
                                                className="absolute w-0 h-0 z-20"
                                                style={{ left: leftPos, top: topPos }}
                                            >
                                                <div
                                                    className="group cursor-pointer"
                                                    onClick={() => viewMode === 'split' && setActiveStep(step.id)}
                                                >
                                                    {/* CIRCLE NODE */}
                                                    <motion.div
                                                        className={`absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-14 md:h-14 rounded-full ${step.color} shadow-lg shadow-slate-300/50 border-2 md:border-4 ${isActive ? `border-slate-800` : 'border-white'} flex items-center justify-center transition-all duration-300
                                                            ${(!isActive && !isIntro) ? 'opacity-80 hover:opacity-100' : 'opacity-100'}`}
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: isActive ? 1.2 : 1 }}
                                                        transition={{ delay: index * 0.8, type: "spring", stiffness: 200 }}
                                                    >
                                                        <span className="text-white font-bold text-sm md:text-lg">{step.id}</span>
                                                        {isActive && (
                                                            <motion.div layoutId="activeRing" className={`absolute -inset-2 md:-inset-3 rounded-full border-[3px] ${theme.accent} border-dashed animate-spin-slow opacity-60`} />
                                                        )}
                                                    </motion.div>

                                                    {/* LABEL */}
                                                    <motion.div
                                                        className={`absolute top-1/2 -translate-y-1/2 w-28 md:w-36 px-2 md:px-4 py-1.5 md:py-2.5 rounded-lg shadow-sm border transition-all duration-300 pointer-events-none md:pointer-events-auto
                                                            ${isRightEdge ? 'right-8 md:right-10 text-right origin-right' : 'left-8 md:left-10 text-left origin-left'}
                                                            ${isActive
                                                                ? `${theme.bg} ${theme.text} ${theme.accent} opacity-100 scale-100 z-30`
                                                                : 'bg-white/70 text-slate-400 border-slate-100 opacity-0 md:opacity-80 scale-95 z-10 grayscale hover:grayscale-0 hover:scale-100 hover:opacity-100 hover:bg-white hover:text-slate-600 hover:shadow-md'}`}
                                                        initial={{ scale: 0.8, opacity: 0 }}
                                                        animate={{ scale: isActive ? 1.05 : 0.95, opacity: window.innerWidth < 768 && !isActive ? 0 : 1 }}
                                                        transition={{ delay: (index * 0.8) + 0.3 }}
                                                    >
                                                        <span className="text-[8px] md:text-[10px] font-extrabold uppercase tracking-wider block leading-tight">{step.title}</span>
                                                    </motion.div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>

                        {/* === RIGHT PANEL (Content) === */}
                        <motion.div
                            layout
                            // CHANGE 1: Added 'overflow-y-auto' for safety on small screens
                            // CHANGE 2: Reduced padding (p-6 vs p-12)
                            className="flex-1 bg-white relative p-6 md:p-12 flex flex-col items-center justify-center overflow-y-auto md:overflow-hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: viewMode === 'split' ? 1 : 0 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                        >


                            <AnimatePresence mode='wait'>
                                {viewMode === 'split' && (
                                    <motion.div
                                        key={activeStep}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                        className="w-full max-w-md text-center flex flex-col h-full md:h-auto justify-center"
                                    >
                                        {/* GRAPHIC CONTAINER */}
                                        {/* CHANGE 3: Responsive Height (h-32 vs h-48) */}
                                        <div className={`mb-4 md:mb-8 p-4 md:p-8 rounded-3xl ${contentData[activeStep].bg} border-2 ${contentData[activeStep].accent} shadow-sm flex justify-center items-center relative overflow-hidden h-32 md:h-48 shrink-0`}>
                                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-current to-transparent" style={{ color: contentData[activeStep].text.replace('text-', '') }}></div>
                                            {/* CHANGE 4: Internal Graphic Scale (scale-75 on mobile) */}
                                            <div className="relative z-10 w-full flex justify-center scale-75 md:scale-100 origin-center">
                                                {contentData[activeStep].graphic}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center gap-1 md:gap-2 mb-2 md:mb-4">
                                            <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border ${contentData[activeStep].bg} ${contentData[activeStep].text} ${contentData[activeStep].accent}`}>
                                                Challenge 0{activeStep}
                                            </span>

                                            {/* CHANGE 5: Responsive Text Sizes */}
                                            <h3 className="text-2xl md:text-4xl font-black text-slate-800 leading-none uppercase tracking-tight mt-1">
                                                {contentData[activeStep].title}
                                            </h3>

                                            {contentData[activeStep].subtitle && (
                                                <h4 className={`text-xs md:text-sm font-bold ${contentData[activeStep].text} opacity-80 uppercase tracking-widest`}>
                                                    {contentData[activeStep].subtitle}
                                                </h4>
                                            )}
                                        </div>

                                        <p className="text-slate-600 leading-relaxed text-xs md:text-base font-medium mx-auto max-w-sm px-2 md:px-0">
                                            {contentData[activeStep].desc}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* MANUAL CONTROLS */}
                            {viewMode === 'split' && (
                                // CHANGE 6: Adjusted positioning and button size for mobile
                                <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 flex gap-3 z-40">
                                    <button
                                        onClick={handlePrev}
                                        disabled={activeStep === 1}
                                        className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-600 bg-white shadow-sm"
                                    >
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        disabled={activeStep === 5}
                                        className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-600 bg-white shadow-sm"
                                    >
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>

                    <style>{`
                        .animate-spin-slow { animation: spin 12s linear infinite; }
                        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ChallengesFlowFinal;