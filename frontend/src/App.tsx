// src/App.tsx
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./app/providers/AuthProvider";

import { Toaster } from 'react-hot-toast';
import AppRoutes from "./app/routes/AppRoutes";






// ✅ Moved all routes into a separate component


// ✅ Wrap everything inside AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="bottom-right" />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
