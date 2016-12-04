import path from 'path';
import command from './lib/helpers/cliHelper';
import { getConfig } from './lib/helpers/configHelper';
import { parseConfiguration } from './lib/helpers/keboolaHelper';
import {
  initConnection,
  generateMetadata,
  loadDataToDashDB,
  initTablesInDashDB
} from './lib/helpers/dashDbHelper';
import {
  CONFIG_FILE,
  INPUT_TABLES_DIR,
  DEFAULT_TABLES_IN_DIR
} from './lib/constants';

const CONFIG = getConfig(path.join(command.data, CONFIG_FILE));

(async() => {
  try {
    // read the input configuration.
    const {
      port,
      schema,
      hostname,
      password,
      username,
      database,
      httpsUrl,
      inputFiles
    } = await parseConfiguration(CONFIG);
    // prepare the configuration object.
    const config = { username, password, hostname, port, database, schema, httpsUrl };
    // initialization of the database connection.
    const db = await initConnection(config);
    // read directory path where the input files are situated.
    const tablesDir = path.join(command.data, DEFAULT_TABLES_IN_DIR);
    // read the input table headers.
    const headers = await Promise.all(generateMetadata(tablesDir, inputFiles, schema));
    // prepare db tables in the dashDB.
    const initializedObjects = await Promise.all(initTablesInDashDB(db, headers));
    // upload data to dashDB via REST API.
    const uploadedObjects = await Promise.all(loadDataToDashDB(tablesDir, inputFiles, headers, config));
    // show the output message.
    console.log(`${uploadedObjects.length} file(s) uploaded successfully!`);
    // close connection.
    process.exit(0);
  } catch(error) {
    console.log(error);
    process.exit(1);
  }
})();
