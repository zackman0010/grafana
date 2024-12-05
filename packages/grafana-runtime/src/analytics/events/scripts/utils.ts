//@ts-nocheck
import { traverse } from '@babel/core';
import * as parser from '@babel/parser';
import * as fs from 'fs';
import * as path from 'path';

import { EventDefinition, EventFunctionInput, EventPropertyDefinition } from '../types';

/**
 * Recursively searches for files with a specific name in a directory.
 * @param directory Starting directory to search
 * @param targetFile Name of the target file
 * @returns List of found file paths
 */
export function findFiles(directory: string, targetFile: string): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(directory, { withFileTypes: true });
  items.forEach((item) => {
    const fullPath = path.join(directory, item.name);
    if (item.isDirectory()) {
      files.push(...findFiles(fullPath, targetFile)); // Recurse into subdirectories
    } else if (item.isFile() && item.name === targetFile) {
      files.push(fullPath); // Add file path if it matches the target name
    }
  });

  return files;
}

/**
 * Parses a file and extracts information about events and event functions.
 * @param filePath Path to the file to parse
 * @returns Object containing the extracted information
 */

export function getFileInformation(filePath: string): {} {
  const file = fs.readFileSync(path.resolve(filePath), 'utf8');
  const VARIABLE_NAME = 'eventsTracking';
  const ast = parser.parse(file, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  const eventsListed: [{}] = [];
  const eventFunctionsArray: Array<{
    eventFunction: string;
    properties: EventPropertyDefinition;
    owner: string;
    repo?: string;
    product: string;
  }> = [];

  traverse(ast, {
    // Look for ExportNamedDeclaration nodes containing 'eventsTracking'
    ExportNamedDeclaration(path) {
      const declaration = path.node.declaration;

      if (
        declaration &&
        declaration.type === 'VariableDeclaration' &&
        declaration.declarations[0]?.id.type === 'Identifier' &&
        declaration.declarations[0].id.name === VARIABLE_NAME
      ) {
        const eventsObject = declaration.declarations[0].init;

        if (eventsObject && eventsObject.type === 'ArrayExpression') {
          eventsObject.elements.forEach((element) => {
            if (element.type === 'ObjectExpression') {
              let owner = '';
              let eventFunction = '';
              let properties: EventPropertyDefinition = {};
              let repo = '';
              let product = '';
              let eventName = '';
              let description = '';
              let stage: EventStage = 'timeboxed';

              element.properties.forEach((prop) => {
                if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
                  const keyName = prop.key.name;
                  if (prop.value.type === 'StringLiteral') {
                    // Extract 'owner', 'repo', 'product', 'eventName', 'description', 'stage', 'eventFunction'
                    switch (keyName) {
                      case 'owner':
                        owner = prop.value.value;
                        break;
                      case 'repo':
                        repo = prop.value.value;
                        break;
                      case 'product':
                        product = prop.value.value;
                        break;
                      case 'eventName':
                        eventName = prop.value.value;
                        break;
                      case 'description':
                        description = prop.value.value;
                        break;
                      case 'stage':
                        stage = prop.value.value;
                        break;
                      case 'eventFunction':
                        eventFunction = prop.value.value;
                        break;
                    }
                  }

                  // Extract 'properties'
                  if (keyName === 'properties' && prop.value.type === 'ObjectExpression') {
                    prop.value.properties.forEach((propertyDef) => {
                      if (
                        propertyDef.type === 'ObjectProperty' &&
                        propertyDef.key.type === 'Identifier' &&
                        propertyDef.value.type === 'ObjectExpression'
                      ) {
                        const propName = propertyDef.key.name;
                        const propDef: { description: string; type: string; required: boolean } = {};

                        propertyDef.value.properties.forEach((propAttr) => {
                          if (propAttr.type === 'ObjectProperty' && propAttr.key.type === 'Identifier') {
                            if (propAttr.value.type === 'StringLiteral') {
                              propDef[propAttr.key.name] = propAttr.value.value;
                            } else if (propAttr.value.type === 'BooleanLiteral') {
                              propDef[propAttr.key.name] = propAttr.value.value;
                            }
                          }
                        });
                        properties[propName] = propDef;
                      }
                    });
                  }
                }
              });
              //If eventName exists we add to the code to generate the source of truth
              if (eventName) {
                const repoName = repo || 'grafana';
                eventsListed.push({
                  repoName,
                  owner,
                  product,
                  eventName,
                  description,
                  properties,
                  stage,
                  eventFunction,
                });
              }

              // Add to eventFunctionsArray
              if (eventFunction) {
                eventFunctionsArray.push({ repo, owner, product, eventFunction, properties });
              }
            }
          });
        }
      }
    },
  });
  return { eventsListed, eventFunctionsArray };
}

/**
 * Generates the code for a function.
 * @returns The generated function code
 */
export async function generateFunctionCode(
  events: Array<{ eventsListed: EventDefinition; eventFunctionsArray: EventFunctionInput }>
) {
  const eventsFunctionsList = events.map((eventItem) => eventItem.eventFunctionsArray);
  const generatedFunctions: string[] = [];

  const getFunctionFromEvent = (event: EventFunctionInput) => {
    const { eventFunction, properties, repo, product, eventName } = event;
    if (eventFunction && Object.entries(properties).length > 0) {
      const func = () => {
        const propertiesToParams: string[] = [];
        let checkPossibleUndefined = '';
        let propsToSend: string[] = [];
        let propsNonRequired = [];

        Object.entries(properties).forEach(([propName, propDef]) => {
          if (propName) {
            //@ts-ignore
            if (propDef.required === false) {
              checkPossibleUndefined += `const ${propName}Check = ${propName} || '';`;
              propsToSend.push(`${propName}Check`);
              //@ts-ignore
              propsNonRequired.push(`${propName}?: ${propDef.type}`);
            } else {
              propsToSend.push(propName);
              //@ts-ignore
              propertiesToParams.push(`${propName}: ${propDef.type}`);
            }
          }
        });
        const allPropertiesToParams = propertiesToParams.concat(propsNonRequired);
        return { allPropertiesToParams, checkPossibleUndefined, propsToSend };
      };
      //We need this indentation to have the correct format when generating the code in the specific file
      const functionCode = ` 
export function ${eventFunction}(${func().allPropertiesToParams}): void {
  ${func().checkPossibleUndefined}
  reportTrackingEvent({
    repo: '${repo}',
    product: '${product}',
    eventName: '${eventFunction}',
    properties: { ${func().propsToSend} }
  })
};
`;
      generatedFunctions.push(functionCode);
    }
  };

  eventsFunctionsList.forEach((item) => {
    if (Object.entries(item).length === 1) {
      generateFunctionFromEvent(item);
    } else if (Object.entries(item).length > 1) {
      Object.entries(item)
        .flat()
        .map((i) => {
          getFunctionFromEvent(i);
        });
    }
  });
  return generatedFunctions;
}

/**
 * Generates the code for the source of truth.
 * @returns The generated source of truth code
 */
export function generateInfo(
  events: Array<{ eventsListed: EventDefinition; eventFunctionsArray: EventFunctionInput }>
): string {
  const eventsInfo = events.flatMap((eventItem) => eventItem.eventsListed);
  const generatedInfo: EventDefinition[] = [];
  eventsInfo.forEach((item) => {
    generatedInfo.push(item);
  });
  return JSON.stringify(generatedInfo, null, 2);
}
