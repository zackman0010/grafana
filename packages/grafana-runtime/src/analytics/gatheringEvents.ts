import * as fs from 'fs';
import * as path from 'path';

import { findFiles, getFileInformation, generateFunctionCode, generateInfo } from './events/scripts/utils';

// Configuration
const rootDirectory = './'; // Root directory to search for the files
const targetFileName = 'eventsTracking.ts'; // Name of the files containing the objects
const outputFile = path.join(__dirname, 'eventsList.ts'); // Centralized file for the functions
const sourceOfTruth = path.join(__dirname, 'eventsTrackingInformation.ts'); // Centralized file for the information

/**
 * Main function to search for files, process them, and generate the centralized file.
 * @param rootDirectory Root directory to search
 * @param targetFileName Name of the file to search for
 * @param outputFile The centralized output file to save functions
 * @param sourceOfTruth The centralized output file to save information
 */
async function createEventDocsFromMultipleFiles(
  rootDirectory: string,
  targetFileName: string,
  outputFile: string,
  sourceOfTruth: string
): Promise<void> {
  // Find all files with the target file name
  const files = findFiles(rootDirectory, targetFileName);
  // Get the files content
  const getEventsTracking = () => {
    //@ts-ignore
    const eventsList = [];
    files.map((filePath) => {
      eventsList.push(getFileInformation(filePath));
    });
    //@ts-ignore
    return eventsList;
  };

  // Convert the events info to functions
  const functionsToAdd = generateFunctionCode(getEventsTracking());

  // Write new functions to the centralized file if there are any
  if ((await functionsToAdd).length > 0) {
    //TODO: check if the functions exist in the file before adding them
    //TODO: maintain the import of reportTrackingEvent
    fs.writeFileSync(outputFile, "import { reportTrackingEvent } from '../events'; \n", 'utf8');
    fs.appendFileSync(outputFile, (await functionsToAdd).join('\n'), 'utf8');
    fs.appendFileSync(outputFile, '\n', 'utf8');
    console.log('New functions added to the centralized file.');
  } else {
    console.log('No new functions to add.');
  }
  //Get the information
  const info = generateInfo(getEventsTracking());
  // Write new functions to the centralized file if there are any
  // We don't need to check if the information exists in the file before adding it because it will be overwritten
  if (info) {
    fs.writeFileSync(sourceOfTruth, 'const eventList = ', 'utf8');
    fs.appendFileSync(sourceOfTruth, info, 'utf8');
    fs.appendFileSync(sourceOfTruth, '\n', 'utf8');
  }
}

// Call the main function
createEventDocsFromMultipleFiles(rootDirectory, targetFileName, outputFile, sourceOfTruth);
