import { traverse } from '@babel/core';
import parser from '@babel/parser';
import { readFileSync, writeFileSync } from 'fs';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

const argv = yargs(hideBin(process.argv)).option('generate', {
  alias: 'g',
  type: 'array',
  description: 'Generate tracking events',
}).argv;

const VARIABLE_NAME = 'eventsTracking';

const generateTrackingEvents = async () => {
  const args = await argv;

  if (!args) {
    return;
  }
  args.generate.forEach(async (arg) => {
    const folder = arg.slice(0, arg.lastIndexOf('/'));
    const fileData = readFileSync(arg, 'utf8');
    const formattedData = formatData(fileData);
   //===>>> NO FUNCIONA DESDE AQUÍ generateFunctionCode(data);
  });
};

const formatData = (data) => {
  const eventsInfo = [];
  const ast = parser.parse(data, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });
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
        eventsObject.elements.forEach((element) => {
          const elementInfo = {};
          element &&
            element.properties.forEach((property) => {
              const propertyName = property.key.name;
              if (propertyName !== 'properties') {
                elementInfo[propertyName] = property.value.value;
              } else {
                const propertyData = {};
                const propertyName = property.key.name;
                const propertiesArray = property.value.properties;
                propertiesArray &&
                  propertiesArray.forEach((prop) => {
                    const propName = prop.key.name;
                    const propInfo = {};
                    prop &&
                      prop.value.properties.forEach((property) => {
                        propInfo[property.key.name] = property.value.value;
                      });
                    propertyData[propName] = propInfo;
                  });
                elementInfo[propertyName] = propertyData;
              }
            });
          eventsInfo.push(elementInfo);
        });
      }
    },
  });
  return eventsInfo;
};

/**
 * Generates the code for a function.
 * @returns The generated function code
 */
const generateFunctionCode = async ( data ) => {
    // const eventsFunctionsList = data.map((eventItem) => eventItem.eventFunctionsArray);
    const generatedFunctions = [];
    data.forEach((event) => {
      getFunctionFromEvent(event);
    });
    const getFunctionFromEvent = (event) => {
      const { eventFunction, properties, repo, product, eventName } = event;
      if (eventFunction) {
        const func = () => {
          const propertiesToParams = [];
          let checkPossibleUndefined = '';
          let propsToSend = [];
          let propsNonRequired = [];
  
          Object.entries(properties).forEach(([propName, propDef]) => {
            if (propName) {
              if (propDef.required === false) {
                checkPossibleUndefined += `const ${propName}Check = ${propName} || '';`;
                propsToSend.push(`${propName}Check`);
                propsNonRequired.push(`${propName}?: ${propDef.type}`);
              } else {
                propsToSend.push(propName);
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
  
  }

generateTrackingEvents(argv.generate);

