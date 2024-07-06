import React, { useState } from 'react';
import { saveAs } from 'file-saver';

const Converter = () => {
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleConvert = () => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const parser = new DOMParser();
        const trxDoc = parser.parseFromString(e.target.result, 'application/xml');

        // Create a new XML document for the .playlist file
        const playlistDoc = document.implementation.createDocument(null, 'Playlist', null);
        const playlistRoot = playlistDoc.documentElement;
        playlistRoot.setAttribute('Version', '2.0');

        // Extract test cases from .trx file and add them to the .playlist file
        const unitTestResults = trxDoc.getElementsByTagName('UnitTestResult');
        const executions = trxDoc.getElementsByTagName('Execution');

        const failedExecutionIds = []

        //get executionIDs for all failed test cases
        for (let i = 0; i < unitTestResults.length; i++) {
          const unitTestResult = unitTestResults[i];
          if (unitTestResult.getAttribute('outcome') === 'Failed') {
            failedExecutionIds.push(unitTestResult.getAttribute("executionId"))
          }
        }

        //get executionIDs for all failed test cases
        let prj = ""
        let dnames = []
        let fqnames = []
        let cls = []
        for (let i = 0, j = 0; i < failedExecutionIds.length; j++) {
          const failedExecutionId = failedExecutionIds[i];
          if (executions[j].getAttribute('id') === failedExecutionId) {
            prj = executions[i].parentNode.children[1].getAttribute("className").split(".")[0] + ".Tests"
            dnames.push(executions[i].parentNode.getAttribute("name"))
            fqnames.push(executions[i].parentNode.children[1].getAttribute("className") + "." + executions[i].parentNode.children[1].getAttribute("name"))
            cls.push(executions[i].parentNode.children[1].getAttribute("className").split(".")[2])
            i++
            j = 0
          }
        }

        const includesAny = playlistDoc.createElement("Rule");
        includesAny.setAttribute("Name", "Includes");
        includesAny.setAttribute("Match", "Any")

        const includesAll = playlistDoc.createElement("Rule")
        includesAll.setAttribute("Match", "All")
        includesAny.appendChild(includesAll)

        const propertySolution = playlistDoc.createElement("Property")
        propertySolution.setAttribute("Name", "Solution")
        includesAll.appendChild(propertySolution)

        const solutionAny = playlistDoc.createElement("Rule")
        solutionAny.setAttribute("Match", "Any")
        includesAll.appendChild(solutionAny)

        const solutionAll = playlistDoc.createElement("Rule")
        solutionAll.setAttribute("Match", "All")
        solutionAny.appendChild(solutionAll)

        const propertyProject = playlistDoc.createElement("Property")
        propertyProject.setAttribute("Name", "Project")
        propertyProject.setAttribute("Value", prj)
        solutionAll.appendChild(propertyProject)

        const projectAny = playlistDoc.createElement("Rule")
        projectAny.setAttribute("Match", "Any")
        solutionAll.appendChild(projectAny)

        const projectAll = playlistDoc.createElement("Rule")
        projectAll.setAttribute("Match", "All")
        projectAny.appendChild(projectAll)

        const propertyNamespace = playlistDoc.createElement("Property")
        propertyNamespace.setAttribute("Name", "Namespace")
        propertyNamespace.setAttribute("Value", prj)
        projectAll.appendChild(propertyNamespace)

        const namespaceAny = playlistDoc.createElement("Rule")
        namespaceAny.setAttribute("Match", "Any")
        projectAll.appendChild(namespaceAny)

        for (let i = 0; i < dnames.length; i++) {
          const namespaceAll = playlistDoc.createElement("Rule")
          namespaceAll.setAttribute("Match", "All")
          namespaceAny.appendChild(namespaceAll)

          const propertyClass = playlistDoc.createElement("Property")
          propertyClass.setAttribute("Name", "Class")
          propertyClass.setAttribute("Value", cls[i])
          namespaceAll.appendChild(propertyClass)

          const classAny = playlistDoc.createElement("Rule")
          classAny.setAttribute("Match", "Any")
          namespaceAll.appendChild(classAny)

          const classAll = playlistDoc.createElement("Rule")
          classAll.setAttribute("Match", "All")
          classAny.appendChild(classAll)

          const propertyName = playlistDoc.createElement("Property")
          propertyName.setAttribute("Name", "TestWithNormalizedFullyQualifiedName")
          propertyName.setAttribute("Value", fqnames[i])
          classAll.appendChild(propertyName)

          const nameAny = playlistDoc.createElement("Rule")
          nameAny.setAttribute("Match", "Any")
          classAll.appendChild(nameAny)

          const propertyDisplayName = playlistDoc.createElement("Property")
          propertyDisplayName.setAttribute("Name", "DisplayName")
          propertyDisplayName.setAttribute("Value", dnames[i])
          nameAny.appendChild(propertyDisplayName)
        }

        playlistRoot.appendChild(includesAny);

        // Serialize the .playlist XML content
        const serializer = new XMLSerializer();
        const playlistContent = serializer.serializeToString(playlistDoc);

        // Create a Blob and save the file
        const blob = new Blob([playlistContent], { type: 'application/xml' });
        saveAs(blob, 'output.playlist');
      };

      reader.readAsText(file);
    }
  };

  return (
    <div>
      <h1>.trx to .playlist Converter</h1>
      <input type="file" accept=".trx" onChange={handleFileChange} />
      <button onClick={handleConvert} disabled={!file}>Convert</button>
    </div>
  );
};

export default Converter;
