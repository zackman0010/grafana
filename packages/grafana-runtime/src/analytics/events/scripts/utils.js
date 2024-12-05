'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g;
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t = op[0] & 2 ? y['return'] : op[0] ? y['throw'] || ((t = y['return']) && t.call(y), 0) : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (!((t = _.trys), (t = t.length > 0 && t[t.length - 1])) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.findFiles = findFiles;
exports.getFileInformation = getFileInformation;
exports.generateFunctionCode = generateFunctionCode;
exports.generateInfo = generateInfo;
//@ts-nocheck
var core_1 = require('@babel/core');
var parser = require('@babel/parser');
var fs = require('fs');
var path = require('path');
/**
 * Recursively searches for files with a specific name in a directory.
 * @param directory Starting directory to search
 * @param targetFile Name of the target file
 * @returns List of found file paths
 */
function findFiles(directory, targetFile) {
  var files = [];
  var items = fs.readdirSync(directory, { withFileTypes: true });
  items.forEach(function (item) {
    var fullPath = path.join(directory, item.name);
    if (item.isDirectory()) {
      files.push.apply(files, findFiles(fullPath, targetFile)); // Recurse into subdirectories
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
function getFileInformation(filePath) {
  var file = fs.readFileSync(path.resolve(filePath), 'utf8');
  var VARIABLE_NAME = 'eventsTracking';
  var ast = parser.parse(file, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });
  var eventsListed = [];
  var eventFunctionsArray = [];
  (0, core_1.traverse)(ast, {
    // Look for ExportNamedDeclaration nodes containing 'eventsTracking'
    ExportNamedDeclaration: function (path) {
      var _a;
      var declaration = path.node.declaration;
      if (
        declaration &&
        declaration.type === 'VariableDeclaration' &&
        ((_a = declaration.declarations[0]) === null || _a === void 0 ? void 0 : _a.id.type) === 'Identifier' &&
        declaration.declarations[0].id.name === VARIABLE_NAME
      ) {
        var eventsObject = declaration.declarations[0].init;
        if (eventsObject && eventsObject.type === 'ArrayExpression') {
          eventsObject.elements.forEach(function (element) {
            if (element.type === 'ObjectExpression') {
              var owner_1 = '';
              var eventFunction_1 = '';
              var properties_1 = {};
              var repo_1 = '';
              var product_1 = '';
              var eventName_1 = '';
              var description_1 = '';
              var stage_1 = 'timeboxed';
              element.properties.forEach(function (prop) {
                if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
                  var keyName = prop.key.name;
                  if (prop.value.type === 'StringLiteral') {
                    // Extract 'owner', 'repo', 'product', 'eventName', 'description', 'stage', 'eventFunction'
                    switch (keyName) {
                      case 'owner':
                        owner_1 = prop.value.value;
                        break;
                      case 'repo':
                        repo_1 = prop.value.value;
                        break;
                      case 'product':
                        product_1 = prop.value.value;
                        break;
                      case 'eventName':
                        eventName_1 = prop.value.value;
                        break;
                      case 'description':
                        description_1 = prop.value.value;
                        break;
                      case 'stage':
                        stage_1 = prop.value.value;
                        break;
                      case 'eventFunction':
                        eventFunction_1 = prop.value.value;
                        break;
                    }
                  }
                  // Extract 'properties'
                  if (keyName === 'properties' && prop.value.type === 'ObjectExpression') {
                    prop.value.properties.forEach(function (propertyDef) {
                      if (
                        propertyDef.type === 'ObjectProperty' &&
                        propertyDef.key.type === 'Identifier' &&
                        propertyDef.value.type === 'ObjectExpression'
                      ) {
                        var propName = propertyDef.key.name;
                        var propDef_1 = {};
                        propertyDef.value.properties.forEach(function (propAttr) {
                          if (propAttr.type === 'ObjectProperty' && propAttr.key.type === 'Identifier') {
                            if (propAttr.value.type === 'StringLiteral') {
                              propDef_1[propAttr.key.name] = propAttr.value.value;
                            } else if (propAttr.value.type === 'BooleanLiteral') {
                              propDef_1[propAttr.key.name] = propAttr.value.value;
                            }
                          }
                        });
                        properties_1[propName] = propDef_1;
                      }
                    });
                  }
                }
              });
              //If eventName exists we add to the code to generate the source of truth
              if (eventName_1) {
                var repoName = repo_1 || 'grafana';
                eventsListed.push({
                  repoName: repoName,
                  owner: owner_1,
                  product: product_1,
                  eventName: eventName_1,
                  description: description_1,
                  properties: properties_1,
                  stage: stage_1,
                  eventFunction: eventFunction_1,
                });
              }
              // Add to eventFunctionsArray
              if (eventFunction_1) {
                eventFunctionsArray.push({
                  repo: repo_1,
                  owner: owner_1,
                  product: product_1,
                  eventFunction: eventFunction_1,
                  properties: properties_1,
                });
              }
            }
          });
        }
      }
    },
  });
  return { eventsListed: eventsListed, eventFunctionsArray: eventFunctionsArray };
}
/**
 * Generates the code for a function.
 * @returns The generated function code
 */
function generateFunctionCode(events) {
  return __awaiter(this, void 0, void 0, function () {
    var eventsFunctionsList, generatedFunctions, getFunctionFromEvent;
    return __generator(this, function (_a) {
      eventsFunctionsList = events.map(function (eventItem) {
        return eventItem.eventFunctionsArray;
      });
      generatedFunctions = [];
      getFunctionFromEvent = function (event) {
        var eventFunction = event.eventFunction,
          properties = event.properties,
          repo = event.repo,
          product = event.product,
          eventName = event.eventName;
        if (eventFunction && Object.entries(properties).length > 0) {
          var func = function () {
            var propertiesToParams = [];
            var checkPossibleUndefined = '';
            var propsToSend = [];
            var propsNonRequired = [];
            Object.entries(properties).forEach(function (_a) {
              var propName = _a[0],
                propDef = _a[1];
              if (propName) {
                //@ts-ignore
                if (propDef.required === false) {
                  checkPossibleUndefined += 'const '.concat(propName, 'Check = ').concat(propName, " || '';");
                  propsToSend.push(''.concat(propName, 'Check'));
                  //@ts-ignore
                  propsNonRequired.push(''.concat(propName, '?: ').concat(propDef.type));
                } else {
                  propsToSend.push(propName);
                  //@ts-ignore
                  propertiesToParams.push(''.concat(propName, ': ').concat(propDef.type));
                }
              }
            });
            var allPropertiesToParams = propertiesToParams.concat(propsNonRequired);
            return {
              allPropertiesToParams: allPropertiesToParams,
              checkPossibleUndefined: checkPossibleUndefined,
              propsToSend: propsToSend,
            };
          };
          //We need this indentation to have the correct format when generating the code in the specific file
          var functionCode = ' \nexport function '
            .concat(eventFunction, '(')
            .concat(func().allPropertiesToParams, '): void {\n  ')
            .concat(func().checkPossibleUndefined, "\n  reportTrackingEvent({\n    repo: '")
            .concat(repo, "',\n    product: '")
            .concat(product, "',\n    eventName: '")
            .concat(eventFunction, "',\n    properties: { ")
            .concat(func().propsToSend, ' }\n  })\n};\n');
          generatedFunctions.push(functionCode);
        }
      };
      eventsFunctionsList.forEach(function (item) {
        if (Object.entries(item).length === 1) {
          generateFunctionFromEvent(item);
        } else if (Object.entries(item).length > 1) {
          Object.entries(item)
            .flat()
            .map(function (i) {
              getFunctionFromEvent(i);
            });
        }
      });
      return [2 /*return*/, generatedFunctions];
    });
  });
}
/**
 * Generates the code for the source of truth.
 * @returns The generated source of truth code
 */
function generateInfo(events) {
  var eventsInfo = events.flatMap(function (eventItem) {
    return eventItem.eventsListed;
  });
  var generatedInfo = [];
  eventsInfo.forEach(function (item) {
    generatedInfo.push(item);
  });
  return JSON.stringify(generatedInfo, null, 2);
}
