import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Project from './pages/Project';
import About from './pages/About';

function App() {
  const [projects, setProjects] = useState(() => {
    const savedProjects = localStorage.getItem('projects');
    return savedProjects ? JSON.parse(savedProjects) : [];
  });

  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

  const addProject = (newProject) => {
    setProjects((prevProjects) => [...prevProjects, newProject]);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<Root><HomePage projects={projects} setProjects={setProjects} addProject={addProject} /></Root>}
        />
        <Route
          path="/about"
          element={<Root><About projects={projects} setProjects={setProjects} addProject={addProject} /></Root>}
        />
        <Route path="/project/:projectId" element={<Project projects={projects} />} />
      </Routes>
    </Router>
  );
}

// Root component to wrap pages with common layout
function Root({ children }) {
  return (
    <div>
      {children}
    </div>
  );
}

export default App;