import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';

const organization = 'x';
const pat = 'x';

const Converter = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [builds, setBuilds] = useState([]);
  const [selectedBuild, setSelectedBuild] = useState('');
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState('');
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectUrl = `https://dev.azure.com/${organization}/_apis/projects?api-version=6.0`;
        const authHeader = `Basic ${btoa(':' + pat)}`;

        const response = await axios.get(projectUrl, {
          headers: { Authorization: authHeader }
        });

        setProjects(response.data.value);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects();
  }, []);

  const handleProjectChange = async (event) => {
    const project = event.target.value;
    setSelectedProject(project);
    setBuilds([]);
    setSelectedBuild('');
    setRuns([]);
    setSelectedRun('');
    setAttachments([]);

    if (project) {
      try {
        const buildsUrl = `https://dev.azure.com/${organization}/${project}/_apis/build/builds?api-version=6.0`;
        const authHeader = `Basic ${btoa(':' + pat)}`;

        const response = await axios.get(buildsUrl, {
          headers: { Authorization: authHeader }
        });

        setBuilds(response.data.value);
      } catch (error) {
        console.error('Error fetching builds:', error);
      }
    }
  };

  const handleBuildChange = async (event) => {
    const build = event.target.value;
    setSelectedBuild(build);
    setRuns([]);
    setSelectedRun('');
    setAttachments([]);

    if (build) {
      try {
        const runsUrl = `https://dev.azure.com/${organization}/${selectedProject}/_apis/test/runs?buildIds=${build}&api-version=6.0`;
        const authHeader = `Basic ${btoa(':' + pat)}`;

        const response = await axios.get(runsUrl, {
          headers: { Authorization: authHeader }
        });

        setRuns(response.data.value);
      } catch (error) {
        console.error('Error fetching runs:', error);
      }
    }
  };

  const handleRunChange = async (event) => {
    const run = event.target.value;
    setSelectedRun(run);
    setAttachments([]);

    if (run) {
      try {
        const attachmentsUrl = `https://dev.azure.com/${organization}/${selectedProject}/_apis/test/runs/${run}/attachments?api-version=6.0`;
        const authHeader = `Basic ${btoa(':' + pat)}`;

        const response = await axios.get(attachmentsUrl, {
          headers: { Authorization: authHeader }
        });

        setAttachments(response.data.value);
      } catch (error) {
        console.error('Error fetching attachments:', error);
      }
    }
  };

  const handleDownload = async () => {
    try {
      const zipAttachment = attachments.find(att => att.fileName.endsWith('.zip'));
      if (!zipAttachment) {
        throw new Error('No .zip file found in the attachments.');
      }

      const downloadUrl = zipAttachment.url;
      const authHeader = `Basic ${btoa(':' + pat)}`;

      const zipResponse = await axios.get(downloadUrl, {
        headers: { Authorization: authHeader },
        responseType: 'blob'
      });

      const blob = new Blob([zipResponse.data], { type: 'application/zip' });
      saveAs(blob, `build-${selectedBuild}-run-${selectedRun}.zip`);

      alert('Download complete.');
    } catch (error) {
      console.error('Error downloading .zip file:', error);
      alert(`Failed to download the .zip file: ${error.message}`);
    }
  };

  return (
    <div>
      <h1>Azure DevOps Artifact Downloader</h1>
      <div>
        <label>Select Project:</label>
        <select value={selectedProject} onChange={handleProjectChange}>
          <option value="">--Select Project--</option>
          {projects.map((project) => (
            <option key={project.id} value={project.name}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Select Build:</label>
        <select value={selectedBuild} onChange={handleBuildChange} disabled={!selectedProject}>
          <option value="">--Select Build--</option>
          {builds.map((build) => (
            <option key={build.id} value={build.id}>
              {build.id}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Select Run:</label>
        <select value={selectedRun} onChange={handleRunChange} disabled={!selectedBuild}>
          <option value="">--Select Run--</option>
          {runs.map((run) => (
            <option key={run.id} value={run.id}>
              {run.id}
            </option>
          ))}
        </select>
      </div>
      <button onClick={handleDownload} disabled={!selectedRun}>
        Download .zip File
      </button>
    </div>
  );
};

export default Converter;
