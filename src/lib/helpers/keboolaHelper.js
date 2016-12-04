'use strict';
import { isEmpty, isUndefined } from 'lodash';
import { DEFAULT_HTTPS_PORT } from '../constants';
// This function checks the input configuration specified in KBC.
// Checks whether the required fields are provided.
// Prepare simple output that is going to be used in later phases.
export async function parseConfiguration(configObject) {
  return new Promise((resolve, reject) => {
    const inputFiles = configObject.get('storage:input:tables');
    // If no input selected, we should stop the processing.
    if (isUndefined(inputFiles) || isEmpty(inputFiles)) {
      reject('No KBC Bucket/Table selected!');
    }
    const database = configObject.get('parameters:database');
    if (isUndefined(database)) {
      reject('Missing parameter database! Please check your configuration!');
    }
    // schema parsing.
    const schema = configObject.get('parameters:schema');
    if (isUndefined(schema)) {
      reject('Missing parameter schema! Please check your configuration!');
    }
    // user credentials parsing.
    const username = configObject.get('parameters:username');
    const password = configObject.get('parameters:#password');
    if (isUndefined(username) || isUndefined(password)) {
      reject('Username and/or password parameter missing! Please check your configuration!');
    }
    // Hostname and port parsing.
    const hostname = configObject.get('parameters:hostname');
    const port = configObject.get('parameters:port');
    if (isUndefined(hostname) || isUndefined(port)) {
      reject('Host and/or port parameter missing! Please check your configuration!');
    }
    // Prepare a HTTPS url for data loading.
    const httpsUrl = `https://${hostname}:${DEFAULT_HTTPS_PORT}`;
    // If everything is all right, we should return the params object.
    resolve({
      port,
      schema,
      hostname,
      password,
      username,
      database,
      httpsUrl,
      inputFiles
    });
  });
}
