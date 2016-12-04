import fs from 'fs';
import path from 'path';
import request from 'request';
import firstline from 'firstline';
import { Database } from 'ibm_db';
import { last, extend } from 'lodash';

// Function initConnection helps to establish the connection for dashDB instance.
// Uses a DB2 driver.
export function initConnection({ username, password, hostname, port, database }) {
  return new Promise((resolve, reject) => {
    const ibmdb = new Database();
    ibmdb.open(`DRIVER={DB2};DATABASE=${database};HOSTNAME=${hostname};UID=${username};PWD=${password};PORT=${port};PROTOCOL=TCPIP`, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(ibmdb);
      }
    });
  });
}

// Function generateMetadata function scan input directory and read all headers from input files.
// It prepares all necessary information for creating tables + data upload, all based on the input.
export function generateMetadata(tablesDir, inputFiles, schema) {
  let promises = [];
  inputFiles.forEach(file => {
    promises.push(
      (({ source, destination }) => {
        return new Promise((resolve, reject) => {
          const tableName = last(source.split('.')).toUpperCase();
          firstline(path.join(tablesDir, destination))
            .then(header => {
              let fields = '';
              header.split(',').forEach(element => {
                const bareElement = element.replace(/^"(.+(?="$))"$/, '$1');
                fields += `${bareElement} varchar(512),`;
              });
              const sql = `DROP TABLE ${tableName}; CREATE TABLE ${schema}.${tableName} (${fields.slice(0, -1)});`;
              resolve({ source, tableName, header, sql });
            })
            .catch(error => reject(error))
        })
      })(file)
    )
  });

  return promises;
}

// Function initTablesInDashDB creates tables.
export function initTablesInDashDB(db, headers) {
  let promises = [];
  headers.forEach(headerObject => {
    promises.push(
      (({ tableName, sql }) => {
        return new Promise((resolve, reject) => {
          db.query(sql, (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(`${tableName} created successfully!`);
            }
          });
        })
      })(headerObject)
    )
  });
  return promises;
}

// Function loadDataToDashDB is simple function that populates tables with actual data.
export function loadDataToDashDB(tablesDir, inputFiles, headers, config) {
  let promises = [];
  inputFiles.forEach(file => {
    promises.push(
      (({ source, destination }) => {
        return new Promise((resolve, reject) => {
          const metadata = last(headers.filter(header => header.source === source));
          const { username, password, schema, httpsUrl } = config;
          const { tableName } = metadata;
          const url = `${httpsUrl}/dashdb-api/load/local/del/${schema}.${tableName}?hasHeaderRow=true&codePage=1208&loadAction="insert"&delimiter=","`;
          const formData = { loadFile1: fs.createReadStream(path.join(tablesDir, destination)) }
          request.post({ url, formData }, (error, httpResponse, body) => {
            if (error) {
              reject(error);
            } else {
              resolve(body);
            }
          }).auth(username, password, true);
        })
      })(file)
    )
  })
  return promises;
}
