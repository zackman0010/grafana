import { writeFileSync, appendFileSync, readFileSync } from 'fs';
import { join } from 'path';

// import { allEvents } from './allEvents';
//import * as allEvents from 'allEvents.json'
const allEvents = JSON.parse(readFileSync('./allEvents.json', 'utf-8'));

// const allEvents: EventDefinition[] = [
//   {
//     owner: 'Grafana Frontend Squad',
//     product: 'navigation',
//     eventName: 'item_clicked',
//     description: 'User clicked on a navigation item',
//     properties: {
//       path: {
//         description: 'The path of the clicked item',
//         type: 'string',
//         required: false,
//       },
//       menuIsDocked: {
//         description: 'The state of the navigation menu',
//         type: 'boolean',
//         required: true,
//       },
//       itemIsBookmarked: {
//         description: 'Whether the clicked item is bookmarked',
//         type: 'boolean',
//         required: true,
//       },
//       bookmarkToggleOn: {
//         description: 'Whether the bookmark toggle is on',
//         type: 'boolean',
//         required: true,
//       },
//     },
//     state: 'featureUsage',
//     eventFunction: 'megaMenuItemClicked',
//   },
//   {
//     owner: 'Grafana Frontend Squad',
//     product: 'navigation',
//     eventName: 'menu_opened',
//     description: 'User opened the navigation menu',
//     properties: {
//       state: {
//         description: 'The state of the navigation menu',
//         type: 'boolean',
//         required: true,
//       },
//       singleTopNav: {
//         description: 'Whether the navigation menu is in single top nav mode',
//         type: 'boolean',
//         required: true,
//       },
//     },
//     state: 'featureUsage',
//     eventFunction: 'megaMenuOpened',
//   },
//   {
//     owner: 'Grafana Frontend Squad',
//     product: 'navigation',
//     eventName: 'menu_docked',
//     description: 'User docked the navigation menu',
//     properties: {
//       state: {
//         description: 'The state of the navigation menu',
//         type: 'boolean',
//         required: true,
//       },
//     },
//     state: 'featureUsage',
//     eventFunction: 'megaMenuDocked',
//   },
// ];

type EventPropertyDefinition = {
  [name: string]: {
    description: string;
    type: 'string' | 'number' | 'boolean' | 'undefined';
    required?: boolean;
  };
};

type EventState =
  | 'featureUsage' // gathering general usage data
  | 'error' // error tracking
  | 'performance' // for tracking performance
  | 'experiment' // time boxed event used to make a go / no go decision on a feature - should be removed after the experiment is complete
  | 'funnel'; // start or end event of a funnel, used for conversion rate tracking

export type EventDefinition = {
  repo?: string;
  owner: string;
  product: string;
  eventName: string;
  description: string;
  properties?: EventPropertyDefinition;
  state: EventState;
  eventFunction: string;
};

// Configuration
const outputFile = join(__dirname, '../../../../public/analytics/eventsList_gen.ts'); // Centralized file for all the track event functions
const sourceOfTruth = join(__dirname, '../../../../public/analytics/userEvents_gen.json'); // Centralized json object with all the event information

/**
 * Generates wrapper trackEvent code for a list of events.
 * @returns A list of all the generated functions code
 */
export function generateFunctionCode(events: EventDefinition[]): string[] {
  const generatedFunctions: string[] = [];

  events.forEach((event) => {
    const { eventFunction, properties, repo, product, eventName } = event;
    const propertiesToParams: string[] = [];
    let checkPossibleUndefined = '';
    let propsToSend: string[] = [];
    let propsNonRequired: string[] = [];

    if (properties) {
      Object.keys(properties).forEach((propName) => {
        const propDef = properties[propName];
        if (propDef.required === false) {
          checkPossibleUndefined += `const ${propName}Check = ${propName} || '';\n  `;
          propsToSend.push(`${propName}Check`);
          propsNonRequired.push(`${propName}?: ${propDef.type}`);
        } else {
          propsToSend.push(propName);
          propertiesToParams.push(`${propName}: ${propDef.type}`);
        }
      });
    }
    const allPropertiesToParams = propertiesToParams.concat(propsNonRequired);

    //We need this indentation to have the correct format when generating the code in the specific file
    const eventFullName = `${repo || 'grafana'}_${product}_${eventName}`;
    const functionCode = ` 
export function ${eventFunction}(${allPropertiesToParams}): void {
  ${checkPossibleUndefined}reportInteraction('${eventFullName}',
    { ${propsToSend} }
  )
};
`;
    generatedFunctions.push(functionCode);
  });

  return generatedFunctions;
}

/**
 * Main function to search for files, process them, and generate the centralized file.
 * @param outputFile The centralized ts output file to save functions
 * @param sourceOfTruth The centralized json output file to save events information
 */
function createEventDocs(outputFile: string, sourceOfTruth: string): void {
  // Convert the events info to functions
  const functionsToAdd = generateFunctionCode(allEvents);

  // Write new functions to the centralized file if there are any
  if (functionsToAdd.length > 0) {
    writeFileSync(outputFile, `import { reportInteraction } from '@grafana/runtime';`, 'utf8');
    appendFileSync(outputFile, functionsToAdd.join('\n'), 'utf8');
    appendFileSync(outputFile, '\n', 'utf8');
    console.log('New functions added to the centralized file.');
  } else {
    console.log('No new functions to add.');
  }
  //Get the information
  const generatedInfo = {
    kind: 'EventList',
    metadata: {
      generated: new Date().toISOString(),
    },
    events: allEvents,
  };
  // Write new functions to the centralized file if there are any
  // We don't need to check if the information exists in the file before adding it because it will be overwritten
  writeFileSync(sourceOfTruth, JSON.stringify(generatedInfo, null, 2), 'utf8');
  appendFileSync(sourceOfTruth, '\n', 'utf8');
}

// Call the main function
createEventDocs(outputFile, sourceOfTruth);
