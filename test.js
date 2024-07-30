const fs = require('fs');
const path = require('path');

/**
 * Extract content between opening and closing tags.
 * @param {string} xml - The XML string to parse.
 * @param {string} tag - The XML tag to extract values from.
 * @returns {Array<Object>} - An array of extracted values.
 */
function extractTagContent(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'gs');
  let matches;
  const values = [];
  while ((matches = regex.exec(xml)) !== null) {
    values.push(matches[1]);
  }
  return values;
}

/**
 * Extract attribute values from XML tags.
 * @param {string} xml - The XML string to parse.
 * @param {string} tag - The XML tag to search for.
 * @param {Array<string>} attributes - The attribute names to extract values from.
 * @returns {Array<Object>} - An array of extracted attribute objects.
 */
function extractAttributes(xml, tag, attributes) {
  const regex = new RegExp(`<${tag}([^>]*)>`, 'g');
  let matches;
  const values = [];
  while ((matches = regex.exec(xml)) !== null) {
    const attrString = matches[1];
    const attrValues = {};
    attributes.forEach(attr => {
      const attrRegex = new RegExp(`${attr}="([^"]*)"`, 'i');
      const attrMatch = attrRegex.exec(attrString);
      if (attrMatch) {
        attrValues[attr] = attrMatch[1];
      }
    });
    values.push(attrValues);
  }
  return values;
}

/**
 * Extract child elements of a specified XML tag.
 * @param {string} xml - The XML string to parse.
 * @param {string} parentTag - The parent XML tag to search for.
 * @param {string} childTag - The child XML tag to extract values from.
 * @returns {Array<Object>} - An array of extracted child elements.
 */
function extractChildElements(xml, parentTag, childTag) {
  const parentRegex = new RegExp(`<${parentTag}[^>]*>(.*?)<\/${parentTag}>`, 'gs');
  const childRegex = new RegExp(`<${childTag}[^>]*>(.*?)<\/${childTag}>`, 'gs');
  let parentMatches;
  const children = [];
  while ((parentMatches = parentRegex.exec(xml)) !== null) {
    const parentContent = parentMatches[1];
    let childMatches;
    while ((childMatches = childRegex.exec(parentContent)) !== null) {
      children.push(childMatches[1]);
    }
  }
  return children;
}

/**
 * Find the immediate parent element of a specified XML tag based on a child's attribute.
 * @param {string} xml - The XML string to parse.
 * @param {string} childTag - The child XML tag to search for.
 * @param {string} childAttribute - The attribute of the child tag to match.
 * @param {string} attributeValue - The value of the attribute to match.
 * @returns {Array<string>} - An array of immediate parent elements as strings.
 */
function findParentByChildAttribute(xml, childTag, childAttribute, attributeValue) {
  const childRegex = new RegExp(`<${childTag}[^>]*${childAttribute}="${attributeValue}"[^>]*>`, 'gs');
  const parents = [];

  let match;
  while ((match = childRegex.exec(xml)) !== null) {
    const childIndex = match.index;
    const precedingXml = xml.slice(0, childIndex);
    const parentTagMatch = precedingXml.match(/<([^\/][^>]*)>[^<]*$/);

    if (parentTagMatch) {
      const parentTag = parentTagMatch[1];
      parents.push(parentTag);
    }
  }

  return parents;
}

/**
 * Find the immediate next sibling element of a specified XML tag based on a child's attribute.
 * @param {string} xml - The XML string to parse.
 * @param {string} childTag - The child XML tag to search for.
 * @param {string} childAttribute - The attribute of the child tag to match.
 * @param {string} attributeValue - The value of the attribute to match.
 * @returns {Array<string>} - An array of immediate next sibling elements as strings.
 */
function findNextSiblingByChildAttribute(xml, childTag, childAttribute, attributeValue) {
  const childRegex = new RegExp(`<${childTag}[^>]*${childAttribute}="${attributeValue}"[^>]*>`, 'gs');
  const siblingRegex = /<([^\/][^>]*)>/;
  const siblings = [];

  let match;
  while ((match = childRegex.exec(xml)) !== null) {
    const childIndex = match.index + match[0].length;
    const followingXml = xml.slice(childIndex);

    const siblingMatch = siblingRegex.exec(followingXml);
    if (siblingMatch) {
      const siblingTag = siblingMatch[0];
      siblings.push(siblingTag);
    }
  }

  return siblings;
}

const parseStringToXmlObject = (inputString) => {
  // Manually construct the XML structure
  const match = inputString.match(/(\w+)\s+(.+)/);
  if (!match) {
    throw new Error('Invalid input string format');
  }

  const tagName = match[1];
  const attributesString = match[2];

  // Parse attributes
  const attributes = {};
  const attrPattern = /(\w+)="([^"]*)"/g;
  let attrMatch;
  while ((attrMatch = attrPattern.exec(attributesString)) !== null) {
    attributes[attrMatch[1]] = attrMatch[2];
  }

  // Construct the XML object
  const xmlObject = {
    tagName,
    attributes,
    children: []
  };

  return xmlObject;
};

/**
 * Parse a .trx file to a JavaScript object.
 * @param {string} filePath - Path to the .trx file.
 * @returns {Object} - Parsed .trx data as a JavaScript object.
 */
function parseTrxFile(filePath) {
  try {
    const xmlContent = fs.readFileSync(filePath, 'utf-8');

    // const testRun = extractTagContent(xmlContent, 'TestRun')[0];
    // const results = extractTagContent(xmlContent, 'Results')[0];
    const unitTestResults = extractAttributes(xmlContent, 'UnitTestResult', ['executionId', 'outcome']);
    const failedTestCases = unitTestResults.filter(utr => utr.outcome === 'Failed')

    const testUnits = failedTestCases.map(ftc => findParentByChildAttribute(xmlContent, 'Execution', 'id', ftc.executionId))
    const testMethods = failedTestCases.map(ftc => findNextSiblingByChildAttribute(xmlContent, 'Execution', 'id', ftc.executionId))

    const testUnitNames = testUnits.map(tu => parseStringToXmlObject(tu[0]).attributes.name)
    const classNames = testMethods.map(tm => parseStringToXmlObject(tm[0]).attributes.className)
    const names = testMethods.map(tm => parseStringToXmlObject(tm[0]).attributes.name)

    const solutionName = classNames[0].split(".")[0] + "." + classNames[0].split(".")[1]
    const namespace = solutionName
    let fullyQualifiedNames = []
    for (let i = 0; i < classNames.length; i++) {
      fullyQualifiedNames.push(classNames[i] + "." + names[i])
    }

    let testNames = []
    let scenarioNames = []
    for (let i = 0; i < classNames.length; i++) {
      let splitClassName = classNames[i].split(".")
      scenarioNames.push(splitClassName[2])
      testNames.push(testUnitNames[i].split(" in " + splitClassName[2])[0])
    }

    return {
      solution: solutionName,
      namespace: namespace,
      scenarios: scenarioNames,
      qualifiednames: fullyQualifiedNames,
      testnames: testNames
    }
  } catch (error) {
    console.error('Error reading or parsing .trx file:', error);
    return null;
  }
}

// Example usage
const trxFilePath = path.join(__dirname, 'DEPOB_UI_Automation.trx'); // Replace with your .trx file path

const parsedData = parseTrxFile(trxFilePath);
console.log(parsedData);
