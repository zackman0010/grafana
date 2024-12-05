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

export function getFileInformation(filePath: string): {} {
  const file = fs.readFileSync(path.resolve(filePath), 'utf8');
  const VARIABLE_NAME = 'eventsTracking';
  const ast = parser.parse(file, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  const eventsGroupedByOwner: { [owner: string]: [] } = {};
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

        if (eventsObject && eventsObject.type === 'ObjectExpression') {
          eventsObject.properties.forEach((property) => {
            if (property.type === 'ObjectProperty' && property.key.type === 'Identifier') {
              const eventKey = property.key.name;
              const eventValue = property.value;

              if (eventValue.type === 'ObjectExpression') {
                let owner = '';
                let eventFunction = '';
                let properties: EventPropertyDefinition = {};
                let repo = '';
                let product = '';

                eventValue.properties.forEach((prop) => {
                  if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
                    const keyName = prop.key.name;

                    // Extract 'owner'
                    if (keyName === 'owner' && prop.value.type === 'StringLiteral') {
                      owner = prop.value.value;
                    }

                    // Extract 'repo'
                    if (keyName === 'repo' && prop.value.type === 'StringLiteral') {
                      repo = prop.value.value;
                    }

                    // Extract 'product'
                    if (keyName === 'product' && prop.value.type === 'StringLiteral') {
                      product = prop.value.value;
                    }

                    // Extract 'eventFunction'
                    if (keyName === 'eventFunction' && prop.value.type === 'StringLiteral') {
                      eventFunction = prop.value.value;
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

                // Group by owner
                if (owner) {
                  if (!eventsGroupedByOwner[owner]) {
                    eventsGroupedByOwner[owner] = [];
                  }
                  eventsGroupedByOwner[owner].push({ [eventKey]: eventValue });
                }

                // Add to eventFunctionsArray
                if (eventFunction) {
                  eventFunctionsArray.push({ repo, owner, product, eventFunction, properties });
                }
              }
            }
          });
        }
      }
    },
  });

  return { eventsGroupedByOwner, eventFunctionsArray };
}
/**
 * Generates the code for a function.
 * @returns The generated function code
 */
export async function generateFunctionCode(
  events: Array<{ eventsGroupByOwner: EventDefinition; eventFunctionsArray: EventFunctionInput }>
) {
  const eventsFunctionsList = events.map((eventItem) => eventItem.eventFunctionsArray);
  const generatedFunctions: string[] = [];
  eventsFunctionsList.forEach((item) => {
    if (Object.entries(item).length === 1) {
      const { eventFunction, properties, repo, product } = item;
      if (eventFunction && Object.entries(properties).length > 0) {
        const func = () => {
          const propertiesToParams: string[] = [];
          const checkPossibleUndefined: string[] = [];
          Object.entries(properties).forEach(([propName, propDef]) => {
            if (propName) {
              if (propDef.required === false) {
                checkPossibleUndefined.push(`
                  const ${propName}Check = ${propName} || '';
                  `);
              }
              propertiesToParams.push(`${propName}${!propDef.required ? '?' : ''}: ${propDef.type}`);
            }
          });
          return { propertiesToParams, checkPossibleUndefined };
        };
        const functionCode = `
      export function ${eventFunction}(${func()}): void {
        reportTrackingEvent({
        repo: '${repo}',
        product: '${product}',
        eventName: '${eventFunction}',
        properties: { ${Object.entries(properties).map(([propName, propDef]) => propName)} }
      })
    };
      `;
        generatedFunctions.push(functionCode);
      }
    } else if (Object.entries(item).length > 1) {
      Object.entries(item)
        .flat()
        .map((i) => {
          //@ts-ignore
          const { eventFunction, properties, repo, product } = i;
          if (eventFunction && Object.entries(properties).length > 0) {
            const func = () => {
              const propertiesToParams: string[] = [];
              let checkPossibleUndefined = '';
              let propsToSend: string[] = [];

              Object.entries(properties).forEach(([propName, propDef]) => {
                if (propName) {
                  //@ts-ignore
                  if (propDef.required === false) {
                    checkPossibleUndefined += `const ${propName}Check = ${propName} || '';`;
                    propsToSend.push(`${propName}Check`);
                    //@ts-ignore
                    propertiesToParams.push(`${propName}?: ${propDef.type}`);
                  } else {
                    propsToSend.push(propName);
                    //@ts-ignore
                    propertiesToParams.push(`${propName}: ${propDef.type}`);
                  }
                }
              });
              return { propertiesToParams, checkPossibleUndefined, propsToSend };
            };
            //We need this indentation to have the correct format when generating the code in the specific file
            const functionCode = ` 
export function ${eventFunction}(${func().propertiesToParams}): void {
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
        });
    }
  });
  return generatedFunctions;
}
