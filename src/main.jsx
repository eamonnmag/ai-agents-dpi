import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import DPIViz from "./agent-visualizer";

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <DPIViz />
    </StrictMode>
)